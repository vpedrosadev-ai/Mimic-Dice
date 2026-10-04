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

function getHexMetrics(size) {
  const height = size * 2 / Math.sqrt(3);
  return { height, halfHeight: height / 2, rowStep: height * .75 };
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
    openPanel: ["map", "grid", "tokens"].includes(source.openPanel) ? source.openPanel : "",
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
  if (!(file instanceof Blob) || !String(file.type).startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("No se pudo convertir la imagen a WebP.")),
      "image/webp",
      quality
    ));
    return { blob, dataUrl: canvas.toDataURL("image/webp", quality), width: canvas.width, height: canvas.height };
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
    if (options.portable === true) output.map = getPortableMapReference(output.map);
    return output;
  }

  function applySave(value) {
    state = normalizeMapEditorState(value);
    openPanel = state.openPanel;
    persist();
    sync();
    if (state.map?.cloudEntryId && !state.map.imageUrl) resolveCloudMap(state.map.cloudEntryId);
  }

  function setMap(map) {
    const next = normalizeMapReference(map);
    if (!next) return;
    state.map = next;
    state.rotation = 0;
    state.fog.revealed = [];
    persist();
    sync();
    if (!next.imageUrl && next.cloudEntryId) resolveCloudMap(next.cloudEntryId);
  }

  async function resolveCloudMap(entryId) {
    try {
      const result = await getCloudLibraryEntry(entryId);
      const resolved = normalizeMapReference({
        ...(result.payload?.map || {}),
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
    popup.document.addEventListener("scroll", handleViewportScroll, true);
    popup.addEventListener("beforeunload", () => { captureWindowBounds(); close(); });
    popup.addEventListener("resize", () => { captureWindowBounds(); drawGridCoordinates(); drawFog(); });
  }

  function renderToolbar() {
    return `<header class="combat-map-toolbar">
      <button type="button" data-map-action="open-map-menu">Cargar mapa</button>
      <button type="button" data-map-action="toggle-grid-menu" class="${state.grid.visible ? "is-active" : ""}">Rejilla</button>
      <button type="button" data-map-action="toggle-token-menu">Peanas</button>
      <button type="button" data-map-action="toggle-fog" class="${state.fog.enabled ? "is-active" : ""}">Niebla</button>
      ${state.fog.enabled ? `<label>Pincel <input type="range" min="12" max="300" value="${state.fog.brushSize}" data-fog-size></label><button type="button" data-map-action="reset-fog">Reiniciar niebla</button>` : ""}
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
    return `<section class="combat-map-popover" data-map-panel="map" ${openPanel === "map" ? "" : "hidden"}>
      <h2>Cargar mapa</h2>
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

  function renderStage() {
    const map = state.map;
    const width = map?.width || DEFAULT_WIDTH;
    const height = map?.height || DEFAULT_HEIGHT;
    return `<div class="combat-map-viewport"><div class="combat-map-board" data-map-board style="width:${width}px;height:${height}px;aspect-ratio:${width}/${height}">
      <div class="combat-map-rotating-layers" style="transform:rotate(${state.rotation}deg)">
        ${map?.imageUrl ? `<img class="combat-map-image" src="${escapeHtml(map.imageUrl)}" alt="${escapeHtml(map.name)}" draggable="false">` : `<div class="combat-map-empty"><strong>${map ? "Mapa privado" : "Sin mapa"}</strong><span>${map ? "Inicia sesión con la cuenta propietaria para cargarlo." : "Carga una imagen desde equipo o nube."}</span></div>`}
        <div class="combat-map-grid ${state.grid.visible ? "is-visible" : ""}" data-map-grid></div>
        <canvas class="combat-map-grid-coordinates ${state.grid.visible ? "is-visible" : ""}" data-map-grid-coordinates width="${width}" height="${height}"></canvas>
        <canvas class="combat-map-fog ${state.fog.enabled ? "is-visible" : ""}" data-map-fog width="${width}" height="${height}"></canvas>
      </div>
      <div class="combat-map-token-layer">${renderTokens()}</div>
    </div></div>`;
  }

  function render() {
    return `<div class="combat-map-editor combat-map-editor--initiative-${state.initiative.visible ? state.initiative.position : "none"}">${renderToolbar()}${renderMapMenu()}${renderGridMenu()}${renderTokenMenu()}${renderInitiative()}${renderStage()}${options.renderContextMenu?.(editorWindow) || ""}<input type="file" accept="image/*" data-map-file-hidden hidden></div>`;
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
      const visibleColumns = [...new Set(rows.flatMap((row) => row.cells.map((cell) => cell.column)))].sort((a, b) => a - b);
      const columnLabels = new Map(visibleColumns.map((column, index) => [column, toColumnLabel(index)]));
      const visibleRows = rows.filter((row) => row.y >= 0 && row.y <= height);
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

  async function handleImageFile(file) {
    try {
      const converted = await convertImageFileToWebp(file);
      const map = { name: clean(file.name).replace(/\.[^.]+$/, "") || "Mapa", imageUrl: converted.dataUrl, width: converted.width, height: converted.height, cloudEntryId: "", isPrivate: false };
      setMap(map);
      showUploadPrompt(map, converted.blob);
      return map;
    } catch (error) {
      options.onNotify?.("No se pudo cargar el mapa", error?.message || "Imagen no válida.", "danger");
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
        setMap({ name, imageUrl: uploaded.asset.url, width: map.width, height: map.height, cloudEntryId: created.entry.id, isPrivate: !isPublic });
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

  function handleClick(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) {
      options.handleContextClick?.(event);
      return;
    }
    const action = event.target.closest("[data-map-action]")?.dataset.mapAction;
    const cloudEntry = event.target.closest("[data-map-cloud-entry]")?.dataset.mapCloudEntry;
    const encounterChoice = event.target.closest("[data-map-encounter-choice]")?.dataset.mapEncounterChoice;
    if (cloudEntry) { selectCloudEntry(cloudEntry); return; }
    if (encounterChoice !== undefined) { selectEncounterChoice(encounterChoice); return; }
    if (!action) return;
    if (action === "open-map-menu") togglePanel("map");
    if (action === "toggle-grid-menu") togglePanel("grid");
    if (action === "toggle-token-menu") togglePanel("tokens");
    if (action === "load-cloud-list") loadCloudEntries();
    if (action === "toggle-fog") { state.fog.enabled = !state.fog.enabled; persist(); sync(); }
    if (action === "reset-fog") { state.fog.revealed = []; persist(); sync(); }
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
    }
  }

  function handleKeydown(event) {
    if (event.target.closest("[data-combat-turn-quick-menu]")) options.handleContextKeydown?.(event);
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
    if (state.fog.enabled && event.target.matches("[data-map-fog]")) {
      activeDrag = { type: "fog", pointerId: event.pointerId };
      revealFog(point);
      event.preventDefault();
      return;
    }
    const gridPanel = editorWindow.document.querySelector('[data-map-panel="grid"]');
    if (state.grid.visible && gridPanel?.hidden === false) {
      activeDrag = { type: "grid", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: state.grid.offsetX, offsetY: state.grid.offsetY };
      event.preventDefault();
    }
  }

  function handlePointerMove(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const point = boardPoint(event);
    if (!point) return;
    if (activeDrag.type === "token") {
      state.tokenPositions[activeDrag.id] = { x: clamp(point.x, 0, point.board.offsetWidth), y: clamp(point.y, 0, point.board.offsetHeight) };
      const token = editorWindow.document.querySelector(`[data-map-token="${CSS.escape(activeDrag.id)}"]`);
      if (token) { token.style.left = `${state.tokenPositions[activeDrag.id].x}px`; token.style.top = `${state.tokenPositions[activeDrag.id].y}px`; }
    } else if (activeDrag.type === "fog") {
      revealFog(point);
    } else if (activeDrag.type === "grid") {
      const rect = point.board.getBoundingClientRect();
      state.grid.offsetX = activeDrag.offsetX + (event.clientX - activeDrag.startX) * point.board.offsetWidth / rect.width;
      state.grid.offsetY = activeDrag.offsetY + (event.clientY - activeDrag.startY) * point.board.offsetHeight / rect.height;
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
