import {
  createCloudLibraryEntry,
  getCloudLibraryEntry,
  uploadCloudImage
} from "../../cloud/cloudClient.js";

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;
const MIN_GRID_SIZE = 24;
const MAX_GRID_SIZE = 240;
const MIN_PAINT_SIZE = 1;
const MAX_PAINT_SIZE = 120;
const MAX_PAINT_POINTS = 12000;
const MAX_AREA_SHAPES = 200;
const MAX_SAVED_MAP_LAYOUTS = 20;
const MIN_MAP_ZOOM = 0.25;
const MAX_MAP_ZOOM = 3;
const GRID_LABEL_GUTTER = 34;
const MAP_STORAGE_KEY = "mimic-dice:combat-map:v1";

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeColor(value, fallback = "#ef4444") {
  const color = clean(value).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizePoint(value) {
  return {
    x: Number(value?.x) || 0,
    y: Number(value?.y) || 0
  };
}

function normalizePaintStrokes(value) {
  if (!Array.isArray(value)) return [];
  let remainingPoints = MAX_PAINT_POINTS;
  const strokes = [];
  for (let index = value.length - 1; index >= 0 && remainingPoints > 0; index -= 1) {
    const stroke = value[index];
    if (!isObject(stroke) || !Array.isArray(stroke.points)) continue;
    const points = stroke.points.slice(-remainingPoints).map(normalizePoint);
    if (!points.length) continue;
    remainingPoints -= points.length;
    strokes.push({
      color: normalizeColor(stroke.color),
      size: clamp(stroke.size || 12, MIN_PAINT_SIZE, MAX_PAINT_SIZE),
      mode: stroke.mode === "erase" ? "erase" : "paint",
      points
    });
  }
  return strokes.reverse();
}

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getMapLayoutKey(value) {
  const map = normalizeMapReference(value);
  if (!map) return "";
  if (map.cloudEntryId) return `cloud:${map.cloudEntryId}`;
  return `image:${hashText(`${map.name}|${map.width}|${map.height}|${map.imageUrl}`)}`;
}

function normalizeSavedMapLayouts(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_SAVED_MAP_LAYOUTS).map((layout) => {
    const map = normalizeMapReference(layout?.map);
    if (!map) return null;
    const normalized = normalizeMapEditorState({ ...(isObject(layout?.state) ? layout.state : {}), map, savedMapLayouts: [] });
    const { map: normalizedMap, savedMapLayouts, windowBounds, openPanel, ...workspace } = normalized;
    return {
      key: clean(layout?.key) || getMapLayoutKey(map),
      map,
      state: workspace
    };
  }).filter(Boolean);
}

function columnLabelToIndex(label) {
  let value = 0;
  for (const character of String(label || "").toUpperCase()) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
}

function normalizeAreaShapes(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_AREA_SHAPES).map((shape, index) => ({
    id: clean(shape?.id) || `shape-${index + 1}`,
    type: ["circle", "square", "cone"].includes(shape?.type) ? shape.type : "circle",
    color: normalizeColor(shape?.color, "#f97316"),
    distanceFeet: clamp(Math.round((Number(shape?.distanceFeet) || 15) / 5) * 5, 5, 500),
    x: Number(shape?.x) || 0,
    y: Number(shape?.y) || 0,
    rotation: ((Number(shape?.rotation) || 0) % 360 + 360) % 360
  }));
}

export function getAreaShapeMetrics(shape, grid) {
  const type = ["circle", "square", "cone"].includes(shape?.type) ? shape.type : "circle";
  const distanceFeet = clamp(Math.round((Number(shape?.distanceFeet) || 5) / 5) * 5, 5, 500);
  const cells = distanceFeet / 5;
  const distancePx = cells * clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  const width = type === "circle" ? distancePx * 2 : distancePx;
  const height = type === "circle" ? distancePx * 2 : distancePx;
  return {
    type,
    distanceFeet,
    cells,
    distancePx,
    width,
    height
  };
}

const IMAGE_MIME_BY_EXTENSION = Object.freeze({
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp"
});

function getImageFileMimeType(file) {
  const declaredType = clean(file?.type).toLowerCase();
  if (declaredType.startsWith("image/")) return declaredType;
  const extension = clean(file?.name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  return IMAGE_MIME_BY_EXTENSION[extension] || "";
}

export function isImageFileLike(file) {
  return Boolean(file && typeof file.arrayBuffer === "function" && getImageFileMimeType(file));
}

function getHexMetrics(size) {
  const height = size * 2 / Math.sqrt(3);
  return { height, halfHeight: height / 2, rowStep: height * .75 };
}

export function resolveGridCoordinatePosition(coordinate, grid, width, height) {
  const match = clean(coordinate).toUpperCase().replaceAll(" ", "").match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) return null;
  const columnIndex = columnLabelToIndex(match[1]);
  const rowIndex = Number(match[2]) - 1;
  const size = clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const boardWidth = Math.max(1, Number(width) || DEFAULT_WIDTH);
  const boardHeight = Math.max(1, Number(height) || DEFAULT_HEIGHT);

  if (grid?.type !== "hex") {
    const firstX = offsetX + Math.floor((-offsetX) / size) * size;
    const firstY = offsetY + Math.floor((-offsetY) / size) * size;
    const columns = [];
    const rows = [];
    for (let x = firstX + size / 2; x < boardWidth; x += size) if (x >= 0) columns.push(x);
    for (let y = firstY + size / 2; y < boardHeight; y += size) if (y >= 0) rows.push(y);
    if (columnIndex >= columns.length || rowIndex >= rows.length) return null;
    return { x: columns[columnIndex], y: rows[rowIndex], coordinate: `${match[1]}${rowIndex + 1}` };
  }

  const { halfHeight, rowStep } = getHexMetrics(size);
  const firstRow = Math.ceil((-offsetY - halfHeight) / rowStep) - 1;
  const lastRow = Math.floor((boardHeight - offsetY - halfHeight) / rowStep) + 1;
  const visibleRows = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = offsetY + row * rowStep + halfHeight;
    const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
    const firstColumn = Math.ceil((-offsetX - rowOffset - size / 2) / size) - 1;
    const lastColumn = Math.floor((boardWidth - offsetX - rowOffset - size / 2) / size) + 1;
    const cells = [];
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = offsetX + rowOffset + column * size + size / 2;
      if (x >= 0 && x <= boardWidth && y >= 0 && y <= boardHeight) cells.push({ x, column });
    }
    if (y >= 0 && y <= boardHeight && cells.length) visibleRows.push({ y, cells });
  }
  const visibleColumns = [...new Set(visibleRows.flatMap((row) => row.cells.map((cell) => cell.column)))].sort((a, b) => a - b);
  const column = visibleColumns[columnIndex];
  const row = visibleRows[rowIndex];
  const cell = row?.cells.find((candidate) => candidate.column === column);
  return cell ? { x: cell.x, y: row.y, coordinate: `${match[1]}${rowIndex + 1}` } : null;
}

export function normalizeMapReference(value) {
  if (!isObject(value)) return null;
  const imageUrl = clean(value.imageUrl);
  const cloudEntryId = clean(value.cloudEntryId);
  if (!imageUrl && !cloudEntryId) return null;
  return {
    name: clean(value.name) || "Mapa",
    imageUrl,
    width: Math.max(1, Math.round(Number(value.width) || DEFAULT_WIDTH)),
    height: Math.max(1, Math.round(Number(value.height) || DEFAULT_HEIGHT)),
    cloudEntryId,
    isPrivate: value.isPrivate === true
  };
}

export function getPortableMapReference(value) {
  const map = normalizeMapReference(value);
  if (!map) return null;
  return map.isPrivate ? { ...map, imageUrl: "" } : map;
}

export function normalizeMapEditorState(value) {
  const source = isObject(value) ? value : {};
  const positions = isObject(source.tokenPositions) ? source.tokenPositions : {};
  const visibility = isObject(source.tokenVisibility) ? source.tokenVisibility : {};
  const windowBounds = isObject(source.windowBounds) ? source.windowBounds : {};
  return {
    map: normalizeMapReference(source.map),
    openPanel: ["map", "grid", "tokens", "paint", "shapes", "fog", "initiative"].includes(source.openPanel) ? source.openPanel : "",
    windowBounds: {
      width: clamp(windowBounds.width || 1500, 720, 4096),
      height: clamp(windowBounds.height || 960, 520, 2160),
      left: windowBounds.left === null || windowBounds.left === undefined || windowBounds.left === "" || !Number.isFinite(Number(windowBounds.left))
        ? null
        : Math.round(Number(windowBounds.left)),
      top: windowBounds.top === null || windowBounds.top === undefined || windowBounds.top === "" || !Number.isFinite(Number(windowBounds.top))
        ? null
        : Math.round(Number(windowBounds.top))
    },
    viewport: {
      scrollLeft: Math.max(0, Number(source.viewport?.scrollLeft) || 0),
      scrollTop: Math.max(0, Number(source.viewport?.scrollTop) || 0),
      zoom: clamp(source.viewport?.zoom || 1, MIN_MAP_ZOOM, MAX_MAP_ZOOM)
    },
    rotation: [0, 90, 180, 270].includes(Number(source.rotation)) ? Number(source.rotation) : 0,
    rotationOrientation: source.rotationOrientation === "with-map" ? "with-map" : "upright",
    grid: {
      visible: source.grid?.visible === true,
      type: source.grid?.type === "hex" ? "hex" : "square",
      color: normalizeColor(source.grid?.color, "#ffffff"),
      size: clamp(source.grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE),
      offsetX: Number(source.grid?.offsetX) || 0,
      offsetY: Number(source.grid?.offsetY) || 0
    },
    tokenPositions: Object.fromEntries(Object.entries(positions).map(([id, point]) => [clean(id), {
      x: Number(point?.x) || 0,
      y: Number(point?.y) || 0
    }]).filter(([id]) => id)),
    tokenVisibility: Object.fromEntries(Object.entries(visibility).map(([id, enabled]) => [clean(id), enabled === true]).filter(([id]) => id)),
    fog: {
      enabled: source.fog?.enabled === true,
      translucent: source.fog?.translucent === true,
      brushSize: clamp(source.fog?.brushSize || 70, 12, 300),
      revealed: Array.isArray(source.fog?.revealed) ? source.fog.revealed.slice(-6000).map((point) => ({
        x: Number(point?.x) || 0,
        y: Number(point?.y) || 0,
        r: clamp(point?.r || 70, 4, 400)
      })) : []
    },
    paint: {
      color: normalizeColor(source.paint?.color),
      size: clamp(source.paint?.size || 12, MIN_PAINT_SIZE, MAX_PAINT_SIZE),
      mode: source.paint?.mode === "erase" ? "erase" : "paint",
      strokes: normalizePaintStrokes(source.paint?.strokes)
    },
    shapes: {
      type: ["circle", "square", "cone"].includes(source.shapes?.type) ? source.shapes.type : "circle",
      color: normalizeColor(source.shapes?.color, "#f97316"),
      distanceFeet: clamp(Math.round((Number(source.shapes?.distanceFeet) || 15) / 5) * 5, 5, 500),
      coordinate: clean(source.shapes?.coordinate).toUpperCase().replaceAll(" ", "").slice(0, 12),
      selectedId: clean(source.shapes?.selectedId),
      items: normalizeAreaShapes(source.shapes?.items)
    },
    savedMapLayouts: normalizeSavedMapLayouts(source.savedMapLayouts),
    healthMode: ["all", "none", "allies", "neutral", "enemies"].includes(source.healthMode) ? source.healthMode : "all",
    initiative: {
      visible: source.initiative?.visible === true,
      position: ["top", "bottom", "left", "right"].includes(source.initiative?.position) ? source.initiative.position : "top",
      size: clamp(source.initiative?.size || 290, 160, 650)
    }
  };
}

