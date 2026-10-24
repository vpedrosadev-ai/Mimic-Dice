import test from "node:test";
import assert from "node:assert/strict";

import {
  createCombatMapController,
  getAreaShapeMetrics,
  getGridCoordinateForPosition,
  getGridMovementDistanceFeet,
  getMapKeyboardPanDelta,
  getMapLayoutKey,
  getMovementSpeedFeet,
  hasInvisibleCondition,
  isMapTokenConcealed,
  isMapTokenVisibleToPlayer,
  getTokenFeedbackPosition,
  normalizeMapEditorState,
  getPortableMapReference,
  isImageFileLike,
  inspectImageFile,
  normalizeMapReference,
  resolveGridCoordinatePosition,
  snapCreaturePosition,
  snapTokenPosition
} from "../src/screens/combat-map/combatMap.js";

test("map campaign sync preserves each user's local view controls", () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value))
  };

  try {
    const controller = createCombatMapController({ storageKey: "shared-map-test" });
    controller.applySave({
      viewport: { zoom: 2, scrollLeft: 120, scrollTop: 80 },
      playerViewport: { zoom: 1.5, scrollLeft: 30, scrollTop: 40 },
      rotation: 90,
      initiative: { position: "left", size: 420, masterVisible: false, playerVisible: false }
    });
    controller.applySave({
      viewport: { zoom: 0.5, scrollLeft: 0, scrollTop: 0 },
      playerViewport: { zoom: 0.75, scrollLeft: 0, scrollTop: 0 },
      rotation: 270,
      initiative: { position: "right", size: 180, masterVisible: true, playerVisible: true }
    }, { preserveLocalView: true });

    const saved = controller.getSaveData();
    assert.equal(saved.viewport.zoom, 2);
    assert.equal(saved.playerViewport.zoom, 1.5);
    assert.equal(saved.rotation, 90);
    assert.equal(saved.initiative.masterVisible, false);
    assert.equal(saved.initiative.position, "left");
    assert.equal(saved.initiative.size, 420);
    assert.equal(saved.initiative.playerVisible, false);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("non-host campaign members can receive map sync but cannot replace map", () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  const notifications = [];
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value))
  };

  try {
    const controller = createCombatMapController({
      storageKey: "restricted-map-test",
      canLoadMap: () => false,
      onNotify: (...args) => notifications.push(args)
    });
    controller.applySave({ map: { name: "Host map", imageUrl: "/host.webp" } });
    assert.equal(controller.getMap().name, "Host map");
    assert.equal(controller.setMap({ name: "Member map", imageUrl: "/member.webp" }), false);
    assert.equal(controller.getMap().name, "Host map");
    assert.equal(notifications.length, 1);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("token feedback stays inside viewport and flips below tokens near top edge", () => {
  const bounds = { left: 100, top: 60, right: 900, bottom: 660 };
  const nearTop = getTokenFeedbackPosition({
    tokenCenterX: 125,
    tokenTop: 62,
    tokenBottom: 112,
    bubbleWidth: 220,
    bubbleHeight: 70,
    bounds
  });
  assert.equal(nearTop.below, true);
  assert.equal(nearTop.left, 108);
  assert.equal(nearTop.top, 126);
  assert.equal(nearTop.arrowX, 17);

  const nearRightBottom = getTokenFeedbackPosition({
    tokenCenterX: 890,
    tokenTop: 650,
    tokenBottom: 700,
    bubbleWidth: 240,
    bubbleHeight: 80,
    bounds
  });
  assert.equal(nearRightBottom.below, false);
  assert.equal(nearRightBottom.left, 652);
  assert.equal(nearRightBottom.top, 556);
  assert.equal(nearRightBottom.arrowX, 226);
});

test("map arrow keys pan consistently and Shift accelerates movement", () => {
  assert.deepEqual(getMapKeyboardPanDelta("ArrowLeft"), { left: -56, top: 0 });
  assert.deepEqual(getMapKeyboardPanDelta("ArrowDown", true), { left: 0, top: 168 });
  assert.equal(getMapKeyboardPanDelta("Enter"), null);
});

test("token movement reads feet from combatant speed and defaults unclear values to thirty", () => {
  assert.equal(getMovementSpeedFeet("30 ft., fly 60 ft."), 30);
  assert.equal(getMovementSpeedFeet("40 pies"), 40);
  assert.equal(getMovementSpeedFeet("varía"), 30);
  assert.equal(getMovementSpeedFeet("Especial (consulta rasgo 1)"), 30);
  assert.equal(getMovementSpeedFeet("0 ft."), 0);
});

test("token movement counts every square or hex step as five feet", () => {
  const square = { type: "square", size: 80, offsetX: 0, offsetY: 0 };
  assert.equal(getGridMovementDistanceFeet({ x: 40, y: 40 }, { x: 280, y: 200 }, square), 15);
  const hex = { type: "hex", size: 80, offsetX: 0, offsetY: 0 };
  const start = snapTokenPosition({ x: 40, y: 45 }, hex);
  const adjacent = snapTokenPosition({ x: 120, y: 45 }, hex);
  assert.equal(getGridMovementDistanceFeet(start, adjacent, hex), 5);
});

test("map zoom reaches 500 percent and player notifications default off", () => {
  const defaults = normalizeMapEditorState({});
  const enlarged = normalizeMapEditorState({ viewport: { zoom: 99 } });
  assert.equal(defaults.playerNotifications.visible, false);
  assert.equal(defaults.showTokenNumbers, true);
  assert.equal(defaults.healthInInitiative, true);
  assert.equal(defaults.initiative.showValue, true);
  assert.equal(defaults.initiative.statusIconSize, 36);
  assert.equal(normalizeMapEditorState({ showTokenNumbers: false }).showTokenNumbers, false);
  assert.equal(normalizeMapEditorState({ healthInInitiative: false }).healthInInitiative, false);
  assert.equal(normalizeMapEditorState({ initiative: { showValue: false, statusIconSize: 58 } }).initiative.showValue, false);
  assert.equal(normalizeMapEditorState({ initiative: { showValue: false, statusIconSize: 58 } }).initiative.statusIconSize, 58);
  assert.equal(enlarged.viewport.zoom, 5);
});

test("invisible tokens follow Hide visibility except allied tokens remain visible to players", () => {
  const invisibleEnemy = { tag: "ENEMIGO", condiciones: "Invisible" };
  const hiddenEnemy = { tag: "ENEMIGO", hiddenFromInitiative: true };
  const invisibleAlly = { tag: "ALIADO", condiciones: "Paralizado, invisible" };
  const hiddenAlly = { tag: "ALIADO", hiddenFromInitiative: true };

  assert.equal(hasInvisibleCondition(invisibleEnemy), true);
  assert.equal(isMapTokenConcealed(invisibleEnemy), true);
  assert.equal(isMapTokenVisibleToPlayer(invisibleEnemy), false);
  assert.equal(isMapTokenVisibleToPlayer(hiddenEnemy), false);
  assert.equal(isMapTokenVisibleToPlayer(invisibleAlly), true);
  assert.equal(isMapTokenVisibleToPlayer(hiddenAlly), true);
});

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
    playerNotifications: { visible: false, scale: 9 },
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
  assert.deepEqual(normalized.playerNotifications, { visible: false, scale: 1.25 });
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

test("straight line shapes use configured length and width in feet", () => {
  assert.deepEqual(getAreaShapeMetrics({ type: "line", distanceFeet: 30, widthFeet: 10 }, { size: 48 }), {
    type: "line",
    distanceFeet: 30,
    cells: 6,
    distancePx: 288,
    width: 288,
    height: 96,
    widthFeet: 10
  });
  const line = normalizeMapEditorState({
    shapes: {
      type: "line",
      widthFeet: 15,
      items: [{ id: "line-1", type: "line", distanceFeet: 40, widthFeet: 10, x: 20, y: 30 }]
    }
  }).shapes;
  assert.equal(line.type, "line");
  assert.equal(line.widthFeet, 15);
  assert.equal(line.items[0].widthFeet, 10);
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

test("expanded monochrome paint icons survive state normalization", () => {
  const normalized = normalizeMapEditorState({
    paint: {
      mode: "icon",
      icon: "⚡",
      strokes: [{ mode: "icon", icon: "♨", points: [{ x: 12, y: 18 }] }]
    }
  });

  assert.equal(normalized.paint.icon, "⚡");
  assert.equal(normalized.paint.strokes[0].icon, "♨");
});

test("map editor keeps automatic popup positioning when bounds have no coordinates", () => {
  assert.deepEqual(normalizeMapEditorState({ windowBounds: { left: null, top: null } }).windowBounds, {
    width: 1500,
    height: 960,
    left: null,
    top: null
  });
});

test("map editor keeps initiative visibility separate for master and player windows", () => {
  const migrated = normalizeMapEditorState({ initiative: { visible: true } });
  assert.equal(migrated.initiative.masterVisible, true);
  assert.equal(migrated.initiative.playerVisible, true);

  const normalized = normalizeMapEditorState({
    initiative: { visible: true, masterVisible: false, playerVisible: true }
  });
  assert.equal(normalized.initiative.masterVisible, false);
  assert.equal(normalized.initiative.playerVisible, true);
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

test("associated map references preserve variants and hide private asset URLs in portable saves", () => {
  const normalized = normalizeMapReference({
    name: "Summer",
    imageUrl: "/api/assets/summer",
    width: 1600,
    height: 900,
    cloudEntryId: "map-summer",
    associatedMaps: [{
      name: "Winter",
      imageUrl: "/api/assets/winter",
      width: 3200,
      height: 1800,
      cloudEntryId: "map-winter",
      isPrivate: true
    }]
  });
  assert.equal(normalized.associatedMaps[0].cloudEntryId, "map-winter");
  assert.equal(getPortableMapReference(normalized).associatedMaps[0].imageUrl, "");
});
