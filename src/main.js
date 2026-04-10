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
  { key: "nombre", label: "Nombre", type: "text", width: "15rem" },
  { key: "numPeana", label: "Num peana", type: "text", width: "9rem" },
  { key: "pgMax", label: "PG max", type: "number", width: "8rem" },
  { key: "pgAct", label: "PG act", type: "number", width: "8rem" },
  { key: "heridas", label: "Heridas", type: "number", width: "8rem" },
  { key: "necrotic", label: "Necrotic", type: "number", width: "8rem" },
  { key: "ca", label: "CA", type: "number", width: "7rem" },
  { key: "condiciones", label: "Condiciones", type: "text", width: "13rem" },
  { key: "stats", label: "Stats", type: "text", width: "26rem" },
  { key: "tamano", label: "Tamano", type: "text", width: "9rem" },
  { key: "movimiento", label: "Movimiento", type: "text", width: "10rem" },
  { key: "vision", label: "Vision", type: "text", width: "12rem" },
  { key: "lenguas", label: "Lenguas", type: "text", width: "14rem" },
  { key: "crExp", label: "CR/EXP", type: "text", width: "10rem" },
  { key: "tag", label: "Tag", type: "text", width: "9rem" }
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
    pgAct: 31,
    heridas: 11,
    necrotic: 0,
    ca: 18,
    condiciones: "Concentrando",
    stats: "STR 10 (+0) DEX 14 (+2) CON 13 (+1) INT 12 (+1) WIS 18 (+4) CHA 16 (+3)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Comun, Celestial",
    crExp: "PJ Nv 5",
    tag: "Cleric",
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
    pgAct: 44,
    heridas: 14,
    necrotic: 0,
    ca: 17,
    condiciones: "Inspirado",
    stats: "STR 18 (+4) DEX 12 (+1) CON 16 (+3) INT 9 (-1) WIS 11 (+0) CHA 10 (+0)",
    tamano: "Mediano",
    movimiento: "25 ft",
    vision: "Normal",
    lenguas: "Comun, Enano",
    crExp: "PJ Nv 5",
    tag: "Fighter",
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
    pgAct: 24,
    heridas: 12,
    necrotic: 0,
    ca: 13,
    condiciones: "Amenazado",
    stats: "STR 13 (+1) DEX 15 (+2) CON 10 (+0) INT 7 (-2) WIS 10 (+0) CHA 6 (-2)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Common",
    crExp: "CR 2 / 450",
    tag: "Undead",
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
    heridas: 27,
    necrotic: 4,
    ca: 12,
    condiciones: "Inconsciente",
    stats: "STR 9 (-1) DEX 12 (+1) CON 10 (+0) INT 11 (+0) WIS 14 (+2) CHA 13 (+1)",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Normal",
    lenguas: "Comun, Abisal",
    crExp: "CR 1 / 200",
    tag: "Caster",
    initiativeRoll: 6,
    initiativeNat20: false
  }
];

const blankFilters = Object.fromEntries(columns.map((column) => [column.key, ""]));
const app = document.querySelector("#app");

const state = {
  activeScreen: "combat-tracker",
  combatants: initialCombatants,
  filters: { ...blankFilters },
  sort: { key: "iniactiva", direction: "desc" },
  activeFilterKey: "",
  selectedIds: new Set(),
  newEntitySide: "allies",
  nextId: initialCombatants.length + 1
};

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);

render();

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

  if (target.matches("[data-edit-id][data-edit-key]")) {
    updateCombatantField(target.dataset.editId, target.dataset.editKey, target.value, false);
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
            <span aria-hidden="true">↑↓</span>
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
            <span aria-hidden="true">⌕</span>
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
  return `
    <tr class="row--${combatant.side} ${state.selectedIds.has(combatant.id) ? "row--selected" : ""}">
      <td class="cell-select">
        <input
          type="checkbox"
          data-select-row="${combatant.id}"
          aria-label="Seleccionar ${escapeHtml(combatant.nombre || combatant.id)}"
          ${state.selectedIds.has(combatant.id) ? "checked" : ""}
        />
      </td>
      ${columns.map((column) => renderDataCell(combatant, column)).join("")}
    </tr>
  `;
}

function renderDataCell(combatant, column) {
  const value = combatant[column.key] ?? "";
  const isInitiativeNat20 = column.key === "iniactiva" && combatant.initiativeNat20;
  const inputMode = column.type === "number" ? "numeric" : "text";

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

  return `
    <td>
      <input
        class="cell-input ${column.key === "nombre" ? "cell-input--strong" : ""} ${column.key === "stats" ? "cell-input--stats" : ""}"
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

function getVisibleCombatants() {
  return [...state.combatants]
    .filter(matchesFilters)
    .sort(compareCombatants);
}

function matchesFilters(combatant) {
  return columns.every((column) => {
    const filterValue = state.filters[column.key].trim().toLowerCase();

    if (!filterValue) {
      return true;
    }

    return String(combatant[column.key] ?? "").toLowerCase().includes(filterValue);
  });
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
    return (toNumber(leftValue) - toNumber(rightValue)) * multiplier;
  }

  return String(leftValue ?? "")
    .localeCompare(String(rightValue ?? ""), "es", { numeric: true, sensitivity: "base" }) * multiplier;
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

    if (key === "iniactiva") {
      updatedCombatant.initiativeNat20 = false;
      updatedCombatant.initiativeRoll = null;
    }

    return updatedCombatant;
  });
}

function addEntity() {
  state.combatants = [
    {
      id: `entity-${state.nextId}`,
      side: state.newEntitySide,
      ubicacion: "",
      iniactiva: "",
      nombre: state.newEntitySide === "allies" ? "Nueva entidad aliada" : "Nueva entidad enemiga",
      numPeana: "",
      pgMax: 0,
      pgAct: 0,
      heridas: 0,
      necrotic: 0,
      ca: 10,
      condiciones: "",
      stats: formatStatsWithModifiers("STR 10 DEX 10 CON 10 INT 10 WIS 10 CHA 10"),
      tamano: "Mediano",
      movimiento: "30 ft",
      vision: "",
      lenguas: "",
      crExp: "",
      tag: state.newEntitySide === "allies" ? "Ally" : "Enemy",
      initiativeRoll: null,
      initiativeNat20: false
    },
    ...state.combatants
  ];

  state.nextId += 1;
}

function deleteSelected() {
  if (state.selectedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.filter((combatant) => !state.selectedIds.has(combatant.id));
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

function getDexModifier(stats) {
  const match = String(stats).match(/\bDEX\s+(-?\d+)\b/i);
  const score = match ? Number(match[1]) : 10;

  return getAbilityModifier(score);
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
  const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const values = Object.fromEntries(abilities.map((ability) => [ability, 10]));
  const matches = String(stats).matchAll(/\b(STR|DEX|CON|INT|WIS|CHA)\s+(-?\d+)\b/gi);

  for (const match of matches) {
    values[match[1].toUpperCase()] = Number(match[2]);
  }

  return abilities
    .map((ability) => `${ability} ${values[ability]} (${formatModifier(getAbilityModifier(values[ability]))})`)
    .join(" ");
}

function getAbilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function formatModifier(modifier) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
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
