import "./monstersLeague.css";

import appIconUrl from "../../build-resources/icon.png";
import { loadVersionedCompendiumBundle } from "../data/compendiumBundles.js";
import { normalizeBestiaryEntry, normalizeSpellEntry } from "../data/compendiumEntries.js";
import { createCompendiumDetailRenderers } from "../screens/compendiums/detailRender.js";
import { parseBestiarySpellcasting } from "../shared/bestiarySpellcasting.js";
import { createSpellReferenceMatcher } from "../shared/spellReferences.js";
import { cleanText, escapeHtml, normalizeSearchText } from "../shared/text.js";
import { fetchAuthSession } from "../cloud/cloudClient.js";
import {
  connectMonstersLeagueRoom,
  createMonstersLeagueOnlineRoom,
  finalizeMonstersLeagueOnlineRoom
} from "./monstersLeagueClient.js";
import {
  addMonstersLeaguePlayer,
  advanceMonstersLeagueDraft,
  chooseBotBid,
  createMonstersLeagueEncounters,
  createMonstersLeagueRoom,
  getEligibleMonsters,
  getMonstersLeagueMaxBid,
  openRandomMonstersLeagueLot,
  placeMonstersLeagueBid,
  publishMonstersLeagueRoom,
  removeMonstersLeaguePlayer,
  resolveMonstersLeagueLot,
  setMonstersLeagueReady,
  startMonstersLeagueDraft,
  updateMonstersLeagueConfig
} from "./monstersLeagueRules.js";

const app = document.querySelector("#app");
const params = new URLSearchParams(window.location.search);
const language = params.get("language") === "en" ? "en" : "es";
const localTestMode = params.get("mode") !== "online";
const usesFileProtocol = window.location.protocol === "file:";
const hostNameFromQuery = cleanText(params.get("host"));
const ROOM_STORAGE_KEY = "mimic-dice:monsters-league:test-room:v1";
const IMPORT_STORAGE_KEY = "mimic-dice:monsters-league-import:v1";

const UI = {
  es: {
    loading: "Preparando Monsters League",
    loadingHelp: "Cargando criaturas, imágenes y grimorios.",
    setup: "Configurar lobby",
    lobby: "Lobby",
    auction: "Subasta",
    team: "Mis monstruos",
    gold: "Oro",
    slots: "Huecos",
    ready: "Listo",
    waiting: "Esperando",
    bot: "BOT",
    host: "HOST",
    nominate: "Nominar",
    bid: "Pujar",
    bidNow: "Pujar ahora",
    currentBid: "Puja actual",
    maxBid: "Puja máxima",
    seconds: "segundos",
    teamOf: "Equipo de",
    noSpells: "Esta criatura no tiene un bloque de lanzamiento de hechizos reconocido.",
    spellbook: "Hechizos",
    metric_speed: "Velocidad",
    metric_senses: "Sentidos",
    metric_languages: "Idiomas",
    chip_environment: "Entorno",
    chip_skills: "Habilidades",
    chip_saving_throws: "Salvaciones",
    chip_damage_vulnerabilities: "Vulnerabilidades",
    chip_damage_resistances: "Resistencias",
    chip_damage_immunities: "Inmunidades al daño",
    chip_condition_immunities: "Inmunidades a estados",
    section_traits: "Rasgos",
    section_actions: "Acciones",
    section_bonus_actions: "Acciones adicionales",
    section_reactions: "Reacciones",
    section_legendary_actions: "Acciones legendarias",
    section_mythic_actions: "Acciones míticas",
    section_lair_actions: "Acciones de guarida",
    section_regional_effects: "Efectos regionales",
    bestiary_selected_sheet: "Ficha de criatura",
    bestiary_empty_detail: "Selecciona una criatura.",
    spell_selected: "Hechizo",
    arcanum_casting_time: "Tiempo de lanzamiento",
    arcanum_duration: "Duración",
    arcanum_range: "Alcance",
    arcanum_components: "Componentes",
    arcanum_text: "Descripción",
    arcanum_classes: "Clases",
    arcanum_subclasses: "Subclases",
    arcanum_empty_detail: "Selecciona un hechizo."
  },
  en: {
    loading: "Preparing Monsters League",
    loadingHelp: "Loading creatures, artwork, and spellbooks.",
    setup: "Configure lobby",
    lobby: "Lobby",
    auction: "Auction",
    team: "My monsters",
    gold: "Gold",
    slots: "Slots",
    ready: "Ready",
    waiting: "Waiting",
    bot: "BOT",
    host: "HOST",
    nominate: "Nominate",
    bid: "Bid",
    bidNow: "Bid now",
    currentBid: "Current bid",
    maxBid: "Maximum bid",
    seconds: "seconds",
    teamOf: "Team of",
    noSpells: "This creature has no recognized spellcasting block.",
    spellbook: "Spells",
    metric_speed: "Speed",
    metric_senses: "Senses",
    metric_languages: "Languages",
    chip_environment: "Environment",
    chip_skills: "Skills",
    chip_saving_throws: "Saving throws",
    chip_damage_vulnerabilities: "Vulnerabilities",
    chip_damage_resistances: "Resistances",
    chip_damage_immunities: "Damage immunities",
    chip_condition_immunities: "Condition immunities",
    section_traits: "Traits",
    section_actions: "Actions",
    section_bonus_actions: "Bonus actions",
    section_reactions: "Reactions",
    section_legendary_actions: "Legendary actions",
    section_mythic_actions: "Mythic actions",
    section_lair_actions: "Lair actions",
    section_regional_effects: "Regional effects",
    bestiary_selected_sheet: "Creature sheet",
    bestiary_empty_detail: "Select a creature.",
    spell_selected: "Spell",
    arcanum_casting_time: "Casting time",
    arcanum_duration: "Duration",
    arcanum_range: "Range",
    arcanum_components: "Components",
    arcanum_text: "Description",
    arcanum_classes: "Classes",
    arcanum_subclasses: "Subclasses",
    arcanum_empty_detail: "Select a spell."
  }
};

const state = {
  loading: true,
  loadError: "",
  session: null,
  room: null,
  catalog: [],
  catalogById: new Map(),
  spells: [],
  spellMatcher: createSpellReferenceMatcher([]),
  hostPlayerId: "local-host",
  search: "",
  selectedTeamPlayerId: "",
  selectedMonsterId: "",
  selectedSpellId: "",
  error: "",
  notice: "",
  draftView: "auction",
  testCombat: {},
  nextBotDecisionAt: 0,
  botNominationPending: false,
  encountersSent: false,
  cloudCampaignSaveStatus: "idle",
  cloudCampaignSavePromise: null,
  cloudCampaignResult: null,
  campaignActivationSent: false,
  connection: null,
  connectionStatus: localTestMode ? "local" : "connecting",
  draftFlash: null,
  draftFlashTimer: 0,
  draftObservation: null,
  lastCountdownBeep: "",
  audioContext: null
};

const t = (key) => UI[language]?.[key] ?? UI.es[key] ?? key;
const detailRenderers = createCompendiumDetailRenderers({
  t,
  getArcanumSpellLinkData: () => state.spellMatcher,
  getItemAttunementLabel: () => "",
  getItemSourceDescription: () => "",
  isItemTypeTokenFilterActive: () => false
});

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);
app.addEventListener("submit", handleSubmit);
app.addEventListener("error", handleImageError, true);
window.addEventListener("beforeunload", () => {
  persistTestRoom();
  state.connection?.close();
});

initialize();

