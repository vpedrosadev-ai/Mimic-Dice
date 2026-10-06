import {
  createCloudLibraryEntry,
  getCloudLibraryEntry,
  listCloudLibraryEntries,
  listPublicCloudLibraryEntries,
  uploadCloudImage
} from "../../cloud/cloudClient.js";

const tokenWingUrl = new URL("../../assets/token-wing.png", import.meta.url).href;

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;
const MIN_GRID_SIZE = 24;
const MAX_GRID_SIZE = 240;
const MIN_PAINT_SIZE = 1;
const MAX_PAINT_SIZE = 120;
const MAX_PAINT_POINTS = 12000;
const MAX_FOG_POINTS = 12000;
const MAX_AREA_SHAPES = 200;
const MAX_SAVED_MAP_LAYOUTS = 20;
const MIN_MAP_ZOOM = 0.25;
const MAX_MAP_ZOOM = 3;
const GRID_LABEL_GUTTER = 34;
const TEXT_SHAPE_GUTTER = 180;
const MAP_STORAGE_KEY = "mimic-dice:combat-map:v1";
const MAP_ICON_OPTIONS = Object.freeze(["⚔", "✚", "☠", "★", "🔥", "⚑", "⬟", "✦"]);

function getTextShapeGutter(width, height) {
  return Math.max(TEXT_SHAPE_GUTTER, Math.round(Math.min(Number(width) || DEFAULT_WIDTH, Number(height) || DEFAULT_HEIGHT) * .2));
}

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

function normalizeOpacity(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 1;
}

function normalizeTags(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((tag) => clean(tag).slice(0, 40)).filter(Boolean))].slice(0, 12);
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
    const mode = ["erase", "line", "icon"].includes(stroke.mode) ? stroke.mode : "paint";
    const maxPoints = mode === "icon" ? 1 : mode === "line" ? 2 : remainingPoints;
    const points = stroke.points.slice(-maxPoints).map(normalizePoint);
    if (!points.length) continue;
    remainingPoints -= points.length;
    strokes.push({
      color: normalizeColor(stroke.color),
      size: clamp(stroke.size || 12, MIN_PAINT_SIZE, MAX_PAINT_SIZE),
      mode,
      points,
      ...(mode === "icon" ? {
        id: clean(stroke.id) || `paint-icon-${index}`,
        icon: MAP_ICON_OPTIONS.includes(stroke.icon) ? stroke.icon : MAP_ICON_OPTIONS[0],
        rotation: ((Number(stroke.rotation) || 0) % 360 + 360) % 360
      } : {})
    });
  }
  return strokes.reverse();
}

function normalizeFogRevealed(value) {
  if (!Array.isArray(value)) return [];
  let remainingPoints = MAX_FOG_POINTS;
  const revealed = [];
  for (let index = value.length - 1; index >= 0 && remainingPoints > 0; index -= 1) {
    const point = value[index];
    if (point?.type === "polygon") {
      const points = Array.isArray(point.points) ? point.points.slice(-Math.min(500, remainingPoints)).map(normalizePoint) : [];
      if (points.length < 3) continue;
      remainingPoints -= points.length;
      revealed.push({ type: "polygon", points });
      continue;
    }
    remainingPoints -= 1;
    revealed.push({
      type: point?.type === "square" ? "square" : "circle",
      x: Number(point?.x) || 0,
      y: Number(point?.y) || 0,
      r: clamp(point?.r || 70, 4, 400)
    });
  }
  return revealed.reverse();
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

function columnIndexToLabel(index) {
  let value = Math.max(0, Math.floor(index)) + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function normalizeAreaShapes(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_AREA_SHAPES).map((shape, index) => {
    const type = ["circle", "square", "cone", "text"].includes(shape?.type) ? shape.type : "circle";
    return {
      id: clean(shape?.id) || `shape-${index + 1}`,
      type,
      color: normalizeColor(shape?.color, "#f97316"),
      distanceFeet: clamp(Math.round((Number(shape?.distanceFeet) || 15) / 5) * 5, 5, 500),
      x: Number(shape?.x) || 0,
      y: Number(shape?.y) || 0,
      rotation: ((Number(shape?.rotation) || 0) % 360 + 360) % 360,
      ...(type === "text" ? {
        text: clean(shape?.text).slice(0, 500),
        textBoxVisible: shape?.textBoxVisible !== false,
        textBoxColor: normalizeColor(shape?.textBoxColor, "#111827"),
        textColor: normalizeColor(shape?.textColor, "#ffffff"),
        fontSize: clamp(shape?.fontSize || 32, 10, 120)
      } : {})
    };
  });
}

export function getAreaShapeMetrics(shape, grid) {
  const type = ["circle", "square", "cone", "text"].includes(shape?.type) ? shape.type : "circle";
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

function readAscii(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export async function inspectImageFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isWebp = bytes.length >= 12 && readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP";
  const isGif = bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(readAscii(bytes, 0, 6));
  let isAnimated = false;
  if (isWebp) {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunk = readAscii(bytes, offset, 4);
      const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
      if (chunk === "ANIM" || chunk === "ANMF") { isAnimated = true; break; }
      offset += 8 + Math.max(0, size) + (size % 2);
    }
  } else if (isGif) {
    let frames = 0;
    let index = 13;
    if (bytes[10] & 0x80) index += 3 * (2 ** ((bytes[10] & 0x07) + 1));
    const skipSubBlocks = () => {
      while (index < bytes.length) {
        const size = bytes[index++];
        if (!size) break;
        index += size;
      }
    };
    while (index < bytes.length && frames < 2) {
      const marker = bytes[index++];
      if (marker === 0x3b) break;
      if (marker === 0x21) { index += 1; skipSubBlocks(); continue; }
      if (marker !== 0x2c || index + 9 > bytes.length) break;
      frames += 1;
      const packed = bytes[index + 8];
      index += 9;
      if (packed & 0x80) index += 3 * (2 ** ((packed & 0x07) + 1));
      index += 1;
      skipSubBlocks();
    }
    isAnimated = frames > 1;
  }
  return {
    bytes,
    mimeType: isWebp ? "image/webp" : isGif ? "image/gif" : getImageFileMimeType(file),
    isWebp,
    isGif,
    isAnimated
  };
}

export function isImageFileLike(file) {
  return Boolean(file && typeof file.arrayBuffer === "function" && getImageFileMimeType(file));
}

function getHexMetrics(size) {
  const height = size * 2 / Math.sqrt(3);
  return { height, halfHeight: height / 2, rowStep: height * .75 };
}

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => { output.set(part, offset); offset += part.length; });
  return output;
}

function integerBytes(value, length) {
  const bytes = new Uint8Array(length);
  let remaining = Math.max(0, Math.round(Number(value) || 0));
  for (let index = 0; index < length; index += 1) {
    bytes[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}

function webpChunk(type, payload) {
  const name = new TextEncoder().encode(type);
  const padding = payload.length % 2 ? new Uint8Array(1) : new Uint8Array(0);
  return concatBytes([name, integerBytes(payload.length, 4), payload, padding]);
}

function extractWebpImageChunks(bytes) {
  const chunks = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = readAscii(bytes, offset, 4);
    const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
    const end = offset + 8 + Math.max(0, size) + (size % 2);
    if (end > bytes.length) break;
    if (["ALPH", "VP8 ", "VP8L"].includes(type)) chunks.push(bytes.slice(offset, end));
    offset = end;
  }
  return concatBytes(chunks);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen convertida.")), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function convertAnimatedGifToWebp(bytes, quality) {
  if (typeof ImageDecoder !== "function") {
    throw new Error("Este navegador no permite convertir GIF animado. Usa Mimic Dice Desktop o sube un WebP animado.");
  }
  const decoder = new ImageDecoder({ data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), type: "image/gif", preferAnimation: true });
  await decoder.tracks.ready;
  const frameCount = decoder.tracks.selectedTrack?.frameCount || 0;
  if (frameCount < 2) throw new Error("El GIF no contiene varios fotogramas decodificables.");
  if (frameCount > 900) throw new Error("El GIF tiene demasiados fotogramas para convertirlo de forma segura.");
  const canvas = document.createElement("canvas");
  const frameChunks = [];
  let width = 0;
  let height = 0;
  try {
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const result = await decoder.decode({ frameIndex, completeFramesOnly: true });
      const frame = result.image;
      if (!width || !height) {
        width = frame.displayWidth || frame.codedWidth;
        height = frame.displayHeight || frame.codedHeight;
        canvas.width = width;
        canvas.height = height;
        if (width * height * frameCount > 500_000_000) throw new Error("La animación es demasiado grande para convertirla de forma segura.");
      }
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(frame, 0, 0, width, height);
      const duration = clamp(Math.round((Number(frame.duration) || 100000) / 1000), 10, 0xffffff);
      frame.close?.();
      const stillBlob = await new Promise((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("No se pudo codificar un fotograma animado.")),
        "image/webp",
        quality
      ));
      const imageChunks = extractWebpImageChunks(new Uint8Array(await stillBlob.arrayBuffer()));
      if (!imageChunks.length) throw new Error("No se pudo preparar el WebP animado.");
      const frameHeader = concatBytes([
        integerBytes(0, 3), integerBytes(0, 3), integerBytes(width - 1, 3), integerBytes(height - 1, 3), integerBytes(duration, 3),
        new Uint8Array([2])
      ]);
      frameChunks.push(webpChunk("ANMF", concatBytes([frameHeader, imageChunks])));
    }
  } finally {
    decoder.close?.();
  }
  const vp8x = concatBytes([new Uint8Array([2, 0, 0, 0]), integerBytes(width - 1, 3), integerBytes(height - 1, 3)]);
  const anim = concatBytes([new Uint8Array(4), integerBytes(0, 2)]);
  const payload = concatBytes([new TextEncoder().encode("WEBP"), webpChunk("VP8X", vp8x), webpChunk("ANIM", anim), ...frameChunks]);
  const bytesOut = concatBytes([new TextEncoder().encode("RIFF"), integerBytes(payload.length, 4), payload]);
  const blob = new Blob([bytesOut], { type: "image/webp" });
  return { blob, dataUrl: await blobToDataUrl(blob), width, height, isAnimated: true };
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

