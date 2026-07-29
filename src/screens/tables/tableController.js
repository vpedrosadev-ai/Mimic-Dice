import { isPlainObject, toNumber } from "../../shared/numberUtils.js";
import { cleanText, slugify } from "../../shared/text.js";
import { getTableColumnKind } from "./tableUtils.js";

export function createTablesController({
  state,
  app,
  initialTableFolders,
  initialTableDefinitions,
  TABLES_STORAGE_KEY,
  usesDesktopFileOnlyPersistence,
  scheduleDesktopCampaignDirtyStateSync,
  getSystemTableKind,
  isProtectedTableId,
  render,
  createStableId
}) {
  let activeTableRollTimer = 0;
  let tableRollAudioContext = null;
  let xlsxModulePromise = null;

async function loadXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }

  return xlsxModulePromise;
}

function loadTablesState() {
  const defaultState = getDefaultTablesState();

  if (typeof window === "undefined") {
    return defaultState;
  }

  if (usesDesktopFileOnlyPersistence()) {
    return defaultState;
  }

  try {
    const rawValue = window.localStorage.getItem(TABLES_STORAGE_KEY);
    return rawValue ? normalizeStoredTablesState(JSON.parse(rawValue || "{}")) : defaultState;
  } catch {
    return defaultState;
  }
}

function saveTablesState() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(getTablesSaveData()));
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getDefaultTablesState() {
  return normalizeStoredTablesState({
    folders: initialTableFolders,
    systemFolderExpanded: true,
    tables: initialTableDefinitions,
    activeTableFolderId: "",
    activeTableId: "",
    openTableIds: []
  });
}

function getTablesSaveData() {
  reconcileTablesUiState();

  return {
    folders: state.tableFolders,
    systemFolderExpanded: state.systemTableFolderExpanded,
    tables: state.tables.map((table, index) => normalizeStoredTable(table, index)).filter(Boolean),
    activeTableFolderId: state.activeTableFolderId,
    activeTableId: state.activeTableId,
    openTableIds: state.openTableIds.filter((tableId) => state.tables.some((table) => table.id === tableId))
  };
}

