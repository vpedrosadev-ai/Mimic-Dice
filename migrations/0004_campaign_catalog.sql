PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "cloud_catalog_entries" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "sourceCampaignId" TEXT NOT NULL,
  "sourceEntityKey" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK (
    "type" IN ('character', 'encounter', 'spell', 'item', 'monster', 'diary', 'table')
  ),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isPublic" INTEGER NOT NULL DEFAULT 0 CHECK ("isPublic" IN (0, 1)),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payloadBytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("sourceCampaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cloud_catalog_campaign_entity_unique"
  ON "cloud_catalog_entries" ("sourceCampaignId", "sourceEntityKey");

CREATE INDEX IF NOT EXISTS "cloud_catalog_owner_updated_index"
  ON "cloud_catalog_entries" ("ownerId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "cloud_catalog_public_type_updated_index"
  ON "cloud_catalog_entries" ("isPublic", "type", "updatedAt" DESC);
