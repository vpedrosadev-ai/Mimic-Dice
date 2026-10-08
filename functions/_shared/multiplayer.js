import { requireAuthenticatedUser } from "./auth.js";
import { createOwnedCloudCampaign, replaceOwnedCloudCampaignPayload } from "./campaigns.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed,
  readJsonBody
} from "./http.js";
import { createMonstersLeagueEncounters } from "../../src/multiplayer/monstersLeagueRules.js";

const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function handleMultiplayerRoomRequest(context) {
  try {
    if (!context.env?.MONSTERS_LEAGUE_ROOMS) {
      throw new HttpError(503, "multiplayer_unavailable", "Multiplayer room service is not configured.");
    }

    const method = context.request.method.toUpperCase();
    const pathParts = normalizePathParts(context.params?.path);
    const user = await requireAuthenticatedUser(context);

    if (pathParts.length === 0) {
      if (method !== "POST") {
        return methodNotAllowed(["POST"]);
      }

      assertSameOrigin(context.request);
      return await createRoom(context, user);
    }

    const roomId = cleanText(pathParts[0], 80);

    if (roomId && pathParts.length === 2 && pathParts[1] === "finalize") {
      if (method !== "POST") {
        return methodNotAllowed(["POST"]);
      }
      assertSameOrigin(context.request);
      return await finalizeRoomCampaign(context, roomId, user);
    }

    if (!roomId || pathParts.length !== 2 || pathParts[1] !== "socket") {
      throw new HttpError(404, "room_not_found", "Multiplayer room not found.");
    }

    if (method !== "GET") {
      return methodNotAllowed(["GET"]);
    }

    return await connectRoomSocket(context, roomId, user);
  } catch (error) {
    return errorResponse(error);
  }
}

async function createRoom(context, user) {
  const body = await readJsonBody(context.request, 64 * 1024);
  const roomId = createRoomId();
  const name = cleanText(body.name, 80) || "Monsters League";
  const language = body.language === "en" ? "en" : "es";
  const expiresAt = new Date(Date.now() + ROOM_TTL_MS).toISOString();
  const campaignName = cleanText(`Monsters League · ${name}`, 120);
  const campaign = await createOwnedCloudCampaign(context, user, {
    name: campaignName,
    isPublic: false,
    payload: createMonstersLeagueCampaignPayload(campaignName, [])
  });
  const objectId = context.env.MONSTERS_LEAGUE_ROOMS.idFromName(roomId);
  const stub = context.env.MONSTERS_LEAGUE_ROOMS.get(objectId);
  const response = await stub.fetch("https://monsters-league.internal/create", {
    method: "POST",
    headers: buildTrustedHeaders(user, { "Content-Type": "application/json" }),
    body: JSON.stringify({ roomId, campaignId: campaign.id, name, language })
  });

  if (!response.ok) {
    await context.env.DB.prepare(
      'DELETE FROM "campaigns" WHERE "id" = ? AND "ownerId" = ?'
    ).bind(campaign.id, user.id).run();
    throw new HttpError(502, "room_create_failed", "Multiplayer room could not be created.");
  }

  await context.env.DB.prepare(`
    DELETE FROM "multiplayer_rooms" WHERE "expiresAt" <= CURRENT_TIMESTAMP
  `).run();

  await context.env.DB.prepare(`
    INSERT INTO "multiplayer_rooms" ("id", "mode", "hostUserId", "campaignId", "name", "status", "createdAt", "updatedAt", "expiresAt")
    VALUES (?, 'monsters-league', ?, ?, ?, 'configuring', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
  `).bind(roomId, user.id, campaign.id, name, expiresAt).run();

  return jsonResponse({ roomId, campaignId: campaign.id, expiresAt }, 201);
}

