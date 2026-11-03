import assert from "node:assert/strict";
import test from "node:test";

import { handleMultiplayerRoomRequest } from "../functions/_shared/multiplayer.js";
import { verifyRegistrationToken } from "../functions/_shared/invitation.js";

const ORIGIN = "https://mimicdice.tail8c7b68.ts.net";
const ROOM_ID = "active-room";
const AUTH_SECRET = "test-auth-secret";

function createContext(expiresAt) {
  return {
    request: new Request(`${ORIGIN}/api/multiplayer/rooms/${ROOM_ID}/authorize-registration`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: "{}"
    }),
    params: { path: [ROOM_ID, "authorize-registration"] },
    env: {
      AUTH_SECRET,
      MONSTERS_LEAGUE_ROOMS: {},
      DB: {
        prepare() {
          return {
            bind(roomId) {
              assert.equal(roomId, ROOM_ID);
              return { first: async () => expiresAt ? ({ id: ROOM_ID, expiresAt }) : null };
            }
          };
        }
      }
    }
  };
}

test("active multiplayer invitation authorizes an OAuth registration", async () => {
  const response = await handleMultiplayerRoomRequest(createContext(new Date(Date.now() + 60_000).toISOString()));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: true });
  const cookie = response.headers.get("Set-Cookie");
  assert.match(cookie, /^mimic_registration=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  const token = decodeURIComponent(cookie.match(/^mimic_registration=([^;]+)/)[1]);
  assert.equal(await verifyRegistrationToken(token, AUTH_SECRET), true);
});

test("expired multiplayer invitation cannot authorize registration", async () => {
  const response = await handleMultiplayerRoomRequest(createContext(new Date(Date.now() - 60_000).toISOString()));
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error, "room_not_found");
});
