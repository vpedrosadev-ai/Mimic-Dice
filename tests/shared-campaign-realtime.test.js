import test from "node:test";
import assert from "node:assert/strict";

import { connectSharedCampaignRealtime } from "../src/cloud/sharedCampaignRealtime.js";

test("shared combat sync keeps one command in flight and coalesces newer section state", () => {
  const previousWindow = globalThis.window;
  const previousWebSocket = globalThis.WebSocket;
  const sockets = [];

  class FakeWebSocket {
    static OPEN = 1;

    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.listeners = new Map();
      this.sent = [];
      sockets.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    emit(type, value = {}) {
      this.listeners.get(type)?.(value);
    }

    send(value) {
      this.sent.push(JSON.parse(value));
    }

    close() {
      this.readyState = 3;
    }
  }

  globalThis.window = {
    location: { protocol: "https:", host: "example.test" },
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  globalThis.WebSocket = FakeWebSocket;

  try {
    const received = [];
    const events = [];
    const presences = [];
    const connection = connectSharedCampaignRealtime("campaign-1", {
      onCombatSection: (message) => received.push(message),
      onCombatEvent: (event) => events.push(event),
      onPresence: (userCount, message) => presences.push({ userCount, message })
    });
    const socket = sockets[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.emit("open");
    socket.emit("message", { data: JSON.stringify({ type: "presence", userCount: 1, connectionCount: 2, sameAccountDeviceCount: 2, sameAccountOldest: true }) });
    assert.equal(presences[0].userCount, 1);
    assert.equal(presences[0].message.sameAccountDeviceCount, 2);
    assert.equal(presences[0].message.sameAccountOldest, true);
    connection.publishCombatEvent({ type: "round", round: 2 });
    assert.deepEqual(socket.sent.at(-1), { type: "combat-event", event: { type: "round", round: 2 } });
    socket.emit("message", { data: JSON.stringify({ type: "combat-event", event: { type: "turn", combatantId: "enemy-1" } }) });
    assert.deepEqual(events, [{ type: "turn", combatantId: "enemy-1" }]);

    connection.publishCombatSection("tracker", { revision: 1 });
    connection.publishCombatSection("tracker", { revision: 2 });
    connection.publishCombatSection("tracker", { revision: 3 });
    assert.equal(socket.sent.filter((entry) => entry.type === "combat-section").length, 1);
    assert.equal(socket.sent.at(-1).value.revision, 1);

    const first = socket.sent.at(-1);
    socket.emit("message", { data: JSON.stringify({ type: "combat-section", section: "tracker", sequence: 1, value: { remote: "older" } }) });
    assert.equal(received.length, 0);
    socket.emit("message", { data: JSON.stringify({ type: "combat-section-ack", section: "tracker", sequence: 2, commandId: first.commandId }) });

    const commands = socket.sent.filter((entry) => entry.type === "combat-section");
    assert.equal(commands.length, 2);
    assert.equal(commands[1].value.revision, 3);
    assert.equal(received.length, 0);

    socket.emit("message", { data: JSON.stringify({ type: "combat-section-ack", section: "tracker", sequence: 3, commandId: commands[1].commandId }) });
    socket.emit("message", { data: JSON.stringify({ type: "combat-section", section: "tracker", sequence: 4, value: { remote: "newer" } }) });
    assert.deepEqual(received.map((entry) => entry.value), [{ remote: "newer" }]);
    connection.close();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousWebSocket === undefined) delete globalThis.WebSocket;
    else globalThis.WebSocket = previousWebSocket;
  }
});
