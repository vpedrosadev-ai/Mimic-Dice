import test from "node:test";
import assert from "node:assert/strict";

import {
  getAreaShapeMetrics,
  getGridCoordinateForPosition,
  getMapLayoutKey,
  normalizeMapEditorState,
  getPortableMapReference,
  isImageFileLike,
  inspectImageFile,
  normalizeMapReference,
  resolveGridCoordinatePosition,
  snapCreaturePosition,
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

test("large creature snapping uses square intersections and hex vertices", () => {
  assert.deepEqual(
    snapCreaturePosition({ x: 141, y: 116 }, { type: "square", size: 80, offsetX: 10, offsetY: 0 }, 2),
    { x: 170, y: 80 }
  );
  const hex = snapCreaturePosition({ x: 42, y: 5 }, { type: "hex", size: 80, offsetX: 0, offsetY: 0 }, 2);
  assert.ok(Math.abs(hex.x - 40) < 0.000001);
  assert.ok(Math.abs(hex.y) < 0.000001);
});

test("map editor state clamps controls and rejects unsafe shapes", () => {
  const normalized = normalizeMapEditorState({
    openPanel: "grid",
    windowBounds: { width: 200, height: 5000, left: -80, top: 25 },
    viewport: { scrollLeft: 140, scrollTop: 75 },
    rotation: 91,
    rotationOrientation: "with-map",
    grid: { type: "triangle", size: 1000 },
    healthMode: "invalid",
    fog: { brushSize: 1, revealed: [{ x: 5, y: 7, r: 2 }] },
    paint: { color: "red; background:url(x)", size: 999, strokes: [{ color: "#00ff88", size: 0, points: [{ x: 4, y: 9 }] }] },
    shapes: { type: "triangle", color: "invalid", distanceFeet: 13, items: [{ id: "area-1", type: "cone", color: "#112233", distanceFeet: 22, x: 120, y: 80, rotation: -15 }] }
  });

  assert.equal(normalized.rotation, 0);
  assert.equal(normalized.rotationOrientation, "with-map");
  assert.equal(normalized.openPanel, "grid");
  assert.deepEqual(normalized.windowBounds, { width: 720, height: 2160, left: -80, top: 25 });
  assert.deepEqual(normalized.viewport, { scrollLeft: 140, scrollTop: 75, zoom: 1 });
  assert.equal(normalized.grid.type, "square");
  assert.equal(normalized.grid.size, 240);
  assert.equal(normalized.grid.color, "#ffffff");
  assert.equal(normalized.healthMode, "all");
  assert.equal(normalized.fog.brushSize, 12);
  assert.deepEqual(normalized.fog.revealed[0], { type: "circle", x: 5, y: 7, r: 4 });
  assert.equal(normalized.paint.color, "#ef4444");
  assert.equal(normalized.paint.size, 120);
  assert.deepEqual(normalized.paint.strokes[0], { color: "#00ff88", size: 12, mode: "paint", points: [{ x: 4, y: 9 }] });
  assert.equal(normalized.shapes.type, "circle");
  assert.equal(normalized.shapes.distanceFeet, 15);
  assert.deepEqual(normalized.shapes.items[0], { id: "area-1", type: "cone", color: "#112233", distanceFeet: 20, x: 120, y: 80, rotation: 345 });
});

test("map editor preserves token stacking order for shared cells", () => {
  const normalized = normalizeMapEditorState({
    tokenPositions: {
      first: { x: 120, y: 120 },
      last: { x: 120, y: 120 }
    },
    tokenStackOrder: ["first", "last", "first", ""]
  });

  assert.deepEqual(normalized.tokenPositions.first, normalized.tokenPositions.last);
  assert.deepEqual(normalized.tokenStackOrder, ["first", "last"]);
});

test("area shapes use one grid cell for every five feet", () => {
  assert.deepEqual(getAreaShapeMetrics({ type: "circle", distanceFeet: 15 }, { size: 80 }), {
    type: "circle",
    distanceFeet: 15,
    cells: 3,
    distancePx: 240,
    width: 480,
    height: 480
  });
  assert.deepEqual(getAreaShapeMetrics({ type: "square", distanceFeet: 15 }, { size: 80 }), {
    type: "square",
    distanceFeet: 15,
    cells: 3,
    distancePx: 240,
    width: 240,
    height: 240
  });
  assert.deepEqual(getAreaShapeMetrics({ type: "cone", distanceFeet: 30 }, { size: 48 }), {
    type: "cone",
    distanceFeet: 30,
    cells: 6,
    distancePx: 288,
    width: 288,
    height: 288
  });
});

test("grid coordinates resolve to the same square and hex cell centers shown on the map", () => {
  assert.deepEqual(
    resolveGridCoordinatePosition(" b 2 ", { type: "square", size: 80, offsetX: 10, offsetY: 0 }, 300, 300),
    { x: 130, y: 120, coordinate: "B2" }
  );
  const hex = resolveGridCoordinatePosition("B1", { type: "hex", size: 80, offsetX: 0, offsetY: 0 }, 300, 300);
  assert.equal(hex.x, 40);
  assert.ok(Math.abs(hex.y - 46.188021535170066) < 0.000001);
  assert.equal(resolveGridCoordinatePosition("Z99", { type: "square", size: 80 }, 300, 300), null);
});

test("token positions are converted back to editable grid coordinates", () => {
  assert.equal(getGridCoordinateForPosition(
    { x: 130, y: 120 },
    { type: "square", size: 80, offsetX: 10, offsetY: 0 },
    300,
    300
  ), "B2");
  const hexGrid = { type: "hex", size: 80, offsetX: 0, offsetY: 0 };
  const hexPoint = resolveGridCoordinatePosition("B1", hexGrid, 300, 300);
  assert.equal(getGridCoordinateForPosition(hexPoint, hexGrid, 300, 300), "B1");
});

test("animated WebP files are detected from bytes instead of the declared MIME type", async () => {
  const bytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    0x41, 0x4e, 0x49, 0x4d, 0, 0, 0, 0
  ]);
  const inspected = await inspectImageFile({
    name: "mapa.jpg",
    type: "image/jpeg",
    arrayBuffer: async () => bytes.buffer
  });
  assert.equal(inspected.isWebp, true);
  assert.equal(inspected.isAnimated, true);
  assert.equal(inspected.mimeType, "image/webp");
});

