ALTER TABLE "multiplayer_rooms"
  ADD COLUMN "campaignId" TEXT REFERENCES "campaigns" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "multiplayer_rooms_campaign_index"
  ON "multiplayer_rooms" ("campaignId");
