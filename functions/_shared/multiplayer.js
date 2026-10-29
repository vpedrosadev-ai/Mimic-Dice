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
import { columns } from "../../src/data/combatTrackerData.js";
import { COMBAT_TRACKER_SORT_DEFAULT_VERSION } from "../../src/config/appConstants.js";

const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MONSTERS_LEAGUE_CAMPAIGN_READY_STATUS = "combat_ready";

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

    if (roomId && pathParts.length === 3 && pathParts[1] === "assets") {
      if (!["GET", "HEAD"].includes(method)) {
        return methodNotAllowed(["GET", "HEAD"]);
      }
      return await serveRoomAsset(context, roomId, cleanText(pathParts[2], 120), user, method === "HEAD");
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
    SELECT "id", "hostUserId", "campaignId", "name", "status", "expiresAt"
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

  if (record.status === MONSTERS_LEAGUE_CAMPAIGN_READY_STATUS) {
    const existingCampaign = await context.env.DB.prepare(`
      SELECT "id", "name" FROM "campaigns" WHERE "id" = ? LIMIT 1
    `).bind(record.campaignId).first();
    const memberCount = await context.env.DB.prepare(`
      SELECT COUNT(*) AS "count" FROM "campaign_members" WHERE "campaignId" = ?
    `).bind(record.campaignId).first();
    return jsonResponse({
      campaignId: existingCampaign?.id || record.campaignId,
      campaignName: existingCampaign?.name || campaignName,
      encounterCount: encounters.length,
      memberCount: Number(memberCount?.count || 0)
    });
  }

  const campaign = await replaceOwnedCloudCampaignPayload(context, user, record.campaignId, {
    name: campaignName,
    payload: createMonstersLeagueCampaignPayload(campaignName, encounters)
  });
  const participantUserIds = [...new Set(
    (Array.isArray(room.players) ? room.players : [])
      .filter((player) => player?.isBot !== true)
      .map((player) => cleanText(player?.userId || player?.id, 120))
      .filter((userId) => userId && userId !== record.hostUserId)
  )];
  await context.env.DB.batch([
    context.env.DB.prepare(
      'DELETE FROM "campaign_members" WHERE "campaignId" = ?'
    ).bind(record.campaignId),
    ...participantUserIds.map((userId) => context.env.DB.prepare(`
      INSERT OR IGNORE INTO "campaign_members" ("campaignId", "userId", "role", "createdAt")
        SELECT ?, "id", 'master', CURRENT_TIMESTAMP FROM "users" WHERE "id" = ?
    `).bind(record.campaignId, userId))
  ]);

  await context.env.DB.prepare(`
    UPDATE "multiplayer_rooms"
    SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ?
  `).bind(MONSTERS_LEAGUE_CAMPAIGN_READY_STATUS, roomId).run();

  return jsonResponse({
    campaignId: campaign.id,
    campaignName: campaign.name,
    encounterCount: encounters.length,
    memberCount: participantUserIds.length
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

async function serveRoomAsset(context, roomId, assetId, user, headOnly = false) {
  if (!context.env?.CLOUD_ASSETS || !assetId) {
    throw new HttpError(404, "asset_not_found", "Map asset not found.");
  }

  const record = await context.env.DB.prepare(`
    SELECT "hostUserId", "expiresAt"
    FROM "multiplayer_rooms"
    WHERE "id" = ?
    LIMIT 1
  `).bind(roomId).first();

  if (!record || Date.parse(record.expiresAt) <= Date.now()) {
    throw new HttpError(404, "room_not_found", "Multiplayer room not found.");
  }

  const objectId = context.env.MONSTERS_LEAGUE_ROOMS.idFromName(roomId);
  const stub = context.env.MONSTERS_LEAGUE_ROOMS.get(objectId);
  const authorizationResponse = await stub.fetch("https://monsters-league.internal/authorize", {
    method: "GET",
    headers: buildTrustedHeaders(user)
  });
  const authorization = authorizationResponse.ok ? await authorizationResponse.json() : null;
  if (authorization?.authorized !== true) {
    throw new HttpError(403, "room_membership_required", "Only room participants can view its map.");
  }

  const asset = await context.env.DB.prepare(`
    SELECT "objectKey", "mimeType"
    FROM "cloud_assets"
    WHERE "id" = ? AND "ownerId" = ?
    LIMIT 1
  `).bind(assetId, record.hostUserId).first();
  if (!asset) {
    throw new HttpError(404, "asset_not_found", "Map asset not found.");
  }

  const object = await context.env.CLOUD_ASSETS.get(asset.objectKey);
  if (!object) {
    throw new HttpError(404, "asset_not_found", "Map asset not found.");
  }

  const headers = new Headers({
    "Content-Type": cleanText(asset.mimeType, 120) || "application/octet-stream",
    "Cache-Control": "private, max-age=60",
    "X-Content-Type-Options": "nosniff"
  });
  object.writeHttpMetadata?.(headers);
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(headOnly ? null : object.body, { headers });
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

export function createMonstersLeagueCampaignPayload(name, encounters, options = {}) {
  const sourceEncounters = Array.isArray(encounters) ? encounters : [];
  const roomId = cleanText(sourceEncounters[0]?.multiplayer?.roomId, 80);
  const folderId = roomId ? `monsters-league-folder-${roomId}` : "";
  const storedEncounters = sourceEncounters.map((encounter) => ({
    ...encounter,
    folderId
  }));
  const combatTracker = createMonstersLeagueCombatTracker(storedEncounters, options);

  return {
    schema: "mimic-dice:campaign",
    version: 1,
    app: "Mimic Dice",
    savedAt: new Date().toISOString(),
    campaign: { name },
    characters: [],
    encounterInventory: {
      folders: folderId ? [{ id: folderId, name: cleanText(name, 120), isExpanded: true }] : [],
      systemFolderExpanded: true,
      encounters: storedEncounters
    },
    combatTracker,
    compendiumCustomMaps: { bestiary: {}, items: {}, arcanum: {} },
    ui: {
      activeScreen: "combat-tracker",
      activeEncounterId: storedEncounters[0]?.id || "",
      activeEncounterFolderId: folderId
    }
  };
}

export function createMonstersLeagueCombatTracker(encounters, options = {}) {
  const random = typeof options.random === "function" ? options.random : Math.random;
  const combatants = [];

  for (const encounter of Array.isArray(encounters) ? encounters : []) {
    const team = encounter?.multiplayer && typeof encounter.multiplayer === "object"
      ? encounter.multiplayer
      : {};

    for (const row of Array.isArray(encounter?.rows) ? encounter.rows : []) {
      const units = Math.max(1, Math.floor(Number(row?.units) || 1));

      for (let unitIndex = 0; unitIndex < units; unitIndex += 1) {
        const sequence = combatants.length + 1;
        const initiativeRoll = Math.max(1, Math.min(20, Math.floor(Number(random()) * 20) + 1));
        const maxHp = Math.max(1, Number(row?.hpValue) || 1);
        const rawTeamColor = cleanText(team.color || row?.teamColor);
        combatants.push({
          id: `entity-${sequence}`,
          side: "enemies",
          characterId: "",
          entryId: cleanText(row?.entryId, 160),
          entryKey: cleanText(row?.entryKey || row?.entryId, 240),
          canonicalName: cleanText(row?.canonicalName || row?.name, 160),
          localizedName: cleanText(row?.localizedName, 160),
          canonicalSource: cleanText(row?.canonicalSource || row?.source, 120),
          source: cleanText(row?.source, 120),
          tokenUrl: cleanText(row?.tokenUrl, 1200),
          sourceEncounterId: cleanText(encounter?.id, 160),
          multiplayerRoomId: cleanText(team.roomId, 80),
          multiplayerMonsterId: cleanText(row?.entryId || row?.entryKey, 160),
          teamId: cleanText(team.teamId || row?.teamId, 120),
          teamOwnerUserId: cleanText(team.ownerUserId, 120),
          teamOwnerName: cleanText(team.ownerName, 80),
          multiplayerHostUserId: cleanText(team.hostUserId, 120),
          multiplayerSingleMaster: true,
          teamColor: /^#[0-9a-f]{6}$/i.test(rawTeamColor) ? rawTeamColor.toLowerCase() : "",
          multiplayerOnline: team.online === true,
          ubicacion: cleanText(encounter?.name, 160),
          iniactiva: initiativeRoll,
          nombre: cleanText(row?.name, 160),
          numPeana: String(sequence),
          pgMax: maxHp,
          pgAct: maxHp,
          pgTemp: 0,
          hitDice: "",
          necrotic: 0,
          ca: Number(row?.acValue) || "",
          shieldEquipped: false,
          condiciones: "",
          stats: "",
          tamano: "",
          movimiento: "",
          vision: "",
          lenguas: "",
          crExp: cleanText(row?.crLabel, 40),
          monsterSpellUses: {},
          tag: "ENEMIGO",
          experienceGranted: false,
          hiddenFromInitiative: false,
          isFlying: false,
          flyingHeight: 0,
          initiativeRoll,
          initiativeNat20: initiativeRoll === 20
        });
      }
    }
  }

  return {
    combatants,
    filters: Object.fromEntries(columns.map((column) => [column.key, []])),
    sort: { key: "iniactiva", direction: "desc" },
    combatSearchQuery: "",
    sortDefaultVersion: COMBAT_TRACKER_SORT_DEFAULT_VERSION,
    newEntitySide: "allies",
    nextId: combatants.length + 1,
    inlineAdjustments: Object.fromEntries(combatants.map((combatant) => [combatant.id, { pgAct: "", necrotic: "" }])),
    areaDamage: "",
    isCombatActive: false,
    activeTurnCombatantId: "",
    combatRound: 1,
    combatEncounterLoadOrder: (Array.isArray(encounters) ? encounters : [])
      .map((encounter) => cleanText(encounter?.id))
      .filter(Boolean),
    enemyHpMode: "fixed",
    battleTimer: { elapsedMs: 0, isRunning: false }
  };
}
