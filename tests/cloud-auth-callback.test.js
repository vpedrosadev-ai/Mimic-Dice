import assert from "node:assert/strict";
import test from "node:test";

import { beginGoogleAuth, resolveSameOriginAuthCallback } from "../src/cloud/cloudClient.js";

const ORIGIN = "https://mimicdice.tail8c7b68.ts.net";
const INVITE_URL = `${ORIGIN}/?view=monsters-league&room=room-1&mode=online&language=es`;

test("same-origin auth callback preserves a Monsters League invitation", () => {
  assert.equal(resolveSameOriginAuthCallback(INVITE_URL, ORIGIN), INVITE_URL);
  assert.equal(resolveSameOriginAuthCallback("https://example.com/steal", ORIGIN), "");
  assert.equal(resolveSameOriginAuthCallback("not a valid url", "not a valid origin"), "");
});

test("invited Google login authorizes registration and returns to the room", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const requests = [];
  let assignedUrl = "";
  globalThis.window = {
    location: {
      protocol: "https:",
      origin: ORIGIN,
      href: INVITE_URL,
      assign(url) { assignedUrl = url; }
    }
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (url === "/api/multiplayer/rooms/room-1/authorize-registration") {
      return Response.json({ authorized: true });
    }
    if (url === "/api/auth/csrf") {
      return Response.json({ csrfToken: "csrf-token" });
    }
    if (url === "/api/auth/signin/google") {
      return Response.json({ url: "https://accounts.google.com/example" });
    }
    return new Response(null, { status: 404 });
  };

  try {
    await beginGoogleAuth({ callbackUrl: INVITE_URL, registrationRoomId: "room-1" });
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests[0].url, "/api/multiplayer/rooms/room-1/authorize-registration");
  assert.equal(requests[0].options.method, "POST");
  const signInRequest = requests.find((request) => request.url === "/api/auth/signin/google");
  assert.equal(new URLSearchParams(signInRequest.options.body).get("callbackUrl"), INVITE_URL);
  assert.equal(assignedUrl, "https://accounts.google.com/example");
});
