import { requireAdministrator, isAdministrator } from "./auth.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed,
  readJsonBody
} from "./http.js";

const MANAGEABLE_ITEM_KINDS = new Set(["campaign", "library", "catalog", "asset"]);
const CONTENT_TYPES = new Set(["character", "encounter", "spell", "item", "monster", "map", "diary", "table"]);
const R2_DELETE_BATCH_SIZE = 1000;
const D1_BATCH_SIZE = 50;

const STORAGE_CATEGORY_LABELS = Object.freeze({
  "character-pdf": "PDF de personajes",
  "character-image": "Imágenes de personajes",
  "encounter-image": "Imágenes de encuentros",
  "spell-image": "Imágenes de hechizos",
  "item-image": "Imágenes de objetos",
  "monster-image": "Imágenes de criaturas",
  "map-image": "Imágenes de mapas",
  "diary-image": "Imágenes del diario",
  "table-image": "Imágenes de tablas",
  "campaign-asset": "Archivos de campañas",
  "referenced-asset": "Otros archivos referenciados",
  orphan: "Archivos huérfanos",
  untracked: "Objetos R2 sin registro"
});

function resultRows(result) {
  return Array.isArray(result?.results) ? result.results : [];
}

function parseObjectOwnerId(objectKey) {
  const match = String(objectKey || "").match(/^users\/([^/]+)\//);
  return match?.[1] || "";
}

function splitTypes(value) {
  return String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function classifyAdminAsset(row = {}) {
  if (String(row.mimeType || "").toLowerCase() === "application/pdf") {
    return "character-pdf";
  }

  const contentType = cleanText(
    row.directLibraryType
      || row.directCatalogType
      || splitTypes(row.referenceLibraryTypes)[0],
    30
  ).toLowerCase();

  if (CONTENT_TYPES.has(contentType)) {
    return `${contentType}-image`;
  }
  if (Number(row.campaignReferenceCount || 0) > 0) {
    return "campaign-asset";
  }
  if (Number(row.referenceCount || 0) > 0) {
    return "referenced-asset";
  }
  return "orphan";
}

export function summarizeAdminStorage(objects = [], assetRows = []) {
  const assetsByObjectKey = new Map(assetRows.map((row) => [String(row.objectKey || ""), row]));
  const categories = new Map();
  const userBytes = new Map();
  const userObjects = new Map();
  let totalBytes = 0;

  for (const object of objects) {
    const objectKey = String(object?.key || "");
    const tracked = assetsByObjectKey.get(objectKey);
    const category = tracked ? classifyAdminAsset(tracked) : "untracked";
    const bytes = Math.max(0, Number(object?.size || 0));
    const ownerId = String(tracked?.ownerId || parseObjectOwnerId(objectKey));
    const current = categories.get(category) || { type: category, bytes: 0, count: 0, items: [] };
    current.bytes += bytes;
    current.count += 1;
    current.items.push({
      id: String(tracked?.id || ""),
      objectKey,
      name: String(tracked?.directLibraryName || tracked?.directCatalogName || ""),
      ownerId,
      mimeType: String(tracked?.mimeType || ""),
      bytes,
      tracked: Boolean(tracked),
      createdAt: tracked?.createdAt || (object?.uploaded ? new Date(object.uploaded).toISOString() : "")
    });
    categories.set(category, current);
    totalBytes += bytes;
    if (ownerId) {
      userBytes.set(ownerId, (userBytes.get(ownerId) || 0) + bytes);
      userObjects.set(ownerId, (userObjects.get(ownerId) || 0) + 1);
    }
  }

  return {
    totalBytes,
    userBytes,
    userObjects,
    categories: [...categories.values()]
      .map((entry) => ({
        ...entry,
        label: STORAGE_CATEGORY_LABELS[entry.type] || entry.type,
        percentage: totalBytes > 0 ? (entry.bytes / totalBytes) * 100 : 0
      }))
      .sort((left, right) => right.bytes - left.bytes || left.label.localeCompare(right.label))
  };
}

async function queryAll(db, sql, bindings = []) {
  return resultRows(await db.prepare(sql).bind(...bindings).all());
}

async function getAdminAssetRows(db, ownerId = "") {
  const ownerClause = ownerId ? 'WHERE a."ownerId" = ?' : "";
  return queryAll(db, `
    SELECT a.*,
      (SELECT e."type" FROM "cloud_library_entries" e
       WHERE e."imageUrl" = '/api/assets/' || a."id" LIMIT 1) AS "directLibraryType",
      (SELECT e."name" FROM "cloud_library_entries" e
       WHERE e."imageUrl" = '/api/assets/' || a."id" LIMIT 1) AS "directLibraryName",
      (SELECT e."type" FROM "cloud_catalog_entries" e
       WHERE e."imageUrl" = '/api/assets/' || a."id" LIMIT 1) AS "directCatalogType",
      (SELECT e."name" FROM "cloud_catalog_entries" e
       WHERE e."imageUrl" = '/api/assets/' || a."id" LIMIT 1) AS "directCatalogName",
      (SELECT GROUP_CONCAT(DISTINCT e."type")
       FROM "cloud_asset_references" r
       INNER JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
       WHERE r."assetId" = a."id") AS "referenceLibraryTypes",
      (SELECT COUNT(*) FROM "cloud_asset_references" r
       WHERE r."assetId" = a."id" AND r."parentType" = 'campaign') AS "campaignReferenceCount",
      (SELECT COUNT(*) FROM "cloud_asset_references" r
       WHERE r."assetId" = a."id") AS "referenceCount"
    FROM "cloud_assets" a
    ${ownerClause}
    ORDER BY a."createdAt" DESC
  `, ownerId ? [ownerId] : []);
}

async function listAllR2Objects(bucket) {
  const objects = [];
  let cursor;

  do {
    const page = await bucket.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
    objects.push(...(Array.isArray(page?.objects) ? page.objects : []));
    cursor = page?.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects;
}

async function executeStatements(db, statements) {
  for (let index = 0; index < statements.length; index += D1_BATCH_SIZE) {
    await db.batch(statements.slice(index, index + D1_BATCH_SIZE));
  }
}

async function deleteR2Keys(bucket, objectKeys) {
  const keys = [...new Set(objectKeys.map(String).filter(Boolean))];
  for (let index = 0; index < keys.length; index += R2_DELETE_BATCH_SIZE) {
    await bucket.delete(keys.slice(index, index + R2_DELETE_BATCH_SIZE));
  }
}

async function getOverview(context) {
  const [users, assetRows, r2Objects] = await Promise.all([
    queryAll(context.env.DB, `
      SELECT u."id", u."name", u."email", u."image", u."createdAt",
        b."bannedAt", b."reason" AS "banReason",
        (SELECT COUNT(*) FROM "campaigns" c WHERE c."ownerId" = u."id") AS "campaignCount",
        (SELECT COALESCE(SUM(c."payloadBytes"), 0) FROM "campaigns" c WHERE c."ownerId" = u."id") AS "campaignBytes",
        (SELECT COUNT(*) FROM "cloud_library_entries" e WHERE e."ownerId" = u."id") AS "libraryCount",
        (SELECT COALESCE(SUM(e."payloadBytes"), 0) FROM "cloud_library_entries" e WHERE e."ownerId" = u."id") AS "libraryBytes",
        (SELECT COUNT(*) FROM "cloud_catalog_entries" e WHERE e."ownerId" = u."id") AS "catalogCount",
        (SELECT COALESCE(SUM(e."payloadBytes"), 0) FROM "cloud_catalog_entries" e WHERE e."ownerId" = u."id") AS "catalogEstimatedBytes"
      FROM "users" u
      LEFT JOIN "admin_user_bans" b ON b."userId" = u."id"
      ORDER BY COALESCE(u."createdAt", '') DESC, lower(COALESCE(u."email", '')) ASC
    `),
    getAdminAssetRows(context.env.DB),
    listAllR2Objects(context.env.CLOUD_ASSETS)
  ]);
  const storage = summarizeAdminStorage(r2Objects, assetRows);
  const normalizedUsers = users.map((user) => {
    const campaignBytes = Number(user.campaignBytes || 0);
    const libraryBytes = Number(user.libraryBytes || 0);
    const r2Bytes = Number(storage.userBytes.get(user.id) || 0);
    return {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      image: user.image || "",
      createdAt: user.createdAt || "",
      isAdmin: isAdministrator(user),
      isBanned: Boolean(user.bannedAt),
      bannedAt: user.bannedAt || "",
      banReason: user.banReason || "",
      r2Bytes,
      cloudDataBytes: campaignBytes + libraryBytes,
      catalogEstimatedBytes: Number(user.catalogEstimatedBytes || 0),
      counts: {
        campaigns: Number(user.campaignCount || 0),
        library: Number(user.libraryCount || 0),
        catalog: Number(user.catalogCount || 0),
        assets: Number(storage.userObjects.get(user.id) || 0)
      }
    };
  });
  const usersById = new Map(normalizedUsers.map((user) => [user.id, user]));
  const storageByType = storage.categories.map((category) => ({
    ...category,
    items: category.items
      .map((item) => {
        const owner = usersById.get(item.ownerId);
        return {
          ...item,
          ownerName: owner?.name || "",
          ownerEmail: owner?.email || ""
        };
      })
      .sort((left, right) => right.bytes - left.bytes || left.objectKey.localeCompare(right.objectKey))
  }));

  return jsonResponse({
    generatedAt: new Date().toISOString(),
    totals: {
      accounts: normalizedUsers.length,
      bannedAccounts: normalizedUsers.filter((user) => user.isBanned).length,
      r2Bytes: storage.totalBytes,
      cloudDataBytes: normalizedUsers.reduce((sum, user) => sum + user.cloudDataBytes, 0),
      r2Objects: r2Objects.length,
      trackedAssets: assetRows.length
    },
    storageByType,
    users: normalizedUsers
  });
}

async function getUserDetail(context, userId) {
  const user = await context.env.DB.prepare(`
    SELECT u."id", u."name", u."email", u."image", u."createdAt",
      b."bannedAt", b."reason" AS "banReason"
    FROM "users" u
    LEFT JOIN "admin_user_bans" b ON b."userId" = u."id"
    WHERE u."id" = ? LIMIT 1
  `).bind(userId).first();

  if (!user) throw new HttpError(404, "admin_user_not_found", "Account not found.");

  const [campaigns, library, catalog, assetRows, references, r2Objects] = await Promise.all([
    queryAll(context.env.DB, `SELECT "id", "name", "isPublic", "revision", "payloadBytes", "chunkCount", "createdAt", "updatedAt" FROM "campaigns" WHERE "ownerId" = ? ORDER BY "updatedAt" DESC`, [userId]),
    queryAll(context.env.DB, `SELECT "id", "type", "name", "isPublic", "revision", "payloadBytes", "chunkCount", "imageUrl", "createdAt", "updatedAt" FROM "cloud_library_entries" WHERE "ownerId" = ? ORDER BY "updatedAt" DESC`, [userId]),
    queryAll(context.env.DB, `SELECT "id", "type", "name", "isPublic", "revision", "payloadBytes", "sourceCampaignId", "createdAt", "updatedAt" FROM "cloud_catalog_entries" WHERE "ownerId" = ? ORDER BY "updatedAt" DESC`, [userId]),
    getAdminAssetRows(context.env.DB, userId),
    queryAll(context.env.DB, `
      SELECT r."assetId", r."parentType", r."parentId",
        COALESCE(c."name", e."name", r."parentId") AS "parentName"
      FROM "cloud_asset_references" r
      INNER JOIN "cloud_assets" a ON a."id" = r."assetId"
      LEFT JOIN "campaigns" c ON r."parentType" = 'campaign' AND c."id" = r."parentId"
      LEFT JOIN "cloud_library_entries" e ON r."parentType" = 'library' AND e."id" = r."parentId"
      WHERE a."ownerId" = ?
    `, [userId]),
    listAllR2Objects(context.env.CLOUD_ASSETS)
  ]);
  const r2ByKey = new Map(r2Objects.map((object) => [object.key, object]));
  const referencesByAsset = new Map();
  references.forEach((reference) => {
    const list = referencesByAsset.get(reference.assetId) || [];
    list.push({ type: reference.parentType, id: reference.parentId, name: reference.parentName || "" });
    referencesByAsset.set(reference.assetId, list);
  });
  const trackedObjectKeys = new Set(assetRows.map((asset) => String(asset.objectKey || "")));
  const assets = assetRows.map((asset) => ({
    id: asset.id,
    tracked: true,
    objectKey: asset.objectKey,
    mimeType: asset.mimeType,
    byteSize: Number(r2ByKey.get(asset.objectKey)?.size ?? asset.byteSize ?? 0),
    width: Number(asset.width || 0),
    height: Number(asset.height || 0),
    createdAt: asset.createdAt || "",
    category: classifyAdminAsset(asset),
    categoryLabel: STORAGE_CATEGORY_LABELS[classifyAdminAsset(asset)] || classifyAdminAsset(asset),
    existsInR2: r2ByKey.has(asset.objectKey),
    references: referencesByAsset.get(asset.id) || []
  }));
  r2Objects
    .filter((object) => parseObjectOwnerId(object.key) === userId && !trackedObjectKeys.has(String(object.key || "")))
    .forEach((object) => assets.push({
      id: "",
      tracked: false,
      objectKey: String(object.key || ""),
      mimeType: "",
      byteSize: Math.max(0, Number(object.size || 0)),
      width: 0,
      height: 0,
      createdAt: object.uploaded ? new Date(object.uploaded).toISOString() : "",
      category: "untracked",
      categoryLabel: STORAGE_CATEGORY_LABELS.untracked,
      existsInR2: true,
      references: []
    }));
  assets.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  return jsonResponse({
    user: {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      image: user.image || "",
      createdAt: user.createdAt || "",
      isAdmin: isAdministrator(user),
      isBanned: Boolean(user.bannedAt),
      bannedAt: user.bannedAt || "",
      banReason: user.banReason || ""
    },
    items: { campaigns, library, catalog, assets }
  });
}

async function setUserBan(context, administrator, userId) {
  const target = await context.env.DB.prepare(
    'SELECT "id", "email" FROM "users" WHERE "id" = ? LIMIT 1'
  ).bind(userId).first();
  if (!target) throw new HttpError(404, "admin_user_not_found", "Account not found.");
  if (isAdministrator(target)) throw new HttpError(400, "admin_self_protected", "Administrator account cannot be banned.");

  const body = await readJsonBody(context.request, 4096);
  if (body.banned === true) {
    await context.env.DB.prepare(`
      INSERT INTO "admin_user_bans" ("userId", "reason", "bannedAt", "bannedBy")
      VALUES (?, ?, ?, ?)
      ON CONFLICT("userId") DO UPDATE SET
        "reason" = excluded."reason", "bannedAt" = excluded."bannedAt", "bannedBy" = excluded."bannedBy"
    `).bind(userId, cleanText(body.reason, 500), new Date().toISOString(), administrator.id).run();
  } else {
    await context.env.DB.prepare('DELETE FROM "admin_user_bans" WHERE "userId" = ?').bind(userId).run();
  }
  return jsonResponse({ userId, isBanned: body.banned === true });
}

async function deleteAccount(context, userId) {
  const target = await context.env.DB.prepare(
    'SELECT "id", "email" FROM "users" WHERE "id" = ? LIMIT 1'
  ).bind(userId).first();
  if (!target) throw new HttpError(404, "admin_user_not_found", "Account not found.");
  if (isAdministrator(target)) throw new HttpError(400, "admin_self_protected", "Administrator account cannot be deleted.");

  const [assets, r2Objects] = await Promise.all([
    queryAll(context.env.DB, 'SELECT "objectKey" FROM "cloud_assets" WHERE "ownerId" = ?', [userId]),
    listAllR2Objects(context.env.CLOUD_ASSETS)
  ]);
  const userObjectKeys = r2Objects
    .filter((object) => parseObjectOwnerId(object.key) === userId)
    .map((object) => object.key);
  await deleteR2Keys(context.env.CLOUD_ASSETS, [
    ...assets.map((asset) => asset.objectKey),
    ...userObjectKeys
  ]);
  const result = await context.env.DB.prepare('DELETE FROM "users" WHERE "id" = ?').bind(userId).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    throw new HttpError(404, "admin_user_not_found", "Account not found.");
  }
  return new Response(null, { status: 204 });
}

async function getItemOwner(context, kind, itemId) {
  const tables = {
    campaign: "campaigns",
    library: "cloud_library_entries",
    catalog: "cloud_catalog_entries",
    asset: "cloud_assets"
  };
  return context.env.DB.prepare(`SELECT * FROM "${tables[kind]}" WHERE "id" = ? LIMIT 1`).bind(itemId).first();
}

async function deleteItem(context, kind, itemId) {
  if (!MANAGEABLE_ITEM_KINDS.has(kind)) throw new HttpError(400, "invalid_admin_item_kind", "Unknown item kind.");
  const item = await getItemOwner(context, kind, itemId);
  if (!item) throw new HttpError(404, "admin_item_not_found", "Cloud item not found.");

  if (kind === "asset") {
    await deleteR2Keys(context.env.CLOUD_ASSETS, [item.objectKey]);
    await context.env.DB.prepare('DELETE FROM "cloud_assets" WHERE "id" = ?').bind(itemId).run();
  } else if (kind === "campaign") {
    await context.env.DB.batch([
      context.env.DB.prepare(`DELETE FROM "cloud_asset_references" WHERE "parentType" = 'campaign' AND "parentId" = ?`).bind(itemId),
      context.env.DB.prepare('DELETE FROM "cloud_catalog_entries" WHERE "sourceCampaignId" = ?').bind(itemId),
      context.env.DB.prepare('DELETE FROM "campaigns" WHERE "id" = ?').bind(itemId)
    ]);
  } else if (kind === "library") {
    await context.env.DB.batch([
      context.env.DB.prepare(`DELETE FROM "cloud_asset_references" WHERE "parentType" = 'library' AND "parentId" = ?`).bind(itemId),
      context.env.DB.prepare('DELETE FROM "cloud_library_entries" WHERE "id" = ?').bind(itemId)
    ]);
  } else {
    await context.env.DB.prepare('DELETE FROM "cloud_catalog_entries" WHERE "id" = ?').bind(itemId).run();
  }
  return new Response(null, { status: 204 });
}

async function deleteR2Object(context) {
  const body = await readJsonBody(context.request, 8192);
  const objectKey = cleanText(body.objectKey, 2048);
  if (!objectKey) throw new HttpError(400, "invalid_admin_object_key", "R2 object key is required.");
  await deleteR2Keys(context.env.CLOUD_ASSETS, [objectKey]);
  return new Response(null, { status: 204 });
}

async function deleteGroup(context) {
  const body = await readJsonBody(context.request, 8192);
  const kind = cleanText(body.kind, 30).toLowerCase();
  const ownerId = cleanText(body.ownerId, 120);
  const type = cleanText(body.type, 30).toLowerCase();
  const category = cleanText(body.category, 50).toLowerCase();
  if (!MANAGEABLE_ITEM_KINDS.has(kind)) throw new HttpError(400, "invalid_admin_item_kind", "Unknown item kind.");
  if (type && !CONTENT_TYPES.has(type)) throw new HttpError(400, "invalid_admin_item_type", "Unknown content type.");
  if (!ownerId && !type && !category) throw new HttpError(400, "admin_group_too_broad", "A user, content type, or asset category is required.");
  if (kind === "campaign" && !ownerId) throw new HttpError(400, "admin_campaign_owner_required", "Campaign groups require a user.");

  let rows;
  let untrackedObjectKeys = [];
  if (kind === "asset") {
    const [assetRows, r2Objects] = await Promise.all([
      getAdminAssetRows(context.env.DB, ownerId),
      listAllR2Objects(context.env.CLOUD_ASSETS)
    ]);
    const allTrackedKeys = new Set((await getAdminAssetRows(context.env.DB)).map((row) => String(row.objectKey || "")));
    rows = category === "untracked"
      ? []
      : category ? assetRows.filter((row) => classifyAdminAsset(row) === category) : assetRows;
    if (!category || category === "untracked") {
      untrackedObjectKeys = r2Objects
        .filter((object) => !allTrackedKeys.has(String(object.key || "")))
        .filter((object) => !ownerId || parseObjectOwnerId(object.key) === ownerId)
        .map((object) => object.key);
    }
  } else {
    const table = kind === "campaign" ? "campaigns" : kind === "library" ? "cloud_library_entries" : "cloud_catalog_entries";
    const clauses = [];
    const bindings = [];
    if (ownerId) { clauses.push('"ownerId" = ?'); bindings.push(ownerId); }
    if (type && kind !== "campaign") { clauses.push('"type" = ?'); bindings.push(type); }
    rows = await queryAll(context.env.DB, `SELECT "id" FROM "${table}" WHERE ${clauses.join(" AND ")}`, bindings);
  }

  if (kind === "asset") {
    await deleteR2Keys(context.env.CLOUD_ASSETS, [
      ...rows.map((row) => row.objectKey),
      ...untrackedObjectKeys
    ]);
    await executeStatements(context.env.DB, rows.map((row) => context.env.DB.prepare('DELETE FROM "cloud_assets" WHERE "id" = ?').bind(row.id)));
  } else {
    const statements = [];
    rows.forEach((row) => {
      if (kind === "campaign") {
        statements.push(context.env.DB.prepare(`DELETE FROM "cloud_asset_references" WHERE "parentType" = 'campaign' AND "parentId" = ?`).bind(row.id));
        statements.push(context.env.DB.prepare('DELETE FROM "cloud_catalog_entries" WHERE "sourceCampaignId" = ?').bind(row.id));
        statements.push(context.env.DB.prepare('DELETE FROM "campaigns" WHERE "id" = ?').bind(row.id));
      } else if (kind === "library") {
        statements.push(context.env.DB.prepare(`DELETE FROM "cloud_asset_references" WHERE "parentType" = 'library' AND "parentId" = ?`).bind(row.id));
        statements.push(context.env.DB.prepare('DELETE FROM "cloud_library_entries" WHERE "id" = ?').bind(row.id));
      } else {
        statements.push(context.env.DB.prepare('DELETE FROM "cloud_catalog_entries" WHERE "id" = ?').bind(row.id));
      }
    });
    await executeStatements(context.env.DB, statements);
  }

  return jsonResponse({ deleted: rows.length + untrackedObjectKeys.length, kind, ownerId, type, category });
}

export async function handleAdminRequest(context) {
  try {
    const method = context.request.method.toUpperCase();
    if (!context.env.CLOUD_ASSETS) throw new HttpError(503, "asset_storage_unavailable", "Cloud asset storage is not configured.");
    const administrator = await requireAdministrator(context);
    const pathParts = Array.isArray(context.params?.path)
      ? context.params.path.filter(Boolean)
      : context.params?.path ? [context.params.path] : [];

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) assertSameOrigin(context.request);

    if (pathParts[0] === "overview" && pathParts.length === 1) {
      if (method !== "GET") return methodNotAllowed(["GET"]);
      return getOverview(context);
    }
    if (pathParts[0] === "users" && pathParts.length === 2) {
      if (method === "GET") return getUserDetail(context, cleanText(pathParts[1], 120));
      if (method === "DELETE") return deleteAccount(context, cleanText(pathParts[1], 120));
      return methodNotAllowed(["GET", "DELETE"]);
    }
    if (pathParts[0] === "users" && pathParts[2] === "ban" && pathParts.length === 3) {
      if (method !== "PATCH") return methodNotAllowed(["PATCH"]);
      return setUserBan(context, administrator, cleanText(pathParts[1], 120));
    }
    if (pathParts[0] === "items" && pathParts.length === 3) {
      if (method !== "DELETE") return methodNotAllowed(["DELETE"]);
      return deleteItem(context, cleanText(pathParts[1], 30).toLowerCase(), cleanText(pathParts[2], 120));
    }
    if (pathParts[0] === "delete-group" && pathParts.length === 1) {
      if (method !== "POST") return methodNotAllowed(["POST"]);
      return deleteGroup(context);
    }
    if (pathParts[0] === "delete-r2-object" && pathParts.length === 1) {
      if (method !== "POST") return methodNotAllowed(["POST"]);
      return deleteR2Object(context);
    }
    throw new HttpError(404, "admin_route_not_found", "Admin route not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
