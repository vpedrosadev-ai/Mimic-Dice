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
const app = document.querySelector("#app");
const statKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
let battleTimerInterval = null;

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
  battleTimer: {
    elapsedMs: 0,
    startedAt: 0,
    isRunning: false
  }
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

  if (action === "start-battle-timer") {
    startBattleTimer();
    render();
    return;
  }

  if (action === "pause-battle-timer") {
    pauseBattleTimer();
    render();
    return;
  }

  if (action === "reset-battle-timer") {
    resetBattleTimer();
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
  const battleTimerLabel = formatBattleTimer(getBattleTimerElapsedMs());

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
        <article class="summary-card summary-card--timer">
          <span>Contador de batalla</span>
          <strong>${battleTimerLabel}</strong>
          <div class="summary-card__actions">
            <button
              class="summary-button"
              type="button"
              data-action="${state.battleTimer.isRunning ? "pause-battle-timer" : "start-battle-timer"}"
            >
              ${state.battleTimer.isRunning ? "Pausar" : "Iniciar"}
            </button>
            <button class="summary-button summary-button--ghost" type="button" data-action="reset-battle-timer">
              Reiniciar
            </button>
          </div>
        </article>
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
              placeholder="Daño en area"
              value="${escapeHtml(state.areaDamage)}"
              data-area-damage
              aria-label="Puntos de daño en área"
            />
            <button
              class="toolbar-button toolbar-button--area"
              type="button"
              data-action="apply-area-damage"
              ${state.selectedIds.size === 0 ? "disabled" : ""}
              aria-label="Aplicar daño en area"
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
          ${isDead ? `<span class="death-badge">☠ Muerto</span>` : ""}
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
                <span class="mini-action__icon" aria-hidden="true">✹</span>
              </button>
              <button
                class="mini-action mini-action--heal"
                type="button"
                data-action="adjust-pg-act"
                data-id="${combatant.id}"
                data-mode="heal"
                aria-label="Sumar puntos de golpe a ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">✚</span>
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
                aria-label="Ajustar dano necrotico de ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">☣</span>
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

    const value = column.key === "pgMax"
      ? `${combatant.pgMax} ${getEffectivePgMax(combatant)}`
      : combatant[column.key] ?? "";

    return String(value).toLowerCase().includes(filterValue);
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
    const first = column.key === "pgMax" ? getEffectivePgMax(left) : toNumber(leftValue);
    const second = column.key === "pgMax" ? getEffectivePgMax(right) : toNumber(rightValue);
    return (first - second) * multiplier;
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

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function randomD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function startBattleTimer() {
  if (state.battleTimer.isRunning) {
    return;
  }

  state.battleTimer.startedAt = Date.now();
  state.battleTimer.isRunning = true;
  ensureBattleTimerInterval();
}

function pauseBattleTimer() {
  if (!state.battleTimer.isRunning) {
    return;
  }

  state.battleTimer.elapsedMs = getBattleTimerElapsedMs();
  state.battleTimer.startedAt = 0;
  state.battleTimer.isRunning = false;
  stopBattleTimerInterval();
}

function resetBattleTimer() {
  state.battleTimer.elapsedMs = 0;
  state.battleTimer.startedAt = state.battleTimer.isRunning ? Date.now() : 0;

  if (!state.battleTimer.isRunning) {
    stopBattleTimerInterval();
  }
}

function getBattleTimerElapsedMs() {
  if (!state.battleTimer.isRunning) {
    return state.battleTimer.elapsedMs;
  }

  return state.battleTimer.elapsedMs + (Date.now() - state.battleTimer.startedAt);
}

function formatBattleTimer(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ensureBattleTimerInterval() {
  if (battleTimerInterval !== null) {
    return;
  }

  battleTimerInterval = window.setInterval(() => {
    if (!state.battleTimer.isRunning) {
      stopBattleTimerInterval();
      return;
    }

    render();
  }, 1000);
}

function stopBattleTimerInterval() {
  if (battleTimerInterval === null) {
    return;
  }

  window.clearInterval(battleTimerInterval);
  battleTimerInterval = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
