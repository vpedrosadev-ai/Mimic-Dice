import test from "node:test";
import assert from "node:assert/strict";

import {
  formatConcentrationStatusName,
  getConcentrationSaveDc,
  getConstitutionSaveModifier,
  isConcentrationStatusName,
  resolveConcentrationSave,
  splitConcentrationStatusName
} from "../src/screens/combat-tracker/combatConcentration.js";

test("concentration DC uses 10 or half damage rounded down", () => {
  assert.equal(getConcentrationSaveDc(1), 10);
  assert.equal(getConcentrationSaveDc(20), 10);
  assert.equal(getConcentrationSaveDc(21), 10);
  assert.equal(getConcentrationSaveDc(22), 11);
  assert.equal(getConcentrationSaveDc(100), 50);
});

test("concentration labels preserve a safe optional subject", () => {
  assert.equal(formatConcentrationStatusName("Concentrado", "Bendecir"), "Concentrado: Bendecir");
  assert.deepEqual(splitConcentrationStatusName("Concentrating: Bless"), { detail: "Bless" });
  assert.equal(isConcentrationStatusName("Concentrado: Marca del cazador"), true);
  assert.equal(isConcentrationStatusName("Aturdido"), false);
});

test("constitution save uses explicit proficiency then stat fallback", () => {
  assert.equal(getConstitutionSaveModifier("DEX +3, CON +7, WIS +2", "CON 14"), 7);
  assert.equal(getConstitutionSaveModifier("Destreza +3; Constitución +5", "CON 8"), 5);
  assert.equal(getConstitutionSaveModifier("", "FUE 10 DES 12 CON 16 INT 8 SAB 11 CAR 9"), 3);
});

test("concentration save succeeds when total meets DC", () => {
  assert.deepEqual(resolveConcentrationSave({ damage: 30, modifier: 4, roll: 11 }), {
    naturalRoll: 11,
    modifier: 4,
    total: 15,
    dc: 15,
    success: true
  });
  assert.equal(resolveConcentrationSave({ damage: 30, modifier: 3, roll: 11 }).success, false);
});
