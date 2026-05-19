import { getTableColumnKind, getTableTextareaRows } from "./tableUtils.js";

export function createTableRenderers({
  state,
  app,
  renderScreenHeadingIdentity,
  escapeHtml,
  cleanText,
  normalizeSearchText,
  isProtectedTable,
  getOpenTables,
  reconcileTablesUiState,
  getTableFolderGroups,
  getTablesByFolder,
  getTableFolderNameById,
  getCompendiumEntryNameAliases,
  findCompendiumEntryByReference,
  resetItemVirtualScroll,
  blankItemFilters,
  blankItemFilterSearch,
  render,
  resetArcanumVirtualScroll,
  blankArcanumFilters,
  blankArcanumFilterSearch
}) {
  let lootTableItemMatchCache = {
    items: null,
    arcanum: null,
    index: new Map()
  };

function renderTablesScreen() {
  reconcileTablesUiState();
  const openTables = getOpenTables();
  const selectedFolder = state.tableFolders.find((folder) => folder.id === state.activeTableFolderId) ?? null;

  return `
    <section class="panel panel--table tables-screen">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("tables", "Referencia editable", "Tablas")}
        <div class="section-meta">
          <span>${state.tables.length} tablas</span>
          <span>${openTables.length} abiertas</span>
        </div>
      </div>

      <div class="characters-toolbar tables-screen__toolbar">
        <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-table">
          Nueva tabla
        </button>
        <button class="toolbar-button" type="button" data-action="import-table-workbook">
          Importar Excel
        </button>
        <button class="toolbar-button" type="button" data-action="close-all-tables" ${openTables.length > 0 ? "" : "disabled"}>
          Cerrar vistas
        </button>
      </div>

      <div class="tables-layout">
        <aside class="tables-sidebar panel panel--inner" aria-label="Tablas disponibles">
          <div class="tables-sidebar__header">
            <div>
              <p class="eyebrow">Listado</p>
              <h3>Biblioteca</h3>
            </div>
            <div class="encounter-list__actions tables-sidebar__actions">
              <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-table-folder">
                Nueva carpeta
              </button>
              ${
                selectedFolder
                  ? `
                    <button
                      class="toolbar-button toolbar-button--danger"
                      type="button"
                      data-action="delete-table-folder"
                      data-table-folder-id="${escapeHtml(selectedFolder.id)}"
                    >
                      Eliminar carpeta
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
          <div class="tables-sidebar__list">
            ${
              state.tables.length > 0 || state.tableFolders.length > 0
                ? renderTableFolderGroups()
                : `<div class="empty-state empty-state--compact">No hay tablas todavia. Crea una nueva.</div>`
            }
          </div>
        </aside>

        <div class="tables-workspace">
          ${
            openTables.length > 0
              ? openTables.map((table) => renderTablePanel(table)).join("")
              : `
                <div class="empty-state empty-state--panel tables-workspace__empty">
                  <div>
                    <p>Abre una tabla desde la izquierda para verla aqui.</p>
                    <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-table">
                      Crear primera tabla
                    </button>
                  </div>
                </div>
              `
          }
        </div>
      </div>
      <input
        class="file-menu__file"
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        data-table-import-input
      />
    </section>
  `;
}

function renderTableListItem(table) {
  const isActive = table.id === state.activeTableId;
  const isOpen = state.openTableIds.includes(table.id);

  return `
    <button
      class="table-list-item ${isActive ? "is-active" : ""} ${isOpen ? "is-open" : ""}"
      type="button"
      data-action="select-table"
      data-table-id="${escapeHtml(table.id)}"
      aria-pressed="${isActive}"
    >
      <span class="table-list-item__copy">
        <strong>${escapeHtml(table.name || "Tabla sin nombre")}</strong>
        <small>${table.columns.length} columnas | ${table.rows.length} filas${isOpen ? " | abierta" : ""}</small>
      </span>
    </button>
  `;
}

function renderTableFolderGroups() {
  return getTableFolderGroups()
    .map((folder) => renderTableFolderGroup(folder))
    .join("");
}

function renderTableFolderGroup(folder) {
  const folderTables = getTablesByFolder(folder.id);
  const isActive = state.activeTableFolderId === folder.id;
  const isSystemFolder = folder.id === "";
  const selectedTableInFolder = state.tables.find((table) => table.id === state.activeTableId && (table.folderId ?? "") === folder.id) ?? null;
  const isSelectedTableProtected = isProtectedTable(selectedTableInFolder);

  if (folderTables.length === 0 && isSystemFolder && state.tableFolders.length > 0) {
    return "";
  }

  return `
    <section class="encounter-folder ${isActive ? "is-active" : ""}">
      <div class="encounter-folder__header">
        <div class="encounter-folder__summary">
          <button
            class="encounter-folder__toggle"
            type="button"
            data-action="toggle-table-folder"
            data-table-folder-id="${escapeHtml(folder.id)}"
            aria-expanded="${folder.isExpanded}"
          >
            <span aria-hidden="true">${folder.isExpanded ? "v" : ">"}</span>
            <small>${folderTables.length}</small>
          </button>
          ${
            isSystemFolder
              ? `<strong class="encounter-folder__static-name">${escapeHtml(folder.name)}</strong>`
              : `
                <input
                  class="encounter-folder__name"
                  type="text"
                  value="${escapeHtml(folder.name)}"
                  data-table-folder-name="${escapeHtml(folder.id)}"
                  aria-label="Nombre de carpeta ${escapeHtml(folder.name)}"
                />
              `
          }
        </div>
        <div class="tables-folder__actions">
          <button
            class="filter-clear"
            type="button"
            data-action="create-table"
            ${folder.id ? `data-table-folder-id="${escapeHtml(folder.id)}"` : ""}
          >
            Nueva
          </button>
          <button
            class="filter-clear encounter-folder__delete"
            type="button"
            data-action="delete-table"
            data-table-id="${escapeHtml(selectedTableInFolder?.id ?? "")}"
            aria-label="${selectedTableInFolder ? isSelectedTableProtected ? `La tabla ${escapeHtml(selectedTableInFolder.name)} esta protegida` : `Eliminar tabla ${escapeHtml(selectedTableInFolder.name)}` : `Selecciona una tabla de ${escapeHtml(folder.name)} para eliminarla`}"
            ${selectedTableInFolder && !isSelectedTableProtected ? "" : "disabled"}
          >
            Eliminar
          </button>
        </div>
      </div>
      ${
        folder.isExpanded
          ? `
            <div class="encounter-folder__items">
              ${
                folderTables.length > 0
                  ? folderTables.map((table) => renderTableListItem(table)).join("")
                  : `<div class="empty-state empty-state--compact">Esta carpeta esta vacia.</div>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderTablePanel(table) {
  const isActive = table.id === state.activeTableId;
  const columnCount = table.columns.length;
  const rowCount = table.rows.length;
  const panelTitle = getTablePanelTitle(table);
  const isRolling = state.rollingTableId === table.id;
  const isTableProtected = isProtectedTable(table);

  return `
    <section class="panel panel--inner table-panel ${isActive ? "is-active" : ""} ${table.collapsed ? "is-collapsed" : ""}">
      <button
        class="table-panel__header"
        type="button"
        data-action="toggle-table-panel-collapse"
        data-table-id="${escapeHtml(table.id)}"
        aria-expanded="${table.collapsed ? "false" : "true"}"
      >
        <div>
          <p class="eyebrow">Tabla editable</p>
          <h3>${escapeHtml(panelTitle)}</h3>
        </div>
        <div class="section-meta">
          <span>${columnCount} columnas</span>
          <span>${rowCount} filas</span>
          <span>${table.collapsed ? "Expandir" : "Encoger"}</span>
        </div>
      </button>

      ${
        table.collapsed
          ? ""
          : `
            <div class="tables-toolbar">
              <label class="toolbar-field tables-toolbar__name">
                <span>Nombre</span>
                <input
                  class="filter-input"
                  type="text"
                  value="${escapeHtml(table.name)}"
                  data-table-name="${escapeHtml(table.id)}"
                  placeholder="Nueva tabla"
                />
              </label>
              <div class="tables-toolbar__actions">
                <button class="toolbar-button toolbar-button--accent tables-toolbar__roll" type="button" data-action="roll-table" data-table-id="${escapeHtml(table.id)}" ${rowCount > 0 ? "" : "disabled"}>
                  <span class="button-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm2.5 2.8a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm5 0a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm-5 5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm5 0a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" />
                    </svg>
                  </span>
                  ${isRolling ? "Rodando..." : "ROLL TABLA"}
                </button>
                <button class="toolbar-button toolbar-button--subtle" type="button" data-action="export-table" data-table-id="${escapeHtml(table.id)}">
                  Exportar Excel
                </button>
                <button class="toolbar-button toolbar-button--subtle-danger" type="button" data-action="delete-table" data-table-id="${escapeHtml(table.id)}" ${isTableProtected ? "disabled" : ""}>
                  Eliminar
                </button>
              </div>
            </div>

            <div class="table-wrap tables-table-wrap" role="region" aria-label="${escapeHtml(table.name || "Tabla")}">
              <table class="combat-table tables-data-table">
                ${renderTableColGroup(table)}
                <thead>
                  <tr>
                    <th class="tables-data-table__row-tools" title="Fila">#</th>
                    ${table.columns.map((column, index) => renderTableColumnHeader(table.id, column, index, columnCount)).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${
                    table.rows.length > 0
                      ? table.rows.map((row, index) => renderTableRow(table, row, index)).join("")
                      : `
                        <tr>
                          <td colspan="${columnCount + 1}">
                            <div class="empty-state empty-state--compact">
                              <p>Sin filas todavia.</p>
                              <button class="toolbar-button toolbar-button--subtle tables-data-table__empty-add" type="button" data-action="insert-table-row-after" data-table-id="${escapeHtml(table.id)}" aria-label="Anadir primera fila" title="Anadir primera fila">+</button>
                            </div>
                          </td>
                        </tr>
                      `
                  }
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `;
}

function getTablePanelTitle(table) {
  const folderName = getTableFolderNameById(table.folderId);
  const tableName = cleanText(table?.name) || "Tabla sin nombre";
  return folderName ? `${folderName} - ${tableName}` : tableName;
}

function syncRolledTableRowIntoView() {
  const rowId = cleanText(state.rollingTableRowId || state.rolledTableRowId);
  const tableId = cleanText(state.rollingTableId || state.rolledTableId || state.activeTableId);

  if (!rowId || !tableId) {
    return;
  }

  const row = app.querySelector(`[data-table-row-id="${rowId}"][data-table-owner-id="${tableId}"]`);
  const viewport = row?.closest(".tables-table-wrap");

  if (!row || !viewport) {
    return;
  }

  const rowRect = row.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const nextScrollTop = viewport.scrollTop + (rowRect.top - viewportRect.top) - (viewport.clientHeight / 2) + (rowRect.height / 2);

  viewport.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: state.rollingTableId ? "auto" : "smooth"
  });
}

function renderTableColumnHeader(tableId, column, index, columnCount) {
  const columnKind = getTableColumnKind(column, index);

  return `
    <th class="tables-data-table__header-cell tables-data-table__header-cell--${columnKind}">
      <div class="tables-data-table__header">
        <div class="tables-data-table__header-top">
          <span class="tables-data-table__header-index">Col ${index + 1}</span>
          <div class="tables-data-table__header-actions">
            <button
              class="toolbar-button toolbar-button--subtle-danger tables-data-table__remove-column"
              type="button"
              data-action="remove-table-column"
              data-table-id="${escapeHtml(tableId)}"
              data-table-column-id="${escapeHtml(column.id)}"
              aria-label="Eliminar columna ${escapeHtml(column.label || `Columna ${index + 1}`)}"
              title="Eliminar columna"
              ${columnCount > 1 ? "" : "disabled"}
            >
              X
            </button>
            <button
              class="toolbar-button toolbar-button--subtle tables-data-table__insert-column"
              type="button"
              data-action="insert-table-column-after"
              data-table-id="${escapeHtml(tableId)}"
              data-table-column-id="${escapeHtml(column.id)}"
              aria-label="Anadir columna tras ${escapeHtml(column.label || `Columna ${index + 1}`)}"
              title="Anadir columna"
            >
              +
            </button>
          </div>
        </div>
        <input
          class="filter-input tables-data-table__header-input tables-data-table__header-input--${columnKind}"
          type="text"
          value="${escapeHtml(column.label)}"
          data-table-id="${escapeHtml(tableId)}"
          data-table-column-id="${escapeHtml(column.id)}"
          data-table-column-label="${escapeHtml(column.id)}"
          placeholder="Columna ${index + 1}"
        />
      </div>
      <span
        class="tables-data-table__resize-handle"
        data-table-resize-handle
        data-table-id="${escapeHtml(tableId)}"
        data-table-column-id="${escapeHtml(column.id)}"
        title="Arrastra para cambiar ancho"
        aria-hidden="true"
      ></span>
    </th>
  `;
}

function renderTableRow(table, row, rowIndex) {
  const isRollingRow = state.rollingTableId === table.id && state.rollingTableRowId === row.id;
  const isRolledRow = state.rolledTableId === table.id && state.rolledTableRowId === row.id;

  return `
    <tr class="tables-data-table__row ${isRollingRow ? "is-rolling" : ""} ${isRolledRow ? "is-rolled" : ""}" data-table-row-id="${escapeHtml(row.id)}" data-table-owner-id="${escapeHtml(table.id)}">
      <td class="tables-data-table__row-tools">
        <div class="tables-data-table__row-actions">
          <strong>${rowIndex + 1}</strong>
          <button
            class="toolbar-button toolbar-button--subtle-danger tables-data-table__remove-row"
            type="button"
            data-action="remove-table-row"
            data-table-id="${escapeHtml(table.id)}"
            data-table-row-id="${escapeHtml(row.id)}"
            aria-label="Eliminar fila ${rowIndex + 1}"
            title="Eliminar fila"
          >
            X
          </button>
          <button
            class="toolbar-button toolbar-button--subtle tables-data-table__insert-row"
            type="button"
            data-action="insert-table-row-after"
            data-table-id="${escapeHtml(table.id)}"
            data-table-row-id="${escapeHtml(row.id)}"
            aria-label="Anadir fila tras fila ${rowIndex + 1}"
            title="Anadir fila"
          >
            +
          </button>
        </div>
      </td>
      ${table.columns.map((column, columnIndex) => {
        const cellValue = row.cells[column.id] ?? "";
        const columnKind = getTableColumnKind(column, columnIndex);
        const linkedContent = columnKind !== "number"
          ? renderLootTableCellContent(cellValue)
          : "";

        return `
          <td class="tables-data-table__cell tables-data-table__cell--${columnKind}">
            <textarea
              class="tables-data-table__cell-input tables-data-table__cell-input--${columnKind}"
              rows="${getTableTextareaRows(table.columns.length, columnKind)}"
              data-table-cell="${escapeHtml(column.id)}"
              data-table-id="${escapeHtml(table.id)}"
              data-table-row-id="${escapeHtml(row.id)}"
              data-table-column-id="${escapeHtml(column.id)}"
            >${escapeHtml(cellValue)}</textarea>
            ${linkedContent ? `<div class="tables-data-table__cell-text tables-data-table__cell-text--${columnKind}">${linkedContent}</div>` : ""}
          </td>
        `;
      }).join("")}
    </tr>
  `;
}

function renderLootTableCellContent(value) {
  const text = cleanText(value);
  const matches = getTableCompendiumNameMatches(text);

  if (!text || matches.length === 0) {
    return "";
  }

  let cursor = 0;
  const chunks = [];

  matches.forEach((match) => {
    if (match.start > cursor) {
      chunks.push(escapeHtml(text.slice(cursor, match.start)));
    }

    chunks.push(`
      <button
        class="tables-data-table__item-link"
        type="button"
        data-action="${match.kind === "spell" ? "open-table-spell" : "open-loot-table-item"}"
        ${match.kind === "spell" ? `data-spell-name="${escapeHtml(match.entryName)}"` : `data-item-name="${escapeHtml(match.entryName)}"`}
        title="Abrir ${escapeHtml(match.entryName)} en ${match.kind === "spell" ? "hechizos" : "objetos"}"
      >${escapeHtml(match.entryName || text.slice(match.start, match.end))}</button>
    `);
    cursor = match.end;
  });

  if (cursor < text.length) {
    chunks.push(escapeHtml(text.slice(cursor)));
  }

  return chunks.join("");
}

function getLootTableItemNameMatches(text) {
  return getTableCompendiumNameMatches(text).filter((match) => match.kind === "item");
}

function getTableCompendiumNameMatches(text) {
  const sourceText = cleanText(text);

  if (!sourceText || ((state.itemStatus !== "ready" || state.items.length === 0) && (state.arcanumStatus !== "ready" || state.arcanum.length === 0))) {
    return [];
  }

  const normalizedSource = normalizeSearchText(sourceText);
  const sourceWords = new Set(normalizedSource.match(/[a-z0-9]+/g) ?? []);
  const candidateIndex = getTableCompendiumCandidateIndex();
  const candidates = [...new Map(
    [...sourceWords]
      .flatMap((word) => candidateIndex.get(word) ?? [])
      .map((candidate) => [`${candidate.kind}:${candidate.normalizedName}`, candidate])
  ).values()];
  const ranges = [];

  candidates.forEach((candidate) => {
    let start = normalizedSource.indexOf(candidate.normalizedName);

    while (start >= 0) {
      const end = start + candidate.normalizedName.length;
      const overlaps = ranges.some((range) => start < range.end && end > range.start);

      if (!overlaps && isLootTableItemMatchBoundary(normalizedSource, start, end)) {
        ranges.push({ start, end, kind: candidate.kind, entryName: candidate.entryName });
      }

      start = normalizedSource.indexOf(candidate.normalizedName, end);
    }
  });

  return ranges.sort((left, right) => left.start - right.start);
}

function getLootTableItemCandidateIndex() {
  return getTableCompendiumCandidateIndex();
}

function getTableCompendiumCandidateIndex() {
  if (lootTableItemMatchCache.items === state.items && lootTableItemMatchCache.arcanum === state.arcanum) {
    return lootTableItemMatchCache.index;
  }

  const uniqueCandidates = new Map();

  [
    { kind: "item", entries: state.items },
    { kind: "spell", entries: state.arcanum }
  ].forEach(({ kind, entries }) => {
    entries.forEach((entry) => {
      const entryName = cleanText(entry.name);
      const aliases = getCompendiumEntryNameAliases(entry);

      aliases.forEach((normalizedName) => {
        const firstWord = normalizedName.match(/[a-z0-9]+/u)?.[0] ?? "";

        if (!entryName || normalizedName.length < 3 || !firstWord) {
          return;
        }

        uniqueCandidates.set(`${kind}:${normalizedName}`, { kind, entryName, normalizedName, firstWord });
      });
    });
  });

  const index = new Map();
  uniqueCandidates.forEach((candidate) => {
    const bucket = index.get(candidate.firstWord) ?? [];
    bucket.push(candidate);
    index.set(candidate.firstWord, bucket);
  });
  index.forEach((bucket) => bucket.sort((left, right) => right.normalizedName.length - left.normalizedName.length));
  lootTableItemMatchCache = { items: state.items, arcanum: state.arcanum, index };
  return index;
}

function isLootTableItemMatchBoundary(text, start, end) {
  const before = start > 0 ? text[start - 1] : "";
  const after = end < text.length ? text[end] : "";
  return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after);
}

function openItemFromLootTable(itemName) {
  const normalizedItemName = cleanText(itemName);

  if (!normalizedItemName) {
    return;
  }

  const matchedItem = findCompendiumEntryByReference(state.items, { name: normalizedItemName }) ?? null;
  resetItemVirtualScroll();
  state.activeScreen = "items";
  state.itemFilters = {
    ...blankItemFilters,
    query: matchedItem?.name || normalizedItemName
  };
  state.itemFilterSearch = { ...blankItemFilterSearch };
  state.activeItemFilterKey = "";
  state.showItemQuerySuggestions = false;
  state.itemSelectedId = matchedItem?.id || "";
  render({
    focusSelector: "[data-item-query]"
  });
}

function openSpellFromTable(spellName) {
  const normalizedSpellName = cleanText(spellName);

  if (!normalizedSpellName) {
    return;
  }

  const matchedSpell = findCompendiumEntryByReference(state.arcanum, { name: normalizedSpellName }) ?? null;
  resetArcanumVirtualScroll();
  state.activeScreen = "arcanum";
  state.arcanumFilters = {
    ...blankArcanumFilters,
    query: matchedSpell?.name || normalizedSpellName
  };
  state.arcanumFilterSearch = { ...blankArcanumFilterSearch };
  state.activeArcanumFilterKey = "";
  state.showArcanumQuerySuggestions = false;
  state.arcanumSelectedId = matchedSpell?.id || "";
  render({
    focusSelector: "[data-arcanum-query]"
  });
}

function renderTableColGroup(table) {
  return `
    <colgroup>
      <col class="tables-data-table__col tables-data-table__col--row-tools" />
      ${table.columns.map((column, index) => `
        <col
          class="tables-data-table__col tables-data-table__col--${getTableColumnKind(column, index)}"
          data-table-id="${escapeHtml(table.id)}"
          data-table-col-id="${escapeHtml(column.id)}"
          ${column.width ? `style="width:${column.width}px"` : ""}
        />
      `).join("")}
    </colgroup>
  `;
}

  return {
    renderTablesScreen,
    syncRolledTableRowIntoView,
    openItemFromLootTable,
    openSpellFromTable
  };
}