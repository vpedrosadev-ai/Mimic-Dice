import { getAuthenticatedUser, isAdministrator, requireAuthenticatedUser } from "./auth.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed
} from "./http.js";

const MAX_IMAGE_ASSET_BYTES = 75 * 1024 * 1024;
const MAX_PDF_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_GLOBAL_ASSET_STORAGE_BYTES = 9_000_000_000;
const ASSET_ID_PATTERN = /\/api\/assets\/([0-9a-f-]{36})(?![0-9a-f-])/gi;
const GLOBAL_STORAGE_QUOTA_CODE = "global_asset_storage_quota";
const GLOBAL_STORAGE_QUOTA_MESSAGE = "El almacenamiento de la aplicación está cerca del límite de 10 GB. No se ha subido el archivo para evitar superar 9 GB. Contacta con los administradores de Mimic Dice.";

function assertAssetBucket(context) {
  if (!context.env.CLOUD_ASSETS) {
    throw new HttpError(503, "asset_storage_unavailable", "Cloud asset storage is not configured.");
  }
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function assetUrl(assetId) {
  return `/api/assets/${encodeURIComponent(assetId)}`;
}

function globalStorageQuotaError() {
  return new HttpError(413, GLOBAL_STORAGE_QUOTA_CODE, GLOBAL_STORAGE_QUOTA_MESSAGE);
}

function isGlobalStorageQuotaError(error) {
  return String(error?.message || error || "").includes(GLOBAL_STORAGE_QUOTA_CODE);
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
        OR EXISTS (
          SELECT 1 FROM "cloud_library_entries" e
          WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."isPublic" = 1
        )
        OR EXISTS (
          SELECT 1 FROM "cloud_catalog_entries" e
          WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."isPublic" = 1
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
  const assetConfig = contentType === "image/webp"
    ? { extension: "webp", maxBytes: MAX_IMAGE_ASSET_BYTES, tooLargeCode: "asset_too_large", tooLargeMessage: "Cloud image exceeds 75 MiB limit." }
    : contentType === "application/pdf"
      ? { extension: "pdf", maxBytes: MAX_PDF_ASSET_BYTES, tooLargeCode: "pdf_too_large", tooLargeMessage: "Character sheet PDF exceeds 20 MiB limit." }
      : null;

  if (!assetConfig) {
    throw new HttpError(415, "invalid_asset_type", "Cloud assets must be WebP images or PDF documents.");
  }

  const declaredBytes = Number(context.request.headers.get("Content-Length") || 0);

  if (Number.isFinite(declaredBytes) && declaredBytes > assetConfig.maxBytes) {
    throw new HttpError(413, assetConfig.tooLargeCode, assetConfig.tooLargeMessage);
  }

  const bytes = await context.request.arrayBuffer();

  if (bytes.byteLength < 1 || bytes.byteLength > assetConfig.maxBytes) {
    throw new HttpError(413, assetConfig.tooLargeCode, assetConfig.tooLargeMessage);
  }

  if (contentType === "application/pdf") {
    const signature = new TextDecoder().decode(bytes.slice(0, 5));

    if (signature !== "%PDF-") {
      throw new HttpError(415, "invalid_pdf", "Character sheet is not a valid PDF document.");
    }
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

  const globalStorage = await context.env.DB.prepare(
    'SELECT "storedBytes" FROM "cloud_asset_storage_usage" WHERE "id" = 1'
  ).first();

  if (Number(globalStorage?.storedBytes || 0) + bytes.byteLength > MAX_GLOBAL_ASSET_STORAGE_BYTES) {
    throw globalStorageQuotaError();
  }

  const assetId = crypto.randomUUID();
  const objectKey = `users/${user.id}/${sha256}.${assetConfig.extension}`;
  const width = contentType === "image/webp"
    ? Math.max(0, Math.min(8192, Number(context.request.headers.get("X-Image-Width")) || 0))
    : 0;
  const height = contentType === "image/webp"
    ? Math.max(0, Math.min(8192, Number(context.request.headers.get("X-Image-Height")) || 0))
    : 0;
  const now = new Date().toISOString();

  await context.env.CLOUD_ASSETS.put(objectKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: { ownerId: user.id, assetId }
  });
  try {
    await context.env.DB.prepare(`
      INSERT INTO "cloud_assets" (
        "id", "ownerId", "objectKey", "sha256", "mimeType", "byteSize", "width", "height", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(assetId, user.id, objectKey, sha256, contentType, bytes.byteLength, width, height, now).run();
  } catch (error) {
    const concurrentlyCreated = await context.env.DB.prepare(`
      SELECT * FROM "cloud_assets" WHERE "ownerId" = ? AND "sha256" = ? LIMIT 1
    `).bind(user.id, sha256).first();

    if (concurrentlyCreated) {
      return jsonResponse({
        asset: {
          id: concurrentlyCreated.id,
          url: assetUrl(concurrentlyCreated.id),
          byteSize: concurrentlyCreated.byteSize,
          mimeType: concurrentlyCreated.mimeType,
          deduplicated: true
        }
      });
    }

    if (isGlobalStorageQuotaError(error)) {
      try {
        await context.env.CLOUD_ASSETS.delete(objectKey);
      } catch (cleanupError) {
        console.error("Could not remove rejected cloud asset.", cleanupError);
      }
      throw globalStorageQuotaError();
    }

    throw error;
  }

  return jsonResponse({
    asset: {
      id: assetId,
      url: assetUrl(assetId),
      byteSize: bytes.byteLength,
      mimeType: contentType,
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
      ) OR EXISTS (
        SELECT 1 FROM "cloud_library_entries" e
        WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."isPublic" = 1
      ) OR EXISTS (
        SELECT 1 FROM "cloud_catalog_entries" e
        WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."isPublic" = 1
      ) THEN 1 ELSE 0 END AS "isPublic",
      CASE WHEN a."ownerId" = ? OR EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "campaigns" c ON r."parentType" = 'campaign' AND c."id" = r."parentId"
        WHERE r."assetId" = a."id" AND c."ownerId" = ?
      ) OR EXISTS (
        SELECT 1 FROM "cloud_asset_references" r
        INNER JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
        WHERE r."assetId" = a."id" AND e."ownerId" = ?
      ) OR EXISTS (
        SELECT 1 FROM "cloud_library_entries" e
        WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."ownerId" = ?
      ) OR EXISTS (
        SELECT 1 FROM "cloud_catalog_entries" e
        WHERE e."imageUrl" = '/api/assets/' || a."id" AND e."ownerId" = a."ownerId" AND e."ownerId" = ?
      ) THEN 1 ELSE 0 END AS "canAccess"
    FROM "cloud_assets" a
    WHERE a."id" = ?
    LIMIT 1
  `).bind(userId, userId, userId, userId, userId, assetId).first();

  if (!asset || (asset.canAccess !== 1 && asset.isPublic !== 1 && !isAdministrator(user))) {
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
    : asset.mimeType === "application/pdf"
      ? "private, no-store"
      : "private, max-age=3600");
  if (asset.mimeType === "application/pdf") {
    headers.set("Content-Disposition", 'inline; filename="character-sheet.pdf"');
    headers.set("Content-Security-Policy", "sandbox");
  }
  return new Response(context.request.method.toUpperCase() === "HEAD" ? null : object.body, { headers });
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

    if ((method === "GET" || method === "HEAD") && pathParts.length === 1) {
      const assetId = cleanText(pathParts[0], 80).toLowerCase();
      return await getAsset(context, assetId, await getAuthenticatedUser(context));
    }

    return methodNotAllowed(pathParts.length === 0 ? ["POST"] : ["GET", "HEAD"]);
  } catch (error) {
    return errorResponse(error);
  }
}
