import test from "node:test";
import assert from "node:assert/strict";

import {
  addMonstersLeaguePlayer,
  createMonstersLeagueEncounters,
  createMonstersLeagueRoom,
  getMonstersLeagueMaxBid,
  nominateMonstersLeagueCreature,
  placeMonstersLeagueBid,
  publishMonstersLeagueRoom,
  resolveMonstersLeagueLot,
  startMonstersLeagueDraft
} from "../src/multiplayer/monstersLeagueRules.js";

const catalog = Array.from({ length: 12 }, (_, index) => ({
  id: `monster-${index + 1}`,
  entryKey: `monster-${index + 1}`,
  name: `Monster ${index + 1}`,
  canonicalName: `Monster ${index + 1}`,
  crValue: 1 + index / 2,
  crBaseValue: 1 + index / 2,
  crLabel: String(1 + index / 2),
  hpValue: 10 + index,
  acValue: 12
}));

function readyRoom(teamSize = 2) {
  const room = createMonstersLeagueRoom({
    id: "test-room",
    host: { id: "host", userId: "host", name: "Host" },
    config: { teamSize, crMin: 0, crMax: 30, bidSeconds: 20 }
  });
  addMonstersLeaguePlayer(room, { id: "bot", name: "Bot", isBot: true }, "host");
  publishMonstersLeagueRoom(room, "host");
  startMonstersLeagueDraft(room, "host", catalog, 1000, () => 0.99);
  return room;
}

test("reserves one gold for every remaining roster slot", () => {
  const room = readyRoom(4);
  assert.equal(getMonstersLeagueMaxBid(room, "host"), 97);
});

test("rejects bids that make roster impossible to finish", () => {
  const room = readyRoom(4);
  nominateMonstersLeagueCreature(room, room.nominationOrder[0], catalog[0], 1100);

  const otherPlayerId = room.nominationOrder[1];
  assert.throws(
    () => placeMonstersLeagueBid(room, otherPlayerId, 98, 1200),
    (error) => error.code === "bid_too_high"
  );
});

test("awards creatures, rotates nomination, and completes full draft", () => {
  const room = readyRoom(1);
  const firstNominator = room.nominationOrder[0];
  const secondNominator = room.nominationOrder[1];

  nominateMonstersLeagueCreature(room, firstNominator, catalog[0], 1100);
  placeMonstersLeagueBid(room, secondNominator, 2, 1200);
  resolveMonstersLeagueLot(room, 22000);

  assert.equal(room.players.find((player) => player.id === secondNominator).roster.length, 1);
  assert.equal(room.players.find((player) => player.id === secondNominator).gold, 98);
  assert.equal(room.status, "drafting");

  const nextNominator = room.nominationOrder[room.nominationIndex];
  nominateMonstersLeagueCreature(room, nextNominator, catalog[1], 23000);
  resolveMonstersLeagueLot(room, 45000);

  assert.equal(room.status, "complete");
  assert.equal(room.players.every((player) => player.roster.length === 1), true);
  assert.equal(createMonstersLeagueEncounters(room).length, 2);
});

test("anti-snipe bid extends deadline", () => {
  const room = readyRoom(2);
  const firstNominator = room.nominationOrder[0];
  const otherPlayer = room.nominationOrder[1];
  nominateMonstersLeagueCreature(room, firstNominator, catalog[0], 1000);
  const originalDeadline = room.currentLot.deadlineAt;

  placeMonstersLeagueBid(room, otherPlayer, 2, originalDeadline - 1000);
  assert.equal(room.currentLot.deadlineAt, originalDeadline - 1000 + room.config.antiSnipeSeconds * 1000);
});