async function initialize() {
  renderLoading();

  try {
    const [session, bestiaryBundle, imageResponse, arcanumBundle] = await Promise.all([
      fetchAuthSession().catch(() => null),
      loadVersionedCompendiumBundle("bestiary", language),
      fetch(usesFileProtocol ? "data/BestiaryImages.json" : "/data/BestiaryImages.json", { cache: "force-cache" }),
      loadVersionedCompendiumBundle("arcanum", language)
    ]);
    const imageMap = imageResponse.ok ? await imageResponse.json() : {};

    if (!bestiaryBundle?.rows?.length) {
      throw new Error(language === "en" ? "Bestiary could not be loaded." : "No se pudo cargar el bestiario.");
    }

    state.session = session;
    state.catalog = bestiaryBundle.rows
      .map((row, index) => normalizeBestiaryEntry(row, index, imageMap))
      .map(prepareMonsterAssetUrls)
      .filter((entry) => entry.id && entry.name);
    state.catalogById = new Map(state.catalog.map((entry) => [entry.id, entry]));
    state.spells = (arcanumBundle?.rows || []).map((row, index) => normalizeSpellEntry(row, index));
    state.spellMatcher = createSpellReferenceMatcher(state.spells);

    const user = session?.user || {};
    const hostName = hostNameFromQuery || cleanText(user.name) || cleanText(user.email) || (language === "en" ? "Host" : "Anfitrión");
    state.hostPlayerId = cleanText(user.id) || "local-host";
    if (!localTestMode) {
      if (!cleanText(user.id)) {
        throw new Error(language === "en" ? "Sign in to join Monsters League." : "Inicia sesión para acceder a Monsters League.");
      }
      await initializeOnlineRoom(hostName);
    } else {
      state.room = restoreTestRoom() || createMonstersLeagueRoom({
        host: {
          id: state.hostPlayerId,
          userId: cleanText(user.id) || state.hostPlayerId,
          name: hostName
        },
        language,
        config: { name: language === "en" ? "Monster Championship" : "Campeonato de monstruos" }
      });
    }
    state.selectedTeamPlayerId = state.hostPlayerId;
    state.loading = false;
    ensureTestCombatState();
    render();
    window.setInterval(tick, 200);
  } catch (error) {
    state.loading = false;
    state.loadError = error instanceof Error ? error.message : String(error);
    render();
  }
}

async function initializeOnlineRoom(hostName) {
  let roomId = cleanText(params.get("room"));

  if (!roomId) {
    const created = await createMonstersLeagueOnlineRoom({
      name: language === "en" ? "Monster Championship" : "Campeonato de monstruos",
      language
    });
    roomId = cleanText(created?.roomId);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("room", roomId);
    nextUrl.searchParams.set("mode", "online");
    nextUrl.searchParams.set("language", language);
    nextUrl.searchParams.set("host", hostName);
    window.history.replaceState(null, "", nextUrl);
  }

  state.connection = connectMonstersLeagueRoom(roomId, {
    onStatus(status) {
      const wasReconnecting = state.connectionStatus === "reconnecting";
      state.connectionStatus = status;
      if (status === "connected" && wasReconnecting && state.room) {
        state.notice = language === "en" ? "Session recovered." : "Sesión recuperada.";
      }
      if (!state.loading) render();
    },
    onSnapshot(room) {
      const previousStatus = state.room?.status;
      observeDraftEvents(room);
      state.room = room;
      state.loading = false;
      state.loadError = "";
      if (!state.selectedTeamPlayerId || !room.players.some((player) => player.id === state.selectedTeamPlayerId)) {
        state.selectedTeamPlayerId = state.hostPlayerId;
      }
      if (room.status !== previousStatus) {
        state.search = "";
        state.selectedMonsterId = "";
      }
      ensureTestCombatState();
      ensureCloudCampaignSaved();
      if (!state.loading) render();
    },
    onError(error) {
      state.error = error.message;
      if (!state.loading) render();
    }
  });
  state.room = await state.connection.ready;
  if (state.room.language !== language) {
    const localizedUrl = new URL(window.location.href);
    localizedUrl.searchParams.set("language", state.room.language);
    window.location.replace(localizedUrl);
  }
}

function prepareMonsterAssetUrls(entry) {
  return {
    ...entry,
    imageUrl: toRootAssetUrl(entry.imageUrl),
    tokenUrl: toRootAssetUrl(entry.tokenUrl),
    dedupeKey: normalizeSearchText(entry.canonicalName || entry.name),
    sizeFilterKey: toFilterKey(entry.size),
    typeFilterKey: toTypeFilterKey(entry.type)
  };
}

function toRootAssetUrl(value) {
  const url = cleanText(value);

  if (!url || /^(?:https?:|data:|blob:|mimic-assets:)/i.test(url)) {
    return url;
  }

  return `${usesFileProtocol ? "" : "/"}${url.replace(/^\/+/, "")}`;
}

function renderLoading() {
  app.innerHTML = `
    <main class="monsters-league-loading">
      <section>
        <img src="${escapeHtml(appIconUrl)}" alt="" />
        <p>MONSTERS LEAGUE</p>
        <h1>${escapeHtml(t("loading"))}</h1>
        <span>${escapeHtml(t("loadingHelp"))}</span>
        <i></i>
      </section>
    </main>
  `;
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }

  if (state.loadError) {
    app.innerHTML = `<main class="monsters-league-loading"><section><h1>${escapeHtml(state.loadError)}</h1><button class="ml-button" type="button" onclick="location.reload()">Reintentar</button></section></main>`;
    return;
  }

  const room = state.room;
  const stage = room.status === "configuring"
    ? renderConfiguration()
    : room.status === "waiting"
      ? renderLobby()
      : ["drafting", "reviewing"].includes(room.status)
        ? renderDraft()
        : renderTeamScreen();

  document.documentElement.lang = language;
  document.title = `Monsters League · Mimic Dice`;
  app.innerHTML = `
    <div class="monsters-league-shell">
      <header class="ml-topbar">
        <a class="ml-brand" href="/" aria-label="Mimic Dice">
          <img src="${escapeHtml(appIconUrl)}" alt="" />
          <span><small>MIMIC DICE</small><strong>Monsters League</strong></span>
        </a>
        <div class="ml-stage-line" aria-label="Progreso">
          ${renderStagePill("configuring", t("setup"))}
          ${renderStagePill("waiting", t("lobby"))}
          ${renderStagePill("drafting", t("auction"))}
          ${renderStagePill("complete", t("team"))}
        </div>
        <div class="ml-room-chip ${state.connectionStatus === "reconnecting" ? "is-reconnecting" : ""}"><span></span>${localTestMode ? "Modo prueba" : state.connectionStatus === "reconnecting" ? "Reconectando…" : escapeHtml(room.id)}</div>
      </header>
      ${state.error ? `<div class="ml-toast ml-toast--error" role="alert">${escapeHtml(state.error)}</div>` : ""}
      ${state.notice ? `<div class="ml-toast" role="status">${escapeHtml(state.notice)}</div>` : ""}
      ${stage}
    </div>
    ${renderSpellDialog()}
  `;
  persistTestRoom();
}

function renderStagePill(status, label) {
  const order = ["configuring", "waiting", "drafting", "complete"];
  const currentStatus = state.room.status === "combat"
    ? "complete"
    : state.room.status === "reviewing" ? "drafting" : state.room.status;
  const currentIndex = order.indexOf(currentStatus);
  const index = order.indexOf(status);
  return `<span class="${index === currentIndex ? "is-active" : index < currentIndex ? "is-complete" : ""}"><i>${index + 1}</i>${escapeHtml(label)}</span>`;
}

