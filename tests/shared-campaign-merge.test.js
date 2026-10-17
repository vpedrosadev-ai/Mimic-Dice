import test from "node:test";
import assert from "node:assert/strict";

import { mergeSharedCampaignPayload } from "../src/cloud/sharedCampaignMerge.js";

test("shared campaign merge keeps independent local and remote object edits", () => {
  const base = { campaign: { name: "League" }, combatTracker: { round: 1, activeId: "a" } };
  const local = { campaign: { name: "League" }, combatTracker: { round: 2, activeId: "a" } };
  const remote = { campaign: { name: "League" }, combatTracker: { round: 1, activeId: "b" } };

  assert.deepEqual(mergeSharedCampaignPayload(base, local, remote), {
    campaign: { name: "League" },
    combatTracker: { round: 2, activeId: "b" }
  });
});

test("shared campaign merge combines entity arrays by id", () => {
  const base = { encounters: [{ id: "one", name: "One", hp: 10 }] };
  const local = { encounters: [{ id: "one", name: "One", hp: 7 }, { id: "local", name: "Local" }] };
  const remote = { encounters: [{ id: "one", name: "Renamed", hp: 10 }, { id: "remote", name: "Remote" }] };

  assert.deepEqual(mergeSharedCampaignPayload(base, local, remote), {
    encounters: [
      { id: "one", name: "Renamed", hp: 7 },
      { id: "remote", name: "Remote" },
      { id: "local", name: "Local" }
    ]
  });
});

test("shared campaign merge uses local value for same-field conflict", () => {
  assert.deepEqual(
    mergeSharedCampaignPayload({ round: 1 }, { round: 2 }, { round: 3 }),
    { round: 2 }
  );
});
