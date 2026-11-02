import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { LocalD1Database } from "../server/d1.js";

const executeFile = promisify(execFile);
const argumentsList = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argumentsList.indexOf(name);
  return index >= 0 && argumentsList[index + 1] ? argumentsList[index + 1] : fallback;
};
const bucket = option("--bucket", "mimic-dice-assets");
const databasePath = path.resolve(option("--database", ".runtime/data/mimic-dice.sqlite"));
const destinationRoot = path.resolve(option("--destination", ".runtime/objects"));
const concurrency = Math.max(1, Math.min(8, Number(option("--concurrency", "4")) || 4));
const wranglerExecutable = path.resolve("node_modules/wrangler/bin/wrangler.js");

function destinationForKey(key) {
  const normalized = String(key || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Unsafe R2 object key in database.");
  }
  const destination = path.resolve(destinationRoot, ...normalized.split("/"));
  if (!destination.startsWith(`${destinationRoot}${path.sep}`)) throw new Error("R2 object escaped destination root.");
  return { normalized, destination };
}

async function sha256(filename) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

async function validExistingFile(asset, destination) {
  try {
    const stat = await fsPromises.stat(destination);
    if (stat.size !== Number(asset.byteSize)) return false;
    return (await sha256(destination)) === String(asset.sha256).toLowerCase();
  } catch {
    return false;
  }
}

const database = new LocalD1Database(databasePath, { readonly: true, fileMustExist: true });
const assets = database.prepare(`
  SELECT "objectKey", "sha256", "byteSize", "mimeType", "ownerId", "id"
  FROM "cloud_assets" ORDER BY "createdAt", "id"
`).all().results;
database.close();

let nextIndex = 0;
let downloaded = 0;
let skipped = 0;
const failures = [];

async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= assets.length) return;
    const asset = assets[index];
    const { normalized, destination } = destinationForKey(asset.objectKey);
    if (await validExistingFile(asset, destination)) {
      skipped += 1;
      continue;
    }
    await fsPromises.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    try {
      await executeFile(process.execPath, [
        wranglerExecutable, "r2", "object", "get", `${bucket}/${normalized}`,
        "--remote", "--file", temporary
      ], { maxBuffer: 1024 * 1024 });
      const stat = await fsPromises.stat(temporary);
      const actualSha = await sha256(temporary);
      if (stat.size !== Number(asset.byteSize) || actualSha !== String(asset.sha256).toLowerCase()) {
        throw new Error("Downloaded object failed size or SHA-256 verification.");
      }
      await fsPromises.rename(temporary, destination);
      await fsPromises.writeFile(`${destination}.meta.json`, JSON.stringify({
        httpEtag: `"${actualSha}"`,
        httpMetadata: { contentType: asset.mimeType },
        customMetadata: { ownerId: asset.ownerId, assetId: asset.id },
        uploaded: new Date().toISOString()
      }));
      downloaded += 1;
      if ((downloaded + skipped) % 10 === 0 || downloaded + skipped === assets.length) {
        console.log(`Verified ${downloaded + skipped}/${assets.length} objects.`);
      }
    } catch (error) {
      await fsPromises.rm(temporary, { force: true });
      failures.push({ objectKey: normalized, message: String(error?.message || error) });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
if (failures.length > 0) {
  console.error(`${failures.length} objects failed to export.`);
  for (const failure of failures) console.error(`- ${failure.objectKey}: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(`R2 export complete: ${downloaded} downloaded, ${skipped} already verified.`);
}
