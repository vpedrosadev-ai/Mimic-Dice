CREATE TABLE IF NOT EXISTS "campaign_join_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'denied', 'cancelled')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_join_requests_campaign_user_index"
  ON "campaign_join_requests" ("campaignId", "userId");

CREATE INDEX IF NOT EXISTS "campaign_join_requests_campaign_status_index"
  ON "campaign_join_requests" ("campaignId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "campaign_join_requests_user_status_index"
  ON "campaign_join_requests" ("userId", "status", "updatedAt" DESC);
