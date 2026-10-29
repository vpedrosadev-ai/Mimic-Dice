CREATE TABLE "campaign_members_next" (
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'player' CHECK ("role" IN ('master', 'player')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("campaignId", "userId"),
  FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

INSERT INTO "campaign_members_next" ("campaignId", "userId", "role", "createdAt")
SELECT "campaignId", "userId", CASE WHEN "role" = 'editor' THEN 'master' ELSE 'player' END, "createdAt"
FROM "campaign_members";

DROP TABLE "campaign_members";
ALTER TABLE "campaign_members_next" RENAME TO "campaign_members";

CREATE INDEX "campaign_members_user_index"
  ON "campaign_members" ("userId", "createdAt" DESC);
