import { getAuthenticatedUser, requireAuthenticatedUser } from "./auth.js";
import { removeCloudAssetReferences, syncCloudAssetReferences } from "./assets.js";
import { CATALOG_TYPES, readCatalogEntryPayload } from "./catalog.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed,
  readJsonBody
} from "./http.js";

const ALLOWED_TYPES = new Set(["character", "encounter", "spell", "item", "monster"]);
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_ENTRIES_PER_USER = 200;
const MAX_LIBRARY_STORAGE_BYTES_PER_USER = 200 * 1024 * 1024;
const CHUNK_CHARACTER_COUNT = 300_000;

function normalizeType(value) {
  const type = cleanText(value, 30).toLowerCase();

  if (!ALLOWED_TYPES.has(type)) {
    throw new HttpError(400, "invalid_library_type", "Unknown cloud library entry type.");
  }

  return type;
}

function serializePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "invalid_library_payload", "Library payload must be an object.");
  }

  const serialized = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(serialized).byteLength;

  if (payloadBytes > MAX_ENTRY_BYTES) {
    throw new HttpError(413, "library_entry_too_large", "Library entry exceeds 16 MiB cloud limit.");
  }

  return { serialized, payloadBytes };
}

function splitPayload(serialized) {
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

function entrySummary(row, currentUserId = "") {
  const isOwner = Boolean(currentUserId && row.ownerId === currentUserId);

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description || "",
    isPublic: row.isPublic === 1,
    revision: row.revision,
    payloadBytes: row.payloadBytes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerId: row.ownerId || "",
    ownerName: row.ownerName || "Usuario de Mimic Dice",
    isOwner,
    entryKind: row.entryKind || "manual",
    sourceCampaignId: row.sourceCampaignId || "",
    sourceCampaignName: row.sourceCampaignName || "",
    sourceEntityKey: row.sourceEntityKey || "",
    groupName: row.groupName || "",
    imageUrl: row.imageUrl || "",
    contentHash: row.contentHash || ""
  };
}

async function getEntryRecord(db, entryId) {
  return db.prepare(`
    SELECT e.*, u."name" AS "ownerName", 'manual' AS "entryKind",
           NULL AS "sourceCampaignId"
    FROM "cloud_library_entries" e
    INNER JOIN "users" u ON u."id" = e."ownerId"
    WHERE e."id" = ?
    LIMIT 1
  `).bind(entryId).first();
}

async function getCatalogEntryRecord(db, entryId) {
  return db.prepare(`
    SELECT e.*, u."name" AS "ownerName", c."name" AS "sourceCampaignName",
           'campaign' AS "entryKind"
    FROM "cloud_catalog_entries" e
    INNER JOIN "users" u ON u."id" = e."ownerId"
    INNER JOIN "campaigns" c ON c."id" = e."sourceCampaignId"
    WHERE e."id" = ?
    LIMIT 1
  `).bind(entryId).first();
}

async function readEntryPayload(db, entry) {
  const result = await db.prepare(`
    SELECT "payloadText"
    FROM "cloud_library_chunks"
    WHERE "entryId" = ? AND "payloadVersion" = ?
    ORDER BY "chunkIndex" ASC
  `).bind(entry.id, entry.payloadVersion).all();
  const rows = Array.isArray(result.results) ? result.results : [];

  if (rows.length !== entry.chunkCount) {
    throw new HttpError(503, "library_entry_incomplete", "Library entry is incomplete. Retry shortly.");
  }

  try {
    return JSON.parse(rows.map((row) => row.payloadText).join(""));
  } catch {
    throw new HttpError(500, "library_entry_corrupt", "Library entry could not be decoded.");
  }
}

function chunkStatements(db, entryId, payloadVersion, chunks) {
  return chunks.map((chunk, chunkIndex) => db.prepare(`
    INSERT INTO "cloud_library_chunks" ("entryId", "payloadVersion", "chunkIndex", "payloadText")
    VALUES (?, ?, ?, ?)
  `).bind(entryId, payloadVersion, chunkIndex, chunk));
}

async function listOwnedEntries(context, user) {
  const [manualResult, catalogResult] = await Promise.all([
    context.env.DB.prepare(`
    SELECT e.*, u."name" AS "ownerName", 'manual' AS "entryKind",
           NULL AS "sourceCampaignId"
    FROM "cloud_library_entries" e
    INNER JOIN "users" u ON u."id" = e."ownerId"
    WHERE e."ownerId" = ?
    ORDER BY e."updatedAt" DESC
    LIMIT ?
  `).bind(user.id, MAX_ENTRIES_PER_USER).all(),
    context.env.DB.prepare(`
      SELECT e.*, u."name" AS "ownerName", c."name" AS "sourceCampaignName",
             'campaign' AS "entryKind"
      FROM "cloud_catalog_entries" e
      INNER JOIN "users" u ON u."id" = e."ownerId"
      INNER JOIN "campaigns" c ON c."id" = e."sourceCampaignId"
      WHERE e."ownerId" = ?
      ORDER BY e."updatedAt" DESC
      LIMIT 2000
    `).bind(user.id).all()
  ]);
  const entries = [
    ...(Array.isArray(manualResult.results) ? manualResult.results : []),
    ...(Array.isArray(catalogResult.results) ? catalogResult.results : [])
  ]
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .map((row) => entrySummary(row, user.id));
  return jsonResponse({ entries });
}

