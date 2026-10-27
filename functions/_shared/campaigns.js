import { getAuthenticatedUser, isAdministrator, requireAuthenticatedUser } from "./auth.js";
import { removeCloudAssetReferences, syncCloudAssetReferences } from "./assets.js";
import { syncCampaignCatalog, syncStoredCampaignCatalog } from "./catalog.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed,
  readJsonBody
} from "./http.js";

const MAX_CAMPAIGN_BYTES = 24 * 1024 * 1024;
const MAX_CAMPAIGN_STORAGE_BYTES_PER_USER = 200 * 1024 * 1024;
const MAX_CAMPAIGNS_PER_USER = 50;
const MAX_CAMPAIGN_COLLABORATORS = 20;
const CHUNK_CHARACTER_COUNT = 300_000;

function serializeCampaign(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "invalid_campaign", "Campaign payload must be an object.");
  }

  if (payload.schema !== "mimic-dice:campaign") {
    throw new HttpError(400, "invalid_campaign", "Unknown campaign schema.");
  }

  const serialized = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(serialized).byteLength;

  if (payloadBytes > MAX_CAMPAIGN_BYTES) {
    throw new HttpError(413, "campaign_too_large", "Campaign exceeds 24 MiB cloud limit.");
  }

  return { serialized, payloadBytes };
}

function splitCampaign(serialized) {
  const chunks = [];
  let start = 0;

  while (start < serialized.length) {
    let end = Math.min(start + CHUNK_CHARACTER_COUNT, serialized.length);
    const previousCodeUnit = serialized.charCodeAt(end - 1);
    const nextCodeUnit = serialized.charCodeAt(end);

    if (
      end < serialized.length
      && previousCodeUnit >= 0xD800
      && previousCodeUnit <= 0xDBFF
      && nextCodeUnit >= 0xDC00
      && nextCodeUnit <= 0xDFFF
    ) {
      end -= 1;
    }

    chunks.push(serialized.slice(start, end));
    start = end;
  }

  return chunks.length > 0 ? chunks : ["{}"];
}

export function getCampaignSummary(row, currentUserId = "", administrator = false) {
  const isOwner = Boolean(currentUserId && row.ownerId === currentUserId);
  const isMember = Boolean(currentUserId && row.memberRole === "editor");
  const memberCount = Math.max(0, Number(row.memberCount) || 0);

  return {
    id: row.id,
    name: row.name,
    isPublic: row.isPublic === 1,
    revision: row.revision,
    payloadBytes: row.payloadBytes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerName: row.ownerName || "Usuario de Mimic Dice",
    isOwner,
    isShared: memberCount > 0,
    collaborationOpen: row.collaborationOpen === 1,
    memberCount,
    canEdit: Boolean(isOwner || isMember || administrator),
    canManage: Boolean(isOwner || administrator)
  };
}

async function getCampaignRecord(db, campaignId, currentUserId = "") {
  return db.prepare(`
    SELECT c.*, u."name" AS "ownerName",
      (
        SELECT cm."role" FROM "campaign_members" cm
        WHERE cm."campaignId" = c."id" AND cm."userId" = ?
        LIMIT 1
      ) AS "memberRole",
      (
        SELECT COUNT(*) FROM "campaign_members" cm
        WHERE cm."campaignId" = c."id"
      ) AS "memberCount",
      EXISTS(
        SELECT 1 FROM "campaign_collaboration_sessions" session
        WHERE session."campaignId" = c."id"
      ) AS "collaborationOpen"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    WHERE c."id" = ?
    LIMIT 1
  `).bind(currentUserId, campaignId).first();
}

function canReadCampaign(campaign, user, administrator = false) {
  return Boolean(campaign && (
    campaign.ownerId === user?.id
    || campaign.memberRole === "editor"
    || campaign.isPublic === 1
    || administrator
  ));
}

function canEditCampaign(campaign, user, administrator = false) {
  return Boolean(campaign && (
    campaign.ownerId === user?.id
    || campaign.memberRole === "editor"
    || administrator
  ));
}