function renderConfiguration() {
  const config = state.room.config;
  const eligibleCount = getEligibleMonsters(state.catalog, config).length;
  const sizeOptions = getCreatureFilterOptions("size");
  const typeOptions = getCreatureFilterOptions("type");

  return `
    <main class="ml-page ml-config-page">
      <section class="ml-hero-card">
        <div class="ml-hero-card__copy">
          <p class="ml-eyebrow">DRAFT DE CRIATURAS · ${config.startingGold} PO</p>
          <h1>${language === "en" ? "Build a monster team. Win every bid." : "Forma un equipo monstruoso. Gana cada puja."}</h1>
          <p>${language === "en" ? "Configure the league, invite players or add bots, then auction every roster slot." : "Configura la liga, invita jugadores o añade bots y subasta cada hueco del equipo."}</p>
        </div>
        <div class="ml-hero-card__seal" aria-hidden="true"><span>ML</span><i>${config.startingGold}</i><small>ORO</small></div>
      </section>
      <div class="ml-config-layout">
        <form class="ml-panel ml-config-form" data-ml-config-form>
          <div class="ml-panel-heading"><div><p class="ml-eyebrow">01 · REGLAS</p><h2>Configuración del lobby</h2></div><span class="ml-language-badge">${language === "en" ? "English" : "Español"}</span></div>
          <div class="ml-form-grid">
            <label class="ml-field ml-field--wide"><span>Nombre de la liga</span><input name="name" maxlength="80" value="${escapeHtml(config.name)}" /></label>
            <label class="ml-field"><span>Máximo de jugadores</span><input name="maxPlayers" type="number" min="2" max="8" value="${config.maxPlayers}" /></label>
            <label class="ml-field"><span>Criaturas por equipo</span><input name="teamSize" type="number" min="1" max="8" value="${config.teamSize}" /></label>
            <label class="ml-field"><span>Oro inicial</span><input name="startingGold" type="number" min="${config.teamSize}" max="10000" value="${config.startingGold}" /></label>
            <label class="ml-field"><span>CR mínimo</span><input name="crMin" type="number" min="0" max="30" step="0.125" value="${config.crMin}" /></label>
            <label class="ml-field"><span>CR máximo</span><input name="crMax" type="number" min="0" max="30" step="0.125" value="${config.crMax}" /></label>
            <label class="ml-field"><span>Tiempo de puja</span><select name="bidSeconds">${renderTimeOptions(config.bidSeconds)}</select></label>
          </div>
          <div class="ml-exclusion-grid">
            ${renderExclusionGroup("excludedSizes", language === "en" ? "Exclude creature sizes" : "Excluir tamaños", sizeOptions, config.excludedSizes)}
            ${renderExclusionGroup("excludedTypes", language === "en" ? "Exclude creature types" : "Excluir tipos de criatura", typeOptions, config.excludedTypes)}
          </div>
          <div class="ml-config-summary">
            <article><span>Catálogo elegible</span><strong>${eligibleCount.toLocaleString(language)}</strong><small>criaturas únicas</small></article>
            <article><span>Oro inicial</span><strong>${config.startingGold}</strong><small>por jugador</small></article>
            <article><span>Lotes previstos</span><strong>${state.room.players.length * config.teamSize}</strong><small>con participantes actuales</small></article>
          </div>
          <div class="ml-form-actions">
            <button class="ml-button ml-button--primary" type="submit">Publicar lobby</button>
          </div>
        </form>
        <aside class="ml-panel ml-roster-setup">
          <div class="ml-panel-heading"><div><p class="ml-eyebrow">02 · PARTICIPANTES</p><h2>Asientos</h2></div><strong>${state.room.players.length}/${config.maxPlayers}</strong></div>
          <div class="ml-player-list">${state.room.players.map(renderLobbyPlayer).join("")}</div>
          <button class="ml-button ml-button--bot" type="button" data-ml-action="add-bot" ${state.room.players.length >= config.maxPlayers ? "disabled" : ""}><span>＋</span>Añadir bot de prueba</button>
          <p class="ml-helper">Los bots pujan y completan su equipo automáticamente. Las criaturas se eligen al azar. Puedes probar el flujo sin abrir otra sesión.</p>
        </aside>
      </div>
    </main>
  `;
}

function renderTimeOptions(selected) {
  return [5, 10, 15, 20, 30, 45, 60].map((seconds) => `<option value="${seconds}" ${seconds === selected ? "selected" : ""}>${seconds} ${t("seconds")}</option>`).join("");
}

function renderExclusionGroup(name, label, options, selectedValues = []) {
  const selected = new Set(Array.isArray(selectedValues) ? selectedValues : []);
  return `
    <fieldset class="ml-exclusion-group">
      <legend>${escapeHtml(label)}</legend>
      <div>${options.map((option) => `
        <label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(option.key)}" ${selected.has(option.key) ? "checked" : ""} /><span>${escapeHtml(option.label)}</span></label>
      `).join("")}</div>
    </fieldset>
  `;
}

