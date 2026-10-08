import { cleanText, normalizeSearchText } from "../shared/text.js";

export const MONSTERS_LEAGUE_SCHEMA_VERSION = 1;
export const MONSTERS_LEAGUE_STARTING_GOLD = 100;

export const MONSTERS_LEAGUE_TEAM_COLORS = Object.freeze([
  "#d9ab5d",
  "#5eb7a6",
  "#d87a84",
  "#7f9edb",
  "#b58ad9",
  "#df8f55",
  "#78b96b",
  "#d16fae"
]);

const DEFAULT_CONFIG = Object.freeze({
  name: "Monsters League",
  maxPlayers: 4,
  teamSize: 4,
  crMin: 0.5,
  crMax: 5,
  nominationSeconds: 30,
  bidSeconds: 20,
  antiSnipeSeconds: 8,
  excludedSizes: [],
  excludedTypes: [],
  uniqueCreatures: true
});

export class MonstersLeagueRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MonstersLeagueRuleError";
    this.code = code;
  }
}

export function createMonstersLeagueRoom({
  id = createRoomId(),
  campaignId = "",
  host,
  language = "es",
  config = {},
  now = Date.now()
} = {}) {
  const normalizedHost = normalizeParticipant(host, 0, { fallbackName: "Host" });

  if (!normalizedHost.id) {
    throw new MonstersLeagueRuleError("host_required", "Room host is required.");
  }

  return {
    schemaVersion: MONSTERS_LEAGUE_SCHEMA_VERSION,
    id: cleanText(id) || createRoomId(),
    campaignId: cleanText(campaignId),
    status: "configuring",
    revision: 1,
    language: language === "en" ? "en" : "es",
    hostPlayerId: normalizedHost.id,
    config: normalizeMonstersLeagueConfig(config),
    players: [normalizedHost],
    nominationOrder: [],
    nominationIndex: 0,
    nominationDeadlineAt: 0,
    availableMonsterIds: [],
    combatState: {},
    currentLot: null,
    history: [],
    createdAt: now,
    updatedAt: now,
    completedAt: 0
  };
}

export function normalizeMonstersLeagueConfig(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const crMin = normalizeCrBoundary(source.crMin, DEFAULT_CONFIG.crMin);
  const crMax = normalizeCrBoundary(source.crMax, DEFAULT_CONFIG.crMax);

  return {
    name: cleanText(source.name).slice(0, 80) || DEFAULT_CONFIG.name,
    maxPlayers: clampInteger(source.maxPlayers, 2, 8, DEFAULT_CONFIG.maxPlayers),
    teamSize: clampInteger(source.teamSize, 1, 8, DEFAULT_CONFIG.teamSize),
    crMin: Math.min(crMin, crMax),
    crMax: Math.max(crMin, crMax),
    nominationSeconds: clampInteger(source.nominationSeconds, 5, 120, DEFAULT_CONFIG.nominationSeconds),
    bidSeconds: clampInteger(source.bidSeconds, 5, 90, DEFAULT_CONFIG.bidSeconds),
    antiSnipeSeconds: clampInteger(source.antiSnipeSeconds, 3, 15, DEFAULT_CONFIG.antiSnipeSeconds),
    excludedSizes: normalizeFilterList(source.excludedSizes),
    excludedTypes: normalizeFilterList(source.excludedTypes),
    uniqueCreatures: source.uniqueCreatures !== false
  };
}

export function updateMonstersLeagueConfig(room, config, actorPlayerId, now = Date.now()) {
  assertHost(room, actorPlayerId);
  assertStatus(room, "configuring");
  room.config = normalizeMonstersLeagueConfig({ ...room.config, ...config });
  touch(room, now);
  return room;
}

export function addMonstersLeaguePlayer(room, player, actorPlayerId = "", now = Date.now()) {
  if (!room || !["configuring", "waiting"].includes(room.status)) {
    throw new MonstersLeagueRuleError("room_locked", "Room no longer accepts players.");
  }

  const normalized = normalizeParticipant(player, room.players.length);
  const addingBot = normalized.isBot;

  if (addingBot) {
    assertHost(room, actorPlayerId || room.hostPlayerId);
  }

  if (!normalized.id) {
    throw new MonstersLeagueRuleError("player_required", "Player identity is required.");
  }

  if (room.players.some((entry) => entry.id === normalized.id || (!entry.isBot && !normalized.isBot && entry.userId && entry.userId === normalized.userId))) {
    return room;
  }

  if (room.players.length >= room.config.maxPlayers) {
    throw new MonstersLeagueRuleError("room_full", "Room is full.");
  }

  room.players.push(normalized);
  touch(room, now);
  return room;
}

