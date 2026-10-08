const connections = new Map();

export function startMonstersLeagueCombatSync(getCombatants) {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return () => {};

  const sync = () => {
    const grouped = groupCombatantsByRoom(typeof getCombatants === "function" ? getCombatants() : []);

    for (const [roomId, combatState] of grouped) {
      let connection = connections.get(roomId);
      if (!connection) {
        connection = createRoomConnection(roomId);
        connections.set(roomId, connection);
      }
      connection.publish(combatState);
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

function groupCombatantsByRoom(combatants) {
  const rooms = new Map();

  for (const combatant of Array.isArray(combatants) ? combatants : []) {
    const roomId = clean(combatant?.multiplayerRoomId);
    const teamId = clean(combatant?.teamId);
    const monsterId = clean(combatant?.entryId || combatant?.entryKey);
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
  let retry = 0;
  let closed = false;
  let pending = null;
  let lastSent = "";

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      retry = 0;
      flush();
    });
    socket.addEventListener("close", () => {
      if (closed) return;
      retryTimer = window.setTimeout(connect, Math.min(10000, 500 * 2 ** retry++));
    });
  };

  const flush = () => {
    if (!pending || socket?.readyState !== WebSocket.OPEN) return;
    const serialized = JSON.stringify(pending);
    if (serialized === lastSent) return;
    socket.send(JSON.stringify({
      type: "combat-update",
      commandId: crypto.randomUUID(),
      combatState: pending
    }));
    lastSent = serialized;
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
