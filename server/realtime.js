import { WebSocketServer } from "ws";

import { requireAuthenticatedUser, isAdministrator } from "../functions/_shared/auth.js";
import {
  addMonstersLeaguePlayer,
  ensureMonstersLeagueCombatState,
  getMonstersLeagueRoomSummary
} from "../src/multiplayer/monstersLeagueRules.js";
import { NodeSocketAdapter } from "./nodeDurable.js";

function cleanText(value, maxLength = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function webRequestFromUpgrade(request, origin) {
  const headers = new Headers();
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    headers.append(request.rawHeaders[index], request.rawHeaders[index + 1]);
  }
  return new Request(new URL(request.url || "/", origin), { method: "GET", headers });
}

function reject(socket, status, message) {
  const names = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error" };
  const body = JSON.stringify({ error: message });
  socket.write(
    `HTTP/1.1 ${status} ${names[status] || "Error"}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`
  );
  socket.destroy();
}

function bindSocket(instance, context, socket, adapter) {
  context.acceptWebSocket(adapter);
  socket.on("message", (message) => {
    instance.nodeCommandQueue = (instance.nodeCommandQueue || Promise.resolve())
      .then(() => instance.webSocketMessage(adapter, message))
      .catch((error) => console.error("WebSocket message failed.", error));
  });
  socket.on("close", () => {
    context.removeWebSocket(adapter);
    Promise.resolve(instance.webSocketClose?.(adapter)).catch(() => {});
  });
  socket.on("error", () => {
    Promise.resolve(instance.webSocketError?.(adapter)).catch(() => {});
  });
}

async function attachCampaignSocket(socket, roomRecord, user, campaign) {
  const { instance, context, storage } = roomRecord;
  const revision = Math.max(0, Math.floor(Number(campaign.revision) || 0));
  if (!instance.metadata || revision > Number(instance.metadata.revision || 0)) {
    instance.metadata = {
      ...(instance.metadata || {}),
      campaignId: campaign.id,
      revision,
      updatedAt: cleanText(campaign.updatedAt, 80),
      actorUserId: ""
    };
    await storage.put("campaign-metadata", instance.metadata);
  }
  const requestedRole = campaign.ownerId === user.id || isAdministrator(user) ? "host" : cleanText(campaign.memberRole, 20);
  const role = requestedRole === "host" ? "host" : requestedRole === "player" ? "player" : "master";
  const adapter = new NodeSocketAdapter(socket, {
    userId: user.id,
    name: user.name,
    role,
    connectedAt: Date.now(),
    connectionId: crypto.randomUUID()
  });
  bindSocket(instance, context, socket, adapter);
  adapter.send(JSON.stringify({ type: "revision", ...instance.metadata }));
  instance.broadcastPresence();
}

async function attachMonsterSocket(socket, roomRecord, user) {
  const { instance, context } = roomRecord;
  if (!instance.room) throw Object.assign(new Error("Room not found"), { status: 404 });
  if (ensureMonstersLeagueCombatState(instance.room)) await instance.persist();
  let player = instance.room.players.find((entry) => entry.userId === user.id || entry.id === user.id);
  if (!player) {
    if (instance.room.status !== "waiting") throw Object.assign(new Error("Room locked"), { status: 409 });
    addMonstersLeaguePlayer(instance.room, { id: user.id, userId: user.id, name: user.name }, "", Date.now());
    player = instance.room.players.find((entry) => entry.id === user.id);
    await instance.persist();
  }
  const adapter = new NodeSocketAdapter(socket, { playerId: player.id, userId: user.id, name: user.name });
  bindSocket(instance, context, socket, adapter);
  await instance.scheduleNextAlarm();
  adapter.send(JSON.stringify({
    type: "snapshot",
    serverNow: Date.now(),
    room: getMonstersLeagueRoomSummary(instance.room)
  }));
  instance.broadcastSnapshot(adapter);
}

export function installRealtimeServer(server, env, options) {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 3 * 1024 * 1024 });
  server.on("upgrade", async (request, socket, head) => {
    try {
      const origin = options.requestOrigin(request);
      const url = new URL(request.url || "/", origin);
      const campaignMatch = url.pathname.match(/^\/api\/campaigns\/([^/]+)\/socket$/);
      const monsterMatch = url.pathname.match(/^\/api\/multiplayer\/rooms\/([^/]+)\/socket$/);
      if (!campaignMatch && !monsterMatch) return reject(socket, 404, "WebSocket route not found.");
      if (cleanText(request.headers.origin, 300) !== origin) return reject(socket, 403, "Cross-origin connection rejected.");
      const webRequest = webRequestFromUpgrade(request, origin);
      const user = await requireAuthenticatedUser({ request: webRequest, env });

      let roomRecord;
      let attach;
      if (campaignMatch) {
        const campaignId = decodeURIComponent(campaignMatch[1]);
        const campaign = await env.DB.prepare(`
          SELECT c.*, (
            SELECT cm."role" FROM "campaign_members" cm
            WHERE cm."campaignId" = c."id" AND cm."userId" = ? LIMIT 1
          ) AS "memberRole"
          FROM "campaigns" c WHERE c."id" = ? LIMIT 1
        `).bind(user.id, campaignId).first();
        if (!campaign || (campaign.ownerId !== user.id && !campaign.memberRole && !isAdministrator(user))) {
          return reject(socket, 404, "Campaign not found.");
        }
        roomRecord = await env.SHARED_CAMPAIGN_ROOMS.getInstance(campaignId);
        attach = (webSocket) => attachCampaignSocket(webSocket, roomRecord, user, campaign);
      } else {
        const roomId = decodeURIComponent(monsterMatch[1]);
        const record = await env.DB.prepare(
          'SELECT "id", "expiresAt" FROM "multiplayer_rooms" WHERE "id" = ? LIMIT 1'
        ).bind(roomId).first();
        if (!record || Date.parse(record.expiresAt) <= Date.now()) return reject(socket, 404, "Room not found.");
        roomRecord = await env.MONSTERS_LEAGUE_ROOMS.getInstance(roomId);
        attach = (webSocket) => attachMonsterSocket(webSocket, roomRecord, user);
      }

      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        Promise.resolve(attach(webSocket)).catch((error) => {
          console.error("WebSocket attach failed.", error);
          webSocket.close(1011, "Connection failed");
        });
      });
    } catch (error) {
      reject(socket, Number(error?.status) || 401, cleanText(error?.message, 200) || "Unauthorized");
    }
  });
  return webSocketServer;
}

