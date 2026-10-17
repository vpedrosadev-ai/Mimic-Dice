import test from "node:test";
import assert from "node:assert/strict";

import { createMonstersLeagueCombatFeedback } from "../src/multiplayer/monstersLeagueLiveEvents.js";

test("live combat feedback emits remote damage and status changes", () => {
  let sequence = 0;
  const previous = { team: { monster: { maxHp: 20, currentHp: 20, tempHp: 0, necrotic: 0, conditions: [] } } };
  const next = { team: { monster: { maxHp: 20, currentHp: 13, tempHp: 0, necrotic: 0, conditions: ["Poisoned"] } } };
  const events = createMonstersLeagueCombatFeedback(previous, next, { userId: "player-2" }, {
    now: 123,
    idFactory: () => `event-${++sequence}`
  });

  assert.deepEqual(events, [
    { id: "event-1", actorUserId: "player-2", teamId: "team", monsterId: "monster", kind: "damage", text: "−7", statusName: "", createdAt: 123 },
    { id: "event-2", actorUserId: "player-2", teamId: "team", monsterId: "monster", kind: "status-add", text: "+ Poisoned", statusName: "Poisoned", createdAt: 123 }
  ]);
});

test("initial combat snapshot creates no feedback flood", () => {
  const next = { team: { monster: { maxHp: 20, currentHp: 20, conditions: ["Blessed"] } } };
  assert.deepEqual(createMonstersLeagueCombatFeedback({}, next, { userId: "host" }), []);
});