async function finalizeRoomCampaign(context, roomId, user) {
  const record = await context.env.DB.prepare(`
    SELECT "id", "hostUserId", "campaignId", "name", "expiresAt"
    FROM "multiplayer_rooms"
    WHERE "id" = ?
    LIMIT 1
  `).bind(roomId).first();

  if (!record || Date.parse(record.expiresAt) <= Date.now()) {
    throw new HttpError(404, "room_not_found", "Multiplayer room not found.");
  }

  if (record.hostUserId !== user.id || !record.campaignId) {
    throw new HttpError(403, "host_required", "Only the room host can save its campaign.");
  }

  const objectId = context.env.MONSTERS_LEAGUE_ROOMS.idFromName(roomId);
  const stub = context.env.MONSTERS_LEAGUE_ROOMS.get(objectId);
  const snapshotResponse = await stub.fetch("https://monsters-league.internal/snapshot", {
    method: "GET",
    headers: buildTrustedHeaders(user)
  });

  if (!snapshotResponse.ok) {
    throw new HttpError(502, "room_snapshot_failed", "Multiplayer room state could not be read.");
  }

  const snapshot = await snapshotResponse.json();
  const room = snapshot?.room;

  if (!room || !["complete", "combat"].includes(room.status)) {
    throw new HttpError(409, "draft_incomplete", "Draft must finish before encounters are saved.");
  }

  const encounters = createMonstersLeagueEncounters(room).map((encounter) => ({
    ...encounter,
    multiplayer: { ...encounter.multiplayer, online: true }
  }));
  const campaignName = cleanText(`Monsters League · ${room.config?.name || record.name}`, 120);
  const campaign = await replaceOwnedCloudCampaignPayload(context, user, record.campaignId, {
    name: campaignName,
    payload: createMonstersLeagueCampaignPayload(campaignName, encounters)
  });

  await context.env.DB.prepare(`
    UPDATE "multiplayer_rooms"
    SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ?
  `).bind(room.status, roomId).run();

  return jsonResponse({
    campaignId: campaign.id,
    campaignName: campaign.name,
    encounterCount: encounters.length
  });
}

async function connectRoomSocket(context, roomId, user) {
  const upgrade = context.request.headers.get("Upgrade");
  const requestUrl = new URL(context.request.url);
  const origin = cleanText(context.request.headers.get("Origin"), 300);

  if (cleanText(upgrade).toLowerCase() !== "websocket") {
    throw new HttpError(426, "websocket_required", "WebSocket upgrade required.");
  }

  if (origin !== requestUrl.origin) {
    throw new HttpError(403, "invalid_origin", "Cross-origin room connection rejected.");
  }

  const record = await context.env.DB.prepare(`
    SELECT "id", "expiresAt" FROM "multiplayer_rooms" WHERE "id" = ? LIMIT 1
  `).bind(roomId).first();

  if (!record || Date.parse(record.expiresAt) <= Date.now()) {
    throw new HttpError(404, "room_not_found", "Multiplayer room not found.");
  }

  const objectId = context.env.MONSTERS_LEAGUE_ROOMS.idFromName(roomId);
  const stub = context.env.MONSTERS_LEAGUE_ROOMS.get(objectId);
  const headers = buildTrustedHeaders(user, {
    Upgrade: "websocket",
    Connection: "Upgrade",
    Origin: requestUrl.origin
  });
  return stub.fetch(new Request(`https://monsters-league.internal/socket/${encodeURIComponent(roomId)}`, {
    method: "GET",
    headers
  }));
}

function buildTrustedHeaders(user, extra = {}) {
  const headers = new Headers(extra);
  headers.set("X-Mimic-User-Id", cleanText(user.id, 120));
  headers.set("X-Mimic-User-Name", encodeURIComponent(cleanText(user.name || user.email, 80) || "Jugador"));
  return headers;
}

function normalizePathParts(value) {
  if (Array.isArray(value)) {
    return value.map((part) => cleanText(part, 120)).filter(Boolean);
  }

  return cleanText(value, 500).split("/").map((part) => cleanText(part, 120)).filter(Boolean);
}

function createRoomId() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function createMonstersLeagueCampaignPayload(name, encounters) {
  return {
    schema: "mimic-dice:campaign",
    version: 1,
    app: "Mimic Dice",
    savedAt: new Date().toISOString(),
    campaign: { name },
    characters: [],
    encounterInventory: {
      folders: [],
      systemFolderExpanded: true,
      encounters: Array.isArray(encounters) ? encounters : []
    },
    compendiumCustomMaps: { bestiary: {}, items: {}, arcanum: {} },
    ui: {
      activeScreen: "encounters",
      activeEncounterId: "",
      activeEncounterFolderId: ""
    }
  };
}