test("text annotations retain their visual properties", () => {
  const shape = normalizeMapEditorState({
    shapes: { items: [{ id: "note", type: "text", text: "Entrada", textBoxVisible: false, textBoxColor: "#123456", textColor: "#abcdef", fontSize: 48, x: -40, y: 90 }] }
  }).shapes.items[0];
  assert.deepEqual(shape, {
    id: "note", type: "text", color: "#f97316", distanceFeet: 15, x: -40, y: 90, rotation: 0,
    text: "Entrada", textBoxVisible: false, textBoxColor: "#123456", textColor: "#abcdef", fontSize: 48
  });
});

test("map layout keys identify cloud entries and local image contents", () => {
  assert.equal(getMapLayoutKey({ name: "Mapa", imageUrl: "/asset", cloudEntryId: "map-7" }), "cloud:map-7");
  assert.equal(
    getMapLayoutKey({ name: "Local", imageUrl: "data:image/webp;base64,abc", width: 10, height: 20 }),
    getMapLayoutKey({ name: "Local", imageUrl: "data:image/webp;base64,abc", width: 10, height: 20 })
  );
});

test("eraser strokes and per-map layouts survive state normalization", () => {
  const normalized = normalizeMapEditorState({
    paint: { mode: "erase", strokes: [{ mode: "erase", color: "#ffffff", size: 20, points: [{ x: 2, y: 3 }] }] },
    savedMapLayouts: [{
      map: { name: "Anterior", imageUrl: "/old.webp", width: 800, height: 600 },
      state: { rotation: 90, shapes: { coordinate: " a8 " } }
    }]
  });
  assert.equal(normalized.paint.mode, "erase");
  assert.equal(normalized.paint.strokes[0].mode, "erase");
  assert.equal(normalized.savedMapLayouts[0].state.rotation, 90);
  assert.equal(normalized.savedMapLayouts[0].state.shapes.coordinate, "A8");
});

test("line and icon paint strokes retain their settings", () => {
  const normalized = normalizeMapEditorState({
    opacity: { overall: .7, grid: .4, fog: 2 },
    paint: {
      mode: "icon",
      icon: "⭐",
      iconSize: 96,
      iconRotation: 405,
      strokes: [
        { mode: "line", color: "#112233", size: 8, points: [{ x: 1, y: 2 }, { x: 30, y: 40 }] },
        { mode: "icon", color: "#abcdef", size: 72, icon: "☠", rotation: -30, points: [{ x: 8, y: 9 }] }
      ]
    }
  });

  assert.deepEqual(normalized.opacity, {
    overall: .7, grid: .4, tokens: 1, fog: 1, paint: 1, shapes: 1, health: 1, initiative: 1
  });
  assert.equal(normalized.paint.iconRotation, 45);
  assert.deepEqual(normalized.paint.strokes[0].points, [{ x: 1, y: 2 }, { x: 30, y: 40 }]);
  const { id: iconId, ...iconStroke } = normalized.paint.strokes[1];
  assert.equal(iconId, "paint-icon-1");
  assert.deepEqual(iconStroke, {
    color: "#abcdef", size: 72, mode: "icon", points: [{ x: 8, y: 9 }], icon: "☠", rotation: 330
  });
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