async function readCampaignPayload(db, campaign) {
  const result = await db.prepare(`
    SELECT "chunkIndex", "payloadText"
    FROM "campaign_chunks"
    WHERE "campaignId" = ? AND "payloadVersion" = ?
    ORDER BY "chunkIndex" ASC
  `).bind(campaign.id, campaign.payloadVersion).all();
  const rows = Array.isArray(result.results) ? result.results : [];

  if (rows.length !== campaign.chunkCount) {
    throw new HttpError(503, "campaign_incomplete", "Campaign save is incomplete. Retry shortly.");
  }

  try {
    return JSON.parse(rows.map((row) => row.payloadText).join(""));
  } catch {
    throw new HttpError(500, "campaign_corrupt", "Campaign save could not be decoded.");
  }
}

function createChunkStatements(db, campaignId, payloadVersion, chunks) {
  return chunks.map((chunk, chunkIndex) => db.prepare(`
    INSERT INTO "campaign_chunks" ("campaignId", "payloadVersion", "chunkIndex", "payloadText")
    VALUES (?, ?, ?, ?)
  `).bind(campaignId, payloadVersion, chunkIndex, chunk));
}

async function listAccessibleCampaigns(context, user) {
  const administrator = isAdministrator(user);
  const result = await context.env.DB.prepare(`
    SELECT c.*, u."name" AS "ownerName", cm."role" AS "memberRole",
      (SELECT COUNT(*) FROM "campaign_members" members WHERE members."campaignId" = c."id") AS "memberCount",
      EXISTS(SELECT 1 FROM "campaign_collaboration_sessions" session WHERE session."campaignId" = c."id") AS "collaborationOpen"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    LEFT JOIN "campaign_members" cm ON cm."campaignId" = c."id" AND cm."userId" = ?
    WHERE c."ownerId" = ? OR cm."userId" = ?
    ORDER BY c."updatedAt" DESC
    LIMIT ?
  `).bind(user.id, user.id, user.id, MAX_CAMPAIGNS_PER_USER * 2).all();
  return jsonResponse({ campaigns: result.results.map((row) => getCampaignSummary(row, user.id, administrator)) });
}

async function listPublicCampaigns(context, user) {
  const result = await context.env.DB.prepare(`
    SELECT c.*, u."name" AS "ownerName",
      (SELECT COUNT(*) FROM "campaign_members" members WHERE members."campaignId" = c."id") AS "memberCount",
      EXISTS(SELECT 1 FROM "campaign_collaboration_sessions" session WHERE session."campaignId" = c."id") AS "collaborationOpen"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    WHERE c."isPublic" = 1
    ORDER BY c."updatedAt" DESC
    LIMIT 50
  `).all();
  return jsonResponse({ campaigns: result.results.map((row) => getCampaignSummary(row, user?.id || "", isAdministrator(user))) });
}

async function createCampaign(context, user, sourceBody = null) {
  const body = sourceBody || await readJsonBody(context.request, MAX_CAMPAIGN_BYTES + 4096);
  const campaign = await createOwnedCloudCampaign(context, user, body);
  return jsonResponse({ campaign: getCampaignSummary(campaign, user.id) }, 201);
}