export function getGridCoordinateForPosition(point, grid, width, height) {
  const boardWidth = Math.max(1, Number(width) || DEFAULT_WIDTH);
  const boardHeight = Math.max(1, Number(height) || DEFAULT_HEIGHT);
  const snapped = snapTokenPosition(point, grid);
  const size = clamp(grid?.size || 80, MIN_GRID_SIZE, MAX_GRID_SIZE);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  if (grid?.type !== "hex") {
    let firstX = offsetX + Math.floor((-offsetX) / size) * size + size / 2;
    let firstY = offsetY + Math.floor((-offsetY) / size) * size + size / 2;
    while (firstX < 0) firstX += size;
    while (firstY < 0) firstY += size;
    const column = Math.round((snapped.x - firstX) / size);
    const row = Math.round((snapped.y - firstY) / size);
    if (column < 0 || row < 0 || snapped.x < 0 || snapped.x > boardWidth || snapped.y < 0 || snapped.y > boardHeight) return "";
    return `${columnIndexToLabel(column)}${row + 1}`;
  }
  const { halfHeight, rowStep } = getHexMetrics(size);
  const firstRow = Math.ceil((-offsetY - halfHeight) / rowStep) - 1;
  const visibleRows = [];
  const columnIds = new Set();
  for (let row = firstRow; row <= Math.floor((boardHeight - offsetY - halfHeight) / rowStep) + 1; row += 1) {
    const y = offsetY + row * rowStep + halfHeight;
    if (y < 0 || y > boardHeight) continue;
    const rowOffset = Math.abs(row) % 2 ? size / 2 : 0;
    const cells = [];
    for (let column = Math.ceil((-offsetX - rowOffset - size / 2) / size) - 1; column <= Math.floor((boardWidth - offsetX - rowOffset - size / 2) / size) + 1; column += 1) {
      const x = offsetX + rowOffset + column * size + size / 2;
      if (x >= 0 && x <= boardWidth) { cells.push({ x, column }); columnIds.add(column); }
    }
    if (cells.length) visibleRows.push({ y, cells });
  }
  const columns = [...columnIds].sort((a, b) => a - b);
  let nearest = null;
  visibleRows.forEach((row, rowIndex) => row.cells.forEach((cell) => {
    const distance = Math.hypot(cell.x - snapped.x, row.y - snapped.y);
    if (!nearest || distance < nearest.distance) nearest = { rowIndex, column: cell.column, distance };
  }));
  if (!nearest) return "";
  return `${columnIndexToLabel(columns.indexOf(nearest.column))}${nearest.rowIndex + 1}`;
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
    isPrivate: value.isPrivate === true,
    ...(value.isAnimated === true || /[?&]animated=1(?:&|$)/.test(imageUrl) ? { isAnimated: true } : {})
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
  const tokenStackOrder = Array.isArray(source.tokenStackOrder)
    ? [...new Set(source.tokenStackOrder.map(clean).filter(Boolean))]
    : [];
  const windowBounds = isObject(source.windowBounds) ? source.windowBounds : {};
  return {
    map: normalizeMapReference(source.map),
    openPanel: ["map", "grid", "tokens", "paint", "shapes", "fog", "health", "initiative"].includes(source.openPanel) ? source.openPanel : "",
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
    playerViewport: {
      scrollLeft: Math.max(0, Number(source.playerViewport?.scrollLeft) || 0),
      scrollTop: Math.max(0, Number(source.playerViewport?.scrollTop) || 0),
      zoom: clamp(source.playerViewport?.zoom || 1, MIN_MAP_ZOOM, MAX_MAP_ZOOM)
    },
    opacity: {
      overall: normalizeOpacity(source.opacity?.overall),
      grid: normalizeOpacity(source.opacity?.grid),
      tokens: normalizeOpacity(source.opacity?.tokens),
      fog: normalizeOpacity(source.opacity?.fog),
      paint: normalizeOpacity(source.opacity?.paint),
      shapes: normalizeOpacity(source.opacity?.shapes),
      health: normalizeOpacity(source.opacity?.health),
      initiative: normalizeOpacity(source.opacity?.initiative)
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
    tokenStackOrder,
    fog: {
      enabled: source.fog?.enabled === true,
      mode: source.fog?.mode === "polygon" ? "polygon" : "brush",
      brushShape: source.fog?.brushShape === "square" ? "square" : "circle",
      brushSize: clamp(source.fog?.brushSize || 70, 12, 300),
      revealed: normalizeFogRevealed(source.fog?.revealed),
      polygonDraft: Array.isArray(source.fog?.polygonDraft) ? source.fog.polygonDraft.slice(0, 500).map(normalizePoint) : []
    },
    paint: {
      color: normalizeColor(source.paint?.color),
      size: clamp(source.paint?.size || 12, MIN_PAINT_SIZE, MAX_PAINT_SIZE),
      mode: ["paint", "erase", "line", "icon"].includes(source.paint?.mode) ? source.paint.mode : "paint",
      icon: MAP_ICON_OPTIONS.includes(source.paint?.icon) ? source.paint.icon : MAP_ICON_OPTIONS[0],
      iconSize: clamp(source.paint?.iconSize || 64, 16, 300),
      iconRotation: ((Number(source.paint?.iconRotation) || 0) % 360 + 360) % 360,
      selectedIconId: clean(source.paint?.selectedIconId),
      strokes: normalizePaintStrokes(source.paint?.strokes)
    },
    shapes: {
      type: ["circle", "square", "cone", "text"].includes(source.shapes?.type) ? source.shapes.type : "circle",
      color: normalizeColor(source.shapes?.color, "#f97316"),
      distanceFeet: clamp(Math.round((Number(source.shapes?.distanceFeet) || 15) / 5) * 5, 5, 500),
      coordinate: clean(source.shapes?.coordinate).toUpperCase().replaceAll(" ", "").slice(0, 12),
      text: clean(source.shapes?.text).slice(0, 500),
      textBoxVisible: source.shapes?.textBoxVisible !== false,
      textBoxColor: normalizeColor(source.shapes?.textBoxColor, "#111827"),
      textColor: normalizeColor(source.shapes?.textColor, "#ffffff"),
      fontSize: clamp(source.shapes?.fontSize || 32, 10, 120),
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
  const inspection = await inspectImageFile(file);
  const mimeType = inspection.mimeType;
  const sourceBlob = new Blob([inspection.bytes], { type: mimeType });
  if (inspection.isGif && inspection.isAnimated) return convertAnimatedGifToWebp(inspection.bytes, quality);
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
    if (inspection.isWebp) {
      return {
        blob: new Blob([inspection.bytes], { type: "image/webp" }),
        dataUrl: await blobToDataUrl(sourceBlob),
        width: image.naturalWidth,
        height: image.naturalHeight,
        isAnimated: inspection.isAnimated
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
    const dataUrl = await blobToDataUrl(blob);
    return { blob, dataUrl, width: canvas.width, height: canvas.height, isAnimated: false };
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

function hasInitiativeToken(combatant) {
  return isAlive(combatant) && combatant?.iniactiva !== "" && combatant?.iniactiva !== null && combatant?.iniactiva !== undefined;
}

function getSide(combatant) {
  if (combatant?.side === "enemies" || combatant?.tag === "ENEMIGO") return "enemies";
  if (combatant?.side === "neutral" || combatant?.tag === "NEUTRAL") return "neutral";
  return "allies";
}

export function createCombatMapController(options = {}) {
  const storageKey = clean(options.storageKey) || MAP_STORAGE_KEY;
  const popupName = clean(options.windowName) || "mimic-dice-combat-map";
  let editorWindow = null;
  let pollInterval = 0;
  let viewportPersistTimer = 0;
  let state = loadLocalState();
  let activeDrag = null;
  let pickerCallback = null;
  let openPanel = state.openPanel;
  let playerOpenPanel = "";
  let localImageBusy = false;
  let localImageError = "";
  let shapeCoordinateError = "";
  let mapLoadMenuSurface = "";
  let mapFitScale = 1;
  let tokenSearch = "";
  let initiativeLayout = { scale: 1, columns: 1, count: 0 };
  let blankMapRatio = "1:1";
  let lastCombatantFingerprint = "";
  let cloudPickerSurface = "";
  let cloudPickerBusy = false;
  let cloudPickerError = "";
  let cloudPickerQuery = "";
  let cloudPickerItems = [];
  let cloudPickerSelectedTags = new Set();
  let fogPolygonCursor = null;
  let masterHost = null;
  let pendingConfirmation = null;
  let detachedConfirmationElement = null;

  function loadLocalState() {
    try {
      return normalizeMapEditorState(JSON.parse(localStorage.getItem(storageKey) || "{}"));
    } catch {
      return normalizeMapEditorState({});
    }
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* memory state remains */ }
    options.onChange?.(getSaveData());
  }

  function getCombatants() {
    return (options.getCombatants?.() || []).filter(Boolean);
  }

  function getCombatantFingerprint() {
    return JSON.stringify(getCombatants().map((combatant) => [
      combatant.id, combatant.nombre, combatant.numPeana, combatant.pgAct, combatant.pgMax,
      combatant.condiciones, combatant.hiddenFromInitiative, combatant.iniactiva,
      combatant.tokenUrl, combatant.tamano, combatant.isFlying, combatant.flyingHeight
    ]));
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
    return state.tokenVisibility[combatant.id] === true;
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

  function bringTokenToFront(combatantId) {
    const id = clean(combatantId);
    if (!id) return;
    state.tokenStackOrder = [...state.tokenStackOrder.filter((entry) => entry !== id), id];
  }

  function getTokenStackIndex(combatantId, fallbackIndex = 0) {
    const index = state.tokenStackOrder.indexOf(combatantId);
    return index >= 0 ? index : state.tokenStackOrder.length + fallbackIndex;
  }

  function resnapTokensWithoutOverlap() {
    getCombatants().forEach((combatant, index) => {
      if (!getTokenEnabled(combatant)) return;
      state.tokenPositions[combatant.id] = snapCreaturePosition(
        getTokenPosition(combatant, index),
        state.grid,
        getCreatureSizeMultiplier(combatant)
      );
    });
  }

  function resnapToken(combatantId) {
    const combatants = getCombatants();
    const index = combatants.findIndex((combatant) => combatant.id === combatantId);
    const combatant = combatants[index];
    if (!combatant || !getTokenEnabled(combatant)) return false;
    state.tokenPositions[combatantId] = snapCreaturePosition(
      getTokenPosition(combatant, index),
      state.grid,
      getCreatureSizeMultiplier(combatant)
    );
    bringTokenToFront(combatantId);
    persist();
    sync();
    notifyTokenCoordinates();
    return true;
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

  function applyMapWorkspace(map, workspace = {}) {
    const preserved = {
      savedMapLayouts: state.savedMapLayouts,
      windowBounds: state.windowBounds
    };
    state = normalizeMapEditorState({ ...workspace, ...preserved, map });
    openPanel = state.openPanel;
    persist();
    sync();
    if (state.map?.cloudEntryId && !state.map.imageUrl) resolveCloudMap(state.map.cloudEntryId);
  }

  function createCurrentMapWorkspace() {
    const { map, savedMapLayouts, windowBounds, openPanel: panel, ...workspace } = state;
    return JSON.parse(JSON.stringify(workspace));
  }

  function getCloudMapEditorState() {
    return createCurrentMapWorkspace();
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

  function applyMapSelection(next, behavior = {}, saveCurrent = false) {
    if (saveCurrent) saveCurrentMapLayout();
    const currentKey = getMapLayoutKey(state.map);
    const nextKey = getMapLayoutKey(next);
    if (currentKey && currentKey === nextKey) {
      state.map = next;
      persist();
      sync();
      if (!next.imageUrl && next.cloudEntryId) resolveCloudMap(next.cloudEntryId);
      behavior.onApplied?.(next);
      return;
    }
    if (behavior.retainWorkspace === true) {
      state.map = next;
      persist();
      sync();
      behavior.onApplied?.(next);
      return;
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
    behavior.onApplied?.(next);
  }

  function setMap(map, behavior = {}) {
    const next = normalizeMapReference(map);
    if (!next) return;
    const currentKey = getMapLayoutKey(state.map);
    const nextKey = getMapLayoutKey(next);
    if (state.map && currentKey !== nextKey && behavior.promptToSave !== false) {
      showConfirmation({
        surface: behavior.surface,
        title: "Guardar estado del mapa",
        message: `¿Quieres guardar en esta campaña el estado actual de “${state.map.name}” antes de cargar “${next.name}”?`,
        confirmLabel: "Guardar y continuar",
        cancelLabel: "Continuar sin guardar",
        onConfirm: () => applyMapSelection(next, behavior, true),
        onCancel: () => applyMapSelection(next, behavior, false)
      });
      return;
    }
    applyMapSelection(next, behavior, false);
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

  function hasGrid() {
    return Boolean(state.map && state.grid.visible);
  }

  function getTokenCoordinate(combatantId) {
    if (!hasGrid()) return "";
    const combatants = getCombatants();
    const index = combatants.findIndex((combatant) => combatant.id === clean(combatantId));
    if (index < 0) return "";
    return getGridCoordinateForPosition(
      getTokenPosition(combatants[index], index),
      state.grid,
      state.map.width,
      state.map.height
    );
  }

  function setTokenCoordinate(combatantId, coordinate) {
    if (!hasGrid()) return false;
    const position = resolveGridCoordinatePosition(coordinate, state.grid, state.map.width, state.map.height);
    if (!position) return false;
    const id = clean(combatantId);
    const combatants = getCombatants();
    const combatant = combatants.find((entry) => entry.id === id);
    state.tokenPositions[id] = snapCreaturePosition(position, state.grid, getCreatureSizeMultiplier(combatant));
    bringTokenToFront(id);
    persist();
    sync();
    return true;
  }

  function notifyTokenCoordinates() {
    options.onTokenCoordinatesChange?.(getCombatants().map((combatant) => ({
      id: combatant.id,
      coordinate: getTokenCoordinate(combatant.id)
    })));
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
    const popup = window.open("", popupName, `popup=yes,width=${Math.round(bounds.width)},height=${Math.round(bounds.height)}${position},resizable=yes,scrollbars=no`);
    if (!popup) {
      options.onNotify?.("No se pudo abrir el mapa", "Permite ventanas emergentes y vuelve a intentarlo.", "danger");
      return;
    }
    editorWindow = popup;
    initializeWindow(popup);
    pollInterval = window.setInterval(() => {
      if (editorWindow?.closed) close();
      else {
        captureWindowBounds();
        const fingerprint = getCombatantFingerprint();
        if (fingerprint !== lastCombatantFingerprint) sync();
      }
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
    playerOpenPanel = "";
    if (mapLoadMenuSurface === "player") mapLoadMenuSurface = "";
    if (cloudPickerSurface === "player") cloudPickerSurface = "";
    if (pendingConfirmation?.surfaceKind === "player") pendingConfirmation = null;
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
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(document.baseURI)}"><title>Mapa de combate · Jugador - Mimic Dice</title>${inheritedStyles}</head><body class="combat-map-popout-body"><main data-combat-map-root data-combat-map-player-root></main></body></html>`);
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
    popup.document.addEventListener("pointerleave", (event) => hideBrushCursor(getEventSurface(event)));
    popup.document.addEventListener("wheel", handleWheel, { passive: false });
    popup.document.addEventListener("scroll", handleViewportScroll, true);
    popup.addEventListener("beforeunload", () => { captureWindowBounds(); close(); });
    popup.addEventListener("resize", () => {
      captureWindowBounds();
      sync();
    });
  }

  function getEventSurface(event) {
    return event?.target?.closest?.("[data-combat-map-master-root], [data-combat-map-player-root]")
      || activeDrag?.surface
      || masterHost
      || editorWindow?.document?.querySelector?.("[data-combat-map-player-root]");
  }

  function getSurfaceKind(surface) {
    return surface?.matches?.("[data-combat-map-player-root]")
      || surface?.hasAttribute?.("data-combat-map-player-root")
      || surface?.querySelector?.("[data-combat-map-player-root]")
      ? "player"
      : "master";
  }

  function getSurfacePanel(surface) {
    return getSurfaceKind(surface) === "player" ? playerOpenPanel : openPanel;
  }

  function getVersionPanel(version) {
    return version === "player" ? playerOpenPanel : openPanel;
  }

  function renderToolbar(version = "master") {
    const panel = getVersionPanel(version);
    return `<header class="combat-map-toolbar">
      <strong class="combat-map-toolbar__version">Versión ${version === "player" ? "jugador" : "máster"}</strong>
      <button type="button" data-map-action="open-map-menu" class="${panel === "map" ? "is-active" : ""}">Mapa</button>
      <button type="button" data-map-action="toggle-grid-menu" class="${state.grid.visible ? "is-active" : ""}">Rejilla</button>
      <button type="button" data-map-action="toggle-token-menu">Peanas</button>
      <button type="button" data-map-action="toggle-fog-menu" class="${state.fog.enabled || panel === "fog" ? "is-active" : ""}">Niebla</button>
      <button type="button" data-map-action="toggle-paint-menu" class="${panel === "paint" ? "is-active" : ""}">Pintar</button>
      <button type="button" data-map-action="toggle-shapes-menu" class="${panel === "shapes" ? "is-active" : ""}">Formas</button>
      <button type="button" data-map-action="toggle-health-menu" class="${panel === "health" || state.healthMode !== "none" ? "is-active" : ""}">Barra de vida</button>
      <button type="button" data-map-action="toggle-initiative-menu" class="combat-map-toolbar__initiative ${state.initiative.visible || panel === "initiative" ? "is-active" : ""}">Orden de iniciativa</button>
    </header>`;
  }

  function renderOpacityControl(key, label = "Opacidad") {
    const value = Math.round(normalizeOpacity(state.opacity[key]) * 100);
    return `<label>${label} <input type="range" min="0" max="100" step="5" value="${value}" data-map-opacity="${key}"><output>${value}%</output></label>`;
  }

  function layerOpacity(key) {
    return normalizeOpacity(state.opacity.overall) * normalizeOpacity(state.opacity[key]);
  }

  function applyLayerOpacityStyles(root = masterHost || editorWindow?.document) {
    if (!root) return;
    const isPlayer = root?.matches?.("[data-combat-map-player-root]") || root?.hasAttribute?.("data-combat-map-player-root");
    const setOpacity = (selector, value) => root.querySelectorAll(selector).forEach((element) => { element.style.opacity = String(value); });
    setOpacity("[data-map-grid-coordinates], [data-map-grid-labels]", layerOpacity("grid"));
    setOpacity("[data-map-paint], [data-map-paint-icon-layer]", layerOpacity("paint"));
    setOpacity("[data-map-shape-layer], .combat-map-text-layer", layerOpacity("shapes"));
    setOpacity(".combat-map-token-layer", layerOpacity("tokens"));
    setOpacity("[data-map-fog]", isPlayer ? 1 : layerOpacity("fog"));
    setOpacity("[data-map-initiative-order]", layerOpacity("initiative"));
    setOpacity(".combat-map-token__health", normalizeOpacity(state.opacity.health));
  }

  function getEncounterMapChoices() {
    return (options.getEncounterMaps?.() || []).map((choice) => ({
      ...choice,
      map: normalizeMapReference(choice?.map || choice)
    })).filter((choice) => choice.map);
  }

  function renderMapMenu(version = "master") {
    const panel = getVersionPanel(version);
    const encounterMaps = getEncounterMapChoices();
    const currentKey = getMapLayoutKey(state.map);
    const savedMaps = state.savedMapLayouts.filter((layout) => layout.key !== currentKey);
    const viewport = version === "player" ? state.playerViewport : state.viewport;
    return `<section class="combat-map-popover" data-map-panel="map" ${panel === "map" ? "" : "hidden"}>
      <h2>Mapa</h2>
      <button type="button" data-map-action="toggle-map-load-menu">Cargar imagen</button>
      ${mapLoadMenuSurface === version ? `<div class="combat-map-load-menu">
        <label class="combat-map-file-button">Desde equipo<input type="file" accept="image/*" data-map-file></label>
        <button type="button" data-map-action="open-cloud-map-catalog">Desde la nube</button>
        <div class="combat-map-blank-map"><strong>Hoja en blanco</strong><label>ProporciÃ³n <select data-blank-map-ratio><option value="1:1" ${blankMapRatio === "1:1" ? "selected" : ""}>Cuadrado 1:1</option><option value="4:3" ${blankMapRatio === "4:3" ? "selected" : ""}>RectÃ¡ngulo 4:3</option><option value="16:9" ${blankMapRatio === "16:9" ? "selected" : ""}>PanorÃ¡mico 16:9</option><option value="3:2" ${blankMapRatio === "3:2" ? "selected" : ""}>RectÃ¡ngulo 3:2</option><option value="3:4" ${blankMapRatio === "3:4" ? "selected" : ""}>Vertical 3:4</option><option value="9:16" ${blankMapRatio === "9:16" ? "selected" : ""}>Vertical 9:16</option></select></label><button type="button" data-map-action="create-blank-map">Crear hoja blanca</button></div>
        ${savedMaps.length ? `<div class="combat-map-priority-list"><h3>Usados recientemente</h3><div class="combat-map-cloud-grid">${savedMaps.map((layout) => `<button type="button" data-map-saved-layout="${escapeHtml(layout.key)}">${layout.map.imageUrl ? `<img src="${escapeHtml(layout.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(layout.map.name)}</span><small>Disposición guardada</small></button>`).join("")}</div></div>` : ""}
        ${encounterMaps.length ? `<div class="combat-map-priority-list"><h3>Vinculados a encuentros cargados</h3><div class="combat-map-cloud-grid">${encounterMaps.map((choice, index) => `<button type="button" data-map-encounter-choice="${index}">${choice.map.imageUrl ? `<img src="${escapeHtml(choice.map.imageUrl)}" alt="">` : `<span class="combat-map-cloud-placeholder">Mapa</span>`}<span>${escapeHtml(choice.map.name)}</span><small>${escapeHtml(choice.encounterName || "Encuentro")}</small></button>`).join("")}</div></div>` : ""}
      </div>` : ""}
      <label>Zoom <input type="range" min="25" max="300" step="5" value="${Math.round(viewport.zoom * 100)}" data-map-zoom><output>${Math.round(viewport.zoom * 100)}%</output></label>
      ${renderOpacityControl("overall", "Opacidad general de elementos")}
      <div class="combat-map-tool-actions"><button type="button" data-map-action="zoom-out">Alejar</button><button type="button" data-map-action="zoom-reset">100%</button><button type="button" data-map-action="zoom-in">Acercar</button></div>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="rotate-left">Rotar 90° izquierda</button><button type="button" data-map-action="rotate-right">Rotar 90° derecha</button></div>
      <label>Orientación al rotar <select data-map-rotation-orientation><option value="upright" ${state.rotationOrientation === "upright" ? "selected" : ""}>Mantener textos y peanas derechos</option><option value="with-map" ${state.rotationOrientation === "with-map" ? "selected" : ""}>Rotar todo con el mapa</option></select></label>
      <button type="button" data-map-action="reset-map-canvas">Restablecer imagen</button>
      ${localImageBusy ? `<p class="combat-map-converting" role="status">Convirtiendo imagen a WebP…</p>` : ""}
      ${localImageError ? `<p class="combat-map-error" role="alert">${escapeHtml(localImageError)}</p>` : ""}
      <p class="combat-map-help">WebP se conserva sin recomprimir. Otros formatos se convierten a WebP.</p>
    </section>`;
  }

  async function loadCloudMapItems() {
    const authenticated = Boolean(options.getAccountSession?.()?.user?.id);
    const [publicResult, ownedResult] = await Promise.all([
      listPublicCloudLibraryEntries("map"),
      authenticated ? listCloudLibraryEntries() : Promise.resolve({ entries: [] })
    ]);
    const entries = [...(ownedResult?.entries || []), ...(publicResult?.entries || [])]
      .filter((entry) => clean(entry?.type).toLowerCase() === "map")
      .filter((entry) => entry.isOwner === true || entry.isPublic === true);
    cloudPickerItems = [...new Map(entries.map((entry) => [entry.id, { ...entry, tags: normalizeTags(entry.tags) }])).values()];
    return cloudPickerItems;
  }

  async function openCloudMapPicker(surface = masterHost) {
    cloudPickerSurface = getSurfaceKind(surface);
    cloudPickerBusy = true;
    cloudPickerError = "";
    sync();
    try {
      await loadCloudMapItems();
    } catch (error) {
      cloudPickerError = error?.message || "No se pudieron cargar los mapas de la comunidad.";
    }
    cloudPickerBusy = false;
    sync();
  }

  async function selectCloudMap(entryId, surface = masterHost) {
    cloudPickerBusy = true;
    cloudPickerError = "";
    sync();
    try {
      const result = await getCloudLibraryEntry(entryId);
      const map = normalizeMapReference({
        ...(result.payload?.map || {}),
        name: result.entry?.name || result.payload?.map?.name,
        imageUrl: result.payload?.map?.imageUrl || result.entry?.imageUrl,
        cloudEntryId: entryId,
        isPrivate: result.entry?.isPublic !== true
      });
      if (!map) throw new Error("Este mapa no contiene una imagen válida.");
      cloudPickerSurface = "";
      cloudPickerBusy = false;
      const applyEditorState = result.payload?.editorState && typeof result.payload.editorState === "object" ? () => {
        const savedMapLayouts = state.savedMapLayouts;
        const windowBounds = state.windowBounds;
        state = normalizeMapEditorState({ ...result.payload.editorState, map, savedMapLayouts, windowBounds, openPanel });
        persist();
        sync();
      } : null;
      finishMapSelection(map, surface, applyEditorState);
    } catch (error) {
      cloudPickerBusy = false;
      cloudPickerError = error?.message || "No se pudo abrir el mapa.";
      sync();
    }
  }

  function applyCloudMapResult(result) {
    const entryId = clean(result?.entry?.id || result?.payload?.map?.cloudEntryId);
    const map = normalizeMapReference({
      ...(result?.payload?.map || {}),
      name: result?.entry?.name || result?.payload?.map?.name,
      imageUrl: result?.payload?.map?.imageUrl || result?.entry?.imageUrl,
      cloudEntryId: entryId,
      isPrivate: result?.entry?.isPublic !== true
    });
    if (!map) throw new Error("El mapa cloud no contiene una imagen valida.");
    const applyEditorState = result?.payload?.editorState && typeof result.payload.editorState === "object" ? () => {
      const savedMapLayouts = state.savedMapLayouts;
      const windowBounds = state.windowBounds;
      state = normalizeMapEditorState({ ...result.payload.editorState, map, savedMapLayouts, windowBounds, openPanel });
      persist();
      sync();
    } : null;
    finishMapSelection(map, masterHost, applyEditorState);
    return map;
  }

  function renderCloudMapPicker(version = "master") {
    if (cloudPickerSurface !== version) return "";
    const query = cloudPickerQuery.toLocaleLowerCase("es");
    const tags = [...new Set(cloudPickerItems.flatMap((item) => normalizeTags(item.tags)))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const items = cloudPickerItems.filter((item) => {
      const itemTags = normalizeTags(item.tags);
      if (cloudPickerSelectedTags.size && ![...cloudPickerSelectedTags].every((tag) => itemTags.includes(tag))) return false;
      return !query || `${item.name} ${item.ownerName} ${itemTags.join(" ")}`.toLocaleLowerCase("es").includes(query);
    });
    return `<div class="combat-map-cloud-picker" role="dialog" aria-modal="true" aria-label="Mapas de la comunidad"><button type="button" class="combat-map-cloud-picker__backdrop" data-map-action="close-cloud-map-picker" aria-label="Cerrar"></button><section class="combat-map-cloud-picker__panel"><header><div><small>Catálogo de la comunidad</small><h2>Mapas de la nube</h2></div><button type="button" data-map-action="close-cloud-map-picker" aria-label="Cerrar">×</button></header><div class="combat-map-cloud-picker__filters"><input type="search" value="${escapeHtml(cloudPickerQuery)}" placeholder="Buscar por nombre, usuario o etiqueta" data-map-cloud-search><label>Etiquetas<select multiple size="${Math.min(5, Math.max(2, tags.length))}" data-map-cloud-tags>${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${cloudPickerSelectedTags.has(tag) ? "selected" : ""}>${escapeHtml(tag)}</option>`).join("")}</select></label><button type="button" data-map-action="refresh-cloud-map-picker" ${cloudPickerBusy ? "disabled" : ""}>Actualizar</button></div>${cloudPickerError ? `<p class="combat-map-error" role="alert">${escapeHtml(cloudPickerError)}</p>` : ""}${cloudPickerBusy ? `<p class="combat-map-converting">Cargando mapas…</p>` : `<div class="combat-map-cloud-picker__grid">${items.map((item) => `<button type="button" class="combat-map-cloud-picker__card" data-map-cloud-choice="${escapeHtml(item.id)}">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : `<span>Mapa</span>`}<strong>${escapeHtml(item.name || "Mapa")}</strong><small>${escapeHtml(item.ownerName || "Comunidad")}</small><span class="combat-map-cloud-picker__badges"><i>${item.isPublic ? "Público" : "Privado"}</i>${/[?&]animated=1(?:&|$)/.test(clean(item.imageUrl)) ? "<i>Animado</i>" : ""}${normalizeTags(item.tags).map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}</span></button>`).join("") || "<p>No hay mapas disponibles.</p>"}</div>`}</section></div>`;
  }

  function renderHealthMenu(panel) {
    return `<section class="combat-map-popover" data-map-panel="health" ${panel === "health" ? "" : "hidden"}><h2>Barra de vida</h2><label>Mostrar en <select data-map-health><option value="all" ${state.healthMode === "all" ? "selected" : ""}>Todas las peanas</option><option value="none" ${state.healthMode === "none" ? "selected" : ""}>Ninguna</option><option value="allies" ${state.healthMode === "allies" ? "selected" : ""}>Solo aliadas</option><option value="neutral" ${state.healthMode === "neutral" ? "selected" : ""}>Solo neutrales</option><option value="enemies" ${state.healthMode === "enemies" ? "selected" : ""}>Solo enemigas</option></select></label>${renderOpacityControl("health")}</section>`;
  }

  function renderGridMenu(panel) {
    return `<section class="combat-map-popover" data-map-panel="grid" ${panel === "grid" ? "" : "hidden"}>
      <h2>Rejilla</h2>
      <label><input type="checkbox" data-grid-visible ${state.grid.visible ? "checked" : ""}> Mostrar rejilla</label>
      <label>Tipo <select data-grid-type><option value="square" ${state.grid.type === "square" ? "selected" : ""}>Cuadrada</option><option value="hex" ${state.grid.type === "hex" ? "selected" : ""}>Hexagonal</option></select></label>
      <label>Color <input type="color" value="${state.grid.color}" data-grid-color></label>
      <label>Tamaño <input type="range" min="${MIN_GRID_SIZE}" max="${MAX_GRID_SIZE}" value="${state.grid.size}" data-grid-size><output>${Math.round(state.grid.size)} px</output></label>
      ${renderOpacityControl("grid")}
      <p class="combat-map-help">Arrastra sobre el mapa con panel abierto para desplazar rejilla.</p>
    </section>`;
  }

  function renderFogMenu(panel) {
    return `<section class="combat-map-popover" data-map-panel="fog" ${panel === "fog" ? "" : "hidden"}>
      <h2>Niebla de guerra</h2>
      <label><input type="checkbox" data-fog-enabled ${state.fog.enabled ? "checked" : ""}> Mostrar niebla</label>
      ${state.fog.enabled ? `${renderOpacityControl("fog")}<div class="combat-map-tool-actions"><button type="button" data-map-action="fog-brush-mode" class="${state.fog.mode === "brush" ? "is-active" : ""}">Pincel</button><button type="button" data-map-action="fog-polygon-mode" class="${state.fog.mode === "polygon" ? "is-active" : ""}">Máscara por puntos</button></div>${state.fog.mode === "brush" ? `<label>Forma <select data-fog-brush-shape><option value="circle" ${state.fog.brushShape === "circle" ? "selected" : ""}>Circular</option><option value="square" ${state.fog.brushShape === "square" ? "selected" : ""}>Cuadrada</option></select></label><label>Grosor <input type="range" min="12" max="300" value="${state.fog.brushSize}" data-fog-size><output>${Math.round(state.fog.brushSize * 2)} px</output></label>` : `<p class="combat-map-help">Haz clic para añadir vértices. Pulsa el primer punto o “Cerrar máscara” para aplicar el área.</p><div class="combat-map-tool-actions"><button type="button" data-map-action="close-fog-polygon" ${state.fog.polygonDraft.length >= 3 ? "" : "disabled"}>Cerrar máscara</button><button type="button" data-map-action="cancel-fog-polygon" ${state.fog.polygonDraft.length ? "" : "disabled"}>Cancelar puntos</button></div>`}<button type="button" data-map-action="reset-fog" ${state.fog.revealed.length ? "" : "disabled"}>Reiniciar niebla</button><p class="combat-map-help">En Máster la niebla es translúcida; en Jugador es opaca.</p>` : ""}
    </section>`;
  }

  function renderInitiativeMenu(panel) {
    return `<section class="combat-map-popover" data-map-panel="initiative" ${panel === "initiative" ? "" : "hidden"}>
      <h2>Orden de iniciativa</h2>
      <label><input type="checkbox" data-map-initiative ${state.initiative.visible ? "checked" : ""}> Mostrar junto al mapa</label>
      <label>Posición <select data-map-initiative-position ${state.initiative.visible ? "" : "disabled"}><option value="top" ${state.initiative.position === "top" ? "selected" : ""}>Arriba</option><option value="bottom" ${state.initiative.position === "bottom" ? "selected" : ""}>Abajo</option><option value="left" ${state.initiative.position === "left" ? "selected" : ""}>Izquierda</option><option value="right" ${state.initiative.position === "right" ? "selected" : ""}>Derecha</option></select></label>
      <label>Tamaño <input type="range" min="160" max="650" value="${state.initiative.size}" data-map-initiative-size><output>${Math.round(state.initiative.size)} px</output></label>
      ${renderOpacityControl("initiative")}
      <p class="combat-map-help">También puedes arrastrar el separador entre el mapa y la iniciativa.</p>
    </section>`;
  }

  function renderTokenMenu(panel) {
    const query = tokenSearch.toLocaleLowerCase("es");
    const initiativeCombatants = getCombatants().filter(hasInitiativeToken);
    const initiativeTokensLoaded = initiativeCombatants.length > 0 && initiativeCombatants.every(getTokenEnabled);
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
    return `<section class="combat-map-popover combat-map-popover--tokens" data-map-panel="tokens" ${panel === "tokens" ? "" : "hidden"}><h2>Peanas</h2>${renderOpacityControl("tokens")}<label class="combat-map-token-load-initiative"><input type="checkbox" data-map-initiative-tokens ${initiativeTokensLoaded ? "checked" : ""} ${initiativeCombatants.length ? "" : "disabled"}><span>Cargar peanas con iniciativa</span></label><label class="combat-map-token-search"><span>Buscar</span><input type="search" value="${escapeHtml(tokenSearch)}" placeholder="Nombre o número" data-map-token-search></label><div class="combat-map-token-actions"><button type="button" data-map-action="all-tokens">Marcar todas</button><button type="button" data-map-action="no-tokens">Desmarcar todas</button></div><div class="combat-map-token-checklist">${rows || "<p>No hay entidades.</p>"}</div></section>`;
  }

  function getSelectedPaintIcon() {
    return state.paint.strokes.find((stroke) => stroke.mode === "icon" && stroke.id === state.paint.selectedIconId) || null;
  }

  function renderPaintMenu(panel) {
    const selectedIcon = getSelectedPaintIcon();
    const icon = selectedIcon?.icon || state.paint.icon;
    const iconSize = selectedIcon?.size || state.paint.iconSize;
    const iconRotation = selectedIcon?.rotation ?? state.paint.iconRotation;
    return `<section class="combat-map-popover" data-map-panel="paint" ${panel === "paint" ? "" : "hidden"}>
      <h2>Pincel para pintar</h2>
      <div class="combat-map-tool-actions"><button type="button" data-map-action="paint-mode" class="${state.paint.mode === "paint" ? "is-active" : ""}">Pincel</button><button type="button" data-map-action="line-mode" class="${state.paint.mode === "line" ? "is-active" : ""}">Línea recta</button><button type="button" data-map-action="icon-mode" class="${state.paint.mode === "icon" ? "is-active" : ""}">Icono</button><button type="button" data-map-action="erase-mode" class="${state.paint.mode === "erase" ? "is-active" : ""}">Goma</button></div>
      <label>Color <input type="color" value="${selectedIcon?.color || state.paint.color}" data-paint-color></label>
      ${state.paint.mode === "icon" ? `<p class="combat-map-editor-mode"><strong>${selectedIcon ? "Editando icono seleccionado" : "Nuevo icono"}</strong><span>${selectedIcon ? "Arrástralo o usa su tirador para rotarlo." : "Haz clic en el mapa para colocarlo."}</span></p><label>Icono <select data-paint-icon>${MAP_ICON_OPTIONS.map((option) => `<option value="${option}" ${icon === option ? "selected" : ""}>${option}</option>`).join("")}</select></label><label>Tamaño <input type="range" min="16" max="300" value="${iconSize}" data-paint-icon-size><output>${Math.round(iconSize)} px</output></label><label>Rotación <input type="range" min="0" max="359" value="${iconRotation}" data-paint-icon-rotation><output>${Math.round(iconRotation)}°</output></label><div class="combat-map-tool-actions"><button type="button" data-map-action="new-paint-icon" ${selectedIcon ? "" : "disabled"}>Nuevo icono</button><button type="button" data-map-action="delete-paint-icon" ${selectedIcon ? "" : "disabled"}>Eliminar icono</button></div>` : `<label>Grosor <input type="range" min="${MIN_PAINT_SIZE}" max="${MAX_PAINT_SIZE}" value="${state.paint.size}" data-paint-size><output>${Math.round(state.paint.size)} px</output></label>`}
      ${renderOpacityControl("paint")}
      <div class="combat-map-tool-actions"><button type="button" data-map-action="undo-paint" ${state.paint.strokes.length ? "" : "disabled"}>Deshacer trazo</button><button type="button" data-map-action="clear-paint" ${state.paint.strokes.length ? "" : "disabled"}>Borrar dibujo</button></div>
      <p class="combat-map-help">El pincel añade trazos y la goma borra únicamente las partes por las que pasa. Todo se guarda con la campaña.</p>
    </section>`;
  }

  function renderShapesMenu(panel) {
    const selectedShape = getSelectedShape();
    const values = selectedShape || state.shapes;
    const isText = values.type === "text";
    const distanceLabel = values.type === "cone" ? "Longitud" : values.type === "square" ? "Lado" : "Radio";
    const selected = Boolean(selectedShape);
    return `<section class="combat-map-popover" data-map-panel="shapes" ${panel === "shapes" ? "" : "hidden"}>
      <h2>Formas de área</h2>
      <p class="combat-map-editor-mode"><strong>${selected ? "Editando forma seleccionada" : "Preparando nueva forma"}</strong><span>${selected ? "Los cambios se aplican a la forma existente." : "Configura sus propiedades y pulsa Añadir forma."}</span></p>
      ${renderOpacityControl("shapes")}
      <label>Forma <select data-shape-type><option value="circle" ${values.type === "circle" ? "selected" : ""}>Círculo</option><option value="square" ${values.type === "square" ? "selected" : ""}>Cuadrado</option><option value="cone" ${values.type === "cone" ? "selected" : ""}>Cono</option><option value="text" ${isText ? "selected" : ""}>Texto</option></select></label>
      ${isText ? `<label>Contenido <textarea rows="3" maxlength="500" data-shape-text>${escapeHtml(values.text)}</textarea></label><label><input type="checkbox" data-shape-text-box ${values.textBoxVisible ? "checked" : ""}> Mostrar rectángulo de fondo</label><label>Color del rectángulo <input type="color" value="${values.textBoxColor}" data-shape-text-box-color ${values.textBoxVisible ? "" : "disabled"}></label><label>Color del texto <input type="color" value="${values.textColor}" data-shape-text-color></label><label>Tamaño <input type="range" min="10" max="120" step="1" value="${values.fontSize}" data-shape-font-size><output>${Math.round(values.fontSize)} px</output></label>` : `<label>Color <input type="color" value="${values.color}" data-shape-color></label><label>${distanceLabel} <input type="number" min="5" max="500" step="5" value="${values.distanceFeet}" data-shape-distance> pies</label>${selected ? "" : `<label>Casilla inicial <input type="text" maxlength="12" placeholder="A8" value="${escapeHtml(state.shapes.coordinate)}" data-shape-coordinate></label>`}`}
      ${shapeCoordinateError ? `<p class="combat-map-error" role="alert">${escapeHtml(shapeCoordinateError)}</p>` : ""}
      ${selected ? `<button type="button" data-map-action="new-shape">Preparar nueva forma</button>` : `<button type="button" data-map-action="add-shape">Añadir forma</button>`}
      <div class="combat-map-tool-actions"><button type="button" data-map-action="rotate-shape-left" ${selected ? "" : "disabled"}>Girar −15°</button><button type="button" data-map-action="rotate-shape-right" ${selected ? "" : "disabled"}>Girar +15°</button><button type="button" data-map-action="delete-shape" ${selected ? "" : "disabled"}>Eliminar</button></div>
      <p class="combat-map-help">${isText ? "El texto puede arrastrarse fuera de la imagen, dentro del espacio del editor." : "La casilla es opcional: centra círculos y cuadrados; en conos coloca el origen."}</p>
    </section>`;
  }

  function renderInitiative(viewportWindow = window) {
    if (!state.initiative.visible) return "";
    const content = options.renderInitiativeOrder?.(viewportWindow, initiativeLayout) || "<p>Sin iniciativa.</p>";
    return `<aside class="combat-map-initiative combat-tracker-panel" data-map-initiative-order style="opacity:${layerOpacity("initiative")}">${content}</aside><div class="combat-map-initiative-resizer" data-map-initiative-resizer title="Arrastrar para cambiar el tamaño"></div>`;
  }

  function renderPortrait(combatant) {
    const url = clean(combatant.tokenUrl);
    return url ? `<img src="${escapeHtml(url)}" alt="" draggable="false">` : `<i>${escapeHtml(getInitials(combatant.nombre))}</i>`;
  }

  function showHealth(combatant) {
    return state.healthMode === "all" || state.healthMode === getSide(combatant);
  }

  function renderTokens(layer = "all", behavior = {}) {
    const master = behavior.master === true;
    const player = behavior.player === true;
    return getCombatants().map((combatant, index) => ({ combatant, index })).filter(({ combatant }) => (
      getTokenEnabled(combatant) && !(player && combatant.hiddenFromInitiative === true)
    )).map(({ combatant, index }) => {
      const side = getSide(combatant);
      const hidden = combatant.hiddenFromInitiative === true;
      if (master ? layer === "covered" : (layer === "allies" ? side !== "allies" : layer === "covered" && side === "allies")) return "";
      const position = getTokenPosition(combatant, index);
      const maxHp = Math.max(1, Number(combatant.pgMax) || 1);
      const hp = clamp(combatant.pgAct === "" ? maxHp : combatant.pgAct, 0, maxHp);
      const conditions = getConditions(combatant);
      const conditionMeta = conditions.map(getStatusMeta);
      const tokenSize = state.grid.size * getCreatureSizeMultiplier(combatant);
      const counterRotation = state.rotationOrientation === "upright" ? -state.rotation : 0;
      const isFlying = combatant.isFlying === true;
      const flyingHeight = Math.max(0, Math.round(Number(combatant.flyingHeight) || 0));
      const stackIndex = getTokenStackIndex(combatant.id, index);
      return `<div class="combat-map-token combat-map-token--${side} ${isFlying ? "is-flying" : ""} ${master && hidden ? "is-hidden-from-initiative" : ""}" data-map-token="${escapeHtml(combatant.id)}" data-map-token-size-multiplier="${getCreatureSizeMultiplier(combatant)}" style="--token-size:${tokenSize}px;--token-counter-rotation:${counterRotation}deg;left:${position.x}px;top:${position.y}px;z-index:${5 + stackIndex}" title="${escapeHtml(combatant.nombre || "Entidad")}">
        ${isFlying ? `<img class="combat-map-token__wing combat-map-token__wing--left" src="${escapeHtml(tokenWingUrl)}" alt=""><img class="combat-map-token__wing combat-map-token__wing--right" src="${escapeHtml(tokenWingUrl)}" alt=""><span class="combat-map-token__flight-height">${flyingHeight} pies</span>` : ""}
        <span class="combat-map-token__portrait">${renderPortrait(combatant)}</span><strong>${escapeHtml(combatant.numPeana || "—")}</strong>
        ${conditionMeta.length ? `<span class="combat-map-token__status-icons">${conditionMeta.map((meta) => `<i class="${escapeHtml(meta.tone)}" title="${escapeHtml(meta.label)}">${meta.iconUrl ? `<img src="${escapeHtml(meta.iconUrl)}" alt="">` : escapeHtml(meta.label.slice(0, 2).toUpperCase())}</i>`).join("")}</span>` : ""}
        ${showHealth(combatant) ? `<span class="combat-map-token__health" style="opacity:${normalizeOpacity(state.opacity.health)}"><i style="width:${(hp / maxHp) * 100}%"></i></span>` : ""}
        ${conditionMeta.length ? `<span class="combat-map-token__statuses">${conditionMeta.map((meta) => `<em class="${escapeHtml(meta.tone)}">${meta.iconUrl ? `<img src="${escapeHtml(meta.iconUrl)}" alt="">` : ""}<span>${escapeHtml(meta.label)}</span></em>`).join("")}</span>` : ""}
      </div>`;
    }).join("");
  }

  function renderAreaShapes() {
    return state.shapes.items.filter((shape) => shape.type !== "text").map((shape) => {
      const metrics = getAreaShapeMetrics(shape, state.grid);
      const selected = shape.id === state.shapes.selectedId;
      const geometry = shape.type === "circle"
        ? `<circle cx="100" cy="100" r="96"></circle>`
        : shape.type === "square"
          ? `<rect x="4" y="4" width="192" height="192" rx="4"></rect>`
          : `<polygon points="0,100 196,4 196,196"></polygon>`;
      const labelCounterRotation = state.rotationOrientation === "upright" ? -(state.rotation + shape.rotation) : 0;
      const anchorX = shape.type === "cone" ? "0%" : "-50%";
      return `<div class="combat-map-area-shape combat-map-area-shape--${shape.type} ${selected ? "is-selected" : ""}" data-map-shape="${escapeHtml(shape.id)}" style="--shape-color:${shape.color};--shape-size:${metrics.distancePx}px;--shape-width:${metrics.width}px;--shape-height:${metrics.height}px;--shape-anchor-x:${anchorX};--shape-label-counter-rotation:${labelCounterRotation}deg;left:${shape.x}px;top:${shape.y}px;transform:translate(${anchorX},-50%) rotate(${shape.rotation}deg)">
        <svg viewBox="0 0 200 200" aria-hidden="true">${geometry}</svg>
        <button type="button" class="combat-map-area-shape__rotate" data-map-shape-rotate="${escapeHtml(shape.id)}" title="Arrastrar para rotar" aria-label="Rotar forma"></button>
      </div>`;
    }).join("");
  }

  function renderTextShapes(gutter, width, height) {
    return state.shapes.items.filter((shape) => shape.type === "text").map((shape) => {
      const point = rotateDisplayPoint(shape, width, height);
      const selected = shape.id === state.shapes.selectedId;
      const rotation = shape.rotation + (state.rotationOrientation === "with-map" ? state.rotation : 0);
      return `<div class="combat-map-text-shape ${shape.textBoxVisible ? "has-box" : "is-transparent"} ${selected ? "is-selected" : ""}" data-map-shape="${escapeHtml(shape.id)}" data-map-text-shape style="left:${gutter + point.x}px;top:${gutter + point.y}px;--text-box-color:${shape.textBoxColor};--text-color:${shape.textColor};--text-size:${shape.fontSize}px;transform:translate(-50%,-50%) rotate(${rotation}deg)"><span>${escapeHtml(shape.text || "Texto")}</span><button type="button" class="combat-map-area-shape__rotate" data-map-shape-rotate="${escapeHtml(shape.id)}" title="Arrastrar para rotar" aria-label="Rotar texto"></button></div>`;
    }).join("");
  }

  function renderPaintIcons() {
    return state.paint.strokes.filter((stroke) => stroke.mode === "icon").map((stroke) => {
      const point = stroke.points[0] || { x: 0, y: 0 };
      const selected = stroke.id === state.paint.selectedIconId;
      return `<div class="combat-map-paint-icon ${selected ? "is-selected" : ""}" data-map-paint-icon="${escapeHtml(stroke.id)}" style="--paint-icon-color:${stroke.color};--paint-icon-size:${stroke.size}px;left:${point.x}px;top:${point.y}px;transform:translate(-50%,-50%) rotate(${stroke.rotation}deg)"><span>${escapeHtml(stroke.icon)}</span><button type="button" class="combat-map-paint-icon__rotate" data-map-paint-icon-rotate="${escapeHtml(stroke.id)}" title="Arrastrar para rotar" aria-label="Rotar icono"></button></div>`;
    }).join("");
  }

  function renderStage(behavior = {}) {
    const master = behavior.master === true;
    const player = behavior.player === true;
    const editable = behavior.editable === true;
    const panel = player ? playerOpenPanel : openPanel;
    const map = state.map;
    const width = map?.width || DEFAULT_WIDTH;
    const height = map?.height || DEFAULT_HEIGHT;
    const sideways = state.rotation === 90 || state.rotation === 270;
    const displayWidth = sideways ? height : width;
    const displayHeight = sideways ? width : height;
    const gridGutter = state.grid.visible ? GRID_LABEL_GUTTER : 0;
    const textGutter = state.shapes.items.some((shape) => shape.type === "text") ? getTextShapeGutter(displayWidth, displayHeight) : 0;
    const gutter = gridGutter + textGutter;
    const totalWidth = displayWidth + gutter * 2;
    const totalHeight = displayHeight + gutter * 2;
    return `<div class="combat-map-viewport ${master ? "combat-map-viewport--master" : ""} ${player ? "combat-map-viewport--player" : ""}"><div class="combat-map-frame" data-map-frame><div class="combat-map-scale-layer" data-map-scale-layer style="width:${totalWidth}px;height:${totalHeight}px"><div class="combat-map-board" data-map-board data-map-width="${width}" data-map-height="${height}" data-display-width="${displayWidth}" data-display-height="${displayHeight}" style="left:${gutter}px;top:${gutter}px;width:${displayWidth}px;height:${displayHeight}px;aspect-ratio:${displayWidth}/${displayHeight}">
      <div class="combat-map-clip">
      <div class="combat-map-rotating-layers" style="inset:auto;left:50%;top:50%;width:${width}px;height:${height}px;transform:translate(-50%,-50%) rotate(${state.rotation}deg)">
        ${map?.imageUrl ? `<img class="combat-map-image" src="${escapeHtml(map.imageUrl)}" alt="${escapeHtml(map.name)}" draggable="false">` : `<div class="combat-map-empty"><strong>${map ? "Mapa privado" : "Sin mapa"}</strong><span>${map ? "Inicia sesión con la cuenta propietaria para cargarlo." : "Carga una imagen desde equipo o nube."}</span></div>`}
        <div class="combat-map-grid ${state.grid.visible ? "is-visible" : ""}" data-map-grid></div>
        <canvas class="combat-map-grid-coordinates ${state.grid.visible ? "is-visible" : ""}" data-map-grid-coordinates width="${width}" height="${height}" style="opacity:${layerOpacity("grid")}"></canvas>
        <canvas class="combat-map-paint ${editable && panel === "paint" ? "is-editing" : ""} ${state.paint.mode === "erase" ? "is-erasing" : ""}" data-map-paint width="${width}" height="${height}" style="opacity:${layerOpacity("paint")}"></canvas>
        <div class="combat-map-paint-icon-layer ${editable && panel === "paint" ? "is-editing" : ""}" data-map-paint-icon-layer style="opacity:${layerOpacity("paint")}">${renderPaintIcons()}</div>
        <div class="combat-map-shape-layer ${editable && panel === "shapes" ? "is-editing" : ""}" data-map-shape-layer style="opacity:${layerOpacity("shapes")}">${renderAreaShapes()}</div>
        <div class="combat-map-token-layer combat-map-token-layer--covered" style="opacity:${layerOpacity("tokens")}">${renderTokens("covered", { master, player })}</div>
        <canvas class="combat-map-fog ${state.fog.enabled ? "is-visible" : ""} ${editable && state.fog.enabled && panel === "fog" ? "is-editing" : ""}" data-map-fog width="${width}" height="${height}" style="opacity:${player ? 1 : layerOpacity("fog")}"></canvas>
        <div class="combat-map-token-layer combat-map-token-layer--allies" style="opacity:${layerOpacity("tokens")}">${renderTokens("allies", { master, player })}</div>
        <div class="combat-map-brush-cursor" data-map-brush-cursor></div>
      </div>
      </div>
    </div><canvas class="combat-map-grid-labels ${state.grid.visible ? "is-visible" : ""}" data-map-grid-labels width="${displayWidth + gridGutter * 2}" height="${displayHeight + gridGutter * 2}" style="left:${textGutter}px;top:${textGutter}px;width:${displayWidth + gridGutter * 2}px;height:${displayHeight + gridGutter * 2}px;opacity:${layerOpacity("grid")}"></canvas><div class="combat-map-text-layer ${editable && panel === "shapes" ? "is-editing" : ""}" style="opacity:${layerOpacity("shapes")}">${renderTextShapes(gutter, width, height)}</div></div></div></div>`;
  }

  function showConfirmation({ surface = masterHost, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
    const attachedSurface = surface?.isConnected ? surface : null;
    pendingConfirmation = {
      surfaceKind: attachedSurface ? getSurfaceKind(attachedSurface) : "detached",
      title: clean(title) || "Confirmar acción",
      message: clean(message),
      confirmLabel: clean(confirmLabel) || "Confirmar",
      cancelLabel: clean(cancelLabel) || "Cancelar",
      onConfirm,
      onCancel
    };
    if (!attachedSurface) renderDetachedConfirmation();
    sync();
  }

  function resolveConfirmation(confirmed) {
    const confirmation = pendingConfirmation;
    pendingConfirmation = null;
    detachedConfirmationElement?.remove();
    detachedConfirmationElement = null;
    if (!confirmation) return;
    if (confirmed) confirmation.onConfirm?.();
    else confirmation.onCancel?.();
    if (pendingConfirmation === null) sync();
  }

  function renderConfirmation(version) {
    if (!pendingConfirmation || pendingConfirmation.surfaceKind !== version) return "";
    return getConfirmationMarkup();
  }

  function getConfirmationMarkup() {
    return `<div class="combat-map-confirmation" role="presentation">
      <section class="combat-map-confirmation__panel" role="dialog" aria-modal="true" aria-labelledby="combat-map-confirmation-title">
        <h2 id="combat-map-confirmation-title">${escapeHtml(pendingConfirmation.title)}</h2>
        <p>${escapeHtml(pendingConfirmation.message)}</p>
        <footer>
          <button type="button" data-map-action="cancel-confirmation">${escapeHtml(pendingConfirmation.cancelLabel)}</button>
          <button type="button" class="is-primary" data-map-action="confirm-confirmation">${escapeHtml(pendingConfirmation.confirmLabel)}</button>
        </footer>
      </section>
    </div>`;
  }

  function renderDetachedConfirmation() {
    detachedConfirmationElement?.remove();
    const container = document.createElement("div");
    container.innerHTML = getConfirmationMarkup();
    detachedConfirmationElement = container.firstElementChild;
    detachedConfirmationElement?.querySelector('[data-map-action="confirm-confirmation"]')?.addEventListener("click", () => resolveConfirmation(true));
    detachedConfirmationElement?.querySelector('[data-map-action="cancel-confirmation"]')?.addEventListener("click", () => resolveConfirmation(false));
    if (detachedConfirmationElement) document.body.append(detachedConfirmationElement);
  }

  function renderMaster(viewportWindow = window) {
    const panel = openPanel;
    const initiativePosition = state.initiative.visible ? state.initiative.position : "none";
    return `<div class="combat-map-editor combat-map-editor--master">${renderToolbar("master")}${renderMapMenu("master")}${renderGridMenu(panel)}${renderTokenMenu(panel)}${renderFogMenu(panel)}${renderPaintMenu(panel)}${renderShapesMenu(panel)}${renderHealthMenu(panel)}${renderInitiativeMenu(panel)}<div class="combat-map-workspace combat-map-workspace--${initiativePosition}" data-map-workspace style="--initiative-size:${state.initiative.size}px">${renderInitiative(viewportWindow)}${renderStage({ master: true, editable: true })}</div>${options.renderContextMenu?.(viewportWindow) || ""}${renderCloudMapPicker("master")}${renderConfirmation("master")}<input type="file" accept="image/*" data-map-file-hidden hidden></div>`;
  }

  function renderPlayer(viewportWindow = editorWindow) {
    const panel = playerOpenPanel;
    const initiativePosition = state.initiative.visible ? state.initiative.position : "none";
    return `<div class="combat-map-editor combat-map-editor--player">${renderToolbar("player")}${renderMapMenu("player")}${renderGridMenu(panel)}${renderTokenMenu(panel)}${renderFogMenu(panel)}${renderPaintMenu(panel)}${renderShapesMenu(panel)}${renderHealthMenu(panel)}${renderInitiativeMenu(panel)}<div class="combat-map-workspace combat-map-workspace--${initiativePosition}" data-map-workspace style="--initiative-size:${state.initiative.size}px">${renderInitiative(viewportWindow)}${renderStage({ player: true, editable: true })}</div>${options.renderContextMenu?.(viewportWindow) || ""}${renderCloudMapPicker("player")}${renderConfirmation("player")}<input type="file" accept="image/*" data-map-file-hidden hidden></div>`;
  }

  function sync() {
    if (isOpen()) {
      const root = editorWindow.document.querySelector("[data-combat-map-root]");
      if (root) {
        root.innerHTML = renderPlayer(editorWindow);
        updateMapScale();
        fitInitiativeOrder(root);
        drawGridCoordinates(root);
        drawGridLabels(root);
        drawPaint(root);
        drawFog(root);
      }
    }
    if (masterHost?.isConnected) syncMasterSurface(masterHost);
    lastCombatantFingerprint = getCombatantFingerprint();
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
    const gutter = (state.grid.visible ? GRID_LABEL_GUTTER : 0) + (state.shapes.items.some((shape) => shape.type === "text") ? getTextShapeGutter(width, height) : 0);
    const totalWidth = width + gutter * 2;
    const totalHeight = height + gutter * 2;
    const availableWidth = Math.max(1, viewport.clientWidth - 24);
    const availableHeight = Math.max(1, viewport.clientHeight - 24);
    mapFitScale = Math.max(.03, Math.min(availableWidth / totalWidth, availableHeight / totalHeight));
    const effectiveScale = mapFitScale * state.playerViewport.zoom;
    scaleLayer.style.transform = `scale(${effectiveScale})`;
    frame.style.width = `${totalWidth * effectiveScale}px`;
    frame.style.height = `${totalHeight * effectiveScale}px`;
    frame.dataset.mapScale = String(effectiveScale);
    viewport.scrollLeft = state.playerViewport.scrollLeft;
    viewport.scrollTop = state.playerViewport.scrollTop;
  }

  function fitInitiativeOrder(root = editorWindow?.document) {
    if (!root || !state.initiative.visible) return;
    const panel = root.querySelector("[data-map-initiative-order]");
    const strip = panel?.querySelector(".combat-turn-strip");
    const count = strip?.querySelectorAll(".combat-turn-token-wrap").length || 0;
    if (!panel || !strip || !count) return;
    const availableWidth = Math.max(1, panel.clientWidth - 24);
    const availableHeight = Math.max(1, panel.clientHeight - 24);
    const baseWidth = 150;
    const baseHeight = 288;
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
    const surface = getEventSurface(event);
    const viewportState = surface === masterHost ? state.viewport : state.playerViewport;
    viewportState.scrollLeft = event.target.scrollLeft;
    viewportState.scrollTop = event.target.scrollTop;
    if (viewportPersistTimer) window.clearTimeout(viewportPersistTimer);
    viewportPersistTimer = window.setTimeout(() => {
      viewportPersistTimer = 0;
      persist();
    }, 180);
  }

  function setMapZoom(value, root = masterHost || editorWindow?.document) {
    const viewportState = root === masterHost ? state.viewport : state.playerViewport;
    viewportState.zoom = clamp(value, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
    if (root === masterHost) updateMasterScale(root);
    else updateMapScale();
    drawGridCoordinates(root);
    drawGridLabels(root);
    drawPaint(root);
    drawFog(root);
    const input = root?.querySelector("[data-map-zoom]");
    if (input) {
      input.value = String(Math.round(viewportState.zoom * 100));
      input.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(viewportState.zoom * 100)}%`);
    }
    persist();
  }

  function handleWheel(event) {
    if (!event.target.closest?.("[data-map-board]")) return;
    event.preventDefault();
    const surface = getEventSurface(event);
    const viewportState = surface === masterHost ? state.viewport : state.playerViewport;
    setMapZoom(viewportState.zoom + (event.deltaY < 0 ? .1 : -.1), surface);
  }

  function prepareCanvas(canvas, logicalWidth, logicalHeight) {
    const frameScale = Number(canvas?.closest?.("[data-map-frame]")?.dataset.mapScale) || 1;
    const pixelRatio = clamp((canvas?.ownerDocument?.defaultView?.devicePixelRatio || 1) * frameScale, 1, 4);
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
    context.font = `500 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = Math.max(1, fontSize * .1);
    context.strokeStyle = "rgba(0, 0, 0, .82)";
    context.fillStyle = state.grid.color;
    context.strokeText(value, 0, 0);
    context.fillText(value, 0, 0);
    context.restore();
  }

  function drawGridCoordinates(root = editorWindow?.document) {
    if (!root) return;
    const canvas = root.querySelector("[data-map-grid-coordinates]");
    if (!canvas) return;
    const board = root.querySelector("[data-map-board]");
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

  function updateGridScaleVisuals(input = null, root = masterHost || editorWindow?.document) {
    input?.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.grid.size)} px`);
    resnapTokensWithoutOverlap();
    root?.querySelectorAll("[data-map-token]").forEach((token) => {
      const multiplier = Number(token.dataset.mapTokenSizeMultiplier) || 1;
      token.style.setProperty("--token-size", `${state.grid.size * multiplier}px`);
      const snapped = state.tokenPositions[token.dataset.mapToken];
      token.style.left = `${snapped.x}px`;
      token.style.top = `${snapped.y}px`;
    });
    root?.querySelectorAll("[data-map-shape]").forEach((element) => {
      const shape = state.shapes.items.find((item) => item.id === element.dataset.mapShape);
      if (shape) {
        const metrics = getAreaShapeMetrics(shape, state.grid);
        element.style.setProperty("--shape-size", `${metrics.distancePx}px`);
        element.style.setProperty("--shape-width", `${metrics.width}px`);
        element.style.setProperty("--shape-height", `${metrics.height}px`);
      }
    });
    drawGridCoordinates(root);
    drawGridLabels(root);
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

  function drawGridLabels(root = editorWindow?.document) {
    if (!root) return;
    const canvas = root.querySelector("[data-map-grid-labels]");
    if (!canvas) return;
    const gutter = GRID_LABEL_GUTTER;
    const board = root.querySelector("[data-map-board]");
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
    if (stroke.mode === "icon") {
      const point = points[0];
      context.translate(point.x, point.y);
      context.rotate((Number(stroke.rotation) || 0) * Math.PI / 180);
      context.fillStyle = stroke.color;
      context.font = `700 ${Math.max(16, Number(stroke.size) || 64)}px system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(MAP_ICON_OPTIONS.includes(stroke.icon) ? stroke.icon : MAP_ICON_OPTIONS[0], 0, 0);
      context.restore();
      return;
    }
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

  function drawPaint(root = editorWindow?.document) {
    if (!root) return;
    const canvas = root.querySelector("[data-map-paint]");
    if (!canvas) return;
    const board = root.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const context = prepareCanvas(canvas, width, height);
    state.paint.strokes.filter((stroke) => stroke.mode !== "icon").forEach((stroke) => paintStroke(context, stroke));
  }

  function drawFog(root = editorWindow?.document) {
    if (!root) return;
    const canvas = root.querySelector("[data-map-fog]");
    if (!canvas) return;
    const board = root.querySelector("[data-map-board]");
    const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
    const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
    const context = prepareCanvas(canvas, width, height);
    context.globalCompositeOperation = "source-over";
    const isMaster = root?.matches?.("[data-combat-map-master-root]") || root?.hasAttribute?.("data-combat-map-master-root");
    context.fillStyle = isMaster ? "rgba(42, 45, 52, .68)" : "rgb(18, 18, 20)";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "destination-out";
    state.fog.revealed.forEach((point) => {
      if (point.type === "polygon") {
        context.fillStyle = "#000";
        context.beginPath();
        point.points.forEach((vertex, index) => index ? context.lineTo(vertex.x, vertex.y) : context.moveTo(vertex.x, vertex.y));
        context.closePath();
        context.fill();
        return;
      }
      if (point.type === "square") {
        context.fillStyle = "#000";
        context.fillRect(point.x - point.r, point.y - point.r, point.r * 2, point.r * 2);
        return;
      }
      const gradient = context.createRadialGradient(point.x, point.y, point.r * .45, point.x, point.y, point.r);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      context.fill();
    });
    if (state.fog.enabled && getSurfacePanel(root) === "fog" && state.fog.mode === "polygon" && state.fog.polygonDraft.length) {
      const points = [...state.fog.polygonDraft, ...(fogPolygonCursor ? [fogPolygonCursor] : [])];
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "#f6c768";
      context.fillStyle = "#f6c768";
      context.lineWidth = 3;
      context.setLineDash([10, 7]);
      context.beginPath();
      points.forEach((vertex, index) => index ? context.lineTo(vertex.x, vertex.y) : context.moveTo(vertex.x, vertex.y));
      context.stroke();
      context.setLineDash([]);
      state.fog.polygonDraft.forEach((vertex, index) => {
        context.beginPath();
        context.arc(vertex.x, vertex.y, index === 0 ? 8 : 5, 0, Math.PI * 2);
        context.fill();
      });
    }
  }

  function applyFogPolygon() {
    if (state.fog.polygonDraft.length < 3) return;
    state.fog.revealed.push({ type: "polygon", points: state.fog.polygonDraft.map(normalizePoint) });
    state.fog.revealed = normalizeFogRevealed(state.fog.revealed);
    state.fog.polygonDraft = [];
    fogPolygonCursor = null;
    persist();
    sync();
  }

  function togglePanel(name, surface = masterHost) {
    if (getSurfaceKind(surface) === "player") {
      playerOpenPanel = playerOpenPanel === name ? "" : name;
    } else {
      openPanel = openPanel === name ? "" : name;
      state.openPanel = openPanel;
    }
    persist();
    sync();
  }

  function finishMapSelection(map, surface = masterHost, onApplied = null) {
    const callback = pickerCallback;
    pickerCallback = null;
    setMap(map, {
      surface,
      onApplied: (appliedMap) => {
        callback?.(appliedMap);
        onApplied?.(appliedMap);
      }
    });
  }

  function selectEncounterChoice(index, surface = masterHost) {
    const choice = getEncounterMapChoices()[Number(index)];
    if (!choice?.map) return;
    if (choice.editorState) applyMapWorkspace(choice.map, choice.editorState);
    else finishMapSelection(choice.map, surface);
    if (pickerCallback) {
      const callback = pickerCallback;
      pickerCallback = null;
      callback(choice.map);
    }
  }

  function selectSavedLayout(key, surface = masterHost) {
    const layout = state.savedMapLayouts.find((item) => item.key === clean(key));
    if (layout?.map) finishMapSelection(layout.map, surface);
  }

  async function handleImageFile(file, surface = masterHost) {
    localImageBusy = true;
    localImageError = "";
    sync();
    try {
      const converted = await convertImageFileToWebp(file);
      const map = { name: clean(file.name).replace(/\.[^.]+$/, "") || "Mapa", imageUrl: converted.dataUrl, width: converted.width, height: converted.height, cloudEntryId: "", isPrivate: false, isAnimated: converted.isAnimated === true };
      localImageBusy = false;
      setMap(map, { surface, onApplied: () => showUploadPrompt(map, converted.blob, surface) });
      return map;
    } catch (error) {
      localImageBusy = false;
      localImageError = error?.message || "Imagen no válida.";
      sync();
      options.onNotify?.("No se pudo cargar el mapa", localImageError, "danger");
      return null;
    }
  }

  async function createBlankMap(surface = masterHost) {
    const [ratioWidth, ratioHeight] = blankMapRatio.split(":").map(Number);
    const landscape = ratioWidth >= ratioHeight;
    const width = landscape ? 1600 : Math.round(1600 * ratioWidth / ratioHeight);
    const height = landscape ? Math.round(1600 * ratioHeight / ratioWidth) : 1600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("No se pudo crear la hoja en blanco.")),
      "image/webp",
      1
    ));
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(new Error("No se pudo leer la hoja en blanco.")), { once: true });
      reader.readAsDataURL(blob);
    });
    const map = { name: `Hoja blanca ${blankMapRatio}`, imageUrl: dataUrl, width, height, cloudEntryId: "", isPrivate: false, isAnimated: false };
    setMap(map, { surface, onApplied: () => showUploadPrompt(map, blob, surface) });
  }

  async function showUploadPrompt(map, blob, surface = masterHost) {
    const targetSurface = surface?.isConnected ? surface : masterHost;
    if (!targetSurface?.isConnected) return;
    try {
      if (!cloudPickerItems.length) await loadCloudMapItems();
    } catch {
      // New tags remain available even when the catalog cannot be listed.
    }
    if (!targetSurface?.isConnected) return;
    const panel = targetSurface.querySelector('[data-map-panel="map"]');
    if (!panel) return;
    panel.hidden = false;
    const authenticated = Boolean(options.getAccountSession?.()?.user?.id);
    const knownTags = [...new Set(cloudPickerItems.flatMap((item) => normalizeTags(item.tags)))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const prompt = targetSurface.ownerDocument.createElement("div");
    prompt.className = "combat-map-upload-prompt";
    prompt.innerHTML = `<strong>Mapa listo en WebP</strong><small>${map.width} × ${map.height} px · ${(blob.size / (1024 * 1024)).toFixed(1)} MB</small><label>Nombre <input data-map-upload-name value="${escapeHtml(map.name)}"></label><label><input type="checkbox" data-map-upload-private> Guardar privado</label><label>Etiquetas existentes <select multiple size="${Math.min(5, Math.max(2, knownTags.length))}" data-map-upload-tags>${knownTags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("")}</select></label><label>Etiquetas nuevas <input data-map-upload-new-tags maxlength="240" placeholder="mazmorra, bosque, nocturno"></label><button type="button" data-map-upload-confirm ${authenticated ? "" : "disabled"}>Guardar en nube</button>${authenticated ? "" : "<small>Inicia sesión para guardar en nube.</small>"}`;
    panel.append(prompt);
    prompt.querySelector("[data-map-upload-confirm]")?.addEventListener("click", async () => {
      const button = prompt.querySelector("[data-map-upload-confirm]");
      button.disabled = true;
      button.textContent = "Guardando…";
      try {
        const uploaded = await uploadCloudImage(blob, { width: map.width, height: map.height });
        const name = clean(prompt.querySelector("[data-map-upload-name]")?.value) || map.name;
        const isPublic = prompt.querySelector("[data-map-upload-private]")?.checked !== true;
        const selectedTags = [...(prompt.querySelector("[data-map-upload-tags]")?.selectedOptions || [])].map((option) => option.value);
        const customTags = String(prompt.querySelector("[data-map-upload-new-tags]")?.value || "").split(",");
        const tags = normalizeTags([...selectedTags, ...customTags]);
        const imageUrl = `${uploaded.asset.url}${map.isAnimated ? "?animated=1" : ""}`;
        const created = await createCloudLibraryEntry({ type: "map", name, imageUrl, tags, isPublic, payload: { map: { name, imageUrl, width: map.width, height: map.height, isAnimated: map.isAnimated === true }, editorState: createCurrentMapWorkspace() } });
        setMap({ name, imageUrl, width: map.width, height: map.height, cloudEntryId: created.entry.id, isPrivate: !isPublic, isAnimated: map.isAnimated === true }, { retainWorkspace: true, surface: targetSurface });
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

  function createPaintIconId() {
    return `paint-icon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getSelectedShape() {
    return state.shapes.items.find((shape) => shape.id === state.shapes.selectedId) || null;
  }

  function addAreaShape(point = null, root = masterHost) {
    const board = root?.querySelector("[data-map-board]");
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
      text: state.shapes.text || "Texto",
      textBoxVisible: state.shapes.textBoxVisible,
      textBoxColor: state.shapes.textBoxColor,
      textColor: state.shapes.textColor,
      fontSize: state.shapes.fontSize,
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

  function resetMapCanvas(root = masterHost) {
    if (!state.map) return;
    showConfirmation({
      surface: root,
      title: "Restablecer imagen",
      message: "Se borrarán rejilla, niebla, dibujos, formas, posiciones, zoom y rotación de este mapa.",
      confirmLabel: "Restablecer",
      cancelLabel: "Cancelar",
      onConfirm: () => {
        const currentKey = getMapLayoutKey(state.map);
        state = normalizeMapEditorState({
          map: state.map,
          savedMapLayouts: state.savedMapLayouts.filter((layout) => layout.key !== currentKey),
          windowBounds: state.windowBounds,
          openPanel: getSurfaceKind(root) === "master" ? "map" : openPanel,
          healthMode: state.healthMode,
          initiative: state.initiative
        });
        if (getSurfaceKind(root) === "player") playerOpenPanel = "map";
        else openPanel = "map";
        mapLoadMenuSurface = "";
        persist();
        sync();
      }
    });
  }

  function handleClick(event) {
    const surface = getEventSurface(event);
    const surfaceKind = getSurfaceKind(surface);
    if (event.target.closest("[data-map-initiative-order]")) {
      options.handleInitiativeClick?.(event);
      return;
    }
    if (event.target.closest("[data-combat-turn-quick-menu]")) {
      options.handleContextClick?.(event);
      return;
    }
    const action = event.target.closest("[data-map-action]")?.dataset.mapAction;
    const cloudChoice = event.target.closest("[data-map-cloud-choice]")?.dataset.mapCloudChoice;
    const encounterChoice = event.target.closest("[data-map-encounter-choice]")?.dataset.mapEncounterChoice;
    const savedLayout = event.target.closest("[data-map-saved-layout]")?.dataset.mapSavedLayout;
    if (encounterChoice !== undefined) { selectEncounterChoice(encounterChoice, surface); return; }
    if (savedLayout) { selectSavedLayout(savedLayout, surface); return; }
    if (cloudChoice) { selectCloudMap(cloudChoice, surface); return; }
    if (!action) return;
    if (action === "confirm-confirmation") { resolveConfirmation(true); return; }
    if (action === "cancel-confirmation") { resolveConfirmation(false); return; }
    if (action === "open-map-menu") togglePanel("map", surface);
    if (action === "toggle-map-load-menu") { mapLoadMenuSurface = mapLoadMenuSurface === surfaceKind ? "" : surfaceKind; sync(); }
    if (action === "create-blank-map") createBlankMap(surface);
    if (action === "open-cloud-map-catalog" || action === "refresh-cloud-map-picker") openCloudMapPicker(surface);
    if (action === "close-cloud-map-picker") { cloudPickerSurface = ""; cloudPickerError = ""; sync(); }
    if (action === "reset-map-canvas") resetMapCanvas(surface);
    if (action === "toggle-grid-menu") togglePanel("grid", surface);
    if (action === "toggle-token-menu") togglePanel("tokens", surface);
    if (action === "toggle-fog-menu") togglePanel("fog", surface);
    if (action === "toggle-paint-menu") togglePanel("paint", surface);
    if (action === "toggle-shapes-menu") togglePanel("shapes", surface);
    if (action === "toggle-health-menu") togglePanel("health", surface);
    if (action === "toggle-initiative-menu") togglePanel("initiative", surface);
    if (action === "reset-fog") { state.fog.revealed = []; state.fog.polygonDraft = []; persist(); sync(); }
    if (action === "fog-brush-mode") { state.fog.mode = "brush"; state.fog.polygonDraft = []; persist(); sync(); }
    if (action === "fog-polygon-mode") { state.fog.mode = "polygon"; persist(); sync(); }
    if (action === "close-fog-polygon") applyFogPolygon();
    if (action === "cancel-fog-polygon") { state.fog.polygonDraft = []; fogPolygonCursor = null; persist(); sync(); }
    if (action === "paint-mode") { state.paint.mode = "paint"; persist(); sync(); }
    if (action === "line-mode") { state.paint.mode = "line"; persist(); sync(); }
    if (action === "icon-mode") { state.paint.mode = "icon"; persist(); sync(); }
    if (action === "erase-mode") { state.paint.mode = "erase"; persist(); sync(); }
    if (action === "undo-paint") { const removed = state.paint.strokes.pop(); if (removed?.id === state.paint.selectedIconId) state.paint.selectedIconId = ""; persist(); sync(); }
    if (action === "clear-paint") { state.paint.strokes = []; state.paint.selectedIconId = ""; persist(); sync(); }
    if (action === "new-paint-icon") { state.paint.selectedIconId = ""; persist(); sync(); }
    if (action === "delete-paint-icon") { state.paint.strokes = state.paint.strokes.filter((stroke) => stroke.id !== state.paint.selectedIconId); state.paint.selectedIconId = ""; persist(); sync(); }
    if (action === "add-shape") addAreaShape(null, surface);
    if (action === "new-shape") { state.shapes.selectedId = ""; shapeCoordinateError = ""; persist(); sync(); }
    if (action === "rotate-shape-left") rotateSelectedShape(-15);
    if (action === "rotate-shape-right") rotateSelectedShape(15);
    if (action === "delete-shape") deleteSelectedShape();
    if (action === "rotate-left") { state.rotation = (state.rotation + 270) % 360; persist(); sync(); }
    if (action === "rotate-right") { state.rotation = (state.rotation + 90) % 360; persist(); sync(); }
    const viewportState = surface === masterHost ? state.viewport : state.playerViewport;
    if (action === "zoom-out") setMapZoom(viewportState.zoom - .1, surface);
    if (action === "zoom-reset") setMapZoom(1, surface);
    if (action === "zoom-in") setMapZoom(viewportState.zoom + .1, surface);
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
    if (target.matches("[data-map-file], [data-map-file-hidden]")) { const file = target.files?.[0]; if (file) handleImageFile(file, getEventSurface(event)); return; }
    if (target.matches("[data-blank-map-ratio]")) { blankMapRatio = target.value; return; }
    if (target.matches("[data-grid-visible]")) {
      state.grid.visible = target.checked;
      options.onGridVisibilityChange?.(state.grid.visible);
    }
    else if (target.matches("[data-grid-type]")) state.grid.type = target.value === "hex" ? "hex" : "square";
    else if (target.matches("[data-grid-color]")) state.grid.color = normalizeColor(target.value, "#ffffff");
    else if (target.matches("[data-grid-size]")) state.grid.size = clamp(target.value, MIN_GRID_SIZE, MAX_GRID_SIZE);
    else if (target.matches("[data-fog-enabled]")) state.fog.enabled = target.checked;
    else if (target.matches("[data-fog-brush-shape]")) state.fog.brushShape = target.value === "square" ? "square" : "circle";
    else if (target.matches("[data-map-initiative-tokens]")) {
      getCombatants().filter(hasInitiativeToken).forEach((combatant) => {
        state.tokenVisibility[combatant.id] = target.checked;
        if (target.checked) bringTokenToFront(combatant.id);
      });
      if (target.checked) resnapTokensWithoutOverlap();
    }
    else if (target.matches("[data-map-token-toggle]")) {
      state.tokenVisibility[target.dataset.mapTokenToggle] = target.checked;
      if (target.checked) {
        bringTokenToFront(target.dataset.mapTokenToggle);
        resnapTokensWithoutOverlap();
      }
    }
    else if (target.matches("[data-map-health]")) state.healthMode = target.value;
    else if (target.matches("[data-map-initiative]")) state.initiative.visible = target.checked;
    else if (target.matches("[data-map-initiative-position]")) state.initiative.position = target.value;
    else if (target.matches("[data-map-rotation-orientation]")) state.rotationOrientation = target.value === "with-map" ? "with-map" : "upright";
    else if (target.matches("[data-paint-icon]")) {
      const value = MAP_ICON_OPTIONS.includes(target.value) ? target.value : MAP_ICON_OPTIONS[0];
      const icon = getSelectedPaintIcon();
      if (icon) icon.icon = value;
      else state.paint.icon = value;
    }
    else if (target.matches("[data-map-cloud-tags]")) cloudPickerSelectedTags = new Set([...target.selectedOptions].map((option) => option.value));
    else if (target.matches("[data-shape-type]")) {
      const value = ["circle", "square", "cone", "text"].includes(target.value) ? target.value : "circle";
      const shape = getSelectedShape();
      if (shape) shape.type = value;
      else state.shapes.type = value;
    } else if (target.matches("[data-shape-color]")) {
      const value = normalizeColor(target.value, "#f97316");
      const shape = getSelectedShape();
      if (shape) shape.color = value;
      else state.shapes.color = value;
    } else if (target.matches("[data-shape-distance]")) {
      const value = clamp(Math.round((Number(target.value) || 5) / 5) * 5, 5, 500);
      const shape = getSelectedShape();
      if (shape) shape.distanceFeet = value;
      else state.shapes.distanceFeet = value;
    } else if (target.matches("[data-shape-text-box]")) {
      const shape = getSelectedShape();
      if (shape?.type === "text") shape.textBoxVisible = target.checked;
      else state.shapes.textBoxVisible = target.checked;
    } else if (target.matches("[data-shape-text-box-color]")) {
      const value = normalizeColor(target.value, "#111827");
      const shape = getSelectedShape();
      if (shape?.type === "text") shape.textBoxColor = value;
      else state.shapes.textBoxColor = value;
    } else if (target.matches("[data-shape-text-color]")) {
      const value = normalizeColor(target.value, "#ffffff");
      const shape = getSelectedShape();
      if (shape?.type === "text") shape.textColor = value;
      else state.shapes.textColor = value;
    }
    else return;
    if (target.matches("[data-grid-visible], [data-grid-type], [data-grid-size]")) resnapTokensWithoutOverlap();
    persist(); sync();
    if (target.matches("[data-grid-visible], [data-grid-type], [data-grid-size]")) notifyTokenCoordinates();
  }

  function handleInput(event) {
    const surface = getEventSurface(event);
    if (event.target.closest("[data-map-initiative-order]")) { options.handleInitiativeInput?.(event); return; }
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextInput?.(event); return; }
    if (event.target.matches("[data-map-token-search]")) {
      tokenSearch = clean(event.target.value);
      const query = tokenSearch.toLocaleLowerCase("es");
      surface?.querySelectorAll("[data-map-token-row]").forEach((row) => {
        row.hidden = Boolean(query && !clean(row.dataset.mapTokenSearchValue).includes(query));
      });
    } else if (event.target.matches("[data-map-cloud-search]")) {
      cloudPickerQuery = event.target.value;
      sync();
      const nextSurface = getSurfaceKind(surface) === "player"
        ? editorWindow?.document?.querySelector("[data-combat-map-player-root]")
        : masterHost;
      nextSurface?.querySelector("[data-map-cloud-search]")?.focus();
    } else if (event.target.matches("[data-grid-size]")) {
      state.grid.size = clamp(event.target.value, MIN_GRID_SIZE, MAX_GRID_SIZE);
      updateGridScaleVisuals(event.target, surface);
    } else if (event.target.matches("[data-fog-size]")) {
      state.fog.brushSize = clamp(event.target.value, 12, 300);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.fog.brushSize * 2)} px`);
      persist();
    } else if (event.target.matches("[data-map-zoom]")) {
      setMapZoom(Number(event.target.value) / 100, surface);
    } else if (event.target.matches("[data-map-initiative-size]")) {
      state.initiative.size = clamp(event.target.value, 160, 650);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.initiative.size)} px`);
      surface?.querySelector("[data-map-workspace]")?.style.setProperty("--initiative-size", `${state.initiative.size}px`);
      fitInitiativeOrder(surface);
      persist();
    } else if (event.target.matches("[data-map-opacity]")) {
      const key = clean(event.target.dataset.mapOpacity);
      if (Object.prototype.hasOwnProperty.call(state.opacity, key)) {
        state.opacity[key] = normalizeOpacity(Number(event.target.value) / 100);
        event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.opacity[key] * 100)}%`);
        applyLayerOpacityStyles(surface);
        persist();
      }
    } else if (event.target.matches("[data-paint-size]")) {
      state.paint.size = clamp(event.target.value, MIN_PAINT_SIZE, MAX_PAINT_SIZE);
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(state.paint.size)} px`);
      persist();
    } else if (event.target.matches("[data-paint-color]")) {
      const value = normalizeColor(event.target.value);
      const icon = getSelectedPaintIcon();
      if (icon) icon.color = value;
      else state.paint.color = value;
      if (icon) updatePaintIconElement(icon, surface);
      persist();
    } else if (event.target.matches("[data-paint-icon-size]")) {
      const value = clamp(event.target.value, 16, 300);
      const icon = getSelectedPaintIcon();
      if (icon) icon.size = value;
      else state.paint.iconSize = value;
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(value)} px`);
      if (icon) updatePaintIconElement(icon, surface);
      persist();
    } else if (event.target.matches("[data-paint-icon-rotation]")) {
      const value = clamp(event.target.value, 0, 359);
      const icon = getSelectedPaintIcon();
      if (icon) icon.rotation = value;
      else state.paint.iconRotation = value;
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(value)}°`);
      if (icon) updatePaintIconElement(icon, surface);
      persist();
    } else if (event.target.matches("[data-shape-coordinate]")) {
      state.shapes.coordinate = clean(event.target.value).toUpperCase().replaceAll(" ", "").slice(0, 12);
      event.target.value = state.shapes.coordinate;
      shapeCoordinateError = "";
      persist();
    } else if (event.target.matches("[data-shape-text]")) {
      const value = String(event.target.value || "").slice(0, 500);
      const shape = getSelectedShape();
      if (shape?.type === "text") shape.text = value;
      else state.shapes.text = value;
      const label = shape ? surface?.querySelector(`[data-map-shape="${CSS.escape(shape.id)}"] > span`) : null;
      if (label) label.textContent = value || "Texto";
      persist();
    } else if (event.target.matches("[data-shape-font-size]")) {
      const value = clamp(event.target.value, 10, 120);
      const shape = getSelectedShape();
      if (shape?.type === "text") shape.fontSize = value;
      else state.shapes.fontSize = value;
      event.target.parentElement?.querySelector("output")?.replaceChildren(`${Math.round(value)} px`);
      if (shape) surface?.querySelector(`[data-map-shape="${CSS.escape(shape.id)}"]`)?.style.setProperty("--text-size", `${value}px`);
      persist();
    }
  }

  function handleKeydown(event) {
    if (event.target.closest("[data-map-initiative-order]")) { options.handleInitiativeKeydown?.(event); return; }
    if (event.target.closest("[data-combat-turn-quick-menu]")) { options.handleContextKeydown?.(event); return; }
    const panel = getSurfacePanel(getEventSurface(event));
    if ((event.key === "Delete" || event.key === "Backspace") && panel === "shapes" && !event.target.matches("input, select, textarea")) {
      event.preventDefault();
      deleteSelectedShape();
    } else if ((event.key === "Delete" || event.key === "Backspace") && panel === "paint" && state.paint.selectedIconId && !event.target.matches("input, select, textarea")) {
      event.preventDefault();
      state.paint.strokes = state.paint.strokes.filter((stroke) => stroke.id !== state.paint.selectedIconId);
      state.paint.selectedIconId = "";
      persist();
      sync();
    }
  }

  function handleContextMenu(event) {
    const surface = getEventSurface(event);
    if (event.target.closest("[data-map-initiative-order]")) {
      options.handleInitiativeContextMenu?.(event);
      return;
    }
    const token = event.target.closest("[data-map-token]");
    if (!token) return;
    event.preventDefault();
    options.openContextMenu?.(token.dataset.mapToken, event.clientX, event.clientY);
    sync();
    masterHost?.querySelector("[data-combat-turn-quick-value]")?.focus({ preventScroll: true });
  }

  function boardPoint(event) {
    const surface = getEventSurface(event) || activeDrag?.surface;
    const board = event.target.closest?.("[data-map-board]") || surface?.querySelector("[data-map-board]");
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

  function updateShapeElement(shape, root = activeDrag?.surface || masterHost) {
    const element = root?.querySelector(`[data-map-shape="${CSS.escape(shape.id)}"]`);
    if (!element) return;
    if (shape.type === "text") {
      const board = root?.querySelector("[data-map-board]");
      const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
      const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
      const gutter = (state.grid.visible ? GRID_LABEL_GUTTER : 0) + getTextShapeGutter(Number(board?.dataset.displayWidth) || width, Number(board?.dataset.displayHeight) || height);
      const point = rotateDisplayPoint(shape, width, height);
      element.style.left = `${gutter + point.x}px`;
      element.style.top = `${gutter + point.y}px`;
      element.style.transform = `translate(-50%,-50%) rotate(${shape.rotation + (state.rotationOrientation === "with-map" ? state.rotation : 0)}deg)`;
      return;
    }
    element.style.left = `${shape.x}px`;
    element.style.top = `${shape.y}px`;
    element.style.transform = `translate(${shape.type === "cone" ? "0%" : "-50%"},-50%) rotate(${shape.rotation}deg)`;
    element.style.setProperty("--shape-label-counter-rotation", `${state.rotationOrientation === "upright" ? -(state.rotation + shape.rotation) : 0}deg`);
  }

  function updatePaintIconElement(icon, root = activeDrag?.surface || masterHost) {
    const element = root?.querySelector(`[data-map-paint-icon="${CSS.escape(icon.id)}"]`);
    if (!element) return;
    const point = icon.points[0] || { x: 0, y: 0 };
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
    element.style.transform = `translate(-50%,-50%) rotate(${icon.rotation}deg)`;
    element.style.setProperty("--paint-icon-size", `${icon.size}px`);
    element.style.setProperty("--paint-icon-color", icon.color);
    const label = element.querySelector("span");
    if (label) label.textContent = icon.icon;
  }

  function showSelectedPaintIcon(id, root = masterHost) {
    state.paint.selectedIconId = id;
    root?.querySelectorAll("[data-map-paint-icon]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.mapPaintIcon === id);
    });
  }

  function showSelectedShape(id, root = masterHost) {
    state.shapes.selectedId = id;
    const shape = getSelectedShape();
    if (shape) {
      const typeInput = root?.querySelector("[data-shape-type]");
      const colorInput = root?.querySelector("[data-shape-color]");
      const distanceInput = root?.querySelector("[data-shape-distance]");
      const textInput = root?.querySelector("[data-shape-text]");
      const boxInput = root?.querySelector("[data-shape-text-box]");
      const boxColorInput = root?.querySelector("[data-shape-text-box-color]");
      const textColorInput = root?.querySelector("[data-shape-text-color]");
      const fontSizeInput = root?.querySelector("[data-shape-font-size]");
      if (typeInput) typeInput.value = shape.type;
      if (colorInput) colorInput.value = shape.color;
      if (distanceInput) distanceInput.value = String(shape.distanceFeet);
      if (textInput) textInput.value = shape.text || "";
      if (boxInput) boxInput.checked = shape.textBoxVisible !== false;
      if (boxColorInput) boxColorInput.value = shape.textBoxColor;
      if (textColorInput) textColorInput.value = shape.textColor;
      if (fontSizeInput) fontSizeInput.value = String(shape.fontSize);
    }
    root?.querySelectorAll("[data-map-shape]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.mapShape === id);
    });
  }

  function hideBrushCursor(root = masterHost) {
    root?.querySelector("[data-map-brush-cursor]")?.classList.remove("is-visible");
    if (fogPolygonCursor) {
      fogPolygonCursor = null;
      drawFog(root);
    }
  }

  function updateBrushCursor(event) {
    const surface = getEventSurface(event) || activeDrag?.surface;
    const panel = getSurfacePanel(surface);
    const isPaint = panel === "paint";
    const isFog = panel === "fog" && state.fog.enabled;
    const isPolygon = isFog && state.fog.mode === "polygon";
    const cursor = surface?.querySelector("[data-map-brush-cursor]");
    if (!cursor || (!isPaint && !isFog) || !event.target.closest?.("[data-map-board]")) {
      hideBrushCursor(surface);
      return;
    }
    const point = layerPoint(event);
    if (!point) return;
    const size = isPolygon ? 18 : isFog ? state.fog.brushSize * 2 : state.paint.size;
    cursor.style.left = `${point.x}px`;
    cursor.style.top = `${point.y}px`;
    cursor.style.width = `${size}px`;
    cursor.style.height = `${size}px`;
    cursor.classList.toggle("is-square", isFog && !isPolygon && state.fog.brushShape === "square");
    cursor.classList.toggle("is-polygon", isPolygon);
    cursor.classList.add("is-visible");
  }

  function handlePointerDown(event) {
    const surface = getEventSurface(event);
    if (!surface) return;
    const panel = getSurfacePanel(surface);
    if (event.target.closest("[data-combat-turn-quick-menu]")) return;
    options.closeContextMenu?.();
    surface.querySelector("[data-combat-turn-quick-menu]")?.remove();
    if (event.button !== 0) return;
    const initiativeResizer = event.target.closest("[data-map-initiative-resizer]");
    if (initiativeResizer) {
      activeDrag = { type: "initiative-resize", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, size: state.initiative.size, position: state.initiative.position, surface };
      initiativeResizer.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const shapeElement = event.target.closest("[data-map-shape]");
    const paintIconElement = event.target.closest("[data-map-paint-icon]");
    if (!event.target.closest("[data-map-board]") && !shapeElement && !paintIconElement) return;
    const token = event.target.closest("[data-map-token]");
    const point = boardPoint(event);
    if (!point) return;
    if (token) {
      bringTokenToFront(token.dataset.mapToken);
      token.style.zIndex = String(5 + getTokenStackIndex(token.dataset.mapToken));
      activeDrag = { type: "token", id: token.dataset.mapToken, pointerId: event.pointerId, surface };
      token.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (panel === "shapes" && shapeElement) {
      const shape = state.shapes.items.find((item) => item.id === shapeElement.dataset.mapShape);
      const shapePoint = layerPoint(event);
      if (!shape || !shapePoint) return;
      showSelectedShape(shape.id, surface);
      if (event.target.closest("[data-map-shape-rotate]")) {
        activeDrag = {
          type: "shape-rotate",
          id: shape.id,
          pointerId: event.pointerId,
          startAngle: Math.atan2(shapePoint.y - shape.y, shapePoint.x - shape.x) * 180 / Math.PI,
          rotation: shape.rotation,
          surface
        };
      } else {
        activeDrag = { type: "shape", id: shape.id, pointerId: event.pointerId, deltaX: shapePoint.x - shape.x, deltaY: shapePoint.y - shape.y, surface };
      }
      shapeElement.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (panel === "paint" && paintIconElement) {
      const icon = state.paint.strokes.find((stroke) => stroke.mode === "icon" && stroke.id === paintIconElement.dataset.mapPaintIcon);
      const iconPoint = layerPoint(event);
      const position = icon?.points?.[0];
      if (!icon || !iconPoint || !position) return;
      showSelectedPaintIcon(icon.id, surface);
      if (event.target.closest("[data-map-paint-icon-rotate]")) {
        activeDrag = {
          type: "paint-icon-rotate",
          id: icon.id,
          pointerId: event.pointerId,
          startAngle: Math.atan2(iconPoint.y - position.y, iconPoint.x - position.x) * 180 / Math.PI,
          rotation: icon.rotation,
          surface
        };
      } else {
        activeDrag = { type: "paint-icon", id: icon.id, pointerId: event.pointerId, deltaX: iconPoint.x - position.x, deltaY: iconPoint.y - position.y, surface };
      }
      paintIconElement.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (panel === "paint" && event.target.matches("[data-map-paint]")) {
      const paintPoint = layerPoint(event);
      if (!paintPoint) return;
      const stroke = state.paint.mode === "icon"
        ? { id: createPaintIconId(), color: state.paint.color, size: state.paint.iconSize, mode: "icon", icon: state.paint.icon, rotation: state.paint.iconRotation, points: [{ x: paintPoint.x, y: paintPoint.y }] }
        : { color: state.paint.color, size: state.paint.size, mode: state.paint.mode, points: [{ x: paintPoint.x, y: paintPoint.y }] };
      if (state.paint.mode === "line") stroke.points.push({ x: paintPoint.x, y: paintPoint.y });
      state.paint.strokes.push(stroke);
      if (state.paint.mode !== "icon") {
        activeDrag = { type: "paint", pointerId: event.pointerId, stroke, surface };
        event.target.setPointerCapture?.(event.pointerId);
      } else {
        state.paint.strokes = normalizePaintStrokes(state.paint.strokes);
        state.paint.selectedIconId = stroke.id;
        persist();
        sync();
      }
      if (state.paint.mode !== "icon") drawPaint(surface);
      event.preventDefault();
      return;
    }
    if (state.fog.enabled && panel === "fog" && event.target.matches("[data-map-fog]")) {
      const fogPoint = layerPoint(event);
      if (state.fog.mode === "polygon") {
        const first = state.fog.polygonDraft[0];
        if (first && state.fog.polygonDraft.length >= 3 && Math.hypot(fogPoint.x - first.x, fogPoint.y - first.y) <= 16) applyFogPolygon();
        else { state.fog.polygonDraft.push({ x: fogPoint.x, y: fogPoint.y }); fogPolygonCursor = null; persist(); drawFog(surface); }
      } else {
        activeDrag = { type: "fog", pointerId: event.pointerId, surface };
        revealFog(fogPoint, surface);
      }
      event.preventDefault();
      return;
    }
    const gridPanel = surface.querySelector('[data-map-panel="grid"]');
    if (state.grid.visible && gridPanel?.hidden === false) {
      const gridPoint = layerPoint(event);
      activeDrag = { type: "grid", pointerId: event.pointerId, startX: gridPoint.x, startY: gridPoint.y, offsetX: state.grid.offsetX, offsetY: state.grid.offsetY, surface };
      event.preventDefault();
    }
  }

  function handlePointerMove(event) {
    const surface = activeDrag?.surface || getEventSurface(event);
    updateBrushCursor(event);
    if (!activeDrag && state.fog.enabled && getSurfacePanel(surface) === "fog" && state.fog.mode === "polygon" && event.target.closest?.("[data-map-board]")) {
      fogPolygonCursor = layerPoint(event);
      drawFog(surface);
    }
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    if (activeDrag.type === "initiative-resize") {
      const horizontal = activeDrag.position === "left" || activeDrag.position === "right";
      const delta = horizontal ? event.clientX - activeDrag.startX : event.clientY - activeDrag.startY;
      const direction = activeDrag.position === "right" || activeDrag.position === "bottom" ? -1 : 1;
      state.initiative.size = clamp(activeDrag.size + delta * direction, 160, 650);
      surface?.querySelector("[data-map-workspace]")?.style.setProperty("--initiative-size", `${state.initiative.size}px`);
      if (surface === masterHost) updateMasterScale(surface);
      else updateMapScale();
      fitInitiativeOrder(surface);
      event.preventDefault();
      return;
    }
    const point = layerPoint(event);
    if (!point) return;
    if (activeDrag.type === "token") {
      state.tokenPositions[activeDrag.id] = { x: clamp(point.x, 0, point.width), y: clamp(point.y, 0, point.height) };
      const token = surface?.querySelector(`[data-map-token="${CSS.escape(activeDrag.id)}"]`);
      if (token) { token.style.left = `${state.tokenPositions[activeDrag.id].x}px`; token.style.top = `${state.tokenPositions[activeDrag.id].y}px`; }
    } else if (activeDrag.type === "paint-icon") {
      const icon = state.paint.strokes.find((stroke) => stroke.id === activeDrag.id);
      if (icon?.points?.[0]) {
        icon.points[0] = { x: clamp(point.x - activeDrag.deltaX, 0, point.width), y: clamp(point.y - activeDrag.deltaY, 0, point.height) };
        updatePaintIconElement(icon, surface);
      }
    } else if (activeDrag.type === "paint-icon-rotate") {
      const icon = state.paint.strokes.find((stroke) => stroke.id === activeDrag.id);
      const position = icon?.points?.[0];
      if (icon && position) {
        const angle = Math.atan2(point.y - position.y, point.x - position.x) * 180 / Math.PI;
        icon.rotation = (activeDrag.rotation + angle - activeDrag.startAngle + 360) % 360;
        updatePaintIconElement(icon, surface);
      }
    } else if (activeDrag.type === "fog") {
      revealFog(point, surface);
    } else if (activeDrag.type === "paint") {
      const points = activeDrag.stroke.points;
      if (activeDrag.stroke.mode === "line") {
        points[1] = { x: point.x, y: point.y };
        drawPaint(surface);
        event.preventDefault();
        return;
      }
      const previous = points[points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) >= Math.max(1, activeDrag.stroke.size * .08)) {
        points.push({ x: point.x, y: point.y });
        const canvas = surface?.querySelector("[data-map-paint]");
        const context = canvas?.getContext("2d");
        if (context) paintStroke(context, { ...activeDrag.stroke, points: [previous, points[points.length - 1]] });
      }
    } else if (activeDrag.type === "shape") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape) {
        const overflow = shape.type === "text" ? getTextShapeGutter(point.width, point.height) : 0;
        shape.x = clamp(point.x - activeDrag.deltaX, -overflow, point.width + overflow);
        shape.y = clamp(point.y - activeDrag.deltaY, -overflow, point.height + overflow);
        updateShapeElement(shape, surface);
      }
    } else if (activeDrag.type === "shape-rotate") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape) {
        const angle = Math.atan2(point.y - shape.y, point.x - shape.x) * 180 / Math.PI;
        shape.rotation = (activeDrag.rotation + angle - activeDrag.startAngle + 360) % 360;
        updateShapeElement(shape, surface);
      }
    } else if (activeDrag.type === "grid") {
      state.grid.offsetX = activeDrag.offsetX + point.x - activeDrag.startX;
      state.grid.offsetY = activeDrag.offsetY + point.y - activeDrag.startY;
      drawGridCoordinates(surface);
      drawGridLabels(surface);
    }
    event.preventDefault();
  }

  function revealFog(point, root = activeDrag?.surface || masterHost) {
    state.fog.revealed.push({ type: state.fog.brushShape, x: point.x, y: point.y, r: state.fog.brushSize });
    if (state.fog.revealed.length > 6000) state.fog.revealed.splice(0, 500);
    drawFog(root);
  }

  function handlePointerUp(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const surface = activeDrag.surface;
    if (activeDrag.type === "token") {
      const combatant = getCombatants().find((entry) => entry.id === activeDrag.id);
      state.tokenPositions[activeDrag.id] = snapCreaturePosition(
        state.tokenPositions[activeDrag.id],
        state.grid,
        getCreatureSizeMultiplier(combatant)
      );
      bringTokenToFront(activeDrag.id);
    } else if (activeDrag.type === "shape") {
      const shape = state.shapes.items.find((item) => item.id === activeDrag.id);
      if (shape && shape.type !== "text") {
        const snapped = snapTokenPosition(shape, state.grid);
        const board = surface?.querySelector("[data-map-board]");
        const width = Number(board?.dataset.mapWidth) || DEFAULT_WIDTH;
        const height = Number(board?.dataset.mapHeight) || DEFAULT_HEIGHT;
        shape.x = clamp(snapped.x, 0, width);
        shape.y = clamp(snapped.y, 0, height);
      }
    } else if (activeDrag.type === "paint" || activeDrag.type === "paint-icon" || activeDrag.type === "paint-icon-rotate") {
      state.paint.strokes = normalizePaintStrokes(state.paint.strokes);
    } else if (activeDrag.type === "grid") {
      resnapTokensWithoutOverlap();
    }
    activeDrag = null;
    persist(); sync();
    notifyTokenCoordinates();
  }

  function chooseMap(callback) {
    pickerCallback = typeof callback === "function" ? callback : null;
    open();
    window.setTimeout(() => {
      if (!isOpen()) return;
      playerOpenPanel = "map";
      sync();
    }, 0);
  }

  function updateMasterScale(host) {
    if (!host) return;
    const scaleLayer = host.querySelector("[data-map-scale-layer]");
    const frame = host.querySelector("[data-map-frame]");
    const viewport = host.querySelector(".combat-map-viewport");
    const totalWidth = Number.parseFloat(scaleLayer?.style.width) || DEFAULT_WIDTH;
    const totalHeight = Number.parseFloat(scaleLayer?.style.height) || DEFAULT_HEIGHT;
    const availableWidth = Math.max(1, host.clientWidth - 24);
    const availableHeight = Math.max(320, viewport?.clientHeight || 680);
    const fitScale = Math.max(.03, Math.min(1, availableWidth / totalWidth, (availableHeight - 24) / totalHeight));
    const scale = fitScale * state.viewport.zoom;
    if (!scaleLayer || !frame || !viewport) return;
    scaleLayer.style.transform = `scale(${scale})`;
    frame.style.width = `${totalWidth * scale}px`;
    frame.style.height = `${totalHeight * scale}px`;
    frame.dataset.mapScale = String(scale);
    viewport.scrollLeft = state.viewport.scrollLeft;
    viewport.scrollTop = state.viewport.scrollTop;
  }

  function syncMasterSurface(host) {
    if (!host || host.hidden) return;
    host.innerHTML = renderMaster(host.ownerDocument?.defaultView || window);
    updateMasterScale(host);
    fitInitiativeOrder(host);
    drawGridCoordinates(host);
    drawGridLabels(host);
    drawPaint(host);
    drawFog(host);
  }

  function syncMirror(root = document) {
    const host = root?.querySelector?.("[data-combat-map-mirror-host]");
    masterHost = host || null;
    if (!masterHost || masterHost.hidden) return;
    masterHost.dataset.combatMapMasterRoot = "";
    syncMasterSurface(masterHost);
  }

  return { open, sync, syncMirror, isOpen, getSaveData, getCloudMapEditorState, applySave, applyMapWorkspace, applyCloudMapResult, setMap, selectMap: finishMapSelection, getMap, hasGrid, getTokenCoordinate, setTokenCoordinate, resnapToken, chooseMap, convertAndSetFile: handleImageFile, handleClick, handleChange, handleInput, handleKeydown, handleContextMenu, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, handleViewportScroll, isMasterInteractionActive: () => Boolean(activeDrag?.surface === masterHost) };
}
