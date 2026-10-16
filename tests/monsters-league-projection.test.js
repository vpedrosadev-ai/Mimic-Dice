import assert from "node:assert/strict";
import test from "node:test";

import { rewriteMonstersLeagueAssetUrl } from "../src/multiplayer/monstersLeagueProjection.js";

test("projection asset URLs become root-relative for nested participant route", () => {
  assert.equal(
    rewriteMonstersLeagueAssetUrl("images/bestiary/tokens/mm-14/aboleth.webp", "ROOM1", "https://mimicdice.example"),
    "/images/bestiary/tokens/mm-14/aboleth.webp"
  );
});

test("private same-origin assets use authenticated room bridge", () => {
  assert.equal(
    rewriteMonstersLeagueAssetUrl("https://mimicdice.example/api/assets/asset-123", "ROOM 1", "https://mimicdice.example"),
    "/api/multiplayer/rooms/ROOM%201/assets/asset-123"
  );
});

test("projection rejects browser-local image URLs", () => {
  assert.equal(rewriteMonstersLeagueAssetUrl("blob:https://mimicdice.example/id", "ROOM1", "https://mimicdice.example"), "");
  assert.equal(rewriteMonstersLeagueAssetUrl("data:image/png;base64,abc", "ROOM1", "https://mimicdice.example"), "");
});
