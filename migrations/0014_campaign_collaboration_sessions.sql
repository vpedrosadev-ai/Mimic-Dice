CREATE TABLE IF NOT EXISTS "campaign_collaboration_sessions" (
  "campaignId" TEXT NOT NULL PRIMARY KEY,
  "inviteToken" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_collaboration_invite_index"
  ON "campaign_collaboration_sessions" ("inviteToken");