export async function createOwnedCloudCampaign(context, user, body) {
  const currentCount = await context.env.DB.prepare(
    'SELECT COUNT(*) AS "count" FROM "campaigns" WHERE "ownerId" = ?'
  ).bind(user.id).first();

  if (Number(currentCount?.count || 0) >= MAX_CAMPAIGNS_PER_USER) {
    throw new HttpError(409, "campaign_limit", `Maximum ${MAX_CAMPAIGNS_PER_USER} campaigns per user.`);
  }

  const name = cleanText(body.name || body.payload?.campaign?.name || "Campaña sin nombre", 120) || "Campaña sin nombre";
  const { serialized, payloadBytes } = serializeCampaign(body.payload);
  const storage = await context.env.DB.prepare(
    'SELECT COALESCE(SUM("payloadBytes"), 0) AS "bytes" FROM "campaigns" WHERE "ownerId" = ?'
  ).bind(user.id).first();

  if (Number(storage?.bytes || 0) + payloadBytes > MAX_CAMPAIGN_STORAGE_BYTES_PER_USER) {
    throw new HttpError(413, "storage_quota", "Campaign cloud storage quota exceeded.");
  }
  const chunks = splitCampaign(serialized);
  const campaignId = crypto.randomUUID();
  const payloadVersion = crypto.randomUUID();
  const now = new Date().toISOString();
  const isPublic = body.isPublic === true ? 1 : 0;
  const statements = [
    context.env.DB.prepare(`
      INSERT INTO "campaigns" (
        "id", "ownerId", "name", "isPublic", "revision", "payloadVersion",
        "payloadBytes", "chunkCount", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).bind(campaignId, user.id, name, isPublic, payloadVersion, payloadBytes, chunks.length, now, now),
    ...createChunkStatements(context.env.DB, campaignId, payloadVersion, chunks)
  ];
  await context.env.DB.batch(statements);
  await syncCloudAssetReferences(context.env.DB, user.id, "campaign", campaignId, body.payload);

  await syncCampaignCatalog(context.env.DB, {
    campaignId,
    ownerId: user.id,
    payload: body.payload,
    isPublic: isPublic === 1,
    forceVisibility: isPublic === 1
  });

  const campaign = await getCampaignRecord(context.env.DB, campaignId);
  return campaign;
}

export async function replaceOwnedCloudCampaignPayload(context, user, campaignId, body) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);

  if (!campaign || campaign.ownerId !== user.id) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const name = cleanText(body.name || body.payload?.campaign?.name || campaign.name, 120) || campaign.name;
  const { serialized, payloadBytes } = serializeCampaign(body.payload);
  const storage = await context.env.DB.prepare(
    'SELECT COALESCE(SUM("payloadBytes"), 0) AS "bytes" FROM "campaigns" WHERE "ownerId" = ?'
  ).bind(user.id).first();

  if (Number(storage?.bytes || 0) - Number(campaign.payloadBytes || 0) + payloadBytes > MAX_CAMPAIGN_STORAGE_BYTES_PER_USER) {
    throw new HttpError(413, "storage_quota", "Campaign cloud storage quota exceeded.");
  }

  const chunks = splitCampaign(serialized);
  const payloadVersion = crypto.randomUUID();
  const now = new Date().toISOString();
  await context.env.DB.batch(createChunkStatements(context.env.DB, campaignId, payloadVersion, chunks));
  await context.env.DB.prepare(`
    UPDATE "campaigns"
    SET "name" = ?, "revision" = "revision" + 1, "payloadVersion" = ?,
        "payloadBytes" = ?, "chunkCount" = ?, "updatedAt" = ?
    WHERE "id" = ? AND "ownerId" = ?
  `).bind(name, payloadVersion, payloadBytes, chunks.length, now, campaignId, user.id).run();
  await context.env.DB.prepare(
    'DELETE FROM "campaign_chunks" WHERE "campaignId" = ? AND "payloadVersion" <> ?'
  ).bind(campaignId, payloadVersion).run();
  await syncCloudAssetReferences(context.env.DB, user.id, "campaign", campaignId, body.payload);
  await syncCampaignCatalog(context.env.DB, {
    campaignId,
    ownerId: user.id,
    payload: body.payload,
    isPublic: campaign.isPublic === 1,
    forceVisibility: campaign.isPublic === 1
  });

  return await getCampaignRecord(context.env.DB, campaignId);
}

async function getCampaign(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user?.id || "");
  const administrator = isAdministrator(user);

  if (!canReadCampaign(campaign, user, administrator)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const payload = await readCampaignPayload(context.env.DB, campaign);
  return jsonResponse({ campaign: getCampaignSummary(campaign, user?.id || "", administrator), payload });
}

async function getCampaignStatus(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user?.id || "");
  const administrator = isAdministrator(user);

  if (!canReadCampaign(campaign, user, administrator)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  return jsonResponse({ campaign: getCampaignSummary(campaign, user?.id || "", administrator) });
}

async function notifyCampaignRevision(context, campaign, actorUserId = "") {
  if (!context.env?.SHARED_CAMPAIGN_ROOMS || !campaign?.id) return;
  try {
    const objectId = context.env.SHARED_CAMPAIGN_ROOMS.idFromName(campaign.id);
    await context.env.SHARED_CAMPAIGN_ROOMS.get(objectId).fetch("https://shared-campaign.internal/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        revision: campaign.revision,
        updatedAt: campaign.updatedAt,
        actorUserId
      })
    });
  } catch {
    // Durable Object relay is an acceleration layer. D1 remains authoritative.
  }
}

async function openCampaignCollaboration(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  if (!campaign || (campaign.ownerId !== user.id && !isAdministrator(user))) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const existing = await context.env.DB.prepare(`
    SELECT "inviteToken" FROM "campaign_collaboration_sessions" WHERE "campaignId" = ? LIMIT 1
  `).bind(campaignId).first();
  const inviteToken = cleanText(existing?.inviteToken, 120)
    || crypto.randomUUID().replaceAll("-", "");

  await context.env.DB.prepare(`
    INSERT INTO "campaign_collaboration_sessions" ("campaignId", "inviteToken", "createdAt", "updatedAt")
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("campaignId") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP
  `).bind(campaignId, inviteToken).run();

  const updated = await getCampaignRecord(context.env.DB, campaignId, user.id);
  const inviteUrl = new URL("/", context.request.url);
  inviteUrl.searchParams.set("cloudJoin", inviteToken);
  return jsonResponse({
    campaign: getCampaignSummary(updated, user.id, isAdministrator(user)),
    share: { inviteToken, inviteUrl: inviteUrl.toString() }
  });
}

async function closeCampaignCollaboration(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  if (!campaign || (campaign.ownerId !== user.id && !isAdministrator(user))) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM "campaign_collaboration_sessions" WHERE "campaignId" = ?').bind(campaignId),
    context.env.DB.prepare('DELETE FROM "campaign_members" WHERE "campaignId" = ?').bind(campaignId)
  ]);

  if (context.env?.SHARED_CAMPAIGN_ROOMS) {
    try {
      const objectId = context.env.SHARED_CAMPAIGN_ROOMS.idFromName(campaignId);
      await context.env.SHARED_CAMPAIGN_ROOMS.get(objectId).fetch("https://shared-campaign.internal/close", {
        method: "POST"
      });
    } catch {}
  }

  const updated = await getCampaignRecord(context.env.DB, campaignId, user.id);
  return jsonResponse({ campaign: getCampaignSummary(updated, user.id, isAdministrator(user)) });
}

async function joinCampaignCollaboration(context, user) {
  const body = await readJsonBody(context.request, 4096);
  const inviteToken = cleanText(body.inviteToken, 120);
  if (!inviteToken) {
    throw new HttpError(400, "invite_required", "Campaign invite is required.");
  }

  const session = await context.env.DB.prepare(`
    SELECT c."id", c."ownerId"
    FROM "campaign_collaboration_sessions" session
    INNER JOIN "campaigns" c ON c."id" = session."campaignId"
    WHERE session."inviteToken" = ?
    LIMIT 1
  `).bind(inviteToken).first();
  if (!session) {
    throw new HttpError(404, "campaign_invite_not_found", "Campaign invite is invalid or closed.");
  }

  if (session.ownerId !== user.id) {
    const membership = await context.env.DB.prepare(`
      SELECT 1 AS "exists" FROM "campaign_members" WHERE "campaignId" = ? AND "userId" = ? LIMIT 1
    `).bind(session.id, user.id).first();
    if (!membership) {
      const memberCount = await context.env.DB.prepare(`
        SELECT COUNT(*) AS "count" FROM "campaign_members" WHERE "campaignId" = ?
      `).bind(session.id).first();
      if (Number(memberCount?.count || 0) >= MAX_CAMPAIGN_COLLABORATORS) {
        throw new HttpError(409, "collaboration_full", `Maximum ${MAX_CAMPAIGN_COLLABORATORS} collaborators per campaign.`);
      }
    }
    await context.env.DB.prepare(`
      INSERT OR IGNORE INTO "campaign_members" ("campaignId", "userId", "role", "createdAt")
      VALUES (?, ?, 'editor', CURRENT_TIMESTAMP)
    `).bind(session.id, user.id).run();
  }

  const campaign = await getCampaignRecord(context.env.DB, session.id, user.id);
  return jsonResponse({ campaign: getCampaignSummary(campaign, user.id, isAdministrator(user)) });
}

async function leaveCampaignCollaboration(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  if (!campaign || campaign.memberRole !== "editor" || campaign.ownerId === user.id) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }
  await context.env.DB.prepare(`
    DELETE FROM "campaign_members" WHERE "campaignId" = ? AND "userId" = ?
  `).bind(campaignId, user.id).run();
  return new Response(null, { status: 204 });
}

async function connectCampaignSocket(context, campaignId, user) {
  if (!context.env?.SHARED_CAMPAIGN_ROOMS) {
    throw new HttpError(503, "collaboration_unavailable", "Campaign collaboration service is unavailable.");
  }
  const requestUrl = new URL(context.request.url);
  const origin = cleanText(context.request.headers.get("Origin"), 300);
  if (cleanText(context.request.headers.get("Upgrade")).toLowerCase() !== "websocket") {
    throw new HttpError(426, "websocket_required", "WebSocket upgrade required.");
  }
  if (origin !== requestUrl.origin) {
    throw new HttpError(403, "invalid_origin", "Cross-origin campaign connection rejected.");
  }

  const campaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  const administrator = isAdministrator(user);
  if (!campaign || (!canEditCampaign(campaign, user, administrator))) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const objectId = context.env.SHARED_CAMPAIGN_ROOMS.idFromName(campaignId);
  const headers = new Headers({
    Upgrade: "websocket",
    Connection: "Upgrade",
    Origin: requestUrl.origin,
    "X-Mimic-User-Id": cleanText(user.id, 120),
    "X-Mimic-User-Name": encodeURIComponent(cleanText(user.name || user.email, 80) || "Player"),
    "X-Mimic-Campaign-Id": campaignId,
    "X-Mimic-Campaign-Revision": String(Math.max(0, Number(campaign.revision) || 0)),
    "X-Mimic-Campaign-Updated-At": cleanText(campaign.updatedAt, 80)
  });
  return context.env.SHARED_CAMPAIGN_ROOMS.get(objectId).fetch(new Request(
    `https://shared-campaign.internal/socket/${encodeURIComponent(campaignId)}`,
    { method: "GET", headers }
  ));
}

