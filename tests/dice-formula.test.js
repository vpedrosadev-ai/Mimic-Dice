import assert from "node:assert/strict";
import { DiceFormulaError, findDiceFormulaMatches, isValidDiceFormula, rollDiceFormula } from "../src/shared/diceFormula.js";

const samples = [0, 0.5, 0.999, 0.25, 0.75, 0.1, 0.9, 0.4];
let sampleIndex = 0;
const result = rollDiceFormula("(6d6+2d4*2+6)", {
  random: () => samples[sampleIndex++ % samples.length]
});

assert.deepEqual(result.groups.map((group) => group.rolls), [
  [1, 4, 6, 2, 5, 1],
  [4, 2]
]);
assert.equal(result.total, 37);
assert.equal(result.normalizedFormula, "(6d6+2d4*2+6)");

assert.equal(rollDiceFormula("d20+3", { random: () => 0.999 }).total, 23);
assert.equal(rollDiceFormula("2*(1d6+1)", { random: () => 0 }).total, 4);
assert.equal(rollDiceFormula("-1d4+10", { random: () => 0 }).total, 9);
assert.equal(isValidDiceFormula("2d4 + 3"), true);
assert.equal(isValidDiceFormula("2d4 + alert(1)"), false);
assert.equal(isValidDiceFormula("2 + 3"), false);

assert.deepEqual(findDiceFormulaMatches("Deal 2d4+3 damage, then roll d20."), [
  { formula: "2d4+3", start: 5, end: 10 },
  { formula: "d20", start: 29, end: 32 }
]);
assert.deepEqual(findDiceFormulaMatches("id20 and 2d6damage are not formulas"), []);

assert.throws(() => rollDiceFormula("101d6"), (error) => error instanceof DiceFormulaError && error.code === "too-many-dice");
assert.throws(() => rollDiceFormula("1d1"), (error) => error instanceof DiceFormulaError && error.code === "invalid-sides");
assert.throws(() => rollDiceFormula("1d6/0"), (error) => error instanceof DiceFormulaError && error.code === "division-zero");
assert.throws(() => rollDiceFormula("1d6+"), (error) => error instanceof DiceFormulaError && error.code === "syntax");

console.log("Dice formula tests passed.");
