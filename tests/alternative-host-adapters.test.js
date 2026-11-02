import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalD1Database } from "../server/d1.js";
import { FileBucket } from "../server/fileBucket.js";

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), "mimic-dice-alternative-"));
}

test("local D1 adapter supports prepare, bind, first, all, run, and atomic batch", async (t) => {
  const directory = await temporaryDirectory();
  const database = new LocalD1Database(path.join(directory, "test.sqlite"));
  t.after(async () => {
    database.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  database.exec('CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)');

  const inserted = database.prepare("INSERT INTO entries (name) VALUES (?)").bind("alpha").run();
  assert.equal(inserted.success, true);
  assert.equal(inserted.meta.changes, 1);
  assert.equal(database.prepare("SELECT name FROM entries WHERE id = ?").bind(1).first("name"), "alpha");

  const batch = database.batch([
    database.prepare("INSERT INTO entries (name) VALUES (?)").bind("beta"),
    database.prepare("INSERT INTO entries (name) VALUES (?)").bind("gamma")
  ]);
  assert.equal(batch.length, 2);
  assert.deepEqual(
    database.prepare("SELECT name FROM entries ORDER BY id").all().results.map((row) => row.name),
    ["alpha", "beta", "gamma"]
  );

  assert.throws(() => database.batch([
    database.prepare("INSERT INTO entries (name) VALUES (?)").bind("delta"),
    database.prepare("INSERT INTO entries (name) VALUES (?)").bind("alpha")
  ]));
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM entries").first("count"), 3);
});
test("filesystem bucket preserves body, metadata, listing, and deletion", async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const bucket = new FileBucket(path.join(directory, "objects"));
  await bucket.put("users/example/map.webp", new TextEncoder().encode("image"), {
    httpMetadata: { contentType: "image/webp" },
    customMetadata: { ownerId: "example" }
  });

  const object = await bucket.get("users/example/map.webp");
  assert.equal(object.body.toString("utf8"), "image");
  assert.equal(object.httpMetadata.contentType, "image/webp");
  assert.equal(object.customMetadata.ownerId, "example");
  assert.match(object.httpEtag, /^"[a-f0-9]{64}"$/);

  const listing = await bucket.list({ include: ["httpMetadata", "customMetadata"] });
  assert.equal(listing.objects.length, 1);
  assert.equal(listing.objects[0].key, "users/example/map.webp");
  await bucket.delete("users/example/map.webp");
  assert.equal(await bucket.get("users/example/map.webp"), null);
});

