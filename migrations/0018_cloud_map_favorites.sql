PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "cloud_map_favorites" (
  "userId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "entryId"),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cloud_map_favorites_user_created_index"
  ON "cloud_map_favorites" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "cloud_map_favorites_entry_index"
  ON "cloud_map_favorites" ("entryId");

CREATE TRIGGER IF NOT EXISTS "cloud_library_map_favorites_cleanup"
AFTER DELETE ON "cloud_library_entries"
BEGIN
  DELETE FROM "cloud_map_favorites" WHERE "entryId" = OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "cloud_catalog_map_favorites_cleanup"
AFTER DELETE ON "cloud_catalog_entries"
BEGIN
  DELETE FROM "cloud_map_favorites" WHERE "entryId" = OLD."id";
END;
