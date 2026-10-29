import "./monstersLeague.css";

import appIconUrl from "../../build-resources/icon.png";
import { loadVersionedCompendiumBundle } from "../data/compendiumBundles.js";
import { normalizeBestiaryEntry, normalizeSpellEntry } from "../data/compendiumEntries.js";
import { createCompendiumDetailRenderers } from "../screens/compendiums/detailRender.js";
import { parseBestiarySpellcasting } from "../shared/bestiarySpellcasting.js";
import { createSpellReferenceMatcher } from "../shared/spellReferences.js";
import { cleanText, escapeHtml, normalizeSearchText } from "../shared/text.js";
import { createCombatMapController } from "../screens/combat-map/combatMap.js";
import { renderDiceRollerDock } from "../screens/dice-roller/diceRollerRender.js";
import { DiceFormulaError, rollDiceFormula } from "../shared/diceFormula.js";
import { enhanceDiceFormulaLinks } from "../shared/diceFormulaLinks.js";
import { installLongPressContextMenu } from "../shared/longPressContextMenu.js";
import {
  COMBAT_DICE_TARGET_ATTACK,
  COMBAT_DICE_TARGET_DAMAGE,
  doubleDiceInFormula,
  getCombatDiceTargetKind,
  getCombatDiceTargetOutcome
} from "../screens/combat-tracker/combatDiceTarget.js";
import { fetchAuthSession, getCloudCampaignStatus, uploadCloudImage } from "../cloud/cloudClient.js";
import { getCombatMiniActionIconUrl, getCombatStatusIconUrl, getCombatToolbarActionIconUrl } from "../assets/combatIcons.js";
import { projectMonstersLeagueCombatantForPlayer } from "./monstersLeagueVisibility.js";
import { rewriteMonstersLeagueAssetUrl } from "./monstersLeagueProjection.js";
import {
  advanceMonstersLeagueCombatTurn,
  applyMonstersLeagueCombatDamage,
  applyMonstersLeagueCombatantPatch,
  mergeMonstersLeagueProjectedCombatantLiveState
} from "./monstersLeagueCombatState.js";
import {
  createMonstersLeagueServerClockSample,
  getMonstersLeagueClockNow,
  getMonstersLeagueRemainingSeconds
} from "./monstersLeagueClock.js";
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
const MASTER_WORKSPACE_LAYOUT_KEY = "mimic-dice:monsters-league-master-layout:v1";
const masterSheetScrollPositions = new Map();
const masterWorkspaceViewport = { entities: 0, dice: 0 };
let activeMasterWorkspaceResize = null;
let masterWorkspaceLayout = loadMasterWorkspaceLayout();

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
  sharedCampaignConnectStatus: "idle",
  sharedCampaignConnectPromise: null,
  sharedCampaignConnectRetryTimer: 0,
  connection: null,
  connectionStatus: localTestMode ? "local" : "connecting",
  draftFlash: null,
  draftFlashTimer: 0,
  draftObservation: null,
  lastCountdownBeep: "",
  serverClockSample: null,
  audioContext: null,
  lastActiveCombatantId: "",
  lastCombatRound: 0,
  turnFlash: null,
  turnFlashTimer: 0,
  roundFlash: null,
  roundFlashTimer: 0,
  mapBroadcastExpanded: false,
  mapPublishTimer: 0,
  combatFeedbackRoomId: "",
  combatFeedbackInitialized: false,
  seenCombatFeedbackIds: new Set(),
  diceRollerDraft: "",
  diceRollerError: "",
  diceRollerHelpOpen: false,
  diceRollerHitDiceMode: false,
  diceRollerRollMode: "",
  diceRollerModifier: "+0",
  diceRollerDiceTrayOpen: false,
  dismissedDiceRollIds: new Set(),
  diceTargetMenu: null,
  combatQuickMenu: null,
  mapUploadSource: "",
  mapUploadPromise: null
};

const t = (key) => UI[language]?.[key] ?? UI.es[key] ?? key;
const detailRenderers = createCompendiumDetailRenderers({
  t,
  getArcanumSpellLinkData: () => state.spellMatcher,
  getItemAttunementLabel: () => "",
  getItemSourceDescription: () => "",
  isItemTypeTokenFilterActive: () => false
});
const playerMapController = createCombatMapController({
  storageKey: "mimic-dice:monsters-league-player-map:v1",
  getCombatants: getPlayerVisibleCombatants,
  getActiveCombatantId: getLeagueActiveCombatantId,
  renderInitiativeOrder: renderProjectedInitiativeOrder,
  canLoadMap: () => localTestMode || state.room?.hostPlayerId === state.hostPlayerId,
  getAccountSession: () => state.session,
  renderContextMenu: renderLeagueCombatQuickMenu,
  openContextMenu: openLeagueCombatQuickMenu,
  handleContextClick: handleLeagueCombatQuickMenuClick,
  handleContextChange: handleLeagueCombatQuickMenuChange,
  handleContextInput: handleLeagueCombatQuickMenuInput,
  handleContextKeydown: handleLeagueCombatQuickMenuKeydown,
  handleTurnShortcutKeydown: handleLeagueTurnShortcutKeydown,
  showTokenHealth: () => false,
  showInitiativeHealth: () => false,
  showTeamColorRings: () => false,
  isToolbarControlVisible: (control) => !["fog", "health", "initiative"].includes(control),
  onChange: publishLeagueMasterMapChange
});

