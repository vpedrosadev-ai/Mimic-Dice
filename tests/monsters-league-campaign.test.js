import test from "node:test";
import assert from "node:assert/strict";

import {
  createMonstersLeagueCampaignPayload,
  createMonstersLeagueCombatTracker
} from "../functions/_shared/multiplayer.js";

const encounters = [
  {
    id: "team-alpha",
    name: "Team Alpha",
    multiplayer: {
      roomId: "room-1",
      teamId: "alpha",
      ownerUserId: "user-alpha",
      ownerName: "Alpha",
      hostUserId: "user-alpha",
      color: "#aabbcc",
      online: true
    },
    rows: [{
      id: "row-alpha",
      entryId: "wolf",
      entryKey: "wolf|mm",
      name: "Wolf",
      source: "MM",
      tokenUrl: "/images/wolf.png",
      hpValue: 11,
      acValue: 13,
      crLabel: "1/4",
      units: 2
    }]
  },
  {
    id: "team-beta",
    name: "Team Beta",
    multiplayer: {
      roomId: "room-1",
      teamId: "beta",
      ownerUserId: "user-beta",
      ownerName: "Beta",
      hostUserId: "user-alpha",
      color: "#ccbbaa",
      online: true
    },
    rows: [{
      id: "row-beta",
      entryId: "bear",
      name: "Bear",
      hpValue: 34,
      acValue: 12,
      crLabel: "2",
      units: 1
    }]
  }
];

test("preloads every Monsters League team once into combat tracker", () => {
  const tracker = createMonstersLeagueCombatTracker(encounters, { random: () => 0.5 });

  assert.equal(tracker.combatants.length, 3);
  assert.deepEqual(tracker.combatants.map((combatant) => combatant.id), ["entity-1", "entity-2", "entity-3"]);
  assert.deepEqual(tracker.combatEncounterLoadOrder, ["team-alpha", "team-beta"]);
  assert.equal(tracker.combatants[0].sourceEncounterId, "team-alpha");
  assert.equal(tracker.combatants[2].sourceEncounterId, "team-beta");
  assert.equal(tracker.combatants[2].teamOwnerUserId, "user-beta");
  assert.equal(tracker.combatants.every((combatant) => combatant.iniactiva === 11), true);
  assert.equal(new Set(tracker.combatants.map((combatant) => combatant.id)).size, 3);
});

test("shared campaign opens combat with stored team encounters", () => {
  const payload = createMonstersLeagueCampaignPayload("League Final", encounters, { random: () => 0 });

  assert.equal(payload.ui.activeScreen, "combat-tracker");
  assert.equal(payload.encounterInventory.folders.length, 1);
  assert.equal(payload.encounterInventory.encounters.length, 2);
  assert.equal(payload.encounterInventory.encounters.every((encounter) => (
    encounter.folderId === "monsters-league-folder-room-1"
  )), true);
  assert.equal(payload.combatTracker.combatants.length, 3);
  assert.equal(payload.combatTracker.nextId, 4);
});
