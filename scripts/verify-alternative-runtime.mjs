import { encode } from "@auth/core/jwt";
import WebSocket from "ws";

import { LocalD1Database } from "../server/d1.js";

const origin = String(process.argv.find((argument) => /^https?:\/\//.test(argument)) || "http://127.0.0.1:8788").replace(/\/$/, "");
const authenticated = process.argv.includes("--authenticated");
const multiplayer = process.argv.includes("--multiplayer");

async function expectOk(pathname, options) {
  const response = await fetch(`${origin}${pathname}`, options);
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}: ${await response.text()}`);
  return response;
}
const health = await (await expectOk("/api/health")).json();
if (health.ok !== true || health.service !== "mimic-dice") throw new Error("Health response is invalid.");
const home = await (await expectOk("/")).text();
if (!home.includes("Mimic Dice")) throw new Error("Frontend HTML is invalid.");
const publicCampaigns = await (await expectOk("/api/campaigns/public")).json();
if (!Array.isArray(publicCampaigns.campaigns)) throw new Error("Public campaign response is invalid.");
console.log(`Public checks passed (${publicCampaigns.campaigns.length} public campaigns).`);

if (authenticated) {
  const databasePath = process.env.DATABASE_PATH;
  const secret = process.env.AUTH_SECRET;
  if (!databasePath || !secret) throw new Error("DATABASE_PATH and AUTH_SECRET are required for authenticated verification.");
  const database = new LocalD1Database(databasePath, { readonly: true, fileMustExist: true });
  const target = database.prepare(`
    SELECT u."id", u."name", u."email", c."id" AS "campaignId"
    FROM "users" u INNER JOIN "campaigns" c ON c."ownerId" = u."id"
    ORDER BY c."updatedAt" DESC LIMIT 1
  `).first();
  database.close();
  if (!target) throw new Error("No owned campaign is available for authenticated verification.");
  const cookieName = origin.startsWith("https:") ? "__Secure-authjs.session-token" : "authjs.session-token";
  const token = await encode({
    secret,
    salt: cookieName,
    token: { sub: target.id, name: target.name, email: target.email }
  });
  const cookie = `${cookieName}=${token}`;
  const campaigns = await (await expectOk("/api/campaigns", { headers: { Cookie: cookie } })).json();
  if (!campaigns.campaigns.some((campaign) => campaign.id === target.campaignId)) {
    throw new Error("Authenticated campaign list does not contain expected campaign.");
  }
  const socketUrl = new URL(`/api/campaigns/${encodeURIComponent(target.campaignId)}/socket`, origin);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime verification timed out.")), 10_000);
    const socket = new WebSocket(socketUrl, { headers: { Cookie: cookie, Origin: origin } });
    socket.on("message", (message) => {
      const event = JSON.parse(String(message));
      if (event.type === "revision") {
        clearTimeout(timeout);
        socket.close(1000, "Verification complete");
        resolve();
      }
    });
    socket.on("error", reject);
  });
  console.log("Authenticated API and campaign WebSocket checks passed.");

  if (multiplayer) {
    const commonHeaders = { Cookie: cookie, Origin: origin };
    const created = await (await expectOk("/api/multiplayer/rooms", {
      method: "POST",
      headers: { ...commonHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alternative host verification", language: "es" })
    })).json();
    const multiplayerSocketUrl = new URL(`/api/multiplayer/rooms/${encodeURIComponent(created.roomId)}/socket`, origin);
    multiplayerSocketUrl.protocol = multiplayerSocketUrl.protocol === "https:" ? "wss:" : "ws:";
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Multiplayer verification timed out.")), 10_000);
      const socket = new WebSocket(multiplayerSocketUrl, { headers: commonHeaders });
      socket.on("message", (message) => {
        const event = JSON.parse(String(message));
        if (event.type === "snapshot") {
          clearTimeout(timeout);
          socket.close(1000, "Verification complete");
          resolve();
        }
      });
      socket.on("error", reject);
    });
    const cleanup = await fetch(`${origin}/api/campaigns/${encodeURIComponent(created.campaignId)}`, {
      method: "DELETE",
      headers: commonHeaders
    });
    if (!cleanup.ok) throw new Error(`Verification cleanup returned ${cleanup.status}.`);
    const cleanupDatabase = new LocalD1Database(databasePath, { fileMustExist: true });
    cleanupDatabase.prepare('DELETE FROM "multiplayer_rooms" WHERE "id" = ?').bind(created.roomId).run();
    cleanupDatabase.close();
    console.log("Monsters League WebSocket check passed; temporary campaign removed.");
  }
}