installLongPressContextMenu(app);

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);
app.addEventListener("submit", handleSubmit);
app.addEventListener("pointerdown", handleMasterWorkspacePointerDown);
app.addEventListener("keydown", handleMasterWorkspaceKeydown);
app.addEventListener("contextmenu", handleMasterWorkspaceContextMenu);
app.addEventListener("error", handleImageError, true);
app.addEventListener("wheel", handleMapWheel, { passive: false });
app.addEventListener("scroll", handleMapScroll, true);
window.addEventListener("beforeunload", () => {
  persistTestRoom();
  window.clearTimeout(state.sharedCampaignConnectRetryTimer);
  state.connection?.close();
});
window.addEventListener("resize", () => syncMasterMapSurface());
window.addEventListener("keydown", handleLeagueTurnShortcutKeydown);
document.addEventListener("pointermove", handleMasterWorkspacePointerMove);
document.addEventListener("pointerup", handleMasterWorkspacePointerUp);
document.addEventListener("pointercancel", handleMasterWorkspacePointerUp);

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
    onSnapshot(room, timing = {}) {
      const clockSample = createMonstersLeagueServerClockSample(timing.serverNow, timing.receivedAt);
      if (clockSample) state.serverClockSample = clockSample;
      const previousStatus = state.room?.status;
      state.room = room;
      observeDraftEvents(room);
      observeCombatTurn(room);
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
      const campaignSave = ensureCloudCampaignSaved();
      if (room.hostPlayerId === state.hostPlayerId) {
        campaignSave.then((result) => {
          if (result) notifyMainAppCampaignActivation(result);
        });
      } else {
        ensureSharedCampaignConnected();
      }
      if (!state.loading) {
        render();
        observeCombatFeedback(room);
      }
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
  captureMasterWorkspaceViewport();

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
    ${renderTurnFlash()}
    ${renderLeagueDiceTargetMenu()}
    ${renderLeagueCombatQuickMenu(window, "main")}
  `;
  restoreMasterWorkspaceViewport();
  syncMasterMapSurface();
  enhanceDiceFormulaLinks(app.querySelector(".master-combat-workspace__sheet"));
  enhanceDiceFormulaLinks(app.querySelector(".ml-spell-dialog__panel"));
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
  const sizeOptions = getCreatureFilterOptions("size", config.crMin, config.crMax);
  const typeOptions = getCreatureFilterOptions("type", config.crMin, config.crMax);

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
            ${renderCreatureFilterGroup("size", language === "en" ? "Creature sizes" : "Tamaños de criatura", sizeOptions, config.excludedSizes, config.sizeFilterMode)}
            ${renderCreatureFilterGroup("type", language === "en" ? "Creature types" : "Tipos de criatura", typeOptions, config.excludedTypes, config.typeFilterMode)}
          </div>
          <div class="ml-config-summary">
            <article><span>Catálogo elegible</span><strong data-ml-eligible-count>${eligibleCount.toLocaleString(language)}</strong><small>criaturas únicas</small></article>
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

function renderCreatureFilterGroup(kind, label, options, selectedValues = [], mode = "exclude") {
  const name = kind === "size" ? "excludedSizes" : "excludedTypes";
  const modeName = kind === "size" ? "sizeFilterMode" : "typeFilterMode";
  const selected = new Set(Array.isArray(selectedValues) ? selectedValues : []);
  return `
    <fieldset class="ml-exclusion-group ${mode === "include" ? "is-include" : "is-exclude"}" data-ml-filter-group="${kind}">
      <legend>${escapeHtml(label)}</legend>
      <label class="ml-exclusion-group__mode">
        <span>${language === "en" ? "Filter mode" : "Modo de filtro"}</span>
        <select name="${modeName}">
          <option value="exclude" ${mode === "include" ? "" : "selected"}>${language === "en" ? "Exclude selected" : "Excluir seleccionadas"}</option>
          <option value="include" ${mode === "include" ? "selected" : ""}>${language === "en" ? "Only selected" : "Solo seleccionadas"}</option>
        </select>
      </label>
      <div>${options.map((option) => `
        <label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(option.key)}" ${selected.has(option.key) ? "checked" : ""} /><span>${escapeHtml(option.label)}</span></label>
      `).join("") || `<small>${language === "en" ? "No creatures in this CR range." : "No hay criaturas en este rango de CR."}</small>`}</div>
    </fieldset>
  `;
}

function getCreatureFilterOptions(kind, crMin = state.room?.config?.crMin, crMax = state.room?.config?.crMax) {
  const options = new Map();
  const firstBoundary = Number(crMin);
  const secondBoundary = Number(crMax);
  const lower = Math.min(Number.isFinite(firstBoundary) ? firstBoundary : 0, Number.isFinite(secondBoundary) ? secondBoundary : 30);
  const upper = Math.max(Number.isFinite(firstBoundary) ? firstBoundary : 0, Number.isFinite(secondBoundary) ? secondBoundary : 30);
  for (const monster of state.catalog) {
    const crValue = Number(monster.crValue);
    if (!Number.isFinite(crValue) || crValue < lower || crValue > upper) continue;
    const rawLabel = cleanText(kind === "size" ? monster.size : monster.type).split(/[,(\[]/, 1)[0];
    const key = kind === "size" ? toFilterKey(monster.size) : toTypeFilterKey(monster.type);
    if (key && rawLabel && !options.has(key)) options.set(key, rawLabel);
  }
  return [...options.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((left, right) => left.label.localeCompare(right.label, language));
}

function formatExcludedCreatureFilters(config) {
  const groups = [
    [config.sizeFilterMode, getSelectedFilterLabels("size", config.excludedSizes)],
    [config.typeFilterMode, getSelectedFilterLabels("type", config.excludedTypes)]
  ].filter(([, labels]) => labels.length > 0)
    .map(([mode, labels]) => `${mode === "include" ? (language === "en" ? "Only" : "Solo") : (language === "en" ? "Exclude" : "Excluir")}: ${labels.join(", ")}`);
  return groups.length ? groups.join(" · ") : (language === "en" ? "None" : "Ninguno");
}

function getSelectedFilterLabels(kind, selectedValues) {
  const labels = new Map(getCreatureFilterOptions(kind).map((option) => [option.key, option.label]));
  return (Array.isArray(selectedValues) ? selectedValues : []).map((key) => labels.get(key) || key.replace(/-/g, " "));
}

function getConfigurationDraft(form) {
  const data = new FormData(form);
  return {
    ...state.room.config,
    crMin: data.get("crMin"),
    crMax: data.get("crMax"),
    excludedSizes: data.getAll("excludedSizes"),
    excludedTypes: data.getAll("excludedTypes"),
    sizeFilterMode: data.get("sizeFilterMode"),
    typeFilterMode: data.get("typeFilterMode")
  };
}

function refreshConfigurationFilters(form) {
  if (!form) return;
  const config = getConfigurationDraft(form);
  const grid = form.querySelector(".ml-exclusion-grid");
  if (grid) {
    grid.innerHTML = `${renderCreatureFilterGroup("size", language === "en" ? "Creature sizes" : "Tamaños de criatura", getCreatureFilterOptions("size", config.crMin, config.crMax), config.excludedSizes, config.sizeFilterMode)}${renderCreatureFilterGroup("type", language === "en" ? "Creature types" : "Tipos de criatura", getCreatureFilterOptions("type", config.crMin, config.crMax), config.excludedTypes, config.typeFilterMode)}`;
  }
  updateConfigurationEligibleCount(form);
}

function updateConfigurationEligibleCount(form) {
  const output = form?.querySelector("[data-ml-eligible-count]");
  if (output) output.textContent = getEligibleMonsters(state.catalog, getConfigurationDraft(form)).length.toLocaleString(language);
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
          <dl><div><dt>Equipos</dt><dd>${room.config.teamSize} criaturas</dd></div><div><dt>Oro inicial</dt><dd>${room.config.startingGold}</dd></div><div><dt>Rango</dt><dd>CR ${room.config.crMin}–${room.config.crMax}</dd></div><div><dt>Subasta</dt><dd>${room.config.bidSeconds} s</dd></div><div><dt>Idioma</dt><dd>${room.language === "en" ? "English" : "Español"}</dd></div><div><dt>Filtros</dt><dd>${escapeHtml(formatExcludedCreatureFilters(room.config))}</dd></div></dl>
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
            ${result?.automatic ? `<small class="ml-lot-summary__automatic">ASIGNACIÓN AUTOMÁTICA</small>` : ""}
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
  const automaticFallback = state.room.players.find((entry) => entry.id === lot.automaticFallbackPlayerId);
  const canBid = player.roster.length < state.room.config.teamSize && lot.highBidPlayerId !== player.id;
  const nextBid = lot.currentBid + 1;
  const maxBid = getMonstersLeagueMaxBid(state.room, player.id);
  const fallbackCopy = automaticFallback
    ? (state.room.language === "en"
        ? `Bid to claim it, or let it be automatically assigned to ${escapeHtml(automaticFallback.name)}.`
        : `Puja para quedártela o deja que se asigne automáticamente a ${escapeHtml(automaticFallback.name)}.`)
    : "";

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
      ${fallbackCopy ? `<p class="ml-bid-board__fallback">${fallbackCopy}</p>` : ""}
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
  const viewedPlayer = getViewedTeamPlayer(room);
  const teamCombatants = getMasterTeamCombatants(viewedPlayer)
    .filter(({ combatant }) => Math.max(0, Number(combatant.pgAct) || 0) > 0);
  const selectedItem = teamCombatants.find((item) => item.selectionId === state.selectedMonsterId || item.monsterId === state.selectedMonsterId)
    || teamCombatants.find((item) => item.isOwned)
    || teamCombatants[0];
  const entry = selectedItem?.isOwned ? selectedItem.monster : null;
  const projection = room?.mapProjection;
  const mapOpen = projection?.open === true && projection.editorState;
  const activeId = getLeagueActiveCombatantId();
  const selectedCombatant = selectedItem?.combatant || null;
  const entitySize = `${Math.round(masterWorkspaceLayout.entityRatio * 10000) / 100}%`;
  const listSize = `${Math.round(masterWorkspaceLayout.listRatio * 10000) / 100}%`;
  const detailSize = `${Math.round(masterWorkspaceLayout.detailRatio * 10000) / 100}%`;
  const diceHistory = getVisibleDiceRollHistory();

  if (selectedItem && state.selectedMonsterId !== selectedItem.selectionId) {
    state.selectedMonsterId = selectedItem.selectionId;
  }

  return `
    <main class="ml-team-page ml-team-page--master" style="--team-color:${escapeHtml(viewedPlayer.color)}">
      <section class="panel panel--table combat-tracker-panel master-combat-workspace-panel ml-master-view-panel">
        <div class="section-heading master-combat-workspace-panel__heading ml-master-view-heading">
          <div class="ml-master-view-heading__identity">
            <img src="${escapeHtml(appIconUrl)}" alt="" aria-hidden="true">
            <div><small>MONSTERS LEAGUE</small><strong>${language === "en" ? "Master view · My monsters" : "Vista master · Mis monstruos"}</strong><span>${escapeHtml(viewedPlayer.name)} · ${viewedPlayer.roster.length} ${language === "en" ? "creatures" : "criaturas"}</span></div>
          </div>
          <div class="ml-team-header__actions">
            ${localTestMode ? `<label>${language === "en" ? "View team" : "Ver equipo"}<select data-ml-team-select>${room.players.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === viewedPlayer.id ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("")}</select></label>` : ""}
            ${renderSharedCampaignConnectionStatus()}
            ${room.hostPlayerId === state.hostPlayerId ? `<button class="ml-button ml-button--primary" type="button" data-ml-action="enter-combat">${room.status === "combat" ? (language === "en" ? "Combat live" : "Combate en vivo") : (language === "en" ? "Start combat" : "Iniciar combate")}</button>` : `<span class="ml-live-dot">${room.status === "combat" ? "LIVE" : (language === "en" ? "WAITING FOR HOST" : "ESPERANDO AL HOST")}</span>`}
          </div>
        </div>
        <div class="master-combat-workspace" data-master-combat-workspace style="--master-entity-size:${entitySize};--master-list-size:${listSize};--master-detail-size:${detailSize}">
          <section class="master-combat-workspace__left">
            <aside class="master-combat-workspace__entities">
              <header class="master-combat-workspace__panel-heading">
                <div><small>${language === "en" ? "YOUR TEAM" : "TU EQUIPO"}</small><strong>${language === "en" ? "Entities" : "Entidades"}</strong></div>
                <div class="master-combat-workspace__turn-controls">
                  <button class="master-combat-workspace__entity-add" type="button" disabled title="${language === "en" ? "Controlled by host" : "Controlado por el anfitrión"}" aria-label="${language === "en" ? "Add entity" : "Añadir entidad"}">+</button>
                  <button class="combat-map-initiative-control" type="button" disabled title="${language === "en" ? "Controlled by host" : "Controlado por el anfitrión"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-2v16h2V4Zm-4.5 1.5-10 6.5 10 6.5v-13Z" /></svg></button>
                  <span class="round-chip round-chip--button combat-map-initiative-round">R${escapeHtml(String(Math.max(1, Number(room.combatMeta?.round) || 1)))}</span>
                  <button class="combat-map-initiative-control" type="button" disabled title="${language === "en" ? "Controlled by host" : "Controlado por el anfitrión"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h2v16H5V4Zm4.5 1.5 10 6.5-10 6.5v-13Z" /></svg></button>
                </div>
              </header>
              <div class="master-combat-workspace__entity-list" data-ml-master-entity-list>
                ${teamCombatants.length
                  ? teamCombatants.map((item) => renderMasterTeamEntityCard(viewedPlayer, item, item.selectionId === state.selectedMonsterId, item.combatant.id === activeId)).join("")
                  : `<div class="master-combat-workspace__empty"><strong>${language === "en" ? "No creatures" : "Sin criaturas"}</strong></div>`}
              </div>
            </aside>
            <div class="master-combat-workspace__splitter master-combat-workspace__splitter--horizontal" data-master-workspace-resize="entities" role="separator" aria-orientation="horizontal" tabindex="0"></div>
            <aside class="master-combat-workspace__dice">
              ${renderDiceRollerDock({
                open: true,
                draft: state.diceRollerDraft,
                error: state.diceRollerError,
                history: diceHistory,
                appIconUrl,
                language,
                isPopout: true,
                helpOpen: state.diceRollerHelpOpen,
                hitDiceMode: state.diceRollerHitDiceMode,
                rollMode: state.diceRollerRollMode,
                modifier: state.diceRollerModifier,
                diceTrayOpen: state.diceRollerDiceTrayOpen
              })}
            </aside>
          </section>
          <div class="master-combat-workspace__splitter master-combat-workspace__splitter--vertical" data-master-workspace-resize="list" role="separator" aria-orientation="vertical" tabindex="0"></div>
          <section class="master-combat-workspace__sheet">
            <header class="master-combat-workspace__panel-heading"><div><small>${selectedCombatant?.id === activeId ? (language === "en" ? "CURRENT TURN" : "TURNO ACTUAL") : (language === "en" ? "SELECTION" : "SELECCIÓN")}</small><strong>${escapeHtml(entry?.name || (language === "en" ? "Creature sheet" : "Ficha de criatura"))}</strong></div></header>
            <div class="master-combat-workspace__sheet-scroll" data-ml-master-sheet-scroll data-ml-master-sheet-key="${escapeHtml(entry?.id || "")}">
              ${entry ? renderMasterTeamCreaturePreview(entry) : `<div class="master-combat-workspace__empty"><strong>${language === "en" ? "Private rival sheet" : "Ficha rival privada"}</strong><p>${language === "en" ? "Only public combat data is visible." : "Solo se muestran los datos públicos de combate."}</p></div>`}
            </div>
          </section>
          <div class="master-combat-workspace__splitter master-combat-workspace__splitter--vertical" data-master-workspace-resize="detail" role="separator" aria-orientation="vertical" tabindex="0"></div>
          <section class="master-combat-workspace__map" aria-label="${language === "en" ? "Master map editor" : "Editor de mapa máster"}">
            <div class="master-combat-workspace__map-host" data-ml-master-map>
              ${mapOpen ? `<div data-combat-map-mirror-host></div>` : `<div class="ml-map-waiting" role="status"><i></i><strong>${language === "en" ? "Waiting for host" : "Esperando al anfitrión"}</strong></div>`}
            </div>
          </section>
        </div>
      </section>
    </main>
  `;
}

function getViewedTeamPlayer(room = state.room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  if (localTestMode) {
    return players.find((player) => player.id === state.selectedTeamPlayerId) || players[0];
  }
  const userId = cleanText(state.session?.user?.id || state.hostPlayerId);
  return players.find((player) => cleanText(player.userId || player.id) === userId) || players[0];
}

function getMasterTeamCombatants(player) {
  if (!player) return [];
  const userId = cleanText(player.userId || player.id);
  const teamId = cleanText(player.id);
  const projection = getPlayerVisibleCombatants().length
    ? getPlayerVisibleCombatants()
      .filter((combatant) => cleanText(combatant.iniactiva) !== "")
      .sort((left, right) => Number(right.iniactiva || 0) - Number(left.iniactiva || 0)
        || getProjectedStandSortValue(left) - getProjectedStandSortValue(right))
    : [];
  const positionById = new Map(projection.map((combatant, index) => [cleanText(combatant.id), index + 1]));
  const rosterByMonsterId = new Map(player.roster.map((award) => [cleanText(award.monster.id), award]));

  return projection.map((combatant, index) => {
    const monsterId = cleanText(combatant.multiplayerMonsterId || combatant.id);
    const isOwned = cleanText(combatant.teamOwnerUserId) === userId || cleanText(combatant.teamId) === teamId;
    const award = isOwned ? rosterByMonsterId.get(monsterId) : null;
    const monster = award
      ? state.catalogById.get(award.monster.id) || award.monster
      : {
          id: monsterId,
          name: cleanText(combatant.nombre) || (language === "en" ? "Rival creature" : "Criatura rival"),
          tokenUrl: cleanText(combatant.tokenUrl)
        };
    const live = isOwned && award
      ? getLiveMonster(player.id, monster)
      : {
          maxHp: Number(combatant.pgMax) || 0,
          currentHp: Number(combatant.pgAct) || 0,
          tempHp: Number(combatant.pgTemp) || 0,
          necrotic: Number(combatant.necrotic) || 0,
          conditions: getProjectedStatusNames(combatant),
          initiative: combatant.iniactiva,
          standNumber: combatant.numPeana
        };
    return {
      monsterId,
      selectionId: cleanText(combatant.id) || monsterId,
      isOwned,
      monster,
      live,
      combatant,
      initiativePosition: positionById.get(cleanText(combatant.id)) || index + 1
    };
  }).sort((left, right) => Number(right.combatant.iniactiva || 0) - Number(left.combatant.iniactiva || 0)
    || left.initiativePosition - right.initiativePosition);
}

function renderMasterTeamEntityCard(player, item, selected, active) {
  const { monster, live, combatant } = item;
  const effectiveMax = Math.max(0, Number(live.maxHp || combatant.pgMax) - Number(live.necrotic || combatant.necrotic));
  const currentHp = Math.max(0, Number(live.currentHp ?? combatant.pgAct) || 0);
  const tempHp = Math.max(0, Number(live.tempHp ?? combatant.pgTemp) || 0);
  const hpPercent = effectiveMax > 0 ? Math.max(0, Math.min(100, currentHp / effectiveMax * 100)) : 0;
  const statusNames = Array.isArray(live.conditions) ? live.conditions : getProjectedStatusNames(combatant);
  const tokenUrl = cleanText(monster.tokenUrl || monster.imageUrl || combatant.tokenUrl);
  const hpLabel = language === "en" ? "HP" : "PG";
  const standNumber = cleanText(combatant.numPeana || live.standNumber) || "-";
  const hidesHealth = combatant.hideHealth === true;
  const teamColor = /^#[0-9a-f]{6}$/i.test(cleanText(combatant.teamColor || player?.color))
    ? cleanText(combatant.teamColor || player?.color)
    : "#d9ab5d";
  const hpText = hidesHealth ? (language === "en" ? "HP hidden" : "PG ocultos") : `${currentHp}/${effectiveMax} ${hpLabel}${tempHp ? ` · +${tempHp}` : ""}`;

  return `
    <button class="master-combat-entity has-team-color ${hidesHealth ? "is-rival-private" : ""} ${selected ? "is-selected" : ""} ${active ? "is-active-turn" : ""} ${statusNames.length ? "has-statuses" : ""}" style="--team-color:${escapeHtml(teamColor)}" type="button" data-ml-action="select-monster" data-monster-id="${escapeHtml(item.selectionId)}" data-combat-turn-token-context="${escapeHtml(combatant.id)}" aria-pressed="${selected}">
      <span class="master-combat-entity__initiative" title="${language === "en" ? "Stand" : "Peana"}">${escapeHtml(standNumber)}</span>
      <span class="master-combat-entity__portrait">
        ${tokenUrl ? `<img src="${escapeHtml(tokenUrl)}" alt="" loading="lazy" decoding="async">` : `<span>${escapeHtml(getInitials(monster.name))}</span>`}
        ${active ? `<i title="${language === "en" ? "Current turn" : "Turno actual"}"></i>` : ""}
      </span>
      <span class="master-combat-entity__copy">
        <span class="master-combat-entity__title"><strong>${escapeHtml(monster.name)}</strong></span>
        <strong class="master-combat-entity__hp-label">${escapeHtml(hpText)}</strong>
        ${hidesHealth ? "" : `<span class="master-combat-entity__health"><i style="width:${hpPercent}%"></i></span>`}
      </span>
      ${statusNames.length ? `<span class="master-combat-entity__statuses" aria-label="${language === "en" ? "Conditions" : "Estados"}">${statusNames.map((statusName) => {
        const iconUrl = getCombatStatusIconUrl(statusName);
        const fallback = cleanText(statusName).slice(0, 2).toUpperCase() || "?";
        return `<span class="master-combat-entity__status ${escapeHtml(getProjectedStatusTone(statusName))}" title="${escapeHtml(statusName)}">${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : escapeHtml(fallback)}</span>`;
      }).join("")}</span>` : ""}
    </button>
  `;
}

function renderMasterTeamCreaturePreview(entry) {
  const sections = [
    entry.traits ? { title: t("section_traits"), content: entry.traits } : null,
    entry.actions ? { title: t("section_actions"), content: entry.actions } : null
  ].filter(Boolean);
  const defenses = [
    { label: t("chip_damage_vulnerabilities"), value: entry.damageVulnerabilities },
    { label: t("chip_damage_resistances"), value: entry.damageResistances },
    { label: t("chip_damage_immunities"), value: entry.damageImmunities },
    { label: t("chip_condition_immunities"), value: entry.conditionImmunities }
  ].filter((item) => item.value);
  const sizeLabel = language === "en" ? "SIZE" : "TAMAÑO";
  const sourceLabel = entry.sourceFullName || entry.source || (language === "en" ? "Unknown source" : "Sin fuente");
  const crLabel = entry.crBaseLabel || entry.crLabel || "-";

  return `
    <div class="combat-token-preview combat-token-preview--floating ml-master-creature-preview">
      <div class="combat-token-preview__header">
        <div><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(sourceLabel)}</span></div>
        <div class="combat-token-preview__header-meta"><small>CR ${escapeHtml(crLabel)}</small><span>${escapeHtml(sizeLabel)}: ${escapeHtml(entry.size || "-")}</span></div>
      </div>
      <div class="combat-token-preview__metrics">
        ${detailRenderers.renderBestiaryMetric("CA", entry.ac || "-")}
        ${detailRenderers.renderBestiaryMetric(t("metric_speed"), entry.speed || "-")}
      </div>
      <div class="combat-token-preview__abilities">${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ability) => detailRenderers.renderBestiaryAbility(entry, ability)).join("")}</div>
      ${defenses.length ? `<div class="combat-token-preview__defenses">${defenses.map((item) => detailRenderers.renderDetailChip(item.label, item.value)).join("")}</div>` : ""}
      ${renderMonsterSpellbook(entry)}
      <div class="combat-token-preview__sections">
        ${sections.length ? sections.map((section) => detailRenderers.renderBestiarySection(section.title, section.content, { linkSpells: true })).join("") : `<section class="detail-section"><h4>${language === "en" ? "Traits" : "Rasgos"}</h4><p>${language === "en" ? "No traits or actions listed." : "Sin rasgos o acciones indicados."}</p></section>`}
      </div>
    </div>
  `;
}

function renderMasterLiveOverview(player, entry) {
  const live = getLiveMonster(player.id, entry);
  const effectiveMax = Math.max(0, live.maxHp - live.necrotic);
  const hpPercent = effectiveMax > 0 ? Math.max(0, Math.min(100, live.currentHp / effectiveMax * 100)) : 0;
  return `
    <section class="ml-master-live-overview">
      <div class="ml-health-numbers"><strong>${live.currentHp}</strong><span>/ ${effectiveMax} PV</span>${live.tempHp ? `<b>+${live.tempHp} temp</b>` : ""}</div>
      <div class="ml-health-bar"><i style="width:${hpPercent}%"></i></div>
      <div class="ml-live-metrics"><article><span>CA</span><strong>${entry.acValue || "—"}</strong></article><article><span>${language === "en" ? "Initiative" : "Iniciativa"}</span><strong>${escapeHtml(String(live.initiative || "—"))}</strong></article><article><span>${language === "en" ? "Stand" : "Peana"}</span><strong>${escapeHtml(String(live.standNumber || "—"))}</strong></article></div>
      <section class="ml-condition-list"><span>${language === "en" ? "Conditions" : "Estados"}</span><div>${live.conditions.length ? live.conditions.map((condition) => `<b>${escapeHtml(condition)}</b>`).join("") : `<small>${language === "en" ? "No active conditions" : "Sin estados activos"}</small>`}</div></section>
    </section>
  `;
}

function renderCombatMapBroadcast() {
  const projection = state.room?.mapProjection;
  const open = projection?.open === true && projection.editorState;
  const expanded = state.mapBroadcastExpanded === true;
  const waitingLabel = language === "en" ? "Waiting for host" : "Esperando al anfitri\u00f3n";
  return `
    <section class="ml-map-broadcast ${open ? "is-live" : "is-waiting"} ${expanded ? "is-expanded" : "is-collapsed"}">
      <header><div><p class="ml-eyebrow">MAPA DE COMBATE</p><h2>${language === "en" ? "Player view" : "Vista de jugador"}</h2></div><div class="ml-map-broadcast__actions">${open ? `<span class="ml-live-dot">LIVE</span>` : ""}<button class="ml-button ml-map-toggle" type="button" data-ml-action="toggle-map-broadcast" aria-expanded="${expanded}"><span>MAPA</span><i aria-hidden="true">${expanded ? "▲" : "▼"}</i></button></div></header>
      ${expanded ? (open
        ? `<div class="ml-map-projection" data-ml-map-projection></div>`
        : `<div class="ml-map-waiting" role="status"><i></i><strong>${waitingLabel}</strong></div>`) : ""}
    </section>
  `;
}

function syncMasterMapSurface() {
  const root = app.querySelector("[data-ml-master-map]");
  const projection = state.room?.mapProjection;
  const canEdit = localTestMode || state.room?.hostPlayerId === state.hostPlayerId;
  if (!root) return;
  if (!root.querySelector("[data-combat-map-mirror-host]") && canEdit) {
    root.innerHTML = '<div data-combat-map-mirror-host></div>';
  }
  const turnButtons = app.querySelectorAll(".master-combat-workspace__turn-controls .combat-map-initiative-control");
  if (turnButtons[0]) {
    turnButtons[0].disabled = getLeagueTurnCombatants().length === 0;
    turnButtons[0].dataset.mlAction = "retreat-turn";
  }
  if (turnButtons[1]) {
    turnButtons[1].disabled = getLeagueTurnCombatants().length === 0;
    turnButtons[1].dataset.mlAction = "advance-turn";
  }
  if (!root.querySelector("[data-combat-map-mirror-host]")) return;
  if (projection?.open === true && projection.editorState) {
    playerMapController.applySave(projection.editorState, { preserveLocalView: true });
  }
  playerMapController.syncMirror(root);
}

function publishLeagueMasterMapChange(editorState) {
  if (!state.room || (!localTestMode && state.room.hostPlayerId !== state.hostPlayerId)) return;
  const dataUrl = cleanText(editorState?.map?.imageUrl).startsWith("data:") ? editorState.map.imageUrl : "";
  state.room.mapProjection = {
    ...(state.room.mapProjection || {}),
    open: true,
    editorState,
    combatants: state.room.mapProjection?.combatants?.length
      ? state.room.mapProjection.combatants
      : createLeagueRosterCombatants(),
    activeCombatantId: getLeagueActiveCombatantId()
  };
  if (localTestMode) return;
  if (dataUrl) {
    uploadLeagueMapDataUrl(editorState, dataUrl);
    return;
  }
  window.clearTimeout(state.mapPublishTimer);
  state.mapPublishTimer = window.setTimeout(() => {
    sendOnlineCommand("combat-update", {
      combatState: state.room.combatState,
      combatMeta: state.room.combatMeta,
      mapProjection: state.room.mapProjection,
      baseCombatRevision: state.room.combatRevision
    });
  }, 80);
}

function uploadLeagueMapDataUrl(editorState, dataUrl) {
  if (state.mapUploadSource === dataUrl && state.mapUploadPromise) return state.mapUploadPromise;
  state.mapUploadSource = dataUrl;
  state.mapUploadPromise = fetch(dataUrl)
    .then((response) => response.blob())
    .then((blob) => uploadCloudImage(blob, {
      width: Number(editorState?.map?.width) || 1600,
      height: Number(editorState?.map?.height) || 900
    }))
    .then((result) => {
      const uploadedUrl = rewriteMonstersLeagueAssetUrl(result?.asset?.url, state.room?.id);
      if (!uploadedUrl) throw new Error("Map upload returned no shared URL.");
      const nextEditorState = structuredClone(editorState);
      nextEditorState.map.imageUrl = uploadedUrl;
      state.mapUploadSource = "";
      state.mapUploadPromise = null;
      playerMapController.applySave(nextEditorState, { preserveLocalView: true });
      publishLeagueMasterMapChange(nextEditorState);
      syncMasterMapSurface();
      return nextEditorState;
    })
    .catch((error) => {
      state.mapUploadPromise = null;
      state.error = error?.message || "Map could not be shared.";
      render();
      return null;
    });
  return state.mapUploadPromise;
}

function observeCombatFeedback(room) {
  const roomId = cleanText(room?.id);
  if (state.combatFeedbackRoomId !== roomId) {
    state.combatFeedbackRoomId = roomId;
    state.combatFeedbackInitialized = false;
    state.seenCombatFeedbackIds.clear();
  }

  const feedback = Array.isArray(room?.combatFeedback) ? room.combatFeedback : [];
  const initialized = state.combatFeedbackInitialized;
  state.combatFeedbackInitialized = true;
  for (const entry of feedback) {
    const feedbackId = cleanText(entry?.id);
    if (!feedbackId || state.seenCombatFeedbackIds.has(feedbackId)) continue;
    state.seenCombatFeedbackIds.add(feedbackId);
    if (!initialized) continue;
    const combatant = (room?.mapProjection?.combatants || []).find((candidate) => (
      cleanText(candidate.teamId) === cleanText(entry.teamId)
      && cleanText(candidate.multiplayerMonsterId) === cleanText(entry.monsterId)
    ));
    if (!combatant) continue;
    const kind = cleanText(entry.kind) || "info";
    playerMapController.showTokenFeedback({
      combatantId: combatant.id,
      kind,
      text: cleanText(entry.text),
      iconUrl: kind.startsWith("status-")
        ? getCombatStatusIconUrl(cleanText(entry.statusName))
        : getCombatMiniActionIconUrl(kind)
    });
  }
  while (state.seenCombatFeedbackIds.size > 300) {
    state.seenCombatFeedbackIds.delete(state.seenCombatFeedbackIds.values().next().value);
  }
}

function getPlayerVisibleCombatants() {
  const projected = state.room?.mapProjection?.combatants || [];
  const combatants = projected.length ? projected : createLeagueRosterCombatants();
  const combatState = state.room?.combatState || {};
  const viewerUserId = cleanText(state.session?.user?.id || state.hostPlayerId);
  const viewerPlayer = getViewedTeamPlayer(state.room);

  return combatants.map((combatant) => ({
    ...projectMonstersLeagueCombatantForPlayer(
      mergeMonstersLeagueProjectedCombatantLiveState(combatant, combatState),
      viewerUserId,
      viewerPlayer?.id
    ),
    side: cleanText(combatant.teamId) === cleanText(viewerPlayer?.id) ? "allies" : "enemies"
  }));
}

function createLeagueRosterCombatants() {
  const room = state.room;
  if (!room) return [];
  const viewerTeamId = cleanText(getViewedTeamPlayer(room)?.id);
  return (room.players || []).flatMap((player) => (player.roster || []).map((award, monsterIndex) => {
    const monster = state.catalogById.get(award.monster?.id) || award.monster || {};
    const live = room.combatState?.[player.id]?.[monster.id] || {};
    const maxHp = Math.max(1, Number(live.maxHp) || Number(monster.hpValue) || 1);
    const currentHp = live.currentHp === undefined ? maxHp : Math.max(0, Number(live.currentHp) || 0);
    return {
      id: `ml-${player.id}-${monster.id}`,
      nombre: cleanText(monster.name) || "Creature",
      tokenUrl: cleanText(monster.tokenUrl || monster.imageUrl),
      side: cleanText(player.id) === viewerTeamId ? "allies" : "enemies",
      teamId: player.id,
      teamOwnerUserId: cleanText(player.userId || player.id),
      teamColor: cleanText(player.color),
      multiplayerOnline: !localTestMode,
      multiplayerRoomId: room.id,
      multiplayerMonsterId: monster.id,
      pgMax: maxHp,
      pgAct: currentHp,
      pgTemp: Number(live.tempHp) || 0,
      necrotic: Number(live.necrotic) || 0,
      condiciones: Array.isArray(live.conditions) ? live.conditions.join(", ") : "",
      iniactiva: cleanText(live.initiative),
      numPeana: cleanText(live.standNumber) || String(monsterIndex + 1),
      acValue: Number(monster.acValue) || 0,
      tamano: cleanText(monster.size),
      isFlying: live.isFlying === true,
      flyingHeight: Number(live.flyingHeight) || 0,
      mapTokenSize: cleanText(live.mapTokenSize)
    };
  }));
}

function getLeagueCombatantKey(combatant) {
  const teamId = cleanText(combatant?.teamId);
  const monsterId = cleanText(combatant?.multiplayerMonsterId);
  return teamId && monsterId ? `${teamId}:${monsterId}` : "";
}

function getLeagueActiveCombatantId() {
  const key = cleanText(state.room?.combatMeta?.activeMonsterKey);
  const combatant = getPlayerVisibleCombatants().find((entry) => getLeagueCombatantKey(entry) === key);
  return cleanText(combatant?.id || state.room?.mapProjection?.activeCombatantId);
}

function getLeagueTurnCombatants() {
  return getPlayerVisibleCombatants()
    .filter((combatant) => cleanText(combatant.iniactiva) !== "" && Number(combatant.pgAct) > 0 && combatant.hiddenFromInitiative !== true)
    .sort((left, right) => Number(right.iniactiva || 0) - Number(left.iniactiva || 0)
      || getProjectedStandSortValue(left) - getProjectedStandSortValue(right)
      || cleanText(left.nombre).localeCompare(cleanText(right.nombre), "es", { numeric: true, sensitivity: "base" }));
}

function changeLeagueTurn(direction) {
  if (!state.room || !getLeagueTurnCombatants().length) return;
  state.room.combatMeta = advanceMonstersLeagueCombatTurn(state.room.combatState, state.room.combatMeta, direction);
  const activeId = getLeagueActiveCombatantId();
  state.room.mapProjection = { ...(state.room.mapProjection || {}), activeCombatantId: activeId };
  observeCombatTurn(state.room);
  if (!localTestMode) sendOnlineCommand("combat-turn", { direction: Number(direction) < 0 ? -1 : 1 });
  render();
}

function renderProjectedInitiativeOrder(_viewportWindow, layout = {}) {
  const activeId = getLeagueActiveCombatantId();
  const combatants = getPlayerVisibleCombatants()
    .filter((combatant) => {
      if (cleanText(combatant.iniactiva) === "") return false;
      return combatant.side === "allies" || Number(combatant.pgAct) > 0;
    })
    .sort((left, right) => Number(right.iniactiva || 0) - Number(left.iniactiva || 0)
      || getProjectedStandSortValue(left) - getProjectedStandSortValue(right)
      || cleanText(left.nombre).localeCompare(cleanText(right.nombre), "es", { numeric: true, sensitivity: "base" }));
  const scale = layout.count === combatants.length ? layout.scale : getProjectedTurnTokenScale(combatants.length);
  const columns = layout.count === combatants.length ? layout.columns : 1;
  return `<div class="combat-map-initiative-order-inner"><div class="combat-turn-strip" style="--turn-token-scale:${scale};--initiative-columns:${columns};--turn-strip-count:${combatants.length}" aria-label="${language === "en" ? "Initiative order" : "Orden de iniciativa"}">${combatants.map((combatant) => renderProjectedTurnToken(combatant, combatant.id === activeId, { showHealth: layout.showHealth !== false })).join("") || `<p class="combat-turn-panel__empty">${language === "en" ? "No visible creatures in initiative." : "No hay entidades visibles para el turno."}</p>`}</div></div>`;
}

function renderProjectedTurnToken(combatant, isActive, options = {}) {
  const initiativeIconUrl = getCombatToolbarActionIconUrl("initiative");
  const side = ["allies", "enemies", "neutral"].includes(combatant.side) ? combatant.side : "enemies";
  const hidesRivalStats = combatant.hideHealth === true;
  const hidesHealth = hidesRivalStats || options.showHealth === false;
  const statusNames = hidesRivalStats ? [] : getProjectedStatusNames(combatant).slice(0, 3);
  const isFallenAlly = side === "allies" && Number(combatant.pgAct) < 1;
  const isHidden = combatant.hiddenFromInitiative === true || statusNames.some((name) => normalizeSearchText(name) === "invisible");
  const label = cleanText(combatant.nombre) || (language === "en" ? "Unnamed" : "Sin nombre");
  const standNumber = cleanText(combatant.numPeana);

  return `<div class="combat-turn-token-wrap ${isActive ? "is-active" : ""} ${isFallenAlly ? "is-fallen-ally" : ""} ${isHidden ? "is-hidden-from-initiative" : ""} ${hidesHealth ? "is-health-hidden" : ""}" title="${escapeHtml(label)} | ${language === "en" ? "Init" : "Inic"} ${escapeHtml(String(combatant.iniactiva ?? ""))}">
    <span class="combat-turn-token__initiative" data-tooltip="${language === "en" ? "Combat initiative" : "Iniciativa en el combate"}"><img class="combat-turn-token__initiative-icon" src="${escapeHtml(initiativeIconUrl)}" alt="" decoding="async" aria-hidden="true"><span>${escapeHtml(String(combatant.iniactiva ?? "-"))}</span></span>
    <div class="combat-turn-token combat-turn-token--${side}">${combatant.tokenUrl ? `<img src="${escapeHtml(combatant.tokenUrl)}" alt="" loading="lazy" decoding="async" aria-hidden="true">` : `<span class="combat-turn-token__placeholder" aria-hidden="true">${escapeHtml(getInitials(label))}</span>`}${side === "enemies" && standNumber ? `<span class="combat-turn-token__stand">${escapeHtml(standNumber)}</span>` : ""}</div>
    <div class="combat-turn-token__statuses">${statusNames.map(renderProjectedTurnStatus).join("")}</div>
  </div>`;
}

function renderProjectedTurnStatus(statusName) {
  const iconUrl = getCombatStatusIconUrl(statusName);
  const label = cleanText(statusName);
  const fallback = label.slice(0, 2).toUpperCase() || "?";
  return `<span class="combat-turn-token__status-wrap" tabindex="0" aria-label="${escapeHtml(label)}"><span class="combat-turn-token__status ${getProjectedStatusTone(statusName)}" aria-hidden="true">${iconUrl ? `<img class="combat-turn-token__status-icon" src="${escapeHtml(iconUrl)}" alt="" decoding="async">` : `<span class="combat-turn-token__status-fallback">${escapeHtml(fallback)}</span>`}</span><span class="combat-turn-token__status-tooltip" role="tooltip"><strong>${escapeHtml(label)}</strong></span></span>`;
}

function getProjectedStatusNames(combatant) {
  return [...new Set(cleanText(combatant?.condiciones).split(/[,;|]/).map(cleanText).filter(Boolean))];
}

function getProjectedStatusTone(statusName) {
  const key = normalizeSearchText(statusName).replace(/\s+\d+$/u, "");
  const tones = {
    agarrado: "grappled", agotamiento: "exhaustion", apresado: "restrained", asustado: "frightened",
    aturdido: "stunned", cegado: "blinded", ciego: "blinded", concentrado: "concentrating",
    derribado: "prone", dormido: "sleeping", ensordecido: "deafened", envenenado: "poisoned",
    hechizado: "charmed", incapacitado: "incapacitated", inconsciente: "unconscious", invisible: "invisible",
    paralizado: "paralyzed", petrificado: "petrified", restringido: "restrained", restrenido: "restrained",
    ardiendo: "burning", maldito: "cursed", sangrando: "bleeding"
  };
  return `combat-status-chip--${tones[key] || "default"}`;
}

function getProjectedStandSortValue(combatant) {
  const value = Number.parseFloat(cleanText(combatant.numPeana).replace(",", "."));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function getProjectedTurnTokenScale(turnCount) {
  if (turnCount <= 16) return 1;
  if (turnCount <= 20) return 0.88;
  if (turnCount <= 24) return 0.76;
  return 0.66;
}

function observeCombatTurn(room) {
  const projection = room?.mapProjection;
  const round = Math.max(1, Math.floor(Number(room?.combatMeta?.round) || 1));
  const previousRound = state.lastCombatRound;
  state.lastCombatRound = round;
  if (previousRound && round !== previousRound) playerMapController.showRoundAnnouncement(round);
  const activeKey = cleanText(room?.combatMeta?.activeMonsterKey);
  const activeCombatant = getPlayerVisibleCombatants().find((entry) => getLeagueCombatantKey(entry) === activeKey)
    || (projection?.combatants || []).find((entry) => cleanText(entry.id) === cleanText(projection?.activeCombatantId));
  const activeId = cleanText(activeCombatant?.id || projection?.activeCombatantId);
  if (activeId === state.lastActiveCombatantId) return;
  state.lastActiveCombatantId = activeId;
  if (!activeId) return;
  const combatant = activeCombatant;
  const currentUserId = cleanText(state.session?.user?.id || state.hostPlayerId);
  const currentPlayer = room.players?.find((player) => player.userId === currentUserId || player.id === currentUserId);
  if (!combatant) return;
  const ownsCombatant = combatant.teamOwnerUserId === currentUserId || combatant.teamId === currentPlayer?.id;
  if (ownsCombatant) state.selectedMonsterId = cleanText(combatant.multiplayerMonsterId) || state.selectedMonsterId;
  playerMapController.showTurnAnnouncement(combatant);
}

function renderTurnFlash() {
  if (!state.turnFlash && !state.roundFlash) return "";
  const roundAnnouncement = state.roundFlash
    ? `<div class="combat-map-turn-announcement combat-map-turn-announcement--round" role="status" aria-live="assertive"><div><small>${language === "en" ? "NEW ROUND" : "NUEVA RONDA"}</small><strong>${language === "en" ? "ROUND" : "RONDA"} ${escapeHtml(String(state.roundFlash.round))}</strong></div></div>`
    : "";
  let turnAnnouncement = "";
  if (state.turnFlash) {
    const portrait = state.turnFlash.tokenUrl
      ? `<img src="${escapeHtml(state.turnFlash.tokenUrl)}" alt="" aria-hidden="true">`
      : `<span aria-hidden="true">${escapeHtml(getInitials(state.turnFlash.name))}</span>`;
    const standNumber = state.turnFlash.standNumber
      ? `<b class="combat-map-turn-announcement__stand" title="${language === "en" ? "Stand" : "Peana"}">${escapeHtml(state.turnFlash.standNumber)}</b>`
      : "";
    const conditions = state.turnFlash.conditions.length
      ? `<div class="combat-map-turn-announcement__statuses">${state.turnFlash.conditions.map((condition) => {
          const iconUrl = getCombatStatusIconUrl(condition);
          const fallback = cleanText(condition).slice(0, 2).toUpperCase() || "?";
          return `<span class="combat-map-turn-announcement__status ${escapeHtml(getProjectedStatusTone(condition))}">${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : `<i>${escapeHtml(fallback)}</i>`}<strong>${escapeHtml(condition)}</strong></span>`;
        }).join("")}</div>`
      : "";
    turnAnnouncement = `<div class="combat-map-turn-announcement" role="status" aria-live="assertive"><div class="combat-map-turn-announcement__portrait-wrap"><div class="combat-map-turn-announcement__portrait">${portrait}</div>${standNumber}</div><div><small>${language === "en" ? "NOW IT IS THE TURN OF" : "AHORA ES EL TURNO DE"}</small><strong>${escapeHtml(state.turnFlash.name)}</strong>${conditions}</div></div>`;
  }
  return `<div class="ml-combat-announcement-stack">${roundAnnouncement}${turnAnnouncement}</div>`;
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

function renderLeagueDiceTargetMenu() {
  const menu = state.diceTargetMenu;
  if (!menu?.kind || !cleanText(menu.formula)) return "";
  const targets = getPlayerVisibleCombatants().filter((combatant) => Number(combatant.pgAct) > 0);
  const isAttack = menu.kind === COMBAT_DICE_TARGET_ATTACK;
  const title = isAttack
    ? (language === "en" ? "Choose attack target" : "Elige objetivo del ataque")
    : (language === "en" ? "Choose damage target" : "Elige objetivo del daño");
  const subtitle = isAttack
    ? (language === "en" ? "Roll and compare against Armor Class" : "Lanza y compara con la Clase de Armadura")
    : (language === "en" ? "Roll and apply damage immediately" : "Lanza y aplica el daño inmediatamente");
  return `<aside class="master-combat-dice-target-menu" style="${escapeHtml(getLeagueDiceTargetMenuStyle(targets.length))}" data-ml-dice-target-menu role="dialog" aria-label="${escapeHtml(title)}">
    <header class="master-combat-dice-target-menu__header"><div><small>${isAttack ? "ATTACK" : "DAMAGE"}</small><strong>${escapeHtml(title)}</strong></div><code>${escapeHtml(menu.formula)}</code><span>${escapeHtml(subtitle)}</span></header>
    <div class="master-combat-dice-target-menu__list">${targets.length ? targets.map((combatant) => renderLeagueDiceTargetCard(combatant, isAttack)).join("") : `<p class="master-combat-dice-target-menu__empty">${language === "en" ? "No combat entities available." : "No hay entidades de combate disponibles."}</p>`}</div>
  </aside>`;
}

function getLeagueDiceTargetMenuStyle(targetCount = 0) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  const padding = 12;
  const headerHeight = 132;
  const rowHeight = 72;
  const availableHeight = Math.max(rowHeight, viewportHeight - padding * 2 - headerHeight);
  const rowCount = Math.max(1, Math.min(Math.max(1, targetCount), Math.floor(availableHeight / rowHeight)));
  const columnCount = Math.max(1, Math.ceil(Math.max(1, targetCount) / rowCount));
  const menuWidth = Math.min(
    Math.max(0, viewportWidth - padding * 2),
    Math.max(368, columnCount * 288 + (columnCount - 1) * 8 + 26)
  );
  const menuHeight = Math.min(viewportHeight - padding * 2, headerHeight + rowCount * rowHeight);
  const rawX = Math.round(Number(state.diceTargetMenu?.x) || 0);
  const rawY = Math.round(Number(state.diceTargetMenu?.y) || 0);
  const left = Math.max(padding, Math.min(rawX, viewportWidth - menuWidth - padding));
  const top = Math.max(padding, Math.min(rawY, viewportHeight - menuHeight - padding));
  return `left:${left}px;top:${top}px;width:${menuWidth}px;max-height:${menuHeight}px;--target-columns:${columnCount};--target-rows:${rowCount};`;
}

function renderLeagueDiceTargetCard(combatant, isAttack) {
  const name = cleanText(combatant.nombre) || (language === "en" ? "Creature" : "Criatura");
  const stand = cleanText(combatant.numPeana) || "-";
  const portrait = cleanText(combatant.tokenUrl);
  const showArmorClass = isAttack && combatant.hideHealth !== true;
  const button = (extra, label, className = "") => `<button class="master-combat-dice-target-card__mode ${className}" type="button" data-ml-action="resolve-dice-target" data-combatant-id="${escapeHtml(combatant.id)}" ${extra}>${label}</button>`;
  return `<article class="master-combat-dice-target-card">
    <button class="master-combat-dice-target-card__select" type="button" data-ml-action="resolve-dice-target" data-combatant-id="${escapeHtml(combatant.id)}"><span class="master-combat-dice-target-card__portrait">${portrait ? `<img src="${escapeHtml(portrait)}" alt="">` : `<span>${escapeHtml(getInitials(name))}</span>`}</span><span class="master-combat-dice-target-card__copy"><strong>${escapeHtml(name)}</strong><small>${language === "en" ? "Stand" : "Peana"} ${escapeHtml(stand)}${showArmorClass ? ` · AC ${escapeHtml(String(combatant.acValue || "-"))}` : ""}</small></span></button>
    <span class="master-combat-dice-target-card__controls ${isAttack ? "" : "master-combat-dice-target-card__controls--damage"}">${isAttack
      ? `${button('data-target-roll-mode="advantage"', language === "en" ? "Advantage" : "Ventaja", "master-combat-dice-target-card__mode--advantage")}${button('data-target-roll-mode="disadvantage"', language === "en" ? "Disadvantage" : "Desventaja", "master-combat-dice-target-card__mode--disadvantage")}`
      : `${button('data-target-critical="true"', "x2", "master-combat-dice-target-card__mode--critical")}${button('data-target-half-damage="true"', "1/2", "master-combat-dice-target-card__mode--half")}${button('data-target-necrotic-damage="true"', `<span aria-hidden="true">${renderLeagueMiniActionIcon("necrotic")}</span>`, "master-combat-dice-target-card__mode--necrotic")}`}</span>
  </article>`;
}

function renderLeagueMiniActionIcon(kind) {
  const iconUrl = getCombatMiniActionIconUrl(kind);
  return iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : "✦";
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
  let closedDiceTargetMenu = false;
  if (state.diceTargetMenu && !event.target.closest?.("[data-ml-dice-target-menu], .dice-formula-link")) {
    state.diceTargetMenu = null;
    closedDiceTargetMenu = true;
    app.querySelector("[data-ml-dice-target-menu]")?.remove();
  }
  if (event.target.closest?.("[data-combat-turn-quick-menu]")) {
    handleLeagueCombatQuickMenuClick(event);
    return;
  }
  if (event.target.closest?.("[data-combat-map-master-root]")) {
    playerMapController.handleClick(event);
    return;
  }
  if (handleMasterDiceClick(event)) return;
  const target = event.target.closest("[data-ml-action]");

  if (!target) {
    const nativeSpellLink = event.target.closest("[data-arcanum-entry-id]");
    if (nativeSpellLink) {
      state.selectedSpellId = nativeSpellLink.dataset.arcanumEntryId;
      render();
    }
    else if (closedDiceTargetMenu) render();
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
    else if (action === "resolve-dice-target") {
      resolveLeagueDiceTarget(target.dataset.combatantId, {
        rollMode: target.dataset.targetRollMode,
        critical: target.dataset.targetCritical === "true",
        halfDamage: target.dataset.targetHalfDamage === "true",
        necroticDamage: target.dataset.targetNecroticDamage === "true"
      });
      return;
    }
    else if (action === "open-spell") state.selectedSpellId = target.dataset.spellId;
    else if (action === "close-spell") state.selectedSpellId = "";
    else if (action === "toggle-map-broadcast") state.mapBroadcastExpanded = !state.mapBroadcastExpanded;
    else if (action === "retreat-turn") { changeLeagueTurn(-1); return; }
    else if (action === "advance-turn") { changeLeagueTurn(1); return; }
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
  if (event.target.closest?.("[data-combat-turn-quick-menu]")) {
    handleLeagueCombatQuickMenuChange(event);
    return;
  }
  if (event.target.closest?.("[data-combat-map-master-root]")) {
    playerMapController.handleChange(event);
    return;
  }
  const configForm = event.target.closest?.("[data-ml-config-form]");
  if (configForm && event.target.matches('[name="sizeFilterMode"], [name="typeFilterMode"]')) {
    refreshConfigurationFilters(configForm);
    return;
  }
  if (configForm && event.target.matches('[name="excludedSizes"], [name="excludedTypes"]')) {
    updateConfigurationEligibleCount(configForm);
    return;
  }
  if (event.target.matches("[data-ml-team-select]")) {
    state.selectedTeamPlayerId = event.target.value;
    state.selectedMonsterId = "";
    render();
  }
}

function handleInput(event) {
  if (event.target.closest?.("[data-combat-turn-quick-menu]")) {
    handleLeagueCombatQuickMenuInput(event);
    return;
  }
  if (event.target.closest?.("[data-combat-map-master-root]")) {
    playerMapController.handleInput(event);
    return;
  }
  if (event.target.matches("[data-dice-roller-input]")) {
    state.diceRollerDraft = event.target.value;
    state.diceRollerError = "";
    return;
  }
  if (event.target.matches("[data-dice-roller-modifier]")) {
    state.diceRollerModifier = event.target.value;
    state.diceRollerError = "";
    return;
  }
  if (event.target.matches('[data-ml-config-form] [name="crMin"], [data-ml-config-form] [name="crMax"]')) {
    refreshConfigurationFilters(event.target.closest("[data-ml-config-form]"));
    return;
  }
  if (event.target.matches("[data-ml-monster-search]")) {
    state.search = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = app.querySelector("[data-ml-monster-search]");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }
}

function handleMapWheel(event) {
  if (event.target.closest?.("[data-combat-map-master-root]")) playerMapController.handleWheel(event);
}

function handleMapScroll(event) {
  if (event.target.closest?.("[data-combat-map-master-root]")) playerMapController.handleViewportScroll(event);
}

function handleSubmit(event) {
  ensureAudioContext();
  if (event.target.matches("[data-dice-roller-form]")) {
    event.preventDefault();
    submitMasterDiceFormula(event.target.querySelector("[data-dice-roller-input]")?.value ?? state.diceRollerDraft);
    return;
  }
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
      excludedTypes: form.getAll("excludedTypes"),
      sizeFilterMode: form.get("sizeFilterMode"),
      typeFilterMode: form.get("typeFilterMode")
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

function handleMasterDiceClick(event) {
  const button = event.target.closest?.("[data-action]");
  if (!button?.closest(".master-combat-workspace, .ml-spell-dialog__panel")) return false;
  const action = cleanText(button.dataset.action);

  if (action === "toggle-dice-roller-help") {
    state.diceRollerHelpOpen = !state.diceRollerHelpOpen;
  } else if (action === "clear-dice-roller-history") {
    for (const roll of getVisibleDiceRollHistory()) {
      if (roll?.id) state.dismissedDiceRollIds.add(roll.id);
    }
  } else if (action === "toggle-dice-roller-hit-dice") {
    state.diceRollerHitDiceMode = !state.diceRollerHitDiceMode;
  } else if (action === "toggle-dice-roller-tray") {
    state.diceRollerDiceTrayOpen = !state.diceRollerDiceTrayOpen;
  } else if (action === "toggle-dice-roller-roll-mode") {
    const mode = cleanText(button.dataset.diceRollMode);
    state.diceRollerRollMode = state.diceRollerRollMode === mode ? "" : mode;
  } else if (action === "reroll-last-dice-formula") {
    const roll = getVisibleDiceRollHistory().at(-1);
    if (roll) submitMasterDiceFormula(roll.formula, { applyModifier: false, hitDiceMode: roll.hitDiceMode, rollMode: roll.rollMode });
    return true;
  } else if (action === "roll-dice-formula") {
    submitMasterDiceFormula(button.dataset.diceFormula);
    return true;
  } else if (action === "submit-dice-formula") {
    submitMasterDiceFormula(state.diceRollerDraft);
    return true;
  } else {
    return false;
  }

  event.preventDefault();
  render();
  return true;
}

function getVisibleDiceRollHistory() {
  return (Array.isArray(state.room?.diceRollHistory) ? state.room.diceRollHistory : [])
    .filter((roll) => !state.dismissedDiceRollIds.has(cleanText(roll?.id)));
}

function submitMasterDiceFormula(formula, options = {}) {
  const source = cleanText(formula);

  try {
    const resolvedFormula = options.applyModifier === false
      ? source
      : appendMasterDiceModifier(source, state.diceRollerModifier);
    const result = rollDiceFormula(resolvedFormula, {
      hitDiceMode: options.hitDiceMode ?? state.diceRollerHitDiceMode,
      rollMode: options.rollMode ?? state.diceRollerRollMode
    });
    const targetContext = options.targetContext || null;
    const targetOutcome = targetContext
      ? getCombatDiceTargetOutcome(targetContext.kind, result.total, targetContext.armorClass, {
          criticalOutcome: result.criticalOutcome,
          halfDamage: targetContext.halfDamage === true,
          isAlly: targetContext.isAlly === true
        })
      : null;
    const user = state.session?.user || {};
    const roll = {
      id: `ml-dice-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      formula: result.normalizedFormula,
      total: result.total,
      groups: result.groups,
      hitDiceMode: result.hitDiceMode,
      rollMode: result.rollMode,
      criticalOutcome: result.criticalOutcome,
      rolledAt: Date.now(),
      userId: cleanText(user.id || state.hostPlayerId),
      userName: cleanText(user.name || user.email) || (language === "en" ? "Player" : "Jugador"),
      ...(targetContext ? {
        targetKind: targetOutcome.kind,
        targetCombatantId: cleanText(targetContext.combatantId),
        targetName: cleanText(targetContext.name),
        targetStand: cleanText(targetContext.stand),
        targetArmorClass: targetContext.hideArmorClass === true ? null : targetOutcome.armorClass,
        targetArmorClassHidden: targetContext.hideArmorClass === true,
        targetHit: targetOutcome.hit,
        appliedDamage: targetOutcome.appliedDamage,
        targetCriticalDamage: targetContext.criticalDamage === true,
        targetHalfDamage: targetContext.halfDamage === true,
        targetNecroticDamage: targetContext.necroticDamage === true
      } : {})
    };
    state.room.diceRollHistory = [
      ...(Array.isArray(state.room.diceRollHistory) ? state.room.diceRollHistory : []).filter((entry) => entry.id !== roll.id),
      roll
    ].slice(-100);
    if (!localTestMode) sendOnlineCommand("dice-roll", { roll });
    if (targetContext?.kind === COMBAT_DICE_TARGET_DAMAGE) {
      applyLeagueTargetDamage(targetContext, targetOutcome.appliedDamage);
    }
    state.diceRollerDraft = "";
    state.diceRollerError = "";
    state.diceRollerRollMode = "";
    state.diceRollerModifier = "+0";
  } catch (error) {
    state.diceRollerDraft = source;
    state.diceRollerError = formatMasterDiceError(error);
  }

  render();
}

