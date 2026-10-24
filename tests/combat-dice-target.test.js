import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_DICE_TARGET_ATTACK,
  COMBAT_DICE_TARGET_DAMAGE,
  doubleDiceInFormula,
  getCombatDiceTargetKind,
  getCombatDiceTargetOutcome
} from "../src/screens/combat-tracker/combatDiceTarget.js";

test("standalone modifier targets Armor Class as an attack", () => {
  assert.equal(getCombatDiceTargetKind("+7", "d20+7"), COMBAT_DICE_TARGET_ATTACK);
  assert.equal(getCombatDiceTargetKind("-2", "d20-2"), COMBAT_DICE_TARGET_ATTACK);
  assert.equal(getCombatDiceTargetKind("2d6+7", "2d6+7"), COMBAT_DICE_TARGET_DAMAGE);
});

test("attack total equal to Armor Class hits", () => {
  assert.deepEqual(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 17, 17), {
    kind: COMBAT_DICE_TARGET_ATTACK,
    armorClass: 17,
    hit: true,
    appliedDamage: null
  });
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 16, 17).hit, false);
});

test("critical attacks always hit and fumbles always miss", () => {
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 20, 99, { criticalOutcome: "critical" }).hit, true);
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 1, 0, { criticalOutcome: "fumble" }).hit, false);
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 20, 99, { criticalOutcome: "doubleCritical" }).hit, true);
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_ATTACK, 1, 0, { criticalOutcome: "doubleFumble" }).hit, false);
});

test("damage outcome clamps negative totals before applying HP loss", () => {
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_DAMAGE, 12, 18).appliedDamage, 12);
  assert.equal(getCombatDiceTargetOutcome(COMBAT_DICE_TARGET_DAMAGE, -3, 18).appliedDamage, 0);
});

test("critical damage doubles every dice count but never modifiers", () => {
  assert.equal(doubleDiceInFormula("1d8+4"), "2d8+4");
  assert.equal(doubleDiceInFormula("d6 + 2d4 - 3"), "2d6 + 4d4 - 3");
  assert.equal(doubleDiceInFormula("(3d10*2)+5"), "(6d10*2)+5");
});
