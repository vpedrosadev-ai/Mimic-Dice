PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "cloud_library_entries" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('character', 'encounter', 'spell', 'item', 'monster')),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isPublic" INTEGER NOT NULL DEFAULT 0 CHECK ("isPublic" IN (0, 1)),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payloadVersion" TEXT NOT NULL,
  "payloadBytes" INTEGER NOT NULL DEFAULT 0,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cloud_library_owner_updated_index"
  ON "cloud_library_entries" ("ownerId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "cloud_library_public_type_updated_index"
  ON "cloud_library_entries" ("isPublic", "type", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "cloud_library_chunks" (
  "entryId" TEXT NOT NULL,
  "payloadVersion" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "payloadText" TEXT NOT NULL,
  PRIMARY KEY ("entryId", "payloadVersion", "chunkIndex"),
  FOREIGN KEY ("entryId") REFERENCES "cloud_library_entries" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cloud_library_chunks_version_index"
  ON "cloud_library_chunks" ("entryId", "payloadVersion", "chunkIndex");

CREATE TABLE IF NOT EXISTS "cloud_assets" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER NOT NULL DEFAULT 0,
  "height" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cloud_assets_owner_hash_unique"
  ON "cloud_assets" ("ownerId", "sha256");

CREATE TABLE IF NOT EXISTS "cloud_asset_references" (
  "assetId" TEXT NOT NULL,
  "parentType" TEXT NOT NULL CHECK ("parentType" IN ('campaign', 'library')),
  "parentId" TEXT NOT NULL,
  PRIMARY KEY ("assetId", "parentType", "parentId"),
  FOREIGN KEY ("assetId") REFERENCES "cloud_assets" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cloud_asset_references_parent_index"
  ON "cloud_asset_references" ("parentType", "parentId");