function resolveLeagueDiceTarget(combatantId, options = {}) {
  const target = getPlayerVisibleCombatants().find((combatant) => combatant.id === cleanText(combatantId));
  const menu = state.diceTargetMenu;
  if (!target || !menu?.kind) return;
  const isCritical = menu.kind === COMBAT_DICE_TARGET_DAMAGE && options.critical === true;
  const formula = isCritical ? doubleDiceInFormula(menu.formula) : menu.formula;
  const requestedMode = cleanText(options.rollMode);
  state.diceTargetMenu = null;
  submitMasterDiceFormula(formula, {
    rollMode: ["advantage", "disadvantage"].includes(requestedMode) ? requestedMode : state.diceRollerRollMode,
    targetContext: {
      kind: menu.kind,
      combatantId: target.id,
      name: target.nombre,
      stand: target.numPeana,
      armorClass: Number.isFinite(Number(target.acValue)) ? Number(target.acValue) : null,
      hideArmorClass: target.hideHealth === true,
      criticalDamage: isCritical,
      halfDamage: options.halfDamage === true,
      necroticDamage: options.necroticDamage === true,
      isAlly: target.side === "allies"
    }
  });
}

function applyLeagueTargetDamage(targetContext, amount) {
  const target = getPlayerVisibleCombatants().find((combatant) => combatant.id === targetContext.combatantId);
  const teamId = cleanText(target?.teamId);
  const monsterId = cleanText(target?.multiplayerMonsterId);
  const damage = Math.max(0, Number(amount) || 0);
  const nextState = applyMonstersLeagueCombatDamage(state.room?.combatState, {
    teamId,
    monsterId,
    amount: damage,
    necroticDamage: targetContext.necroticDamage === true
  });
  if (!target || !nextState) return;
  state.room.combatState = nextState;
  if (!localTestMode) {
    sendOnlineCommand("combat-damage", {
      teamId,
      monsterId,
      amount: damage,
      necroticDamage: targetContext.necroticDamage === true
    });
  }
}

