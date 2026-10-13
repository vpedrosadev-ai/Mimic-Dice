import test from "node:test";
import assert from "node:assert/strict";

import { isAdministrator } from "../functions/_shared/auth.js";
import { classifyAdminAsset, summarizeAdminStorage } from "../functions/_shared/admin.js";
import { getCampaignSummary } from "../functions/_shared/campaigns.js";
import { getLibraryEntrySummary } from "../functions/_shared/library.js";

test("configured administrator email is matched case-insensitively", () => {
  assert.equal(isAdministrator({ email: "vpedrosadev@gmail.com" }), true);
  assert.equal(isAdministrator({ email: " VPEDROSADEV@GMAIL.COM " }), true);
  assert.equal(isAdministrator({ email: "player@example.com" }), false);
  assert.equal(isAdministrator(null), false);
});

test("administrator can manage another user's catalog entry without becoming its owner", () => {
  const row = {
    id: "map-1",
    ownerId: "user-2",
    type: "map",
    name: "Mazmorra",
    isPublic: 1,
    revision: 3,
    payloadBytes: 42,
    tags: '["mazmorra"]'
  };

  const summary = getLibraryEntrySummary(row, "admin-1", true);
  assert.equal(summary.isOwner, false);
  assert.equal(summary.canManage, true);
  assert.deepEqual(summary.tags, ["mazmorra"]);
});

test("administrator can manage another user's campaign without listing it as owned", () => {
  const summary = getCampaignSummary({
    id: "campaign-1",
    ownerId: "user-2",
    name: "Costa de la Espada",
    isPublic: 1,
    revision: 2,
    payloadBytes: 100
  }, "admin-1", true);

  assert.equal(summary.isOwner, false);
  assert.equal(summary.canManage, true);
});

test("admin storage classifies tracked and untracked R2 objects", () => {
  const assetRows = [
    { objectKey: "users/user-1/map.webp", ownerId: "user-1", directLibraryType: "map", mimeType: "image/webp" },
    { objectKey: "users/user-1/sheet.pdf", ownerId: "user-1", mimeType: "application/pdf" },
    { objectKey: "users/user-2/campaign.webp", ownerId: "user-2", campaignReferenceCount: 1, mimeType: "image/webp" }
  ];
  const summary = summarizeAdminStorage([
    { key: "users/user-1/map.webp", size: 100 },
    { key: "users/user-1/sheet.pdf", size: 300 },
    { key: "users/user-2/campaign.webp", size: 500 },
    { key: "users/user-2/untracked.bin", size: 100 }
  ], assetRows);

  assert.equal(classifyAdminAsset(assetRows[0]), "map-image");
  assert.equal(classifyAdminAsset(assetRows[1]), "character-pdf");
  assert.equal(classifyAdminAsset(assetRows[2]), "campaign-asset");
  assert.equal(classifyAdminAsset({ embeddedLibraryType: "map", mimeType: "image/webp" }), "map-image");
  assert.equal(summary.totalBytes, 1000);
  assert.equal(summary.userBytes.get("user-1"), 400);
  assert.equal(summary.userBytes.get("user-2"), 600);
  assert.equal(summary.userObjects.get("user-1"), 2);
  assert.equal(summary.userObjects.get("user-2"), 2);
  assert.deepEqual(
    summary.categories.find((entry) => entry.type === "map-image").items[0],
    {
      id: "",
      objectKey: "users/user-1/map.webp",
      name: "",
      ownerId: "user-1",
      mimeType: "image/webp",
      bytes: 100,
      tracked: true,
      createdAt: ""
    }
  );
  assert.deepEqual(
    Object.fromEntries(summary.categories.map((entry) => [entry.type, { bytes: entry.bytes, percentage: entry.percentage }])),
    {
      "campaign-asset": { bytes: 500, percentage: 50 },
      "character-pdf": { bytes: 300, percentage: 30 },
      "map-image": { bytes: 100, percentage: 10 },
      untracked: { bytes: 100, percentage: 10 }
    }
  );
});
