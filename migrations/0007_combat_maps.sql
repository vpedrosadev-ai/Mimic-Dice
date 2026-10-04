PRAGMA foreign_keys = OFF;

CREATE TABLE "cloud_library_entries_next" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('character', 'encounter', 'spell', 'item', 'monster', 'map')),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isPublic" INTEGER NOT NULL DEFAULT 0 CHECK ("isPublic" IN (0, 1)),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payloadVersion" TEXT NOT NULL,
  "payloadBytes" INTEGER NOT NULL DEFAULT 0,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "groupName" TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "sourceEntityKey" TEXT NOT NULL DEFAULT '',
  "sourceCampaignName" TEXT NOT NULL DEFAULT '',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE
);

INSERT INTO "cloud_library_entries_next"
SELECT "id", "ownerId", "type", "name", "description", "isPublic", "revision",
       "payloadVersion", "payloadBytes", "chunkCount", "createdAt", "updatedAt",
       "groupName", "imageUrl", "sourceEntityKey", "sourceCampaignName"
FROM "cloud_library_entries";

DROP TABLE "cloud_library_entries";
ALTER TABLE "cloud_library_entries_next" RENAME TO "cloud_library_entries";

CREATE INDEX "cloud_library_owner_updated_index"
  ON "cloud_library_entries" ("ownerId", "updatedAt" DESC);
CREATE INDEX "cloud_library_public_type_updated_index"
  ON "cloud_library_entries" ("isPublic", "type", "updatedAt" DESC);

CREATE TABLE "cloud_catalog_entries_next" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "sourceCampaignId" TEXT NOT NULL,
  "sourceEntityKey" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('character', 'encounter', 'spell', 'item', 'monster', 'map', 'diary', 'table')),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isPublic" INTEGER NOT NULL DEFAULT 0 CHECK ("isPublic" IN (0, 1)),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payloadBytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "groupName" TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "contentHash" TEXT NOT NULL DEFAULT '',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("sourceCampaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE
);

INSERT INTO "cloud_catalog_entries_next"
SELECT "id", "ownerId", "sourceCampaignId", "sourceEntityKey", "type", "name",
       "description", "isPublic", "revision", "payloadBytes", "createdAt", "updatedAt",
       "groupName", "imageUrl", "contentHash"
FROM "cloud_catalog_entries";

DROP TABLE "cloud_catalog_entries";
ALTER TABLE "cloud_catalog_entries_next" RENAME TO "cloud_catalog_entries";

CREATE UNIQUE INDEX "cloud_catalog_campaign_entity_unique"
  ON "cloud_catalog_entries" ("sourceCampaignId", "sourceEntityKey");
CREATE INDEX "cloud_catalog_owner_updated_index"
  ON "cloud_catalog_entries" ("ownerId", "updatedAt" DESC);
CREATE INDEX "cloud_catalog_public_type_updated_index"
  ON "cloud_catalog_entries" ("isPublic", "type", "updatedAt" DESC);

PRAGMA foreign_keys = ON;