function openLeagueCombatQuickMenu(combatantId, x, y, owner = "map-master") {
  const combatant = getPlayerVisibleCombatants().find((entry) => entry.id === cleanText(combatantId));
  if (!combatant) return;
  state.combatQuickMenu = {
    combatantId: combatant.id,
    owner: cleanText(owner) || "map-master",
    x: Number(x) || 0,
    y: Number(y) || 0,
    value: "",
    statusQuery: ""
  };
}

function renderLeagueCombatQuickMenu(viewportWindow = window, owner = "map-master") {
  const menu = state.combatQuickMenu;
  if (!menu || cleanText(menu.owner) !== cleanText(owner)) return "";
  const combatant = getPlayerVisibleCombatants().find((entry) => entry.id === cleanText(menu.combatantId));
  if (!combatant) return "";
  const width = 330;
  const left = Math.max(8, Math.min(Number(menu.x) || 8, (viewportWindow.innerWidth || window.innerWidth) - width - 8));
  const top = Math.max(8, Math.min(Number(menu.y) || 8, (viewportWindow.innerHeight || window.innerHeight) - 480));
  const statuses = getProjectedStatusNames(combatant);
  const damageIcon = getCombatMiniActionIconUrl("damage");
  const healIcon = getCombatMiniActionIconUrl("heal");
  const necroticIcon = getCombatMiniActionIconUrl("necrotic");
  const tempIcon = getCombatMiniActionIconUrl("temp");
  return `<div class="combat-turn-quick-menu" style="position:fixed;left:${left}px;top:${top}px;z-index:10000" data-combat-turn-quick-menu>
    <div class="combat-turn-quick-menu__panel">
      <div class="combat-turn-quick-menu__header"><div class="combat-turn-quick-menu__title"><strong>${escapeHtml(combatant.nombre || "Creature")}</strong><b>${escapeHtml(cleanText(combatant.numPeana) || "-")}</b></div><span>${combatant.hideHealth ? (language === "en" ? "Rival data hidden" : "Datos rivales ocultos") : `${language === "en" ? "HP" : "PG"} ${Math.max(0, Number(combatant.pgAct) || 0)}/${Math.max(0, Number(combatant.pgMax) - Number(combatant.necrotic || 0))}`}</span></div>
      <div class="combat-turn-quick-menu__flight"><label class="combat-turn-quick-menu__hide"><input type="checkbox" data-ml-context-field="isFlying" ${combatant.isFlying ? "checked" : ""}><span>${language === "en" ? "Flying" : "Volando"}</span></label><label class="combat-turn-quick-menu__flight-height"><span>${language === "en" ? "Height" : "Altura"}</span><input type="number" min="0" step="5" value="${Math.max(0, Number(combatant.flyingHeight) || 0)}" data-ml-context-field="flyingHeight"><span>ft</span></label></div>
      <div class="combat-turn-quick-menu__identity-fields"><label><span>${language === "en" ? "Initiative" : "Iniciativa"}</span><input value="${escapeHtml(cleanText(combatant.iniactiva))}" data-ml-context-field="initiative"></label><label><span>${language === "en" ? "Stand" : "Peana"}</span><input value="${escapeHtml(cleanText(combatant.numPeana))}" data-ml-context-field="standNumber"></label></div>
      <div class="resource-cell__actions-row combat-turn-quick-menu__actions-row"><div class="inline-adjust inline-adjust--group combat-turn-quick-menu__controls"><input class="mini-input combat-turn-quick-menu__input" type="text" inputmode="text" placeholder="0 or 2d6" value="${escapeHtml(menu.value)}" data-combat-turn-quick-value><div class="mini-actions combat-turn-quick-menu__actions">
        ${renderLeagueQuickResourceButton("damage", damageIcon, language === "en" ? "Damage" : "Daño")}
        ${renderLeagueQuickResourceButton("heal", healIcon, language === "en" ? "Heal" : "Curar")}
        ${renderLeagueQuickResourceButton("necrotic", necroticIcon, language === "en" ? "Necrotic" : "Necrótico")}
        ${renderLeagueQuickResourceButton("temp", tempIcon, language === "en" ? "Temporary HP" : "PG temporales")}
      </div></div></div>
      <section class="combat-turn-quick-menu__statuses"><strong>${language === "en" ? "Conditions" : "Estados"}</strong>${statuses.length ? `<div class="combat-turn-quick-menu__active-statuses">${statuses.map((status) => `<button class="combat-turn-quick-menu__status is-active ${escapeHtml(getProjectedStatusTone(status))}" type="button" data-ml-context-action="remove-status" data-status="${escapeHtml(status)}"><span>${escapeHtml(status)}</span><b aria-hidden="true">×</b></button>`).join("")}</div>` : ""}<div class="combat-turn-quick-menu__custom-status"><input type="search" maxlength="80" value="${escapeHtml(menu.statusQuery)}" data-ml-context-status placeholder="${language === "en" ? "Type a condition" : "Escribe un estado"}"><button type="button" data-ml-context-action="add-status">${language === "en" ? "Add" : "Añadir"}</button></div></section>
    </div></div>`;
}