function normalizeStoredTablesState(value) {
  const source = isPlainObject(value) ? value : {};
  const hasExplicitTables = Array.isArray(value) || Array.isArray(source.tables);
  const rawFolders = Array.isArray(source.folders)
    ? source.folders
    : hasExplicitTables
      ? []
      : initialTableFolders;
  const folders = rawFolders
    .map((folder) => normalizeStoredTableFolder(folder))
    .filter(Boolean);
  const rawTables = Array.isArray(value)
    ? value
    : Array.isArray(source.tables)
      ? source.tables
      : initialTableDefinitions;
  let tables = rawTables
    .map((table, index) => normalizeStoredTable(table, index))
    .filter(Boolean);
  tables = deduplicateStoredSystemTables(tables);

  if (!hasExplicitTables && tables.length === 0) {
    tables = initialTableDefinitions
      .map((table, index) => normalizeStoredTable(table, index))
      .filter(Boolean);
  }

  const existingFolderIds = new Set(folders.map((folder) => folder.id));
  initialTableFolders.forEach((folder) => {
    if (existingFolderIds.has(folder.id)) {
      return;
    }

    const normalizedFolder = normalizeStoredTableFolder(folder);

    if (normalizedFolder) {
      folders.push(normalizedFolder);
      existingFolderIds.add(normalizedFolder.id);
    }
  });

  const existingTableIds = new Set(tables.map((table) => table.id));
  const existingSystemKinds = new Set(tables.map((table) => getSystemTableKind(table)).filter(Boolean));
  initialTableDefinitions.forEach((table, index) => {
    const systemKind = getSystemTableKind(table);

    if (existingTableIds.has(table.id) || (systemKind && existingSystemKinds.has(systemKind))) {
      return;
    }

    const normalizedTable = normalizeStoredTable(table, tables.length + index);

    if (normalizedTable) {
      tables.push(normalizedTable);
      existingTableIds.add(normalizedTable.id);
      const normalizedKind = getSystemTableKind(normalizedTable);

      if (normalizedKind) {
        existingSystemKinds.add(normalizedKind);
      }
    }
  });

  const tableIds = new Set(tables.map((table) => table.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const firstTableId = tables[0]?.id ?? "";
  const activeTableId = tableIds.has(cleanText(source.activeTableId)) ? cleanText(source.activeTableId) : firstTableId;
  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;
  const activeTableFolderId = folderIds.has(cleanText(source.activeTableFolderId))
    ? cleanText(source.activeTableFolderId)
    : activeTable?.folderId ?? "";
  const openTableIds = [...new Set(
    (Array.isArray(source.openTableIds) ? source.openTableIds : [activeTableId])
      .map((tableId) => cleanText(tableId))
      .filter((tableId) => tableIds.has(tableId))
  )];

  if (openTableIds.length === 0 && activeTableId) {
    openTableIds.push(activeTableId);
  }

  return {
    folders,
    systemFolderExpanded: source.systemFolderExpanded !== false,
    tables,
    activeTableFolderId,
    activeTableId,
    openTableIds
  };
}

function deduplicateStoredSystemTables(tables) {
  const seenKinds = new Set();

  return tables.filter((table) => {
    const kind = getSystemTableKind(table);

    if (kind !== "status" && kind !== "wild-magic") {
      return true;
    }

    if (seenKinds.has(kind)) {
      return false;
    }

    seenKinds.add(kind);
    return true;
  });
}

function normalizeStoredTableFolder(folder) {
  if (!isPlainObject(folder)) {
    return null;
  }

  return {
    id: cleanText(folder.id) || createStableId("table-folder"),
    name: cleanText(folder.name) || "Carpeta",
    isExpanded: folder.isExpanded !== false
  };
}

function normalizeStoredTable(value, index = 0) {
  if (!isPlainObject(value)) {
    if (Array.isArray(value)) {
      return normalizeStoredTable({
        name: `Tabla ${index + 1}`,
        columns: value[0] ?? [],
        rows: value.slice(1)
      }, index);
    }

    return null;
  }

  const columns = normalizeStoredTableColumns(value.columns);

  return {
    id: cleanText(value.id) || createStableId("table"),
    name: cleanText(value.name) || `Tabla ${index + 1}`,
    folderId: cleanText(value.folderId),
    columns,
    rows: normalizeStoredTableRows(value.rows, columns),
    collapsed: value.collapsed === true
  };
}

function normalizeStoredTableColumns(value) {
  const normalizedColumns = (Array.isArray(value) ? value : [])
    .map((column, index) => normalizeStoredTableColumn(column, index))
    .filter(Boolean);

  return normalizedColumns.length > 0
    ? normalizedColumns
    : [normalizeStoredTableColumn({ label: "Columna 1" }, 0)].filter(Boolean);
}

function normalizeStoredTableColumn(value, index = 0) {
  if (typeof value === "string") {
    return {
      id: createStableId("table-col"),
      label: cleanText(value) || `Columna ${index + 1}`,
      width: ""
    };
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: cleanText(value.id) || createStableId("table-col"),
    label: cleanText(value.label) || `Columna ${index + 1}`,
    width: normalizeStoredTableColumnWidth(value.width)
  };
}

function normalizeStoredTableColumnWidth(value) {
  const numericValue = Math.floor(toNumber(value));
  return Number.isFinite(numericValue) && numericValue >= 72 ? numericValue : "";
}

function normalizeStoredTableRows(value, columns) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((row, index) => normalizeStoredTableRow(row, columns, index))
    .filter(Boolean);
}

function normalizeStoredTableRow(value, columns, index = 0) {
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return null;
  }

  const sourceCells = Array.isArray(value)
    ? value
    : Array.isArray(value.cells)
      ? value.cells
      : isPlainObject(value.cells)
        ? value.cells
        : {};
  const cells = Object.fromEntries(columns.map((column, columnIndex) => {
    const rawValue = Array.isArray(sourceCells)
      ? sourceCells[columnIndex]
      : sourceCells[column.id] ?? sourceCells[column.label];
    return [column.id, cleanText(rawValue)];
  }));

  return {
    id: cleanText(value.id) || createStableId("table-row"),
    cells
  };
}

function getActiveTable() {
  return state.tables.find((table) => table.id === state.activeTableId) ?? null;
}

function getOpenTables() {
  const tableMap = new Map(state.tables.map((table) => [table.id, table]));
  return state.openTableIds.map((tableId) => tableMap.get(tableId)).filter(Boolean);
}

function getTableFolderGroups() {
  return [
    {
      id: "",
      name: "Sin carpeta",
      isExpanded: state.systemTableFolderExpanded
    },
    ...state.tableFolders
  ];
}

function getTablesByFolder(folderId = "") {
  const normalizedFolderId = cleanText(folderId);
  return state.tables.filter((table) => cleanText(table.folderId) === normalizedFolderId);
}

function getTableFolderNameById(folderId = "") {
  const normalizedFolderId = cleanText(folderId);

  if (!normalizedFolderId) {
    return "";
  }

  return cleanText(state.tableFolders.find((folder) => folder.id === normalizedFolderId)?.name);
}