async function updateCampaign(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId, user.id);

  const administrator = isAdministrator(user);
  if (!canEditCampaign(campaign, user, administrator)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const body = await readJsonBody(context.request, MAX_CAMPAIGN_BYTES + 4096);
  const baseRevision = Number(body.baseRevision);

  if (!Number.isInteger(baseRevision) || baseRevision !== campaign.revision) {
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  const name = cleanText(body.name || body.payload?.campaign?.name || campaign.name, 120) || campaign.name;
  const canManage = campaign.ownerId === user.id || administrator;
  const isPublic = canManage ? (body.isPublic === true ? 1 : 0) : campaign.isPublic;
  const { serialized, payloadBytes } = serializeCampaign(body.payload);
  const storage = await context.env.DB.prepare(
    'SELECT COALESCE(SUM("payloadBytes"), 0) AS "bytes" FROM "campaigns" WHERE "ownerId" = ?'
  ).bind(campaign.ownerId).first();

  if (Number(storage?.bytes || 0) - Number(campaign.payloadBytes || 0) + payloadBytes > MAX_CAMPAIGN_STORAGE_BYTES_PER_USER) {
    throw new HttpError(413, "storage_quota", "Campaign cloud storage quota exceeded.");
  }
  const chunks = splitCampaign(serialized);
  const payloadVersion = crypto.randomUUID();
  const now = new Date().toISOString();

  await context.env.DB.batch(createChunkStatements(context.env.DB, campaignId, payloadVersion, chunks));
  const updateResult = await context.env.DB.prepare(`
    UPDATE "campaigns"
    SET "name" = ?, "isPublic" = ?, "revision" = "revision" + 1,
        "payloadVersion" = ?, "payloadBytes" = ?, "chunkCount" = ?, "updatedAt" = ?
    WHERE "id" = ? AND "ownerId" = ? AND "revision" = ?
  `).bind(
    name,
    isPublic,
    payloadVersion,
    payloadBytes,
    chunks.length,
    now,
    campaignId,
    campaign.ownerId,
    baseRevision
  ).run();

  if (Number(updateResult.meta?.changes || 0) !== 1) {
    await context.env.DB.prepare(
      'DELETE FROM "campaign_chunks" WHERE "campaignId" = ? AND "payloadVersion" = ?'
    ).bind(campaignId, payloadVersion).run();
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  await context.env.DB.prepare(
    'DELETE FROM "campaign_chunks" WHERE "campaignId" = ? AND "payloadVersion" <> ?'
  ).bind(campaignId, payloadVersion).run();
  await syncCloudAssetReferences(context.env.DB, campaign.ownerId, "campaign", campaignId, body.payload);
  const wasPublic = campaign.isPublic === 1;
  const willBePublic = isPublic === 1;

  await syncCampaignCatalog(context.env.DB, {
    campaignId,
    ownerId: campaign.ownerId,
    payload: body.payload,
    isPublic: willBePublic,
    forceVisibility: wasPublic === willBePublic ? null : willBePublic
  });

  const updatedCampaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  const revisionNotification = notifyCampaignRevision(context, updatedCampaign, user.id);
  if (typeof context.waitUntil === "function") context.waitUntil(revisionNotification);
  else await revisionNotification;
  return jsonResponse({ campaign: getCampaignSummary(updatedCampaign, user.id, administrator) });
}

async function updateCampaignVisibility(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);

  const administrator = isAdministrator(user);
  if (!campaign || (campaign.ownerId !== user.id && !administrator)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const body = await readJsonBody(context.request, 4096);
  const baseRevision = Number(body.baseRevision);

  if (!Number.isInteger(baseRevision) || baseRevision !== campaign.revision) {
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  const now = new Date().toISOString();
  const result = await context.env.DB.prepare(`
    UPDATE "campaigns"
    SET "isPublic" = ?, "revision" = "revision" + 1, "updatedAt" = ?
    WHERE "id" = ? AND "ownerId" = ? AND "revision" = ?
  `).bind(body.isPublic === true ? 1 : 0, now, campaignId, campaign.ownerId, baseRevision).run();

  if (Number(result.meta?.changes || 0) !== 1) {
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  await syncStoredCampaignCatalog(context.env.DB, {
    campaignId,
    ownerId: campaign.ownerId,
    isPublic: body.isPublic === true,
    forceVisibility: body.isPublic === true
  });

  const updatedCampaign = await getCampaignRecord(context.env.DB, campaignId, user.id);
  return jsonResponse({ campaign: getCampaignSummary(updatedCampaign, user.id, administrator) });
}

async function deleteCampaign(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);
  if (!campaign || (campaign.ownerId !== user.id && !isAdministrator(user))) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }
  const results = await context.env.DB.batch([
    context.env.DB.prepare(
      'DELETE FROM "cloud_catalog_entries" WHERE "sourceCampaignId" = ? AND "ownerId" = ?'
    ).bind(campaignId, campaign.ownerId),
    context.env.DB.prepare(
      'DELETE FROM "campaigns" WHERE "id" = ? AND "ownerId" = ?'
    ).bind(campaignId, campaign.ownerId)
  ]);
  const result = results[1];

  if (Number(result.meta?.changes || 0) < 1) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  await removeCloudAssetReferences(context.env.DB, "campaign", campaignId);

  return new Response(null, { status: 204 });
}

async function cloneCampaign(context, campaignId, user) {
  const source = await getCampaignRecord(context.env.DB, campaignId, user.id);

  if (!canReadCampaign(source, user)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const payload = await readCampaignPayload(context.env.DB, source);
  const cloneName = cleanText(`Copia de ${source.name}`, 120);
  return createCampaign(context, user, {
    name: cloneName,
    isPublic: false,
    payload: {
      ...payload,
      campaign: {
        ...(payload?.campaign && typeof payload.campaign === "object" && !Array.isArray(payload.campaign)
          ? payload.campaign
          : {}),
        name: cloneName
      }
    }
  });
}

export async function handleCampaignRequest(context) {
  try {
    const method = context.request.method.toUpperCase();
    const pathParts = Array.isArray(context.params?.path)
      ? context.params.path.filter(Boolean)
      : context.params?.path
        ? [context.params.path]
        : [];

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      assertSameOrigin(context.request);
    }

    if (pathParts[0] === "public" && pathParts.length === 1) {
      if (method !== "GET") {
        return methodNotAllowed(["GET"]);
      }
      return await listPublicCampaigns(context, await getAuthenticatedUser(context));
    }

    if (pathParts.length === 0) {
      const user = await requireAuthenticatedUser(context);

      if (method === "GET") {
        return await listAccessibleCampaigns(context, user);
      }
      if (method === "POST") {
        return await createCampaign(context, user);
      }
      return methodNotAllowed(["GET", "POST"]);
    }

    if (pathParts[0] === "join" && pathParts.length === 1) {
      if (method !== "POST") {
        return methodNotAllowed(["POST"]);
      }
      return await joinCampaignCollaboration(context, await requireAuthenticatedUser(context));
    }

    const campaignId = cleanText(pathParts[0], 80);

    if (!campaignId) {
      throw new HttpError(404, "campaign_not_found", "Campaign not found.");
    }

    if (pathParts[1] === "clone" && pathParts.length === 2) {
      if (method !== "POST") {
        return methodNotAllowed(["POST"]);
      }
      return await cloneCampaign(context, campaignId, await requireAuthenticatedUser(context));
    }

    if (pathParts[1] === "status" && pathParts.length === 2) {
      if (method !== "GET") {
        return methodNotAllowed(["GET"]);
      }
      return await getCampaignStatus(context, campaignId, await getAuthenticatedUser(context));
    }

    if (pathParts[1] === "share" && pathParts.length === 2) {
      const user = await requireAuthenticatedUser(context);
      if (method === "POST") {
        return await openCampaignCollaboration(context, campaignId, user);
      }
      if (method === "DELETE") {
        return await closeCampaignCollaboration(context, campaignId, user);
      }
      return methodNotAllowed(["POST", "DELETE"]);
    }

    if (pathParts[1] === "membership" && pathParts.length === 2) {
      if (method !== "DELETE") {
        return methodNotAllowed(["DELETE"]);
      }
      return await leaveCampaignCollaboration(context, campaignId, await requireAuthenticatedUser(context));
    }

    if (pathParts[1] === "socket" && pathParts.length === 2) {
      if (method !== "GET") {
        return methodNotAllowed(["GET"]);
      }
      return await connectCampaignSocket(context, campaignId, await requireAuthenticatedUser(context));
    }

    if (pathParts.length !== 1) {
      throw new HttpError(404, "campaign_not_found", "Campaign not found.");
    }

    if (method === "GET") {
      return await getCampaign(context, campaignId, await getAuthenticatedUser(context));
    }

    const user = await requireAuthenticatedUser(context);

    if (method === "PUT") {
      return await updateCampaign(context, campaignId, user);
    }
    if (method === "PATCH") {
      return await updateCampaignVisibility(context, campaignId, user);
    }
    if (method === "DELETE") {
      return await deleteCampaign(context, campaignId, user);
    }
    return methodNotAllowed(["GET", "PUT", "PATCH", "DELETE"]);
  } catch (error) {
    return errorResponse(error);
  }
}
