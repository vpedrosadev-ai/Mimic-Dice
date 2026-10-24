import assert from "node:assert/strict";
import { DiceFormulaError, findDiceFormulaMatches, findDiceModifierMatches, isValidDiceFormula, rollDiceFormula } from "../src/shared/diceFormula.js";

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
assert.deepEqual(result.groups.map((group) => group.subtotal), [19, 6]);
assert.equal(result.normalizedFormula, "(6d6+2d4*2+6)");

const naturalTwenty = rollDiceFormula("d20+3", { random: () => 0.999 });
assert.equal(naturalTwenty.total, 20);
assert.equal(naturalTwenty.criticalOutcome, "critical");
const naturalOne = rollDiceFormula("d20-3", { random: () => 0 });
assert.equal(naturalOne.total, 1);
assert.equal(naturalOne.criticalOutcome, "fumble");
assert.equal(rollDiceFormula("d20+12", { random: () => 0, hitDiceMode: true }).groups[0].rolls[0], 1);
assert.equal(rollDiceFormula("d20+3", { random: () => 0.5 }).criticalOutcome, "");

let advantageSampleIndex = 0;
const advantageResult = rollDiceFormula("d20+3", {
  random: () => [0.1, 0.8][advantageSampleIndex++],
  rollMode: "advantage"
});
assert.deepEqual(advantageResult.groups[0].rolls, [3, 17]);
assert.equal(advantageResult.groups[0].keptRollIndex, 1);
assert.equal(advantageResult.total, 20);
assert.equal(advantageResult.rollMode, "advantage");

let criticalAdvantageIndex = 0;
const criticalAdvantage = rollDiceFormula("d20+9", {
  random: () => [0.2, 0.999][criticalAdvantageIndex++],
  rollMode: "advantage"
});
assert.equal(criticalAdvantage.total, 20);
assert.equal(criticalAdvantage.criticalOutcome, "critical");

let disadvantageSampleIndex = 0;
const disadvantageResult = rollDiceFormula("1d20-2", {
  random: () => [0.9, 0.2][disadvantageSampleIndex++],
  rollMode: "disadvantage"
});
assert.deepEqual(disadvantageResult.groups[0].rolls, [19, 5]);
assert.equal(disadvantageResult.groups[0].keptRollIndex, 1);
assert.equal(disadvantageResult.total, 3);
assert.equal(disadvantageResult.rollMode, "disadvantage");
let fumbleDisadvantageIndex = 0;
const fumbleDisadvantage = rollDiceFormula("d20+9", {
  random: () => [0.9, 0][fumbleDisadvantageIndex++],
  rollMode: "disadvantage"
});
assert.equal(fumbleDisadvantage.total, 1);
assert.equal(fumbleDisadvantage.criticalOutcome, "fumble");
let doubleCriticalIndex = 0;
const doubleCritical = rollDiceFormula("d20+30", {
  random: () => [0.999, 0.999][doubleCriticalIndex++],
  rollMode: "advantage"
});
assert.equal(doubleCritical.total, 20);
assert.equal(doubleCritical.criticalOutcome, "doubleCritical");
let doubleFumbleIndex = 0;
const doubleFumble = rollDiceFormula("d20-30", {
  random: () => [0, 0][doubleFumbleIndex++],
  rollMode: "disadvantage"
});
assert.equal(doubleFumble.total, 1);
assert.equal(doubleFumble.criticalOutcome, "doubleFumble");
assert.equal(rollDiceFormula("2*(1d6+1)", { random: () => 0 }).total, 4);
assert.equal(rollDiceFormula("-1d4+10", { random: () => 0 }).total, 9);

const hitDiceResult = rollDiceFormula("1d4+1d6+1d8+1d10+1d12", {
  random: () => 0,
  hitDiceMode: true
});
assert.deepEqual(hitDiceResult.groups.map((group) => group.rawRolls[0]), [1, 1, 1, 1, 1]);
assert.deepEqual(hitDiceResult.groups.map((group) => group.rolls[0]), [3, 4, 5, 6, 7]);
assert.deepEqual(hitDiceResult.groups.map((group) => group.minimum), [3, 4, 5, 6, 7]);
assert.equal(hitDiceResult.total, 25);
assert.equal(hitDiceResult.hitDiceMode, true);
assert.equal(rollDiceFormula("1d8", { random: () => 0 }).total, 1);
const numericResult = rollDiceFormula("(20-5)/3+2*4");
assert.equal(numericResult.total, 13);
assert.deepEqual(numericResult.groups, []);
assert.equal(numericResult.hitDiceMode, false);
assert.equal(rollDiceFormula("25").total, 25);
assert.equal(rollDiceFormula("10+4", { hitDiceMode: true }).hitDiceMode, false);
assert.equal(isValidDiceFormula("2d4 + 3"), true);
assert.equal(isValidDiceFormula("2d4 + alert(1)"), false);
assert.equal(isValidDiceFormula("2 + 3"), true);

assert.deepEqual(findDiceFormulaMatches("Deal 2d4+3 damage, then roll d20."), [
  { formula: "2d4+3", start: 5, end: 10 },
  { formula: "d20", start: 29, end: 32 }
]);
assert.deepEqual(findDiceFormulaMatches("id20 and 2d6damage are not formulas"), []);
assert.deepEqual(findDiceFormulaMatches("Numbers 20 + 5 stay plain text."), []);
assert.deepEqual(findDiceModifierMatches("Attack +5, save -2, formula d20+3."), [
  { formula: "d20+5", label: "+5", start: 7, end: 9 },
  { formula: "d20-2", label: "-2", start: 16, end: 18 }
]);

assert.throws(() => rollDiceFormula("101d6"), (error) => error instanceof DiceFormulaError && error.code === "too-many-dice");
assert.throws(() => rollDiceFormula("1d1"), (error) => error instanceof DiceFormulaError && error.code === "invalid-sides");
assert.throws(() => rollDiceFormula("1d6/0"), (error) => error instanceof DiceFormulaError && error.code === "division-zero");
assert.throws(() => rollDiceFormula("1d6+"), (error) => error instanceof DiceFormulaError && error.code === "syntax");
assert.throws(() => rollDiceFormula("2d20+5", { rollMode: "advantage" }), (error) => error instanceof DiceFormulaError && error.code === "roll-mode-single-die");
assert.throws(() => rollDiceFormula("1d20+1d4", { rollMode: "disadvantage" }), (error) => error instanceof DiceFormulaError && error.code === "roll-mode-single-die");

console.log("Dice formula tests passed.");
