const connections = new Map();

export function startMonstersLeagueCombatSync(getCombatants, getMapProjection = null, options = {}) {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return () => {};

  const sync = () => {
    const grouped = groupCombatantsByRoom(typeof getCombatants === "function" ? getCombatants() : []);

    for (const [roomId, combatState] of grouped) {
      let connection = connections.get(roomId);
      if (!connection) {
        connection = createRoomConnection(roomId, options.onRoomSnapshot);
        connections.set(roomId, connection);
      }
      connection.publish({
        combatState,
        combatMeta: typeof options.getCombatMeta === "function" ? options.getCombatMeta(roomId) : null,
        mapProjection: typeof getMapProjection === "function" ? getMapProjection(roomId) : undefined
      });
    }

    for (const [roomId, connection] of connections) {
      if (!grouped.has(roomId)) {
        connection.close();
        connections.delete(roomId);
      }
    }
  };

  const interval = window.setInterval(sync, 200);
  sync();
  return () => {
    window.clearInterval(interval);
    for (const connection of connections.values()) connection.close();
    connections.clear();
  };
}

export function publishMonstersLeagueDiceRoll(roomId, roll) {
  const connection = connections.get(clean(roomId));
  if (!connection) return false;
  connection.publishDiceRoll(roll);
  return true;
}

export function publishMonstersLeagueCombatDamage(roomId, command) {
  const connection = connections.get(clean(roomId));
  if (!connection) return false;
  connection.publishCommand({ type: "combat-damage", ...command });
  return true;
}

export function groupCombatantsByRoom(combatants) {
  const rooms = new Map();

  for (const combatant of Array.isArray(combatants) ? combatants : []) {
    const roomId = clean(combatant?.multiplayerRoomId);
    const teamId = clean(combatant?.teamId);
    const monsterId = clean(combatant?.multiplayerMonsterId || combatant?.entryId || combatant?.entryKey);
    if (!combatant?.multiplayerOnline || !roomId || !teamId || !monsterId) continue;

    if (!rooms.has(roomId)) rooms.set(roomId, {});
    const room = rooms.get(roomId);
    if (!room[teamId]) room[teamId] = {};
    room[teamId][monsterId] = {
      maxHp: nonNegative(combatant.pgMax),
      currentHp: nonNegative(combatant.pgAct),
      tempHp: nonNegative(combatant.pgTemp),
      necrotic: nonNegative(combatant.necrotic),
      conditions: clean(combatant.condiciones).split(/[,;|]/).map(clean).filter(Boolean),
      initiative: clean(combatant.iniactiva),
      hiddenFromInitiative: combatant.hiddenFromInitiative === true,
      standNumber: clean(combatant.numPeana),
      isFlying: combatant.isFlying === true,
      flyingHeight: nonNegative(combatant.flyingHeight),
      mapTokenSize: clean(combatant.mapTokenSize)
    };
  }

  return rooms;
}

function createRoomConnection(roomId, onRoomSnapshot) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/api/multiplayer/rooms/${encodeURIComponent(roomId)}/socket`;
  let socket = null;
  let retryTimer = 0;
  let sendRetryTimer = 0;
  let retry = 0;
  let closed = false;
  let pending = null;
  let lastSent = "";
  let inflight = null;
  let snapshotReceived = false;
  let combatRevision = 0;
  const commandQueue = [];

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      retry = 0;
      inflight = null;
    });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message?.type === "ack" && inflight?.commandId === message.commandId) {
        if (inflight.kind === "combat") lastSent = inflight.serialized;
        if (inflight.kind === "queued") commandQueue.shift();
        inflight = null;
        flush();
      } else if (message?.type === "error" && inflight?.commandId === message.commandId) {
        if (inflight.kind === "queued") commandQueue.shift();
        inflight = null;
        window.clearTimeout(sendRetryTimer);
        sendRetryTimer = window.setTimeout(flush, 800);
      } else if (message?.type === "snapshot" && message.room) {
        snapshotReceived = true;
        combatRevision = Math.max(0, Math.floor(Number(message.room.combatRevision) || 0));
        if (typeof onRoomSnapshot === "function") onRoomSnapshot(message.room);
        pending = null;
        flush();
      }
    });
    socket.addEventListener("close", () => {
      if (closed) return;
      inflight = null;
      retryTimer = window.setTimeout(connect, Math.min(10000, 500 * 2 ** retry++));
    });
  };

  const flush = () => {
    if (!snapshotReceived || inflight || socket?.readyState !== WebSocket.OPEN) return;
    if (commandQueue.length > 0) {
      const queued = commandQueue[0];
      const commandId = crypto.randomUUID();
      socket.send(JSON.stringify({ ...queued, commandId }));
      inflight = { commandId, kind: "queued" };
      return;
    }
    if (!pending) return;
    const serialized = JSON.stringify(pending);
    if (serialized === lastSent) return;
    const commandId = crypto.randomUUID();
    const command = {
      type: "combat-update",
      commandId,
      combatState: pending.combatState,
      combatMeta: pending.combatMeta,
      baseCombatRevision: combatRevision
    };
    if (pending.mapProjection !== undefined) command.mapProjection = pending.mapProjection;
    socket.send(JSON.stringify(command));
    inflight = { commandId, serialized, kind: "combat" };
  };

  connect();
  return {
    publish(combatState) {
      pending = combatState;
      flush();
    },
    publishDiceRoll(roll) {
      commandQueue.push({ type: "dice-roll", roll });
      flush();
    },
    publishCommand(command) {
      commandQueue.push(command);
      flush();
    },
    close() {
      closed = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(sendRetryTimer);
      socket?.close(1000, "combat sync ended");
    }
  };
}

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function clean(value) {
  return String(value ?? "").trim();
}