function renderLeagueQuickResourceButton(mode, iconUrl, label) {
  return `<button class="mini-action mini-action--${escapeHtml(mode)}" type="button" data-ml-context-action="resource" data-mode="${escapeHtml(mode)}" title="${escapeHtml(label)}"><span class="mini-action__icon" aria-hidden="true">${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : ""}</span></button>`;
}

function handleLeagueCombatQuickMenuClick(event) {
  const button = event.target.closest("[data-ml-context-action]");
  if (!button) return;
  event.preventDefault();
  const combatant = getLeagueQuickMenuCombatant();
  if (!combatant) return;
  const owner = cleanText(state.combatQuickMenu?.owner);
  const action = button.dataset.mlContextAction;
  if (action === "resource") applyLeagueQuickResource(combatant, button.dataset.mode);
  if (action === "remove-status") patchLeagueCombatant(combatant, { conditions: getProjectedStatusNames(combatant).filter((status) => status !== button.dataset.status) });
  if (action === "add-status") {
    const value = cleanText(button.closest("[data-combat-turn-quick-menu]")?.querySelector("[data-ml-context-status]")?.value);
    if (value) patchLeagueCombatant(combatant, { conditions: [...new Set([...getProjectedStatusNames(combatant), value])] });
  }
  syncLeagueCombatQuickMenuSurface(owner);
}