export function snapTokenPosition(point, grid) {
  const size = clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;

  if (grid?.type !== "hex") {
    return {
      x: offsetX + (Math.round((x - offsetX - size / 2) / size) * size) + size / 2,
      y: offsetY + (Math.round((y - offsetY - size / 2) / size) * size) + size / 2
    };
  }

  const { halfHeight, rowStep } = getHexMetrics(size);
  const row = Math.round((y - offsetY - halfHeight) / rowStep);
  const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
  const column = Math.round((x - offsetX - rowOffset - size / 2) / size);
  return {
    x: offsetX + rowOffset + column * size + size / 2,
    y: offsetY + row * rowStep + halfHeight
  };
}

export function snapCreaturePosition(point, grid, sizeMultiplier = 1) {
  const multiplier = Number(sizeMultiplier) || 1;
  const size = clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;
  if (multiplier % 2 !== 0 || multiplier < 2) return snapTokenPosition(point, grid);
  if (grid?.type !== "hex") {
    return {
      x: offsetX + Math.round((x - offsetX) / size) * size,
      y: offsetY + Math.round((y - offsetY) / size) * size
    };
  }

  const { halfHeight, rowStep } = getHexMetrics(size);
  const approximateRow = Math.round((y - offsetY - halfHeight) / rowStep);
  let nearest = null;
  for (let row = approximateRow - 2; row <= approximateRow + 2; row += 1) {
    const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
    const approximateColumn = Math.round((x - offsetX - rowOffset - size / 2) / size);
    for (let column = approximateColumn - 2; column <= approximateColumn + 2; column += 1) {
      const centerX = offsetX + rowOffset + column * size + size / 2;
      const centerY = offsetY + row * rowStep + halfHeight;
      for (const vertex of [
        { x: centerX, y: centerY - halfHeight },
        { x: centerX + size / 2, y: centerY - halfHeight / 2 },
        { x: centerX + size / 2, y: centerY + halfHeight / 2 },
        { x: centerX, y: centerY + halfHeight },
        { x: centerX - size / 2, y: centerY + halfHeight / 2 },
        { x: centerX - size / 2, y: centerY - halfHeight / 2 }
      ]) {
        const distance = Math.hypot(vertex.x - x, vertex.y - y);
        if (!nearest || distance < nearest.distance) nearest = { ...vertex, distance };
      }
    }
  }
  return nearest ? { x: nearest.x, y: nearest.y } : snapTokenPosition(point, grid);
}

