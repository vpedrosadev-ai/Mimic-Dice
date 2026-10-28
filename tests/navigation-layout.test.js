import test from "node:test";
import assert from "node:assert/strict";

import { getNavigationFitMetrics } from "../src/navigation/navigationLayout.js";

test("navigation fits every button into one available row", () => {
  assert.deepEqual(getNavigationFitMetrics({
    availableWidth: 720,
    buttonCount: 10,
    naturalButtonWidth: 96
  }), { buttonWidth: 72, scale: 0.75 });
});

test("navigation keeps readable minimum dimensions", () => {
  assert.deepEqual(getNavigationFitMetrics({
    availableWidth: 100,
    buttonCount: 8,
    naturalButtonWidth: 100
  }), { buttonWidth: 42, scale: 0.46 });
});