function reconcileTablesUiState() {
  const tableIds = new Set(state.tables.map((table) => table.id));
  const folderIds = new Set(state.tableFolders.map((folder) => folder.id));

  if (state.tables.length === 0) {
    state.activeTableId = "";
    state.activeTableFolderId = "";
    state.openTableIds = [];
    state.rolledTableId = "";
    state.rolledTableRowId = "";
    return;
  }

  if (!tableIds.has(state.activeTableId)) {
    state.activeTableId = state.tables[0].id;
  }

  if (!folderIds.has(state.activeTableFolderId) && state.activeTableFolderId !== "") {
    state.activeTableFolderId = state.tables.find((table) => table.id === state.activeTableId)?.folderId ?? "";
  }

  if (!tableIds.has(state.rolledTableId)) {
    state.rolledTableId = "";
    state.rolledTableRowId = "";
  }

  state.openTableIds = [...new Set(state.openTableIds.map((tableId) => cleanText(tableId)).filter((tableId) => tableIds.has(tableId)))];
}

function createBlankTable(name = "", folderId = "") {
  const columns = [
    normalizeStoredTableColumn({ label: "Columna 1" }, 0),
    normalizeStoredTableColumn({ label: "Columna 2" }, 1)
  ].filter(Boolean);
  const rows = [
    normalizeStoredTableRow({ cells: ["", ""] }, columns, 0),
    normalizeStoredTableRow({ cells: ["", ""] }, columns, 1)
  ].filter(Boolean);

  return normalizeStoredTable({
    name: cleanText(name) || `Tabla ${state.tables.length + 1}`,
    folderId: cleanText(folderId),
    columns,
    rows,
    collapsed: false
  }, state.tables.length);
}

function createTable(options = {}) {
  const folderId = cleanText(options.folderId) || state.activeTableFolderId || "";
  const table = createBlankTable("", folderId);
  state.tables = [...state.tables, table];
  state.activeTableId = table.id;
  state.activeTableFolderId = table.folderId ?? "";
  state.openTableIds = [...state.openTableIds, table.id];
  reconcileTablesUiState();
  return table.id;
}

function selectTable(tableId) {
  const normalizedTableId = cleanText(tableId);
  const table = state.tables.find((entry) => entry.id === normalizedTableId);

  if (!table) {
    return;
  }

  state.activeTableId = normalizedTableId;
  state.activeTableFolderId = table.folderId ?? "";
  state.openTableIds = [normalizedTableId, ...state.openTableIds.filter((id) => id !== normalizedTableId)];
  state.tables = moveTableToFrontWithinFolder(state.tables, normalizedTableId);
  expandTableFolder(table.folderId ?? "");
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? { ...table, collapsed: false }
    : table);
  reconcileTablesUiState();
}

function toggleTableOpen(tableId) {
  const normalizedTableId = cleanText(tableId);

  if (!state.tables.some((table) => table.id === normalizedTableId)) {
    return;
  }

  state.activeTableId = normalizedTableId;
  state.openTableIds = state.openTableIds.includes(normalizedTableId)
    ? state.openTableIds.filter((id) => id !== normalizedTableId)
    : [...state.openTableIds, normalizedTableId];
  reconcileTablesUiState();
}

function toggleTableCollapsed(tableId) {
  const normalizedTableId = cleanText(tableId);
  state.activeTableId = normalizedTableId;
  state.activeTableFolderId = state.tables.find((table) => table.id === normalizedTableId)?.folderId ?? "";
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? { ...table, collapsed: !table.collapsed }
    : table);
  reconcileTablesUiState();
}

function openAllTables() {
  state.openTableIds = state.tables.map((table) => table.id);
  reconcileTablesUiState();
}

function closeAllTables() {
  state.openTableIds = [];
}

function stopActiveTableRoll() {
  if (activeTableRollTimer) {
    window.clearTimeout(activeTableRollTimer);
    activeTableRollTimer = 0;
  }

  state.rollingTableId = "";
  state.rollingTableRowId = "";
}

function getTableRollAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!tableRollAudioContext) {
    tableRollAudioContext = new AudioContextConstructor();
  }

  if (tableRollAudioContext.state === "suspended") {
    tableRollAudioContext.resume().catch(() => {});
  }

  return tableRollAudioContext;
}

function playTableRollTone({
  frequency,
  durationMs,
  type = "triangle",
  volume = 0.028,
  attackMs = 6,
  frequencyEnd = frequency
}) {
  const audioContext = getTableRollAudioContext();

  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const startTime = audioContext.currentTime + 0.005;
  const endTime = startTime + (durationMs / 1000);
  const attackTime = Math.min(endTime, startTime + (attackMs / 1000));

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(60, frequency), startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequencyEnd), endTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), attackTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);

  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    gainNode.disconnect();
  }, { once: true });
}

function playTableRollSoundStep(stepIndex, totalSteps, isFinalStep) {
  const progress = totalSteps <= 1 ? 1 : stepIndex / Math.max(1, totalSteps - 1);

  if (isFinalStep) {
    playTableRollTone({
      frequency: 740,
      frequencyEnd: 620,
      durationMs: 220,
      type: "triangle",
      volume: 0.045,
      attackMs: 8
    });
    playTableRollTone({
      frequency: 1110,
      frequencyEnd: 880,
      durationMs: 180,
      type: "sine",
      volume: 0.018,
      attackMs: 10
    });
    return;
  }

  playTableRollTone({
    frequency: 980 + ((1 - progress) * 240),
    frequencyEnd: 640 + ((1 - progress) * 90),
    durationMs: 56,
    type: progress > 0.72 ? "triangle" : "square",
    volume: 0.02 + ((1 - progress) * 0.008),
    attackMs: 4
  });
}

