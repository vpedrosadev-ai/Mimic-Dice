export async function createMonstersLeagueOnlineRoom({ name, language }) {
  const response = await fetch("/api/multiplayer/rooms", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, language })
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || "No se pudo crear el lobby multijugador.");
  }

  return body;
}

export async function finalizeMonstersLeagueOnlineRoom(roomId) {
  const response = await fetch(`/api/multiplayer/rooms/${encodeURIComponent(roomId)}/finalize`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || "No se pudo guardar la campaña del lobby.");
  }

  return body;
}

export function connectMonstersLeagueRoom(roomId, handlers = {}) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/api/multiplayer/rooms/${encodeURIComponent(roomId)}/socket`;
  let socket = null;
  let closed = false;
  let reconnectTimer = 0;
  let readyTimer = 0;
  let retry = 0;
  let initialResolve;
  let initialReject;
  const ready = new Promise((resolve, reject) => {
    initialResolve = resolve;
    initialReject = reject;
    readyTimer = window.setTimeout(() => {
      initialReject?.(new Error("No se pudo conectar con el lobby multijugador."));
      initialResolve = null;
      initialReject = null;
    }, 15000);
  });

  const connect = () => {
    if (closed) return;
    handlers.onStatus?.("connecting");
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      retry = 0;
      handlers.onStatus?.("connected");
    });

    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }

      if (message?.type === "snapshot" && message.room) {
        window.clearTimeout(readyTimer);
        handlers.onSnapshot?.(message.room);
        initialResolve?.(message.room);
        initialResolve = null;
        initialReject = null;
      } else if (message?.type === "error") {
        handlers.onError?.(new Error(message.message || "La orden multijugador fue rechazada."));
      }
    });

    socket.addEventListener("close", () => {
      if (closed) return;
      handlers.onStatus?.("reconnecting");
      const delay = Math.min(10000, 500 * 2 ** retry++);
      reconnectTimer = window.setTimeout(connect, delay);
    });

    socket.addEventListener("error", () => handlers.onStatus?.("reconnecting"));
  };

  connect();

  return {
    ready,
    send(type, payload = {}) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("La conexión con el lobby todavía no está disponible.");
      }
      socket.send(JSON.stringify({ ...payload, type, commandId: crypto.randomUUID() }));
    },
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      window.clearTimeout(readyTimer);
      socket?.close(1000, "page closed");
    }
  };
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
