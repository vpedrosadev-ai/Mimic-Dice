import { getAuthenticatedUser, requireAuthenticatedUser } from "./auth.js";
import { removeCloudAssetReferences, syncCloudAssetReferences } from "./assets.js";
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

function campaignSummary(row, currentUserId = "") {
  const isOwner = Boolean(currentUserId && row.ownerId === currentUserId);

  return {
    id: row.id,
    name: row.name,
    isPublic: row.isPublic === 1,
    revision: row.revision,
    payloadBytes: row.payloadBytes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerName: isOwner ? row.ownerName || "Usuario de Mimic Dice" : "Usuario de Mimic Dice",
    isOwner
  };
}

async function getCampaignRecord(db, campaignId) {
  return db.prepare(`
    SELECT c.*, u."name" AS "ownerName"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    WHERE c."id" = ?
    LIMIT 1
  `).bind(campaignId).first();
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

async function listOwnedCampaigns(context, user) {
  const result = await context.env.DB.prepare(`
    SELECT c.*, u."name" AS "ownerName"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    WHERE c."ownerId" = ?
    ORDER BY c."updatedAt" DESC
    LIMIT ?
  `).bind(user.id, MAX_CAMPAIGNS_PER_USER).all();
  return jsonResponse({ campaigns: result.results.map((row) => campaignSummary(row, user.id)) });
}

async function listPublicCampaigns(context, user) {
  const result = await context.env.DB.prepare(`
    SELECT c.*, u."name" AS "ownerName"
    FROM "campaigns" c
    INNER JOIN "users" u ON u."id" = c."ownerId"
    WHERE c."isPublic" = 1
    ORDER BY c."updatedAt" DESC
    LIMIT 50
  `).all();
  return jsonResponse({ campaigns: result.results.map((row) => campaignSummary(row, user?.id || "")) });
}

async function createCampaign(context, user, sourceBody = null) {
  const body = sourceBody || await readJsonBody(context.request, MAX_CAMPAIGN_BYTES + 4096);
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
  const campaign = await getCampaignRecord(context.env.DB, campaignId);
  return jsonResponse({ campaign: campaignSummary(campaign, user.id) }, 201);
}

async function getCampaign(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);

  if (!campaign || (campaign.ownerId !== user?.id && campaign.isPublic !== 1)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const payload = await readCampaignPayload(context.env.DB, campaign);
  return jsonResponse({ campaign: campaignSummary(campaign, user?.id || ""), payload });
}

async function updateCampaign(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);

  if (!campaign || campaign.ownerId !== user.id) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const body = await readJsonBody(context.request, MAX_CAMPAIGN_BYTES + 4096);
  const baseRevision = Number(body.baseRevision);

  if (!Number.isInteger(baseRevision) || baseRevision !== campaign.revision) {
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  const name = cleanText(body.name || body.payload?.campaign?.name || campaign.name, 120) || campaign.name;
  const isPublic = body.isPublic === true ? 1 : 0;
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
    user.id,
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
  await syncCloudAssetReferences(context.env.DB, user.id, "campaign", campaignId, body.payload);
  const updatedCampaign = await getCampaignRecord(context.env.DB, campaignId);
  return jsonResponse({ campaign: campaignSummary(updatedCampaign, user.id) });
}

async function updateCampaignVisibility(context, campaignId, user) {
  const campaign = await getCampaignRecord(context.env.DB, campaignId);

  if (!campaign || campaign.ownerId !== user.id) {
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
  `).bind(body.isPublic === true ? 1 : 0, now, campaignId, user.id, baseRevision).run();

  if (Number(result.meta?.changes || 0) !== 1) {
    throw new HttpError(409, "revision_conflict", "Campaign changed in another session. Reload before saving.");
  }

  const updatedCampaign = await getCampaignRecord(context.env.DB, campaignId);
  return jsonResponse({ campaign: campaignSummary(updatedCampaign, user.id) });
}

async function deleteCampaign(context, campaignId, user) {
  const result = await context.env.DB.prepare(
    'DELETE FROM "campaigns" WHERE "id" = ? AND "ownerId" = ?'
  ).bind(campaignId, user.id).run();

  if (Number(result.meta?.changes || 0) < 1) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  await removeCloudAssetReferences(context.env.DB, "campaign", campaignId);

  return new Response(null, { status: 204 });
}

async function cloneCampaign(context, campaignId, user) {
  const source = await getCampaignRecord(context.env.DB, campaignId);

  if (!source || (source.isPublic !== 1 && source.ownerId !== user.id)) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const payload = await readCampaignPayload(context.env.DB, source);
  return createCampaign(context, user, {
    name: `${source.name} (copia)`,
    isPublic: false,
    payload
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
        return await listOwnedCampaigns(context, user);
      }
      if (method === "POST") {
        return await createCampaign(context, user);
      }
      return methodNotAllowed(["GET", "POST"]);
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
