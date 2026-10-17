import test from "node:test";
import assert from "node:assert/strict";

import {
  addMonstersLeaguePlayer,
  advanceMonstersLeagueDraft,
  createMonstersLeagueEncounters,
  createMonstersLeagueRoom,
  getEligibleMonsters,
  getMonstersLeagueMaxBid,
  nominateMonstersLeagueCreature,
  openRandomMonstersLeagueLot,
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

test("awards a creature, pauses for review, and completes the final roster", () => {
  const room = readyRoom(1);
  const firstNominator = room.nominationOrder[0];
  const secondNominator = room.nominationOrder[1];

  nominateMonstersLeagueCreature(room, firstNominator, catalog[0], 1100);
  placeMonstersLeagueBid(room, secondNominator, 2, 1200);
  resolveMonstersLeagueLot(room, 22000);

  assert.equal(room.players.find((player) => player.id === secondNominator).roster.length, 1);
  assert.equal(room.players.find((player) => player.id === secondNominator).gold, 98);
  assert.equal(room.status, "reviewing");

  advanceMonstersLeagueDraft(room, "host", catalog, 22500, () => 0);
  assert.equal(room.status, "reviewing");
  assert.equal(room.history.length, 2);
  assert.equal(room.history.at(-1).automatic, true);
  assert.equal(room.players.every((player) => player.roster.length === 1), true);

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);
  assert.equal(room.status, "complete");
  assert.equal(createMonstersLeagueEncounters(room).length, 2);
});

test("uses the configured starting gold", () => {
  const room = createMonstersLeagueRoom({
    id: "gold-room",
    host: { id: "host", userId: "host", name: "Host" },
    config: { teamSize: 2, startingGold: 37, crMin: 0, crMax: 30 }
  });
  addMonstersLeaguePlayer(room, { id: "bot", name: "Bot", isBot: true }, "host");
  publishMonstersLeagueRoom(room, "host");
  startMonstersLeagueDraft(room, "host", catalog, 1000, () => 0);
  assert.deepEqual(room.players.map((player) => player.gold), [37, 37]);
});

test("keeps enough starting gold to fill every roster slot", () => {
  const room = createMonstersLeagueRoom({
    id: "minimum-gold-room",
    host: { id: "host", userId: "host", name: "Host" },
    config: { teamSize: 4, startingGold: 1 }
  });
  assert.equal(room.config.startingGold, 4);
});

test("single master is always enabled", () => {
  const defaultRoom = createMonstersLeagueRoom({
    id: "single-master-room",
    host: { id: "host", userId: "host", name: "Host" }
  });
  const sharedRoom = createMonstersLeagueRoom({
    id: "shared-room",
    host: { id: "host", userId: "host", name: "Host" },
    config: { singleMaster: false }
  });
  assert.equal(defaultRoom.config.singleMaster, true);
  assert.equal(sharedRoom.config.singleMaster, true);
});

test("generated encounters retain host and single-master metadata", () => {
  const room = readyRoom(1);
  room.config.singleMaster = false;
  room.status = "complete";
  room.players[0].roster = [{ monster: catalog[0], price: 1 }];
  room.players[1].roster = [{ monster: catalog[1], price: 1 }];
  const encounters = createMonstersLeagueEncounters(room);
  assert.equal(encounters[0].multiplayer.hostUserId, "host");
  assert.equal(encounters[0].multiplayer.singleMaster, true);
});

test("automatically assigns the only remaining roster one creature per review", () => {
  const room = readyRoom(3);
  const first = room.nominationOrder[0];
  const second = room.nominationOrder[1];
  const alreadyAwarded = [catalog[9], catalog[10], catalog[11]];
  room.players.find((player) => player.id === second).roster.push(
    ...alreadyAwarded.map((monster) => ({ monster, price: 1, acquiredAt: 1 }))
  );
  room.availableMonsterIds = room.availableMonsterIds.filter((id) => !alreadyAwarded.some((monster) => monster.id === id));
  nominateMonstersLeagueCreature(room, first, catalog[0], 1100);
  resolveMonstersLeagueLot(room, 22000);

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);

  assert.equal(room.status, "reviewing");
  assert.equal(room.players.find((player) => player.id === first).roster.length, 2);
  assert.equal(room.history.length, 2);
  assert.equal(room.history.at(-1).automaticReason, "only_player_remaining");

  advanceMonstersLeagueDraft(room, "host", catalog, 24000, () => 0);
  assert.equal(room.status, "reviewing");
  assert.equal(room.players.find((player) => player.id === first).roster.length, 3);
  assert.equal(room.history.length, 3);

  advanceMonstersLeagueDraft(room, "host", catalog, 25000, () => 0);
  assert.equal(room.status, "complete");
});

