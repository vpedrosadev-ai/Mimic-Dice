import { DurableObject } from "cloudflare:workers";

import {
  addMonstersLeaguePlayer,
  advanceMonstersLeagueDraft,
  chooseBotBid,
  createMonstersLeagueRoom,
  getMonstersLeagueRoomSummary,
  openRandomMonstersLeagueLot,
  placeMonstersLeagueBid,
  publishMonstersLeagueRoom,
  removeMonstersLeaguePlayer,
  resolveMonstersLeagueLot,
  setMonstersLeagueReady,
  startMonstersLeagueDraft,
  updateMonstersLeagueConfig
} from "../../src/multiplayer/monstersLeagueRules.js";
import { createMonstersLeagueCombatFeedback } from "../../src/multiplayer/monstersLeagueLiveEvents.js";

const ROOM_STORAGE_KEY = "room";
const CATALOG_STORAGE_KEY = "catalog";

export class MonstersLeagueRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.catalog = [];
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get([ROOM_STORAGE_KEY, CATALOG_STORAGE_KEY]);
      this.room = stored.get(ROOM_STORAGE_KEY) || null;
      this.catalog = stored.get(CATALOG_STORAGE_KEY) || [];
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    if (url.pathname === "/create" && request.method === "POST") {
      if (this.room) {
        return Response.json({ room: getMonstersLeagueRoomSummary(this.room) });
      }

      const body = await request.json();
      const user = getTrustedUser(request);
      this.room = createMonstersLeagueRoom({
        id: body.roomId,
        campaignId: body.campaignId,
        host: { id: user.id, userId: user.id, name: user.name },
        language: body.language,
        config: { name: body.name }
      });
      await this.persist();
      return Response.json({ room: getMonstersLeagueRoomSummary(this.room) }, { status: 201 });
    }

    if (url.pathname === "/snapshot" && request.method === "GET") {
      if (!this.room) return new Response("Room not found", { status: 404 });
      return Response.json({ room: getMonstersLeagueRoomSummary(this.room) });
    }

    if (url.pathname === "/authorize" && request.method === "GET") {
      if (!this.room) return new Response("Room not found", { status: 404 });
      const user = getTrustedUser(request);
      const authorized = this.room.players.some((entry) => entry.userId === user.id || entry.id === user.id);
      return Response.json({ authorized, hostPlayerId: this.room.hostPlayerId });
    }

    if (url.pathname.startsWith("/socket/") && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return await this.connectSocket(request);
    }

    return new Response("Not found", { status: 404 });
  }

  async connectSocket(request) {
    if (!this.room) {
      return new Response("Room not found", { status: 404 });
    }

    const user = getTrustedUser(request);
    let player = this.room.players.find((entry) => entry.userId === user.id || entry.id === user.id);

    if (!player) {
      if (this.room.status !== "waiting") {
        return new Response("Room locked", { status: 409 });
      }

      addMonstersLeaguePlayer(this.room, { id: user.id, userId: user.id, name: user.name }, "", Date.now());
      player = this.room.players.find((entry) => entry.id === user.id);
      await this.persist();
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id, userId: user.id, name: user.name });
    server.send(JSON.stringify({
      type: "snapshot",
      serverNow: Date.now(),
      room: getMonstersLeagueRoomSummary(this.room)
    }));
    this.broadcastSnapshot(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    await this.ready;
    const attachment = socket.deserializeAttachment() || {};

    let command = {};
    try {
      command = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
      await this.applyCommand(command, attachment);
      socket.send(JSON.stringify({ type: "ack", commandId: command.commandId || "", revision: this.room.revision }));
      this.broadcastSnapshot();
    } catch (error) {
      socket.send(JSON.stringify({
        type: "error",
        commandId: safeText(command?.commandId),
        code: safeText(error?.code) || "invalid_command",
        message: safeText(error?.message) || "Command rejected."
      }));
    }
  }

  webSocketClose() {}

  async alarm() {
    await this.ready;

    if (!this.room || this.room.status !== "drafting") {
      return;
    }

    const changed = this.runAutomaticDraftStep(Date.now());

    if (changed) {
      await this.persist();
      this.broadcastSnapshot();
    }

    await this.scheduleNextAlarm();
  }

  async applyCommand(command, actor = {}) {
    const type = safeText(command?.type);
    const playerId = safeText(actor.playerId);
    const now = Date.now();

    if (type === "update-config") {
      updateMonstersLeagueConfig(this.room, command.config, playerId, now);
    } else if (type === "add-bot") {
      addMonstersLeaguePlayer(this.room, {
        name: safeText(command.name) || `Bot ${this.room.players.filter((entry) => entry.isBot).length + 1}`,
        isBot: true,
        botAggression: Number(command.botAggression) || 1
      }, playerId, now);
    } else if (type === "remove-player") {
      removeMonstersLeaguePlayer(this.room, command.playerId, playerId, now);
    } else if (type === "publish") {
      publishMonstersLeagueRoom(this.room, playerId, now);
    } else if (type === "ready") {
      setMonstersLeagueReady(this.room, playerId, command.ready === true, now);
    } else if (type === "start") {
      this.catalog = sanitizeCatalog(command.catalog);
      startMonstersLeagueDraft(this.room, playerId, this.catalog, now);
      openRandomMonstersLeagueLot(this.room, this.catalog, now);
    } else if (type === "bid") {
      placeMonstersLeagueBid(this.room, playerId, command.amount, now);
    } else if (type === "next-lot") {
      advanceMonstersLeagueDraft(this.room, playerId, this.catalog, now);
    } else if (type === "enter-combat") {
      if (playerId !== this.room.hostPlayerId || this.room.status !== "complete") {
        throw Object.assign(new Error("Only host can start combat after draft."), { code: "host_required" });
      }
      this.room.status = "combat";
      this.room.revision += 1;
      this.room.updatedAt = now;
    } else if (type === "combat-update") {
      const player = this.room.players.find((entry) => entry.id === playerId);
      if (!player || player.isBot || !["complete", "combat"].includes(this.room.status)) {
        throw Object.assign(new Error("This player cannot update live combat."), { code: "player_required" });
      }
      const nextCombatState = sanitizeCombatState(command.combatState, this.room);
      const feedback = createMonstersLeagueCombatFeedback(this.room.combatState, nextCombatState, actor, { now });
      this.room.combatState = nextCombatState;
      this.room.combatMeta = sanitizeCombatMeta(command.combatMeta, this.room);
      this.room.combatFeedback = [
        ...(Array.isArray(this.room.combatFeedback) ? this.room.combatFeedback : []),
        ...feedback
      ].slice(-50);
      if (playerId === this.room.hostPlayerId && Object.prototype.hasOwnProperty.call(command, "mapProjection")) {
        this.room.mapProjection = sanitizeMapProjection(command.mapProjection, this.room);
      }
      this.room.revision += 1;
      this.room.updatedAt = now;
    } else if (type === "dice-roll") {
      const player = this.room.players.find((entry) => entry.id === playerId);
      if (!player || player.isBot || !["complete", "combat"].includes(this.room.status)) {
        throw Object.assign(new Error("This player cannot publish dice rolls."), { code: "player_required" });
      }
      const roll = sanitizeDiceRoll(command.roll, actor);
      this.room.diceRollHistory = [
        ...(Array.isArray(this.room.diceRollHistory) ? this.room.diceRollHistory : []).filter((entry) => entry.id !== roll.id),
        roll
      ].slice(-100);
      this.room.revision += 1;
      this.room.updatedAt = now;
    } else {
      throw Object.assign(new Error("Unknown room command."), { code: "unknown_command" });
    }

    await this.persist();
    await this.scheduleNextAlarm();
  }

  runAutomaticDraftStep(now) {
    if (!this.room.currentLot) {
      openRandomMonstersLeagueLot(this.room, this.catalog, now);
      return true;
    }

    if (now >= this.room.currentLot.deadlineAt) {
      resolveMonstersLeagueLot(this.room, now);
      return true;
    }

    const bots = this.room.players.filter((player) => player.isBot);
    for (const bot of bots.sort(() => Math.random() - 0.5)) {
      const amount = chooseBotBid(this.room, bot.id);
      if (amount > 0) {
        placeMonstersLeagueBid(this.room, bot.id, amount, now);
        return true;
      }
    }

    return false;
  }

  async scheduleNextAlarm() {
    if (!this.room || this.room.status !== "drafting") {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const now = Date.now();
    const deadline = this.room.currentLot?.deadlineAt || this.room.nominationDeadlineAt;
    const hasBots = this.room.players.some((player) => player.isBot);
    const nextAt = hasBots ? Math.min(deadline, now + 850) : deadline;
    await this.ctx.storage.setAlarm(Math.max(now + 100, nextAt));
  }

  async persist() {
    await this.ctx.storage.put({
      [ROOM_STORAGE_KEY]: this.room,
      [CATALOG_STORAGE_KEY]: this.catalog
    });
  }

  broadcastSnapshot(except = null) {
    if (!this.room) return;
    const payload = JSON.stringify({
      type: "snapshot",
      serverNow: Date.now(),
      room: getMonstersLeagueRoomSummary(this.room)
    });
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
      try { socket.send(payload); } catch {}
    }
  }
}

