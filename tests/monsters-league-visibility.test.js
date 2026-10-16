import assert from "node:assert/strict";
import test from "node:test";

import { shouldHideMonstersLeagueRivalStats } from "../src/multiplayer/monstersLeagueVisibility.js";

test("online rival stats are hidden from host combat table", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: true, teamOwnerUserId: "rival" }, "host"), true);
});

test("host keeps access to own online team stats", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: true, teamOwnerUserId: "host" }, "host"), false);
});

test("ordinary combatants remain unrestricted", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: false }, "host"), false);
});
