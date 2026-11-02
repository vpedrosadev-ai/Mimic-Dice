import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const argumentsList = process.argv.slice(2);
const force = argumentsList.includes("--force");
const preserveOauthTokens = argumentsList.includes("--preserve-oauth-tokens");
const positional = argumentsList.filter((argument) => !argument.startsWith("--"));
const source = path.resolve(positional[0] || ".migration-data/d1/mimic-dice-production.sql");
const target = path.resolve(positional[1] || ".runtime/data/mimic-dice.sqlite");

if (!fs.existsSync(source)) {
  throw new Error(`Cloudflare export not found: ${source}`);
}
fs.mkdirSync(path.dirname(target), { recursive: true });
if (fs.existsSync(target)) {
  if (!force) throw new Error(`Target database already exists: ${target}. Use --force to replace it.`);
  const backup = `${target}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  fs.copyFileSync(target, backup);
  fs.rmSync(target);
  for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${target}${suffix}`, { force: true });
  console.log(`Existing database backed up to ${backup}`);
}

const database = new Database(target);
try {
  // D1 exports tables in an order that can insert rows before every referenced
  // table exists. Disable FK enforcement only while restoring the trusted dump.
  database.pragma("foreign_keys = OFF");
  database.exec(fs.readFileSync(source, "utf8"));
  database.pragma("foreign_keys = ON");
  if (!preserveOauthTokens) {
    database.exec(`
      UPDATE "accounts" SET
        "refresh_token" = NULL,
        "access_token" = NULL,
        "id_token" = NULL,
        "session_state" = NULL,
        "oauth_token_secret" = NULL,
        "oauth_token" = NULL;
      DELETE FROM "sessions";
      DELETE FROM "verification_tokens";
    `);
  }
  const integrity = database.pragma("integrity_check", { simple: true });
  if (integrity !== "ok") throw new Error(`SQLite integrity check failed: ${integrity}`);
  const tables = database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  console.log(`Imported ${tables.length} tables into ${target}`);
  if (!preserveOauthTokens) console.log("Removed transient OAuth/session credentials from migrated copy.");
} finally {
  database.close();
}