const SHARED_CAMPAIGN_METADATA_KEY = "campaign-metadata";

export class SharedCampaignRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.metadata = null;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.metadata = await ctx.storage.get(SHARED_CAMPAIGN_METADATA_KEY) || null;
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    if (url.pathname.startsWith("/socket") && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return this.connectSocket(request);
    }

    if (url.pathname === "/revision" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      this.metadata = {
        ...(this.metadata || {}),
        campaignId: safeText(body.campaignId).slice(0, 120),
        revision: Math.max(0, Math.floor(Number(body.revision) || 0)),
        updatedAt: safeText(body.updatedAt).slice(0, 80),
        actorUserId: safeText(body.actorUserId).slice(0, 120),
        changeScope: safeText(body.changeScope) === "combat-checkpoint" ? "combat-checkpoint" : "full"
      };
      await this.ctx.storage.put(SHARED_CAMPAIGN_METADATA_KEY, this.metadata);
      this.broadcast({ type: "revision", ...this.metadata });
      return Response.json({ ok: true });
    }

    if (url.pathname === "/join-request" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const type = safeText(body.type);
      if (type === "join-request") this.broadcast(body, { role: "host" });
      else if (type === "join-resolution") this.broadcast(body);
      return Response.json({ ok: true });
    }

    if (url.pathname === "/close" && request.method === "POST") {
      this.broadcast({ type: "closed" });
      for (const socket of this.ctx.getWebSockets()) {
        try { socket.close(1000, "Campaign collaboration closed"); } catch {}
      }
      await this.ctx.storage.deleteAll();
      this.metadata = null;
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  async connectSocket(request) {
    const user = getTrustedUser(request);
    const campaignId = safeText(request.headers.get("X-Mimic-Campaign-Id")).slice(0, 120);
    const revision = Math.max(0, Math.floor(Number(request.headers.get("X-Mimic-Campaign-Revision")) || 0));
    const updatedAt = safeText(request.headers.get("X-Mimic-Campaign-Updated-At")).slice(0, 80);
    const role = safeText(request.headers.get("X-Mimic-Campaign-Role")) === "host" ? "host" : "editor";

    if (!campaignId) {
      return new Response("Campaign required", { status: 400 });
    }

    if (!this.metadata || revision > Number(this.metadata.revision || 0)) {
      this.metadata = { ...(this.metadata || {}), campaignId, revision, updatedAt, actorUserId: "" };
      await this.ctx.storage.put(SHARED_CAMPAIGN_METADATA_KEY, this.metadata);
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      userId: user.id,
      name: user.name,
      role,
      connectedAt: Date.now(),
      connectionId: crypto.randomUUID()
    });
    server.send(JSON.stringify({ type: "revision", ...this.metadata }));
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    let command = null;
    try { command = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)); } catch {}
    if (command?.type === "ping") {
      try { socket.send(JSON.stringify({ type: "pong", serverNow: Date.now() })); } catch {}
      return;
    }
    if (command?.type === "combat-section") {
      const attachment = socket.deserializeAttachment() || {};
      const section = safeText(command.section);
      if (!['tracker', 'map'].includes(section) || !['host', 'editor'].includes(attachment.role)) return;
      const operation = safeText(command.operation) || "replace";
      if ((section === "tracker" && operation !== "replace") || (section === "map" && !['replace', 'token-position'].includes(operation))) return;
      const serializedValue = JSON.stringify(command.value ?? null);
      if (serializedValue.length > 2_000_000) {
        try { socket.send(JSON.stringify({ type: "error", commandId: safeText(command.commandId), code: "section_too_large" })); } catch {}
        return;
      }
      const sequence = Math.max(0, Math.floor(Number(this.metadata?.combatSequence) || 0)) + 1;
      this.metadata = { ...(this.metadata || {}), combatSequence: sequence };
      await this.ctx.storage.put(SHARED_CAMPAIGN_METADATA_KEY, this.metadata);
      this.broadcast({
        type: "combat-section",
        section,
        operation,
        value: command.value,
        commandId: safeText(command.commandId).slice(0, 120),
        sequence,
        actorUserId: attachment.userId
      }, { except: socket });
      try { socket.send(JSON.stringify({ type: "combat-section-ack", commandId: safeText(command.commandId), section, sequence })); } catch {}
      return;
    }
    if (command?.type === "combat-event") {
      const attachment = socket.deserializeAttachment() || {};
      if (!['host', 'editor'].includes(attachment.role) || !command.event || typeof command.event !== "object") return;
      const serializedEvent = JSON.stringify(command.event);
      if (serializedEvent.length > 12_000) return;
      this.broadcast({
        type: "combat-event",
        event: command.event,
        actorUserId: attachment.userId
      }, { except: socket });
    }
  }

  webSocketClose() {
    this.broadcastPresence();
  }

  webSocketError() {
    this.broadcastPresence();
  }

  broadcastPresence() {
    const sockets = this.ctx.getWebSockets();
    const userIds = new Set();
    const socketsByUser = new Map();
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment() || {};
      if (!attachment.userId) continue;
      userIds.add(attachment.userId);
      const entries = socketsByUser.get(attachment.userId) || [];
      entries.push({ socket, attachment });
      socketsByUser.set(attachment.userId, entries);
    }
    for (const entries of socketsByUser.values()) {
      entries.sort((left, right) => (
        Number(left.attachment.connectedAt || 0) - Number(right.attachment.connectedAt || 0)
        || safeText(left.attachment.connectionId).localeCompare(safeText(right.attachment.connectionId))
      ));
      entries.forEach(({ socket }, index) => {
        try {
          socket.send(JSON.stringify({
            type: "presence",
            userCount: userIds.size,
            connectionCount: sockets.length,
            sameAccountDeviceCount: entries.length,
            sameAccountOldest: index === 0
          }));
        } catch {}
      });
    }
  }

  broadcast(message, options = {}) {
    const payload = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === options.except) continue;
      if (options.role) {
        const attachment = socket.deserializeAttachment() || {};
        if (attachment.role !== options.role) continue;
      }
      try { socket.send(payload); } catch {}
    }
  }
}

