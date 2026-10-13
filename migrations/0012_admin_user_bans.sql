PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "admin_user_bans" (
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "bannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bannedBy" TEXT NOT NULL,
  PRIMARY KEY ("userId"),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("bannedBy") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "admin_user_bans_banned_at_index"
  ON "admin_user_bans" ("bannedAt" DESC);
