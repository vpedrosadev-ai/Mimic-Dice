import test from "node:test";
import assert from "node:assert/strict";

import { resolveStoredCharacterInitiative } from "../src/screens/characters/characterState.js";

const normalizeNumber = (value) => value === "" || value === null || value === undefined ? "" : Number(value);

test("character initiative follows the Dexterity modifier without an override", () => {
  assert.deepEqual(
    resolveStoredCharacterInitiative({ initiativeBonus: 2, initiativeBonusOverride: "" }, { dex: 16 }, normalizeNumber),
    { override: "", value: 3 }
  );
});

test("character initiative preserves a manual override when Dexterity changes", () => {
  assert.deepEqual(
    resolveStoredCharacterInitiative({ initiativeBonus: 5, initiativeBonusOverride: 5 }, { dex: 8 }, normalizeNumber),
    { override: 5, value: 5 }
  );
});

test("legacy characters migrate to automatic Dexterity initiative", () => {
  assert.deepEqual(
    resolveStoredCharacterInitiative({ initiativeBonus: 1 }, { dex: 16 }, normalizeNumber),
    { override: "", value: 3 }
  );
});