export default {
  fetch() {
    return new Response("Monsters League room worker", { status: 404 });
  }
};

function getTrustedUser(request) {
  const id = safeText(request.headers.get("X-Mimic-User-Id"));
  let name = "Jugador";
  try { name = decodeURIComponent(request.headers.get("X-Mimic-User-Name") || "") || name; } catch {}
  if (!id) throw Object.assign(new Error("Authenticated user required."), { code: "unauthorized" });
  return { id, name: safeText(name).slice(0, 80) || "Jugador" };
}

function sanitizeCatalog(value) {
  return (Array.isArray(value) ? value : []).slice(0, 6000).map((entry) => ({
    id: safeText(entry?.id),
    entryKey: safeText(entry?.entryKey || entry?.id),
    name: safeText(entry?.name),
    canonicalName: safeText(entry?.canonicalName || entry?.name),
    localizedName: safeText(entry?.localizedName),
    dedupeKey: safeText(entry?.dedupeKey),
    source: safeText(entry?.source),
    canonicalSource: safeText(entry?.canonicalSource || entry?.source),
    imageUrl: safeText(entry?.imageUrl),
    tokenUrl: safeText(entry?.tokenUrl),
    size: safeText(entry?.size),
    type: safeText(entry?.type),
    sizeFilterKey: safeText(entry?.sizeFilterKey),
    typeFilterKey: safeText(entry?.typeFilterKey),
    hp: safeText(entry?.hp),
    hpValue: Number(entry?.hpValue) || 0,
    ac: safeText(entry?.ac),
    acValue: Number(entry?.acValue) || 0,
    crLabel: safeText(entry?.crBaseLabel || entry?.crLabel),
    crValue: Number(entry?.crBaseValue ?? entry?.crValue) || 0
  })).filter((entry) => entry.id && entry.name);
}

function safeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sanitizeCombatState(value, room) {
  const source = value && typeof value === "object" ? value : {};
  const validTeams = new Map(room.players.map((player) => [player.id, new Set(player.roster.map((award) => award.monster.id))]));
  const result = {};

  for (const [teamId, monsters] of Object.entries(source)) {
    const validMonsters = validTeams.get(safeText(teamId));
    if (!validMonsters || !monsters || typeof monsters !== "object") continue;
    result[teamId] = {};
    for (const [monsterId, live] of Object.entries(monsters)) {
      if (!validMonsters.has(safeText(monsterId))) continue;
      const maxHp = clampLiveNumber(live?.maxHp);
      const necrotic = Math.min(maxHp, clampLiveNumber(live?.necrotic));
      result[teamId][monsterId] = {
        maxHp,
        currentHp: Math.min(Math.max(0, maxHp - necrotic), clampLiveNumber(live?.currentHp)),
        tempHp: clampLiveNumber(live?.tempHp),
        necrotic,
        conditions: Array.isArray(live?.conditions)
          ? live.conditions.map(safeText).filter(Boolean).slice(0, 30).map((condition) => condition.slice(0, 80))
          : [],
        initiative: safeText(live?.initiative).slice(0, 30),
        hiddenFromInitiative: live?.hiddenFromInitiative === true,
        standNumber: safeText(live?.standNumber).slice(0, 30),
        isFlying: live?.isFlying === true,
        flyingHeight: clampLiveNumber(live?.flyingHeight),
        mapTokenSize: safeText(live?.mapTokenSize).slice(0, 40)
      };
    }
  }
  return result;
}