async function listPublicEntries(context, user, url) {
  const requestedType = cleanText(url.searchParams.get("type"), 30).toLowerCase();
  const type = requestedType && CATALOG_TYPES.has(requestedType) ? requestedType : "";

  if (requestedType && !type) {
    throw new HttpError(400, "invalid_library_type", "Unknown cloud library entry type.");
  }

  const manualStatement = context.env.DB.prepare(`
        SELECT e.*, u."name" AS "ownerName", 'manual' AS "entryKind",
               NULL AS "sourceCampaignId"
        FROM "cloud_library_entries" e
        INNER JOIN "users" u ON u."id" = e."ownerId"
        WHERE e."isPublic" = 1${type ? ' AND e."type" = ?' : ''}
        ORDER BY e."updatedAt" DESC
        LIMIT 500
      `);
  const manualPromise = type && !ALLOWED_TYPES.has(type)
    ? Promise.resolve({ results: [] })
    : type
      ? manualStatement.bind(type).all()
      : manualStatement.all();
  const catalogQuery = context.env.DB.prepare(`
    SELECT e.*, u."name" AS "ownerName", c."name" AS "sourceCampaignName",
           'campaign' AS "entryKind"
    FROM "cloud_catalog_entries" e
    INNER JOIN "users" u ON u."id" = e."ownerId"
    INNER JOIN "campaigns" c ON c."id" = e."sourceCampaignId"
    WHERE e."isPublic" = 1${type ? ' AND e."type" = ?' : ''}
    ORDER BY e."updatedAt" DESC
    LIMIT 2000
  `);
  const [manualResult, catalogResult] = await Promise.all([
    manualPromise,
    type ? catalogQuery.bind(type).all() : catalogQuery.all()
  ]);
  const entries = [
    ...(Array.isArray(manualResult.results) ? manualResult.results : []),
    ...(Array.isArray(catalogResult.results) ? catalogResult.results : [])
  ]
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 2000)
    .map((row) => entrySummary(row, user?.id || ""));
  return jsonResponse({ entries });
}

