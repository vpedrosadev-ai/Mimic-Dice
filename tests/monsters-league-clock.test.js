import assert from "node:assert/strict";
import test from "node:test";

import {
  createMonstersLeagueServerClockSample,
  getMonstersLeagueClockNow,
  getMonstersLeagueRemainingSeconds
} from "../src/multiplayer/monstersLeagueClock.js";

test("server clock sample removes browser clock skew from auction countdown", () => {
  const sample = createMonstersLeagueServerClockSample(10_000, 25_000);

  assert.equal(getMonstersLeagueClockNow(sample, 27_400), 12_400);
  assert.equal(getMonstersLeagueRemainingSeconds(15_000, getMonstersLeagueClockNow(sample, 27_400)), 3);
});

test("remaining second stays visible for its complete ceiling interval", () => {
  assert.equal(getMonstersLeagueRemainingSeconds(15_000, 12_001), 3);
  assert.equal(getMonstersLeagueRemainingSeconds(15_000, 13_001), 2);
  assert.equal(getMonstersLeagueRemainingSeconds(15_000, 14_001), 1);
  assert.equal(getMonstersLeagueRemainingSeconds(15_000, 15_000), 0);
});

test("invalid clock samples fall back to client time", () => {
  assert.equal(createMonstersLeagueServerClockSample(0, 25_000), null);
  assert.equal(getMonstersLeagueClockNow(null, 90_001), 90_001);
});