function startTableRoll(tableId) {
  const normalizedTableId = cleanText(tableId);
  const table = state.tables.find((entry) => entry.id === normalizedTableId);
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  if (!table || rows.length === 0) {
    return;
  }

  stopActiveTableRoll();
  selectTable(normalizedTableId);

  const startingIndex = state.rolledTableId === normalizedTableId
    ? Math.max(0, rows.findIndex((row) => row.id === state.rolledTableRowId))
    : 0;
  const targetIndex = Math.floor(Math.random() * rows.length);
  const totalSteps = Math.min(12, Math.max(8, rows.length + 4));
  const targetOffset = (targetIndex - startingIndex + rows.length) % rows.length;
  const baseOffset = (totalSteps - 1) % rows.length;
  const extraLoops = Math.max(0, Math.ceil((baseOffset - targetOffset) / rows.length));
  const finalStepOffset = targetOffset + (extraLoops * rows.length);
  const effectiveTotalSteps = finalStepOffset + 1;
  const rawDelays = Array.from({ length: Math.max(0, effectiveTotalSteps - 1) }, (_, step) => {
    const progress = step / Math.max(1, effectiveTotalSteps - 2);
    return 42 + ((progress ** 2) * 120);
  });
  const maxDurationMs = 2000;
  const rawTotalDuration = rawDelays.reduce((sum, delay) => sum + delay, 0);
  const durationScale = rawTotalDuration > maxDurationMs ? maxDurationMs / rawTotalDuration : 1;
  const delays = rawDelays.map((delay) => Math.max(28, Math.round(delay * durationScale)));
  let currentStep = 0;
  state.rolledTableId = "";
  state.rolledTableRowId = "";

  const advanceRoll = () => {
    const currentIndex = (startingIndex + currentStep) % rows.length;
    const currentRow = rows[currentIndex];
    const isFinalStep = currentStep >= effectiveTotalSteps - 1;

    state.rollingTableId = normalizedTableId;
    state.rollingTableRowId = currentRow.id;
    playTableRollSoundStep(currentStep, effectiveTotalSteps, isFinalStep);
    render();

    if (isFinalStep) {
      state.rollingTableId = "";
      state.rollingTableRowId = "";
      state.rolledTableId = normalizedTableId;
      state.rolledTableRowId = currentRow.id;
      activeTableRollTimer = 0;
      render();
      return;
    }

    currentStep += 1;
    const nextDelay = delays[Math.max(0, currentStep - 1)] ?? 40;
    activeTableRollTimer = window.setTimeout(advanceRoll, nextDelay);
  };

  advanceRoll();
}

function createTableFolder() {
  const folder = normalizeStoredTableFolder({
    id: createStableId("table-folder"),
    name: `Carpeta ${state.tableFolders.length + 1}`,
    isExpanded: true
  });

  state.tableFolders = [...state.tableFolders, folder];
  state.activeTableFolderId = folder.id;
  return folder.id;
}

function toggleTableFolder(folderId) {
  state.activeTableFolderId = cleanText(folderId);

  if (!folderId) {
    state.systemTableFolderExpanded = !state.systemTableFolderExpanded;
    return;
  }

  state.tableFolders = state.tableFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      isExpanded: !folder.isExpanded
    }
    : folder);
}

function expandTableFolder(folderId) {
  const normalizedFolderId = cleanText(folderId);

  if (!normalizedFolderId) {
    state.systemTableFolderExpanded = true;
    return;
  }

  state.tableFolders = state.tableFolders.map((folder) => folder.id === normalizedFolderId
    ? {
      ...folder,
      isExpanded: true
    }
    : folder);
}

function updateTableFolderName(folderId, name) {
  state.tableFolders = state.tableFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      name
    }
    : folder);
}

function deleteTableFolder(folderId) {
  state.tableFolders = state.tableFolders.filter((folder) => folder.id !== folderId);
  state.tables = state.tables.map((table) => table.folderId === folderId
    ? {
      ...table,
      folderId: ""
    }
    : table);

  if (state.activeTableFolderId === folderId) {
    state.activeTableFolderId = "";
  }
}

