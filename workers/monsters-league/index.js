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
    server.send(JSON.stringify({ type: "snapshot", room: getMonstersLeagueRoomSummary(this.room) }));
    this.broadcastSnapshot(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    await this.ready;
    const attachment = socket.deserializeAttachment() || {};

    let command = {};
    try {
      command = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
      await this.applyCommand(command, attachment.playerId);
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

  async applyCommand(command, playerId) {
    const type = safeText(command?.type);
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
      if (playerId !== this.room.hostPlayerId || this.room.status !== "combat") {
        throw Object.assign(new Error("Only host can update live combat."), { code: "host_required" });
      }
      this.room.combatState = sanitizeCombatState(command.combatState, this.room);
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
    const payload = JSON.stringify({ type: "snapshot", room: getMonstersLeagueRoomSummary(this.room) });
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
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
          : []
      };
    }
  }
  return result;
}

function clampLiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(999999, number)) : 0;
}
