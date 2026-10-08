import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("all database migrations apply in order and allow map entries", () => {
  const database = new DatabaseSync(":memory:");
  const migrationDirectory = path.join(projectRoot, "migrations");

  for (const fileName of fs.readdirSync(migrationDirectory).sort()) {
    database.exec(fs.readFileSync(path.join(migrationDirectory, fileName), "utf8"));
  }

  const librarySchema = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cloud_library_entries'"
  ).get()?.sql || "";
  const catalogSchema = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cloud_catalog_entries'"
  ).get()?.sql || "";

  assert.match(librarySchema, /'map'/);
  assert.match(catalogSchema, /'map'/);
  assert.ok(database.prepare('PRAGMA table_info("cloud_library_entries")').all().some((column) => column.name === "tags"));
  assert.ok(database.prepare('PRAGMA table_info("cloud_catalog_entries")').all().some((column) => column.name === "tags"));
  assert.ok(database.prepare('PRAGMA table_info("multiplayer_rooms")').all().some((column) => column.name === "campaignId"));
  database.close();
});

test("cloud asset storage rejects writes above the global 9 GB safety limit", () => {
  const database = new DatabaseSync(":memory:");
  const migrationDirectory = path.join(projectRoot, "migrations");
  const migrationFiles = fs.readdirSync(migrationDirectory).sort();

  for (const fileName of migrationFiles.filter((name) => name !== "0008_global_asset_storage_limit.sql")) {
    database.exec(fs.readFileSync(path.join(migrationDirectory, fileName), "utf8"));
  }

  database.prepare('INSERT INTO "users" ("id") VALUES (?), (?)').run("user-1", "user-2");

  const insertAsset = database.prepare(`
    INSERT INTO "cloud_assets" (
      "id", "ownerId", "objectKey", "sha256", "mimeType", "byteSize"
    ) VALUES (?, ?, ?, ?, 'image/webp', ?)
  `);
  insertAsset.run("asset-1", "user-1", "users/user-1/one.webp", "hash-1", 8_999_999_999);
  database.exec(fs.readFileSync(path.join(migrationDirectory, "0008_global_asset_storage_limit.sql"), "utf8"));

  assert.equal(
    database.prepare('SELECT "storedBytes" FROM "cloud_asset_storage_usage" WHERE "id" = 1').get().storedBytes,
    8_999_999_999
  );
  insertAsset.run("asset-2", "user-1", "users/user-1/two.webp", "hash-2", 1);

  assert.equal(
    database.prepare('SELECT "storedBytes" FROM "cloud_asset_storage_usage" WHERE "id" = 1').get().storedBytes,
    9_000_000_000
  );
  assert.throws(
    () => insertAsset.run("asset-3", "user-2", "users/user-2/three.webp", "hash-3", 1),
    /global_asset_storage_quota/
  );

  database.prepare('DELETE FROM "cloud_assets" WHERE "id" = ?').run("asset-2");
  insertAsset.run("asset-3", "user-2", "users/user-2/three.webp", "hash-3", 1);
  assert.equal(
    database.prepare('SELECT "storedBytes" FROM "cloud_asset_storage_usage" WHERE "id" = 1').get().storedBytes,
    9_000_000_000
  );
  database.close();
});