export function removeMonstersLeaguePlayer(room, playerId, actorPlayerId, now = Date.now()) {
  assertHost(room, actorPlayerId);

  if (!room || !["configuring", "waiting"].includes(room.status)) {
    throw new MonstersLeagueRuleError("room_locked", "Players cannot be removed after draft lock.");
  }

  if (cleanText(playerId) === room.hostPlayerId) {
    throw new MonstersLeagueRuleError("host_cannot_leave", "Host cannot be removed.");
  }

  room.players = room.players.filter((entry) => entry.id !== cleanText(playerId));
  room.players.forEach((entry, index) => {
    entry.color = MONSTERS_LEAGUE_TEAM_COLORS[index % MONSTERS_LEAGUE_TEAM_COLORS.length];
  });
  touch(room, now);
  return room;
}

export function publishMonstersLeagueRoom(room, actorPlayerId, now = Date.now()) {
  assertHost(room, actorPlayerId);
  assertStatus(room, "configuring");
  room.status = "waiting";
  room.players.forEach((player) => {
    player.ready = player.id === room.hostPlayerId || player.isBot;
  });
  touch(room, now);
  return room;
}

export function setMonstersLeagueReady(room, playerId, ready, now = Date.now()) {
  assertStatus(room, "waiting");
  const player = getPlayer(room, playerId);
  player.ready = ready === true;
  touch(room, now);
  return room;
}

export function startMonstersLeagueDraft(room, actorPlayerId, catalog, now = Date.now(), random = Math.random) {
  assertHost(room, actorPlayerId);
  assertStatus(room, "waiting");

  if (room.players.length < 2) {
    throw new MonstersLeagueRuleError("players_required", "At least two players are required.");
  }

  if (room.players.some((player) => !player.ready)) {
    throw new MonstersLeagueRuleError("players_not_ready", "Every player must be ready.");
  }

  const eligible = getEligibleMonsters(catalog, room.config);
  const requiredCount = room.players.length * room.config.teamSize;

  if (eligible.length < requiredCount) {
    throw new MonstersLeagueRuleError("catalog_too_small", `Draft needs ${requiredCount} eligible creatures.`);
  }

  room.players.forEach((player) => {
    player.gold = MONSTERS_LEAGUE_STARTING_GOLD;
    player.roster = [];
  });
  room.availableMonsterIds = eligible.map((monster) => monster.id);
  room.nominationOrder = shuffle(room.players.map((player) => player.id), random);
  room.nominationIndex = 0;
  room.status = "drafting";
  room.currentLot = null;
  room.history = [];
  room.nominationDeadlineAt = now + room.config.nominationSeconds * 1000;
  touch(room, now);
  return room;
}

