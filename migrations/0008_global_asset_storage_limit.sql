CREATE TABLE IF NOT EXISTS "cloud_asset_storage_usage" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "storedBytes" INTEGER NOT NULL DEFAULT 0 CHECK ("storedBytes" >= 0)
);

INSERT OR IGNORE INTO "cloud_asset_storage_usage" ("id", "storedBytes")
SELECT 1, COALESCE(SUM("byteSize"), 0) FROM "cloud_assets";

CREATE TRIGGER IF NOT EXISTS "cloud_assets_global_limit_before_insert"
BEFORE INSERT ON "cloud_assets"
WHEN (
  SELECT "storedBytes" + NEW."byteSize" > 9000000000
  FROM "cloud_asset_storage_usage"
  WHERE "id" = 1
)
BEGIN
  SELECT RAISE(ABORT, 'global_asset_storage_quota');
END;

CREATE TRIGGER IF NOT EXISTS "cloud_assets_usage_after_insert"
AFTER INSERT ON "cloud_assets"
BEGIN
  UPDATE "cloud_asset_storage_usage"
  SET "storedBytes" = "storedBytes" + NEW."byteSize"
  WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "cloud_assets_global_limit_before_size_update"
BEFORE UPDATE OF "byteSize" ON "cloud_assets"
WHEN (
  SELECT "storedBytes" - OLD."byteSize" + NEW."byteSize" > 9000000000
  FROM "cloud_asset_storage_usage"
  WHERE "id" = 1
)
BEGIN
  SELECT RAISE(ABORT, 'global_asset_storage_quota');
END;

CREATE TRIGGER IF NOT EXISTS "cloud_assets_usage_after_size_update"
AFTER UPDATE OF "byteSize" ON "cloud_assets"
BEGIN
  UPDATE "cloud_asset_storage_usage"
  SET "storedBytes" = MAX(0, "storedBytes" - OLD."byteSize" + NEW."byteSize")
  WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "cloud_assets_usage_after_delete"
AFTER DELETE ON "cloud_assets"
BEGIN
  UPDATE "cloud_asset_storage_usage"
  SET "storedBytes" = MAX(0, "storedBytes" - OLD."byteSize")
  WHERE "id" = 1;
END;
