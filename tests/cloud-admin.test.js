import test from "node:test";
import assert from "node:assert/strict";

import { isAdministrator } from "../functions/_shared/auth.js";
import { attachAdminAssetsToItems, classifyAdminAsset, summarizeAdminStorage } from "../functions/_shared/admin.js";
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

test("shared campaign editor can edit without owner-only management rights", () => {
  const summary = getCampaignSummary({
    id: "campaign-shared",
    ownerId: "host",
    memberRole: "editor",
    memberCount: 3,
    collaborationOpen: 1,
    name: "Monster League",
    isPublic: 0,
    revision: 4,
    payloadBytes: 100
  }, "player-2", false);

  assert.equal(summary.isOwner, false);
  assert.equal(summary.isShared, true);
  assert.equal(summary.collaborationOpen, true);
  assert.equal(summary.canEdit, true);
  assert.equal(summary.canManage, false);
  assert.equal(summary.memberRole, "master");
});

test("shared campaign player keeps combat edit access with explicit restricted role", () => {
  const summary = getCampaignSummary({
    id: "campaign-player",
    ownerId: "host",
    memberRole: "player",
    memberCount: 1,
    name: "Player campaign",
    isPublic: 0,
    revision: 1,
    payloadBytes: 100
  }, "player-1", false);

  assert.equal(summary.memberRole, "player");
  assert.equal(summary.canEdit, true);
  assert.equal(summary.canManage, false);
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

test("admin user detail links physical R2 objects to library and catalog items", () => {
  const mapAsset = {
    id: "asset-map",
    objectKey: "users/user-1/map.webp",
    byteSize: 240,
    links: [{ kind: "library", id: "map-1", name: "Mazmorra" }]
  };
  const creatureAsset = {
    id: "asset-creature",
    objectKey: "users/user-1/creature.webp",
    byteSize: 120,
    links: [
      { kind: "catalog", id: "monster-1", name: "Dragón" },
      { kind: "catalog", id: "monster-1", name: "Dragón" }
    ]
  };
  const linked = attachAdminAssetsToItems({
    library: [{ id: "map-1", type: "map", name: "Mazmorra" }],
    catalog: [{ id: "monster-1", type: "monster", name: "Dragón" }]
  }, [mapAsset, creatureAsset]);

  assert.deepEqual(linked.library[0].assets, [mapAsset]);
  assert.deepEqual(linked.catalog[0].assets, [creatureAsset]);
});