export async function convertImageFileToWebp(file, quality = 0.95) {
  if (!isImageFileLike(file)) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  const mimeType = getImageFileMimeType(file);
  const sourceBlob = typeof Blob !== "undefined" && file instanceof Blob
    ? file
    : new Blob([await file.arrayBuffer()], { type: mimeType });
  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error("No se pudo decodificar la imagen.")), { once: true });
      });
    }
    const readDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen convertida.")), { once: true });
      reader.readAsDataURL(blob);
    });
    if (mimeType === "image/webp") {
      return {
        blob: sourceBlob,
        dataUrl: await readDataUrl(sourceBlob),
        width: image.naturalWidth,
        height: image.naturalHeight
      };
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context || canvas.width <= 0 || canvas.height <= 0) throw new Error("La imagen no tiene dimensiones válidas.");
    context.drawImage(image, 0, 0);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("No se pudo convertir la imagen a WebP.")),
      "image/webp",
      quality
    ));
    const dataUrl = await readDataUrl(blob);
    return { blob, dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getInitials(name) {
  return clean(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

function getConditions(combatant) {
  return clean(combatant?.condiciones).split(/[,;|]/).map(clean).filter(Boolean);
}

function isAlive(combatant) {
  return combatant?.pgAct === "" || Number(combatant?.pgAct) > 0;
}

function isDefaultTokenVisible(combatant) {
  return isAlive(combatant) && combatant?.hiddenFromInitiative !== true && combatant?.iniactiva !== "" && combatant?.iniactiva !== null && combatant?.iniactiva !== undefined;
}

function getSide(combatant) {
  if (combatant?.side === "enemies" || combatant?.tag === "ENEMIGO") return "enemies";
  if (combatant?.side === "neutral" || combatant?.tag === "NEUTRAL") return "neutral";
  return "allies";
}

export function createCombatMapController(options = {}) {
  let editorWindow = null;
  let pollInterval = 0;
  let viewportPersistTimer = 0;
  let state = loadLocalState();
  let activeDrag = null;
  let pickerCallback = null;
  let openPanel = state.openPanel;
  let localImageBusy = false;
  let localImageError = "";
  let shapeCoordinateError = "";
  let mapLoadMenuOpen = false;
  let mapFitScale = 1;
  let tokenSearch = "";
  let initiativeLayout = { scale: 1, columns: 1, count: 0 };

  function loadLocalState() {
    try {
      return normalizeMapEditorState(JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"));
    } catch {
      return normalizeMapEditorState({});
    }
  }

  function persist() {
    try { localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(state)); } catch { /* memory state remains */ }
    options.onChange?.(getSaveData());
  }

  function getCombatants() {
    return (options.getCombatants?.() || []).filter(Boolean);
  }

  function getStatusMeta(statusName) {
    return options.getStatusMeta?.(statusName) || {
      label: clean(statusName),
      description: "",
      tone: "combat-status-chip--default",
      iconUrl: ""
    };
  }

  function getCreatureSizeMultiplier(combatant) {
    const value = clean(combatant?.tamano || combatant?.talla || combatant?.size)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/^(tiny|diminut|minuscul)/.test(value)) return .5;
    if (/^(large|grande)/.test(value)) return 2;
    if (/^(huge|enorme)/.test(value)) return 3;
    if (/^(gargantuan|gargantues)/.test(value)) return 4;
    return 1;
  }

  function getTokenEnabled(combatant) {
    return Object.prototype.hasOwnProperty.call(state.tokenVisibility, combatant.id)
      ? state.tokenVisibility[combatant.id] === true
      : isDefaultTokenVisible(combatant);
  }

  function getDefaultPosition(combatant, index) {
    const size = state.grid.size;
    return snapCreaturePosition(
      { x: size * (1.5 + index % 8), y: size * (1.5 + Math.floor(index / 8)) },
      state.grid,
      getCreatureSizeMultiplier(combatant)
    );
  }

  function getTokenPosition(combatant, index) {
    return state.tokenPositions[combatant.id] || getDefaultPosition(combatant, index);
  }

  function getSaveData(options = {}) {
    const output = JSON.parse(JSON.stringify(state));
    if (options.portable === true) {
      output.map = getPortableMapReference(output.map);
      output.savedMapLayouts = output.savedMapLayouts.map((layout) => ({
        ...layout,
        map: getPortableMapReference(layout.map)
      })).filter((layout) => layout.map);
    }
    return output;
  }

  function applySave(value) {
    state = normalizeMapEditorState(value);
    openPanel = state.openPanel;
    persist();
    sync();
    if (state.map?.cloudEntryId && !state.map.imageUrl) resolveCloudMap(state.map.cloudEntryId);
  }

  function createCurrentMapWorkspace() {
    const { map, savedMapLayouts, windowBounds, openPanel: panel, ...workspace } = state;
    return JSON.parse(JSON.stringify(workspace));
  }

  function saveCurrentMapLayout() {
    const map = normalizeMapReference(state.map);
    const key = getMapLayoutKey(map);
    if (!map || !key) return;
    const layout = { key, map, state: createCurrentMapWorkspace() };
    state.savedMapLayouts = [...state.savedMapLayouts.filter((item) => item.key !== key), layout].slice(-MAX_SAVED_MAP_LAYOUTS);
  }

  function restoreMapLayout(next) {
    const key = getMapLayoutKey(next);
    const layout = state.savedMapLayouts.find((item) => item.key === key);
    if (!layout) return false;
    const preserved = {
      savedMapLayouts: state.savedMapLayouts,
      windowBounds: state.windowBounds,
      openPanel
    };
    state = normalizeMapEditorState({ ...layout.state, ...preserved, map: next });
    openPanel = state.openPanel;
    return true;
  }

  function setMap(map, behavior = {}) {
    const next = normalizeMapReference(map);
    if (!next) return;
    const currentKey = getMapLayoutKey(state.map);
    const nextKey = getMapLayoutKey(next);
    if (currentKey && currentKey === nextKey) {
      state.map = next;
      persist();
      sync();
      if (!next.imageUrl && next.cloudEntryId) resolveCloudMap(next.cloudEntryId);
      return;
    }
    if (behavior.retainWorkspace === true) {
      state.map = next;
      persist();
      sync();
      return;
    }
    if (state.map && behavior.promptToSave !== false) {
      const confirmSave = editorWindow?.confirm?.bind(editorWindow) || window.confirm.bind(window);
      if (confirmSave(`¿Quieres guardar en esta campaña el estado actual de “${state.map.name}” antes de cargar “${next.name}”?`)) {
        saveCurrentMapLayout();
      }
    }
    if (!restoreMapLayout(next)) {
      state = normalizeMapEditorState({
        map: next,
        savedMapLayouts: state.savedMapLayouts,
        windowBounds: state.windowBounds,
        openPanel,
        healthMode: state.healthMode,
        initiative: state.initiative
      });
      openPanel = state.openPanel;
    }
    persist();
    sync();
    if (!next.imageUrl && next.cloudEntryId) resolveCloudMap(next.cloudEntryId);
  }

  async function resolveCloudMap(entryId) {
    try {
      const result = await getCloudLibraryEntry(entryId);
      const resolved = normalizeMapReference({
        ...(result.payload?.map || {}),
        name: result.entry?.name || result.payload?.map?.name,
        cloudEntryId: entryId,
        isPrivate: result.entry?.isPublic !== true
      });
      if (!resolved) throw new Error("El mapa cloud no contiene una imagen válida.");
      state.map = resolved;
      persist();
      sync();
    } catch (error) {
      options.onNotify?.("Mapa privado no disponible", error?.message || "Inicia sesión con la cuenta propietaria.", "danger");
    }
  }

  function getMap() {
    return state.map ? { ...state.map } : null;
  }

  function isOpen() {
    return Boolean(editorWindow && !editorWindow.closed);
  }

  function open() {
    if (isOpen()) {
      editorWindow.focus();
      sync();
      return;
    }
    const bounds = state.windowBounds;
    const position = bounds.left === null || bounds.top === null ? "" : `,left=${bounds.left},top=${bounds.top}`;
    const popup = window.open("", "mimic-dice-combat-map", `popup=yes,width=${Math.round(bounds.width)},height=${Math.round(bounds.height)}${position},resizable=yes,scrollbars=no`);
    if (!popup) {
      options.onNotify?.("No se pudo abrir el mapa", "Permite ventanas emergentes y vuelve a intentarlo.", "danger");
      return;
    }
    editorWindow = popup;
    initializeWindow(popup);
    pollInterval = window.setInterval(() => {
      if (editorWindow?.closed) close();
      else captureWindowBounds();
    }, 500);
    sync();
    popup.focus();
  }

  function close() {
    if (pollInterval) window.clearInterval(pollInterval);
    if (viewportPersistTimer) window.clearTimeout(viewportPersistTimer);
    pollInterval = 0;
    viewportPersistTimer = 0;
    editorWindow = null;
    activeDrag = null;
    pickerCallback = null;
  }

  function captureWindowBounds() {
    if (!isOpen()) return;
    const next = {
      width: clamp(editorWindow.outerWidth, 720, 4096),
      height: clamp(editorWindow.outerHeight, 520, 2160),
      left: Math.round(Number(editorWindow.screenX) || 0),
      top: Math.round(Number(editorWindow.screenY) || 0)
    };
    if (JSON.stringify(next) === JSON.stringify(state.windowBounds)) return;
    state.windowBounds = next;
    persist();
  }

  function initializeWindow(popup) {
    const inheritedStyles = [...document.head.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.outerHTML).join("\n");
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(document.baseURI)}"><title>Mapa de combate - Mimic Dice</title>${inheritedStyles}</head><body class="combat-map-popout-body"><main data-combat-map-root></main></body></html>`);
    popup.document.close();
    popup.document.addEventListener("click", handleClick);
    popup.document.addEventListener("change", handleChange);
    popup.document.addEventListener("input", handleInput);
    popup.document.addEventListener("keydown", handleKeydown);
    popup.document.addEventListener("contextmenu", handleContextMenu);
    popup.document.addEventListener("pointerdown", handlePointerDown);
    popup.document.addEventListener("pointermove", handlePointerMove);
    popup.document.addEventListener("pointerup", handlePointerUp);
    popup.document.addEventListener("pointercancel", handlePointerUp);
    popup.document.addEventListener("pointerleave", hideBrushCursor);
    popup.document.addEventListener("wheel", handleWheel, { passive: false });
    popup.document.addEventListener("scroll", handleViewportScroll, true);
    popup.addEventListener("beforeunload", () => { captureWindowBounds(); close(); });
    popup.addEventListener("resize", () => {
      captureWindowBounds();
      updateMapScale();
      fitInitiativeOrder();
      drawGridCoordinates();
      drawGridLabels();
      drawPaint();
      drawFog();
    });
  }

  function renderToolbar() {
    return `<header class="combat-map-toolbar">
      <button type="button" data-map-action="open-map-menu" class="${openPanel === "map" ? "is-active" : ""}">Mapa</button>
      <button type="button" data-map-action="toggle-grid-menu" class="${state.grid.visible ? "is-active" : ""}">Rejilla</button>
      <button type="button" data-map-action="toggle-token-menu">Peanas</button>
      <button type="button" data-map-action="toggle-fog-menu" class="${state.fog.enabled || openPanel === "fog" ? "is-active" : ""}">Niebla</button>
      <button type="button" data-map-action="toggle-paint-menu" class="${openPanel === "paint" ? "is-active" : ""}">Pintar</button>
      <button type="button" data-map-action="toggle-shapes-menu" class="${openPanel === "shapes" ? "is-active" : ""}">Formas</button>
      <label>Vida <select data-map-health><option value="all" ${state.healthMode === "all" ? "selected" : ""}>Todas</option><option value="none" ${state.healthMode === "none" ? "selected" : ""}>Ninguna</option><option value="allies" ${state.healthMode === "allies" ? "selected" : ""}>Aliadas</option><option value="neutral" ${state.healthMode === "neutral" ? "selected" : ""}>Neutrales</option><option value="enemies" ${state.healthMode === "enemies" ? "selected" : ""}>Enemigas</option></select></label>
      <button type="button" data-map-action="toggle-initiative-menu" class="combat-map-toolbar__initiative ${state.initiative.visible || openPanel === "initiative" ? "is-active" : ""}">Orden de iniciativa</button>
    </header>`;
  }

  function getEncounterMapChoices() {
    return (options.getEncounterMaps?.() || []).map((choice) => ({
      ...choice,
      map: normalizeMapReference(choice?.map || choice)
    })).filter((choice) => choice.map);
  }

  function renderMapMenu() {
    const encounterMaps = getEncounterMapChoices();
    const currentKey = getMapLayoutKey(state.map);
    const savedMaps = state.savedMapLayouts.filter((layout) => layout.key !== currentKey);
    return `<section class="combat-map-popover" data-map-panel="map" ${openPanel === "map" ? "" : "hidden"}>
      <h2>Mapa</h2>
      <button type="button" data-map-action="toggle-map-load-menu">Cargar imagen</button>
      ${mapLoadMenuOpen ? `<div class="combat-map-load-menu">
        <label class="combat-map-file-button">Desde equipo<input type="file" accept="image/*" data-map-file></label>
        <button type="button" data-map-action="open-cloud-map-catalog">Desde la nube</button>
        ${savedMaps.length ? `<div class="combat-map-priority-list"><h3>Usados recientemente</h3><div class="combat-map-cloud-grid">${savedMaps.map((layout) => `<button type="button" data-map-saved-layout="${escapeHtml(layout.key)}">${layout.map.imageUrl ? `<img src="${escapeHtml(layout.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(layout.map.name)}</span><small>Disposición guardada</small></button>`).join("")}</div></div>` : ""}
        ${encounterMaps.length ? `<div class="combat-map-priority-list"><h3>Vinculados a encuentros cargados</h3><div class="combat-map-cloud-grid">${encounterMaps.map((choice, index) => `<button type="button" data-map-encounter-choice="${index}">${choice.map.imageUrl ? `<img src="${escapeHtml(choice.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(choice.map.name)}</span><small>${escapeHtml(choice.encounterName || "Encuentro")}</small></button>`).join("")}</div></div>` : ""}
      </div>` : ""}
      <label>Zoom <input type="range" min="25" max="300" step="5" value="${Math.round(state.viewport.zoom * 100)}" data-map-zoom><output>${Math.round(state.viewport.zoom * 100)}%</output></label>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="zoom-out">Alejar</button><button type="button" data-map-action="zoom-reset">100%</button><button type="button" data-map-action="zoom-in">Acercar</button></div>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="rotate-left">Rotar 90° izquierda</button><button type="button" data-map-action="rotate-right">Rotar 90° derecha</button></div>
      <label>Orientación al rotar <select data-map-rotation-orientation><option value="upright" ${state.rotationOrientation === "upright" ? "selected" : ""}>Mantener textos y peanas derechos</option><option value="with-map" ${state.rotationOrientation === "with-map" ? "selected" : ""}>Rotar todo con el mapa</option></select></label>
      <button type="button" data-map-action="reset-map-canvas">Restablecer imagen</button>
      ${localImageBusy ? `<p class="combat-map-converting" role="status">Convirtiendo imagen a WebP…</p>` : ""}
      ${localImageError ? `<p class="combat-map-error" role="alert">${escapeHtml(localImageError)}</p>` : ""}
      <p class="combat-map-help">WebP se conserva sin recomprimir. Otros formatos se convierten a WebP.</p>
    </section>`;
  }

  function renderGridMenu() {
    return `<section class="combat-map-popover" data-map-panel="grid" ${openPanel === "grid" ? "" : "hidden"}>
      <h2>Rejilla</h2>
      <label><input type="checkbox" data-grid-visible ${state.grid.visible ? "checked" : ""}> Mostrar rejilla</label>
      <label>Tipo <select data-grid-type><option value="square" ${state.grid.type === "square" ? "selected" : ""}>Cuadrada</option><option value="hex" ${state.grid.type === "hex" ? "selected" : ""}>Hexagonal</option></select></label>
      <label>Color <input type="color" value="${state.grid.color}" data-grid-color></label>
      <label>Tamaño <input type="range" min="${MIN_GRID_SIZE}" max="${MAX_GRID_SIZE}" value="${state.grid.size}" data-grid-size><output>${Math.round(state.grid.size)} px</output></label>
      <p class="combat-map-help">Arrastra sobre el mapa con panel abierto para desplazar rejilla.</p>
    </section>`;
  }

  function renderFogMenu() {
    return `<section class="combat-map-popover" data-map-panel="fog" ${openPanel === "fog" ? "" : "hidden"}>
      <h2>Niebla de guerra</h2>
      <label><input type="checkbox" data-fog-enabled ${state.fog.enabled ? "checked" : ""}> Mostrar niebla</label>
      <label><input type="checkbox" data-fog-translucent ${state.fog.translucent ? "checked" : ""} ${state.fog.enabled ? "" : "disabled"}> Modo translúcido para editar</label>
      <label>Grosor <input type="range" min="12" max="300" value="${state.fog.brushSize}" data-fog-size><output>${Math.round(state.fog.brushSize * 2)} px</output></label>
      <button type="button" data-map-action="reset-fog" ${state.fog.revealed.length ? "" : "disabled"}>Reiniciar niebla</button>
      <p class="combat-map-help">Por defecto es opaca. El modo translúcido permite ver el mapa mientras recortas la niebla.</p>
    </section>`;
  }

  function renderInitiativeMenu() {
    return `<section class="combat-map-popover" data-map-panel="initiative" ${openPanel === "initiative" ? "" : "hidden"}>
      <h2>Orden de iniciativa</h2>
      <label><input type="checkbox" data-map-initiative ${state.initiative.visible ? "checked" : ""}> Mostrar junto al mapa</label>
      <label>Posición <select data-map-initiative-position ${state.initiative.visible ? "" : "disabled"}><option value="top" ${state.initiative.position === "top" ? "selected" : ""}>Arriba</option><option value="bottom" ${state.initiative.position === "bottom" ? "selected" : ""}>Abajo</option><option value="left" ${state.initiative.position === "left" ? "selected" : ""}>Izquierda</option><option value="right" ${state.initiative.position === "right" ? "selected" : ""}>Derecha</option></select></label>
      <label>Tamaño <input type="range" min="160" max="650" value="${state.initiative.size}" data-map-initiative-size><output>${Math.round(state.initiative.size)} px</output></label>
      <p class="combat-map-help">También puedes arrastrar el separador entre el mapa y la iniciativa.</p>
    </section>`;
  }

  function renderTokenMenu() {
    const query = tokenSearch.toLocaleLowerCase("es");
    const rows = getCombatants().map((combatant) => {
      const name = clean(combatant.nombre) || "Entidad";
      const stand = clean(combatant.numPeana) || "—";
      const hidden = query && !`${name} ${stand}`.toLocaleLowerCase("es").includes(query);
      return `<label class="combat-map-token-checklist__row" data-map-token-row data-map-token-search-value="${escapeHtml(`${name} ${stand}`.toLocaleLowerCase("es"))}" ${hidden ? "hidden" : ""}>
        <input type="checkbox" data-map-token-toggle="${escapeHtml(combatant.id)}" ${getTokenEnabled(combatant) ? "checked" : ""}>
        <span class="combat-map-token-checklist__name">${escapeHtml(name)}</span>
        <span class="combat-map-token-checklist__portrait">${renderPortrait(combatant)}</span>
        <strong class="combat-map-token-checklist__number">${escapeHtml(stand)}</strong>
      </label>`;
    }).join("");
    return `<section class="combat-map-popover combat-map-popover--tokens" data-map-panel="tokens" ${openPanel === "tokens" ? "" : "hidden"}><h2>Peanas</h2><label class="combat-map-token-search"><span>Buscar</span><input type="search" value="${escapeHtml(tokenSearch)}" placeholder="Nombre o número" data-map-token-search></label><div class="combat-map-token-actions"><button type="button" data-map-action="all-tokens">Marcar todas</button><button type="button" data-map-action="no-tokens">Desmarcar todas</button></div><div class="combat-map-token-checklist">${rows || "<p>No hay entidades.</p>"}</div></section>`;
  }

  function renderPaintMenu() {
    return `<section class="combat-map-popover" data-map-panel="paint" ${openPanel === "paint" ? "" : "hidden"}>
      <h2>Pincel para pintar</h2>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="paint-mode" class="${state.paint.mode === "paint" ? "is-active" : ""}">Pincel</button><button type="button" data-map-action="erase-mode" class="${state.paint.mode === "erase" ? "is-active" : ""}">Goma</button></div>
      <label>Color <input type="color" value="${state.paint.color}" data-paint-color></label>
      <label>Grosor <input type="range" min="${MIN_PAINT_SIZE}" max="${MAX_PAINT_SIZE}" value="${state.paint.size}" data-paint-size><output>${Math.round(state.paint.size)} px</output></label>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="undo-paint" ${state.paint.strokes.length ? "" : "disabled"}>Deshacer trazo</button><button type="button" data-map-action="clear-paint" ${state.paint.strokes.length ? "" : "disabled"}>Borrar dibujo</button></div>
      <p class="combat-map-help">El pincel añade trazos y la goma borra únicamente las partes por las que pasa. Todo se guarda con la campaña.</p>
    </section>`;
  }

  function renderShapesMenu() {
    const distanceLabel = state.shapes.type === "cone" ? "Longitud" : state.shapes.type === "square" ? "Lado" : "Radio";
    const selected = state.shapes.items.some((shape) => shape.id === state.shapes.selectedId);
    return `<section class="combat-map-popover" data-map-panel="shapes" ${openPanel === "shapes" ? "" : "hidden"}>
      <h2>Formas de área</h2>
      <label>Forma <select data-shape-type><option value="circle" ${state.shapes.type === "circle" ? "selected" : ""}>Círculo</option><option value="square" ${state.shapes.type === "square" ? "selected" : ""}>Cuadrado</option><option value="cone" ${state.shapes.type === "cone" ? "selected" : ""}>Cono</option></select></label>
      <label>Color <input type="color" value="${state.shapes.color}" data-shape-color></label>
      <label>${distanceLabel} <input type="number" min="5" max="500" step="5" value="${state.shapes.distanceFeet}" data-shape-distance> pies</label>
      <label>Casilla inicial <input type="text" maxlength="12" placeholder="A8" value="${escapeHtml(state.shapes.coordinate)}" data-shape-coordinate></label>
      ${shapeCoordinateError ? `<p class="combat-map-error" role="alert">${escapeHtml(shapeCoordinateError)}</p>` : ""}
      <button type="button" data-map-action="add-shape">Añadir forma</button>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="rotate-shape-left" ${selected ? "" : "disabled"}>Girar −15°</button><button type="button" data-map-action="rotate-shape-right" ${selected ? "" : "disabled"}>Girar +15°</button><button type="button" data-map-action="delete-shape" ${selected ? "" : "disabled"}>Eliminar</button></div>
      <p class="combat-map-help">La casilla es opcional: centra círculos y cuadrados; en conos coloca el origen. Círculo usa radio, cuadrado usa lado y el cono termina con una anchura igual a su longitud.</p>
    </section>`;
  }

  function renderInitiative() {
    if (!state.initiative.visible) return "";
    const content = options.renderInitiativeOrder?.(editorWindow, initiativeLayout) || "<p>Sin iniciativa.</p>";
    return `<aside class="combat-map-initiative combat-tracker-panel" data-map-initiative-order>${content}</aside><div class="combat-map-initiative-resizer" data-map-initiative-resizer title="Arrastrar para cambiar el tamaño"></div>`;
  }

  function renderPortrait(combatant) {
    const url = clean(combatant.tokenUrl);
    return url ? `<img src="${escapeHtml(url)}" alt="" draggable="false">` : `<i>${escapeHtml(getInitials(combatant.nombre))}</i>`;
  }

  function showHealth(combatant) {
    return state.healthMode === "all" || state.healthMode === getSide(combatant);
  }

  function renderTokens(layer = "all") {
    return getCombatants().map((combatant, index) => ({ combatant, index })).filter(({ combatant }) => getTokenEnabled(combatant)).map(({ combatant, index }) => {
      const side = getSide(combatant);
      if ((layer === "allies" && side !== "allies") || (layer === "covered" && side === "allies")) return "";
      const position = getTokenPosition(combatant, index);
      const maxHp = Math.max(1, Number(combatant.pgMax) || 1);
      const hp = clamp(combatant.pgAct === "" ? maxHp : combatant.pgAct, 0, maxHp);
      const conditions = getConditions(combatant);
      const conditionMeta = conditions.map(getStatusMeta);
      const tokenSize = state.grid.size * getCreatureSizeMultiplier(combatant);
      const counterRotation = state.rotationOrientation === "upright" ? -state.rotation : 0;
      return `<div class="combat-map-token combat-map-token--${side}" data-map-token="${escapeHtml(combatant.id)}" data-map-token-size-multiplier="${getCreatureSizeMultiplier(combatant)}" style="--token-size:${tokenSize}px;--token-counter-rotation:${counterRotation}deg;left:${position.x}px;top:${position.y}px" title="${escapeHtml(combatant.nombre || "Entidad")}">
        <span class="combat-map-token__portrait">${renderPortrait(combatant)}</span><strong>${escapeHtml(combatant.numPeana || "—")}</strong>
        ${conditionMeta.length ? `<span class="combat-map-token__status-icons">${conditionMeta.map((meta) => `<i class="${escapeHtml(meta.tone)}" title="${escapeHtml(meta.label)}">${meta.iconUrl ? `<img src="${escapeHtml(meta.iconUrl)}" alt="">` : escapeHtml(meta.label.slice(0, 2).toUpperCase())}</i>`).join("")}</span>` : ""}
        ${showHealth(combatant) ? `<span class="combat-map-token__health"><i style="width:${(hp / maxHp) * 100}%"></i></span>` : ""}
        ${conditionMeta.length ? `<span class="combat-map-token__statuses">${conditionMeta.map((meta) => `<em class="${escapeHtml(meta.tone)}">${meta.iconUrl ? `<img src="${escapeHtml(meta.iconUrl)}" alt="">` : ""}<span>${escapeHtml(meta.label)}</span></em>`).join("")}</span>` : ""}
      </div>`;
    }).join("");
  }

  function renderAreaShapes() {
    return state.shapes.items.map((shape) => {
      const metrics = getAreaShapeMetrics(shape, state.grid);
      const selected = shape.id === state.shapes.selectedId;
      const geometry = shape.type === "circle"
        ? `<circle cx="100" cy="100" r="96"></circle>`
        : shape.type === "square"
          ? `<rect x="4" y="4" width="192" height="192" rx="4"></rect>`
          : `<polygon points="0,100 196,4 196,196"></polygon>`;
      const labelCounterRotation = state.rotationOrientation === "upright" ? -(state.rotation + shape.rotation) : 0;
      const anchorX = shape.type === "cone" ? "0%" : "-50%";
      return `<div class="combat-map-area-shape combat-map-area-shape--${shape.type} ${selected ? "is-selected" : ""}" data-map-shape="${escapeHtml(shape.id)}" style="--shape-color:${shape.color};--shape-size:${metrics.distancePx}px;--shape-width:${metrics.width}px;--shape-height:${metrics.height}px;--shape-anchor-x:${anchorX};--shape-label-counter-rotation:${labelCounterRotation}deg;left:${shape.x}px;top:${shape.y}px;transform:translate(${anchorX},-50%) rotate(${shape.rotation}deg)" title="${metrics.distanceFeet} pies">
        <svg viewBox="0 0 200 200" aria-hidden="true">${geometry}</svg>
        <span class="combat-map-area-shape__measure">${metrics.distanceFeet} pies</span>
        <button type="button" class="combat-map-area-shape__rotate" data-map-shape-rotate="${escapeHtml(shape.id)}" title="Arrastrar para rotar" aria-label="Rotar forma"></button>
      </div>`;
    }).join("");
  }

  function renderStage() {
    const map = state.map;
    const width = map?.width || DEFAULT_WIDTH;
    const height = map?.height || DEFAULT_HEIGHT;
    const sideways = state.rotation === 90 || state.rotation === 270;
    const displayWidth = sideways ? height : width;
    const displayHeight = sideways ? width : height;
    const gutter = state.grid.visible ? GRID_LABEL_GUTTER : 0;
    const totalWidth = displayWidth + gutter * 2;
    const totalHeight = displayHeight + gutter * 2;
    return `<div class="combat-map-viewport"><div class="combat-map-frame" data-map-frame><div class="combat-map-scale-layer" data-map-scale-layer style="width:${totalWidth}px;height:${totalHeight}px"><div class="combat-map-board" data-map-board data-map-width="${width}" data-map-height="${height}" data-display-width="${displayWidth}" data-display-height="${displayHeight}" style="left:${gutter}px;top:${gutter}px;width:${displayWidth}px;height:${displayHeight}px;aspect-ratio:${displayWidth}/${displayHeight}">
      <div class="combat-map-clip">
      <div class="combat-map-rotating-layers" style="inset:auto;left:50%;top:50%;width:${width}px;height:${height}px;transform:translate(-50%,-50%) rotate(${state.rotation}deg)">
        ${map?.imageUrl ? `<img class="combat-map-image" src="${escapeHtml(map.imageUrl)}" alt="${escapeHtml(map.name)}" draggable="false">` : `<div class="combat-map-empty"><strong>${map ? "Mapa privado" : "Sin mapa"}</strong><span>${map ? "Inicia sesión con la cuenta propietaria para cargarlo." : "Carga una imagen desde equipo o nube."}</span></div>`}
        <div class="combat-map-grid ${state.grid.visible ? "is-visible" : ""}" data-map-grid></div>
        <canvas class="combat-map-grid-coordinates ${state.grid.visible ? "is-visible" : ""}" data-map-grid-coordinates width="${width}" height="${height}"></canvas>
        <canvas class="combat-map-paint ${openPanel === "paint" ? "is-editing" : ""} ${state.paint.mode === "erase" ? "is-erasing" : ""}" data-map-paint width="${width}" height="${height}"></canvas>
        <div class="combat-map-shape-layer ${openPanel === "shapes" ? "is-editing" : ""}" data-map-shape-layer>${renderAreaShapes()}</div>
        <div class="combat-map-token-layer combat-map-token-layer--covered">${renderTokens("covered")}</div>
        <canvas class="combat-map-fog ${state.fog.enabled ? "is-visible" : ""} ${state.fog.enabled && openPanel === "fog" ? "is-editing" : ""}" data-map-fog width="${width}" height="${height}"></canvas>
        <div class="combat-map-token-layer combat-map-token-layer--allies">${renderTokens("allies")}</div>
        <div class="combat-map-brush-cursor" data-map-brush-cursor></div>
      </div>
      </div>
    </div><canvas class="combat-map-grid-labels ${state.grid.visible ? "is-visible" : ""}" data-map-grid-labels width="${totalWidth}" height="${totalHeight}" style="width:${totalWidth}px;height:${totalHeight}px"></canvas></div></div></div>`;
  }

  function render() {
    const initiativePosition = state.initiative.visible ? state.initiative.position : "none";
    return `<div class="combat-map-editor">${renderToolbar()}${renderMapMenu()}${renderGridMenu()}${renderTokenMenu()}${renderFogMenu()}${renderPaintMenu()}${renderShapesMenu()}${renderInitiativeMenu()}<div class="combat-map-workspace combat-map-workspace--${initiativePosition}" data-map-workspace style="--initiative-size:${state.initiative.size}px">${renderInitiative()}${renderStage()}</div>${options.renderContextMenu?.(editorWindow) || ""}<input type="file" accept="image/*" data-map-file-hidden hidden></div>`;
  }

  function sync() {
    if (!isOpen()) return;
    const root = editorWindow.document.querySelector("[data-combat-map-root]");
    if (!root) return;
    const previousViewport = root.querySelector(".combat-map-viewport");
    if (previousViewport) {
      state.viewport.scrollLeft = previousViewport.scrollLeft;
      state.viewport.scrollTop = previousViewport.scrollTop;
    }
    root.innerHTML = render();
    const nextViewport = root.querySelector(".combat-map-viewport");
    if (nextViewport) {
      nextViewport.scrollLeft = state.viewport.scrollLeft;
      nextViewport.scrollTop = state.viewport.scrollTop;
    }
    updateMapScale();
    fitInitiativeOrder();
    drawGridCoordinates();
    drawGridLabels();
    drawPaint();
    drawFog();
  }

  function updateMapScale() {
    if (!isOpen()) return;
    const viewport = editorWindow.document.querySelector(".combat-map-viewport");
    const frame = editorWindow.document.querySelector("[data-map-frame]");
    const scaleLayer = editorWindow.document.querySelector("[data-map-scale-layer]");
    const board = editorWindow.document.querySelector("[data-map-board]");
    if (!viewport || !frame || !scaleLayer || !board) return;
    const width = Number(board.dataset.displayWidth) || Number(board.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board.dataset.displayHeight) || Number(board.dataset.mapHeight) || DEFAULT_HEIGHT;
    const gutter = state.grid.visible ? GRID_LABEL_GUTTER : 0;
    const totalWidth = width + gutter * 2;
    const totalHeight = height + gutter * 2;
    const availableWidth = Math.max(1, viewport.clientWidth - 24);
    const availableHeight = Math.max(1, viewport.clientHeight - 24);
    mapFitScale = Math.max(.03, Math.min(availableWidth / totalWidth, availableHeight / totalHeight));
    const effectiveScale = mapFitScale * state.viewport.zoom;
    scaleLayer.style.transform = `scale(${effectiveScale})`;
    frame.style.width = `${totalWidth * effectiveScale}px`;
    frame.style.height = `${totalHeight * effectiveScale}px`;
    frame.dataset.mapScale = String(effectiveScale);
  }

  function fitInitiativeOrder() {
    if (!isOpen() || !state.initiative.visible) return;
    const panel = editorWindow.document.querySelector("[data-map-initiative-order]");
    const strip = panel?.querySelector(".combat-turn-strip");
    const count = strip?.querySelectorAll(".combat-turn-token-wrap").length || 0;
    if (!panel || !strip || !count) return;
    const availableWidth = Math.max(1, panel.clientWidth - 24);
    const availableHeight = Math.max(1, panel.clientHeight - 24);
    const baseWidth = 150;
    const baseHeight = 260;
    const gap = 8;
    let best = { scale: .03, columns: 1 };
    for (let columns = 1; columns <= count; columns += 1) {
      const rows = Math.ceil(count / columns);
      const widthScale = (availableWidth - gap * (columns - 1)) / (baseWidth * columns);
      const heightScale = (availableHeight - gap * (rows - 1)) / (baseHeight * rows);
      const scale = Math.max(.03, Math.min(1, widthScale, heightScale));
      if (scale > best.scale) best = { scale, columns };
    }
    strip.style.setProperty("--turn-token-scale", String(best.scale));
    strip.style.setProperty("--initiative-columns", String(best.columns));
    initiativeLayout = { ...best, count };
  }

  function handleViewportScroll(event) {
    if (!event.target.matches?.(".combat-map-viewport")) return;
    state.viewport.scrollLeft = event.target.scrollLeft;
    state.viewport.scrollTop = event.target.scrollTop;
    if (viewportPersistTimer) window.clearTimeout(viewportPersistTimer);
    viewportPersistTimer = window.setTimeout(() => {
      viewportPersistTimer = 0;
      persist();
    }, 180);
  }

  function setMapZoom(value) {
    state.viewport.zoom = clamp(value, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
    updateMapScale();
    drawGridCoordinates();
    drawGridLabels();
    drawPaint();
    drawFog();
    const input = editorWindow?.document.querySelector("[data-map-zoom]");
    if (input) {
      input.value = String(Math.round(state.viewport.zoom * 100));
      input.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.viewport.zoom * 100)}%`);
    }
    persist();
  }

  function handleWheel(event) {
    if (!event.target.closest?.("[data-map-board]")) return;
    event.preventDefault();
    setMapZoom(state.viewport.zoom + (event.deltaY < 0 ? .1 : -.1));
  }

  function prepareCanvas(canvas, logicalWidth, logicalHeight) {
    const frameScale = Number(editorWindow?.document.querySelector("[data-map-frame]")?.dataset.mapScale) || 1;
    const pixelRatio = clamp((editorWindow?.devicePixelRatio || 1) * frameScale, 1, 4);
    const pixelWidth = Math.max(1, Math.round(logicalWidth * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(logicalHeight * pixelRatio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return context;
  }

  function toColumnLabel(index) {
    let value = Math.max(0, Math.floor(index)) + 1;
    let label = "";
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return label;
  }

  function drawGridText(context, value, x, y, fontSize) {
    context.save();
    context.translate(x, y);
    if (state.rotationOrientation === "with-map") context.rotate(state.rotation * Math.PI / 180);
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = Math.max(2, fontSize * .22);
    context.strokeStyle = "rgba(0, 0, 0, .9)";
    context.fillStyle = state.grid.color;
    context.strokeText(value, 0, 0);
    context.fillText(value, 0, 0);
    context.restore();
  }

  function drawGridCoordinates() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-grid-coordinates]");
    if (!canvas) return;
    const board = editorWindow.document.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const context = prepareCanvas(canvas, width, height);
    if (!state.grid.visible) return;

    const size = state.grid.size;
    context.strokeStyle = state.grid.color;
    context.lineWidth = Math.max(1, Math.min(2, size * .025));

    if (state.grid.type === "hex") {
      const { halfHeight, rowStep } = getHexMetrics(size);
      const firstRow = Math.ceil((-state.grid.offsetY - halfHeight) / rowStep) - 1;
      const lastRow = Math.floor((height - state.grid.offsetY - halfHeight) / rowStep) + 1;
      for (let row = firstRow; row <= lastRow; row += 1) {
        const y = state.grid.offsetY + row * rowStep + halfHeight;
        const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
        const firstColumn = Math.ceil((-state.grid.offsetX - rowOffset - size / 2) / size) - 1;
        const lastColumn = Math.floor((width - state.grid.offsetX - rowOffset - size / 2) / size) + 1;
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const x = state.grid.offsetX + rowOffset + column * size + size / 2;
          if (x < -size / 2 || x > width + size / 2 || y < -halfHeight || y > height + halfHeight) continue;
          context.beginPath();
          context.moveTo(x, y - halfHeight);
          context.lineTo(x + size / 2, y - halfHeight / 2);
          context.lineTo(x + size / 2, y + halfHeight / 2);
          context.lineTo(x, y + halfHeight);
          context.lineTo(x - size / 2, y + halfHeight / 2);
          context.lineTo(x - size / 2, y - halfHeight / 2);
          context.closePath();
          context.stroke();
        }
      }
      return;
    }

    const firstX = state.grid.offsetX + Math.floor((-state.grid.offsetX) / size) * size;
    const firstY = state.grid.offsetY + Math.floor((-state.grid.offsetY) / size) * size;
    context.beginPath();
    for (let x = firstX; x <= width; x += size) { context.moveTo(x, 0); context.lineTo(x, height); }
    for (let y = firstY; y <= height; y += size) { context.moveTo(0, y); context.lineTo(width, y); }
    context.stroke();
  }

  function updateGridScaleVisuals(input = null) {
    input?.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.grid.size)} px`);
    editorWindow?.document.querySelectorAll("[data-map-token]").forEach((token) => {
      const multiplier = Number(token.dataset.mapTokenSizeMultiplier) || 1;
      token.style.setProperty("--token-size", `${state.grid.size * multiplier}px`);
      const current = {
        x: Number.parseFloat(token.style.left) || 0,
        y: Number.parseFloat(token.style.top) || 0
      };
      const snapped = snapCreaturePosition(current, state.grid, multiplier);
      state.tokenPositions[token.dataset.mapToken] = snapped;
      token.style.left = `${snapped.x}px`;
      token.style.top = `${snapped.y}px`;
    });
    editorWindow?.document.querySelectorAll("[data-map-shape]").forEach((element) => {
      const shape = state.shapes.items.find((item) => item.id === element.dataset.mapShape);
      if (shape) {
        const metrics = getAreaShapeMetrics(shape, state.grid);
        element.style.setProperty("--shape-size", `${metrics.distancePx}px`);
        element.style.setProperty("--shape-width", `${metrics.width}px`);
        element.style.setProperty("--shape-height", `${metrics.height}px`);
      }
    });
    drawGridCoordinates();
    drawGridLabels();
  }

  function rotateDisplayPoint(point, width, height) {
    const logicalCenterX = width / 2;
    const logicalCenterY = height / 2;
    const sideways = state.rotation === 90 || state.rotation === 270;
    const displayCenterX = (sideways ? height : width) / 2;
    const displayCenterY = (sideways ? width : height) / 2;
    const radians = state.rotation * Math.PI / 180;
    const deltaX = point.x - logicalCenterX;
    const deltaY = point.y - logicalCenterY;
    return {
      x: displayCenterX + deltaX * Math.cos(radians) - deltaY * Math.sin(radians),
      y: displayCenterY + deltaX * Math.sin(radians) + deltaY * Math.cos(radians)
    };
  }

  function getGridLabelData(width, height) {
    const size = state.grid.size;
    if (state.grid.type !== "hex") {
      const firstX = state.grid.offsetX + Math.floor((-state.grid.offsetX) / size) * size;
      const firstY = state.grid.offsetY + Math.floor((-state.grid.offsetY) / size) * size;
      const columns = [];
      const rows = [];
      for (let x = firstX + size / 2; x < width; x += size) if (x >= 0) columns.push({ x, label: toColumnLabel(columns.length) });
      for (let y = firstY + size / 2; y < height; y += size) if (y >= 0) rows.push({ y, label: String(rows.length + 1) });
      return {
        cells: rows.flatMap((row) => columns.map((column) => ({ x: column.x, y: row.y, label: `${column.label}${row.label}` }))),
        columns,
        rows
      };
    }

    const { halfHeight, rowStep } = getHexMetrics(size);
    const firstRow = Math.ceil((-state.grid.offsetY - halfHeight) / rowStep) - 1;
    const lastRow = Math.floor((height - state.grid.offsetY - halfHeight) / rowStep) + 1;
    const visibleRows = [];
    for (let row = firstRow; row <= lastRow; row += 1) {
      const y = state.grid.offsetY + row * rowStep + halfHeight;
      const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
      const firstColumn = Math.ceil((-state.grid.offsetX - rowOffset - size / 2) / size) - 1;
      const lastColumn = Math.floor((width - state.grid.offsetX - rowOffset - size / 2) / size) + 1;
      const cells = [];
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = state.grid.offsetX + rowOffset + column * size + size / 2;
        if (x >= 0 && x <= width && y >= 0 && y <= height) cells.push({ x, column });
      }
      if (y >= 0 && y <= height && cells.length) visibleRows.push({ y, cells });
    }
    const columnIds = [...new Set(visibleRows.flatMap((row) => row.cells.map((cell) => cell.column)))].sort((a, b) => a - b);
    const columnLabels = new Map(columnIds.map((column, index) => [column, toColumnLabel(index)]));
    const columns = columnIds.map((column) => {
      const cell = visibleRows.flatMap((row) => row.cells).find((candidate) => candidate.column === column);
      return { x: cell?.x || 0, label: columnLabels.get(column) };
    });
    const rows = visibleRows.map((row, index) => ({ y: row.y, label: String(index + 1) }));
    const cells = visibleRows.flatMap((row, rowIndex) => row.cells.map((cell) => ({
      x: cell.x,
      y: row.y,
      label: `${columnLabels.get(cell.column)}${rowIndex + 1}`
    })));
    return { cells, columns, rows };
  }

  function drawGridLabels() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-grid-labels]");
    if (!canvas) return;
    const gutter = GRID_LABEL_GUTTER;
    const board = editorWindow.document.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const displayWidth = Number(board?.dataset.displayWidth) || width;
    const displayHeight = Number(board?.dataset.displayHeight) || height;
    const context = prepareCanvas(canvas, displayWidth + gutter * 2, displayHeight + gutter * 2);
    if (!state.grid.visible) return;
    const data = getGridLabelData(width, height);
    const cellFont = Math.max(9, Math.min(16, state.grid.size * .17));
    const edgeFont = Math.max(12, Math.min(21, state.grid.size * .24));
    data.cells.forEach((cell) => {
      const point = rotateDisplayPoint(cell, width, height);
      if (point.x >= 0 && point.x <= displayWidth && point.y >= 0 && point.y <= displayHeight) {
        drawGridText(context, cell.label, gutter + point.x, gutter + point.y, cellFont);
      }
    });
    const sideways = state.rotation === 90 || state.rotation === 270;
    data.columns.forEach((column) => {
      const point = rotateDisplayPoint({ x: column.x, y: height / 2 }, width, height);
      if (sideways) {
        drawGridText(context, column.label, gutter / 2, gutter + clamp(point.y, 0, displayHeight), edgeFont);
        drawGridText(context, column.label, gutter + displayWidth + gutter / 2, gutter + clamp(point.y, 0, displayHeight), edgeFont);
      } else {
        drawGridText(context, column.label, gutter + clamp(point.x, 0, displayWidth), gutter / 2, edgeFont);
        drawGridText(context, column.label, gutter + clamp(point.x, 0, displayWidth), gutter + displayHeight + gutter / 2, edgeFont);
      }
    });
    data.rows.forEach((row) => {
      const point = rotateDisplayPoint({ x: width / 2, y: row.y }, width, height);
      if (sideways) {
        drawGridText(context, row.label, gutter + clamp(point.x, 0, displayWidth), gutter / 2, edgeFont);
        drawGridText(context, row.label, gutter + clamp(point.x, 0, displayWidth), gutter + displayHeight + gutter / 2, edgeFont);
      } else {
        drawGridText(context, row.label, gutter / 2, gutter + clamp(point.y, 0, displayHeight), edgeFont);
        drawGridText(context, row.label, gutter + displayWidth + gutter / 2, gutter + clamp(point.y, 0, displayHeight), edgeFont);
      }
    });
  }

  function paintStroke(context, stroke) {
    const points = stroke?.points || [];
    if (!points.length) return;
    context.save();
    context.globalCompositeOperation = stroke.mode === "erase" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.size;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.restore();
  }

  function drawPaint() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-paint]");
    if (!canvas) return;
    const board = editorWindow.document.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const context = prepareCanvas(canvas, width, height);
    state.paint.strokes.forEach((stroke) => paintStroke(context, stroke));
  }

  function drawFog() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-fog]");
    if (!canvas) return;
    const board = editorWindow.document.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const context = prepareCanvas(canvas, width, height);
    context.globalCompositeOperation = "source-over";
    context.fillStyle = state.fog.translucent ? "rgba(42, 45, 52, .72)" : "rgb(18, 18, 20)";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "destination-out";
    state.fog.revealed.forEach((point) => {
      const gradient = context.createRadialGradient(point.x, point.y, point.r * .45, point.x, point.y, point.r);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      context.fill();
    });
  }

  function togglePanel(name) {
    openPanel = openPanel === name ? "" : name;
    state.openPanel = openPanel;
    persist();
    sync();
  }

  function finishMapSelection(map) {
    setMap(map);
    if (!pickerCallback) return;
    const callback = pickerCallback;
    pickerCallback = null;
    callback(map);
  }

  function selectEncounterChoice(index) {
    const choice = getEncounterMapChoices()[Number(index)];
    if (choice?.map) finishMapSelection(choice.map);
  }

  function selectSavedLayout(key) {
    const layout = state.savedMapLayouts.find((item) => item.key === clean(key));
    if (layout?.map) finishMapSelection(layout.map);
  }

  async function handleImageFile(file) {
    localImageBusy = true;
    localImageError = "";
    sync();
    try {
      const converted = await convertImageFileToWebp(file);
      const map = { name: clean(file.name).replace(/\.[^.]+$/, "") || "Mapa", imageUrl: converted.dataUrl, width: converted.width, height: converted.height, cloudEntryId: "", isPrivate: false };
      localImageBusy = false;
      setMap(map);
      showUploadPrompt(map, converted.blob);
      return map;
    } catch (error) {
      localImageBusy = false;
      localImageError = error?.message || "Imagen no válida.";
      sync();
      options.onNotify?.("No se pudo cargar el mapa", localImageError, "danger");
      return null;
    }
  }

  function showUploadPrompt(map, blob) {
    if (!isOpen()) return;
    const panel = editorWindow.document.querySelector('[data-map-panel="map"]');
    if (!panel) return;
    panel.hidden = false;
    const authenticated = Boolean(options.getAccountSession?.()?.user?.id);
    const prompt = editorWindow.document.createElement("div");
    prompt.className = "combat-map-upload-prompt";
    prompt.innerHTML = `<strong>Mapa listo en WebP</strong><label>Nombre <input data-map-upload-name value="${escapeHtml(map.name)}"></label><label><input type="checkbox" data-map-upload-private> Guardar privado</label><button type="button" data-map-upload-confirm ${authenticated ? "" : "disabled"}>Guardar en nube</button>${authenticated ? "" : "<small>Inicia sesión para guardar en nube.</small>"}`;
    panel.append(prompt);
    prompt.querySelector("[data-map-upload-confirm]")?.addEventListener("click", async () => {
      const button = prompt.querySelector("[data-map-upload-confirm]");
      button.disabled = true;
      button.textContent = "Guardando…";
      try {
        const uploaded = await uploadCloudImage(blob, { width: map.width, height: map.height });
        const name = clean(prompt.querySelector("[data-map-upload-name]")?.value) || map.name;
        const isPublic = prompt.querySelector("[data-map-upload-private]")?.checked !== true;
        const created = await createCloudLibraryEntry({ type: "map", name, imageUrl: uploaded.asset.url, isPublic, payload: { map: { name, imageUrl: uploaded.asset.url, width: map.width, height: map.height } } });
        setMap({ name, imageUrl: uploaded.asset.url, width: map.width, height: map.height, cloudEntryId: created.entry.id, isPrivate: !isPublic }, { retainWorkspace: true });
        prompt.remove();
        options.onCloudChanged?.();
        options.onNotify?.("Mapa guardado", `${name} está ${isPublic ? "público" : "privado"} en la nube.`);
      } catch (error) {
        button.disabled = false;
        button.textContent = "Guardar en nube";
        options.onNotify?.("No se pudo guardar", error?.message || "Error cloud.", "danger");
      }
    });
  }

  function createShapeId() {
    return `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getSelectedShape() {
    return state.shapes.items.find((shape) => shape.id === state.shapes.selectedId) || null;
  }

  function addAreaShape(point = null) {
    const board = editorWindow?.document.querySelector("[data-map-board]");
    if (!board) return;
    const boardWidth = Number(board.dataset.mapWidth) || DEFAULT_WIDTH;
    const boardHeight = Number(board.dataset.mapHeight) || DEFAULT_HEIGHT;
    let position = point;
    if (!position && state.shapes.coordinate) {
      position = resolveGridCoordinatePosition(state.shapes.coordinate, state.grid, boardWidth, boardHeight);
      if (!position) {
        shapeCoordinateError = `La casilla “${state.shapes.coordinate}” no existe en la rejilla visible.`;
        sync();
        return;
      }
    }
    position ||= { x: boardWidth / 2, y: boardHeight / 2 };
    const shape = {
      id: createShapeId(),
      type: state.shapes.type,
      color: state.shapes.color,
      distanceFeet: state.shapes.distanceFeet,
      x: clamp(position.x, 0, boardWidth),
      y: clamp(position.y, 0, boardHeight),
      rotation: 0
    };
    state.shapes.items.push(shape);
    if (state.shapes.items.length > MAX_AREA_SHAPES) state.shapes.items.shift();
    state.shapes.selectedId = shape.id;
    state.shapes.coordinate = "";
    shapeCoordinateError = "";
    persist();
    sync();
  }

  function rotateSelectedShape(delta) {
    const shape = getSelectedShape();
    if (!shape) return;
    shape.rotation = (shape.rotation + delta + 360) % 360;
    persist();
    sync();
  }

  function deleteSelectedShape() {
    if (!state.shapes.selectedId) return;
    state.shapes.items = state.shapes.items.filter((shape) => shape.id !== state.shapes.selectedId);
    state.shapes.selectedId = "";
    persist();
    sync();
  }

  function resetMapCanvas() {
    if (!state.map) return;
    const confirmReset = editorWindow?.confirm?.bind(editorWindow) || window.confirm.bind(window);
    if (!confirmReset("¿Restablecer el canvas? Se borrarán rejilla, niebla, dibujos, formas, posiciones, zoom y rotación de este mapa.")) return;
    const currentKey = getMapLayoutKey(state.map);
    state = normalizeMapEditorState({
      map: state.map,
      savedMapLayouts: state.savedMapLayouts.filter((layout) => layout.key !== currentKey),
      windowBounds: state.windowBounds,
      openPanel: "map",
      healthMode: state.healthMode,
      initiative: state.initiative
    });
    openPanel = "map";
    mapLoadMenuOpen = false;
    persist();
    sync();
  }

  function handleClick(event) {
    if (event.target.closest("[data-map-initiative-order]")) {
      options.handleInitiativeClick?.(event);
      return;
    }
    if (event.target.closest("[data-combat-turn-quick-menu]")) {
      options.handleContextClick?.(event);
      return;
    }
    const action = event.target.closest("[data-map-action]")?.dataset.mapAction;
    const encounterChoice = event.target.closest("[data-map-encounter-choice]")?.dataset.mapEncounterChoice;
    const savedLayout = event.target.closest("[data-map-saved-layout]")?.dataset.mapSavedLayout;
    if (encounterChoice !== undefined) { selectEncounterChoice(encounterChoice); return; }
    if (savedLayout) { selectSavedLayout(savedLayout); return; }
    if (!action) return;
    if (action === "open-map-menu") togglePanel("map");
    if (action === "toggle-map-load-menu") { mapLoadMenuOpen = !mapLoadMenuOpen; sync(); }
    if (action === "open-cloud-map-catalog") options.openCloudMapCatalog?.();
    if (action === "reset-map-canvas") resetMapCanvas();
    if (action === "toggle-grid-menu") togglePanel("grid");
    if (action === "toggle-token-menu") togglePanel("tokens");
    if (action === "toggle-fog-menu") togglePanel("fog");
    if (action === "toggle-paint-menu") togglePanel("paint");
    if (action === "toggle-shapes-menu") togglePanel("shapes");
    if (action === "toggle-initiative-menu") togglePanel("initiative");
    if (action === "reset-fog") { state.fog.revealed = []; persist(); sync(); }
    if (action === "paint-mode") { state.paint.mode = "paint"; persist(); sync(); }
    if (action === "erase-mode") { state.paint.mode = "erase"; persist(); sync(); }
    if (action === "undo-paint") { state.paint.strokes.pop(); persist(); sync(); }
    if (action === "clear-paint") { state.paint.strokes = []; persist(); sync(); }
    if (action === "add-shape") addAreaShape();
    if (action === "rotate-shape-left") rotateSelectedShape(-15);
    if (action === "rotate-shape-right") rotateSelectedShape(15);
    if (action === "delete-shape") deleteSelectedShape();
    if (action === "rotate-left") { state.rotation = (state.rotation + 270) % 360; persist(); sync(); }
    if (action === "rotate-right") { state.rotation = (state.rotation + 90) % 360; persist(); sync(); }
    if (action === "zoom-out") setMapZoom(state.viewport.zoom - .1);
    if (action === "zoom-reset") setMapZoom(1);
    if (action === "zoom-in") setMapZoom(state.viewport.zoom + .1);
    if (action === "all-tokens" || action === "no-tokens") {
      const enabled = action === "all-tokens";
      getCombatants().forEach((combatant) => { state.tokenVisibility[combatant.id] = enabled; });
      persist(); sync();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.closest("[data-map-initiative-order]")) { options.handleInitiativeChange?.(event); return; }
    if (target.closest("[data-combat-turn-quick-menu]")) { options.handleContextChange?.(event); return; }
    if (target.matches("[data-map-file], [data-map-file-hidden]")) { const file = target.files?.[0]; if (file) handleImageFile(file); return; }
    if (target.matches("[data-grid-visible]")) state.grid.visible = target.checked;
    else if (target.matches("[data-grid-type]")) state.grid.type = target.value === "hex" ? "hex" : "square";
    else if (target.matches("[data-grid-color]")) state.grid.color = normalizeColor(target.value, "#ffffff");
    else if (target.matches("[data-grid-size]")) state.grid.size = clamp(target.value, MIN_GRID_SIZE, MAX_GRID_SIZE);
    else if (target.matches("[data-fog-enabled]")) state.fog.enabled = target.checked;
    else if (target.matches("[data-fog-translucent]")) state.fog.translucent = target.checked;
    else if (target.matches("[data-map-token-toggle]")) state.tokenVisibility[target.dataset.mapTokenToggle] = target.checked;
    else if (target.matches("[data-map-health]")) state.healthMode = target.value;
    else if (target.matches("[data-map-initiative]")) state.initiative.visible = target.checked;
    else if (target.matches("[data-map-initiative-position]")) state.initiative.position = target.value;
    else if (target.matches("[data-map-rotation-orientation]")) state.rotationOrientation = target.value === "with-map" ? "with-map" : "upright";
    else if (target.matches("[data-shape-type]")) {
      state.shapes.type = ["circle", "square", "cone"].includes(target.value) ? target.value : "circle";
      const shape = getSelectedShape();
      if (shape) shape.type = state.shapes.type;
    } else if (target.matches("[data-shape-color]")) {
      state.shapes.color = normalizeColor(target.value, "#f97316");
      const shape = getSelectedShape();
      if (shape) shape.color = state.shapes.color;
    } else if (target.matches("[data-shape-distance]")) {
      state.shapes.distanceFeet = clamp(Math.round((Number(target.value) || 5) / 5) * 5, 5, 500);
      const shape = getSelectedShape();
      if (shape) shape.distanceFeet = state.shapes.distanceFeet;
    }
    else return;
    persist(); sync();
  }

  function handleInput(event) {
    if (event.target.closest("[data-map-initiative-order]")) { options.handleInitiativeInput?.(event); return; }
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextInput?.(event); return; }
    if (event.target.matches("[data-map-token-search]")) {
      tokenSearch = clean(event.target.value);
      const query = tokenSearch.toLocaleLowerCase("es");
      editorWindow?.document.querySelectorAll("[data-map-token-row]").forEach((row) => {
        row.hidden = Boolean(query && !clean(row.dataset.mapTokenSearchValue).includes(query));
      });
    } else if (event.target.matches("[data-grid-size]")) {
      state.grid.size = clamp(event.target.value, MIN_GRID_SIZE, MAX_GRID_SIZE);
      updateGridScaleVisuals(event.target);
    } else if (event.target.matches("[data-fog-size]")) {
      state.fog.brushSize = clamp(event.target.value, 12, 300);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.fog.brushSize * 2)} px`);
      persist();
    } else if (event.target.matches("[data-map-zoom]")) {
      setMapZoom(Number(event.target.value) / 100);
    } else if (event.target.matches("[data-map-initiative-size]")) {
      state.initiative.size = clamp(event.target.value, 160, 650);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.initiative.size)} px`);
      editorWindow?.document.querySelector("[data-map-workspace]")?.style.setProperty("--initiative-size", `${state.initiative.size}px`);
      updateMapScale();
      fitInitiativeOrder();
      persist();
    } else if (event.target.matches("[data-paint-size]")) {
      state.paint.size = clamp(event.target.value, MIN_PAINT_SIZE, MAX_PAINT_SIZE);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.paint.size)} px`);
      persist();
    } else if (event.target.matches("[data-paint-color]")) {
      state.paint.color = normalizeColor(event.target.value);
      persist();
    } else if (event.target.matches("[data-shape-coordinate]")) {
      state.shapes.coordinate = clean(event.target.value).toUpperCase().replaceAll(" ", "").slice(0, 12);
      event.target.value = state.shapes.coordinate;
      shapeCoordinateError = "";
      persist();
    }
  }

  function handleKeydown(event) {
    if (event.target.closest("[data-map-initiative-order]")) { options.handleInitiativeKeydown?.(event); return; }
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextKeydown?.(event); return; }
    if ((event.key === "Delete" || event.key === "Backspace") && openPanel === "shapes" && !event.target.matches("input, select, textarea")) {
      event.preventDefault();
      deleteSelectedShape();
    }
  }

  function handleContextMenu(event) {
    if (event.target.closest("[data-map-initiative-order]")) {
      options.handleInitiativeContextMenu?.(event);
      return;
    }
    const token = event.target.closest("[data-map-token]");
    if (!token) return;
    event.preventDefault();
    options.openContextMenu?.(token.dataset.mapToken, event.clientX, event.clientY);
    sync();
    editorWindow.document.querySelector("[data-combat-turn-quick-value]")?.focus({ preventScroll: true });
  }

  function boardPoint(event) {
    const board = editorWindow.document.querySelector("[data-map-board]");
    const rect = board?.getBoundingClientRect();
    if (!rect) return null;
    const width = Number(board.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board.dataset.mapHeight) || DEFAULT_HEIGHT;
    const displayWidth = Number(board.dataset.displayWidth) || width;
    const displayHeight = Number(board.dataset.displayHeight) || height;
    return {
      x: (event.clientX - rect.left) * (displayWidth / rect.width),
      y: (event.clientY - rect.top) * (displayHeight / rect.height),
      width,
      height,
      displayWidth,
      displayHeight,
      board
    };
  }

  function layerPointFromBoard(point) {
    if (!point || !state.rotation) return point;
    const centerX = point.displayWidth / 2;
    const centerY = point.displayHeight / 2;
    const radians = state.rotation * Math.PI / 180;
    const deltaX = point.x - centerX;
    const deltaY = point.y - centerY;
    return {
      ...point,
      x: point.width / 2 + deltaX * Math.cos(radians) + deltaY * Math.sin(radians),
      y: point.height / 2 - deltaX * Math.sin(radians) + deltaY * Math.cos(radians)
    };
  }

  function layerPoint(event) {
    return layerPointFromBoard(boardPoint(event));
  }

  function updateShapeElement(shape) {
    const element = editorWindow.document.querySelector(`[data-map-shape="${CSS.escape(shape.id)}"]`);
    if (!element) return;
    element.style.left = `${shape.x}px`;
    element.style.top = `${shape.y}px`;
    element.style.transform = `translate(${shape.type === "cone" ? "0%" : "-50%"},-50%) rotate(${shape.rotation}deg)`;
    element.style.setProperty("--shape-label-counter-rotation", `${state.rotationOrientation === "upright" ? -(state.rotation + shape.rotation) : 0}deg`);
  }

  function showSelectedShape(id) {
    state.shapes.selectedId = id;
    const shape = getSelectedShape();
    if (shape) {
      state.shapes.type = shape.type;
      state.shapes.color = shape.color;
      state.shapes.distanceFeet = shape.distanceFeet;
      const typeInput = editorWindow.document.querySelector("[data-shape-type]");
      const colorInput = editorWindow.document.querySelector("[data-shape-color]");
      const distanceInput = editorWindow.document.querySelector("[data-shape-distance]");
      if (typeInput) typeInput.value = shape.type;
      if (colorInput) colorInput.value = shape.color;
      if (distanceInput) distanceInput.value = String(shape.distanceFeet);
    }
    editorWindow.document.querySelectorAll("[data-map-shape]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.mapShape === id);
    });
  }

  function hideBrushCursor() {
    editorWindow?.document.querySelector("[data-map-brush-cursor]")?.classList.remove("is-visible");
  }

  function updateBrushCursor(event) {
    const isPaint = openPanel === "paint";
    const isFog = openPanel === "fog" && state.fog.enabled;
    const cursor = editorWindow?.document.querySelector("[data-map-brush-cursor]");
    if (!cursor || (!isPaint && !isFog) || !event.target.closest?.("[data-map-board]")) {
      hideBrushCursor();
      return;
    }
    const point = layerPoint(event);
    if (!point) return;
    const size = isFog ? state.fog.brushSize * 2 : state.paint.size;
    cursor.style.left = `${point.x}px`;
    cursor.style.top = `${point.y}px`;
    cursor.style.width = `${size}px`;
    cursor.style.height = `${size}px`;
    cursor.classList.add("is-visible");
  }

  function handlePointerDown(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) return;
    options.closeContextMenu?.();
    editorWindow.document.querySelector("[data-combat-turn-quick-menu]")?.remove();
    if (event.button !== 0) return;
    const initiativeResizer = event.target.closest("[data-map-initiative-resizer]");
    if (initiativeResizer) {
      activeDrag = { type: "initiative-resize", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, size: state.initiative.size, position: state.initiative.position };
      initiativeResizer.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!event.target.closest("[data-map-board]")) return;
    const token = event.target.closest("[data-map-token]");
    const point = boardPoint(event);
    if (!point) return;
    if (token) {
      activeDrag = { type: "token", id: token.dataset.mapToken, pointerId: event.pointerId };
      token.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const shapeElement = event.target.closest("[data-map-shape]");
    if (openPanel === "shapes" && shapeElement) {
      const shape = state.shapes.items.find((item) => item.id === shapeElement.dataset.mapShape);
      const shapePoint = layerPoint(event);
      if (!shape || !shapePoint) return;
      showSelectedShape(shape.id);
      if (event.target.closest("[data-map-shape-rotate]")) {
        activeDrag = {
          type: "shape-rotate",
          id: shape.id,
          pointerId: event.pointerId,
          startAngle: Math.atan2(shapePoint.y - shape.y, shapePoint.x - shape.x) * 180 / Math.PI,
          rotation: shape.rotation
        };
      } else {
        activeDrag = { type: "shape", id: shape.id, pointerId: event.pointerId, deltaX: shapePoint.x - shape.x, deltaY: shapePoint.y - shape.y };
      }
      shapeElement.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (openPanel === "paint" && event.target.matches("[data-map-paint]")) {
      const paintPoint = layerPoint(event);
      if (!paintPoint) return;
      const stroke = { color: state.paint.color, size: state.paint.size, mode: state.paint.mode, points: [{ x: paintPoint.x, y: paintPoint.y }] };
      state.paint.strokes.push(stroke);
      activeDrag = { type: "paint", pointerId: event.pointerId, stroke };
      event.target.setPointerCapture?.(event.pointerId);
      drawPaint();
      event.preventDefault();
      return;
    }
    if (state.fog.enabled && openPanel === "fog" && event.target.matches("[data-map-fog]")) {
      activeDrag = { type: "fog", pointerId: event.pointerId };
      revealFog(layerPoint(event));
      event.preventDefault();
      return;
    }
    if (openPanel === "shapes" && !shapeElement) {
      addAreaShape(layerPoint(event));
      event.preventDefault();
      return;
    }
    const gridPanel = editorWindow.document.querySelector('[data-map-panel="grid"]');
    if (state.grid.visible && gridPanel?.hidden === false) {
      const gridPoint = layerPoint(event);
      activeDrag = { type: "grid", pointerId: event.pointerId, startX: gridPoint.x, startY: gridPoint.y, offsetX: state.grid.offsetX, offsetY: state.grid.offsetY };
      event.preventDefault();
    }
  }

  function handlePointerMove(event) {
    updateBrushCursor(event);
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    if (activeDrag.type === "initiative-resize") {
      const horizontal = activeDrag.position === "left" || activeDrag.position === "right";
      const delta = horizontal ? event.clientX - activeDrag.startX : event.clientY - activeDrag.startY;
      const direction = activeDrag.position === "right" || activeDrag.position === "bottom" ? -1 : 1;
      state.initiative.size = clamp(activeDrag.size + delta * direction, 160, 650);
      editorWindow?.document.querySelector("[data-map-workspace]")?.style.setProperty("--initiative-size", `${state.initiative.size}px`);
      updateMapScale();
      fitInitiativeOrder();
      event.preventDefault();
      return;
    }
    const point = layerPoint(event);
    if (!point) return;
    if (activeDrag.type === "token") {
      state.tokenPositions[activeDrag.id] = { x: clamp(point.x, 0, point.width), y: clamp(point.y, 0, point.height) };
      const token = editorWindow.document.querySelector(`[data-map-token="${CSS.escape(activeDrag.id)}"]`);
      if (token) { token.style.left = `${state.tokenPositions[activeDrag.id].x}px`; token.style.top = `${state.tokenPositions[activeDrag.id].y}px`; }
    } else if (activeDrag.type === "fog") {
      revealFog(point);
    } else if (activeDrag.type === "paint") {
      const points = activeDrag.stroke.points;
      const previous = points[points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) >= Math.max(1, activeDrag.stroke.size * .08)) {
        points.push({ x: point.x, y: point.y });
        const canvas = editorWindow.document.querySelector("[data-map-paint]");
        const context = canvas?.getContext("2d");
        if (context) paintStroke(context, { ...activeDrag.stroke, points: [previous, points[points.length - 1]] });
      }
    } else if (activeDrag.type === "shape") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape) {
        shape.x = clamp(point.x - activeDrag.deltaX, 0, point.width);
        shape.y = clamp(point.y - activeDrag.deltaY, 0, point.height);
        updateShapeElement(shape);
      }
    } else if (activeDrag.type === "shape-rotate") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape) {
        const angle = Math.atan2(point.y - shape.y, point.x - shape.x) * 180 / Math.PI;
        shape.rotation = (activeDrag.rotation + angle - activeDrag.startAngle + 360) % 360;
        updateShapeElement(shape);
      }
    } else if (activeDrag.type === "grid") {
      state.grid.offsetX = activeDrag.offsetX + point.x - activeDrag.startX;
      state.grid.offsetY = activeDrag.offsetY + point.y - activeDrag.startY;
      drawGridCoordinates();
      drawGridLabels();
    }
    event.preventDefault();
  }

  function revealFog(point) {
    state.fog.revealed.push({ x: point.x, y: point.y, r: state.fog.brushSize });
    if (state.fog.revealed.length > 6000) state.fog.revealed.splice(0, 500);
    drawFog();
  }

  function handlePointerUp(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    if (activeDrag.type === "token") {
      const combatant = getCombatants().find((entry) => entry.id === activeDrag.id);
      state.tokenPositions[activeDrag.id] = snapCreaturePosition(
        state.tokenPositions[activeDrag.id],
        state.grid,
        getCreatureSizeMultiplier(combatant)
      );
    } else if (activeDrag.type === "shape") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape) {
        const snapped = snapTokenPosition(shape, state.grid);
        const board = editorWindow?.document.querySelector("[data-map-board]");
        const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
        const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
        shape.x = clamp(snapped.x, 0, width);
        shape.y = clamp(snapped.y, 0, height);
      }
    } else if (activeDrag.type === "paint") {
      state.paint.strokes = normalizePaintStrokes(state.paint.strokes);
    }
    activeDrag = null;
    persist(); sync();
  }

  function chooseMap(callback) {
    pickerCallback = typeof callback === "function" ? callback : null;
    open();
    window.setTimeout(() => {
      if (!isOpen()) return;
      openPanel = "map";
      state.openPanel = openPanel;
      persist();
      sync();
    }, 0);
  }

  return { open, sync, isOpen, getSaveData, applySave, setMap, selectMap: finishMapSelection, getMap, chooseMap, convertAndSetFile: handleImageFile };
}
