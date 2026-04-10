const BESTIARY_CSV_PATH = "data/Bestiary.csv";

const screens = [
  {
    id: "combat-tracker",
    label: "Combat Tracker",
    shortLabel: "Combate",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 5.5 5 8l3 3-1.4 1.4L2.2 8l4.4-4.4L7.5 5.5Zm9 0 1.4-1.4L22.3 8l-4.4 4.4-1.4-1.4 3-3-3-2.5ZM12.8 3l2 1-5.5 17-2-1L12.8 3Z" />
      </svg>
    `
  },
  {
    id: "bestiary",
    label: "Bestiary",
    shortLabel: "Bestiario",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17.5a2.5 2.5 0 0 0-2.5-2.5H5V4.5Zm2.5-.5a.5.5 0 0 0-.5.5V15h10.5c.54 0 1.05.1 1.5.3V4H7.5Zm-2.5 15h12.5a.5.5 0 0 1 0 1H7.5A2.5 2.5 0 0 1 5 17.5V19Z" />
      </svg>
    `
  },
  {
    id: "initiative-board",
    label: "Initiative Board",
    shortLabel: "Iniciativa",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v4H4V4Zm0 6h10v4H4v-4Zm0 6h16v4H4v-4Zm12-6h4v4h-4v-4Z" />
      </svg>
    `
  },
  {
    id: "session-vault",
    label: "Session Vault",
    shortLabel: "Sesion",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 3 6v6c0 5 3.8 9.8 9 11 5.2-1.2 9-6 9-11V6l-9-4Zm0 3.1 6 2.7v4.1c0 3.7-2.5 7.3-6 8.4-3.5-1.1-6-4.7-6-8.4V7.8l6-2.7Zm-1 3.9h2v3h3v2h-3v3h-2v-3H8v-2h3V9Z" />
      </svg>
    `
  }
];

const columns = [
  { key: "ubicacion", label: "Ubicacion", type: "text", width: "9rem" },
  { key: "iniactiva", label: "Iniciativa", type: "number", width: "11rem" },
  { key: "nombre", label: "Nombre", type: "text", width: "16rem" },
  { key: "numPeana", label: "Num peana", type: "text", width: "9rem" },
  { key: "pgMax", label: "PG max", type: "number", width: "10rem" },
  { key: "pgAct", label: "PG act", type: "number", width: "14rem" },
  { key: "pgTemp", label: "PG temp", type: "number", width: "10rem" },
  { key: "necrotic", label: "Necrotic", type: "number", width: "12rem" },
  { key: "ca", label: "CA", type: "number", width: "7rem" },
  { key: "condiciones", label: "Condiciones", type: "text", width: "13rem" },
  { key: "stats", label: "Stats", type: "stats", width: "42rem" },
  { key: "tamano", label: "Tamano", type: "text", width: "9rem" },
  { key: "movimiento", label: "Movimiento", type: "text", width: "10rem" },
  { key: "vision", label: "Vision", type: "text", width: "12rem" },
  { key: "lenguas", label: "Lenguas", type: "text", width: "14rem" },
  { key: "crExp", label: "CR/EXP", type: "text", width: "10rem" },
  { key: "tag", label: "Bando", type: "tag", width: "12rem" }
];

const bestiarySortOptions = [
  { value: "name-asc", label: "Nombre A-Z" },
  { value: "cr-asc", label: "CR ascendente" },
  { value: "cr-desc", label: "CR descendente" },
  { value: "ac-desc", label: "CA descendente" },
  { value: "hp-desc", label: "PG descendente" }
];

const initialCombatants = [
  {
    id: "entity-1",
    side: "allies",
    ubicacion: "A2",
    iniactiva: 16,
    nombre: "Seraphina Vale",
    numPeana: "P-01",
    pgMax: 42,
    pgAct: 42,
    pgTemp: 0,
    necrotic: 0,
    ca: 18,
    condiciones: "Concentrando",
    stats: "STR 10 (+0) DEX 14 (+2) CON 13 (+1) INT 12 (+1) WIS 18 (+4) CHA 16 (+3)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Comun, Celestial",
    crExp: "PJ Nv 5",
    tag: "ALIADO",
    initiativeRoll: 14,
    initiativeNat20: false
  },
  {
    id: "entity-2",
    side: "allies",
    ubicacion: "B4",
    iniactiva: 10,
    nombre: "Thoren Ashbrand",
    numPeana: "P-02",
    pgMax: 58,
    pgAct: 58,
    pgTemp: 7,
    necrotic: 0,
    ca: 17,
    condiciones: "Inspirado",
    stats: "STR 18 (+4) DEX 12 (+1) CON 16 (+3) INT 9 (-1) WIS 11 (+0) CHA 10 (+0)",
    tamano: "Mediano",
    movimiento: "25 ft",
    vision: "Normal",
    lenguas: "Comun, Enano",
    crExp: "PJ Nv 5",
    tag: "ALIADO",
    initiativeRoll: 9,
    initiativeNat20: false
  },
  {
    id: "entity-3",
    side: "enemies",
    ubicacion: "F6",
    iniactiva: 14,
    nombre: "Ghoul Packleader",
    numPeana: "E-01",
    pgMax: 36,
    pgAct: 36,
    pgTemp: 0,
    necrotic: 0,
    ca: 13,
    condiciones: "Amenazado",
    stats: "STR 13 (+1) DEX 15 (+2) CON 10 (+0) INT 7 (-2) WIS 10 (+0) CHA 6 (-2)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Common",
    crExp: "CR 2 / 450",
    tag: "ENEMIGO",
    initiativeRoll: 12,
    initiativeNat20: false
  },
  {
    id: "entity-4",
    side: "enemies",
    ubicacion: "G7",
    iniactiva: 7,
    nombre: "Cult Adept",
    numPeana: "E-02",
    pgMax: 27,
    pgAct: 0,
    pgTemp: 0,
    necrotic: 4,
    ca: 12,
    condiciones: "Inconsciente",
    stats: "STR 9 (-1) DEX 12 (+1) CON 10 (+0) INT 11 (+0) WIS 14 (+2) CHA 13 (+1)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Normal",
    lenguas: "Comun, Abisal",
    crExp: "CR 1 / 200",
    tag: "ENEMIGO",
    initiativeRoll: 6,
    initiativeNat20: false
  }
];

const blankFilters = Object.fromEntries(columns.map((column) => [column.key, ""]));
const blankInlineAdjustments = { pgAct: "", necrotic: "" };
const blankBestiaryFilters = {
  query: "",
  source: "",
  type: "",
  environment: "",
  sort: "name-asc"
};
const bestiaryFilterLabels = {
  source: "fuente",
  type: "tipo",
  environment: "entorno"
};

