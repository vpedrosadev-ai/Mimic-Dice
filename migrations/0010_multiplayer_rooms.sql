CREATE TABLE IF NOT EXISTS "multiplayer_rooms" (
  "id" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'monsters-league',
  "hostUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'configuring',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" DATETIME NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("hostUserId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "multiplayer_rooms_host_updated_index"
  ON "multiplayer_rooms" ("hostUserId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "multiplayer_rooms_expiry_index"
  ON "multiplayer_rooms" ("expiresAt");