export function getEligibleMonsters(catalog, config) {
  const normalizedConfig = normalizeMonstersLeagueConfig(config);
  const excludedSizes = new Set(normalizedConfig.excludedSizes);
  const excludedTypes = new Set(normalizedConfig.excludedTypes);
  const seen = new Set();

  return (Array.isArray(catalog) ? catalog : []).filter((monster) => {
    const id = cleanText(monster?.id);
    const crValue = Number(monster?.crValue);
    const sizeKey = getMonsterFilterKey(monster?.sizeFilterKey || monster?.size);
    const typeKey = getMonsterTypeFilterKey(monster?.typeFilterKey || monster?.type);

    if (!id || !Number.isFinite(crValue) || crValue < normalizedConfig.crMin || crValue > normalizedConfig.crMax) {
      return false;
    }

    if ((sizeKey && excludedSizes.has(sizeKey)) || (typeKey && excludedTypes.has(typeKey))) {
      return false;
    }

    if (!normalizedConfig.uniqueCreatures) {
      return true;
    }

    const dedupeKey = cleanText(monster.dedupeKey)
      || normalizeSearchText(monster.canonicalName || monster.name)
      || id;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

export function openRandomMonstersLeagueLot(room, catalog, now = Date.now(), random = Math.random) {
  assertStatus(room, "drafting");

  if (room.currentLot) {
    throw new MonstersLeagueRuleError("lot_active", "Current auction must finish first.");
  }

  const available = (Array.isArray(catalog) ? catalog : []).filter((monster) => room.availableMonsterIds.includes(monster.id));
  const nominator = getCurrentNominator(room);

  if (!nominator || available.length === 0) {
    throw new MonstersLeagueRuleError("monster_unavailable", "No creature is available for the next auction.");
  }

  const monster = available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  return nominateMonstersLeagueCreature(room, nominator.id, monster, now);
}

export function getCurrentNominator(room) {
  if (!room || room.status !== "drafting" || room.nominationOrder.length === 0) {
    return null;
  }

  const id = room.nominationOrder[room.nominationIndex % room.nominationOrder.length];
  return room.players.find((player) => player.id === id) || null;
}

export function nominateMonstersLeagueCreature(room, playerId, monster, now = Date.now()) {
  assertStatus(room, "drafting");

  if (room.currentLot) {
    throw new MonstersLeagueRuleError("lot_active", "Current auction must finish first.");
  }

  const nominator = getCurrentNominator(room);

  if (!nominator || nominator.id !== cleanText(playerId)) {
    throw new MonstersLeagueRuleError("not_nominator", "Only current nominator can choose a creature.");
  }

  if (!room.availableMonsterIds.includes(cleanText(monster?.id))) {
    throw new MonstersLeagueRuleError("monster_unavailable", "Creature is not available.");
  }

  if (getMonstersLeagueMaxBid(room, nominator.id) < 1) {
    throw new MonstersLeagueRuleError("insufficient_gold", "Player cannot afford another creature.");
  }

  room.currentLot = {
    monster: sanitizeMonster(monster),
    nominatedByPlayerId: nominator.id,
    highBidPlayerId: nominator.id,
    currentBid: 1,
    openedAt: now,
    deadlineAt: now + room.config.bidSeconds * 1000
  };
  room.nominationDeadlineAt = 0;
  touch(room, now);
  return room;
}

export function placeMonstersLeagueBid(room, playerId, amount, now = Date.now()) {
  assertStatus(room, "drafting");

  if (!room.currentLot) {
    throw new MonstersLeagueRuleError("no_active_lot", "No creature is currently being auctioned.");
  }

  if (now >= room.currentLot.deadlineAt) {
    throw new MonstersLeagueRuleError("lot_expired", "Auction already ended.");
  }

  const player = getPlayer(room, playerId);
  const bid = Math.floor(Number(amount));

  if (player.roster.length >= room.config.teamSize) {
    throw new MonstersLeagueRuleError("roster_full", "Player roster is full.");
  }

  if (!Number.isFinite(bid) || bid <= room.currentLot.currentBid) {
    throw new MonstersLeagueRuleError("bid_too_low", "Bid must exceed current bid.");
  }

  if (bid > getMonstersLeagueMaxBid(room, player.id)) {
    throw new MonstersLeagueRuleError("bid_too_high", "Bid would leave roster without enough gold.");
  }

  room.currentLot.currentBid = bid;
  room.currentLot.highBidPlayerId = player.id;

  const antiSnipeMs = room.config.antiSnipeSeconds * 1000;

  if (room.currentLot.deadlineAt - now <= antiSnipeMs) {
    room.currentLot.deadlineAt = now + antiSnipeMs;
  }

  touch(room, now);
  return room;
}

export function resolveMonstersLeagueLot(room, now = Date.now()) {
  assertStatus(room, "drafting");

  if (!room.currentLot) {
    throw new MonstersLeagueRuleError("no_active_lot", "No creature is currently being auctioned.");
  }

  const lot = room.currentLot;
  const winner = getPlayer(room, lot.highBidPlayerId);

  if (lot.currentBid > getMonstersLeagueMaxBid(room, winner.id)) {
    throw new MonstersLeagueRuleError("invalid_winning_bid", "Winning bid is no longer affordable.");
  }

  winner.gold -= lot.currentBid;
  winner.roster.push({
    monster: lot.monster,
    price: lot.currentBid,
    acquiredAt: now
  });
  room.availableMonsterIds = room.availableMonsterIds.filter((id) => id !== lot.monster.id);
  room.history.push({
    monster: lot.monster,
    winnerPlayerId: winner.id,
    price: lot.currentBid,
    nominatedByPlayerId: lot.nominatedByPlayerId,
    resolvedAt: now
  });
  room.currentLot = null;

  if (room.players.every((player) => player.roster.length >= room.config.teamSize)) {
    room.status = "complete";
    room.completedAt = now;
    room.nominationDeadlineAt = 0;
  } else {
    advanceNominator(room);
    room.nominationDeadlineAt = now + room.config.nominationSeconds * 1000;
  }

  touch(room, now);
  return room;
}

export function getMonstersLeagueMaxBid(room, playerId) {
  const player = getPlayer(room, playerId);
  const emptySlots = Math.max(0, room.config.teamSize - player.roster.length);

  if (emptySlots === 0) {
    return 0;
  }

  return Math.max(0, player.gold - (emptySlots - 1));
}

export function getMonstersLeagueRoomSummary(room) {
  return {
    id: room.id,
    campaignId: cleanText(room.campaignId),
    status: room.status,
    revision: room.revision,
    language: room.language,
    hostPlayerId: room.hostPlayerId,
    config: { ...room.config },
    players: room.players.map((player) => ({
      ...player,
      roster: player.roster.map((entry) => ({ ...entry, monster: { ...entry.monster } }))
    })),
    nominationOrder: [...room.nominationOrder],
    nominationIndex: room.nominationIndex,
    nominationDeadlineAt: room.nominationDeadlineAt,
    availableMonsterIds: [...room.availableMonsterIds],
    combatState: cloneCombatState(room.combatState),
    currentLot: room.currentLot ? { ...room.currentLot, monster: { ...room.currentLot.monster } } : null,
    history: room.history.map((entry) => ({ ...entry, monster: { ...entry.monster } })),
    completedAt: room.completedAt
  };
}

function cloneCombatState(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(source).map(([teamId, monsters]) => [
    cleanText(teamId),
    Object.fromEntries(Object.entries(monsters && typeof monsters === "object" ? monsters : {}).map(([monsterId, live]) => [
      cleanText(monsterId),
      {
        maxHp: Math.max(0, Number(live?.maxHp) || 0),
        currentHp: Math.max(0, Number(live?.currentHp) || 0),
        tempHp: Math.max(0, Number(live?.tempHp) || 0),
        necrotic: Math.max(0, Number(live?.necrotic) || 0),
        conditions: Array.isArray(live?.conditions) ? live.conditions.map(cleanText).filter(Boolean).slice(0, 30) : []
      }
    ]))
  ]));
}

export function createMonstersLeagueEncounters(room) {
  if (!room || !["complete", "combat"].includes(room.status)) {
    throw new MonstersLeagueRuleError("draft_incomplete", "Draft must finish before encounters are created.");
  }

  return room.players.map((player) => ({
    id: `monsters-league-${room.id}-${player.id}`,
    name: `Equipo de ${player.name}`,
    folderId: "",
    map: null,
    mapEditorState: null,
    multiplayer: {
      mode: "monsters-league",
      roomId: room.id,
      teamId: player.id,
      ownerUserId: player.userId,
      ownerName: player.name,
      color: player.color
    },
    rows: player.roster.map((award, index) => ({
      id: `monsters-league-row-${room.id}-${player.id}-${index + 1}`,
      entryId: award.monster.id,
      entryKey: award.monster.entryKey || award.monster.id,
      name: award.monster.name,
      canonicalName: award.monster.canonicalName || award.monster.name,
      localizedName: award.monster.localizedName || "",
      source: award.monster.source || "",
      canonicalSource: award.monster.canonicalSource || award.monster.source || "",
      tokenUrl: award.monster.tokenUrl || "",
      hp: award.monster.hp || "",
      hpValue: award.monster.hpValue || 0,
      ac: award.monster.ac || "",
      acValue: award.monster.acValue || 0,
      crLabel: award.monster.crLabel || "",
      crValue: award.monster.crValue || 0,
      units: 1,
      draftPrice: award.price,
      teamId: player.id,
      teamColor: player.color
    }))
  }));
}

export function chooseBotNomination(room, catalog, playerId, random = Math.random) {
  const player = getPlayer(room, playerId);
  const available = (Array.isArray(catalog) ? catalog : []).filter((monster) => room.availableMonsterIds.includes(monster.id));

  if (!player.isBot || available.length === 0) {
    return null;
  }

  const sorted = [...available].sort((left, right) => Number(right.crValue || 0) - Number(left.crValue || 0));
  const windowSize = Math.max(1, Math.ceil(sorted.length * (0.25 + random() * 0.45)));
  return sorted[Math.floor(random() * windowSize)] || sorted[0];
}

export function chooseBotBid(room, playerId, random = Math.random) {
  const player = getPlayer(room, playerId);

  if (!player.isBot || !room.currentLot || room.currentLot.highBidPlayerId === player.id) {
    return 0;
  }

  const maxBid = getMonstersLeagueMaxBid(room, player.id);
  const emptySlots = Math.max(1, room.config.teamSize - player.roster.length);
  const averageBudget = player.gold / emptySlots;
  const range = Math.max(0.125, room.config.crMax - room.config.crMin);
  const crWeight = Math.max(0, Math.min(1, (Number(room.currentLot.monster.crValue) - room.config.crMin) / range));
  const personality = Number(player.botAggression || 1);
  const target = Math.max(1, Math.round(averageBudget * personality * (0.65 + crWeight * 0.75)));
  const nextBid = room.currentLot.currentBid + (random() > 0.82 ? 2 : 1);

  if (nextBid > Math.min(maxBid, target) || random() < 0.18) {
    return 0;
  }

  return nextBid;
}

function normalizeParticipant(value, index, options = {}) {
  const source = value && typeof value === "object" ? value : {};
  const isBot = source.isBot === true;
  const name = cleanText(source.name).slice(0, 60) || options.fallbackName || (isBot ? `Bot ${index}` : `Jugador ${index + 1}`);
  const id = cleanText(source.id) || (isBot ? `bot-${createRoomId(8)}` : cleanText(source.userId));

  return {
    id,
    userId: isBot ? "" : cleanText(source.userId || id),
    name,
    isBot,
    botAggression: isBot ? clampNumber(source.botAggression, 0.65, 1.35, 1) : 1,
    color: MONSTERS_LEAGUE_TEAM_COLORS[index % MONSTERS_LEAGUE_TEAM_COLORS.length],
    ready: isBot,
    gold: MONSTERS_LEAGUE_STARTING_GOLD,
    roster: []
  };
}

function sanitizeMonster(monster) {
  const source = monster && typeof monster === "object" ? monster : {};
  return {
    id: cleanText(source.id),
    entryKey: cleanText(source.entryKey || source.identityKey || source.id),
    name: cleanText(source.name),
    canonicalName: cleanText(source.canonicalName || source.name),
    localizedName: cleanText(source.localizedName),
    source: cleanText(source.source),
    canonicalSource: cleanText(source.canonicalSource || source.source),
    imageUrl: cleanText(source.imageUrl),
    tokenUrl: cleanText(source.tokenUrl),
    hp: cleanText(source.hp),
    hpValue: Number(source.hpValue) || 0,
    ac: cleanText(source.ac),
    acValue: Number(source.acValue) || 0,
    crLabel: cleanText(source.crBaseLabel || source.crLabel),
    crValue: Number(source.crBaseValue ?? source.crValue) || 0
  };
}

function advanceNominator(room) {
  for (let offset = 1; offset <= room.nominationOrder.length; offset += 1) {
    const nextIndex = (room.nominationIndex + offset) % room.nominationOrder.length;
    const player = getPlayer(room, room.nominationOrder[nextIndex]);

    if (player.roster.length < room.config.teamSize) {
      room.nominationIndex = nextIndex;
      return;
    }
  }
}

function getPlayer(room, playerId) {
  const player = room?.players?.find((entry) => entry.id === cleanText(playerId));

  if (!player) {
    throw new MonstersLeagueRuleError("player_not_found", "Player is not part of room.");
  }

  return player;
}

function assertHost(room, playerId) {
  if (!room || cleanText(playerId) !== room.hostPlayerId) {
    throw new MonstersLeagueRuleError("host_required", "Only host can perform this action.");
  }
}

function assertStatus(room, expected) {
  if (!room || room.status !== expected) {
    throw new MonstersLeagueRuleError("invalid_status", `Room must be ${expected}.`);
  }
}

function touch(room, now) {
  room.revision += 1;
  room.updatedAt = now;
}

function shuffle(values, random) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function normalizeCrBoundary(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(30, number)) : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function normalizeFilterList(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(getMonsterFilterKey).filter(Boolean))].slice(0, 40);
}

function getMonsterTypeFilterKey(value) {
  return getMonsterFilterKey(cleanText(value).split(/[,(\[]/, 1)[0]);
}

function getMonsterFilterKey(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function createRoomId(length = 12) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let value = "";
  const bytes = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? crypto.getRandomValues(new Uint8Array(length))
    : Array.from({ length }, () => Math.floor(Math.random() * 256));

  for (let index = 0; index < length; index += 1) {
    value += alphabet[bytes[index] % alphabet.length];
  }

  return value;
}
