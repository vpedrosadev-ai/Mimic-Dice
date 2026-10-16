const connections = new Map();

export function startMonstersLeagueCombatSync(getCombatants, getMapProjection = null) {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return () => {};

  const sync = () => {
    const grouped = groupCombatantsByRoom(typeof getCombatants === "function" ? getCombatants() : []);

    for (const [roomId, combatState] of grouped) {
      let connection = connections.get(roomId);
      if (!connection) {
        connection = createRoomConnection(roomId);
        connections.set(roomId, connection);
      }
      connection.publish({
        combatState,
        mapProjection: typeof getMapProjection === "function" ? getMapProjection(roomId) : null
      });
    }

    for (const [roomId, connection] of connections) {
      if (!grouped.has(roomId)) {
        connection.close();
        connections.delete(roomId);
      }
    }
  };

  const interval = window.setInterval(sync, 600);
  sync();
  return () => {
    window.clearInterval(interval);
    for (const connection of connections.values()) connection.close();
    connections.clear();
  };
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
      conditions: clean(combatant.condiciones).split(/[,;|]/).map(clean).filter(Boolean)
    };
  }

  return rooms;
}

function createRoomConnection(roomId) {
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

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      retry = 0;
      inflight = null;
      flush();
    });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message?.type === "ack" && inflight?.commandId === message.commandId) {
        lastSent = inflight.serialized;
        inflight = null;
        flush();
      } else if (message?.type === "error" && inflight?.commandId === message.commandId) {
        inflight = null;
        window.clearTimeout(sendRetryTimer);
        sendRetryTimer = window.setTimeout(flush, 800);
      }
    });
    socket.addEventListener("close", () => {
      if (closed) return;
      inflight = null;
      retryTimer = window.setTimeout(connect, Math.min(10000, 500 * 2 ** retry++));
    });
  };

  const flush = () => {
    if (!pending || inflight || socket?.readyState !== WebSocket.OPEN) return;
    const serialized = JSON.stringify(pending);
    if (serialized === lastSent) return;
    const commandId = crypto.randomUUID();
    socket.send(JSON.stringify({
      type: "combat-update",
      commandId,
      combatState: pending.combatState,
      mapProjection: pending.mapProjection
    }));
    inflight = { commandId, serialized };
  };

  connect();
  return {
    publish(combatState) {
      pending = combatState;
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