function handleLeagueCombatQuickMenuChange(event) {
  const field = cleanText(event.target.dataset.mlContextField);
  const combatant = getLeagueQuickMenuCombatant();
  if (!field || !combatant) return;
  const owner = cleanText(state.combatQuickMenu?.owner);
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  patchLeagueCombatant(combatant, { [field]: value });
  syncLeagueCombatQuickMenuSurface(owner);
}

function handleLeagueCombatQuickMenuInput(event) {
  if (!state.combatQuickMenu) return;
  if (event.target.matches("[data-combat-turn-quick-value]")) state.combatQuickMenu.value = event.target.value;
  if (event.target.matches("[data-ml-context-status]")) state.combatQuickMenu.statusQuery = event.target.value;
}

function handleLeagueCombatQuickMenuKeydown(event) {
  if (event.key === "Escape") {
    const owner = cleanText(state.combatQuickMenu?.owner);
    state.combatQuickMenu = null;
    syncLeagueCombatQuickMenuSurface(owner);
  } else if (event.key === "Enter" && event.target.matches("[data-ml-context-status]")) {
    event.preventDefault();
    const owner = cleanText(state.combatQuickMenu?.owner);
    const combatant = getLeagueQuickMenuCombatant();
    const value = cleanText(event.target.value);
    if (combatant && value) patchLeagueCombatant(combatant, { conditions: [...new Set([...getProjectedStatusNames(combatant), value])] });
    syncLeagueCombatQuickMenuSurface(owner);
  }
}