function getCreatureFilterOptions(kind) {
  const options = new Map();
  for (const monster of state.catalog) {
    const rawLabel = cleanText(kind === "size" ? monster.size : monster.type).split(/[,(\[]/, 1)[0];
    const key = kind === "size" ? toFilterKey(monster.size) : toTypeFilterKey(monster.type);
    if (key && rawLabel && !options.has(key)) options.set(key, rawLabel);
  }
  return [...options.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((left, right) => left.label.localeCompare(right.label, language));
}

function formatExcludedCreatureFilters(config) {
  const labels = [
    ...getSelectedFilterLabels("size", config.excludedSizes),
    ...getSelectedFilterLabels("type", config.excludedTypes)
  ];
  return labels.length ? labels.join(", ") : (language === "en" ? "None" : "Ninguna");
}

function getSelectedFilterLabels(kind, selectedValues) {
  const labels = new Map(getCreatureFilterOptions(kind).map((option) => [option.key, option.label]));
  return (Array.isArray(selectedValues) ? selectedValues : []).map((key) => labels.get(key) || key.replace(/-/g, " "));
}

function renderLobby() {
  const room = state.room;
  const allReady = room.players.length >= 2 && room.players.every((player) => player.ready);
  const currentPlayer = room.players.find((player) => player.id === state.hostPlayerId);
  const isHost = room.hostPlayerId === state.hostPlayerId;
  const inviteUrl = localTestMode ? "" : createMonstersLeagueUrl({ roomId: room.id, mode: "online", roomLanguage: room.language });

  return `
    <main class="ml-page ml-lobby-page">
      <section class="ml-panel ml-lobby-banner">
        <div><p class="ml-eyebrow">LOBBY PUBLICADO</p><h1>${escapeHtml(room.config.name)}</h1><p>CR ${room.config.crMin}–${room.config.crMax} · ${room.config.teamSize} criaturas · ${room.config.startingGold} oro</p></div>
        ${localTestMode
          ? `<div class="ml-invite-box"><span>MODO DE PRUEBA</span><p>Los bots ocuparán los demás asientos y completarán la subasta automáticamente.</p></div>`
          : `<div class="ml-invite-box"><span>Enlace de invitación</span><div><input readonly value="${escapeHtml(inviteUrl)}" /><button type="button" data-ml-action="copy-link">Copiar</button></div></div>`}
      </section>
      <div class="ml-lobby-grid">
        <section class="ml-panel">
          <div class="ml-panel-heading"><div><p class="ml-eyebrow">PARTICIPANTES</p><h2>Preparados para la subasta</h2></div><strong>${room.players.filter((player) => player.ready).length}/${room.players.length}</strong></div>
          <div class="ml-player-list ml-player-list--large">${room.players.map(renderLobbyPlayer).join("")}</div>
          ${isHost ? `<button class="ml-button ml-button--bot" type="button" data-ml-action="add-bot" ${room.players.length >= room.config.maxPlayers ? "disabled" : ""}><span>＋</span>Añadir bot</button>` : ""}
        </section>
        <aside class="ml-panel ml-lobby-rules">
          <p class="ml-eyebrow">REGLAS DE PARTIDA</p>
          <h2>Todo listo</h2>
          <dl><div><dt>Equipos</dt><dd>${room.config.teamSize} criaturas</dd></div><div><dt>Oro inicial</dt><dd>${room.config.startingGold}</dd></div><div><dt>Rango</dt><dd>CR ${room.config.crMin}–${room.config.crMax}</dd></div><div><dt>Subasta</dt><dd>${room.config.bidSeconds} s</dd></div><div><dt>Idioma</dt><dd>${room.language === "en" ? "English" : "Español"}</dd></div><div><dt>Exclusiones</dt><dd>${escapeHtml(formatExcludedCreatureFilters(room.config))}</dd></div></dl>
          ${isHost
            ? `<button class="ml-button ml-button--primary ml-button--large" type="button" data-ml-action="start-draft" ${allReady ? "" : "disabled"}>Comenzar subasta</button>`
            : `<button class="ml-button ${currentPlayer?.ready ? "" : "ml-button--primary"} ml-button--large" type="button" data-ml-action="toggle-ready">${currentPlayer?.ready ? "Dejar de estar listo" : "Estoy listo"}</button>`}
          ${isHost && !allReady ? `<p class="ml-helper">Necesitas al menos dos participantes y todos deben estar listos.</p>` : ""}
        </aside>
      </div>
    </main>
  `;
}

function renderLobbyPlayer(player) {
  const isHost = player.id === state.room.hostPlayerId;
  const removable = state.room.hostPlayerId === state.hostPlayerId && !isHost && ["configuring", "waiting"].includes(state.room.status);
  return `
    <article class="ml-player-card" style="--team-color:${escapeHtml(player.color)}">
      <span class="ml-player-card__avatar">${escapeHtml(getInitials(player.name))}</span>
      <div><strong>${escapeHtml(player.name)}</strong><small>${player.isBot ? t("bot") : isHost ? t("host") : "PLAYER"}</small></div>
      <span class="ml-ready-state ${player.ready ? "is-ready" : ""}">${player.ready ? t("ready") : t("waiting")}</span>
      ${removable ? `<button class="ml-icon-button" type="button" data-ml-action="remove-player" data-player-id="${escapeHtml(player.id)}" aria-label="Eliminar">×</button>` : ""}
    </article>
  `;
}

function renderDraft() {
  const room = state.room;
  const player = room.players.find((entry) => entry.id === state.hostPlayerId) || room.players[0];
  const lot = room.currentLot;
  const highBidder = lot ? room.players.find((entry) => entry.id === lot.highBidPlayerId) : null;

  if (room.status === "reviewing") {
    return renderLotSummary();
  }

  return `
    <main class="ml-draft-page">
      <aside class="ml-draft-sidebar ml-panel">
        <div class="ml-panel-heading"><div><p class="ml-eyebrow">CLASIFICACIÓN</p><h2>Equipos</h2></div><span>${room.history.length}/${room.players.length * room.config.teamSize}</span></div>
        ${renderLeagueRanking(lot)}
      </aside>
      <section class="ml-auction-stage">
        <div class="ml-auction-stage__heading">
          <div><p class="ml-eyebrow">LOTE ${room.history.length + 1}</p><h1>${lot ? "Subasta en curso" : "Preparando lote aleatorio"}</h1></div>
        </div>
        ${lot ? renderActiveLot(lot, player, highBidder) : renderRandomLotWaiting()}
      </section>
      <aside class="ml-own-team ml-panel">
        <div class="ml-panel-heading"><div><p class="ml-eyebrow">TU EQUIPO</p><h2>${escapeHtml(player.name)}</h2></div><strong>${player.gold} <small>oro</small></strong></div>
        <div class="ml-team-mini-list">${player.roster.length ? player.roster.map((award) => renderMiniMonster(award.monster, award.price)).join("") : `<p class="ml-empty-copy">Todavía no has ganado ninguna criatura.</p>`}</div>
        <div class="ml-budget-footer"><span>${t("maxBid")}</span><strong>${getMonstersLeagueMaxBid(room, player.id)}</strong></div>
      </aside>
    </main>
  `;
}

function renderLeagueRanking(lot = null, large = false) {
  const players = [...state.room.players].sort((left, right) => (
    right.roster.length - left.roster.length || right.gold - left.gold
  ));
  return `<div class="ml-draft-players ${large ? "ml-draft-players--large" : ""}">${players.map((player, index) => renderDraftPlayer(player, lot, index)).join("")}</div>`;
}

function renderDraftPlayer(player, lot, rank = 0) {
  const isHighBidder = lot?.highBidPlayerId === player.id;
  const slots = Array.from({ length: state.room.config.teamSize }, (_, index) => {
    const award = player.roster[index];
    if (!award) return `<i class="ml-roster-slot" aria-label="Hueco libre"></i>`;
    const monster = state.catalogById.get(award.monster.id) || award.monster;
    return `<i class="ml-roster-slot is-filled" title="${escapeHtml(monster.name)}">${renderMonsterImage(monster)}</i>`;
  }).join("");
  return `
    <article class="ml-draft-player ${isHighBidder ? "is-leading" : ""}" style="--team-color:${escapeHtml(player.color)}">
      <span class="ml-draft-player__rank">${rank + 1}</span>
      <div class="ml-draft-player__identity"><strong>${escapeHtml(player.name)}</strong><small>${player.gold} oro</small></div>
      <div class="ml-roster-slots" aria-label="${player.roster.length} de ${state.room.config.teamSize} huecos ocupados">${slots}</div>
    </article>
  `;
}

function renderLotSummary() {
  const room = state.room;
  const result = room.history.at(-1);
  const winner = room.players.find((player) => player.id === result?.winnerPlayerId);
  const monster = state.catalogById.get(result?.monster?.id) || result?.monster;
  const isHost = room.hostPlayerId === state.hostPlayerId;
  const draftFinished = room.players.every((player) => player.roster.length >= room.config.teamSize);

  return `
    <main class="ml-lot-summary-page">
      <section class="ml-lot-summary ml-panel" style="--team-color:${escapeHtml(winner?.color || "#d9ab5d")}">
        <div class="ml-lot-summary__result">
          <figure class="ml-active-lot__portrait ml-lot-summary__portrait">
            ${renderMonsterImage(monster, "eager")}
            ${renderDraftFlash()}
          </figure>
          <div>
            <p class="ml-eyebrow">SUBASTA CERRADA</p>
            <h1>${escapeHtml(monster?.name || "Criatura adjudicada")}</h1>
            <p>Se incorpora al equipo de <strong>${escapeHtml(winner?.name || "—")}</strong> por <b>${result?.price || 0} oro</b>.</p>
            ${result?.automatic ? `<small>Adjudicación automática para completar los equipos.</small>` : ""}
          </div>
        </div>
        <div class="ml-lot-summary__ranking">
          <div class="ml-panel-heading"><div><p class="ml-eyebrow">CLASIFICACIÓN</p><h2>Equipos de la liga</h2></div><span>${room.history.length}/${room.players.length * room.config.teamSize}</span></div>
          ${renderLeagueRanking(null, true)}
        </div>
        <div class="ml-lot-summary__actions">
          ${isHost
            ? `<button class="ml-button ml-button--primary ml-button--large" type="button" data-ml-action="next-lot">${draftFinished ? "Ver equipos" : "Dar paso a la siguiente subasta"}</button>`
            : `<p class="ml-helper">Esperando a que el host dé paso a ${draftFinished ? "los equipos" : "la siguiente subasta"}.</p>`}
        </div>
      </section>
    </main>
  `;
}

function renderActiveLot(lot, player, highBidder) {
  const monster = state.catalogById.get(lot.monster.id) || lot.monster;
  const canBid = player.roster.length < state.room.config.teamSize && lot.highBidPlayerId !== player.id;
  const nextBid = lot.currentBid + 1;
  const maxBid = getMonstersLeagueMaxBid(state.room, player.id);

  return `
    <div class="ml-active-lot">
      <figure class="ml-active-lot__portrait">
        ${renderMonsterImage(monster, "eager")}
        <div class="ml-countdown"><span data-ml-countdown>${formatCountdown(getActiveDeadline())}</span><small>PUJA</small></div>
        <strong class="ml-final-countdown" data-ml-final-countdown aria-live="assertive"></strong>
        ${renderDraftFlash()}
      </figure>
      <div class="ml-active-lot__name"><span>CRIATURA ALEATORIA</span><h2>${escapeHtml(monster.name)}</h2></div>
      <div class="ml-bid-board">
        <div><span>${t("currentBid")}</span><strong>${lot.currentBid}</strong><small>ORO</small></div>
        <p>Lidera <b style="--team-color:${escapeHtml(highBidder?.color || "#d9ab5d")}">${escapeHtml(highBidder?.name || "—")}</b></p>
      </div>
      <form class="ml-bid-controls" data-ml-bid-form>
        <button class="ml-button ml-button--bid" type="button" data-ml-action="quick-bid" data-bid-amount="${nextBid}" ${canBid && nextBid <= maxBid ? "" : "disabled"}>+1</button>
        <button class="ml-button ml-button--bid" type="button" data-ml-action="quick-bid" data-bid-amount="${lot.currentBid + 5}" ${canBid && lot.currentBid + 5 <= maxBid ? "" : "disabled"}>+5</button>
        <label><span>Tu puja</span><input name="bid" type="number" min="${nextBid}" max="${maxBid}" value="${Math.min(maxBid, nextBid)}" /></label>
        <button class="ml-button ml-button--primary" type="submit" ${canBid && nextBid <= maxBid ? "" : "disabled"}>${lot.highBidPlayerId === player.id ? "Vas ganando" : t("bidNow")}</button>
      </form>
    </div>
  `;
}

function renderRandomLotWaiting() {
  return `<div class="ml-waiting-nomination"><i></i><h2>Eligiendo criatura al azar</h2><p>El siguiente lote aparecerá automáticamente.</p></div>`;
}

function renderMiniMonster(monster, price) {
  return `<article class="ml-mini-monster"><span>${renderMonsterImage(monster)}</span><div><strong>${escapeHtml(monster.name)}</strong><small>${price} oro</small></div></article>`;
}

function renderTeamScreen() {
  ensureTestCombatState();
  const room = state.room;
  const viewedPlayer = room.players.find((player) => player.id === state.selectedTeamPlayerId) || room.players[0];
  const selectedAward = viewedPlayer.roster.find((award) => award.monster.id === state.selectedMonsterId) || viewedPlayer.roster[0];
  const entry = selectedAward ? state.catalogById.get(selectedAward.monster.id) : null;

  if (entry && state.selectedMonsterId !== entry.id) {
    state.selectedMonsterId = entry.id;
  }

  return `
    <main class="ml-team-page" style="--team-color:${escapeHtml(viewedPlayer.color)}">
      <section class="ml-team-header">
        <div><p class="ml-eyebrow">DRAFT COMPLETADO</p><h1>${t("teamOf")} ${escapeHtml(viewedPlayer.name)}</h1><p>${viewedPlayer.roster.length} criaturas · ${viewedPlayer.gold} oro restante</p></div>
        <div class="ml-team-header__actions">
          ${localTestMode ? `<label>Ver equipo<select data-ml-team-select>${room.players.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === viewedPlayer.id ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("")}</select></label>` : ""}
          ${room.hostPlayerId === state.hostPlayerId ? `<button class="ml-button" type="button" data-ml-action="send-encounters">${getEncounterSaveButtonLabel()}</button>` : ""}
          ${room.hostPlayerId === state.hostPlayerId ? `<button class="ml-button ml-button--primary" type="button" data-ml-action="enter-combat">${room.status === "combat" ? "Combate en vivo" : "Iniciar combate"}</button>` : `<span class="ml-live-dot">${room.status === "combat" ? "LIVE" : "ESPERANDO AL HOST"}</span>`}
        </div>
      </section>
      <div class="ml-team-layout">
        <aside class="ml-panel ml-team-roster">
          <div class="ml-panel-heading"><div><p class="ml-eyebrow">PLANTILLA</p><h2>Criaturas</h2></div></div>
          <div class="ml-team-cards">${viewedPlayer.roster.map((award) => renderTeamMonsterCard(viewedPlayer, award)).join("")}</div>
        </aside>
        <section class="ml-panel ml-monster-sheet">
          ${entry ? renderLiveMonsterSheet(viewedPlayer, entry) : detailRenderers.renderBestiaryDetailEmpty()}
        </section>
        <aside class="ml-panel ml-live-panel">
          ${entry ? renderLiveSummary(viewedPlayer, entry) : ""}
        </aside>
      </div>
    </main>
  `;
}

function renderTeamMonsterCard(player, award) {
  const monster = state.catalogById.get(award.monster.id) || award.monster;
  const live = getLiveMonster(player.id, monster);
  const effectiveMax = Math.max(0, live.maxHp - live.necrotic);
  const hpPercent = effectiveMax > 0 ? Math.max(0, Math.min(100, live.currentHp / effectiveMax * 100)) : 0;
  return `
    <button class="ml-team-monster-card ${monster.id === state.selectedMonsterId ? "is-selected" : ""}" type="button" data-ml-action="select-monster" data-monster-id="${escapeHtml(monster.id)}">
      <span class="ml-team-monster-card__portrait">${renderMonsterImage(monster)}</span>
      <span class="ml-team-monster-card__copy"><strong>${escapeHtml(monster.name)}</strong><small>${live.currentHp}/${effectiveMax} PV${live.tempHp ? ` · +${live.tempHp}` : ""}</small><i><b style="width:${hpPercent}%"></b></i></span>
    </button>
  `;
}

function renderLiveMonsterSheet(player, entry) {
  return `
    <div class="ml-sheet-live-title"><span style="--team-color:${escapeHtml(player.color)}"></span><div><small>FICHA VINCULADA</small><strong>Información completa</strong></div></div>
    ${renderMonsterSpellbook(entry)}
    <div class="ml-native-bestiary-detail">${detailRenderers.renderBestiaryDetail(entry)}</div>
  `;
}

function renderMonsterSpellbook(entry) {
  const spellcasting = parseBestiarySpellcasting(entry);

  if (!spellcasting) {
    return "";
  }

  return `
    <section class="ml-spellbook">
      <div class="ml-spellbook__heading"><div><p class="ml-eyebrow">${escapeHtml(t("spellbook"))}</p><h3>Grimorio de ${escapeHtml(entry.name)}</h3></div><p>${spellcasting.ability ? escapeHtml(spellcasting.ability) : ""}${spellcasting.saveDc ? ` · CD ${spellcasting.saveDc}` : ""}${spellcasting.attackModifier !== "" ? ` · ${spellcasting.attackModifier >= 0 ? "+" : ""}${spellcasting.attackModifier}` : ""}</p></div>
      <div class="ml-spell-groups">${spellcasting.groups.map((group) => `<article><strong>${escapeHtml(group.label)}</strong><div>${group.spells.map((spell) => renderSpellButton(spell.lookupName, spell.displayName)).join("")}</div></article>`).join("")}</div>
    </section>
  `;
}

function renderSpellButton(lookupName, displayName) {
  const spell = findSpellByName(lookupName);
  return spell
    ? `<button type="button" data-ml-action="open-spell" data-spell-id="${escapeHtml(spell.id)}">${escapeHtml(displayName)}</button>`
    : `<span>${escapeHtml(displayName)}</span>`;
}

function renderLiveSummary(player, entry) {
  const live = getLiveMonster(player.id, entry);
  const effectiveMax = Math.max(0, live.maxHp - live.necrotic);
  const hpPercent = effectiveMax > 0 ? Math.max(0, Math.min(100, live.currentHp / effectiveMax * 100)) : 0;
  const necroticPercent = live.maxHp > 0 ? Math.max(0, Math.min(100, live.necrotic / live.maxHp * 100)) : 0;
  return `
    <div class="ml-panel-heading"><div><p class="ml-eyebrow">ESTADO EN VIVO</p><h2>${escapeHtml(entry.name)}</h2></div><span class="ml-live-dot">LIVE</span></div>
    <div class="ml-live-portrait">${renderMonsterImage(entry, "eager")}</div>
    <div class="ml-health-numbers"><strong>${live.currentHp}</strong><span>/ ${effectiveMax} PV</span>${live.tempHp ? `<b>+${live.tempHp} temp</b>` : ""}</div>
    <div class="ml-health-bar"><i style="width:${hpPercent}%"></i><b style="width:${necroticPercent}%"></b></div>
    <div class="ml-live-metrics"><article><span>PV máximos</span><strong>${live.maxHp}</strong></article><article><span>Vida temporal</span><strong>${live.tempHp}</strong></article><article><span>Daño necrótico</span><strong>${live.necrotic}</strong></article><article><span>CA</span><strong>${entry.acValue || "—"}</strong></article></div>
    <section class="ml-condition-list"><span>Estados</span><div>${live.conditions.length ? live.conditions.map((condition) => `<b>${escapeHtml(condition)}</b>`).join("") : `<small>Sin estados activos</small>`}</div></section>
    ${localTestMode ? renderCombatTestControls(player, entry, live) : ""}
  `;
}

function renderCombatTestControls(player, entry, live) {
  return `
    <details class="ml-test-controls" open>
      <summary>Controles de prueba</summary>
      <div class="ml-test-control-row"><button type="button" data-ml-action="adjust-hp" data-amount="-5">−5 PV</button><button type="button" data-ml-action="adjust-hp" data-amount="5">+5 PV</button><button type="button" data-ml-action="adjust-temp" data-amount="5">+5 temp</button><button type="button" data-ml-action="adjust-necrotic" data-amount="5">+5 necrótico</button></div>
      <form data-ml-condition-form><input name="condition" placeholder="Añadir estado" /><button type="submit">Añadir</button></form>
      <input type="hidden" value="${escapeHtml(player.id)}" data-live-player-id /><input type="hidden" value="${escapeHtml(entry.id)}" data-live-monster-id />
    </details>
  `;
}

function renderSpellDialog() {
  if (!state.selectedSpellId) {
    return "";
  }

  const spell = state.spells.find((entry) => entry.id === state.selectedSpellId);

  if (!spell) {
    return "";
  }

  return `
    <div class="ml-spell-dialog" role="presentation">
      <button class="ml-spell-dialog__backdrop" type="button" data-ml-action="close-spell" aria-label="Cerrar"></button>
      <section class="ml-spell-dialog__panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(spell.name)}">
        <button class="ml-spell-dialog__close" type="button" data-ml-action="close-spell">×</button>
        ${detailRenderers.renderArcanumDetail(spell)}
      </section>
    </div>
  `;
}

function renderDraftFlash() {
  const flash = state.draftFlash;
  if (!flash) return "";
  return `
    <div class="ml-draft-flash ml-draft-flash--${escapeHtml(flash.type)}" style="--team-color:${escapeHtml(flash.color || "#d9ab5d")}" role="status" aria-live="assertive">
      <span>${escapeHtml(flash.eyebrow)}</span>
      <strong>${escapeHtml(flash.title)}</strong>
      <small>${escapeHtml(flash.detail)}</small>
    </div>
  `;
}

function observeDraftEvents(room) {
  if (!room) return;
  const lot = room.currentLot;
  const observation = {
    lotId: cleanText(lot?.monster?.id),
    bid: Number(lot?.currentBid) || 0,
    bidderId: cleanText(lot?.highBidPlayerId),
    historyCount: room.history?.length || 0
  };
  const previous = state.draftObservation;
  state.draftObservation = observation;

  if (!previous) return;

  if (observation.historyCount > previous.historyCount) {
    const result = room.history[room.history.length - 1];
    const winner = room.players.find((player) => player.id === result?.winnerPlayerId);
    showDraftFlash({
      type: "win",
      eyebrow: language === "en" ? "AUCTION WON" : "PUJA GANADA",
      title: winner?.name || "—",
      detail: `${result?.price || 0} ${language === "en" ? "gold" : "de oro"}`,
      color: winner?.color
    });
    playDraftSound("win");
    return;
  }

  if (observation.lotId && observation.lotId === previous.lotId
    && (observation.bid > previous.bid || observation.bidderId !== previous.bidderId)) {
    const bidder = room.players.find((player) => player.id === observation.bidderId);
    showDraftFlash({
      type: "bid",
      eyebrow: language === "en" ? "NEW BID" : "NUEVA PUJA",
      title: bidder?.name || "—",
      detail: `${observation.bid} ${language === "en" ? "gold" : "de oro"}`,
      color: bidder?.color
    });
    playDraftSound("bid");
  }
}

function showDraftFlash(flash) {
  window.clearTimeout(state.draftFlashTimer);
  state.draftFlash = flash;
  state.draftFlashTimer = window.setTimeout(() => {
    state.draftFlash = null;
    render();
  }, flash.type === "win" ? 2200 : 1400);
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.audioContext) state.audioContext = new AudioContextClass();
  if (state.audioContext.state === "suspended") state.audioContext.resume().catch(() => {});
  return state.audioContext;
}

function playDraftSound(kind) {
  const context = ensureAudioContext();
  if (!context || context.state !== "running") return;
  const now = context.currentTime;
  const notes = kind === "win"
    ? [[523.25, 0], [659.25, 0.09], [783.99, 0.18]]
    : kind === "countdown"
      ? [[880, 0]]
      : [[520, 0], [690, 0.055]];

  for (const [frequency, delay] of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "countdown" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + delay);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(kind === "win" ? 0.11 : 0.075, now + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + (kind === "win" ? 0.24 : 0.12));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + (kind === "win" ? 0.26 : 0.14));
  }
}

