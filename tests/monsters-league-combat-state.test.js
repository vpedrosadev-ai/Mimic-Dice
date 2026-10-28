import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceMonstersLeagueCombatTurn,
  applyMonstersLeagueCombatDamage,
  applyMonstersLeagueCombatantPatch,
  mergeMonstersLeagueProjectedCombatantLiveState
} from "../src/multiplayer/monstersLeagueCombatState.js";
import { ensureMonstersLeagueCombatState } from "../src/multiplayer/monstersLeagueRules.js";

function createState() {
  return {
    teamA: {
      wolf: { maxHp: 30, currentHp: 25, tempHp: 5, necrotic: 0, conditions: [], initiative: "18", standNumber: "1" },
      bear: { maxHp: 40, currentHp: 40, tempHp: 0, necrotic: 0, conditions: [], initiative: "12", standNumber: "2" }
    }
  };
}

test("atomic damage consumes temporary HP before current HP", () => {
  const original = createState();
  const next = applyMonstersLeagueCombatDamage(original, { teamId: "teamA", monsterId: "wolf", amount: 8 });
  assert.equal(next.teamA.wolf.tempHp, 0);
  assert.equal(next.teamA.wolf.currentHp, 22);
  assert.equal(original.teamA.wolf.currentHp, 25);
});

test("live combat state replaces stale projected HP and initiative", () => {
  const merged = mergeMonstersLeagueProjectedCombatantLiveState({
    teamId: "teamA", multiplayerMonsterId: "wolf", pgAct: 30, iniactiva: "1", numPeana: "9"
  }, createState());
  assert.equal(merged.pgAct, 25);
  assert.equal(merged.iniactiva, "18");
  assert.equal(merged.numPeana, "1");
});

test("combatant patch updates only requested live fields", () => {
  const next = applyMonstersLeagueCombatantPatch(createState(), {
    teamId: "teamA",
    monsterId: "wolf",
    patch: { initiative: "20", conditions: ["Concentrado"], isFlying: true }
  });
  assert.equal(next.teamA.wolf.initiative, "20");
  assert.deepEqual(next.teamA.wolf.conditions, ["Concentrado"]);
  assert.equal(next.teamA.wolf.isFlying, true);
  assert.equal(next.teamA.wolf.currentHp, 25);
});

test("turn command wraps initiative and increments round", () => {
  const state = createState();
  const first = advanceMonstersLeagueCombatTurn(state, { active: false, round: 1, activeMonsterKey: "" }, 1);
  assert.equal(first.activeMonsterKey, "teamA:wolf");
  const second = advanceMonstersLeagueCombatTurn(state, first, 1);
  assert.equal(second.activeMonsterKey, "teamA:bear");
  const wrapped = advanceMonstersLeagueCombatTurn(state, second, 1);
  assert.equal(wrapped.activeMonsterKey, "teamA:wolf");
  assert.equal(wrapped.round, 2);
});

test("completed room initializes combat without opening main app", () => {
  const room = {
    status: "complete",
    combatState: {},
    players: [{ id: "teamA", roster: [{ monster: { id: "wolf", hpValue: 30 } }] }]
  };
  assert.equal(ensureMonstersLeagueCombatState(room), true);
  assert.equal(room.combatState.teamA.wolf.currentHp, 30);
  assert.equal(room.combatState.teamA.wolf.initiative, "0");
  assert.equal(room.combatState.teamA.wolf.standNumber, "1");
});