const app = document.querySelector("#app");
const statKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

const state = {
  activeScreen: "combat-tracker",
  combatants: initialCombatants,
  filters: { ...blankFilters },
  sort: { key: "iniactiva", direction: "desc" },
  activeFilterKey: "",
  selectedIds: new Set(),
  newEntitySide: "allies",
  nextId: initialCombatants.length + 1,
  inlineAdjustments: Object.fromEntries(initialCombatants.map((combatant) => [combatant.id, { ...blankInlineAdjustments }])),
  areaDamage: "",
  bestiary: [],
  bestiaryFilters: { ...blankBestiaryFilters },
  bestiarySelectedId: "",
  bestiaryStatus: "loading",
  bestiaryMessage: ""
};

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);

render();
loadBestiary();

function handleClick(event) {
  const screenButton = event.target.closest("[data-screen]");

  if (screenButton) {
    state.activeScreen = screenButton.dataset.screen;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  if (action === "toggle-sort") {
    toggleSort(actionButton.dataset.sortKey);
    render();
    return;
  }

  if (action === "toggle-filter") {
    const nextKey = state.activeFilterKey === actionButton.dataset.filterKey ? "" : actionButton.dataset.filterKey;
    state.activeFilterKey = nextKey;
    render({
      focusSelector: nextKey ? `[data-filter-key="${nextKey}"]` : null
    });
    return;
  }

  if (action === "clear-filter") {
    state.filters[actionButton.dataset.filterKey] = "";
    render({
      focusSelector: `[data-filter-key="${actionButton.dataset.filterKey}"]`
    });
    return;
  }

  if (action === "clear-filters") {
    state.filters = { ...blankFilters };
    state.activeFilterKey = "";
    render();
    return;
  }

  if (action === "add-entity") {
    addEntity();
    render();
    return;
  }

  if (action === "delete-selected") {
    deleteSelected();
    render();
    return;
  }

  if (action === "generate-iniactiva") {
    generateInitiative();
    render();
    return;
  }

  if (action === "adjust-pg-act") {
    applyPgActAdjustment(actionButton.dataset.id, actionButton.dataset.mode);
    render();
    return;
  }

  if (action === "adjust-necrotic") {
    applyNecroticAdjustment(actionButton.dataset.id);
    render();
    return;
  }

  if (action === "apply-area-damage") {
    applyAreaDamage();
    render();
    return;
  }

  if (action === "select-bestiary-entry") {
    state.bestiarySelectedId = actionButton.dataset.entryId;
    render();
    return;
  }

  if (action === "clear-bestiary-filters") {
    state.bestiaryFilters = { ...blankBestiaryFilters };
    render({
      focusSelector: "[data-bestiary-query]"
    });
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-select-row]")) {
    toggleRowSelection(target.dataset.selectRow, target.checked);
    render();
    return;
  }

  if (target.matches("[data-select-all]")) {
    toggleAllVisible(target.checked);
    render();
    return;
  }

  if (target.matches("[data-new-entity-side]")) {
    state.newEntitySide = target.value;
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    return;
  }

  if (target.matches("[data-filter-key]")) {
    state.filters[target.dataset.filterKey] = target.value;
    render({
      focusSelector: `[data-filter-key="${target.dataset.filterKey}"]`
    });
    return;
  }

  if (target.matches("[data-edit-id][data-edit-key]")) {
    updateCombatantField(target.dataset.editId, target.dataset.editKey, target.value);
    render();
    return;
  }

  if (target.matches("[data-bestiary-filter]")) {
    updateBestiaryFilter(target.dataset.bestiaryFilter, target.value);
    render();
  }
}

