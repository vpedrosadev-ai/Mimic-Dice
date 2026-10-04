import {
  createCloudLibraryEntry,
  getCloudLibraryEntry,
  listCloudLibraryEntries,
  listPublicCloudLibraryEntries,
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
    const { map: normalizedMap, savedMapLayouts, windowBounds, viewport, openPanel, ...workspace } = normalized;
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
  const distanceFeet = clamp(Math.round((Number(shape?.distanceFeet) || 5) / 5) * 5, 5, 500);
  const cells = distanceFeet / 5;
  const distancePx = cells * clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  return {
    distanceFeet,
    cells,
    distancePx,
    width: distancePx * 2,
    height: distancePx * 2
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
    openPanel: ["map", "grid", "tokens", "paint", "shapes"].includes(source.openPanel) ? source.openPanel : "",
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
      scrollTop: Math.max(0, Number(source.viewport?.scrollTop) || 0)
    },
    rotation: [0, 90, 180, 270].includes(Number(source.rotation)) ? Number(source.rotation) : 0,
    grid: {
      visible: source.grid?.visible === true,
      type: source.grid?.type === "hex" ? "hex" : "square",
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
      position: ["top", "bottom", "left", "right"].includes(source.initiative?.position) ? source.initiative.position : "top"
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

export async function convertImageFileToWebp(file, quality = 0.9) {
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
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen convertida.")), { once: true });
      reader.readAsDataURL(blob);
    });
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
  let cloudEntries = [];
  let cloudBusy = false;
  let cloudError = "";
  let localImageBusy = false;
  let localImageError = "";
  let shapeCoordinateError = "";

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

  function getTokenEnabled(combatant) {
    return Object.prototype.hasOwnProperty.call(state.tokenVisibility, combatant.id)
      ? state.tokenVisibility[combatant.id] === true
      : isDefaultTokenVisible(combatant);
  }

  function getDefaultPosition(index) {
    const size = state.grid.size;
    return snapTokenPosition({ x: size * (1.5 + index % 8), y: size * (1.5 + Math.floor(index / 8)) }, state.grid);
  }

  function getTokenPosition(combatant, index) {
    return state.tokenPositions[combatant.id] || getDefaultPosition(index);
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
    const { map, savedMapLayouts, windowBounds, viewport, openPanel: panel, ...workspace } = state;
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
      viewport: state.viewport,
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
        viewport: state.viewport,
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
    popup.document.addEventListener("scroll", handleViewportScroll, true);
    popup.addEventListener("beforeunload", () => { captureWindowBounds(); close(); });
    popup.addEventListener("resize", () => { captureWindowBounds(); drawGridCoordinates(); drawPaint(); drawFog(); });
  }

  function renderToolbar() {
    return `<header class="combat-map-toolbar">
      <button type="button" data-map-action="open-map-menu">Cargar mapa</button>
      <button type="button" data-map-action="toggle-grid-menu" class="${state.grid.visible ? "is-active" : ""}">Rejilla</button>
      <button type="button" data-map-action="toggle-token-menu">Peanas</button>
      <button type="button" data-map-action="toggle-fog" class="${state.fog.enabled ? "is-active" : ""}">Niebla</button>
      ${state.fog.enabled ? `<label>Pincel <input type="range" min="12" max="300" value="${state.fog.brushSize}" data-fog-size></label><button type="button" data-map-action="reset-fog">Reiniciar niebla</button>` : ""}
      <button type="button" data-map-action="toggle-paint-menu" class="${openPanel === "paint" ? "is-active" : ""}">Pintar</button>
      <button type="button" data-map-action="toggle-shapes-menu" class="${openPanel === "shapes" ? "is-active" : ""}">Formas</button>
      <label>Vida <select data-map-health><option value="all" ${state.healthMode === "all" ? "selected" : ""}>Todas</option><option value="none" ${state.healthMode === "none" ? "selected" : ""}>Ninguna</option><option value="allies" ${state.healthMode === "allies" ? "selected" : ""}>Aliadas</option><option value="neutral" ${state.healthMode === "neutral" ? "selected" : ""}>Neutrales</option><option value="enemies" ${state.healthMode === "enemies" ? "selected" : ""}>Enemigas</option></select></label>
      <button type="button" data-map-action="rotate">Rotar 90°</button>
      <label class="combat-map-toolbar__initiative"><input type="checkbox" data-map-initiative ${state.initiative.visible ? "checked" : ""}> Iniciativa</label>
      <select data-map-initiative-position ${state.initiative.visible ? "" : "disabled"}><option value="top" ${state.initiative.position === "top" ? "selected" : ""}>Arriba</option><option value="bottom" ${state.initiative.position === "bottom" ? "selected" : ""}>Abajo</option><option value="left" ${state.initiative.position === "left" ? "selected" : ""}>Izquierda</option><option value="right" ${state.initiative.position === "right" ? "selected" : ""}>Derecha</option></select>
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
      <h2>Cargar mapa</h2>
      ${localImageBusy ? `<p class="combat-map-converting" role="status">Convirtiendo imagen a WebP…</p>` : ""}
      ${localImageError ? `<p class="combat-map-error" role="alert">${escapeHtml(localImageError)}</p>` : ""}
      ${savedMaps.length ? `<div class="combat-map-priority-list"><h3>Mapas guardados en esta campaña</h3><div class="combat-map-cloud-grid">${savedMaps.map((layout) => `<button type="button" data-map-saved-layout="${escapeHtml(layout.key)}">${layout.map.imageUrl ? `<img src="${escapeHtml(layout.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(layout.map.name)}</span><small>Disposición guardada</small></button>`).join("")}</div></div>` : ""}
      ${encounterMaps.length ? `<div class="combat-map-priority-list"><h3>Mapas de encuentros cargados</h3><div class="combat-map-cloud-grid">${encounterMaps.map((choice, index) => `<button type="button" data-map-encounter-choice="${index}">${choice.map.imageUrl ? `<img src="${escapeHtml(choice.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(choice.map.name)}</span><small>${escapeHtml(choice.encounterName || "Encuentro")}</small></button>`).join("")}</div></div>` : ""}
      <label class="combat-map-file-button">Desde equipo<input type="file" accept="image/*" data-map-file></label>
      <button type="button" data-map-action="load-cloud-list">Desde la nube</button>
      <p class="combat-map-help">Imágenes locales se convierten a WebP. Al subir, mapa será público por defecto.</p>
      <div data-map-cloud-list></div>
    </section>`;
  }

  function renderGridMenu() {
    return `<section class="combat-map-popover" data-map-panel="grid" ${openPanel === "grid" ? "" : "hidden"}>
      <h2>Rejilla</h2>
      <label><input type="checkbox" data-grid-visible ${state.grid.visible ? "checked" : ""}> Mostrar rejilla</label>
      <label>Tipo <select data-grid-type><option value="square" ${state.grid.type === "square" ? "selected" : ""}>Cuadrada</option><option value="hex" ${state.grid.type === "hex" ? "selected" : ""}>Hexagonal</option></select></label>
      <label>Tamaño <input type="range" min="${MIN_GRID_SIZE}" max="${MAX_GRID_SIZE}" value="${state.grid.size}" data-grid-size><output>${Math.round(state.grid.size)} px</output></label>
      <p class="combat-map-help">Arrastra sobre el mapa con panel abierto para desplazar rejilla.</p>
    </section>`;
  }

  function renderTokenMenu() {
    const rows = getCombatants().map((combatant) => `<label><input type="checkbox" data-map-token-toggle="${escapeHtml(combatant.id)}" ${getTokenEnabled(combatant) ? "checked" : ""}><span>${escapeHtml(combatant.numPeana || "—")}</span> ${escapeHtml(combatant.nombre || "Entidad")}</label>`).join("");
    return `<section class="combat-map-popover combat-map-popover--tokens" data-map-panel="tokens" ${openPanel === "tokens" ? "" : "hidden"}><h2>Peanas</h2><div class="combat-map-token-actions"><button type="button" data-map-action="all-tokens">Marcar todas</button><button type="button" data-map-action="no-tokens">Desmarcar todas</button></div><div class="combat-map-token-checklist">${rows || "<p>No hay entidades.</p>"}</div></section>`;
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
    const distanceLabel = state.shapes.type === "cone" ? "Longitud" : "Radio";
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
      <p class="combat-map-help">La casilla es opcional: centra círculos y cuadrados; en conos coloca la punta corta. Cada 5 pies equivalen a una casilla.</p>
    </section>`;
  }

  function renderInitiative() {
    if (!state.initiative.visible) return "";
    const combatants = getCombatants().filter(getTokenEnabled).sort((a, b) => (Number(b.iniactiva) || 0) - (Number(a.iniactiva) || 0));
    return `<aside class="combat-map-initiative combat-map-initiative--${state.initiative.position}">${combatants.map((combatant) => `<article class="combat-map-initiative__token ${combatant.id === options.getActiveCombatantId?.() ? "is-active" : ""}"><span>${renderPortrait(combatant)}</span><strong>${escapeHtml(combatant.numPeana || "—")}</strong><small>${escapeHtml(combatant.nombre || "Entidad")}</small></article>`).join("") || "<p>Sin iniciativa.</p>"}</aside>`;
  }

  function renderPortrait(combatant) {
    const url = clean(combatant.tokenUrl);
    return url ? `<img src="${escapeHtml(url)}" alt="" draggable="false">` : `<i>${escapeHtml(getInitials(combatant.nombre))}</i>`;
  }

  function showHealth(combatant) {
    return state.healthMode === "all" || state.healthMode === getSide(combatant);
  }

  function renderTokens() {
    return getCombatants().map((combatant, index) => ({ combatant, index })).filter(({ combatant }) => getTokenEnabled(combatant)).map(({ combatant, index }) => {
      const position = getTokenPosition(combatant, index);
      const maxHp = Math.max(1, Number(combatant.pgMax) || 1);
      const hp = clamp(combatant.pgAct === "" ? maxHp : combatant.pgAct, 0, maxHp);
      const conditions = getConditions(combatant);
      return `<div class="combat-map-token combat-map-token--${getSide(combatant)}" data-map-token="${escapeHtml(combatant.id)}" style="--token-size:${state.grid.size}px;left:${position.x}px;top:${position.y}px" title="${escapeHtml(combatant.nombre || "Entidad")}">
        <span class="combat-map-token__portrait">${renderPortrait(combatant)}</span><strong>${escapeHtml(combatant.numPeana || "—")}</strong>
        ${showHealth(combatant) ? `<span class="combat-map-token__health"><i style="width:${(hp / maxHp) * 100}%"></i></span>` : ""}
        ${conditions.length ? `<span class="combat-map-token__statuses">${conditions.map((status) => `<em>${escapeHtml(status)}</em>`).join("")}</span>` : ""}
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
          : `<polygon points="100,100 196,52 196,148"></polygon>`;
      return `<div class="combat-map-area-shape ${selected ? "is-selected" : ""}" data-map-shape="${escapeHtml(shape.id)}" style="--shape-color:${shape.color};--shape-size:${metrics.distancePx}px;left:${shape.x}px;top:${shape.y}px;transform:translate(-50%,-50%) rotate(${shape.rotation}deg)" title="${metrics.distanceFeet} pies">
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
    return `<div class="combat-map-viewport"><div class="combat-map-board" data-map-board style="width:${width}px;height:${height}px;aspect-ratio:${width}/${height}">
      <div class="combat-map-rotating-layers" style="transform:rotate(${state.rotation}deg)">
        ${map?.imageUrl ? `<img class="combat-map-image" src="${escapeHtml(map.imageUrl)}" alt="${escapeHtml(map.name)}" draggable="false">` : `<div class="combat-map-empty"><strong>${map ? "Mapa privado" : "Sin mapa"}</strong><span>${map ? "Inicia sesión con la cuenta propietaria para cargarlo." : "Carga una imagen desde equipo o nube."}</span></div>`}
        <div class="combat-map-grid ${state.grid.visible ? "is-visible" : ""}" data-map-grid></div>
        <canvas class="combat-map-grid-coordinates ${state.grid.visible ? "is-visible" : ""}" data-map-grid-coordinates width="${width}" height="${height}"></canvas>
        <canvas class="combat-map-paint ${openPanel === "paint" ? "is-editing" : ""} ${state.paint.mode === "erase" ? "is-erasing" : ""}" data-map-paint width="${width}" height="${height}"></canvas>
        <div class="combat-map-shape-layer ${openPanel === "shapes" ? "is-editing" : ""}" data-map-shape-layer>${renderAreaShapes()}</div>
        <canvas class="combat-map-fog ${state.fog.enabled ? "is-visible" : ""} ${state.fog.enabled && !openPanel ? "is-editing" : ""}" data-map-fog width="${width}" height="${height}"></canvas>
      </div>
      <div class="combat-map-token-layer">${renderTokens()}</div>
    </div></div>`;
  }

  function render() {
    return `<div class="combat-map-editor combat-map-editor--initiative-${state.initiative.visible ? state.initiative.position : "none"}">${renderToolbar()}${renderMapMenu()}${renderGridMenu()}${renderTokenMenu()}${renderPaintMenu()}${renderShapesMenu()}${renderInitiative()}${renderStage()}${options.renderContextMenu?.(editorWindow) || ""}<input type="file" accept="image/*" data-map-file-hidden hidden></div>`;
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
    drawGridCoordinates();
    drawPaint();
    drawFog();
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
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = Math.max(2, fontSize * .22);
    context.strokeStyle = "rgba(0, 0, 0, .9)";
    context.fillStyle = "rgba(255, 255, 255, .95)";
    context.strokeText(value, x, y);
    context.fillText(value, x, y);
  }

  function drawGridCoordinates() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-grid-coordinates]");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.grid.visible) return;

    const size = state.grid.size;
    const width = canvas.width;
    const height = canvas.height;
    const cellFont = Math.max(9, Math.min(16, size * .17));
    const edgeFont = Math.max(11, Math.min(20, size * .23));
    context.strokeStyle = "rgba(255, 255, 255, .58)";
    context.lineWidth = Math.max(1, Math.min(2, size * .025));

    if (state.grid.type === "hex") {
      const { halfHeight, rowStep } = getHexMetrics(size);
      const firstRow = Math.ceil((-state.grid.offsetY - halfHeight) / rowStep) - 1;
      const lastRow = Math.floor((height - state.grid.offsetY - halfHeight) / rowStep) + 1;
      const rows = [];
      for (let row = firstRow; row <= lastRow; row += 1) {
        const y = state.grid.offsetY + row * rowStep + halfHeight;
        const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
        const firstColumn = Math.ceil((-state.grid.offsetX - rowOffset - size / 2) / size) - 1;
        const lastColumn = Math.floor((width - state.grid.offsetX - rowOffset - size / 2) / size) + 1;
        const cells = [];
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const x = state.grid.offsetX + rowOffset + column * size + size / 2;
          if (x < -size / 2 || x > width + size / 2 || y < -halfHeight || y > height + halfHeight) continue;
          cells.push({ x, column });
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
        if (cells.length) rows.push({ y, cells });
      }
      const visibleRows = rows.filter((row) => row.y >= 0 && row.y <= height);
      const visibleColumns = [...new Set(visibleRows.flatMap((row) => row.cells.filter((cell) => cell.x >= 0 && cell.x <= width).map((cell) => cell.column)))].sort((a, b) => a - b);
      const columnLabels = new Map(visibleColumns.map((column, index) => [column, toColumnLabel(index)]));
      visibleRows.forEach((row, rowIndex) => {
        row.cells.filter((cell) => cell.x >= 0 && cell.x <= width).forEach((cell) => {
          drawGridText(context, `${columnLabels.get(cell.column)}${rowIndex + 1}`, cell.x, row.y, cellFont);
        });
        drawGridText(context, String(rowIndex + 1), edgeFont, clamp(row.y, edgeFont, height - edgeFont), edgeFont);
        drawGridText(context, String(rowIndex + 1), width - edgeFont, clamp(row.y, edgeFont, height - edgeFont), edgeFont);
      });
      const referenceRow = visibleRows[0];
      referenceRow?.cells.filter((cell) => cell.x >= 0 && cell.x <= width).forEach((cell) => {
        const label = columnLabels.get(cell.column);
        drawGridText(context, label, cell.x, edgeFont, edgeFont);
        drawGridText(context, label, cell.x, height - edgeFont, edgeFont);
      });
      return;
    }

    const firstX = state.grid.offsetX + Math.floor((-state.grid.offsetX) / size) * size;
    const firstY = state.grid.offsetY + Math.floor((-state.grid.offsetY) / size) * size;
    context.beginPath();
    for (let x = firstX; x <= width; x += size) { context.moveTo(x, 0); context.lineTo(x, height); }
    for (let y = firstY; y <= height; y += size) { context.moveTo(0, y); context.lineTo(width, y); }
    context.stroke();
    const xCenters = [];
    const yCenters = [];
    for (let x = firstX + size / 2; x < width; x += size) if (x >= 0) xCenters.push(x);
    for (let y = firstY + size / 2; y < height; y += size) if (y >= 0) yCenters.push(y);
    yCenters.forEach((y, row) => {
      xCenters.forEach((x, column) => {
        drawGridText(context, `${toColumnLabel(column)}${row + 1}`, x, y, cellFont);
      });
      drawGridText(context, String(row + 1), edgeFont, clamp(y, edgeFont, height - edgeFont), edgeFont);
      drawGridText(context, String(row + 1), width - edgeFont, clamp(y, edgeFont, height - edgeFont), edgeFont);
    });
    xCenters.forEach((x, column) => {
      const label = toColumnLabel(column);
      drawGridText(context, label, x, edgeFont, edgeFont);
      drawGridText(context, label, x, height - edgeFont, edgeFont);
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
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    state.paint.strokes.forEach((stroke) => paintStroke(context, stroke));
  }

  function drawFog() {
    if (!isOpen()) return;
    const canvas = editorWindow.document.querySelector("[data-map-fog]");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "rgba(42, 45, 52, .96)";
    context.fillRect(0, 0, canvas.width, canvas.height);
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

  async function loadCloudEntries() {
    cloudBusy = true;
    cloudError = "";
    renderCloudList();
    try {
      const [publicResult, ownedResult] = await Promise.all([
        listPublicCloudLibraryEntries("map"),
        options.getAccountSession?.()?.user?.id ? listCloudLibraryEntries() : Promise.resolve({ entries: [] })
      ]);
      const all = [...(ownedResult.entries || []).filter((entry) => entry.type === "map"), ...(publicResult.entries || []).filter((entry) => entry.type === "map")];
      cloudEntries = [...new Map(all.map((entry) => [entry.id, entry])).values()];
    } catch (error) {
      cloudError = error?.message || "No se pudieron cargar los mapas.";
    } finally {
      cloudBusy = false;
      renderCloudList();
    }
  }

  function renderCloudList() {
    if (!isOpen()) return;
    const target = editorWindow.document.querySelector("[data-map-cloud-list]");
    if (!target) return;
    target.innerHTML = cloudBusy ? "<p>Cargando…</p>" : cloudError ? `<p class="combat-map-error">${escapeHtml(cloudError)}</p>` : `<div class="combat-map-cloud-grid">${cloudEntries.map((entry) => `<button type="button" data-map-cloud-entry="${escapeHtml(entry.id)}"><img src="${escapeHtml(entry.imageUrl)}" alt=""><span>${escapeHtml(entry.name)}</span><small>${entry.isPublic ? "Público" : "Privado"}</small></button>`).join("") || "<p>No hay mapas disponibles.</p>"}</div>`;
  }

  async function selectCloudEntry(entryId) {
    try {
      const result = await getCloudLibraryEntry(entryId);
      const map = normalizeMapReference({
        ...(result.payload?.map || { name: result.entry?.name, imageUrl: result.entry?.imageUrl }),
        name: result.entry?.name || result.payload?.map?.name,
        cloudEntryId: entryId,
        isPrivate: result.entry?.isPublic !== true
      });
      if (!map) throw new Error("El mapa cloud no contiene una imagen válida.");
      map.cloudEntryId = entryId;
      finishMapSelection(map);
    } catch (error) {
      cloudError = error?.message || "No se pudo abrir el mapa.";
      renderCloudList();
    }
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
    let position = point;
    if (!position && state.shapes.coordinate) {
      position = resolveGridCoordinatePosition(state.shapes.coordinate, state.grid, board.offsetWidth, board.offsetHeight);
      if (!position) {
        shapeCoordinateError = `La casilla “${state.shapes.coordinate}” no existe en la rejilla visible.`;
        sync();
        return;
      }
    }
    position ||= { x: board.offsetWidth / 2, y: board.offsetHeight / 2 };
    const shape = {
      id: createShapeId(),
      type: state.shapes.type,
      color: state.shapes.color,
      distanceFeet: state.shapes.distanceFeet,
      x: clamp(position.x, 0, board.offsetWidth),
      y: clamp(position.y, 0, board.offsetHeight),
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

  function handleClick(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) {
      options.handleContextClick?.(event);
      return;
    }
    const action = event.target.closest("[data-map-action]")?.dataset.mapAction;
    const cloudEntry = event.target.closest("[data-map-cloud-entry]")?.dataset.mapCloudEntry;
    const encounterChoice = event.target.closest("[data-map-encounter-choice]")?.dataset.mapEncounterChoice;
    const savedLayout = event.target.closest("[data-map-saved-layout]")?.dataset.mapSavedLayout;
    if (cloudEntry) { selectCloudEntry(cloudEntry); return; }
    if (encounterChoice !== undefined) { selectEncounterChoice(encounterChoice); return; }
    if (savedLayout) { selectSavedLayout(savedLayout); return; }
    if (!action) return;
    if (action === "open-map-menu") togglePanel("map");
    if (action === "toggle-grid-menu") togglePanel("grid");
    if (action === "toggle-token-menu") togglePanel("tokens");
    if (action === "toggle-paint-menu") togglePanel("paint");
    if (action === "toggle-shapes-menu") togglePanel("shapes");
    if (action === "load-cloud-list") loadCloudEntries();
    if (action === "toggle-fog") { state.fog.enabled = !state.fog.enabled; openPanel = ""; state.openPanel = ""; persist(); sync(); }
    if (action === "reset-fog") { state.fog.revealed = []; persist(); sync(); }
    if (action === "paint-mode") { state.paint.mode = "paint"; persist(); sync(); }
    if (action === "erase-mode") { state.paint.mode = "erase"; persist(); sync(); }
    if (action === "undo-paint") { state.paint.strokes.pop(); persist(); sync(); }
    if (action === "clear-paint") { state.paint.strokes = []; persist(); sync(); }
    if (action === "add-shape") addAreaShape();
    if (action === "rotate-shape-left") rotateSelectedShape(-15);
    if (action === "rotate-shape-right") rotateSelectedShape(15);
    if (action === "delete-shape") deleteSelectedShape();
    if (action === "rotate") { state.rotation = (state.rotation + 90) % 360; persist(); sync(); }
    if (action === "all-tokens" || action === "no-tokens") {
      const enabled = action === "all-tokens";
      getCombatants().forEach((combatant) => { state.tokenVisibility[combatant.id] = enabled; });
      persist(); sync();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.closest("[data-combat-turn-quick-menu]")) { options.handleContextChange?.(event); return; }
    if (target.matches("[data-map-file], [data-map-file-hidden]")) { const file = target.files?.[0]; if (file) handleImageFile(file); return; }
    if (target.matches("[data-grid-visible]")) state.grid.visible = target.checked;
    else if (target.matches("[data-grid-type]")) state.grid.type = target.value === "hex" ? "hex" : "square";
    else if (target.matches("[data-map-token-toggle]")) state.tokenVisibility[target.dataset.mapTokenToggle] = target.checked;
    else if (target.matches("[data-map-health]")) state.healthMode = target.value;
    else if (target.matches("[data-map-initiative]")) state.initiative.visible = target.checked;
    else if (target.matches("[data-map-initiative-position]")) state.initiative.position = target.value;
    else if (target.matches("[data-shape-type]")) state.shapes.type = ["circle", "square", "cone"].includes(target.value) ? target.value : "circle";
    else if (target.matches("[data-shape-color]")) state.shapes.color = normalizeColor(target.value, "#f97316");
    else if (target.matches("[data-shape-distance]")) state.shapes.distanceFeet = clamp(Math.round((Number(target.value) || 5) / 5) * 5, 5, 500);
    else return;
    persist(); sync();
  }

  function handleInput(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextInput?.(event); return; }
    if (event.target.matches("[data-grid-size]")) {
      state.grid.size = clamp(event.target.value, MIN_GRID_SIZE, MAX_GRID_SIZE);
      persist(); sync();
    } else if (event.target.matches("[data-fog-size]")) {
      state.fog.brushSize = clamp(event.target.value, 12, 300);
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
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextKeydown?.(event); return; }
    if ((event.key === "Delete" || event.key === "Backspace") && openPanel === "shapes" && !event.target.matches("input, select, textarea")) {
      event.preventDefault();
      deleteSelectedShape();
    }
  }

  function handleContextMenu(event) {
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
    return { x: (event.clientX - rect.left) * (board.offsetWidth / rect.width), y: (event.clientY - rect.top) * (board.offsetHeight / rect.height), board };
  }

  function layerPointFromBoard(point) {
    if (!point || !state.rotation) return point;
    const centerX = point.board.offsetWidth / 2;
    const centerY = point.board.offsetHeight / 2;
    const radians = state.rotation * Math.PI / 180;
    const deltaX = point.x - centerX;
    const deltaY = point.y - centerY;
    return {
      ...point,
      x: centerX + deltaX * Math.cos(radians) + deltaY * Math.sin(radians),
      y: centerY - deltaX * Math.sin(radians) + deltaY * Math.cos(radians)
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
    element.style.transform = `translate(-50%,-50%) rotate(${shape.rotation}deg)`;
  }

  function showSelectedShape(id) {
    state.shapes.selectedId = id;
    editorWindow.document.querySelectorAll("[data-map-shape]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.mapShape === id);
    });
  }

  function handlePointerDown(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) return;
    options.closeContextMenu?.();
    editorWindow.document.querySelector("[data-combat-turn-quick-menu]")?.remove();
    if (event.button !== 0) return;
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
    if (state.fog.enabled && !openPanel && event.target.matches("[data-map-fog]")) {
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
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const point = activeDrag.type === "token" ? boardPoint(event) : layerPoint(event);
    if (!point) return;
    if (activeDrag.type === "token") {
      state.tokenPositions[activeDrag.id] = { x: clamp(point.x, 0, point.board.offsetWidth), y: clamp(point.y, 0, point.board.offsetHeight) };
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
        shape.x = clamp(point.x - activeDrag.deltaX, 0, point.board.offsetWidth);
        shape.y = clamp(point.y - activeDrag.deltaY, 0, point.board.offsetHeight);
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
      state.tokenPositions[activeDrag.id] = snapTokenPosition(state.tokenPositions[activeDrag.id], state.grid);
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
      loadCloudEntries();
    }, 0);
  }

  return { open, sync, isOpen, getSaveData, applySave, setMap, getMap, chooseMap, convertAndSetFile: handleImageFile };
}
