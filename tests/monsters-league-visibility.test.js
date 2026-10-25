import assert from "node:assert/strict";
import test from "node:test";

import {
  projectMonstersLeagueCombatantForPlayer,
  shouldHideMonstersLeagueRivalStats
} from "../src/multiplayer/monstersLeagueVisibility.js";

test("online rival stats are hidden from host combat table", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: true, teamOwnerUserId: "rival" }, "host"), true);
});

test("host keeps access to own online team stats", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: true, teamOwnerUserId: "host" }, "host"), false);
});

test("ordinary combatants remain unrestricted", () => {
  assert.equal(shouldHideMonstersLeagueRivalStats({ multiplayerOnline: false }, "host"), false);
});

test("player projection hides rival health and conditions but keeps own team details", () => {
  const rival = projectMonstersLeagueCombatantForPlayer({
    multiplayerOnline: true,
    teamId: "team-b",
    teamOwnerUserId: "user-b",
    condiciones: "Invisible, Paralizado"
  }, "user-a", "team-a");
  assert.equal(rival.hideHealth, true);
  assert.equal(rival.hideConditions, true);
  assert.equal(rival.condiciones, "");

  const own = projectMonstersLeagueCombatantForPlayer({
    multiplayerOnline: true,
    teamId: "team-a",
    teamOwnerUserId: "user-a",
    condiciones: "Concentrado"
  }, "user-a", "team-a");
  assert.equal(own.hideHealth, false);
  assert.equal(own.hideConditions, false);
  assert.equal(own.condiciones, "Concentrado");
});