test("lets a funded player decide before assigning to a constrained player", () => {
  const room = readyRoom(3);
  const constrained = room.players[0];
  const funded = room.players[1];
  constrained.gold = 3;
  nominateMonstersLeagueCreature(room, room.nominationOrder[0], catalog[0], 1100);
  resolveMonstersLeagueLot(room, 22000);

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);

  assert.equal(constrained.roster.length, 1);
  assert.equal(funded.roster.length, 0);
  assert.equal(room.status, "drafting");
  assert.equal(room.history.length, 1);
  assert.equal(room.currentLot.highBidPlayerId, constrained.id);
  assert.equal(room.currentLot.automaticFallbackPlayerId, constrained.id);

  resolveMonstersLeagueLot(room, room.currentLot.deadlineAt);
  assert.equal(constrained.roster.length, 2);
  assert.equal(room.status, "reviewing");
  assert.equal(room.history.length, 2);
  assert.equal(room.history.at(-1).automaticReason, "uncontested_constrained");
});

test("a funded player can outbid the automatic fallback", () => {
  const room = readyRoom(3);
  const constrained = room.players[0];
  const funded = room.players[1];
  constrained.gold = 3;
  nominateMonstersLeagueCreature(room, room.nominationOrder[0], catalog[0], 1100);
  resolveMonstersLeagueLot(room, 22000);

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);
  placeMonstersLeagueBid(room, funded.id, 2, 24000);
  resolveMonstersLeagueLot(room, room.currentLot.deadlineAt);

  assert.equal(constrained.roster.length, 1);
  assert.equal(funded.roster.length, 1);
  assert.equal(room.history.at(-1).winnerPlayerId, funded.id);
  assert.equal(room.history.at(-1).automatic, undefined);
});

test("offers a zero-gold player's creature to funded players before assigning it for free", () => {
  const room = readyRoom(2);
  const constrained = room.players[0];
  const funded = room.players[1];
  constrained.gold = 0;
  room.status = "reviewing";

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);

  assert.equal(room.status, "drafting");
  assert.equal(room.currentLot.currentBid, 0);
  assert.equal(room.currentLot.highBidPlayerId, constrained.id);
  assert.ok(getMonstersLeagueMaxBid(room, funded.id) > 0);

  resolveMonstersLeagueLot(room, room.currentLot.deadlineAt);
  assert.equal(constrained.roster.length, 1);
  assert.equal(constrained.gold, 0);
  assert.equal(room.history.at(-1).automaticReason, "uncontested_constrained");
});

test("host opens the next auction after the result review when players can still compete", () => {
  const room = createMonstersLeagueRoom({
    id: "review-room",
    host: { id: "host", userId: "host", name: "Host" },
    config: { teamSize: 1, crMin: 0, crMax: 30 }
  });
  addMonstersLeaguePlayer(room, { id: "bot-1", name: "Bot 1", isBot: true }, "host");
  addMonstersLeaguePlayer(room, { id: "bot-2", name: "Bot 2", isBot: true }, "host");
  publishMonstersLeagueRoom(room, "host");
  startMonstersLeagueDraft(room, "host", catalog, 1000, () => 0.99);
  openRandomMonstersLeagueLot(room, catalog, 1100, () => 0);
  resolveMonstersLeagueLot(room, 22000);

  advanceMonstersLeagueDraft(room, "host", catalog, 23000, () => 0);

  assert.equal(room.status, "drafting");
  assert.ok(room.currentLot);
  assert.equal(room.players.filter((player) => player.roster.length === 0).length, 2);
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

test("filters excluded creature sizes and base types", () => {
  const filteredCatalog = [
    { id: "wolf", name: "Wolf", crValue: 1, size: "Medium", type: "Beast" },
    { id: "guard", name: "Guard", crValue: 1, size: "Medium", type: "Humanoid (Human)" },
    { id: "dragon", name: "Dragon", crValue: 1, size: "Large", type: "Dragon" }
  ];
  const eligible = getEligibleMonsters(filteredCatalog, {
    crMin: 0,
    crMax: 30,
    excludedSizes: ["large"],
    excludedTypes: ["humanoid"]
  });

  assert.deepEqual(eligible.map((monster) => monster.id), ["wolf"]);
});

test("filters to only selected creature sizes and base types", () => {
  const filteredCatalog = [
    { id: "wolf", name: "Wolf", crValue: 1, size: "Medium", type: "Beast" },
    { id: "guard", name: "Guard", crValue: 1, size: "Medium", type: "Humanoid (Human)" },
    { id: "dragon", name: "Dragon", crValue: 1, size: "Large", type: "Dragon" }
  ];
  const eligible = getEligibleMonsters(filteredCatalog, {
    crMin: 0,
    crMax: 30,
    excludedSizes: ["medium"],
    excludedTypes: ["beast"],
    sizeFilterMode: "include",
    typeFilterMode: "include"
  });

  assert.deepEqual(eligible.map((monster) => monster.id), ["wolf"]);
});

test("opens the next auction from a random available creature", () => {
  const room = readyRoom(2);
  openRandomMonstersLeagueLot(room, catalog, 1100, () => 0.5);

  assert.equal(room.currentLot.monster.id, catalog[6].id);
  assert.equal(room.currentLot.currentBid, 1);
  assert.equal(room.currentLot.highBidPlayerId, room.nominationOrder[0]);
});