function deleteTable(tableId) {
  const normalizedTableId = cleanText(tableId);

  if (isProtectedTableId(normalizedTableId)) {
    return;
  }

  const currentIndex = state.tables.findIndex((table) => table.id === normalizedTableId);

  if (currentIndex < 0) {
    return;
  }

  state.tables = state.tables.filter((table) => table.id !== normalizedTableId);
  state.openTableIds = state.openTableIds.filter((id) => id !== normalizedTableId);
  state.activeTableId = state.tables[currentIndex]?.id ?? state.tables[currentIndex - 1]?.id ?? state.tables[0]?.id ?? "";
  state.activeTableFolderId = state.tables.find((table) => table.id === state.activeTableId)?.folderId ?? "";
  reconcileTablesUiState();
}

function moveTableToFrontWithinFolder(tables, tableId) {
  const targetTable = tables.find((table) => table.id === tableId);

  if (!targetTable) {
    return tables;
  }

  const sameFolderTables = tables.filter((table) => table.folderId === targetTable.folderId);
  const otherTables = tables.filter((table) => table.folderId !== targetTable.folderId);
  const reorderedSameFolderTables = [
    targetTable,
    ...sameFolderTables.filter((table) => table.id !== tableId)
  ];
  const result = [];
  const folderBuckets = new Map();

  otherTables.forEach((table) => {
    const bucket = folderBuckets.get(table.folderId ?? "__root__") ?? [];
    bucket.push(table);
    folderBuckets.set(table.folderId ?? "__root__", bucket);
  });

  let inserted = false;
  tables.forEach((table) => {
    if (table.folderId === targetTable.folderId) {
      if (!inserted) {
        result.push(...reorderedSameFolderTables);
        inserted = true;
      }
      return;
    }

    const key = table.folderId ?? "__root__";
    const bucket = folderBuckets.get(key);

    if (!bucket || bucket.length === 0) {
      return;
    }

    result.push(bucket.shift());
  });

  return result.filter(Boolean);
}

function updateTableName(tableId, rawValue) {
  const normalizedTableId = cleanText(tableId);
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? {
      ...table,
      name: rawValue
    }
    : table);
}

function updateTableColumnLabel(tableId, columnId, rawValue) {
  const normalizedTableId = cleanText(tableId);
  const normalizedColumnId = cleanText(columnId);
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? {
      ...table,
      columns: table.columns.map((column) => column.id === normalizedColumnId
        ? { ...column, label: rawValue }
        : column)
    }
    : table);
}

function setTableColumnWidth(tableId, columnId, width) {
  const normalizedTableId = cleanText(tableId);
  const normalizedColumnId = cleanText(columnId);
  const safeWidth = Math.max(72, Math.floor(toNumber(width)) || 72);

  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? {
      ...table,
      columns: table.columns.map((column) => column.id === normalizedColumnId
        ? { ...column, width: safeWidth }
        : column)
    }
    : table);
}

function applyTableColumnWidthPreview(tableId, columnId, width) {
  const safeWidth = Math.max(72, Math.floor(toNumber(width)) || 72);
  app.querySelectorAll(`[data-table-id="${tableId}"][data-table-col-id="${columnId}"]`).forEach((col) => {
    col.style.width = `${safeWidth}px`;
  });
}

function updateTableCell(tableId, rowId, columnId, rawValue) {
  const normalizedTableId = cleanText(tableId);
  const normalizedRowId = cleanText(rowId);
  const normalizedColumnId = cleanText(columnId);
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? {
      ...table,
      rows: table.rows.map((row) => row.id === normalizedRowId
        ? {
          ...row,
          cells: {
            ...row.cells,
            [normalizedColumnId]: rawValue
          }
        }
        : row)
    }
    : table);
}

function updateTableDimension(tableId, kind, rawValue) {
  const value = Math.max(kind === "columns" ? 1 : 0, Math.floor(toNumber(rawValue)) || 0);

  if (kind === "columns") {
    setTableColumnCount(tableId, value);
    return;
  }

  if (kind === "rows") {
    setTableRowCount(tableId, value);
  }
}

function addTableColumn(tableId) {
  const table = state.tables.find((entry) => entry.id === cleanText(tableId));
  setTableColumnCount(tableId, (table?.columns.length ?? 0) + 1);
}

function insertTableColumnAfter(tableId, afterColumnId = "") {
  const normalizedTableId = cleanText(tableId);
  const normalizedAfterColumnId = cleanText(afterColumnId);

  state.tables = state.tables.map((table) => {
    if (table.id !== normalizedTableId) {
      return table;
    }

    const currentColumns = [...table.columns];
    const insertAt = normalizedAfterColumnId
      ? Math.max(0, currentColumns.findIndex((column) => column.id === normalizedAfterColumnId) + 1)
      : currentColumns.length;
    const nextColumn = normalizeStoredTableColumn({
      label: `Columna ${insertAt + 1}`
    }, insertAt);
    const nextColumns = [...currentColumns];
    nextColumns.splice(insertAt, 0, nextColumn);

    return {
      ...table,
      columns: nextColumns,
      rows: table.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(nextColumns.map((column) => [
          column.id,
          column.id === nextColumn.id ? "" : row.cells[column.id] ?? ""
        ]))
      }))
    };
  });
}

