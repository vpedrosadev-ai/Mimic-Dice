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

const combatColumns = [
  "Ubicacion",
  "Inactiva",
  "Nombre",
  "Num peana",
  "PG max",
  "PG act",
  "Heridas",
  "Necrotic",
  "CA",
  "Condiciones",
  "Stats",
  "Tamano",
  "Movimiento",
  "Vision",
  "Lenguas",
  "CR/EXP",
  "Tag"
];

const combatants = [
  {
    side: "allies",
    ubicacion: "A2",
    inactiva: "No",
    nombre: "Seraphina Vale",
    numPeana: "P-01",
    pgMax: 42,
    pgAct: 31,
    heridas: 11,
    necrotic: 0,
    ca: 18,
    condiciones: "Concentrando",
    stats: "STR 10 DEX 14 CON 13 INT 12 WIS 18 CHA 16",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Comun, Celestial",
    crExp: "PJ Nv 5",
    tag: "Cleric"
  },
  {
    side: "allies",
    ubicacion: "B4",
    inactiva: "No",
    nombre: "Thoren Ashbrand",
    numPeana: "P-02",
    pgMax: 58,
    pgAct: 44,
    heridas: 14,
    necrotic: 0,
    ca: 17,
    condiciones: "Inspirado",
    stats: "STR 18 DEX 12 CON 16 INT 9 WIS 11 CHA 10",
    tamano: "Mediano",
    movimiento: "25 ft",
    vision: "Normal",
    lenguas: "Comun, Enano",
    crExp: "PJ Nv 5",
    tag: "Fighter"
  },
  {
    side: "enemies",
    ubicacion: "F6",
    inactiva: "No",
    nombre: "Ghoul Packleader",
    numPeana: "E-01",
    pgMax: 36,
    pgAct: 24,
    heridas: 12,
    necrotic: 0,
    ca: 13,
    condiciones: "Amenazado",
    stats: "STR 13 DEX 15 CON 10 INT 7 WIS 10 CHA 6",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Darkvision 60 ft",
    lenguas: "Common",
    crExp: "CR 2 / 450",
    tag: "Undead"
  },
  {
    side: "enemies",
    ubicacion: "G7",
    inactiva: "Si",
    nombre: "Cult Adept",
    numPeana: "E-02",
    pgMax: 27,
    pgAct: 0,
    heridas: 27,
    necrotic: 4,
    ca: 12,
    condiciones: "Inconsciente",
    stats: "STR 9 DEX 12 CON 10 INT 11 WIS 14 CHA 13",
    tamano: "Mediano",
    movimiento: "30 ft",
    vision: "Normal",
    lenguas: "Comun, Abisal",
    crExp: "CR 1 / 200",
    tag: "Caster"
  }
];

const summaries = [
  { label: "Aliados", value: combatants.filter((entry) => entry.side === "allies").length },
  { label: "Enemigos", value: combatants.filter((entry) => entry.side === "enemies").length },
  { label: "Activos", value: combatants.filter((entry) => entry.inactiva === "No").length },
  {
    label: "PG totales",
    value: combatants.reduce((total, entry) => total + Number(entry.pgAct), 0)
  }
];

const app = document.querySelector("#app");
let activeScreen = "combat-tracker";

function render() {
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
          ${screens
            .map(
              (screen) => `
                <button
                  class="nav__button ${screen.id === activeScreen ? "is-active" : ""}"
                  type="button"
                  data-screen="${screen.id}"
                  aria-pressed="${screen.id === activeScreen}"
                  title="${screen.label}"
                >
                  <span class="nav__icon">${screen.icon}</span>
                  <span class="nav__label">${screen.shortLabel}</span>
                </button>
              `
            )
            .join("")}
        </nav>
      </header>

      <main class="workspace">
        ${renderScreen()}
      </main>
    </div>
  `;

  app.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      activeScreen = button.dataset.screen;
      render();
    });
  });
}

function renderScreen() {
  if (activeScreen === "combat-tracker") {
    return renderCombatTracker();
  }

  if (activeScreen === "initiative-board") {
    return renderPlaceholderScreen(
      "Initiative Board",
      "Aqui podemos construir el flujo de turnos, rondas, ready actions y recordatorios del combate."
    );
  }

  return renderPlaceholderScreen(
    "Session Vault",
    "Esta pantalla puede agrupar criaturas guardadas, encuentros preparados, notas de sesion y presets de campaña."
  );
}

function renderCombatTracker() {
  return `
    <section class="panel panel--hero">
      <div class="panel__copy">
        <p class="eyebrow">Pantalla 1</p>
        <h2>Combat Tracker</h2>
        <p class="lead">
          Vista principal para controlar aliados y enemigos durante el encuentro, con foco en estado,
          posicion y referencias rapidas de cada entidad.
        </p>
      </div>
      <div class="summary-grid">
        ${summaries
          .map(
            (item) => `
              <article class="summary-card">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </article>
            `
          )
          .join("")}
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
          <span>Terreno dificil activo</span>
        </div>
      </div>

      <div class="table-wrap" role="region" aria-label="Combat tracker" tabindex="0">
        <table class="combat-table">
          <thead>
            <tr>
              ${combatColumns.map((column) => `<th scope="col">${column}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${combatants
              .map(
                (entry) => `
                  <tr class="row--${entry.side}">
                    <td>${entry.ubicacion}</td>
                    <td><span class="chip ${entry.inactiva === "Si" ? "chip--muted" : "chip--ok"}">${entry.inactiva}</span></td>
                    <td class="cell-name">
                      <strong>${entry.nombre}</strong>
                      <span>${entry.side === "allies" ? "Aliado" : "Enemigo"}</span>
                    </td>
                    <td>${entry.numPeana}</td>
                    <td>${entry.pgMax}</td>
                    <td>${entry.pgAct}</td>
                    <td>${entry.heridas}</td>
                    <td>${entry.necrotic}</td>
                    <td>${entry.ca}</td>
                    <td>${entry.condiciones}</td>
                    <td class="cell-stats">${entry.stats}</td>
                    <td>${entry.tamano}</td>
                    <td>${entry.movimiento}</td>
                    <td>${entry.vision}</td>
                    <td>${entry.lenguas}</td>
                    <td>${entry.crExp}</td>
                    <td><span class="tag-pill">${entry.tag}</span></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
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

render();