function sanitizeCombatMeta(value, room) {
  const source = value && typeof value === "object" ? value : {};
  const validKeys = new Set();
  for (const player of room.players) {
    for (const award of player.roster || []) validKeys.add(`${player.id}:${safeText(award?.monster?.id)}`);
  }
  const activeMonsterKey = safeText(source.activeMonsterKey).slice(0, 260);
  return {
    active: source.active === true,
    round: Math.max(1, Math.min(99999, Math.floor(Number(source.round) || 1))),
    activeMonsterKey: validKeys.has(activeMonsterKey) ? activeMonsterKey : ""
  };
}

function sanitizeDiceRoll(value, actor) {
  const source = value && typeof value === "object" ? value : {};
  const serializedGroups = JSON.stringify(Array.isArray(source.groups) ? source.groups : []);
  let groups = [];
  if (serializedGroups.length <= 100000) {
    try { groups = JSON.parse(serializedGroups).slice(0, 100); } catch {}
  }
  const id = safeText(source.id).slice(0, 160);
  if (!id) throw Object.assign(new Error("Dice roll id is required."), { code: "invalid_dice_roll" });
  return {
    id,
    formula: safeText(source.formula).slice(0, 240),
    total: Number.isFinite(Number(source.total)) ? Number(source.total) : 0,
    groups,
    hitDiceMode: source.hitDiceMode === true,
    rollMode: ["advantage", "disadvantage"].includes(source.rollMode) ? source.rollMode : "",
    criticalOutcome: ["critical", "fumble", "doubleCritical", "doubleFumble"].includes(source.criticalOutcome) ? source.criticalOutcome : "",
    rolledAt: Math.max(0, Number(source.rolledAt) || Date.now()),
    userId: safeText(actor.userId).slice(0, 160),
    userName: safeText(actor.userName || actor.name).slice(0, 80) || "Jugador",
    targetKind: ["attack", "damage"].includes(source.targetKind) ? source.targetKind : "",
    targetCombatantId: safeText(source.targetCombatantId).slice(0, 160),
    targetName: safeText(source.targetName).slice(0, 160),
    targetStand: safeText(source.targetStand).slice(0, 30),
    targetArmorClass: Number.isFinite(Number(source.targetArmorClass)) ? Number(source.targetArmorClass) : null,
    targetHit: source.targetHit === true ? true : source.targetHit === false ? false : null,
    appliedDamage: Number.isFinite(Number(source.appliedDamage)) ? Math.max(0, Number(source.appliedDamage)) : null,
    targetCriticalDamage: source.targetCriticalDamage === true,
    targetHalfDamage: source.targetHalfDamage === true,
    targetNecroticDamage: source.targetNecroticDamage === true,
    contextKind: source.contextKind === "concentration" ? "concentration" : "",
    concentrationOutcome: ["maintains", "loses"].includes(source.concentrationOutcome) ? source.concentrationOutcome : "",
    concentrationName: safeText(source.concentrationName).slice(0, 100),
    concentrationDc: Math.max(0, Number(source.concentrationDc) || 0)
  };
}

function clampLiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(999999, number)) : 0;
}

function sanitizeMapProjection(value, room) {
  if (!value || typeof value !== "object" || value.open !== true) {
    return { open: false, editorState: null, combatants: [], activeCombatantId: "" };
  }

  let editorState = null;
  try {
    const serialized = JSON.stringify(value.editorState && typeof value.editorState === "object" ? value.editorState : {});
    if (serialized.length > 2_000_000) {
      throw Object.assign(new Error("Map projection is too large."), { code: "map_projection_too_large" });
    }
    editorState = JSON.parse(serialized);
  } catch (error) {
    if (error?.code) throw error;
    throw Object.assign(new Error("Map projection is invalid."), { code: "invalid_map_projection" });
  }

  editorState.savedMapLayouts = [];
  editorState.map = sanitizeProjectedMap(editorState.map, room.id);
  const combatants = (Array.isArray(value.combatants) ? value.combatants : []).slice(0, 300).map((entry) => ({
    id: safeText(entry?.id).slice(0, 120),
    side: ["allies", "enemies", "neutral"].includes(entry?.side) ? entry.side : "enemies",
    tag: safeText(entry?.tag).slice(0, 30),
    nombre: safeText(entry?.nombre).slice(0, 160),
    numPeana: safeText(entry?.numPeana).slice(0, 30),
    pgMax: clampLiveNumber(entry?.pgMax),
    pgAct: clampLiveNumber(entry?.pgAct),
    pgTemp: clampLiveNumber(entry?.pgTemp),
    necrotic: clampLiveNumber(entry?.necrotic),
    acValue: clampLiveNumber(entry?.acValue),
    condiciones: safeText(entry?.condiciones).slice(0, 600),
    hiddenFromInitiative: entry?.hiddenFromInitiative === true,
    iniactiva: Number.isFinite(Number(entry?.iniactiva)) ? Number(entry.iniactiva) : "",
    tokenUrl: sanitizeProjectedUrl(entry?.tokenUrl, room.id),
    tamano: safeText(entry?.tamano).slice(0, 40),
    movimiento: safeText(entry?.movimiento).slice(0, 120),
    isFlying: entry?.isFlying === true,
    flyingHeight: clampLiveNumber(entry?.flyingHeight),
    teamId: safeText(entry?.teamId).slice(0, 120),
    teamOwnerUserId: safeText(entry?.teamOwnerUserId).slice(0, 120),
    teamColor: /^#[0-9a-f]{6}$/i.test(safeText(entry?.teamColor)) ? safeText(entry.teamColor).toLowerCase() : "",
    multiplayerMonsterId: safeText(entry?.multiplayerMonsterId).slice(0, 160)
  })).filter((entry) => entry.id);
  const validIds = new Set(combatants.map((entry) => entry.id));
  const activeCombatantId = safeText(value.activeCombatantId);

  return {
    open: true,
    editorState,
    combatants,
    activeCombatantId: validIds.has(activeCombatantId) ? activeCombatantId : ""
  };
}

function sanitizeProjectedMap(value, roomId) {
  if (!value || typeof value !== "object") return null;
  const imageUrl = sanitizeProjectedUrl(value.imageUrl, roomId);
  const cloudEntryId = safeText(value.cloudEntryId).slice(0, 120);
  if (!imageUrl && !cloudEntryId) return null;
  return {
    name: safeText(value.name).slice(0, 160) || "Mapa",
    imageUrl,
    width: Math.max(1, Math.min(8192, Math.round(Number(value.width) || 1600))),
    height: Math.max(1, Math.min(8192, Math.round(Number(value.height) || 900))),
    cloudEntryId,
    isPrivate: false,
    isAnimated: value.isAnimated === true
  };
}

function sanitizeProjectedUrl(value, roomId) {
  const url = String(value ?? "").trim().slice(0, 1200);
  if (!url || /^(?:data|blob|javascript):/i.test(url)) return "";
  if (/^https:\/\//i.test(url) || /^\/images\//i.test(url) || /^\/data\//i.test(url) || /^\/api\/assets\/[a-z0-9-]+$/i.test(url)) return url;
  const roomAssetPrefix = `/api/multiplayer/rooms/${encodeURIComponent(roomId)}/assets/`;
  return url.startsWith(roomAssetPrefix) && /^[a-z0-9-]+$/i.test(url.slice(roomAssetPrefix.length)) ? url : "";
}