function removeTableColumn(tableId, columnId = "") {
  const normalizedTableId = cleanText(tableId);
  const normalizedColumnId = cleanText(columnId);

  state.tables = state.tables.map((table) => {
    if (table.id !== normalizedTableId || table.columns.length <= 1) {
      return table;
    }

    const nextColumns = normalizedColumnId
      ? table.columns.filter((column) => column.id !== normalizedColumnId)
      : table.columns.slice(0, -1);

    if (nextColumns.length === 0) {
      return table;
    }

    return {
      ...table,
      columns: nextColumns,
      rows: table.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(nextColumns.map((column) => [column.id, row.cells[column.id] ?? ""]))
      }))
    };
  });
}

function setTableColumnCount(tableId, nextCount) {
  const normalizedTableId = cleanText(tableId);
  const safeCount = Math.max(1, Math.floor(toNumber(nextCount)) || 1);

  state.tables = state.tables.map((table) => {
    if (table.id !== normalizedTableId) {
      return table;
    }

    let nextColumns = [...table.columns];

    if (safeCount > nextColumns.length) {
      while (nextColumns.length < safeCount) {
        nextColumns.push(normalizeStoredTableColumn({ label: `Columna ${nextColumns.length + 1}` }, nextColumns.length));
      }
    } else if (safeCount < nextColumns.length) {
      nextColumns = nextColumns.slice(0, safeCount);
    }

    return {
      ...table,
      columns: nextColumns,
      rows: table.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(nextColumns.map((column) => [column.id, row.cells[column.id] ?? ""]))
      }))
    };
  });
}

function addTableRow(tableId) {
  const table = state.tables.find((entry) => entry.id === cleanText(tableId));
  setTableRowCount(tableId, (table?.rows.length ?? 0) + 1);
}

function insertTableRowAfter(tableId, afterRowId = "") {
  const normalizedTableId = cleanText(tableId);
  const normalizedAfterRowId = cleanText(afterRowId);

  state.tables = state.tables.map((table) => {
    if (table.id !== normalizedTableId) {
      return table;
    }

    const nextRows = [...table.rows];
    const insertAt = normalizedAfterRowId
      ? Math.max(0, nextRows.findIndex((row) => row.id === normalizedAfterRowId) + 1)
      : nextRows.length;
    const nextRow = normalizeStoredTableRow({
      cells: table.columns.map(() => "")
    }, table.columns, insertAt);

    nextRows.splice(insertAt, 0, nextRow);

    return {
      ...table,
      rows: nextRows
    };
  });
}

function removeTableRow(tableId, rowId) {
  const normalizedTableId = cleanText(tableId);
  const normalizedRowId = cleanText(rowId);
  state.tables = state.tables.map((table) => table.id === normalizedTableId
    ? {
      ...table,
      rows: table.rows.filter((row) => row.id !== normalizedRowId)
    }
    : table);
}

function setTableRowCount(tableId, nextCount) {
  const normalizedTableId = cleanText(tableId);
  const safeCount = Math.max(0, Math.floor(toNumber(nextCount)) || 0);

  state.tables = state.tables.map((table) => {
    if (table.id !== normalizedTableId) {
      return table;
    }

    let nextRows = [...table.rows];

    if (safeCount > nextRows.length) {
      while (nextRows.length < safeCount) {
        nextRows.push(normalizeStoredTableRow({
          cells: table.columns.map(() => "")
        }, table.columns, nextRows.length));
      }
    } else if (safeCount < nextRows.length) {
      nextRows = nextRows.slice(0, safeCount);
    }

    return {
      ...table,
      rows: nextRows
    };
  });
}

async function importTablesFromWorkbook(file) {
  if (!file) {
    return;
  }

  try {
    const XLSX = await loadXlsxModule();
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array"
    });
    const detectedTables = workbook.SheetNames.flatMap((sheetName, sheetIndex) =>
      extractTablesFromWorkbookSheet(workbook.Sheets[sheetName], sheetName, sheetIndex, XLSX)
    );

    if (detectedTables.length === 0) {
      state.campaignMessage = "El Excel no trae hojas utiles para importar.";
      render();
      return;
    }

    const importFolderId = detectedTables.length > 1
      ? createImportedTableFolder(getExcelImportBaseName(file.name))
      : "";
    const importedTables = detectedTables.map((table, index) => normalizeStoredTable({
      ...table,
      folderId: importFolderId
    }, state.tables.length + index)).filter(Boolean);

    state.tables = [...state.tables, ...importedTables];
    state.activeScreen = "tables";
    state.activeTableFolderId = importFolderId || importedTables[0]?.folderId || "";
    state.activeTableId = importedTables[0].id;
    state.openTableIds = [...new Set([...state.openTableIds, ...importedTables.map((table) => table.id)])];
    expandTableFolder(importFolderId);
    reconcileTablesUiState();
    saveTablesState();
    state.campaignMessage = importedTables.length === 1
      ? `Excel importado: ${importedTables[0].name}.`
      : `Excel importado: ${importedTables.length} tablas agrupadas en carpeta.`;
    render();
  } catch {
    state.campaignMessage = "No se pudo importar el fichero Excel.";
    render();
  }
}

