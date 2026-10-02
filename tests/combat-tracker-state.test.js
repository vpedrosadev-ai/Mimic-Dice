import assert from "node:assert/strict";
import { createCombatTrackerStateController } from "../src/screens/combat-tracker/combatTrackerState.js";

const controller = createCombatTrackerStateController({
  state: {},
  COMBAT_TRACKER_STORAGE_KEY: "test-combat-tracker",
  usesDesktopFileOnlyPersistence: () => false,
  scheduleDesktopCampaignDirtyStateSync: () => {},
  createStableId: (prefix) => `${prefix}-test`,
  getBattleTimerElapsedMs: () => 0,
  mapTagToSide: (tag) => ({ ALIADO: "allies", NEUTRAL: "neutral", ENEMIGO: "enemies" })[tag] || "allies",
  mapSideToTag: (side) => ({ allies: "ALIADO", neutral: "NEUTRAL", enemies: "ENEMIGO" })[side] || "ALIADO"
});

const hiddenCombatant = controller.normalizeStoredCombatant({
  id: "hidden-enemy",
  tag: "ENEMIGO",
  iniactiva: 18,
  nombre: "Hidden enemy",
  hiddenFromInitiative: true
});
const visibleCombatant = controller.normalizeStoredCombatant({
  id: "visible-enemy",
  tag: "ENEMIGO",
  iniactiva: 12,
  nombre: "Visible enemy"
});

assert.equal(hiddenCombatant.hiddenFromInitiative, true);
assert.equal(visibleCombatant.hiddenFromInitiative, false);

const restoredState = controller.normalizeStoredCombatTrackerState({
  combatants: [hiddenCombatant, visibleCombatant]
});

assert.equal(restoredState.combatants[0].hiddenFromInitiative, true);
assert.equal(restoredState.combatants[1].hiddenFromInitiative, false);

console.log("Combat tracker state tests passed.");