function syncLeagueCombatQuickMenuSurface(owner = cleanText(state.combatQuickMenu?.owner)) {
  if (owner === "main") render();
  else playerMapController.sync();
}

function getLeagueQuickMenuCombatant() {
  return getPlayerVisibleCombatants().find((entry) => entry.id === cleanText(state.combatQuickMenu?.combatantId));
}

function applyLeagueQuickResource(combatant, mode) {
  const source = cleanText(state.combatQuickMenu?.value);
  if (!source) return;
  if (["damage", "necrotic"].includes(mode)) {
    state.combatQuickMenu = null;
    submitMasterDiceFormula(source, {
      applyModifier: false,
      targetContext: {
        kind: COMBAT_DICE_TARGET_DAMAGE,
        combatantId: combatant.id,
        name: combatant.nombre,
        stand: combatant.numPeana,
        armorClass: Number.isFinite(Number(combatant.acValue)) ? Number(combatant.acValue) : null,
        necroticDamage: mode === "necrotic",
        isAlly: combatant.side === "allies"
      }
    });
    return;
  }
  let amount;
  try { amount = Math.max(0, Number(rollDiceFormula(source).total) || 0); } catch { return; }
  const effectiveMax = Math.max(0, Number(combatant.pgMax) - Number(combatant.necrotic || 0));
  if (mode === "heal") patchLeagueCombatant(combatant, { currentHp: Math.min(effectiveMax, Number(combatant.pgAct) + amount) });
  if (mode === "temp") patchLeagueCombatant(combatant, { tempHp: Math.max(Number(combatant.pgTemp) || 0, amount) });
  state.combatQuickMenu.value = "";
}

function patchLeagueCombatant(combatant, patch) {
  const teamId = cleanText(combatant?.teamId);
  const monsterId = cleanText(combatant?.multiplayerMonsterId);
  const nextState = applyMonstersLeagueCombatantPatch(state.room?.combatState, { teamId, monsterId, patch });
  if (!nextState) return false;
  state.room.combatState = nextState;
  if (!localTestMode) sendOnlineCommand("combat-patch", { teamId, monsterId, patch });
  return true;
}

function appendMasterDiceModifier(formula, modifierSource) {
  const modifierText = cleanText(modifierSource) || "+0";
  if (!/^[+-]?\d+$/.test(modifierText)) {
    throw new DiceFormulaError("invalid-modifier", "Modifier must be a signed integer.");
  }
  const modifier = Number(modifierText);
  if (!Number.isSafeInteger(modifier)) {
    throw new DiceFormulaError("invalid-modifier", "Modifier must be a safe integer.");
  }
  return modifier === 0 ? formula : `(${formula})${modifier > 0 ? `+${modifier}` : modifier}`;
}