function extractTablesFromWorkbookSheet(sheet, sheetName, index = 0, spreadsheet = null) {
  if (!sheet || !spreadsheet?.utils) {
    return [];
  }

  const rawGrid = spreadsheet.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true
  }).map((row) => Array.isArray(row) ? row.map((cell) => cleanText(cell)) : []);
  const grid = normalizeWorkbookGrid(rawGrid);

  if (grid.length === 0) {
    return [];
  }

  const regions = detectWorkbookTableRegions(grid);

  return regions
    .map((region, regionIndex) => buildTableFromWorkbookRegion(region, grid, sheetName, index, regionIndex))
    .filter(Boolean);
}

function normalizeWorkbookGrid(rawGrid) {
  const maxColumns = Math.max(0, ...rawGrid.map((row) => row.length));

  if (maxColumns === 0) {
    return [];
  }

  const paddedGrid = rawGrid.map((row) => Array.from({ length: maxColumns }, (_, columnIndex) => cleanText(row[columnIndex])));
  const firstNonEmptyRowIndex = paddedGrid.findIndex((row) => row.some(Boolean));
  const lastNonEmptyRowIndex = [...paddedGrid].reverse().findIndex((row) => row.some(Boolean));

  if (firstNonEmptyRowIndex < 0) {
    return [];
  }

  const endIndex = paddedGrid.length - lastNonEmptyRowIndex;
  return paddedGrid.slice(firstNonEmptyRowIndex, endIndex);
}

function detectWorkbookTableRegions(grid) {
  const rowCount = grid.length;
  const columnCount = Math.max(0, ...grid.map((row) => row.length));
  const visited = new Set();
  const regions = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      if (!cleanText(grid[rowIndex]?.[columnIndex])) {
        continue;
      }

      const key = `${rowIndex}:${columnIndex}`;

      if (visited.has(key)) {
        continue;
      }

      const queue = [[rowIndex, columnIndex]];
      let queueIndex = 0;
      const cells = [];
      visited.add(key);

      while (queueIndex < queue.length) {
        const [currentRow, currentColumn] = queue[queueIndex];
        queueIndex += 1;
        cells.push([currentRow, currentColumn]);

        [
          [currentRow - 1, currentColumn],
          [currentRow + 1, currentColumn],
          [currentRow, currentColumn - 1],
          [currentRow, currentColumn + 1]
        ].forEach(([nextRow, nextColumn]) => {
          if (
            nextRow < 0
            || nextColumn < 0
            || nextRow >= rowCount
            || nextColumn >= columnCount
            || !cleanText(grid[nextRow]?.[nextColumn])
          ) {
            return;
          }

          const nextKey = `${nextRow}:${nextColumn}`;

          if (visited.has(nextKey)) {
            return;
          }

          visited.add(nextKey);
          queue.push([nextRow, nextColumn]);
        });
      }

      const rows = cells.map(([cellRow]) => cellRow);
      const columns = cells.map(([, cellColumn]) => cellColumn);
      const region = {
        minRow: Math.min(...rows),
        maxRow: Math.max(...rows),
        minColumn: Math.min(...columns),
        maxColumn: Math.max(...columns),
        nonEmptyCells: cells.length
      };

      if (region.nonEmptyCells >= 2) {
        regions.push(region);
      }
    }
  }

  return regions.sort((left, right) => left.minRow - right.minRow || left.minColumn - right.minColumn);
}