function updateCountdownSound(room, now) {
  const lot = room?.currentLot;
  if (!lot) {
    state.lastCountdownBeep = "";
    return;
  }
  const seconds = Math.ceil(Math.max(0, lot.deadlineAt - now) / 1000);
  if (seconds < 1 || seconds > 3) return;
  const key = `${lot.monster.id}:${seconds}`;
  if (key === state.lastCountdownBeep) return;
  state.lastCountdownBeep = key;
  playDraftSound("countdown");
}

function renderMonsterImage(monster, loading = "lazy") {
  const url = cleanText(monster?.imageUrl || monster?.tokenUrl);
  return url
    ? `<img src="${escapeHtml(url)}" alt="" loading="${loading}" decoding="async" />`
    : `<i class="ml-monster-placeholder">${escapeHtml(getInitials(monster?.name || "M"))}</i>`;
}

function handleClick(event) {
  const target = event.target.closest("[data-ml-action]");

  if (!target) {
    const nativeSpellLink = event.target.closest("[data-arcanum-entry-id]");
    if (nativeSpellLink) {
      state.selectedSpellId = nativeSpellLink.dataset.arcanumEntryId;
      render();
    }
    return;
  }

  clearMessages();
  ensureAudioContext();
  const action = target.dataset.mlAction;

  try {
    if (action === "add-bot") addBot();
    else if (action === "remove-player") removePlayer(target.dataset.playerId);
    else if (action === "copy-link") copyInviteLink();
    else if (action === "toggle-ready") toggleReady();
    else if (action === "start-draft") startDraft();
    else if (action === "next-lot") nextLot();
    else if (action === "quick-bid") bid(Number(target.dataset.bidAmount));
    else if (action === "select-monster") state.selectedMonsterId = target.dataset.monsterId;
    else if (action === "open-spell") state.selectedSpellId = target.dataset.spellId;
    else if (action === "close-spell") state.selectedSpellId = "";
    else if (action === "send-encounters") sendEncountersToMainApp();
    else if (action === "enter-combat") enterCombat();
    else if (action === "adjust-hp") adjustLiveValue("currentHp", Number(target.dataset.amount));
    else if (action === "adjust-temp") adjustLiveValue("tempHp", Number(target.dataset.amount));
    else if (action === "adjust-necrotic") adjustLiveValue("necrotic", Number(target.dataset.amount));
    render();
  } catch (error) {
    showError(error);
  }
}

