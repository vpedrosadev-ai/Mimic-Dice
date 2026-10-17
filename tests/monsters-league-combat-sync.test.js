import assert from "node:assert/strict";
import test from "node:test";

import { groupCombatantsByRoom } from "../src/multiplayer/monstersLeagueCombatSync.js";

test("groups online Monsters League combatants by stable draft monster id", () => {
  const grouped = groupCombatantsByRoom([{
    multiplayerOnline: true,
    multiplayerRoomId: "room-1",
    teamId: "team-1",
    multiplayerMonsterId: "draft-monster-id",
    entryId: "localized-entry-id",
    pgMax: 24,
    pgAct: 17,
    pgTemp: 4,
    necrotic: 2,
    condiciones: "Poisoned, Prone",
    iniactiva: 18,
    hiddenFromInitiative: true,
    numPeana: "4",
    isFlying: true,
    flyingHeight: 20,
    mapTokenSize: "Large"
  }]);

  assert.deepEqual(grouped.get("room-1"), {
    "team-1": {
      "draft-monster-id": {
        maxHp: 24,
        currentHp: 17,
        tempHp: 4,
        necrotic: 2,
        conditions: ["Poisoned", "Prone"],
        initiative: "18",
        hiddenFromInitiative: true,
        standNumber: "4",
        isFlying: true,
        flyingHeight: 20,
        mapTokenSize: "Large"
      }
    }
  });
});

test("ignores combatants not marked for online synchronization", () => {
  const grouped = groupCombatantsByRoom([{
    multiplayerOnline: false,
    multiplayerRoomId: "room-1",
    teamId: "team-1",
    multiplayerMonsterId: "monster-1"
  }]);

  assert.equal(grouped.size, 0);
});