function buildTableFromWorkbookRegion(region, grid, sheetName, sheetIndex = 0, regionIndex = 0) {
  const regionGrid = grid
    .slice(region.minRow, region.maxRow + 1)
    .map((row) => row.slice(region.minColumn, region.maxColumn + 1));
  const nonEmptyColumnIndexes = Array.from({ length: regionGrid[0]?.length ?? 0 }, (_, columnIndex) => columnIndex)
    .filter((columnIndex) => regionGrid.some((row) => cleanText(row[columnIndex])));
  const compactGrid = regionGrid.map((row) => nonEmptyColumnIndexes.map((columnIndex) => cleanText(row[columnIndex])));
  const firstRow = compactGrid[0] ?? [];
  const secondRow = compactGrid[1] ?? [];
  const firstRowCount = firstRow.filter(Boolean).length;
  const secondRowCount = secondRow.filter(Boolean).length;
  const titleRowIndex = compactGrid.length >= 2 && firstRowCount === 1 && secondRowCount >= 2 ? 0 : -1;
  const headerRowIndex = titleRowIndex === 0 ? 1 : 0;
  const headerRow = compactGrid[headerRowIndex] ?? [];
  const dataRows = compactGrid.slice(headerRowIndex + 1);
  const hasBody = dataRows.some((row) => row.some(Boolean));
  const columnCount = Math.max(1, headerRow.length, ...dataRows.map((row) => row.length));

  if (columnCount === 1 && compactGrid.length === 1) {
    return null;
  }

  const columns = Array.from({ length: columnCount }, (_, columnIndex) => normalizeStoredTableColumn({
    label: headerRow[columnIndex] || `Columna ${columnIndex + 1}`
  }, columnIndex)).filter(Boolean);
  const rows = (hasBody ? dataRows : [])
    .map((row, rowIndex) => normalizeStoredTableRow({
      cells: Array.from({ length: columnCount }, (_, columnIndex) => row[columnIndex] ?? "")
    }, columns, rowIndex))
    .filter(Boolean);
  const title = titleRowIndex === 0 ? firstRow.find(Boolean) ?? "" : "";
  const fallbackName = cleanText(sheetName) || `Hoja ${sheetIndex + 1}`;
  const regionSuffix = regionIndex > 0 ? ` ${regionIndex + 1}` : "";

  return {
    name: cleanText(title) || `${fallbackName}${regionSuffix}`,
    columns,
    rows,
    collapsed: false
  };
}

function createImportedTableFolder(baseName = "") {
  const folder = normalizeStoredTableFolder({
    id: createStableId("table-folder"),
    name: cleanText(baseName) || `Importacion ${state.tableFolders.length + 1}`,
    isExpanded: true
  });

  state.tableFolders = [...state.tableFolders, folder];
  return folder.id;
}

function getExcelImportBaseName(fileName = "") {
  return cleanText(fileName)
    .replace(/\.(xlsx|xls)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

async function exportTableToExcel(tableId) {
  const table = state.tables.find((entry) => entry.id === cleanText(tableId));

  if (!table) {
    return;
  }

  try {
    const XLSX = await loadXlsxModule();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      table.columns.map((column) => column.label),
      ...table.rows.map((row) => table.columns.map((column) => row.cells[column.id] ?? ""))
    ]);

    worksheet["!cols"] = table.columns.map((column, index) => {
      const widthPx = column.width || (getTableColumnKind(column, index) === "number" ? 88 : getTableColumnKind(column, index) === "short" ? 220 : 420);
      return {
        wpx: widthPx
      };
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, getSafeExcelSheetName(table.name));
    XLSX.writeFile(workbook, `${slugify(table.name) || "tabla"}.xlsx`);
  } catch {
    state.campaignMessage = "No se pudo exportar la tabla a Excel.";
    render();
  }
}

function getSafeExcelSheetName(name) {
  const safeName = cleanText(name).replace(/[\\/*?:\[\]]/g, " ").trim();
  return (safeName || "Tabla").slice(0, 31);
}

  return {
    loadTablesState,
    saveTablesState,
    getDefaultTablesState,
    getTablesSaveData,
    normalizeStoredTablesState,
    deduplicateStoredSystemTables,
    normalizeStoredTableFolder,
    normalizeStoredTable,
    normalizeStoredTableColumns,
    normalizeStoredTableColumn,
    normalizeStoredTableColumnWidth,
    normalizeStoredTableRows,
    normalizeStoredTableRow,
    getActiveTable,
    getOpenTables,
    getTableFolderGroups,
    getTablesByFolder,
    getTableFolderNameById,
    reconcileTablesUiState,
    createBlankTable,
    createTable,
    selectTable,
    toggleTableOpen,
    toggleTableCollapsed,
    openAllTables,
    closeAllTables,
    stopActiveTableRoll,
    getTableRollAudioContext,
    playTableRollTone,
    playTableRollSoundStep,
    startTableRoll,
    createTableFolder,
    toggleTableFolder,
    expandTableFolder,
    updateTableFolderName,
    deleteTableFolder,
    deleteTable,
    moveTableToFrontWithinFolder,
    updateTableName,
    updateTableColumnLabel,
    setTableColumnWidth,
    applyTableColumnWidthPreview,
    updateTableCell,
    updateTableDimension,
    addTableColumn,
    insertTableColumnAfter,
    removeTableColumn,
    setTableColumnCount,
    addTableRow,
    insertTableRowAfter,
    removeTableRow,
    setTableRowCount,
    importTablesFromWorkbook,
    extractTablesFromWorkbookSheet,
    normalizeWorkbookGrid,
    detectWorkbookTableRegions,
    buildTableFromWorkbookRegion,
    createImportedTableFolder,
    getExcelImportBaseName,
    exportTableToExcel,
    getSafeExcelSheetName
  };
}
