CREATE TABLE IF NOT EXISTS "campaign_members" (
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'editor' CHECK ("role" IN ('editor')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("campaignId", "userId"),
  FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaign_members_user_index"
  ON "campaign_members" ("userId", "createdAt" DESC);
