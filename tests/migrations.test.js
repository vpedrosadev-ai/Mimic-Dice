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
  database.close();
});
