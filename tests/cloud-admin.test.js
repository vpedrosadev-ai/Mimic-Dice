import test from "node:test";
import assert from "node:assert/strict";

import { isAdministrator } from "../functions/_shared/auth.js";
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