async function createEntry(context, user) {
  const body = await readJsonBody(context.request, MAX_ENTRY_BYTES + 8192);
  const type = normalizeType(body.type);
  const name = cleanText(body.name, 160);

  if (!name) {
    throw new HttpError(400, "invalid_library_name", "Library entry name is required.");
  }

  const count = await context.env.DB.prepare(
    'SELECT COUNT(*) AS "count", COALESCE(SUM("payloadBytes"), 0) AS "bytes" FROM "cloud_library_entries" WHERE "ownerId" = ?'
  ).bind(user.id).first();

  if (Number(count?.count || 0) >= MAX_ENTRIES_PER_USER) {
    throw new HttpError(409, "library_entry_limit", `Maximum ${MAX_ENTRIES_PER_USER} library entries per user.`);
  }

  const { serialized, payloadBytes } = serializePayload(body.payload);

  if (Number(count?.bytes || 0) + payloadBytes > MAX_LIBRARY_STORAGE_BYTES_PER_USER) {
    throw new HttpError(413, "storage_quota", "Cloud library storage quota exceeded.");
  }

  const chunks = splitPayload(serialized);
  const entryId = crypto.randomUUID();
  const payloadVersion = crypto.randomUUID();
  const now = new Date().toISOString();
  const groupName = cleanText(body.groupName, 160);
  const imageUrl = cleanText(body.imageUrl, 600);
  const sourceEntityKey = cleanText(body.sourceEntityKey, 180);
  const sourceCampaignName = cleanText(body.sourceCampaignName, 160);
  const statements = [
    context.env.DB.prepare(`
      INSERT INTO "cloud_library_entries" (
        "id", "ownerId", "type", "name", "description", "groupName", "imageUrl",
        "sourceEntityKey", "sourceCampaignName", "isPublic", "revision",
        "payloadVersion", "payloadBytes", "chunkCount", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).bind(
      entryId,
      user.id,
      type,
      name,
      cleanText(body.description, 500),
      groupName,
      imageUrl,
      sourceEntityKey,
      sourceCampaignName,
      body.isPublic === true ? 1 : 0,
      payloadVersion,
      payloadBytes,
      chunks.length,
      now,
      now
    ),
    ...chunkStatements(context.env.DB, entryId, payloadVersion, chunks)
  ];
  await context.env.DB.batch(statements);
  await syncCloudAssetReferences(context.env.DB, user.id, "library", entryId, body.payload);
  const entry = await getEntryRecord(context.env.DB, entryId);
  return jsonResponse({ entry: entrySummary(entry, user.id) }, 201);
}

async function getEntry(context, entryId, user) {
  const catalogEntry = await getCatalogEntryRecord(context.env.DB, entryId);
  const entry = catalogEntry || await getEntryRecord(context.env.DB, entryId);

  if (!entry || (entry.ownerId !== user?.id && entry.isPublic !== 1)) {
    throw new HttpError(404, "library_entry_not_found", "Library entry not found.");
  }

  return jsonResponse({
    entry: entrySummary(entry, user?.id || ""),
    payload: catalogEntry
      ? await readCatalogEntryPayload(context.env.DB, catalogEntry)
      : await readEntryPayload(context.env.DB, entry)
  });
}

async function updateEntryVisibility(context, entryId, user) {
  const catalogEntry = await getCatalogEntryRecord(context.env.DB, entryId);
  const entry = catalogEntry || await getEntryRecord(context.env.DB, entryId);

  if (!entry || entry.ownerId !== user.id) {
    throw new HttpError(404, "library_entry_not_found", "Library entry not found.");
  }

  const body = await readJsonBody(context.request, 4096);
  const baseRevision = Number(body.baseRevision);

  if (!Number.isInteger(baseRevision) || baseRevision !== entry.revision) {
    throw new HttpError(409, "library_revision_conflict", "Library entry changed in another session. Refresh before updating.");
  }

  const now = new Date().toISOString();
  const tableName = catalogEntry ? "cloud_catalog_entries" : "cloud_library_entries";
  const result = await context.env.DB.prepare(`
    UPDATE "${tableName}"
    SET "isPublic" = ?, "revision" = "revision" + 1, "updatedAt" = ?
    WHERE "id" = ? AND "ownerId" = ? AND "revision" = ?
  `).bind(body.isPublic === true ? 1 : 0, now, entryId, user.id, baseRevision).run();

  if (Number(result.meta?.changes || 0) !== 1) {
    throw new HttpError(409, "library_revision_conflict", "Library entry changed in another session. Refresh before updating.");
  }

  const updatedEntry = catalogEntry
    ? await getCatalogEntryRecord(context.env.DB, entryId)
    : await getEntryRecord(context.env.DB, entryId);
  return jsonResponse({ entry: entrySummary(updatedEntry, user.id) });
}

async function deleteEntry(context, entryId, user) {
  const catalogEntry = await getCatalogEntryRecord(context.env.DB, entryId);

  if (catalogEntry) {
    const result = await context.env.DB.prepare(
      'DELETE FROM "cloud_catalog_entries" WHERE "id" = ? AND "ownerId" = ?'
    ).bind(entryId, user.id).run();

    if (Number(result.meta?.changes || 0) < 1) {
      throw new HttpError(404, "library_entry_not_found", "Library entry not found.");
    }

    return new Response(null, { status: 204 });
  }

  const result = await context.env.DB.prepare(
    'DELETE FROM "cloud_library_entries" WHERE "id" = ? AND "ownerId" = ?'
  ).bind(entryId, user.id).run();

  if (Number(result.meta?.changes || 0) < 1) {
    throw new HttpError(404, "library_entry_not_found", "Library entry not found.");
  }

  await removeCloudAssetReferences(context.env.DB, "library", entryId);

  return new Response(null, { status: 204 });
}

export async function handleLibraryRequest(context) {
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
      return await listPublicEntries(context, await getAuthenticatedUser(context), new URL(context.request.url));
    }

    if (pathParts.length === 0) {
      const user = await requireAuthenticatedUser(context);

      if (method === "GET") {
        return await listOwnedEntries(context, user);
      }
      if (method === "POST") {
        return await createEntry(context, user);
      }
      return methodNotAllowed(["GET", "POST"]);
    }

    if (pathParts.length !== 1) {
      throw new HttpError(404, "library_entry_not_found", "Library entry not found.");
    }

    const entryId = cleanText(pathParts[0], 80);

    if (method === "GET") {
      return await getEntry(context, entryId, await getAuthenticatedUser(context));
    }

    const user = await requireAuthenticatedUser(context);

    if (method === "PATCH") {
      return await updateEntryVisibility(context, entryId, user);
    }
    if (method === "DELETE") {
      return await deleteEntry(context, entryId, user);
    }
    return methodNotAllowed(["GET", "PATCH", "DELETE"]);
  } catch (error) {
    return errorResponse(error);
  }
}