function handleChange(event) {
  if (event.target.matches("[data-ml-team-select]")) {
    state.selectedTeamPlayerId = event.target.value;
    state.selectedMonsterId = "";
    render();
  }
}

function handleInput(event) {
  if (event.target.matches("[data-ml-monster-search]")) {
    state.search = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = app.querySelector("[data-ml-monster-search]");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }
}

function handleSubmit(event) {
  ensureAudioContext();
  if (event.target.matches("[data-ml-config-form]")) {
    event.preventDefault();
    const form = new FormData(event.target);
    const config = {
      name: form.get("name"),
      maxPlayers: form.get("maxPlayers"),
      teamSize: form.get("teamSize"),
      startingGold: form.get("startingGold"),
      crMin: form.get("crMin"),
      crMax: form.get("crMax"),
      bidSeconds: form.get("bidSeconds"),
      excludedSizes: form.getAll("excludedSizes"),
      excludedTypes: form.getAll("excludedTypes")
    };
    if (localTestMode) {
      updateMonstersLeagueConfig(state.room, config, state.hostPlayerId);
      publishMonstersLeagueRoom(state.room, state.hostPlayerId);
    } else {
      sendOnlineCommand("update-config", { config });
      sendOnlineCommand("publish");
    }
    render();
    return;
  }

  if (event.target.matches("[data-ml-bid-form]")) {
    event.preventDefault();
    bid(Number(new FormData(event.target).get("bid")));
    render();
    return;
  }

  if (event.target.matches("[data-ml-condition-form]")) {
    event.preventDefault();
    const condition = cleanText(new FormData(event.target).get("condition"));
    const live = getSelectedLiveMonster();
    if (condition && live && !live.conditions.includes(condition)) live.conditions.push(condition);
    render();
  }
}

