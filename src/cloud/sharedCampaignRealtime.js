export function connectSharedCampaignRealtime(campaignId, options = {}) {
  if (typeof window === "undefined" || typeof WebSocket === "undefined" || !campaignId) {
    return { close() {} };
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/api/campaigns/${encodeURIComponent(campaignId)}/socket`;
  let socket = null;
  let reconnectTimer = 0;
  let pingTimer = 0;
  let retry = 0;
  let closed = false;
  const queuedSections = new Map();
  const inFlightSections = new Map();
  const deferredSections = new Map();

  const setStatus = (status) => {
    if (typeof options.onStatus === "function") options.onStatus(status);
  };

  const connect = () => {
    if (closed) return;
    setStatus(retry > 0 ? "reconnecting" : "connecting");
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      retry = 0;
      setStatus("connected");
      for (const section of queuedSections.keys()) sendNextSection(section);
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
      }, 25_000);
    });
    socket.addEventListener("message", (event) => {
      let message = null;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message?.type === "revision" && typeof options.onRevision === "function") {
        options.onRevision(message);
      } else if (message?.type === "presence" && typeof options.onPresence === "function") {
        options.onPresence(Math.max(0, Math.floor(Number(message.userCount) || 0)), message);
      } else if (message?.type === "closed") {
        options.onClosed?.();
      } else if (message?.type === "combat-section") {
        if (inFlightSections.has(message.section)) {
          const deferred = deferredSections.get(message.section);
          if (!deferred || Number(message.sequence) > Number(deferred.sequence)) {
            deferredSections.set(message.section, message);
          }
        } else {
          options.onCombatSection?.(message);
        }
      } else if (message?.type === "combat-event") {
        options.onCombatEvent?.(message.event);
      } else if (message?.type === "combat-section-ack") {
        const active = inFlightSections.get(message.section);
        if (active?.commandId === message.commandId) {
          inFlightSections.delete(message.section);
          const deferred = deferredSections.get(message.section);
          deferredSections.delete(message.section);
          if (deferred && Number(deferred.sequence) > Number(message.sequence)) {
            options.onCombatSection?.(deferred);
          }
          sendNextSection(message.section);
        }
        options.onCombatSectionAck?.(message);
      } else if (message?.type === "join-request") {
        options.onJoinRequest?.(message.request);
      } else if (message?.type === "join-resolution") {
        options.onJoinResolution?.(message.request);
      }
    });
    socket.addEventListener("close", () => {
      window.clearInterval(pingTimer);
      pingTimer = 0;
      if (closed) return;
      for (const [section, command] of inFlightSections) {
        if (!queuedSections.has(section)) queuedSections.set(section, command);
      }
      inFlightSections.clear();
      deferredSections.clear();
      setStatus("reconnecting");
      reconnectTimer = window.setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++));
    });
    socket.addEventListener("error", () => setStatus("reconnecting"));
  };

  const sendNextSection = (section) => {
    if (socket?.readyState !== WebSocket.OPEN || inFlightSections.has(section)) return false;
    const command = queuedSections.get(section);
    if (!command) return false;
    queuedSections.delete(section);
    inFlightSections.set(section, command);
    socket.send(JSON.stringify(command));
    return true;
  };

  connect();
  return {
    publishCombatSection(section, value, operation = "replace") {
      if (!['tracker', 'map'].includes(section)) return false;
      const command = {
        type: "combat-section",
        section,
        operation,
        value,
        commandId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
      };
      queuedSections.set(section, command);
      return sendNextSection(section);
    },
    publishCombatEvent(event) {
      if (socket?.readyState !== WebSocket.OPEN || !event || typeof event !== "object") return false;
      socket.send(JSON.stringify({ type: "combat-event", event }));
      return true;
    },
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(pingTimer);
      socket?.close(1000, "Campaign changed");
      setStatus("closed");
    }
  };
}
