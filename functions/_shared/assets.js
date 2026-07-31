import { getAuthenticatedUser, requireAuthenticatedUser } from "./auth.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed
} from "./http.js";

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_ASSET_STORAGE_BYTES_PER_USER = 200 * 1024 * 1024;
const ASSET_ID_PATTERN = /\/api\/assets\/([0-9a-f-]{36})(?:[?#]|$)/gi;

function assertAssetBucket(context) {
  if (!context.env.CLOUD_ASSETS) {
    throw new HttpError(503, "asset_storage_unavailable", "Cloud image storage is not configured.");
  }
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function assetUrl(assetId) {
  return `/api/assets/${encodeURIComponent(assetId)}`;
}

export function extractCloudAssetIds(payload) {
  const serialized = JSON.stringify(payload || {});
  const ids = new Set();

  for (const match of serialized.matchAll(ASSET_ID_PATTERN)) {
    ids.add(match[1].toLowerCase());
  }

  return [...ids];
}

export async function syncCloudAssetReferences(db, ownerId, parentType, parentId, payload) {
  const assetIds = extractCloudAssetIds(payload);
  const statements = [
    db.prepare(
      'DELETE FROM "cloud_asset_references" WHERE "parentType" = ? AND "parentId" = ?'
    ).bind(parentType, parentId),
    ...assetIds.map((assetId) => db.prepare(`
      INSERT OR IGNORE INTO "cloud_asset_references" ("assetId", "parentType", "parentId")
      SELECT a."id", ?, ? FROM "cloud_assets" a
      WHERE a."id" = ? AND (
        a."ownerId" = ?
        OR EXISTS (
          SELECT 1 FROM "cloud_asset_references" r
          INNER JOIN "campaigns" c ON r."parentType" = 'campaign' AND c."id" = r."parentId"
          WHERE r."assetId" = a."id" AND c."isPublic" = 1
        )
        OR EXISTS (
          SELECT 1 FROM "cloud_asset_references" r
          INNER JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
          WHERE r."assetId" = a."id" AND e."isPublic" = 1
        )
      )
    `).bind(parentType, parentId, assetId, ownerId))
  ];
  await db.batch(statements);
}

export async function removeCloudAssetReferences(db, parentType, parentId) {
  await db.prepare(
    'DELETE FROM "cloud_asset_references" WHERE "parentType" = ? AND "parentId" = ?'
  ).bind(parentType, parentId).run();
}

async function uploadAsset(context, user) {
  assertAssetBucket(context);
  const contentType = cleanText(context.request.headers.get("Content-Type"), 100).toLowerCase().split(";")[0];

  if (contentType !== "image/webp") {
    throw new HttpError(415, "invalid_asset_type", "Cloud images must be WebP.");
  }

  const declaredBytes = Number(context.request.headers.get("Content-Length") || 0);

  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_ASSET_BYTES) {
    throw new HttpError(413, "asset_too_large", "Cloud image exceeds 5 MiB limit.");
  }

  const bytes = await context.request.arrayBuffer();

  if (bytes.byteLength < 1 || bytes.byteLength > MAX_ASSET_BYTES) {
    throw new HttpError(413, "asset_too_large", "Cloud image exceeds 5 MiB limit.");
  }

  const sha256 = bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
  const existing = await context.env.DB.prepare(`
    SELECT * FROM "cloud_assets" WHERE "ownerId" = ? AND "sha256" = ? LIMIT 1
  `).bind(user.id, sha256).first();

  if (existing) {
    return jsonResponse({
      asset: {
        id: existing.id,
        url: assetUrl(existing.id),
        byteSize: existing.byteSize,
        mimeType: existing.mimeType,
        deduplicated: true
      }
    });
  }

  const storage = await context.env.DB.prepare(
    'SELECT COALESCE(SUM("byteSize"), 0) AS "bytes" FROM "cloud_assets" WHERE "ownerId" = ?'
  ).bind(user.id).first();

  if (Number(storage?.bytes || 0) + bytes.byteLength > MAX_ASSET_STORAGE_BYTES_PER_USER) {
    throw new HttpError(413, "storage_quota", "Cloud image storage quota exceeded.");
  }

  const assetId = crypto.randomUUID();
  const objectKey = `users/${user.id}/${sha256}.webp`;
  const width = Math.max(0, Math.min(8192, Number(context.request.headers.get("X-Image-Width")) || 0));
  const height = Math.max(0, Math.min(8192, Number(context.request.headers.get("X-Image-Height")) || 0));
  const now = new Date().toISOString();

  await context.env.CLOUD_ASSETS.put(objectKey, bytes, {
    httpMetadata: { contentType: "image/webp" },
    customMetadata: { ownerId: user.id, assetId }
  });
  await context.env.DB.prepare(`
    INSERT INTO "cloud_assets" (
      "id", "ownerId", "objectKey", "sha256", "mimeType", "byteSize", "width", "height", "createdAt"
    ) VALUES (?, ?, ?, ?, 'image/webp', ?, ?, ?, ?)
  `).bind(assetId, user.id, objectKey, sha256, bytes.byteLength, width, height, now).run();

  return jsonResponse({
    asset: {
      id: assetId,
      url: assetUrl(assetId),
      byteSize: bytes.byteLength,
      mimeType: "image/webp",
      deduplicated: false
    }
  }, 201);
}

async function getAsset(context, assetId, user) {
  assertAssetBucket(context);
  const userId = user?.id || "";
  const asset = await context.env.DB.prepare(`
    SELECT a.*,
      CASE WHEN EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "campaigns" c ON r."parentType" = 'campaign' AND c."id" = r."parentId"
        WHERE r."assetId" = a."id" AND c."isPublic" = 1
      ) OR EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
        WHERE r."assetId" = a."id" AND e."isPublic" = 1
      ) THEN 1 ELSE 0 END AS "isPublic",
      CASE WHEN a."ownerId" = ? OR EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "campaigns" c ON r."parentType" = 'campaign' AND c."id" = r."parentId"
        WHERE r."assetId" = a."id" AND c."ownerId" = ?
      ) OR EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
        WHERE r."assetId" = a."id" AND e."ownerId" = ?
      ) THEN 1 ELSE 0 END AS "canAccess"
    FROM "cloud_assets" a
    WHERE a."id" = ?
    LIMIT 1
  `).bind(userId, userId, userId, assetId).first();

  if (!asset || (asset.canAccess !== 1 && asset.isPublic !== 1)) {
    throw new HttpError(404, "asset_not_found", "Cloud image not found.");
  }

  const object = await context.env.CLOUD_ASSETS.get(asset.objectKey);

  if (!object) {
    throw new HttpError(404, "asset_not_found", "Cloud image not found.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", asset.mimeType || "image/webp");
  headers.set("Content-Length", String(asset.byteSize || object.size || 0));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", asset.isPublic === 1
    ? "public, max-age=86400, stale-while-revalidate=604800"
    : "private, max-age=3600");
  return new Response(object.body, { headers });
}

export async function handleAssetRequest(context) {
  try {
    const method = context.request.method.toUpperCase();
    const pathParts = Array.isArray(context.params?.path)
      ? context.params.path.filter(Boolean)
      : context.params?.path
        ? [context.params.path]
        : [];

    if (method === "POST" && pathParts.length === 0) {
      assertSameOrigin(context.request);
      return await uploadAsset(context, await requireAuthenticatedUser(context));
    }

    if (method === "GET" && pathParts.length === 1) {
      const assetId = cleanText(pathParts[0], 80).toLowerCase();
      return await getAsset(context, assetId, await getAuthenticatedUser(context));
    }

    return methodNotAllowed(pathParts.length === 0 ? ["POST"] : ["GET"]);
  } catch (error) {
    return errorResponse(error);
  }
}