function handleImageError(event) {
  const image = event.target.closest(".monsters-league-shell img");
  if (!image || image.closest(".ml-brand")) return;
  const placeholder = document.createElement("i");
  placeholder.className = "ml-monster-placeholder";
  placeholder.textContent = "MD";
  image.replaceWith(placeholder);
}

function addBot() {
  const botNumber = state.room.players.filter((player) => player.isBot).length + 1;
  const botNames = language === "en"
    ? ["Copper Fang", "Moss Oracle", "Ash Warden", "Night Claw", "Ivory Eye", "Ember Maw", "Rune Keeper"]
    : ["Colmillo de Cobre", "Oráculo de Musgo", "Guardián de Ceniza", "Garra Nocturna", "Ojo de Marfil", "Fauce de Ascuas", "Custodio Rúnico"];
  const bot = {
    name: botNames[(botNumber - 1) % botNames.length],
    botAggression: 0.75 + Math.random() * 0.5
  };
  if (localTestMode) {
    addMonstersLeaguePlayer(state.room, { ...bot, isBot: true }, state.hostPlayerId);
  } else {
    sendOnlineCommand("add-bot", bot);
  }
  render();
}

function removePlayer(playerId) {
  if (localTestMode) {
    removeMonstersLeaguePlayer(state.room, playerId, state.hostPlayerId);
  } else {
    sendOnlineCommand("remove-player", { playerId });
  }
}

function toggleReady() {
  const player = state.room.players.find((entry) => entry.id === state.hostPlayerId);
  if (!player) return;
  if (localTestMode) {
    setMonstersLeagueReady(state.room, player.id, !player.ready);
  } else {
    sendOnlineCommand("ready", { ready: !player.ready });
  }
}

function startDraft() {
  if (localTestMode) {
    startMonstersLeagueDraft(state.room, state.hostPlayerId, state.catalog);
    openRandomMonstersLeagueLot(state.room, state.catalog);
    observeDraftEvents(state.room);
  } else {
    const catalog = getEligibleMonsters(state.catalog, state.room.config).map(toOnlineCatalogEntry);
    sendOnlineCommand("start", { catalog });
  }
  state.nextBotDecisionAt = Date.now() + 650;
  state.search = "";
  render();
}

function bid(amount) {
  if (localTestMode) {
    placeMonstersLeagueBid(state.room, state.hostPlayerId, amount);
    observeDraftEvents(state.room);
  } else {
    sendOnlineCommand("bid", { amount });
  }
  state.nextBotDecisionAt = Date.now() + 500;
}

function nextLot() {
  if (localTestMode) {
    advanceMonstersLeagueDraft(state.room, state.hostPlayerId, state.catalog);
    observeDraftEvents(state.room);
  } else {
    sendOnlineCommand("next-lot");
  }
  state.nextBotDecisionAt = Date.now() + 650;
  state.draftFlash = null;
  render();
}

function tick() {
  const room = state.room;

  if (!room || room.status !== "drafting") {
    return;
  }

  const now = Date.now();
  const countdown = app.querySelector("[data-ml-countdown]");
  if (countdown) countdown.textContent = formatCountdown(getActiveDeadline(), now);
  const finalCountdown = app.querySelector("[data-ml-final-countdown]");
  if (finalCountdown) {
    const remainingSeconds = Math.max(0, Math.ceil((getActiveDeadline() - now) / 1000));
    finalCountdown.textContent = remainingSeconds > 0 && remainingSeconds <= 3 ? String(remainingSeconds) : "";
    finalCountdown.classList.toggle("is-visible", remainingSeconds > 0 && remainingSeconds <= 3);
  }
  updateCountdownSound(room, now);

  if (!localTestMode) {
    return;
  }

  try {
    if (room.currentLot && now >= room.currentLot.deadlineAt) {
      resolveMonstersLeagueLot(room, now);
      observeDraftEvents(room);
      state.nextBotDecisionAt = now + 650;
      state.botNominationPending = false;
      ensureTestCombatState();
      render();
      return;
    }

    if (!room.currentLot) {
      openRandomMonstersLeagueLot(room, state.catalog, now);
      observeDraftEvents(room);
      render();
      return;
    }

    if (now >= state.nextBotDecisionAt) {
      const bots = shuffleLocal(room.players.filter((player) => player.isBot && player.roster.length < room.config.teamSize));
      let changed = false;
      for (const bot of bots) {
        const amount = chooseBotBid(room, bot.id);
        if (amount > 0) {
          placeMonstersLeagueBid(room, bot.id, amount, Date.now());
          observeDraftEvents(room);
          changed = true;
          break;
        }
      }
      state.nextBotDecisionAt = now + 500 + Math.floor(Math.random() * 650);
      if (changed) render();
    }
  } catch (error) {
    showError(error);
  }
}

function getActiveDeadline() {
  return state.room.currentLot?.deadlineAt || state.room.nominationDeadlineAt || Date.now();
}

function formatCountdown(deadline, now = Date.now()) {
  return (Math.max(0, deadline - now) / 1000).toFixed(1);
}

function ensureTestCombatState() {
  if (!state.room) return;
  for (const player of state.room.players) {
    for (const award of player.roster) {
      const monster = state.catalogById.get(award.monster.id) || award.monster;
      const key = getLiveKey(player.id, monster.id);
      if (!state.testCombat[key]) {
        const maxHp = Math.max(1, Number(monster.hpValue) || 1);
        state.testCombat[key] = { maxHp, currentHp: maxHp, tempHp: 0, necrotic: 0, conditions: [] };
      }
    }
  }
}

function getLiveMonster(playerId, monster) {
  const onlineLive = state.room?.combatState?.[playerId]?.[monster.id];
  if (!localTestMode && onlineLive) {
    return normalizeLiveMonster(onlineLive, monster);
  }
  ensureTestCombatState();
  return state.testCombat[getLiveKey(playerId, monster.id)] || { maxHp: 1, currentHp: 1, tempHp: 0, necrotic: 0, conditions: [] };
}

function getSelectedLiveMonster() {
  const player = state.room.players.find((entry) => entry.id === state.selectedTeamPlayerId) || state.room.players[0];
  const award = player.roster.find((entry) => entry.monster.id === state.selectedMonsterId) || player.roster[0];
  return award ? getLiveMonster(player.id, state.catalogById.get(award.monster.id) || award.monster) : null;
}