function handleInput(event) {
  const target = event.target;

  if (target.matches("[data-filter-key]")) {
    state.filters[target.dataset.filterKey] = target.value;
    render({
      focusSelector: `[data-filter-key="${target.dataset.filterKey}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-adjust-id][data-adjust-field]")) {
    setInlineAdjustment(target.dataset.adjustId, target.dataset.adjustField, target.value);
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    return;
  }

  if (target.matches("[data-edit-id][data-edit-key]")) {
    updateCombatantField(target.dataset.editId, target.dataset.editKey, target.value, false);
    return;
  }

  if (target.matches("[data-stat-id][data-stat-key]")) {
    updateCombatantStat(target.dataset.statId, target.dataset.statKey, target.value, false);
    return;
  }

  if (target.matches("[data-bestiary-query]")) {
    state.bestiaryFilters.query = target.value;
    render({
      focusSelector: "[data-bestiary-query]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
  }
}

function render(focusState = null) {
  app.innerHTML = `
    <div class="shell">
      <div class="shell__backdrop"></div>
      <header class="topbar">
        <div class="brand">
          <div class="brand__crest">MD</div>
          <div>
            <p class="brand__eyebrow">D&D 5e encounter suite</p>
            <h1>Mimic Dice</h1>
          </div>
        </div>
        <nav class="nav" aria-label="Pantallas principales">
          ${screens.map(renderScreenButton).join("")}
        </nav>
      </header>
      <main class="workspace">
        ${renderScreen()}
      </main>
    </div>
  `;

  if (focusState?.focusSelector) {
    const target = app.querySelector(focusState.focusSelector);

    if (target) {
      target.focus();

      if (typeof focusState.selectionStart === "number" && typeof target.setSelectionRange === "function") {
        target.setSelectionRange(focusState.selectionStart, focusState.selectionEnd ?? focusState.selectionStart);
      }
    }
  }
}

function renderScreenButton(screen) {
  return `
    <button
      class="nav__button ${screen.id === state.activeScreen ? "is-active" : ""}"
      type="button"
      data-screen="${screen.id}"
      aria-pressed="${screen.id === state.activeScreen}"
      title="${screen.label}"
    >
      <span class="nav__icon">${screen.icon}</span>
      <span class="nav__label">${screen.shortLabel}</span>
    </button>
  `;
}

function renderScreen() {
  if (state.activeScreen === "combat-tracker") {
    return renderCombatTracker();
  }

  if (state.activeScreen === "bestiary") {
    return renderBestiary();
  }

  if (state.activeScreen === "initiative-board") {
    return renderPlaceholderScreen(
      "Initiative Board",
      "Aqui podemos construir el flujo de turnos, rondas, ready actions y recordatorios del combate."
    );
  }

  return renderPlaceholderScreen(
    "Session Vault",
    "Esta pantalla puede agrupar criaturas guardadas, encuentros preparados, notas de sesion y presets de campana."
  );
}

function renderCombatTracker() {
  const summaries = getSummaries();
  const visibleCombatants = getVisibleCombatants();
  const allVisibleSelected =
    visibleCombatants.length > 0 &&
    visibleCombatants.every((combatant) => state.selectedIds.has(combatant.id));

  return `
    <section class="panel panel--hero">
      <div class="panel__copy">
        <p class="eyebrow">Pantalla 1</p>
        <h2>Combat Tracker</h2>
        <p class="lead">
          Vista principal para controlar aliados y enemigos durante el encuentro, con una tabla editable,
          filtros por columna, ordenacion y acciones de mesa rapidas.
        </p>
      </div>
      <div class="summary-grid">
        ${summaries.map(renderSummaryCard).join("")}
      </div>
    </section>

    <section class="panel panel--table">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Encuentro actual</p>
          <h3>Ruins of Saint Korrin</h3>
        </div>
        <div class="section-meta">
          <span>Ronda 3</span>
          <span>${visibleCombatants.length} visibles</span>
          <span>${state.selectedIds.size} seleccionados</span>
        </div>
      </div>

      <div class="table-toolbar" aria-label="Acciones de tabla">
        <div class="table-toolbar__group">
          <label class="toolbar-field">
            <span>Bando nueva entidad</span>
            <select data-new-entity-side>
              <option value="allies" ${state.newEntitySide === "allies" ? "selected" : ""}>Aliado</option>
              <option value="enemies" ${state.newEntitySide === "enemies" ? "selected" : ""}>Enemigo</option>
              <option value="neutral" ${state.newEntitySide === "neutral" ? "selected" : ""}>Neutral</option>
            </select>
          </label>
          <button class="toolbar-button" type="button" data-action="add-entity">Anadir entidad</button>
          <button
            class="toolbar-button toolbar-button--danger"
            type="button"
            data-action="delete-selected"
            ${state.selectedIds.size === 0 ? "disabled" : ""}
          >
            Eliminar seleccionadas
          </button>
          <div class="area-damage">
            <input
              class="area-damage__input"
              type="number"
              inputmode="numeric"
              placeholder="Danio en area"
              value="${escapeHtml(state.areaDamage)}"
              data-area-damage
              aria-label="Puntos de danio en area"
            />
            <button
              class="toolbar-button toolbar-button--area"
              type="button"
              data-action="apply-area-damage"
              ${state.selectedIds.size === 0 ? "disabled" : ""}
              aria-label="Aplicar danio en area"
            >
              <span class="button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3c3.9 0 7 2 7 4.5 0 1.7-1.4 3-3.5 3.8 2.5.6 4.5 2.1 4.5 4.2 0 3-3.6 5.5-8 5.5s-8-2.5-8-5.5c0-2.1 2-3.6 4.5-4.2C6.4 10.5 5 9.2 5 7.5 5 5 8.1 3 12 3Zm0 2c-2.8 0-5 .9-5 2.5S9.2 10 12 10s5-1 5-2.5S14.8 5 12 5Zm0 7c-3.3 0-6 1.6-6 3.5S8.7 19 12 19s6-1.6 6-3.5S15.3 12 12 12Z" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="table-toolbar__group">
          <button
            class="toolbar-button toolbar-button--accent"
            type="button"
            data-action="generate-iniactiva"
            ${state.selectedIds.size === 0 ? "disabled" : ""}
          >
            <span class="button-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6.2 3h11.6L22 8.2v7.6L17.8 21H6.2L2 15.8V8.2L6.2 3Zm1.4 2L4 9.4v5.2L7.6 19h8.8l3.6-4.4V9.4L16.4 5H7.6Zm2.1 2.7h4.6l2.4 2.8-2.4 2.8H9.7l-2.3-2.8 2.3-2.8Zm.9 7.1h2.8l1.4 1.8-1.4 1.7h-2.8l-1.4-1.7 1.4-1.8Z" />
              </svg>
            </span>
            Generar iniciativa
          </button>
          <button class="toolbar-button" type="button" data-action="clear-filters">Limpiar filtros</button>
        </div>
      </div>

      <div class="table-wrap" role="region" aria-label="Combat tracker" tabindex="0">
        <table class="combat-table">
          <colgroup>
            <col style="width: 3.6rem" />
            ${columns.map((column) => `<col style="width: ${column.width}" />`).join("")}
          </colgroup>
          <thead>
            <tr>
              <th class="cell-select" scope="col">
                <input
                  type="checkbox"
                  data-select-all
                  aria-label="Seleccionar todas las entidades visibles"
                  ${allVisibleSelected ? "checked" : ""}
                />
              </th>
              ${columns.map(renderHeaderCell).join("")}
            </tr>
          </thead>
          <tbody>
            ${visibleCombatants.length > 0 ? visibleCombatants.map(renderCombatRow).join("") : renderEmptyRow()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderBestiary() {
  const filteredEntries = getFilteredBestiary();
  const selectedEntry = getSelectedBestiaryEntry(filteredEntries);
  const summaries = getBestiarySummaries(filteredEntries);

  return `
    <section class="panel panel--hero">
      <div class="panel__copy">
        <p class="eyebrow">Pantalla 2</p>
        <h2>Bestiario</h2>
        <p class="lead">
          Inventario de criaturas cargado desde <code>${BESTIARY_CSV_PATH}</code>, pensado para consultar datos rapidos
          y preparar futuras referencias dentro del combat tracker.
        </p>
      </div>
      <div class="summary-grid">
        ${summaries.map(renderSummaryCard).join("")}
      </div>
    </section>

    <section class="panel panel--table">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Repositorio de enemigos</p>
          <h3>Catalogo sincronizado con CSV</h3>
        </div>
        <div class="section-meta">
          <span>${getBestiaryStatusLabel()}</span>
          <span>${filteredEntries.length} visibles</span>
          <span>${state.bestiary.length} totales</span>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="Filtros del bestiario">
        <label class="toolbar-field toolbar-field--search">
          <span>Buscar criatura</span>
          <input
            class="filter-input filter-input--wide"
            type="search"
            value="${escapeHtml(state.bestiaryFilters.query)}"
            placeholder="Nombre, rasgo, accion, idioma..."
            data-bestiary-query
          />
        </label>
        <label class="toolbar-field">
          <span>Fuente</span>
          <select data-bestiary-filter="source">
            ${renderBestiaryFilterOptions("source")}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Tipo</span>
          <select data-bestiary-filter="type">
            ${renderBestiaryFilterOptions("type")}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Entorno</span>
          <select data-bestiary-filter="environment">
            ${renderBestiaryFilterOptions("environment")}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Orden</span>
          <select data-bestiary-filter="sort">
            ${bestiarySortOptions
              .map((option) => `<option value="${option.value}" ${option.value === state.bestiaryFilters.sort ? "selected" : ""}>${option.label}</option>`)
              .join("")}
          </select>
        </label>
        <button class="toolbar-button" type="button" data-action="clear-bestiary-filters">Limpiar filtros</button>
      </div>

      ${renderBestiaryContent(filteredEntries, selectedEntry)}
    </section>
  `;
}

function renderBestiaryContent(filteredEntries, selectedEntry) {
  if (state.bestiaryStatus === "loading") {
    return `
      <div class="empty-state empty-state--panel">
        Cargando Bestiary.csv...
      </div>
    `;
  }

  if (state.bestiaryStatus === "error") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(state.bestiaryMessage || "No se pudo leer Bestiary.csv.")}
      </div>
    `;
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Criaturas del bestiario">
        ${
          filteredEntries.length > 0
            ? filteredEntries.map((entry) => renderBestiaryRow(entry, entry.id === selectedEntry?.id)).join("")
            : `
              <div class="empty-state empty-state--panel">
                No hay criaturas que coincidan con los filtros actuales.
              </div>
            `
        }
      </div>
      <aside class="bestiary-detail panel panel--inner">
        ${selectedEntry ? renderBestiaryDetail(selectedEntry) : renderBestiaryDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderBestiaryRow(entry, isSelected) {
  return `
    <button
      class="bestiary-row ${isSelected ? "is-selected" : ""}"
      type="button"
      role="listitem"
      data-action="select-bestiary-entry"
      data-entry-id="${entry.id}"
    >
      <div class="bestiary-row__main">
        <div>
          <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
          <p class="bestiary-row__meta">${escapeHtml(entry.typeLine)}</p>
        </div>
        <div class="bestiary-row__chips">
          <span class="pill">${escapeHtml(entry.sourceLabel)}</span>
          <span class="pill">${escapeHtml(entry.crLabel)}</span>
        </div>
      </div>
      <div class="bestiary-row__stats">
        <span>CA ${escapeHtml(entry.ac || "-")}</span>
        <span>PG ${escapeHtml(entry.hp || "-")}</span>
        <span>${escapeHtml(entry.speed || "Sin velocidad")}</span>
      </div>
      <div class="bestiary-row__footer">
        <span>${escapeHtml(entry.environmentShort || "Entorno sin especificar")}</span>
        <span>${escapeHtml(entry.languages || "Sin idiomas")}</span>
      </div>
    </button>
  `;
}

function renderBestiaryDetail(entry) {
  const sections = [
    { title: "Traits", content: entry.traits },
    { title: "Actions", content: entry.actions },
    { title: "Bonus Actions", content: entry.bonusActions },
    { title: "Reactions", content: entry.reactions },
    { title: "Legendary Actions", content: entry.legendaryActions },
    { title: "Mythic Actions", content: entry.mythicActions },
    { title: "Lair Actions", content: entry.lairActions },
    { title: "Regional Effects", content: entry.regionalEffects }
  ].filter((section) => section.content);

  return `
    <div class="bestiary-detail__header">
      <p class="eyebrow">Ficha seleccionada</p>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="lead">${escapeHtml(entry.typeLine)}</p>
    </div>

    <div class="bestiary-kpis">
      <article class="summary-card summary-card--compact">
        <span>CR</span>
        <strong>${escapeHtml(entry.crLabel)}</strong>
      </article>
      <article class="summary-card summary-card--compact">
        <span>CA</span>
        <strong>${escapeHtml(entry.ac || "-")}</strong>
      </article>
      <article class="summary-card summary-card--compact">
        <span>PG</span>
        <strong>${escapeHtml(entry.hp || "-")}</strong>
      </article>
      <article class="summary-card summary-card--compact">
        <span>Velocidad</span>
        <strong>${escapeHtml(entry.speed || "-")}</strong>
      </article>
    </div>

    <div class="bestiary-detail__grid">
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Fuente</span>
        <p>${escapeHtml(entry.sourceLabel)}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Alineamiento</span>
        <p>${escapeHtml(entry.alignment || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Sentidos</span>
        <p>${escapeHtml(entry.senses || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Idiomas</span>
        <p>${escapeHtml(entry.languages || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Skills</span>
        <p>${escapeHtml(entry.skills || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Saving Throws</span>
        <p>${escapeHtml(entry.savingThrows || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Entorno</span>
        <p>${escapeHtml(entry.environment || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Tesoro</span>
        <p>${escapeHtml(entry.treasure || "No indicado")}</p>
      </div>
    </div>

    <div class="bestiary-abilities">
      ${statKeys.map((ability) => renderBestiaryAbility(entry, ability)).join("")}
    </div>

    <div class="bestiary-resistances">
      ${renderDetailChip("Damage Vulnerabilities", entry.damageVulnerabilities)}
      ${renderDetailChip("Damage Resistances", entry.damageResistances)}
      ${renderDetailChip("Damage Immunities", entry.damageImmunities)}
      ${renderDetailChip("Condition Immunities", entry.conditionImmunities)}
    </div>

    <div class="bestiary-sections">
      ${sections.map((section) => renderBestiarySection(section.title, section.content)).join("")}
    </div>
  `;
}

function renderBestiaryDetailEmpty() {
  return `
    <div class="empty-state empty-state--panel">
      Selecciona una criatura para ver la ficha completa.
    </div>
  `;
}

function renderBestiaryAbility(entry, ability) {
  const score = entry.abilities[ability] ?? 10;
  const modifier = formatModifier(getAbilityModifier(score));

  return `
    <article class="ability-card">
      <span>${ability}</span>
      <strong>${score}</strong>
      <small>${modifier}</small>
    </article>
  `;
}

function renderDetailChip(label, value) {
  if (!value) {
    return "";
  }

  return `
    <article class="detail-chip">
      <span>${label}</span>
      <p>${escapeHtml(value)}</p>
    </article>
  `;
}

function renderBestiarySection(title, content) {
  return `
    <section class="detail-section">
      <h4>${title}</h4>
      <p>${escapeHtml(content).replaceAll("\n", "<br />")}</p>
    </section>
  `;
}

function renderSummaryCard(item) {
  return `
    <article class="summary-card">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </article>
  `;
}

function renderHeaderCell(column) {
  const isActive = state.sort.key === column.key;
  const sortDirection = isActive ? state.sort.direction : "none";
  const sortLabel =
    sortDirection === "asc"
      ? "Asc"
      : sortDirection === "desc"
        ? "Desc"
        : "Off";

  return `
    <th scope="col">
      <div class="th-stack">
        <div class="th-content">
          <span>${column.label}</span>
          <button
            class="sort-button ${isActive ? "is-active" : ""}"
            type="button"
            data-action="toggle-sort"
            data-sort-key="${column.key}"
            aria-label="Ordenar por ${column.label}"
          >
            <span>${sortLabel}</span>
            <span aria-hidden="true">Arr</span>
          </button>
        </div>
        <div class="th-actions">
          <button
            class="filter-button ${state.filters[column.key] ? "is-active" : ""}"
            type="button"
            data-action="toggle-filter"
            data-filter-key="${column.key}"
            aria-label="Abrir filtro de ${column.label}"
          >
            <span aria-hidden="true">Fil</span>
            <span>Filtro</span>
          </button>
          ${
            state.activeFilterKey === column.key
              ? `
                <div class="filter-popover">
                  <label class="filter-popover__label">
                    <span>Filtrar ${column.label}</span>
                    <input
                      class="filter-input"
                      type="text"
                      value="${escapeHtml(state.filters[column.key])}"
                      data-filter-key="${column.key}"
                      placeholder="Escribe para filtrar"
                      aria-label="Filtrar ${column.label}"
                    />
                  </label>
                  <button
                    class="filter-clear"
                    type="button"
                    data-action="clear-filter"
                    data-filter-key="${column.key}"
                  >
                    Limpiar
                  </button>
                </div>
              `
              : ""
          }
        </div>
      </div>
    </th>
  `;
}

function renderCombatRow(combatant) {
  const isDead = isCombatantDead(combatant);

  return `
    <tr class="row--${combatant.side} ${state.selectedIds.has(combatant.id) ? "row--selected" : ""} ${isDead ? "row--dead" : ""}">
      <td class="cell-select">
        <input
          type="checkbox"
          data-select-row="${combatant.id}"
          aria-label="Seleccionar ${escapeHtml(combatant.nombre || combatant.id)}"
          ${state.selectedIds.has(combatant.id) ? "checked" : ""}
        />
      </td>
      ${columns.map((column) => renderDataCell(combatant, column, isDead)).join("")}
    </tr>
  `;
}

function renderDataCell(combatant, column, isDead) {
  const value = combatant[column.key] ?? "";
  const isInitiativeNat20 = column.key === "iniactiva" && combatant.initiativeNat20;
  const inputMode = column.type === "number" ? "numeric" : "text";
  const inlineValues = getInlineAdjustment(combatant.id);

  if (column.key === "iniactiva") {
    return `
      <td class="${isInitiativeNat20 ? "cell--nat20" : ""}">
        <div class="initiative-cell">
          <input
            class="cell-input"
            type="number"
            inputmode="${inputMode}"
            value="${escapeHtml(String(value))}"
            data-edit-id="${combatant.id}"
            data-edit-key="${column.key}"
          />
          ${combatant.initiativeRoll ? `<span class="initiative-note">d20 ${combatant.initiativeRoll}</span>` : ""}
          ${isInitiativeNat20 ? `<span class="nat20-badge">Nat 20</span>` : ""}
        </div>
      </td>
    `;
  }

  if (column.key === "nombre") {
    return `
      <td>
        <div class="name-cell">
          <input
            class="cell-input cell-input--strong"
            type="text"
            inputmode="text"
            value="${escapeHtml(String(value))}"
            data-edit-id="${combatant.id}"
            data-edit-key="${column.key}"
          />
          ${isDead ? `<span class="death-badge">Muerto</span>` : ""}
        </div>
      </td>
    `;
  }

  if (column.key === "pgMax") {
    const effectiveMax = getEffectivePgMax(combatant);
    const showEffectiveMax = toNumber(combatant.necrotic) !== 0;

    return `
      <td>
        <div class="resource-cell">
          <input
            class="cell-input"
            type="number"
            inputmode="${inputMode}"
            value="${escapeHtml(String(showEffectiveMax ? effectiveMax : value))}"
            data-edit-id="${combatant.id}"
            data-edit-key="${column.key}"
          />
          ${showEffectiveMax ? `<span class="resource-note">Original ${value}</span>` : ""}
        </div>
      </td>
    `;
  }

  if (column.key === "pgAct") {
    const maxForBar = Math.max(1, getEffectivePgMax(combatant));
    const healthPercent = Math.max(0, Math.min(100, Math.round((toNumber(combatant.pgAct) / maxForBar) * 100)));

    return `
      <td>
        <div class="resource-cell">
          <label class="hp-bar" style="--hp-fill:${healthPercent}%">
            <input
              class="cell-input cell-input--hp"
              type="number"
              inputmode="${inputMode}"
              value="${escapeHtml(String(value))}"
              data-edit-id="${combatant.id}"
              data-edit-key="${column.key}"
            />
          </label>
          <div class="inline-adjust">
            <input
              class="mini-input"
              type="number"
              inputmode="numeric"
              placeholder="0"
              value="${escapeHtml(inlineValues.pgAct)}"
              data-adjust-id="${combatant.id}"
              data-adjust-field="pgAct"
              aria-label="Cantidad para ajustar PG act de ${escapeHtml(combatant.nombre)}"
            />
            <div class="mini-actions">
              <button
                class="mini-action mini-action--damage"
                type="button"
                data-action="adjust-pg-act"
                data-id="${combatant.id}"
                data-mode="damage"
                aria-label="Restar puntos de golpe a ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">DMG</span>
              </button>
              <button
                class="mini-action mini-action--heal"
                type="button"
                data-action="adjust-pg-act"
                data-id="${combatant.id}"
                data-mode="heal"
                aria-label="Sumar puntos de golpe a ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">HEAL</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    `;
  }

  if (column.key === "pgTemp") {
    return `
      <td>
        <input
          class="cell-input"
          type="number"
          inputmode="${inputMode}"
          value="${escapeHtml(String(value))}"
          data-edit-id="${combatant.id}"
          data-edit-key="${column.key}"
        />
      </td>
    `;
  }

  if (column.key === "stats") {
    const stats = parseStats(combatant.stats);

    return `
      <td>
        <div class="stats-grid">
          ${statKeys
            .map((statKey) => {
              const score = stats[statKey] ?? 10;
              const modifier = formatModifier(getAbilityModifier(score));

              return `
                <label class="stat-chip">
                  <span class="stat-chip__label">${statKey} (${modifier})</span>
                  <input
                    class="stat-chip__input"
                    type="number"
                    inputmode="numeric"
                    value="${escapeHtml(String(score))}"
                    data-stat-id="${combatant.id}"
                    data-stat-key="${statKey}"
                    aria-label="${statKey} de ${escapeHtml(combatant.nombre)}"
                  />
                </label>
              `;
            })
            .join("")}
        </div>
      </td>
    `;
  }

  if (column.key === "tag") {
    return `
      <td>
        <select
          class="cell-select-input cell-select-input--tag"
          data-edit-id="${combatant.id}"
          data-edit-key="${column.key}"
        >
          ${["ALIADO", "ENEMIGO", "NEUTRAL"]
            .map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`)
            .join("")}
        </select>
      </td>
    `;
  }

  if (column.key === "necrotic") {
    return `
      <td>
        <div class="resource-cell">
          <input
            class="cell-input"
            type="number"
            inputmode="${inputMode}"
            value="${escapeHtml(String(value))}"
            data-edit-id="${combatant.id}"
            data-edit-key="${column.key}"
          />
          <div class="inline-adjust">
            <input
              class="mini-input"
              type="number"
              inputmode="numeric"
              placeholder="0"
              value="${escapeHtml(inlineValues.necrotic)}"
              data-adjust-id="${combatant.id}"
              data-adjust-field="necrotic"
              aria-label="Cantidad para ajustar necrotic de ${escapeHtml(combatant.nombre)}"
            />
            <div class="mini-actions">
              <button
                class="mini-action mini-action--necrotic"
                type="button"
                data-action="adjust-necrotic"
                data-id="${combatant.id}"
                aria-label="Ajustar danio necrotico de ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">NEC</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    `;
  }

  return `
    <td>
      <input
        class="cell-input"
        type="${column.type === "number" ? "number" : "text"}"
        inputmode="${inputMode}"
        value="${escapeHtml(String(value))}"
        data-edit-id="${combatant.id}"
        data-edit-key="${column.key}"
      />
    </td>
  `;
}

function renderEmptyRow() {
  return `
    <tr>
      <td colspan="${columns.length + 1}">
        <div class="empty-state">
          No hay entidades que coincidan con los filtros actuales.
        </div>
      </td>
    </tr>
  `;
}

function renderPlaceholderScreen(title, description) {
  return `
    <section class="panel panel--placeholder">
      <p class="eyebrow">Proxima expansion</p>
      <h2>${title}</h2>
      <p class="lead">${description}</p>
    </section>
  `;
}

function getSummaries() {
  const allies = state.combatants.filter((entry) => entry.side === "allies").length;
  const enemies = state.combatants.filter((entry) => entry.side === "enemies").length;
  const selected = state.selectedIds.size;
  const totalHp = state.combatants.reduce((total, entry) => total + toNumber(entry.pgAct), 0);

  return [
    { label: "Aliados", value: allies },
    { label: "Enemigos", value: enemies },
    { label: "Seleccionados", value: selected },
    { label: "PG totales", value: totalHp }
  ];
}

function getBestiarySummaries(filteredEntries) {
  const sources = new Set(filteredEntries.map((entry) => entry.source).filter(Boolean)).size;
  const environments = new Set(filteredEntries.flatMap((entry) => entry.environmentTokens)).size;
  const selected = getSelectedBestiaryEntry(filteredEntries);

  return [
    { label: "Criaturas", value: filteredEntries.length },
    { label: "Fuentes", value: sources },
    { label: "Entornos", value: environments },
    { label: "Seleccion", value: selected ? selected.name : "Ninguna" }
  ];
}

function getVisibleCombatants() {
  return [...state.combatants]
    .filter(matchesFilters)
    .sort(compareCombatants);
}

function getFilteredBestiary() {
  return [...state.bestiary]
    .filter(matchesBestiaryFilters)
    .sort(compareBestiaryEntries);
}

function getSelectedBestiaryEntry(filteredEntries = getFilteredBestiary()) {
  const currentEntry = filteredEntries.find((entry) => entry.id === state.bestiarySelectedId);

  if (currentEntry) {
    return currentEntry;
  }

  return filteredEntries[0] ?? null;
}

function matchesFilters(combatant) {
  return columns.every((column) => {
    const filterValue = state.filters[column.key].trim().toLowerCase();

    if (!filterValue) {
      return true;
    }

    const value = column.key === "pgMax"
      ? `${combatant.pgMax} ${getEffectivePgMax(combatant)}`
      : combatant[column.key] ?? "";

    return String(value).toLowerCase().includes(filterValue);
  });
}

function matchesBestiaryFilters(entry) {
  const query = state.bestiaryFilters.query.trim().toLowerCase();
  const source = state.bestiaryFilters.source;
  const type = state.bestiaryFilters.type;
  const environment = state.bestiaryFilters.environment;

  if (query && !entry.searchText.includes(query)) {
    return false;
  }

  if (source && entry.source !== source) {
    return false;
  }

  if (type && entry.type !== type) {
    return false;
  }

  if (environment && !entry.environmentTokens.includes(environment)) {
    return false;
  }

  return true;
}

function compareCombatants(left, right) {
  if (!state.sort.key || !state.sort.direction) {
    return 0;
  }

  const column = columns.find((item) => item.key === state.sort.key);
  const multiplier = state.sort.direction === "asc" ? 1 : -1;
  const leftValue = left[state.sort.key];
  const rightValue = right[state.sort.key];

  if (column?.type === "number") {
    const first = column.key === "pgMax" ? getEffectivePgMax(left) : toNumber(leftValue);
    const second = column.key === "pgMax" ? getEffectivePgMax(right) : toNumber(rightValue);
    return (first - second) * multiplier;
  }

  return String(leftValue ?? "")
    .localeCompare(String(rightValue ?? ""), "es", { numeric: true, sensitivity: "base" }) * multiplier;
}

function compareBestiaryEntries(left, right) {
  const sort = state.bestiaryFilters.sort;

  if (sort === "cr-asc") {
    return left.crValue - right.crValue || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  }

  if (sort === "cr-desc") {
    return right.crValue - left.crValue || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  }

  if (sort === "ac-desc") {
    return right.acValue - left.acValue || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  }

  if (sort === "hp-desc") {
    return right.hpValue - left.hpValue || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  }

  return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
}

function toggleSort(key) {
  if (state.sort.key !== key) {
    state.sort = { key, direction: "asc" };
    return;
  }

  if (state.sort.direction === "asc") {
    state.sort = { key, direction: "desc" };
    return;
  }

  if (state.sort.direction === "desc") {
    state.sort = { key: "", direction: "" };
    return;
  }

  state.sort = { key, direction: "asc" };
}

function toggleRowSelection(id, selected) {
  if (selected) {
    state.selectedIds.add(id);
  } else {
    state.selectedIds.delete(id);
  }
}

function toggleAllVisible(selected) {
  const visibleIds = getVisibleCombatants().map((combatant) => combatant.id);

  if (selected) {
    visibleIds.forEach((id) => state.selectedIds.add(id));
    return;
  }

  visibleIds.forEach((id) => state.selectedIds.delete(id));
}

function updateCombatantField(id, key, rawValue, normalize = true) {
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    const column = columns.find((item) => item.key === key);
    const nextValue = getNormalizedValue(column, rawValue, normalize);
    const updatedCombatant = {
      ...combatant,
      [key]: nextValue
    };

    if (key === "tag") {
      updatedCombatant.side = mapTagToSide(String(nextValue));
    }

    if (key === "iniactiva") {
      updatedCombatant.initiativeNat20 = false;
      updatedCombatant.initiativeRoll = null;
    }

    return normalizeCombatant(updatedCombatant, key);
  });
}

function updateCombatantStat(id, statKey, rawValue, normalize = true) {
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    const nextScore = normalize ? normalizeNumberInput(rawValue) : rawValue;
    const stats = parseStats(combatant.stats);
    stats[statKey] = nextScore === "" ? 10 : toNumber(nextScore);

    return {
      ...combatant,
      stats: formatStatsFromObject(stats)
    };
  });
}

function updateBestiaryFilter(key, value) {
  state.bestiaryFilters[key] = value;
}

function addEntity() {
  const basePg = 10;
  const id = `entity-${state.nextId}`;

  state.combatants = [
    {
      id,
      side: state.newEntitySide,
      ubicacion: "",
      iniactiva: "",
      nombre: state.newEntitySide === "allies" ? "Nueva entidad aliada" : "Nueva entidad enemiga",
      numPeana: "",
      pgMax: basePg,
      pgAct: basePg,
      pgTemp: 0,
      necrotic: 0,
      ca: 10,
      condiciones: "",
      stats: formatStatsWithModifiers("STR 10 DEX 10 CON 10 INT 10 WIS 10 CHA 10"),
      tamano: "Mediano",
      movimiento: "30 ft",
      vision: "",
      lenguas: "",
      crExp: "",
      tag: mapSideToTag(state.newEntitySide),
      initiativeRoll: null,
      initiativeNat20: false
    },
    ...state.combatants
  ];

  state.inlineAdjustments[id] = { ...blankInlineAdjustments };
  state.nextId += 1;
}

function deleteSelected() {
  if (state.selectedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.filter((combatant) => !state.selectedIds.has(combatant.id));

  for (const id of state.selectedIds) {
    delete state.inlineAdjustments[id];
  }

  state.selectedIds = new Set();
}

function generateInitiative() {
  if (state.selectedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
      return combatant;
    }

    const roll = randomD20();
    const dexModifier = getDexModifier(combatant.stats);

    return {
      ...combatant,
      iniactiva: roll + dexModifier,
      initiativeRoll: roll,
      initiativeNat20: roll === 20
    };
  });

  state.sort = { key: "iniactiva", direction: "desc" };
}

function applyPgActAdjustment(id, mode) {
  const amount = Number(getInlineAdjustment(id).pgAct);

  if (!Number.isFinite(amount) || amount < 0) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    if (mode === "heal") {
      return normalizeCombatant({
        ...combatant,
        pgAct: toNumber(combatant.pgAct) + amount
      }, "pgAct");
    }

    let remainingDamage = amount;
    const currentTemp = Math.max(0, toNumber(combatant.pgTemp));
    const tempAfterDamage = Math.max(0, currentTemp - remainingDamage);
    remainingDamage = Math.max(0, remainingDamage - currentTemp);

    return normalizeCombatant({
      ...combatant,
      pgTemp: tempAfterDamage,
      pgAct: toNumber(combatant.pgAct) - remainingDamage
    }, "pgAct");
  });

  setInlineAdjustment(id, "pgAct", "");
}

function applyNecroticAdjustment(id) {
  const amount = Number(getInlineAdjustment(id).necrotic);

  if (!Number.isFinite(amount)) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    return normalizeCombatant({
      ...combatant,
      necrotic: toNumber(combatant.necrotic) + amount
    }, "necrotic");
  });

  setInlineAdjustment(id, "necrotic", "");
}

function applyAreaDamage() {
  const amount = Number(state.areaDamage);

  if (!Number.isFinite(amount) || amount < 0 || state.selectedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
      return combatant;
    }

    let remainingDamage = amount;
    const currentTemp = Math.max(0, toNumber(combatant.pgTemp));
    const tempAfterDamage = Math.max(0, currentTemp - remainingDamage);
    remainingDamage = Math.max(0, remainingDamage - currentTemp);

    return normalizeCombatant({
      ...combatant,
      pgTemp: tempAfterDamage,
      pgAct: toNumber(combatant.pgAct) - remainingDamage
    }, "pgAct");
  });

  state.areaDamage = "";
}

function normalizeCombatant(combatant, changedKey = "") {
  const baseMax = Math.max(0, toNumber(combatant.pgMax));
  const necrotic = Math.max(0, toNumber(combatant.necrotic));
  const effectiveMax = Math.max(0, baseMax - necrotic);
  const pgTemp = Math.max(0, toNumber(combatant.pgTemp));
  let pgAct = combatant.pgAct === "" ? "" : toNumber(combatant.pgAct);

  if (changedKey === "pgMax" && (combatant.pgAct === "" || toNumber(combatant.pgAct) > effectiveMax)) {
    pgAct = effectiveMax;
  }

  if (changedKey === "necrotic") {
    pgAct = Math.min(toNumber(combatant.pgAct), effectiveMax);
  }

  if (changedKey === "pgAct" || changedKey === "necrotic" || changedKey === "pgMax" || changedKey === "pgTemp") {
    pgAct = Math.max(0, Math.min(toNumber(pgAct), effectiveMax));
  }

  return {
    ...combatant,
    pgMax: baseMax,
    pgAct,
    pgTemp,
    necrotic,
    stats: changedKey === "stats" ? formatStatsWithModifiers(combatant.stats) : combatant.stats,
    side: changedKey === "tag" ? mapTagToSide(combatant.tag) : combatant.side
  };
}

function isCombatantDead(combatant) {
  return getEffectivePgMax(combatant) <= 0 || toNumber(combatant.pgAct) <= 0;
}

function getEffectivePgMax(combatant) {
  return Math.max(0, toNumber(combatant.pgMax) - toNumber(combatant.necrotic));
}

function setInlineAdjustment(id, field, value) {
  const current = getInlineAdjustment(id);
  state.inlineAdjustments[id] = {
    ...current,
    [field]: value
  };
}

function getInlineAdjustment(id) {
  if (!state.inlineAdjustments[id]) {
    state.inlineAdjustments[id] = { ...blankInlineAdjustments };
  }

  return state.inlineAdjustments[id];
}

function getDexModifier(stats) {
  return getAbilityModifier(parseStats(stats).DEX ?? 10);
}

function getNormalizedValue(column, rawValue, normalize) {
  if (!normalize) {
    return rawValue;
  }

  if (column?.key === "stats") {
    return formatStatsWithModifiers(rawValue);
  }

  if (column?.type === "number") {
    return normalizeNumberInput(rawValue);
  }

  return rawValue;
}

function normalizeNumberInput(value) {
  if (value === "") {
    return "";
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatStatsWithModifiers(stats) {
  return formatStatsFromObject(parseStats(stats));
}

function parseStats(stats) {
  const values = Object.fromEntries(statKeys.map((ability) => [ability, 10]));
  const matches = String(stats).matchAll(/\b(STR|DEX|CON|INT|WIS|CHA)\s+(-?\d+)\b/gi);

  for (const match of matches) {
    values[match[1].toUpperCase()] = Number(match[2]);
  }

  return values;
}

function formatStatsFromObject(values) {
  return statKeys
    .map((ability) => `${ability} ${values[ability]} (${formatModifier(getAbilityModifier(values[ability]))})`)
    .join(" ");
}

function getAbilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function formatModifier(modifier) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function mapTagToSide(tag) {
  if (tag === "ALIADO") {
    return "allies";
  }

  if (tag === "ENEMIGO") {
    return "enemies";
  }

  return "neutral";
}

function mapSideToTag(side) {
  if (side === "allies") {
    return "ALIADO";
  }

  if (side === "enemies") {
    return "ENEMIGO";
  }

  return "NEUTRAL";
}

async function loadBestiary() {
  state.bestiaryStatus = "loading";
  state.bestiaryMessage = "";
  render();

  try {
    const response = await fetch(BESTIARY_CSV_PATH, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`No se pudo leer ${BESTIARY_CSV_PATH} (${response.status}).`);
    }

    const text = await response.text();
    const rows = parseCsv(text);

    state.bestiary = rows.map((row, index) => normalizeBestiaryEntry(row, index));
    state.bestiaryStatus = "ready";
    state.bestiarySelectedId = state.bestiary[0]?.id ?? "";
    render();
  } catch (error) {
    state.bestiaryStatus = "error";
    state.bestiaryMessage = error instanceof Error ? error.message : `No se pudo cargar ${BESTIARY_CSV_PATH}.`;
    render();
  }
}

function parseCsv(csvText) {
  const rows = [];
  const currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentField);

      if (currentRow.some((value) => value !== "")) {
        rows.push([...currentRow]);
      }

      currentRow.length = 0;
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);

  if (currentRow.some((value) => value !== "")) {
    rows.push([...currentRow]);
  }

  const [headers = [], ...dataRows] = rows;

  return dataRows.map((values) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record;
  });
}

function normalizeBestiaryEntry(row, index) {
  const name = cleanText(row.Name);
  const source = cleanText(row.Source);
  const page = cleanText(row.Page);
  const size = cleanText(row.Size);
  const type = cleanText(row.Type);
  const alignment = cleanText(row.Alignment);
  const ac = cleanText(row.AC);
  const hp = cleanText(row.HP);
  const speed = cleanText(row.Speed);
  const senses = cleanText(row.Senses);
  const languages = cleanText(row.Languages);
  const cr = cleanText(row.CR);
  const environment = cleanText(row.Environment);
  const savingThrows = cleanText(row["Saving Throws"]);
  const skills = cleanText(row.Skills);
  const damageVulnerabilities = cleanText(row["Damage Vulnerabilities"]);
  const damageResistances = cleanText(row["Damage Resistances"]);
  const damageImmunities = cleanText(row["Damage Immunities"]);
  const conditionImmunities = cleanText(row["Condition Immunities"]);
  const traits = cleanText(row.Traits);
  const actions = cleanText(row.Actions);
  const bonusActions = cleanText(row["Bonus Actions"]);
  const reactions = cleanText(row.Reactions);
  const legendaryActions = cleanText(row["Legendary Actions"]);
  const mythicActions = cleanText(row["Mythic Actions"]);
  const lairActions = cleanText(row["Lair Actions"]);
  const regionalEffects = cleanText(row["Regional Effects"]);
  const treasure = cleanText(row.Treasure);
  const abilities = {
    STR: toNumber(row.Strength),
    DEX: toNumber(row.Dexterity),
    CON: toNumber(row.Constitution),
    INT: toNumber(row.Intelligence),
    WIS: toNumber(row.Wisdom),
    CHA: toNumber(row.Charisma)
  };
  const environmentTokens = splitList(environment);
  const typeLine = [size, type, alignment].filter(Boolean).join(" | ");
  const sourceLabel = page ? `${source} p.${page}` : source || "Sin fuente";
  const crLabel = cr || "Sin CR";
  const searchText = [
    name,
    source,
    type,
    alignment,
    senses,
    languages,
    cr,
    environment,
    traits,
    actions,
    bonusActions,
    reactions,
    legendaryActions,
    mythicActions,
    lairActions,
    regionalEffects
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: `bestiary-${index + 1}`,
    name,
    source,
    page,
    size,
    type,
    alignment,
    ac,
    hp,
    speed,
    abilities,
    savingThrows,
    skills,
    damageVulnerabilities,
    damageResistances,
    damageImmunities,
    conditionImmunities,
    senses,
    languages,
    cr,
    traits,
    actions,
    bonusActions,
    reactions,
    legendaryActions,
    mythicActions,
    lairActions,
    regionalEffects,
    environment,
    treasure,
    environmentTokens,
    typeLine: typeLine || "Ficha sin clasificacion",
    sourceLabel,
    crLabel,
    crValue: parseCrValue(cr),
    acValue: parseLeadingNumber(ac),
    hpValue: parseLeadingNumber(hp),
    environmentShort: environmentTokens.slice(0, 2).join(", "),
    searchText
  };
}

function renderBestiaryFilterOptions(key) {
  const values = [...new Set(
    state.bestiary.flatMap((entry) => {
      if (key === "environment") {
        return entry.environmentTokens;
      }

      return [entry[key]];
    }).filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));

  return [
    `<option value="">Todas las ${bestiaryFilterLabels[key]}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}" ${value === state.bestiaryFilters[key] ? "selected" : ""}>${escapeHtml(value)}</option>`)
  ].join("");
}

function getBestiaryStatusLabel() {
  if (state.bestiaryStatus === "loading") {
    return "Cargando CSV";
  }

  if (state.bestiaryStatus === "error") {
    return "Error de lectura";
  }

  return `CSV activo: ${BESTIARY_CSV_PATH}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim();
}

function splitList(value) {
  return cleanText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLeadingNumber(value) {
  const match = String(value).match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function parseCrValue(value) {
  const match = String(value).match(/^\s*(\d+)\s*\/\s*(\d+)|^\s*(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  if (match[1] && match[2]) {
    return Number(match[1]) / Number(match[2]);
  }

  return Number(match[3]);
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function randomD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
