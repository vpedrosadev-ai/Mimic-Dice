import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMapEditorState,
  getPortableMapReference,
  isImageFileLike,
  normalizeMapReference,
  snapTokenPosition
} from "../src/screens/combat-map/combatMap.js";

test("accepts image files created in a different window realm", () => {
  const popupFile = { name: "barco.jpg", type: "image/jpeg", arrayBuffer: async () => new ArrayBuffer(0) };
  const untypedDownloadedFile = { name: "cueva.JPEG", type: "", arrayBuffer: async () => new ArrayBuffer(0) };
  assert.equal(isImageFileLike(popupFile), true);
  assert.equal(isImageFileLike(untypedDownloadedFile), true);
  assert.equal(isImageFileLike({ name: "mapa.txt", type: "text/plain", arrayBuffer: async () => new ArrayBuffer(0) }), false);
});

test("square token snapping centers token in nearest cell", () => {
  assert.deepEqual(
    snapTokenPosition({ x: 141, y: 116 }, { type: "square", size: 80, offsetX: 10, offsetY: 0 }),
    { x: 130, y: 120 }
  );
});

test("hex token snapping uses staggered row centers", () => {
  const snapped = snapTokenPosition({ x: 130, y: 105 }, { type: "hex", size: 80, offsetX: 0, offsetY: 0 });
  assert.equal(snapped.x, 160);
  assert.ok(Math.abs(snapped.y - 115.47005383792516) < 0.000001);
});

test("map editor state clamps controls and rejects unsafe shapes", () => {
  const normalized = normalizeMapEditorState({
    openPanel: "grid",
    windowBounds: { width: 200, height: 5000, left: -80, top: 25 },
    viewport: { scrollLeft: 140, scrollTop: 75 },
    rotation: 91,
    grid: { type: "triangle", size: 1000 },
    healthMode: "invalid",
    fog: { brushSize: 1, revealed: [{ x: 5, y: 7, r: 2 }] }
  });

  assert.equal(normalized.rotation, 0);
  assert.equal(normalized.openPanel, "grid");
  assert.deepEqual(normalized.windowBounds, { width: 720, height: 2160, left: -80, top: 25 });
  assert.deepEqual(normalized.viewport, { scrollLeft: 140, scrollTop: 75 });
  assert.equal(normalized.grid.type, "square");
  assert.equal(normalized.grid.size, 240);
  assert.equal(normalized.healthMode, "all");
  assert.equal(normalized.fog.brushSize, 12);
  assert.deepEqual(normalized.fog.revealed[0], { x: 5, y: 7, r: 4 });
});

test("map editor keeps automatic popup positioning when bounds have no coordinates", () => {
  assert.deepEqual(normalizeMapEditorState({ windowBounds: { left: null, top: null } }).windowBounds, {
    width: 1500,
    height: 960,
    left: null,
    top: null
  });
});

test("map references retain only portable metadata", () => {
  assert.deepEqual(normalizeMapReference({
    name: "Dungeon",
    imageUrl: "/api/assets/123",
    width: 2048.4,
    height: 1024.2,
    cloudEntryId: "map-1",
    ignored: true
  }), {
    name: "Dungeon",
    imageUrl: "/api/assets/123",
    width: 2048,
    height: 1024,
    cloudEntryId: "map-1",
    isPrivate: false
  });
});

test("private map references omit asset URLs from portable saves", () => {
  assert.deepEqual(getPortableMapReference({
    name: "Secret lair",
    imageUrl: "/api/assets/private",
    width: 1200,
    height: 800,
    cloudEntryId: "private-map",
    isPrivate: true
  }), {
    name: "Secret lair",
    imageUrl: "",
    width: 1200,
    height: 800,
    cloudEntryId: "private-map",
    isPrivate: true
  });
});