function getLiveKey(playerId, monsterId) {
  return `${playerId}:${monsterId}`;
}

function adjustLiveValue(field, amount) {
  const live = getSelectedLiveMonster();
  if (!live) return;
  live[field] = Math.max(0, Number(live[field] || 0) + amount);
  if (field === "currentHp") live.currentHp = Math.min(live.currentHp, Math.max(0, live.maxHp - live.necrotic));
  if (field === "necrotic") live.currentHp = Math.min(live.currentHp, Math.max(0, live.maxHp - live.necrotic));
}

function enterCombat() {
  if (localTestMode) {
    state.room.status = "combat";
  } else {
    sendOnlineCommand("enter-combat");
  }
  ensureTestCombatState();
  if (!state.encountersSent) sendEncountersToMainApp();
  ensureCloudCampaignSaved().then(notifyMainAppCampaignActivation);
  state.notice = localTestMode
    ? "Combate de prueba iniciado. Los controles laterales simulan actualizaciones del host."
    : "Encuentros preparados. Cárgalos en la tabla para iniciar la sincronización en vivo.";
}

function sendEncountersToMainApp() {
  const payload = {
    schema: "mimic-dice:monsters-league-result",
    version: 1,
    roomId: state.room.id,
    name: state.room.config.name,
    language: state.room.language,
    encounters: createMonstersLeagueEncounters(state.room).map((encounter) => ({
      ...encounter,
      multiplayer: { ...encounter.multiplayer, online: !localTestMode }
    }))
  };
  localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify({ payload, createdAt: Date.now() }));
  notifyMainApp({ type: "mimic-dice:monsters-league-result", payload });
  state.encountersSent = true;
  ensureCloudCampaignSaved();
  state.notice = localTestMode
    ? "Equipos enviados a Mimic Dice como encuentros."
    : "Equipos enviados a Mimic Dice y guardados en la campaña del lobby.";
}

function getEncounterSaveButtonLabel() {
  if (state.cloudCampaignSaveStatus === "saving") return "Guardando campaña…";
  if (state.cloudCampaignSaveStatus === "saved" && state.encountersSent) return "Equipos guardados ✓";
  if (state.cloudCampaignSaveStatus === "saved") return "Campaña cloud guardada ✓";
  return state.encountersSent ? "Equipos enviados ✓" : "Guardar encuentros";
}

function ensureCloudCampaignSaved() {
  if (
    localTestMode
    || !state.room
    || state.room.hostPlayerId !== state.hostPlayerId
    || !["complete", "combat"].includes(state.room.status)
    || state.cloudCampaignSaveStatus === "saved"
  ) {
    return state.cloudCampaignSavePromise || Promise.resolve(state.cloudCampaignResult);
  }

  if (state.cloudCampaignSavePromise) return state.cloudCampaignSavePromise;

  state.cloudCampaignSaveStatus = "saving";
  state.cloudCampaignSavePromise = finalizeMonstersLeagueOnlineRoom(state.room.id)
    .then((result) => {
      state.cloudCampaignSaveStatus = "saved";
      state.cloudCampaignResult = result;
      state.notice = language === "en"
        ? `${result.encounterCount} teams saved in ${result.campaignName}.`
        : `${result.encounterCount} equipos guardados en ${result.campaignName}.`;
      render();
      return result;
    })
    .catch((error) => {
      state.cloudCampaignSaveStatus = "error";
      state.error = error instanceof Error ? error.message : String(error);
      render();
      return null;
    })
    .finally(() => {
      state.cloudCampaignSavePromise = null;
    });
  return state.cloudCampaignSavePromise;
}

function notifyMainAppCampaignActivation(result) {
  if (!result?.campaignId || state.campaignActivationSent) return;
  state.campaignActivationSent = true;
  notifyMainApp({
    type: "mimic-dice:monsters-league-campaign",
    payload: {
      schema: "mimic-dice:monsters-league-campaign",
      version: 1,
      roomId: state.room.id,
      campaignId: result.campaignId,
      campaignName: result.campaignName
    }
  });
}

function notifyMainApp(message) {
  window.opener?.postMessage(message, window.location.origin);
  try {
    const channel = new BroadcastChannel("mimic-dice:monsters-league");
    channel.postMessage(message);
    channel.close();
  } catch {}
}

function copyInviteLink() {
  const url = createMonstersLeagueUrl({ roomId: state.room.id, mode: "online", roomLanguage: state.room.language });
  navigator.clipboard?.writeText(url);
  state.notice = "Enlace copiado.";
  render();
}

function createMonstersLeagueUrl({ roomId, mode, roomLanguage }) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("view", "monsters-league");
  url.searchParams.set("room", cleanText(roomId));
  url.searchParams.set("mode", mode === "online" ? "online" : "local");
  url.searchParams.set("language", roomLanguage === "en" ? "en" : "es");
  return url.href;
}

function sendOnlineCommand(type, payload = {}) {
  state.connection?.send(type, payload);
}

function toOnlineCatalogEntry(entry) {
  return {
    id: entry.id,
    entryKey: entry.entryKey || entry.id,
    name: entry.name,
    canonicalName: entry.canonicalName || entry.name,
    localizedName: entry.localizedName || "",
    dedupeKey: entry.dedupeKey || normalizeSearchText(entry.canonicalName || entry.name),
    source: entry.source || "",
    canonicalSource: entry.canonicalSource || entry.source || "",
    imageUrl: entry.imageUrl || "",
    tokenUrl: entry.tokenUrl || "",
    size: entry.size || "",
    type: entry.type || "",
    sizeFilterKey: entry.sizeFilterKey || toFilterKey(entry.size),
    typeFilterKey: entry.typeFilterKey || toTypeFilterKey(entry.type),
    hp: entry.hp || "",
    hpValue: Number(entry.hpValue) || 0,
    ac: entry.ac || "",
    acValue: Number(entry.acValue) || 0,
    crLabel: entry.crBaseLabel || entry.crLabel || "",
    crValue: Number(entry.crBaseValue ?? entry.crValue) || 0
  };
}

function normalizeLiveMonster(value, monster) {
  const maxHp = Math.max(1, Number(value?.maxHp) || Number(monster?.hpValue) || 1);
  return {
    maxHp,
    currentHp: Math.max(0, Number(value?.currentHp) || 0),
    tempHp: Math.max(0, Number(value?.tempHp) || 0),
    necrotic: Math.max(0, Number(value?.necrotic) || 0),
    conditions: Array.isArray(value?.conditions) ? value.conditions.map(cleanText).filter(Boolean) : []
  };
}

function findSpellByName(name) {
  const normalized = normalizeSearchText(name);
  return state.spells.find((spell) => spell.nameAliasesLower?.includes(normalized) || spell.nameLower === normalized) || null;
}

function persistTestRoom() {
  if (!localTestMode || !state.room) return;
  try {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify({ room: state.room, testCombat: state.testCombat, storedAt: Date.now() }));
  } catch {}
}

function restoreTestRoom() {
  if (!localTestMode || params.get("fresh") === "1") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(ROOM_STORAGE_KEY) || "null");
    if (!saved?.room || saved.room.language !== language || Date.now() - Number(saved.storedAt || 0) > 24 * 60 * 60 * 1000) return null;
    state.testCombat = saved.testCombat || {};
    return saved.room;
  } catch {
    return null;
  }
}

function clearMessages() {
  state.error = "";
  state.notice = "";
}

function showError(error) {
  state.error = error instanceof Error ? error.message : String(error);
  render();
}

function getInitials(value) {
  return cleanText(value).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "ML";
}

function shuffleLocal(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function toTypeFilterKey(value) {
  return toFilterKey(cleanText(value).split(/[,(\[]/, 1)[0]);
}

function toFilterKey(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
