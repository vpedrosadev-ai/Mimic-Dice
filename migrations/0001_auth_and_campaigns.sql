PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT '',
  "name" TEXT DEFAULT NULL,
  "email" TEXT DEFAULT NULL,
  "emailVerified" DATETIME DEFAULT NULL,
  "image" TEXT DEFAULT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique"
  ON "users" ("email")
  WHERE "email" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT DEFAULT NULL,
  "access_token" TEXT DEFAULT NULL,
  "expires_at" INTEGER DEFAULT NULL,
  "token_type" TEXT DEFAULT NULL,
  "scope" TEXT DEFAULT NULL,
  "id_token" TEXT DEFAULT NULL,
  "session_state" TEXT DEFAULT NULL,
  "oauth_token_secret" TEXT DEFAULT NULL,
  "oauth_token" TEXT DEFAULT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_identity_unique"
  ON "accounts" ("provider", "providerAccountId");

CREATE INDEX IF NOT EXISTS "accounts_user_id_index"
  ON "accounts" ("userId");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" DATETIME NOT NULL,
  PRIMARY KEY ("sessionToken"),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_index"
  ON "sessions" ("userId");

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" DATETIME NOT NULL,
  PRIMARY KEY ("token")
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS "campaigns_owner_updated_index"
  ON "campaigns" ("ownerId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "campaigns_public_updated_index"
  ON "campaigns" ("isPublic", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "campaign_chunks" (
  "campaignId" TEXT NOT NULL,
  "payloadVersion" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "payloadText" TEXT NOT NULL,
  PRIMARY KEY ("campaignId", "payloadVersion", "chunkIndex"),
  FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaign_chunks_version_index"
  ON "campaign_chunks" ("campaignId", "payloadVersion", "chunkIndex");