function formatMasterDiceError(error) {
  if (error instanceof DiceFormulaError) {
    const messages = language === "en"
      ? { empty: "Enter a formula.", "invalid-modifier": "Modifier must be an integer." }
      : { empty: "Introduce una fórmula.", "invalid-modifier": "El modificador debe ser un entero." };
    return messages[error.code] || error.message;
  }
  return language === "en" ? "Could not roll that formula." : "No se pudo lanzar esa fórmula.";
}

function loadMasterWorkspaceLayout() {
  try {
    return normalizeMasterWorkspaceLayout(JSON.parse(localStorage.getItem(MASTER_WORKSPACE_LAYOUT_KEY) || "null"));
  } catch {
    return normalizeMasterWorkspaceLayout(null);
  }
}

function normalizeMasterWorkspaceLayout(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {
    entityRatio: Math.max(.25, Math.min(.75, Number(source.entityRatio) || .5)),
    listRatio: Math.max(.16, Math.min(.34, Number(source.listRatio) || .24)),
    detailRatio: Math.max(.18, Math.min(.4, Number(source.detailRatio) || .24))
  };
  normalized.detailRatio = Math.min(normalized.detailRatio, .7 - normalized.listRatio);
  return normalized;
}

function saveMasterWorkspaceLayout() {
  try { localStorage.setItem(MASTER_WORKSPACE_LAYOUT_KEY, JSON.stringify(masterWorkspaceLayout)); } catch {}
}

function handleMasterWorkspacePointerDown(event) {
  if (state.combatQuickMenu
    && !event.target.closest?.("[data-combat-turn-quick-menu]")) {
    const owner = cleanText(state.combatQuickMenu.owner);
    state.combatQuickMenu = null;
    if (owner === "main") app.querySelector("[data-combat-turn-quick-menu]")?.remove();
    else playerMapController.sync();
  }
  if (event.target.closest?.("[data-combat-map-master-root]")) {
    playerMapController.handlePointerDown(event);
    return;
  }
  const handle = event.target.closest?.("[data-master-workspace-resize]");
  if (!handle || event.button !== 0) return;
  const root = handle.closest("[data-master-combat-workspace]");
  if (!root) return;
  activeMasterWorkspaceResize = { pointerId: event.pointerId, kind: handle.dataset.masterWorkspaceResize, root, handle };
  handle.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-master-combat-workspace-resizing");
  document.body.style.cursor = activeMasterWorkspaceResize.kind === "entities" ? "row-resize" : "col-resize";
  event.preventDefault();
}

function handleMasterWorkspacePointerMove(event) {
  const resize = activeMasterWorkspaceResize;
  if (!resize) {
    playerMapController.handlePointerMove(event);
    return;
  }
  if (event.pointerId !== resize.pointerId) return;
  const rootRect = resize.root.getBoundingClientRect();
  if (resize.kind === "entities") {
    const leftRect = resize.root.querySelector(".master-combat-workspace__left")?.getBoundingClientRect();
    if (!leftRect) return;
    masterWorkspaceLayout.entityRatio = Math.max(.25, Math.min(.75, (event.clientY - leftRect.top) / Math.max(1, leftRect.height)));
  } else {
    const pointerRatio = (event.clientX - rootRect.left) / Math.max(1, rootRect.width);
    if (resize.kind === "list") {
      masterWorkspaceLayout.listRatio = Math.max(.16, Math.min(.34, pointerRatio, .7 - masterWorkspaceLayout.detailRatio));
    } else if (resize.kind === "detail") {
      masterWorkspaceLayout.detailRatio = Math.max(.18, Math.min(.4, pointerRatio - masterWorkspaceLayout.listRatio, .7 - masterWorkspaceLayout.listRatio));
    }
  }
  applyMasterWorkspaceLayout(resize.root);
  syncMasterMapSurface();
  event.preventDefault();
}

function handleMasterWorkspacePointerUp(event) {
  if (!activeMasterWorkspaceResize) {
    playerMapController.handlePointerUp(event);
    return;
  }
  if (event.pointerId !== activeMasterWorkspaceResize.pointerId) return;
  activeMasterWorkspaceResize.handle?.releasePointerCapture?.(activeMasterWorkspaceResize.pointerId);
  activeMasterWorkspaceResize = null;
  document.body.classList.remove("is-master-combat-workspace-resizing");
  document.body.style.cursor = "";
  saveMasterWorkspaceLayout();
  syncMasterMapSurface();
}

function handleMasterWorkspaceKeydown(event) {
  if (event.target.closest?.("[data-combat-turn-quick-menu]") && ["Escape", "Enter"].includes(event.key)) {
    handleLeagueCombatQuickMenuKeydown(event);
    return;
  }
  if (event.key === "Escape" && state.diceTargetMenu) {
    state.diceTargetMenu = null;
    render();
    return;
  }
  if (handleLeagueTurnShortcutKeydown(event)) return;
  if (event.target.closest?.("[data-combat-map-master-root]")) playerMapController.handleKeydown(event);
}

function handleLeagueTurnShortcutKeydown(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.target?.matches?.("input, select, textarea, [contenteditable='true']")) return false;
  const key = cleanText(event.key).toLowerCase();
  if (key !== "a" && key !== "d") return false;
  event.preventDefault();
  changeLeagueTurn(key === "a" ? -1 : 1);
  return true;
}

function handleMasterWorkspaceContextMenu(event) {
  const formulaButton = event.target.closest?.('[data-action="roll-dice-formula"][data-dice-formula]');
  if (formulaButton?.closest(".master-combat-workspace__sheet, .ml-spell-dialog__panel")) {
    event.preventDefault();
    state.diceTargetMenu = {
      formula: cleanText(formulaButton.dataset.diceFormula),
      kind: getCombatDiceTargetKind(formulaButton.textContent, formulaButton.dataset.diceFormula),
      x: event.clientX,
      y: event.clientY
    };
    render();
    return;
  }
  const entityCard = event.target.closest?.("[data-combat-turn-token-context]");
  if (entityCard && !entityCard.closest("[data-combat-map-master-root]")) {
    event.preventDefault();
    openLeagueCombatQuickMenu(entityCard.dataset.combatTurnTokenContext, event.clientX, event.clientY, "main");
    render();
    app.querySelector("[data-combat-turn-quick-value]")?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest?.("[data-combat-map-master-root]")) playerMapController.handleContextMenu(event);
}

function applyMasterWorkspaceLayout(root = app.querySelector("[data-master-combat-workspace]")) {
  if (!root) return;
  root.style.setProperty("--master-entity-size", `${masterWorkspaceLayout.entityRatio * 100}%`);
  root.style.setProperty("--master-list-size", `${masterWorkspaceLayout.listRatio * 100}%`);
  root.style.setProperty("--master-detail-size", `${masterWorkspaceLayout.detailRatio * 100}%`);
}

function captureMasterWorkspaceViewport() {
  const entityList = app.querySelector?.("[data-ml-master-entity-list]");
  const diceLog = app.querySelector?.(".master-combat-workspace__dice [data-dice-roller-log]");
  const sheet = app.querySelector?.("[data-ml-master-sheet-scroll]");
  if (entityList) masterWorkspaceViewport.entities = entityList.scrollTop;
  if (diceLog) masterWorkspaceViewport.dice = diceLog.scrollTop;
  const sheetKey = cleanText(sheet?.dataset.mlMasterSheetKey);
  if (sheet && sheetKey) masterSheetScrollPositions.set(sheetKey, sheet.scrollTop);
}

function restoreMasterWorkspaceViewport() {
  const entityList = app.querySelector?.("[data-ml-master-entity-list]");
  const diceLog = app.querySelector?.(".master-combat-workspace__dice [data-dice-roller-log]");
  const sheet = app.querySelector?.("[data-ml-master-sheet-scroll]");
  if (entityList) entityList.scrollTop = masterWorkspaceViewport.entities;
  if (diceLog) diceLog.scrollTop = masterWorkspaceViewport.dice;
  const sheetKey = cleanText(sheet?.dataset.mlMasterSheetKey);
  if (sheet && sheetKey) sheet.scrollTop = masterSheetScrollPositions.get(sheetKey) || 0;
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

  const now = getAuctionNow();
  const countdown = app.querySelector("[data-ml-countdown]");
  if (countdown) countdown.textContent = formatCountdown(getActiveDeadline(), now);
  const finalCountdown = app.querySelector("[data-ml-final-countdown]");
  if (finalCountdown) {
    const remainingSeconds = getMonstersLeagueRemainingSeconds(getActiveDeadline(), now);
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
  return state.room.currentLot?.deadlineAt || state.room.nominationDeadlineAt || getAuctionNow();
}

function getAuctionNow() {
  return localTestMode
    ? Date.now()
    : getMonstersLeagueClockNow(state.serverClockSample);
}

function formatCountdown(deadline, now = getAuctionNow()) {
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
    if (!state.encountersSent) sendEncountersToMainApp();
  } else {
    sendOnlineCommand("enter-combat");
  }
  ensureTestCombatState();
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

function renderSharedCampaignConnectionStatus() {
  if (localTestMode) {
    return `<span class="ml-shared-campaign-status">${language === "en" ? "LOCAL SAVE" : "GUARDADO LOCAL"}</span>`;
  }
  const connected = state.sharedCampaignConnectStatus === "connected" || state.campaignActivationSent;
  return `<span class="ml-shared-campaign-status ${connected ? "is-connected" : "is-connecting"}">${connected
    ? (language === "en" ? "SHARED SAVE CONNECTED" : "GUARDADO COMPARTIDO CONECTADO")
    : (language === "en" ? "CONNECTING SHARED SAVE" : "CONECTANDO GUARDADO COMPARTIDO")}</span>`;
}

function ensureSharedCampaignConnected() {
  const room = state.room;
  const campaignId = cleanText(room?.campaignId);
  if (localTestMode || !campaignId || !["complete", "combat"].includes(room?.status) || state.campaignActivationSent) {
    return state.sharedCampaignConnectPromise || Promise.resolve(null);
  }
  if (state.sharedCampaignConnectPromise) return state.sharedCampaignConnectPromise;

  window.clearTimeout(state.sharedCampaignConnectRetryTimer);
  state.sharedCampaignConnectStatus = "connecting";
  state.sharedCampaignConnectPromise = getCloudCampaignStatus(campaignId)
    .then((result) => {
      const campaign = result?.campaign;
      if (!campaign?.id) throw new Error("Shared campaign is not ready.");
      state.sharedCampaignConnectStatus = "connected";
      notifyMainAppCampaignActivation({ campaignId: campaign.id, campaignName: campaign.name });
      if (!state.loading) render();
      return campaign;
    })
    .catch(() => {
      state.sharedCampaignConnectStatus = "waiting";
      state.sharedCampaignConnectRetryTimer = window.setTimeout(ensureSharedCampaignConnected, 1500);
      return null;
    })
    .finally(() => {
      state.sharedCampaignConnectPromise = null;
    });
  return state.sharedCampaignConnectPromise;
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
  state.sharedCampaignConnectStatus = "connected";
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
