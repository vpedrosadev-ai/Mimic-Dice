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
        options.onPresence(Math.max(0, Math.floor(Number(message.userCount) || 0)));
      } else if (message?.type === "closed") {
        options.onClosed?.();
      }
    });
    socket.addEventListener("close", () => {
      window.clearInterval(pingTimer);
      pingTimer = 0;
      if (closed) return;
      setStatus("reconnecting");
      reconnectTimer = window.setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++));
    });
    socket.addEventListener("error", () => setStatus("reconnecting"));
  };

  connect();
  return {
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(pingTimer);
      socket?.close(1000, "Campaign changed");
      setStatus("closed");
    }
  };
}
