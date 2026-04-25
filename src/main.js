import { SOURCE_NAMES } from "./data/bestiarySources.js";
import { columns, initialCombatants } from "./data/combatTrackerData.js";
import { screens } from "./navigation/screens.js";
import { getCharacterClassIcon } from "./assets/characterClassIcons.js";
import appIconUrl from "../build-resources/icon.png";
const IS_FILE_PROTOCOL_RUNTIME = typeof window !== "undefined"
  ? /^file:$/i.test(String(window.location?.protocol || ""))
  : false;
const HAS_DESKTOP_EXTERNAL_ASSETS = typeof window !== "undefined"
  ? Boolean(window.mimicDice?.hasExternalAssetDirectory)
  : false;
const DESKTOP_ASSET_BASE_URL = typeof window !== "undefined"
  ? String(window.mimicDice?.assetBaseUrl || (IS_FILE_PROTOCOL_RUNTIME ? "mimic-assets://local" : "")).replace(/\/+$/, "")
  : "";
const BESTIARY_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Bestiary.csv` : "data/Bestiary.csv";
const BESTIARY_IMAGES_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/BestiaryImages.json` : "data/BestiaryImages.json";
const ITEMS_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Items.csv` : "data/Items.csv";
const ITEMS_IMAGES_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/ItemsImages.json` : "data/ItemsImages.json";
const SPELLS_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Spells.csv` : "data/Spells.csv";
const CAMPAIGN_META_STORAGE_KEY = "mimic-dice:campaign-meta:v1";
const CHARACTERS_STORAGE_KEY = "mimic-dice:characters:v1";
const CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY = "mimic-dice:character-skills:v1";
const ENCOUNTER_INVENTORY_STORAGE_KEY = "mimic-dice:encounter-inventory:v1";
const COMBAT_TRACKER_STORAGE_KEY = "mimic-dice:combat-tracker:v1";
const MANAGED_STORAGE_KEY_PREFIX = "mimic-dice:";
const DESKTOP_STORAGE_RESET_VERSION_KEY = "mimic-dice:desktop-storage-reset:v1";
const DESKTOP_BUILD_SIGNATURE_STORAGE_KEY = "mimic-dice:desktop-build-signature:v1";
const DESKTOP_STORAGE_RESET_VERSION = "2026-04-24-d";
const CAMPAIGN_FILE_SCHEMA = "mimic-dice:campaign";
const CAMPAIGN_FILE_VERSION = 1;
const CAMPAIGN_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
const COMBAT_TRACKER_SORT_DEFAULT_VERSION = 2;
const BESTIARY_RENDER_DEBOUNCE_MS = 160;
const BESTIARY_VIRTUAL_ROW_HEIGHT = 158;
const BESTIARY_VIRTUAL_OVERSCAN = 6;
const BESTIARY_VIRTUAL_DEFAULT_VIEWPORT = 760;
const ITEM_VIRTUAL_ROW_HEIGHT = 132;
const ITEM_VIRTUAL_OVERSCAN = 8;
const bestiaryRenderCache = {
  filteredEntries: new Map(),
  optionEntries: new Map(),
  visibleOptions: new Map(),
  suggestions: new Map(),
  rowHtml: new Map(),
  listHtml: new Map(),
  detailHtml: new Map(),
  staticOptions: {
    type: [],
    environment: [],
    crBase: [],
    source: [],
    names: []
  }
};

const blankFilters = Object.fromEntries(columns.map((column) => [column.key, ""]));
const blankInlineAdjustments = { pgAct: "", necrotic: "" };
const blankBestiaryFilters = {
  query: "",
  source: [],
  type: [],
  environment: [],
  crBase: []
};
const blankBestiaryFilterSearch = {
  source: "",
  type: "",
  environment: "",
  crBase: ""
};

const blankItemFilters = {
  query: "",
  source: [],
  rarity: [],
  type: [],
  attunement: ""
};
const blankItemFilterSearch = {
  source: "",
  rarity: "",
  type: ""
};
const ITEM_TYPE_GROUPS = [
  {
    value: "__item-type-weapon__",
    label: "Weapon",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("weapon")
  },
  {
    value: "__item-type-melee-weapon__",
    label: "Melee weapon",
    level: 1,
    matches: (type) => cleanText(type).toLowerCase().includes("melee weapon")
  },
  {
    value: "__item-type-ranged-weapon__",
    label: "Ranged weapon",
    level: 1,
    matches: (type) => cleanText(type).toLowerCase().includes("ranged weapon")
  },
  {
    value: "__item-type-simple-weapon__",
    label: "Simple weapon",
    level: 2,
    matches: (type) => cleanText(type).toLowerCase().includes("simple weapon")
  },
  {
    value: "__item-type-martial-weapon__",
    label: "Martial weapon",
    level: 2,
    matches: (type) => cleanText(type).toLowerCase().includes("martial weapon")
  },
  {
    value: "__item-type-armor__",
    label: "Armor",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("armor")
  },
  {
    value: "__item-type-heavy-armor__",
    label: "Heavy armor",
    level: 1,
    matches: (type) => cleanText(type).toLowerCase().includes("heavy armor")
  },
  {
    value: "__item-type-light-armor__",
    label: "Light armor",
    level: 1,
    matches: (type) => cleanText(type).toLowerCase().includes("light armor")
  },
  {
    value: "__item-type-medium-armor__",
    label: "Medium armor",
    level: 1,
    matches: (type) => cleanText(type).toLowerCase().includes("medium armor")
  },
  {
    value: "__item-type-ammunition__",
    label: "Ammunition",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("ammunition")
  },
  {
    value: "__item-type-shield__",
    label: "Shield",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("shield")
  },
  {
    value: "__item-type-adventuring-gear__",
    label: "Adventuring gear",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().startsWith("adventuring gear")
  },
  {
    value: "__item-type-vehicle__",
    label: "Vehicle",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("vehicle")
  },
  {
    value: "__item-type-instrument__",
    label: "Instrument",
    level: 0,
    matches: (type) => cleanText(type).toLowerCase().includes("instrument")
  }
];
const ITEM_TYPE_GROUP_CHILDREN = {
  "__item-type-weapon__": [
    "__item-type-melee-weapon__",
    "__item-type-ranged-weapon__",
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-melee-weapon__": [
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-ranged-weapon__": [
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-armor__": [
    "__item-type-heavy-armor__",
    "__item-type-light-armor__",
    "__item-type-medium-armor__"
  ]
};
const blankArcanumFilters = {
  query: "",
  source: [],
  level: [],
  school: [],
  class: [],
  castingTime: [],
  concentration: ""
};
const blankArcanumFilterSearch = {
  source: "",
  level: "",
  school: "",
  class: "",
  castingTime: ""
};
const arcanumFilterLabels = {
  source: "fuentes",
  level: "niveles",
  school: "escuelas",
  class: "clases",
  castingTime: "velocidades"
};

const app = document.querySelector("#app");
const statKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const characterAbilityKeys = ["str", "dex", "con", "int", "wis", "cha"];
const characterStatBlocks = {
  str: { label: "Fuerza", skills: [{ id: "athletics", label: "Atletismo" }] },
  dex: { label: "Destreza", skills: [
    { id: "acrobatics", label: "Acrobacias" },
    { id: "sleightOfHand", label: "Juego de manos" },
    { id: "stealth", label: "Sigilo" }
  ] },
  con: { label: "Constitucion", skills: [] },
  int: { label: "Inteligencia", skills: [
    { id: "arcana", label: "Arcano" },
    { id: "history", label: "Historia" },
    { id: "investigation", label: "Investigacion" },
    { id: "nature", label: "Naturaleza" },
    { id: "religion", label: "Religion" }
  ] },
  wis: { label: "Sabiduria", skills: [
    { id: "animalHandling", label: "Trato animal" },
    { id: "insight", label: "Perspicacia" },
    { id: "medicine", label: "Medicina" },
    { id: "perception", label: "Percepcion" },
    { id: "survival", label: "Supervivencia" }
  ] },
  cha: { label: "Carisma", skills: [
    { id: "deception", label: "Engano" },
    { id: "intimidation", label: "Intimidacion" },
    { id: "performance", label: "Interpretacion" },
    { id: "persuasion", label: "Persuasion" }
  ] }
};
const characterLevelProgression = [
  { level: 1, experiencePoints: 0, proficiencyBonus: 2 },
  { level: 2, experiencePoints: 300, proficiencyBonus: 2 },
  { level: 3, experiencePoints: 900, proficiencyBonus: 2 },
  { level: 4, experiencePoints: 2700, proficiencyBonus: 2 },
  { level: 5, experiencePoints: 6500, proficiencyBonus: 3 },
  { level: 6, experiencePoints: 14000, proficiencyBonus: 3 },
  { level: 7, experiencePoints: 23000, proficiencyBonus: 3 },
  { level: 8, experiencePoints: 34000, proficiencyBonus: 3 },
  { level: 9, experiencePoints: 48000, proficiencyBonus: 4 },
  { level: 10, experiencePoints: 64000, proficiencyBonus: 4 },
  { level: 11, experiencePoints: 85000, proficiencyBonus: 4 },
  { level: 12, experiencePoints: 100000, proficiencyBonus: 4 },
  { level: 13, experiencePoints: 120000, proficiencyBonus: 5 },
  { level: 14, experiencePoints: 140000, proficiencyBonus: 5 },
  { level: 15, experiencePoints: 165000, proficiencyBonus: 5 },
  { level: 16, experiencePoints: 195000, proficiencyBonus: 5 },
  { level: 17, experiencePoints: 225000, proficiencyBonus: 6 },
  { level: 18, experiencePoints: 265000, proficiencyBonus: 6 },
  { level: 19, experiencePoints: 305000, proficiencyBonus: 6 },
  { level: 20, experiencePoints: 355000, proficiencyBonus: 6 }
];
const characterSkillLevelProgression = [
  { level: 1, label: "Suertudo", bonus: 1, experiencePoints: 4 },
  { level: 2, label: "Novato", bonus: 2, experiencePoints: 6 },
  { level: 3, label: "Junior", bonus: 3, experiencePoints: 8 },
  { level: 4, label: "Instructor", bonus: 4, experiencePoints: 10 },
  { level: 5, label: "Senior", bonus: 5, experiencePoints: 12 },
  { level: 6, label: "Experto", bonus: 6, experiencePoints: 14 },
  { level: 7, label: "Veterano", bonus: 7, experiencePoints: 16 },
  { level: 8, label: "Honorable", bonus: 8, experiencePoints: 18 },
  { level: 9, label: "Elite", bonus: 9, experiencePoints: 20 },
  { level: 10, label: "Leyenda", bonus: 10, experiencePoints: 25 }
];
const characterSkillColorPalette = [
  "#d88d5a",
  "#5d9cec",
  "#78b96d",
  "#f0c879",
  "#b987f2",
  "#e06d78",
  "#49b8c8",
  "#c7a45b",
  "#7dd18c",
  "#d97fd0",
  "#6bb0ff",
  "#ff9f6e"
];
const defaultCharacterSkillTemplates = [
  { id: "skill-despiece", name: "Despiece", color: "#d88d5a", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-pesca", name: "Pesca", color: "#5d9cec", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-forrajeo", name: "Forrajeo", color: "#78b96d", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-cocina", name: "Cocina", color: "#f0c879", successGains: [3], intermediateGains: [2], failureGains: [1] },
  { id: "skill-cerraduras", name: "Cerraduras", color: "#b987f2", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-trampas-puertas-secretas", name: "Trampas y puertas secretas", color: "#e06d78", successGains: [3], intermediateGains: [], failureGains: [0] }
];
const itemSizeThresholds = [
  { label: "XS", minWeight: 0 },
  { label: "S", minWeight: 1 },
  { label: "M", minWeight: 5 },
  { label: "L", minWeight: 15 },
  { label: "XL", minWeight: 30 },
  { label: "XXL", minWeight: 60 }
];
const characterCurrencyRows = [
  { name: "COBRE", shortLabel: "CO", icon: "copper" },
  { name: "PLATA", shortLabel: "PL", icon: "silver" },
  { name: "ORO", shortLabel: "OR", icon: "gold" },
  { name: "ELECTRO", shortLabel: "EL", icon: "electrum" },
  { name: "PLATINO", shortLabel: "PT", icon: "platinum" }
];
const challengeRatingExperienceByCr = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
};
const experienceFormatter = new Intl.NumberFormat("es-ES");
const combatTagOptions = ["ALIADO", "NEUTRAL", "ENEMIGO"];
const LEGACY_COMBAT_PLACEHOLDER_NAMES = new Set([
  "seraphina vale",
  "thoren ashbrand",
  "ghoul packleader",
  "cult adept"
]);
let battleTimerInterval = null;
let campaignAutosaveTimer = 0;
let campaignSaveInProgress = null;
let lastSavedCampaignSnapshot = "";
let initialDataLoadQueued = false;
let campaignDirtyStateSyncTimer = 0;
let lastDesktopCampaignDirtyValue = null;
resetDesktopLocalStorageIfNeeded();
const initialCampaignMeta = loadCampaignMeta();
const initialCharacterSkillDefinitions = loadCharacterSkillDefinitions();
const initialCharacters = loadCharacters(initialCharacterSkillDefinitions);
const initialEncounterInventory = loadEncounterInventory();
const initialCombatTrackerState = loadCombatTrackerState();
let scheduledRenderTimer = 0;
let scheduledRenderFocusState = null;
let arcanumSpellLinkCache = {
  signature: "",
  pattern: null,
  namesByLower: new Map()
};

const state = {
  activeScreen: "combat-tracker",
  campaignName: initialCampaignMeta.name,
  campaignFileName: initialCampaignMeta.fileName,
  campaignFilePath: initialCampaignMeta.filePath,
  campaignMessage: "",
  fileMenuOpen: false,
  campaignSaveNameDialogOpen: false,
  campaignSaveNameDialogMode: "",
  campaignSaveNameDialogValue: "",
  campaignSaveNameDialogError: "",
  characterSkillConfigOpen: false,
  characterSkillsExpanded: false,
  characterSkillDefinitions: initialCharacterSkillDefinitions,
  characters: initialCharacters,
  activeCharacterId: initialCharacters[0]?.id ?? "",
  combatants: initialCombatTrackerState.combatants,
  filters: initialCombatTrackerState.filters,
  sort: initialCombatTrackerState.sort,
  activeFilterKey: "",
  selectedIds: new Set(),
  newEntitySide: initialCombatTrackerState.newEntitySide,
  nextId: initialCombatTrackerState.nextId,
  inlineAdjustments: initialCombatTrackerState.inlineAdjustments,
  areaDamage: initialCombatTrackerState.areaDamage,
  isCombatActive: initialCombatTrackerState.isCombatActive,
  activeTurnCombatantId: initialCombatTrackerState.activeTurnCombatantId,
  combatRound: initialCombatTrackerState.combatRound,
  battleTimer: {
    elapsedMs: 0,
    startedAt: 0,
    isRunning: false
  },
  bestiary: [],
  bestiaryImageMap: {},
  bestiaryFilters: { ...blankBestiaryFilters },
  bestiarySort: { key: "name", direction: "asc" },
  activeBestiaryFilterKey: "",
  bestiaryFilterSearch: { ...blankBestiaryFilterSearch },
  showBestiaryQuerySuggestions: false,
  bestiarySelectedId: "",
  bestiaryStatus: "loading",
  bestiaryMessage: "",
  bestiaryDebugInfo: null,
  items: [],
  itemImageMap: {},
  itemFilters: { ...blankItemFilters },
  itemSort: { key: "name", direction: "asc" },
  activeItemFilterKey: "",
  itemFilterSearch: { ...blankItemFilterSearch },
  showItemQuerySuggestions: false,
  itemSelectedId: "",
  activeCharacterInventoryRowId: "",
  showCharacterInventorySuggestions: false,
  itemStatus: "loading",
  itemMessage: "",
  itemDebugInfo: null,
  itemListScrollTop: 0,
  itemListViewportHeight: 0,
  arcanum: [],
  arcanumFilters: { ...blankArcanumFilters },
  arcanumSort: { key: "name", direction: "asc" },
  activeArcanumFilterKey: "",
  arcanumFilterSearch: { ...blankArcanumFilterSearch },
  showArcanumQuerySuggestions: false,
  arcanumSelectedId: "",
  arcanumStatus: "loading",
  arcanumMessage: "",
  arcanumDebugInfo: null,
  arcanumListScrollTop: 0,
  arcanumListViewportHeight: 0,
  bestiaryListScrollTop: 0,
  bestiaryListViewportHeight: 0,
  encounterInventoryOpen: false,
  encounterFolders: initialEncounterInventory.folders,
  encounters: initialEncounterInventory.encounters,
  activeEncounterFolderId: initialEncounterInventory.encounters[0]?.folderId ?? initialEncounterInventory.folders[0]?.id ?? "",
  activeEncounterId: initialEncounterInventory.encounters[0]?.id ?? "",
  activeEncounterRowId: "",
  activeEncounterSourceRowId: "",
  selectedEncounterIds: new Set(),
  selectedEncounterFolderIds: new Set(),
  systemEncounterFolderExpanded: initialEncounterInventory.systemFolderExpanded,
  draggedEncounterId: "",
  draggedEncounterFolderId: "",
  draggedFolderId: "",
  encounterSearchQuery: "",
  showEncounterSearchSuggestions: false,
  combatEncounterPickerOpen: false,
  combatAddPickerMode: "",
  activeCombatNameSearchId: "",
  activeCombatSourceId: ""
};

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);
app.addEventListener("keydown", handleKeydown);
document.addEventListener("keydown", handleGlobalKeydown);
app.addEventListener("scroll", handleScroll, true);
app.addEventListener("dragstart", handleDragStart);
app.addEventListener("dragover", handleDragOver);
app.addEventListener("drop", handleDrop);
app.addEventListener("dragend", handleDragEnd);

startCampaignAutosave();
registerCampaignCloseAutosave();
render();
queueInitialDataLoad();

function handleClick(event) {
  const screenButton = event.target.closest("[data-screen]");

  if (screenButton) {
    state.activeScreen = screenButton.dataset.screen;
    state.fileMenuOpen = false;
    state.combatEncounterPickerOpen = false;
    state.combatAddPickerMode = "";
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  const clickedBestiaryFilter = event.target.closest("[data-bestiary-filter-menu]");
  const clickedBestiaryQuery = event.target.closest("[data-bestiary-query-menu]");
  const clickedItemFilter = event.target.closest("[data-item-filter-menu]");
  const clickedItemQuery = event.target.closest("[data-item-query-menu]");
  const clickedCharacterInventoryMenu = event.target.closest("[data-character-inventory-menu]");
  const clickedArcanumFilter = event.target.closest("[data-arcanum-filter-menu]");
  const clickedArcanumQuery = event.target.closest("[data-arcanum-query-menu]");
  const clickedEncounterSearch = event.target.closest("[data-encounter-search-menu]");
  const clickedEncounterSource = event.target.closest("[data-encounter-source-menu]");
  const clickedCombatEncounterMenu = event.target.closest("[data-combat-encounter-menu]");
  const clickedCombatNameSearch = event.target.closest("[data-combat-name-search-menu]");
  const clickedCombatSourceMenu = event.target.closest("[data-combat-source-menu]");
  const clickedFileMenu = event.target.closest("[data-file-menu]");
  const clickedCharacterSkillConfig = event.target.closest("[data-character-skill-config-menu]");

  if (
    state.fileMenuOpen &&
    !clickedFileMenu &&
    actionButton?.dataset.action !== "toggle-file-menu"
  ) {
    state.fileMenuOpen = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.characterSkillConfigOpen &&
    !clickedCharacterSkillConfig &&
    actionButton?.dataset.action !== "toggle-character-skill-config"
  ) {
    state.characterSkillConfigOpen = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeBestiaryFilterKey &&
    !clickedBestiaryFilter &&
    actionButton?.dataset.action !== "toggle-bestiary-filter"
  ) {
    state.activeBestiaryFilterKey = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.showBestiaryQuerySuggestions && !clickedBestiaryQuery) {
    state.showBestiaryQuerySuggestions = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeItemFilterKey &&
    !clickedItemFilter &&
    actionButton?.dataset.action !== "toggle-item-filter"
  ) {
    state.activeItemFilterKey = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.showItemQuerySuggestions && !clickedItemQuery) {
    state.showItemQuerySuggestions = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.showCharacterInventorySuggestions && !clickedCharacterInventoryMenu) {
    state.showCharacterInventorySuggestions = false;
    state.activeCharacterInventoryRowId = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeArcanumFilterKey &&
    !clickedArcanumFilter &&
    actionButton?.dataset.action !== "toggle-arcanum-filter"
  ) {
    state.activeArcanumFilterKey = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.showArcanumQuerySuggestions && !clickedArcanumQuery) {
    state.showArcanumQuerySuggestions = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.showEncounterSearchSuggestions && !clickedEncounterSearch) {
    state.showEncounterSearchSuggestions = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.activeEncounterSourceRowId && !clickedEncounterSource) {
    state.activeEncounterSourceRowId = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.combatEncounterPickerOpen &&
    !clickedCombatEncounterMenu &&
    actionButton?.dataset.action !== "toggle-combat-encounter-import"
  ) {
    state.combatEncounterPickerOpen = false;
    state.combatAddPickerMode = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeCombatNameSearchId &&
    !clickedCombatNameSearch &&
    actionButton?.dataset.action !== "select-combat-name-suggestion"
  ) {
    state.activeCombatNameSearchId = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeCombatSourceId &&
    !clickedCombatSourceMenu &&
    actionButton?.dataset.action !== "toggle-combat-source"
  ) {
    state.activeCombatSourceId = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  if (action === "toggle-file-menu") {
    state.fileMenuOpen = !state.fileMenuOpen;
    render();
    return;
  }

  if (action === "new-campaign") {
    state.fileMenuOpen = false;
    createNewCampaign();
    render();
    return;
  }

  if (action === "save-campaign-file") {
    state.fileMenuOpen = false;
    render();
    saveCampaignFile();
    return;
  }

  if (action === "save-campaign-file-as") {
    state.fileMenuOpen = false;
    render();
    saveCampaignFileAs();
    return;
  }

  if (action === "choose-campaign-file") {
    state.fileMenuOpen = false;
    render();
    chooseCampaignFile();
    return;
  }

  if (action === "dismiss-campaign-save-name-dialog") {
    closeCampaignSaveNameDialog();
    render();
    return;
  }

  if (action === "confirm-campaign-save-name-dialog") {
    submitCampaignSaveNameDialog();
    return;
  }

  if (action === "create-character") {
    createCharacter();
    render({
      focusSelector: "[data-character-field=\"name\"]"
    });
    return;
  }

  if (action === "select-character") {
    selectCharacter(actionButton.dataset.characterId);
    render();
    return;
  }

  if (action === "duplicate-character") {
    duplicateActiveCharacter();
    render();
    return;
  }

  if (action === "delete-character") {
    deleteActiveCharacter();
    render();
    return;
  }

  if (action === "toggle-character-skill-config") {
    state.characterSkillConfigOpen = !state.characterSkillConfigOpen;
    render();
    return;
  }

  if (action === "add-character-to-combat") {
    addActiveCharacterToCombat();
    render();
    return;
  }

  if (action === "select-combat-add-source") {
    state.combatAddPickerMode = actionButton.dataset.addSource ?? "";
    render();
    return;
  }

  if (action === "back-combat-add-menu") {
    state.combatAddPickerMode = "";
    render();
    return;
  }

  if (action === "import-combat-character") {
    addCharacterToCombatById(actionButton.dataset.characterId);
    render();
    return;
  }

  if (action === "import-all-combat-characters") {
    addAllCharactersToCombat();
    render();
    return;
  }

  if (action === "remove-character-image") {
    removeActiveCharacterImage();
    render();
    return;
  }

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

  if (action === "toggle-combat-encounter-import") {
    state.combatEncounterPickerOpen = !state.combatEncounterPickerOpen;
    state.combatAddPickerMode = "";
    render();
    return;
  }

  if (action === "toggle-combat-encounter-folder") {
    toggleCombatEncounterPickerFolder(actionButton.dataset.encounterFolderId);
    render();
    return;
  }

  if (action === "import-encounter-to-combat") {
    importEncounterToCombat(actionButton.dataset.encounterId);
    render();
    return;
  }

  if (action === "delete-selected") {
    deleteSelected();
    render();
    return;
  }

  if (action === "delete-enemies") {
    deleteEnemies();
    render();
    return;
  }

  if (action === "add-blank-combatant") {
    addBlankCombatant();
    render();
    return;
  }

  if (action === "cycle-combat-tag") {
    cycleCombatantTag(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "select-combat-name-suggestion") {
    fillCombatantFromBestiary(actionButton.dataset.combatantId, actionButton.dataset.entryId);
    render();
    return;
  }

  if (action === "toggle-combat-source") {
    const combatantId = actionButton.dataset.combatantId;
    state.activeCombatSourceId = state.activeCombatSourceId === combatantId ? "" : combatantId;
    render();
    return;
  }

  if (action === "select-combat-source") {
    selectCombatantSource(actionButton.dataset.combatantId, actionButton.dataset.combatSource);
    render();
    return;
  }

  if (action === "open-combatant-bestiary") {
    openCombatantBestiary(actionButton.dataset.entryId);
    render();
    return;
  }

  if (action === "generate-iniactiva") {
    generateInitiative();
    render();
    return;
  }

  if (action === "start-combat-turns") {
    startCombatTurns();
    render();
    return;
  }

  if (action === "end-combat-turns") {
    endCombatTurns();
    render();
    return;
  }

  if (action === "advance-combat-turn") {
    advanceCombatTurn();
    render();
    return;
  }

  if (action === "focus-combatant-row") {
    focusCombatantRow(actionButton.dataset.combatantId);
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
    return;
  }

  if (action === "toggle-encounter-inventory") {
    state.encounterInventoryOpen = !state.encounterInventoryOpen;
    state.activeEncounterSourceRowId = "";
    state.showEncounterSearchSuggestions = false;
    render();
    return;
  }

  if (action === "create-encounter") {
    createEncounter();
    render({
      focusSelector: "[data-encounter-name]"
    });
    return;
  }

  if (action === "select-encounter") {
    if (event.ctrlKey || event.metaKey) {
      toggleEncounterSelection(actionButton.dataset.encounterId);
      render();
      return;
    }

    selectEncounter(actionButton.dataset.encounterId);
    render({
      focusSelector: "[data-encounter-search]"
    });
    return;
  }

  if (action === "delete-encounter") {
    deleteEncounter(actionButton.dataset.encounterId);
    render();
    return;
  }

  if (action === "create-encounter-folder") {
    createEncounterFolder();
    render({
      focusSelector: "[data-encounter-folder-name]"
    });
    return;
  }

  if (action === "toggle-encounter-folder") {
    if ((event.ctrlKey || event.metaKey) && actionButton.dataset.encounterFolderId) {
      toggleEncounterFolderSelection(actionButton.dataset.encounterFolderId);
      render();
      return;
    }

    toggleEncounterFolder(actionButton.dataset.encounterFolderId);
    render();
    return;
  }

  if (action === "create-encounter-in-folder") {
    state.activeEncounterFolderId = actionButton.dataset.encounterFolderId ?? "";
    createEncounter();
    render({
      focusSelector: "[data-encounter-name]"
    });
    return;
  }

  if (action === "delete-encounter-folder") {
    deleteEncounterFolder(actionButton.dataset.encounterFolderId);
    render();
    return;
  }

  if (action === "add-encounter-creature") {
    addCreatureToActiveEncounter(actionButton.dataset.entryId);
    render({
      focusSelector: "[data-encounter-search]"
    });
    return;
  }

  if (action === "toggle-encounter-source") {
    const rowId = actionButton.dataset.encounterRowId;
    state.activeEncounterSourceRowId = state.activeEncounterSourceRowId === rowId ? "" : rowId;
    render();
    return;
  }

  if (action === "select-encounter-source") {
    updateEncounterRowSource(actionButton.dataset.encounterRowId, actionButton.dataset.encounterSourceValue);
    state.activeEncounterSourceRowId = "";
    render();
    return;
  }

  if (action === "select-encounter-row") {
    if (event.target.closest("button, input, select, textarea")) {
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    selectEncounterRow(actionButton.dataset.encounterRowId);
    render();
    window.scrollTo(scrollX, scrollY);
    return;
  }

  if (action === "remove-encounter-row") {
    removeEncounterRow(actionButton.dataset.encounterRowId);
    render();
    return;
  }

  if (action === "select-bestiary-entry") {
    const previousSelectedId = state.bestiarySelectedId;
    state.bestiarySelectedId = actionButton.dataset.entryId;

    if (state.activeScreen === "bestiary") {
      updateBestiarySelectionUI(previousSelectedId, state.bestiarySelectedId);
      return;
    }

    render();
    return;
  }

  if (action === "select-item-entry") {
    const previousSelectedId = state.itemSelectedId;
    state.itemSelectedId = actionButton.dataset.entryId;

    if (state.activeScreen === "items") {
      updateItemSelectionUI(previousSelectedId, state.itemSelectedId);
      return;
    }

    render();
    return;
  }

  if (action === "select-arcanum-entry") {
    const previousSelectedId = state.arcanumSelectedId;
    state.arcanumSelectedId = actionButton.dataset.entryId;

    if (state.activeScreen === "arcanum") {
      updateArcanumSelectionUI(previousSelectedId, state.arcanumSelectedId);
      return;
    }

    render();
    return;
  }

  if (action === "filter-bestiary-by-source") {
    resetBestiaryVirtualScroll();
    toggleExclusiveBestiaryFilterValue("source", actionButton.dataset.bestiarySourceValue ?? "");
    render();
    return;
  }

  if (action === "filter-bestiary-by-cr") {
    resetBestiaryVirtualScroll();
    toggleExclusiveBestiaryFilterValue("crBase", actionButton.dataset.bestiaryCrValue ?? "");
    render();
    return;
  }

  if (action === "toggle-bestiary-sort") {
    resetBestiaryVirtualScroll();
    toggleBestiarySort(actionButton.dataset.bestiarySortKey);
    render();
    return;
  }

  if (action === "select-bestiary-query-suggestion") {
    resetBestiaryVirtualScroll();
    state.bestiaryFilters.query = actionButton.dataset.bestiaryQueryValue ?? "";
    state.showBestiaryQuerySuggestions = false;
    render({
      focusSelector: "[data-bestiary-query]"
    });
    return;
  }

  if (action === "toggle-bestiary-filter") {
    const nextKey = state.activeBestiaryFilterKey === actionButton.dataset.bestiaryFilterKey ? "" : actionButton.dataset.bestiaryFilterKey;
    state.activeBestiaryFilterKey = nextKey;
    render({
      focusSelector: nextKey ? `[data-bestiary-filter-search="${nextKey}"]` : null
    });
    return;
  }

  if (action === "clear-bestiary-filter") {
    resetBestiaryVirtualScroll();
    updateBestiaryFilter(actionButton.dataset.bestiaryFilterKey, []);
    render({
      focusSelector: `[data-bestiary-filter-search="${actionButton.dataset.bestiaryFilterKey}"]`
    });
    return;
  }

  if (action === "select-visible-bestiary-options") {
    resetBestiaryVirtualScroll();
    updateBestiaryFilter(actionButton.dataset.bestiaryFilterKey, getVisibleBestiaryFilterOptions(actionButton.dataset.bestiaryFilterKey));
    render({
      focusSelector: `[data-bestiary-filter-search="${actionButton.dataset.bestiaryFilterKey}"]`
    });
    return;
  }

  if (action === "clear-bestiary-filters") {
    resetBestiaryVirtualScroll();
    state.bestiaryFilters = { ...blankBestiaryFilters };
    state.bestiaryFilterSearch = { ...blankBestiaryFilterSearch };
    state.activeBestiaryFilterKey = "";
    state.showBestiaryQuerySuggestions = false;
    render({
      focusSelector: "[data-bestiary-query]"
    });
    return;
  }

  if (action === "toggle-item-sort") {
    resetItemVirtualScroll();
    toggleItemSort(actionButton.dataset.itemSortKey);
    render();
    return;
  }

  if (action === "toggle-item-attunement-filter") {
    resetItemVirtualScroll();
    toggleItemAttunementFilter();
    render();
    return;
  }

  if (action === "select-item-query-suggestion") {
    resetItemVirtualScroll();
    state.itemFilters.query = actionButton.dataset.itemQueryValue ?? "";
    state.showItemQuerySuggestions = false;
    render({
      focusSelector: "[data-item-query]"
    });
    return;
  }

  if (action === "toggle-character-inventory") {
    toggleCharacterInventorySection();
    saveCharacters();
    render();
    return;
  }

  if (action === "add-character-skill-definition") {
    const skillId = addCharacterSkillDefinition();
    saveCharacters();
    saveCharacterSkillDefinitions();
    render({
      focusSelector: skillId ? `[data-character-skill-definition-field="name"][data-character-skill-definition-id="${skillId}"]` : null
    });
    return;
  }

  if (action === "award-character-skill-xp") {
    awardCharacterSkillExperience(
      actionButton.dataset.characterSkillId,
      actionButton.dataset.characterSkillResult,
      actionButton.dataset.characterSkillGainIndex
    );
    saveCharacters();
    render();
    return;
  }

  if (action === "toggle-character-skills-view") {
    toggleCharacterSkillsView();
    render();
    return;
  }

  if (action === "remove-character-skill-definition") {
    removeCharacterSkillDefinition(actionButton.dataset.characterSkillDefinitionId);
    saveCharacters();
    saveCharacterSkillDefinitions();
    render();
    return;
  }

  if (action === "add-character-inventory-row") {
    const rowId = addCharacterInventoryRow();
    saveCharacters();
    render({
      focusSelector: rowId ? `[data-character-inventory-name="${rowId}"]` : null
    });
    return;
  }

  if (action === "remove-character-inventory-row") {
    removeCharacterInventoryRow(actionButton.dataset.characterInventoryRowId);
    saveCharacters();
    render();
    return;
  }

  if (action === "select-character-inventory-suggestion") {
    selectCharacterInventorySuggestion(
      actionButton.dataset.characterInventoryRowId,
      actionButton.dataset.itemEntryId
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-inventory-name="${actionButton.dataset.characterInventoryRowId}"]`
    });
    return;
  }

  if (action === "toggle-item-filter") {
    const nextKey = state.activeItemFilterKey === actionButton.dataset.itemFilterKey ? "" : actionButton.dataset.itemFilterKey;
    state.activeItemFilterKey = nextKey;
    render({
      focusSelector: nextKey ? `[data-item-filter-search="${nextKey}"]` : null
    });
    return;
  }

  if (action === "clear-item-filter") {
    resetItemVirtualScroll();
    updateItemFilter(actionButton.dataset.itemFilterKey, []);
    render({
      focusSelector: `[data-item-filter-search="${actionButton.dataset.itemFilterKey}"]`
    });
    return;
  }

  if (action === "select-visible-item-options") {
    resetItemVirtualScroll();
    updateItemFilter(actionButton.dataset.itemFilterKey, getVisibleItemFilterOptions(actionButton.dataset.itemFilterKey));
    render({
      focusSelector: `[data-item-filter-search="${actionButton.dataset.itemFilterKey}"]`
    });
    return;
  }

  if (action === "filter-arcanum-by-source") {
    resetArcanumVirtualScroll();
    toggleExclusiveArcanumFilterValue("source", actionButton.dataset.arcanumSourceValue ?? "");
    render();
    return;
  }

  if (action === "filter-arcanum-by-level") {
    resetArcanumVirtualScroll();
    toggleExclusiveArcanumFilterValue("level", actionButton.dataset.arcanumLevelValue ?? "");
    render();
    return;
  }

  if (action === "toggle-arcanum-sort") {
    resetArcanumVirtualScroll();
    toggleArcanumSort(actionButton.dataset.arcanumSortKey);
    render();
    return;
  }

  if (action === "toggle-arcanum-concentration-filter") {
    resetArcanumVirtualScroll();
    toggleArcanumConcentrationFilter();
    render();
    return;
  }

  if (action === "select-arcanum-query-suggestion") {
    resetArcanumVirtualScroll();
    state.arcanumFilters.query = actionButton.dataset.arcanumQueryValue ?? "";
    state.showArcanumQuerySuggestions = false;
    render({
      focusSelector: "[data-arcanum-query]"
    });
    return;
  }

  if (action === "filter-arcanum-by-spell-name") {
    resetArcanumVirtualScroll();
    state.activeScreen = "arcanum";
    state.arcanumFilters = {
      ...blankArcanumFilters,
      query: actionButton.dataset.arcanumSpellName ?? ""
    };
    state.arcanumFilterSearch = { ...blankArcanumFilterSearch };
    state.activeArcanumFilterKey = "";
    state.showArcanumQuerySuggestions = false;
    render({
      focusSelector: "[data-arcanum-query]"
    });
    return;
  }

  if (action === "toggle-arcanum-filter") {
    const nextKey = state.activeArcanumFilterKey === actionButton.dataset.arcanumFilterKey ? "" : actionButton.dataset.arcanumFilterKey;
    state.activeArcanumFilterKey = nextKey;
    render({
      focusSelector: nextKey ? `[data-arcanum-filter-search="${nextKey}"]` : null
    });
    return;
  }

  if (action === "clear-arcanum-filter") {
    resetArcanumVirtualScroll();
    updateArcanumFilter(actionButton.dataset.arcanumFilterKey, []);
    render({
      focusSelector: `[data-arcanum-filter-search="${actionButton.dataset.arcanumFilterKey}"]`
    });
    return;
  }

  if (action === "select-visible-arcanum-options") {
    resetArcanumVirtualScroll();
    updateArcanumFilter(actionButton.dataset.arcanumFilterKey, getVisibleArcanumFilterOptions(actionButton.dataset.arcanumFilterKey));
    render({
      focusSelector: `[data-arcanum-filter-search="${actionButton.dataset.arcanumFilterKey}"]`
    });
    return;
  }

  if (action === "clear-item-filters") {
    resetItemVirtualScroll();
    state.itemFilters = { ...blankItemFilters };
    state.itemFilterSearch = { ...blankItemFilterSearch };
    state.activeItemFilterKey = "";
    state.showItemQuerySuggestions = false;
    render({
      focusSelector: "[data-item-query]"
    });
    return;
  }

  if (action === "clear-arcanum-filters") {
    resetArcanumVirtualScroll();
    state.arcanumFilters = { ...blankArcanumFilters };
    state.arcanumFilterSearch = { ...blankArcanumFilterSearch };
    state.activeArcanumFilterKey = "";
    state.showArcanumQuerySuggestions = false;
    render({
      focusSelector: "[data-arcanum-query]"
    });
    return;
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-character-overview-field][data-character-overview-id]")) {
    updateCharacterFieldForId(
      target.dataset.characterOverviewId,
      target.dataset.characterOverviewField,
      target.value,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-overview-field="${target.dataset.characterOverviewField}"][data-character-overview-id="${target.dataset.characterOverviewId}"]`
    });
    return;
  }

  if (target.matches("[data-character-field]")) {
    updateCharacterField(target.dataset.characterField, target.value, true);
    saveCharacters();
    render({
      focusSelector: `[data-character-field="${target.dataset.characterField}"]`
    });
    return;
  }

  if (target.matches("[data-character-skill-definition-field][data-character-skill-definition-id]")) {
    updateCharacterSkillDefinition(
      target.dataset.characterSkillDefinitionId,
      target.dataset.characterSkillDefinitionField,
      target.value,
      true,
      target.dataset.characterSkillDefinitionGainIndex
    );
    saveCharacters();
    saveCharacterSkillDefinitions();
    render({
      focusSelector: `[data-character-skill-definition-field="${target.dataset.characterSkillDefinitionField}"][data-character-skill-definition-id="${target.dataset.characterSkillDefinitionId}"]`
    });
    return;
  }

  if (target.matches("[data-character-skill-progress-field][data-character-skill-id]")) {
    updateCharacterSkillProgress(
      target.dataset.characterSkillId,
      target.dataset.characterSkillProgressField,
      target.value,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-skill-progress-field="${target.dataset.characterSkillProgressField}"][data-character-skill-id="${target.dataset.characterSkillId}"]`
    });
    return;
  }

  if (target.matches("[data-character-inventory-field][data-character-inventory-row]")) {
    updateCharacterInventoryRow(
      target.dataset.characterInventoryRow,
      target.dataset.characterInventoryField,
      target.value,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-inventory-field="${target.dataset.characterInventoryField}"][data-character-inventory-row="${target.dataset.characterInventoryRow}"]`
    });
    return;
  }

  if (target.matches("[data-character-ability]")) {
    updateCharacterAbility(target.dataset.characterAbility, target.value, true);
    saveCharacters();
    render({
      focusSelector: `[data-character-ability="${target.dataset.characterAbility}"]`
    });
    return;
  }

  if (target.matches("[data-character-proficiency]")) {
    updateCharacterProficiency(target.dataset.characterProficiency, target.checked);
    saveCharacters();
    render();
    return;
  }

  if (target.matches("[data-character-image]")) {
    updateActiveCharacterImage(target.files?.[0] ?? null);
    target.value = "";
    return;
  }

  if (target.matches("[data-campaign-file-input]")) {
    loadCampaignFile(target.files?.[0] ?? null);
    target.value = "";
    return;
  }

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
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    saveCombatTrackerState();
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
    saveCombatTrackerState();

    if (target.dataset.editKey === "nombre") {
      return;
    }

    render();
    return;
  }

  if (target.matches("[data-bestiary-filter]")) {
    resetBestiaryVirtualScroll();
    updateBestiaryFilter(target.dataset.bestiaryFilter, getBestiaryFilterInputValue(target));
    render();
    return;
  }

  if (target.matches("[data-bestiary-filter-option]")) {
    resetBestiaryVirtualScroll();
    toggleBestiaryFilterValue(target.dataset.bestiaryFilterOption, target.value, target.checked);
    render({
      focusSelector: `[data-bestiary-filter-search="${target.dataset.bestiaryFilterOption}"]`
    });
  }

  if (target.matches("[data-item-filter-option]")) {
    resetItemVirtualScroll();
    toggleItemFilterValue(target.dataset.itemFilterOption, target.value, target.checked);
    render({
      focusSelector: `[data-item-filter-search="${target.dataset.itemFilterOption}"]`
    });
  }

  if (target.matches("[data-arcanum-filter-option]")) {
    resetArcanumVirtualScroll();
    toggleArcanumFilterValue(target.dataset.arcanumFilterOption, target.value, target.checked);
    render({
      focusSelector: `[data-arcanum-filter-search="${target.dataset.arcanumFilterOption}"]`
    });
  }

  if (target.matches("[data-encounter-units]")) {
    updateEncounterRowUnits(target.dataset.encounterUnits, target.value, true);
    render({
      focusSelector: `[data-encounter-units="${target.dataset.encounterUnits}"]`
    });
  }

}

function handleInput(event) {
  const target = event.target;

  if (target.matches("[data-campaign-save-name-input]")) {
    state.campaignSaveNameDialogValue = target.value;
    state.campaignSaveNameDialogError = "";
    return;
  }

  if (target.matches("[data-character-overview-field][data-character-overview-id]")) {
    updateCharacterFieldForId(
      target.dataset.characterOverviewId,
      target.dataset.characterOverviewField,
      target.value,
      false
    );
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-field]")) {
    updateCharacterField(target.dataset.characterField, target.value, false);
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-skill-definition-field][data-character-skill-definition-id]")) {
    updateCharacterSkillDefinition(
      target.dataset.characterSkillDefinitionId,
      target.dataset.characterSkillDefinitionField,
      target.value,
      false,
      target.dataset.characterSkillDefinitionGainIndex
    );
    saveCharacters();
    saveCharacterSkillDefinitions();
    return;
  }

  if (target.matches("[data-character-skill-progress-field][data-character-skill-id]")) {
    updateCharacterSkillProgress(
      target.dataset.characterSkillId,
      target.dataset.characterSkillProgressField,
      target.value,
      false
    );
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-inventory-name]")) {
    updateCharacterInventoryRow(target.dataset.characterInventoryName, "name", target.value, false);
    state.activeCharacterInventoryRowId = target.dataset.characterInventoryName;
    state.showCharacterInventorySuggestions = cleanText(target.value).length > 0;
    saveCharacters();
    scheduleRender({
      focusSelector: `[data-character-inventory-name="${target.dataset.characterInventoryName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-character-inventory-field][data-character-inventory-row]")) {
    updateCharacterInventoryRow(
      target.dataset.characterInventoryRow,
      target.dataset.characterInventoryField,
      target.value,
      false
    );
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-ability]")) {
    updateCharacterAbility(target.dataset.characterAbility, target.value, false);
    saveCharacters();
    return;
  }

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
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-edit-id][data-edit-key]")) {
    updateCombatantField(target.dataset.editId, target.dataset.editKey, target.value, false);
    saveCombatTrackerState();

    if (target.dataset.editKey === "nombre") {
      state.activeCombatNameSearchId = target.dataset.editId;
      scheduleRender({
        focusSelector: `[data-edit-id="${target.dataset.editId}"][data-edit-key="nombre"]`,
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd
      });
    }

    return;
  }

  if (target.matches("[data-stat-id][data-stat-key]")) {
    updateCombatantStat(target.dataset.statId, target.dataset.statKey, target.value, false);
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-bestiary-query]")) {
    resetBestiaryVirtualScroll();
    state.bestiaryFilters.query = target.value;
    state.showBestiaryQuerySuggestions = cleanText(target.value).length > 0;
    scheduleRender({
      focusSelector: "[data-bestiary-query]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }


  if (target.matches("[data-item-query]")) {
    resetItemVirtualScroll();
    state.itemFilters.query = target.value;
    state.showItemQuerySuggestions = cleanText(target.value).length > 0;
    scheduleRender({
      focusSelector: "[data-item-query]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-arcanum-query]")) {
    resetArcanumVirtualScroll();
    state.arcanumFilters.query = target.value;
    state.showArcanumQuerySuggestions = cleanText(target.value).length > 0;
    scheduleRender({
      focusSelector: "[data-arcanum-query]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-bestiary-filter-search]")) {
    state.bestiaryFilterSearch[target.dataset.bestiaryFilterSearch] = target.value;
    scheduleRender({
      focusSelector: `[data-bestiary-filter-search="${target.dataset.bestiaryFilterSearch}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-item-filter-search]")) {
    state.itemFilterSearch[target.dataset.itemFilterSearch] = target.value;
    scheduleRender({
      focusSelector: `[data-item-filter-search="${target.dataset.itemFilterSearch}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-arcanum-filter-search]")) {
    state.arcanumFilterSearch[target.dataset.arcanumFilterSearch] = target.value;
    scheduleRender({
      focusSelector: `[data-arcanum-filter-search="${target.dataset.arcanumFilterSearch}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-encounter-name]")) {
    updateActiveEncounterName(target.value);
    render({
      focusSelector: "[data-encounter-name]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-encounter-folder-name]")) {
    updateEncounterFolderName(target.dataset.encounterFolderName, target.value);
    render({
      focusSelector: `[data-encounter-folder-name="${target.dataset.encounterFolderName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-encounter-search]")) {
    state.encounterSearchQuery = target.value;
    state.showEncounterSearchSuggestions = cleanText(target.value).length > 0;
    render({
      focusSelector: "[data-encounter-search]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-encounter-units]")) {
    updateEncounterRowUnits(target.dataset.encounterUnits, target.value, false);
    render({
      focusSelector: `[data-encounter-units="${target.dataset.encounterUnits}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
  }
}

function handleGlobalKeydown(event) {
  if (state.campaignSaveNameDialogOpen && event.key === "Escape") {
    event.preventDefault();
    closeCampaignSaveNameDialog();
    render();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    state.fileMenuOpen = false;
    saveCampaignFile();
  }
}

function handleKeydown(event) {
  const target = event.target;

  if (target.matches("[data-campaign-save-name-input]") && event.key === "Enter") {
    event.preventDefault();
    submitCampaignSaveNameDialog();
    return;
  }

  if (
    target.matches('[data-action="focus-combatant-row"]')
    && (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    focusCombatantRow(target.dataset.combatantId);
    return;
  }

  if (
    target.matches('[data-action="select-bestiary-entry"]')
    && (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    target.click();
    return;
  }

  if (
    target.matches('[data-action="select-arcanum-entry"]')
    && (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    target.click();
    return;
  }

  if (target.matches("[data-bestiary-query]") && event.key === "Enter") {
    state.showBestiaryQuerySuggestions = false;
    render({
      focusSelector: "[data-bestiary-query]"
    });
    return;
  }

  if (target.matches("[data-item-query]") && event.key === "Enter") {
    state.showItemQuerySuggestions = false;
    render({
      focusSelector: "[data-item-query]"
    });
    return;
  }

  if (target.matches("[data-arcanum-query]") && event.key === "Enter") {
    state.showArcanumQuerySuggestions = false;
    render({
      focusSelector: "[data-arcanum-query]"
    });
    return;
  }

  if (target.matches("[data-encounter-search]") && event.key === "Enter") {
    event.preventDefault();
    const [firstSuggestion] = getEncounterCreatureSuggestions();

    if (firstSuggestion) {
      addCreatureToActiveEncounter(firstSuggestion.id);
    } else {
      state.showEncounterSearchSuggestions = false;
    }

    render({
      focusSelector: "[data-encounter-search]"
    });
  }
}

function handleScroll(event) {
  const target = event.target;

  if (target.matches?.("[data-bestiary-list-root]")) {
    const previousStartIndex = getBestiaryVirtualStartIndex(state.bestiaryListScrollTop);
    const previousViewportHeight = state.bestiaryListViewportHeight;
    state.bestiaryListScrollTop = target.scrollTop;
    state.bestiaryListViewportHeight = target.clientHeight;

    const nextStartIndex = getBestiaryVirtualStartIndex(state.bestiaryListScrollTop);
    const viewportChanged = Math.abs(previousViewportHeight - state.bestiaryListViewportHeight) > 24;

    if (previousStartIndex !== nextStartIndex || viewportChanged) {
      render();
    }

    return;
  }

  if (target.matches?.("[data-item-list-root]")) {
    const previousStartIndex = getItemVirtualStartIndex(state.itemListScrollTop);
    const previousViewportHeight = state.itemListViewportHeight;
    state.itemListScrollTop = target.scrollTop;
    state.itemListViewportHeight = target.clientHeight;

    const nextStartIndex = getItemVirtualStartIndex(state.itemListScrollTop);
    const viewportChanged = Math.abs(previousViewportHeight - state.itemListViewportHeight) > 24;

    if (previousStartIndex !== nextStartIndex || viewportChanged) {
      render();
    }

    return;
  }

  if (target.matches?.("[data-arcanum-list-root]")) {
    const previousStartIndex = getArcanumVirtualStartIndex(state.arcanumListScrollTop);
    const previousViewportHeight = state.arcanumListViewportHeight;
    state.arcanumListScrollTop = target.scrollTop;
    state.arcanumListViewportHeight = target.clientHeight;

    const nextStartIndex = getArcanumVirtualStartIndex(state.arcanumListScrollTop);
    const viewportChanged = Math.abs(previousViewportHeight - state.arcanumListViewportHeight) > 24;

    if (previousStartIndex !== nextStartIndex || viewportChanged) {
      render();
    }
  }
}

function handleDragStart(event) {
  const encounterDrag = event.target.closest("[data-drag-encounter-id]");
  const folderDrag = event.target.closest("[data-drag-folder-id]");

  if (encounterDrag) {
    state.draggedEncounterId = encounterDrag.dataset.dragEncounterId;
    state.draggedEncounterFolderId = encounterDrag.dataset.dragEncounterFolderId ?? "";
    state.draggedFolderId = "";

    if (!state.selectedEncounterIds.has(state.draggedEncounterId)) {
      state.selectedEncounterIds = new Set([state.draggedEncounterId]);
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `encounter:${state.draggedEncounterId}`);
    return;
  }

  if (folderDrag) {
    state.draggedFolderId = folderDrag.dataset.dragFolderId;
    state.draggedEncounterId = "";
    state.draggedEncounterFolderId = "";

    if (!state.selectedEncounterFolderIds.has(state.draggedFolderId)) {
      state.selectedEncounterFolderIds = new Set([state.draggedFolderId]);
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `folder:${state.draggedFolderId}`);
  }
}

function handleDragOver(event) {
  if (!state.draggedEncounterId && !state.draggedFolderId) {
    return;
  }

  const canDropEncounter = state.draggedEncounterId && event.target.closest("[data-drop-folder-id], [data-drop-encounter-id]");
  const canDropFolder = state.draggedFolderId && event.target.closest("[data-drop-folder-order-id]");

  if (!canDropEncounter && !canDropFolder) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event) {
  if (state.draggedEncounterId) {
    const targetEncounter = event.target.closest("[data-drop-encounter-id]");
    const targetFolder = event.target.closest("[data-drop-folder-id]");

    if (!targetEncounter && !targetFolder) {
      handleDragEnd();
      return;
    }

    event.preventDefault();

    if (targetEncounter) {
      moveEncountersToEncounter(
        getDraggedEncounterIds(),
        targetEncounter.dataset.dropEncounterId,
        getDropPlacement(event, targetEncounter)
      );
    } else {
      moveEncountersToFolder(getDraggedEncounterIds(), targetFolder.dataset.dropFolderId ?? "");
    }

    handleDragEnd();
    render();
    return;
  }

  if (state.draggedFolderId) {
    const targetFolder = event.target.closest("[data-drop-folder-order-id]");

    if (!targetFolder) {
      handleDragEnd();
      return;
    }

    event.preventDefault();
    moveFoldersToFolder(
      getDraggedFolderIds(),
      targetFolder.dataset.dropFolderOrderId,
      getDropPlacement(event, targetFolder)
    );
    handleDragEnd();
    render();
  }
}

function handleDragEnd() {
  state.draggedEncounterId = "";
  state.draggedEncounterFolderId = "";
  state.draggedFolderId = "";
}

function getDropPlacement(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function getDraggedEncounterIds() {
  if (state.draggedEncounterId && state.selectedEncounterIds.has(state.draggedEncounterId)) {
    return state.encounters
      .map((encounter) => encounter.id)
      .filter((id) => state.selectedEncounterIds.has(id));
  }

  return state.draggedEncounterId ? [state.draggedEncounterId] : [];
}

function getDraggedFolderIds() {
  if (state.draggedFolderId && state.selectedEncounterFolderIds.has(state.draggedFolderId)) {
    return state.encounterFolders
      .map((folder) => folder.id)
      .filter((id) => state.selectedEncounterFolderIds.has(id));
  }

  return state.draggedFolderId ? [state.draggedFolderId] : [];
}

function scheduleRender(focusState = null, delay = BESTIARY_RENDER_DEBOUNCE_MS) {
  scheduledRenderFocusState = focusState;

  if (scheduledRenderTimer) {
    window.clearTimeout(scheduledRenderTimer);
  }

  scheduledRenderTimer = window.setTimeout(() => {
    const nextFocusState = scheduledRenderFocusState;
    scheduledRenderTimer = 0;
    scheduledRenderFocusState = null;
    render(nextFocusState);
  }, delay);
}

function cancelScheduledRender() {
  if (!scheduledRenderTimer) {
    return;
  }

  window.clearTimeout(scheduledRenderTimer);
  scheduledRenderTimer = 0;
  scheduledRenderFocusState = null;
}

function queueInitialDataLoad() {
  if (initialDataLoadQueued || typeof window === "undefined") {
    return;
  }

  initialDataLoadQueued = true;
  const schedule = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);

  schedule(() => {
    schedule(() => {
      loadBestiary();
      window.setTimeout(() => {
        loadItems();
      }, 140);
      window.setTimeout(() => {
        loadArcanum();
      }, 280);
    });
  });
}

function isAppBootLoading() {
  return [state.bestiaryStatus, state.itemStatus, state.arcanumStatus].some((status) => status === "loading");
}

function getAppBootProgress() {
  const statuses = [
    { label: "Bestiario", status: state.bestiaryStatus },
    { label: "Objetos", status: state.itemStatus },
    { label: "Arcanum", status: state.arcanumStatus }
  ];
  const completed = statuses.filter((entry) => entry.status !== "loading").length;

  return {
    completed,
    total: statuses.length,
    statuses
  };
}

function renderBootOverlay() {
  if (!isAppBootLoading()) {
    return "";
  }

  const progress = getAppBootProgress();

  return `
    <div class="boot-overlay" role="status" aria-live="polite" aria-label="Cargando aplicacion">
      <div class="boot-overlay__panel">
        <div class="boot-overlay__crest">
          <img class="app-icon-badge__image" src="${appIconUrl}" alt="Icono de Mimic Dice" />
        </div>
        <p class="boot-overlay__eyebrow">Preparando escritorio</p>
        <h2 class="boot-overlay__title">Cargando Mimic Dice</h2>
        <p class="boot-overlay__text">
          ${progress.completed}/${progress.total} modulos listos. Cargando compendios y datos de campana.
        </p>
        <div class="boot-overlay__bar" aria-hidden="true">
          <span style="width: ${(progress.completed / progress.total) * 100}%"></span>
        </div>
        <div class="boot-overlay__grid">
          ${progress.statuses.map((entry) => `
            <div class="boot-overlay__chip boot-overlay__chip--${entry.status}">
              <span>${entry.label}</span>
              <strong>${entry.status === "loading" ? "Cargando" : entry.status === "error" ? "Error" : "OK"}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCampaignSaveNameDialog() {
  if (!state.campaignSaveNameDialogOpen) {
    return "";
  }

  const isSaveAs = state.campaignSaveNameDialogMode === "save-as";

  return `
    <div class="campaign-save-dialog" role="presentation">
      <div
        class="campaign-save-dialog__backdrop"
        data-action="dismiss-campaign-save-name-dialog"
        aria-hidden="true"
      ></div>
      <section
        class="campaign-save-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-save-dialog-title"
      >
        <p class="campaign-save-dialog__eyebrow">Guardado de campana</p>
        <h2 class="campaign-save-dialog__title" id="campaign-save-dialog-title">
          ${isSaveAs ? "Guardar campana como" : "Guardar campana"}
        </h2>
        <p class="campaign-save-dialog__text">
          Escribe el nombre de la campana antes de abrir el explorador de Windows.
        </p>
        <label class="campaign-save-dialog__field">
          <span>Nombre de la campana</span>
          <input
            class="campaign-save-dialog__input"
            type="text"
            value="${escapeHtml(state.campaignSaveNameDialogValue)}"
            data-campaign-save-name-input
            placeholder="Ej. Las ruinas de Korrin"
          />
        </label>
        ${
          state.campaignSaveNameDialogError
            ? `<p class="campaign-save-dialog__error">${escapeHtml(state.campaignSaveNameDialogError)}</p>`
            : ""
        }
        <div class="campaign-save-dialog__actions">
          <button
            class="summary-button summary-button--ghost"
            type="button"
            data-action="dismiss-campaign-save-name-dialog"
          >
            Cancelar
          </button>
          <button
            class="summary-button"
            type="button"
            data-action="confirm-campaign-save-name-dialog"
          >
            Confirmar
          </button>
        </div>
      </section>
    </div>
  `;
}

function render(focusState = null) {
  cancelScheduledRender();

  app.innerHTML = `
    <div class="shell">
      <div class="shell__backdrop"></div>
      <header class="topbar">
        <div class="brand">
          <div class="brand__crest">
            <img class="app-icon-badge__image" src="${appIconUrl}" alt="Icono de Mimic Dice" />
          </div>
          <div>
            <p class="brand__eyebrow">D&D 5e encounter suite</p>
            <h1>Mimic Dice</h1>
            <p class="brand__campaign-name">${escapeHtml(getCampaignDisplayName())}</p>
          </div>
        </div>
        <nav class="nav" aria-label="Pantallas principales">
          ${screens.map(renderNavItem).join("")}
        </nav>
      </header>
      <main class="workspace">
        ${renderScreen()}
      </main>
      ${renderBootOverlay()}
      ${renderCampaignSaveNameDialog()}
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

  if (state.activeScreen === "bestiary") {
    restoreBestiaryListScroll();
  }

  if (state.activeScreen === "items") {
    restoreItemListScroll();
  }

  if (state.activeScreen === "arcanum") {
    restoreArcanumListScroll();
  }

  saveCombatTrackerState();
}

function renderNavItem(screen) {
  return screen.id === "session-vault" ? renderFileMenu() : renderScreenButton(screen);
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

function renderFileMenu() {
  const activeCampaignFileName = cleanText(state.campaignFileName) || getFileNameFromPath(state.campaignFilePath);
  const activeCampaignFilePath = cleanText(state.campaignFilePath);

  return `
    <div class="file-menu" data-file-menu>
      <button
        class="nav__button file-menu__trigger ${state.fileMenuOpen ? "is-active" : ""}"
        type="button"
        data-action="toggle-file-menu"
        aria-expanded="${state.fileMenuOpen}"
        aria-haspopup="menu"
      >
        <span class="nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 4h7l2 2h7v14H4V4Zm2 4v10h12V8H6Z" />
          </svg>
        </span>
        <span class="nav__label">Archivo</span>
      </button>
      ${
        state.fileMenuOpen
          ? `
            <div class="file-menu__popover" role="menu">
              ${
                activeCampaignFileName
                  ? `
                    <div class="file-menu__status">
                      <span class="file-menu__status-label">Fichero de campana activa:</span>
                      <strong class="file-menu__status-name">${escapeHtml(activeCampaignFileName)}</strong>
                      ${
                        activeCampaignFilePath
                          ? `<small class="file-menu__status-path" title="${escapeHtml(activeCampaignFilePath)}">${escapeHtml(activeCampaignFilePath)}</small>`
                          : ""
                      }
                    </div>
                  `
                  : ""
              }
              <button class="file-menu__item" type="button" role="menuitem" data-action="new-campaign">
                Nueva campaÃ±a
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="save-campaign-file">
                Guardar campaÃ±a
                <span>Ctrl+S</span>
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="save-campaign-file-as">
                Guardar campaÃ±a como
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="choose-campaign-file">
                Cargar campaÃ±a
              </button>
            </div>
          `
          : ""
      }
      <input
        class="file-menu__file"
        type="file"
        accept=".json,.mimic-campaign,.mimic-campaign.json,application/json"
        data-campaign-file-input
      />
    </div>
  `;
}

function getCampaignDisplayName() {
  return state.campaignFileName ? cleanText(state.campaignName) || getCampaignNameFromFileName(state.campaignFileName) : "Sin campaÃ±a";
}

function renderScreen() {
  if (state.activeScreen === "combat-tracker") {
    return renderCombatTracker();
  }

  if (state.activeScreen === "bestiary") {
    return renderBestiary();
  }


  if (state.activeScreen === "items") {
    return renderItems();
  }

  if (state.activeScreen === "arcanum") {
    return renderArcanum();
  }

  if (state.activeScreen === "initiative-board") {
    return renderCharactersScreen();
  }

  return renderPlaceholderScreen(
    "Session Vault",
    "Esta pantalla puede agrupar criaturas guardadas, encuentros preparados, notas de sesion y presets de campana."
  );
}

function renderCombatTracker() {
  const visibleCombatants = getVisibleCombatants();
  const turnOrder = getCombatTurnOrder(visibleCombatants);
  const turnParticipants = getCombatTurnParticipants(turnOrder);
  const activeTurnCombatantId = state.isCombatActive ? getActiveTurnCombatantId(turnParticipants) : "";
  const allVisibleSelected =
    visibleCombatants.length > 0 &&
    visibleCombatants.every((combatant) => state.selectedIds.has(combatant.id));
  const battleTimerLabel = formatBattleTimer(getBattleTimerElapsedMs());

  return `
    <section class="panel combat-timer">
      <article class="combat-timer__card">
        <div class="combat-timer__box">
          <div class="combat-timer__header">
            <div class="combat-timer__readout">
              <span>Contador de batalla</span>
              <strong data-battle-timer-readout>${battleTimerLabel}</strong>
            </div>
            <div class="summary-card__actions">
              <button
                class="summary-button"
                type="button"
                data-action="start-battle-timer"
                ${state.battleTimer.isRunning ? "disabled" : ""}
              >
                Iniciar
              </button>
              <button
                class="summary-button summary-button--ghost"
                type="button"
                data-action="pause-battle-timer"
                ${state.battleTimer.isRunning ? "" : "disabled"}
              >
                Pausar
              </button>
              <button class="summary-button summary-button--ghost" type="button" data-action="reset-battle-timer">
                Reiniciar
              </button>
            </div>
          </div>
        </div>
        ${state.isCombatActive ? renderCombatTurnPanel(turnParticipants, activeTurnCombatantId) : ""}
      </article>
    </section>

    <section class="panel panel--table">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Encuentro actual</p>
          <h3>Ruins of Saint Korrin</h3>
        </div>
        <div class="section-meta">
          <span>${visibleCombatants.length} visibles</span>
          <span>${state.selectedIds.size} seleccionados</span>
        </div>
      </div>

      <div class="table-toolbar" aria-label="Acciones de tabla">
        <div class="table-toolbar__group">
          ${renderCombatEncounterPicker()}
          <button
            class="toolbar-button toolbar-button--danger"
            type="button"
            data-action="delete-selected"
            ${state.selectedIds.size === 0 ? "disabled" : ""}
          >
            Eliminar seleccionadas
          </button>
          <button
            class="toolbar-button toolbar-button--danger"
            type="button"
            data-action="delete-enemies"
            ${state.combatants.some(isEnemyCombatant) ? "" : "disabled"}
          >
            Eliminar enemigos
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
          <button
            class="toolbar-button toolbar-button--combat"
            type="button"
            data-action="${state.isCombatActive ? "end-combat-turns" : "start-combat-turns"}"
            ${!state.isCombatActive && turnParticipants.length === 0 ? "disabled" : ""}
          >
            ${state.isCombatActive ? "FIN COMBATE" : "COMBATE!"}
          </button>
          <button class="toolbar-button" type="button" data-action="clear-filters">Limpiar filtros</button>
        </div>
      </div>

      <div class="table-wrap" role="region" aria-label="Combat tracker" tabindex="0">
        <table class="combat-table">
          <colgroup>
            <col style="width: 2.4rem" />
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
            ${visibleCombatants.length > 0
              ? visibleCombatants.map((combatant) => renderCombatRow(combatant, activeTurnCombatantId)).join("")
              : renderEmptyRow()}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="${columns.length + 1}">
                <div class="add-row-cell">
                  <button
                    class="add-row-button"
                    type="button"
                    data-action="add-blank-combatant"
                    aria-label="Anadir fila en blanco"
                  >
                    <span class="add-row-button__icon" aria-hidden="true">+</span>
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  `;
}

function renderCombatTurnPanel(turnOrder, activeTurnCombatantId) {
  if (turnOrder.length === 0) {
    return `
      <div class="combat-turn-panel">
        <p class="combat-turn-panel__empty">No hay entidades visibles para el turno.</p>
      </div>
    `;
  }

  const turnTokenScale = getCombatTurnTokenScale(turnOrder.length);

  return `
    <div class="combat-turn-panel">
      <div class="combat-turn-panel__controls">
        <button
          class="summary-button summary-button--turn"
          type="button"
          data-action="advance-combat-turn"
        >
          Pasar turno
        </button>
        <span class="round-chip">Ronda ${escapeHtml(String(getCombatRound()))}</span>
      </div>
      <div
        class="combat-turn-strip"
        style="--turn-token-scale:${turnTokenScale}"
        aria-label="Orden de iniciativa"
      >
        ${turnOrder.map((combatant) => renderCombatTurnToken(combatant, combatant.id === activeTurnCombatantId)).join("")}
      </div>
    </div>
  `;
}

function getCombatTurnTokenScale(turnCount) {
  if (turnCount <= 16) {
    return 1;
  }

  if (turnCount <= 20) {
    return 0.88;
  }

  if (turnCount <= 24) {
    return 0.76;
  }

  return 0.66;
}

function renderCombatTurnToken(combatant, isActive) {
  const tokenUrl = getCombatantTokenUrl(combatant);
  const standNumber = cleanText(combatant.numPeana);
  const label = cleanText(combatant.nombre) || "Sin nombre";
  const side = mapTagToSide(combatant.tag);
  const initials = getCombatantInitials(combatant);
  const isFallenAlly = side === "allies" && toNumber(combatant.pgAct) < 1;
  const maxHp = Math.max(1, getEffectivePgMax(combatant));
  const hpFill = Math.max(0, Math.min(100, Math.round((toNumber(combatant.pgAct) / maxHp) * 100)));

  return `
    <div
      class="combat-turn-token-wrap ${isActive ? "is-active" : ""} ${isFallenAlly ? "is-fallen-ally" : ""}"
      style="--turn-hp-fill:${hpFill}%"
      role="button"
      tabindex="0"
      data-action="focus-combatant-row"
      data-combatant-id="${escapeHtml(combatant.id)}"
      title="${escapeHtml(label)} | Inic ${escapeHtml(String(combatant.iniactiva ?? ""))}"
    >
      <span class="combat-turn-token__initiative">${escapeHtml(String(combatant.iniactiva ?? "-"))}</span>
      <div class="combat-turn-token combat-turn-token--${side}">
        ${
          tokenUrl
            ? `<img src="${escapeHtml(tokenUrl)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`
            : `<span class="combat-turn-token__placeholder" aria-hidden="true">${escapeHtml(initials)}</span>`
        }
        ${isEnemyCombatant(combatant) && standNumber ? `<span class="combat-turn-token__stand">${escapeHtml(standNumber)}</span>` : ""}
      </div>
    </div>
  `;
}

function focusCombatantRow(combatantId) {
  const row = [...app.querySelectorAll("[data-combat-row-id]")]
    .find((element) => element.dataset.combatRowId === combatantId);

  if (!row) {
    return;
  }

  row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  row.focus({ preventScroll: true });
  row.classList.add("row--focus-pulse");

  window.setTimeout(() => {
    row.classList.remove("row--focus-pulse");
  }, 1200);
}

function renderCombatEncounterPicker() {
  const hasEncounters = state.encounters.length > 0;
  const hasCharacters = state.characters.length > 0;
  const hasAddOptions = hasEncounters || hasCharacters;

  return `
    <div class="combat-encounter-picker" data-combat-encounter-menu>
      <button
        class="toolbar-button ${state.combatEncounterPickerOpen ? "is-active" : ""}"
        type="button"
        data-action="toggle-combat-encounter-import"
        aria-expanded="${state.combatEncounterPickerOpen}"
        ${hasAddOptions ? "" : "disabled"}
      >
        Anadir
        <span aria-hidden="true">${state.combatEncounterPickerOpen ? "^" : "v"}</span>
      </button>
      ${
        state.combatEncounterPickerOpen
          ? `
            <div class="combat-encounter-picker__popover" role="listbox" aria-label="Opciones para anadir al combate">
              ${renderCombatAddPickerContent({ hasCharacters, hasEncounters })}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderCombatAddPickerContent({ hasCharacters, hasEncounters }) {
  if (state.combatAddPickerMode === "characters") {
    return renderCombatCharacterPicker(hasCharacters);
  }

  if (state.combatAddPickerMode === "encounters") {
    return renderCombatEncounterPickerContent(hasEncounters);
  }

  return `
    <button
      class="combat-encounter-picker__option"
      type="button"
      data-action="select-combat-add-source"
      data-add-source="characters"
      ${hasCharacters ? "" : "disabled"}
    >
      <strong>Personajes</strong>
      <span>${state.characters.length} aliados creados</span>
    </button>
    <button
      class="combat-encounter-picker__option"
      type="button"
      data-action="select-combat-add-source"
      data-add-source="encounters"
      ${hasEncounters ? "" : "disabled"}
    >
      <strong>Encuentro</strong>
      <span>${state.encounters.length} encuentros guardados</span>
    </button>
  `;
}

function renderCombatEncounterPickerContent(hasEncounters) {
  return `
    ${renderCombatAddPickerBackButton()}
    ${
      hasEncounters
        ? renderCombatEncounterGroups()
        : `<p class="bestiary-filter__empty">No hay encuentros guardados.</p>`
    }
  `;
}

function renderCombatCharacterPicker(hasCharacters) {
  const characters = getVisibleCharacters();

  return `
    ${renderCombatAddPickerBackButton()}
    <button
      class="combat-encounter-picker__option combat-encounter-picker__option--accent"
      type="button"
      data-action="import-all-combat-characters"
      ${hasCharacters ? "" : "disabled"}
    >
      <strong>Anadir todos</strong>
      <span>${characters.length} personajes</span>
    </button>
    ${
      hasCharacters
        ? characters.map((character) => renderCombatCharacterOption(character)).join("")
        : `<p class="bestiary-filter__empty">No hay personajes creados.</p>`
    }
  `;
}

function renderCombatCharacterOption(character) {
  const subtitle = formatCharacterSubtitle(character) || "ALIADO";

  return `
    <button
      class="combat-encounter-picker__option combat-encounter-picker__option--character"
      type="button"
      data-action="import-combat-character"
      data-character-id="${escapeHtml(character.id)}"
    >
      ${renderCharacterAvatar(character)}
      <span>
        <strong>${escapeHtml(character.name || "Personaje sin nombre")}</strong>
        <small>${escapeHtml(subtitle)}</small>
      </span>
    </button>
  `;
}

function renderCombatAddPickerBackButton() {
  return `
    <button class="combat-encounter-picker__back" type="button" data-action="back-combat-add-menu">
      <span aria-hidden="true"><</span>
      Volver
    </button>
  `;
}

function renderCombatEncounterGroups() {
  return getCombatEncounterPickerGroups()
    .map((group) => renderCombatEncounterGroup(group))
    .join("");
}

function renderCombatEncounterGroup(group) {
  return `
    <section class="combat-encounter-picker__group">
      <button
        class="combat-encounter-picker__folder"
        type="button"
        data-action="toggle-combat-encounter-folder"
        data-encounter-folder-id="${escapeHtml(group.id)}"
        aria-expanded="${group.isExpanded}"
      >
        <span aria-hidden="true">${group.isExpanded ? "v" : ">"}</span>
        <strong>${escapeHtml(group.name)}</strong>
        <small>${group.encounters.length}</small>
      </button>
      ${
        group.isExpanded
          ? `
            <div class="combat-encounter-picker__items">
              ${
                group.encounters.length > 0
                  ? group.encounters.map((encounter) => renderCombatEncounterOption(encounter)).join("")
                  : `<p class="bestiary-filter__empty">Carpeta vacia.</p>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCombatEncounterOption(encounter) {
  const summary = getEncounterSummary(encounter);
  const displayName = encounter.name || "Encuentro sin nombre";
  const isEmpty = summary.units === 0;

  return `
    <button
      class="combat-encounter-picker__option"
      type="button"
      data-action="import-encounter-to-combat"
      data-encounter-id="${escapeHtml(encounter.id)}"
      ${isEmpty ? "disabled" : ""}
    >
      <strong>${escapeHtml(displayName)}</strong>
      <span>${summary.units} enemigos | CR total ${formatCrNumber(summary.totalCr)}</span>
    </button>
  `;
}

function renderEncounterInventorySection() {
  const activeEncounter = getActiveEncounter();
  const totalCreatures = state.encounters.reduce((total, encounter) => total + encounter.rows.length, 0);
  const folderCount = state.encounterFolders.length;

  return `
    <section class="panel encounter-inventory">
      <div class="encounter-inventory__bar">
        <button
          class="toolbar-button toolbar-button--accent encounter-inventory__toggle"
          type="button"
          data-action="toggle-encounter-inventory"
          aria-expanded="${state.encounterInventoryOpen}"
        >
          Editor de encuentros
          <span aria-hidden="true">${state.encounterInventoryOpen ? "^" : "v"}</span>
        </button>
        <div class="section-meta">
          <span>${folderCount} carpetas</span>
          <span>${state.encounters.length} encuentros</span>
          <span>${totalCreatures} filas</span>
        </div>
      </div>
      ${state.encounterInventoryOpen ? renderEncounterInventoryPanel(activeEncounter) : ""}
    </section>
  `;
}

function renderEncounterInventoryPanel(activeEncounter) {
  return `
    <div class="encounter-inventory__panel">
      <aside class="encounter-list" aria-label="Encuentros guardados">
        <div class="encounter-list__header">
          <div>
            <p class="eyebrow">Listas guardadas</p>
            <h3>Encuentros</h3>
          </div>
          <div class="encounter-list__actions">
            <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-encounter-folder">
              Nueva carpeta
            </button>
            <button class="toolbar-button" type="button" data-action="create-encounter">
              Nuevo encuentro
            </button>
          </div>
        </div>
        <div class="encounter-list__items">
          ${
            state.encounters.length > 0 || state.encounterFolders.length > 0
              ? renderEncounterFolderGroups()
              : `
                <div class="empty-state empty-state--compact">
                  Crea tu primer encuentro para guardar criaturas del bestiario.
                </div>
              `
          }
        </div>
      </aside>
      <div class="encounter-editor">
        ${activeEncounter ? renderEncounterEditor(activeEncounter) : renderEncounterEditorEmpty()}
      </div>
    </div>
  `;
}

function renderEncounterFolderGroups() {
  return getEncounterFolderGroups()
    .map((folder) => renderEncounterFolderGroup(folder))
    .join("");
}

function renderEncounterFolderGroup(folder) {
  const folderEncounters = getEncountersByFolder(folder.id);
  const isActive = state.activeEncounterFolderId === folder.id;
  const isSelected = folder.id ? state.selectedEncounterFolderIds.has(folder.id) : false;
  const isSystemFolder = folder.id === "";

  if (folderEncounters.length === 0 && isSystemFolder && state.encounterFolders.length > 0) {
    return "";
  }

  return `
    <section
      class="encounter-folder ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}"
      draggable="${isSystemFolder ? "false" : "true"}"
      data-drag-folder-id="${escapeHtml(folder.id)}"
      data-drop-folder-order-id="${escapeHtml(folder.id)}"
      data-drop-folder-id="${escapeHtml(folder.id)}"
    >
      <div class="encounter-folder__header">
        <div class="encounter-folder__summary">
          <button
            class="encounter-folder__toggle"
            type="button"
            data-action="toggle-encounter-folder"
            data-encounter-folder-id="${escapeHtml(folder.id)}"
            aria-expanded="${folder.isExpanded}"
          >
            <span aria-hidden="true">${folder.isExpanded ? "v" : ">"}</span>
            <small>${folderEncounters.length}</small>
          </button>
          ${
            isSystemFolder
              ? `<strong class="encounter-folder__static-name">${escapeHtml(folder.name)}</strong>`
              : `
              <input
                class="encounter-folder__name"
                type="text"
                value="${escapeHtml(folder.name)}"
                data-encounter-folder-name="${escapeHtml(folder.id)}"
                aria-label="Nombre de carpeta ${escapeHtml(folder.name)}"
              />
            `
          }
        </div>
        <button
          class="filter-clear"
          type="button"
          data-action="create-encounter-in-folder"
          data-encounter-folder-id="${escapeHtml(folder.id)}"
        >
          Nuevo
        </button>
        ${
          isSystemFolder
            ? ""
            : `
              <button
                class="filter-clear encounter-folder__delete"
                type="button"
                data-action="delete-encounter-folder"
                data-encounter-folder-id="${escapeHtml(folder.id)}"
                aria-label="Eliminar carpeta ${escapeHtml(folder.name)}"
              >
                Eliminar
              </button>
            `
        }
      </div>
      ${
        folder.isExpanded
          ? `
            <div class="encounter-folder__items">
              ${
                folderEncounters.length > 0
                  ? folderEncounters.map((encounter) => renderEncounterListItem(encounter)).join("")
                  : `<div class="empty-state empty-state--compact">Esta carpeta esta vacia.</div>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderEncounterListItem(encounter) {
  const isActive = encounter.id === state.activeEncounterId;
  const isSelected = state.selectedEncounterIds.has(encounter.id);
  const displayName = encounter.name || "Encuentro sin nombre";

  return `
    <article
      class="encounter-list__item ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}"
      draggable="true"
      data-drag-encounter-id="${escapeHtml(encounter.id)}"
      data-drag-encounter-folder-id="${escapeHtml(encounter.folderId ?? "")}"
      data-drop-encounter-id="${escapeHtml(encounter.id)}"
    >
      <button
        class="encounter-list__select"
        type="button"
        data-action="select-encounter"
        data-encounter-id="${escapeHtml(encounter.id)}"
        aria-pressed="${isActive}"
      >
        <strong>${escapeHtml(displayName)}</strong>
      </button>
      <button
        class="filter-clear encounter-list__delete"
        type="button"
        data-action="delete-encounter"
        data-encounter-id="${escapeHtml(encounter.id)}"
        aria-label="Eliminar ${escapeHtml(displayName)}"
      >
        Eliminar
      </button>
    </article>
  `;
}

function renderEncounterEditor(activeEncounter) {
  const suggestions = getEncounterCreatureSuggestions();
  const summary = getEncounterSummary(activeEncounter);

  return `
    <div class="encounter-editor__header">
      <div>
        <p class="eyebrow">Editor de encuentro</p>
        <h3>${escapeHtml(activeEncounter.name || "Encuentro sin nombre")}</h3>
      </div>
      <div class="section-meta">
        <span>${summary.units} unidades</span>
        <span>CR total ${formatCrNumber(summary.totalCr)}</span>
      </div>
    </div>

    <div class="encounter-editor__controls">
      <label class="toolbar-field encounter-name-field">
        <span>Nombre del encuentro</span>
        <input
          class="filter-input filter-input--wide"
          type="text"
          value="${escapeHtml(activeEncounter.name)}"
          placeholder="Ej. Emboscada en el bosque"
          data-encounter-name
        />
      </label>

      <div class="toolbar-field toolbar-field--search bestiary-query encounter-search" data-encounter-search-menu>
        <span>Anadir criatura</span>
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.encounterSearchQuery)}"
          placeholder="Busca una criatura del bestiario"
          data-encounter-search
          ${state.bestiaryStatus !== "ready" ? "disabled" : ""}
        />
        ${
          state.showEncounterSearchSuggestions && suggestions.length > 0
            ? `
              <div class="bestiary-query__popover encounter-search__popover" role="listbox" aria-label="Sugerencias para el encuentro">
                ${suggestions.map((entry) => renderEncounterSuggestion(entry)).join("")}
              </div>
            `
            : ""
        }
      </div>
    </div>

    <div class="encounter-rows" role="list" aria-label="Criaturas del encuentro">
      ${
        activeEncounter.rows.length > 0
          ? activeEncounter.rows.map((row) => renderEncounterRow(row)).join("")
          : `
            <div class="empty-state empty-state--compact">
              Usa el buscador para anadir criaturas. Cada seleccion crea una fila nueva con unidades 1 y CR.
            </div>
          `
      }
    </div>
  `;
}

function renderEncounterEditorEmpty() {
  return `
    <div class="empty-state empty-state--panel encounter-editor__empty">
      <div>
        <p>No hay ningun encuentro seleccionado.</p>
        <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-encounter">
          Crear encuentro
        </button>
      </div>
    </div>
  `;
}

function renderEncounterSuggestion(entry) {
  return `
    <button
      class="bestiary-query__option encounter-search__option"
      type="button"
      data-action="add-encounter-creature"
      data-entry-id="${escapeHtml(entry.id)}"
    >
      <strong>${escapeHtml(entry.name)}</strong>
      <span>${escapeHtml(entry.sourceFullName || entry.source || "Sin fuente")} | CR ${formatCrNumber(entry.crBaseValue)}</span>
    </button>
  `;
}

function renderEncounterRow(row) {
  const sourceFullName = getBestiarySourceFullName(row.source) || "Sin fuente";
  const bestiaryEntry = getEncounterRowBestiaryEntry(row);
  const tokenUrl = row.tokenUrl || bestiaryEntry?.tokenUrl || "";
  const hpValue = getEncounterRowHpValue(row, bestiaryEntry);
  const acValue = getEncounterRowAcValue(row, bestiaryEntry);
  const isSelected = state.activeEncounterRowId === row.id;

  return `
    <article
      class="encounter-row ${isSelected ? "is-selected" : ""}"
      role="listitem"
      data-action="select-encounter-row"
      data-encounter-row-id="${escapeHtml(row.id)}"
    >
      ${renderEncounterRowToken(row, tokenUrl)}
      <div class="encounter-row__creature">
        <div class="encounter-row__creature-copy">
          <strong>${escapeHtml(row.name)}</strong>
          <span>${escapeHtml(sourceFullName)}</span>
        </div>
      </div>
      ${renderEncounterSourceSelector(row)}
      <label class="encounter-row__units">
        <span>Unidades</span>
        <input
          class="filter-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          value="${escapeHtml(String(row.units))}"
          data-encounter-units="${escapeHtml(row.id)}"
          aria-label="Unidades de ${escapeHtml(row.name)}"
        />
      </label>
      <div class="encounter-row__hp">
        <span>HP</span>
        <strong>${escapeHtml(String(hpValue || "-"))}</strong>
      </div>
      <div class="encounter-row__ac">
        <span>CA</span>
        <strong>${escapeHtml(String(acValue || "-"))}</strong>
      </div>
      <div class="encounter-row__cr">
        <span>CR</span>
        <strong>${formatCrNumber(row.crValue)}</strong>
      </div>
      <button
        class="filter-clear encounter-row__delete"
        type="button"
        data-action="remove-encounter-row"
        data-encounter-row-id="${escapeHtml(row.id)}"
        aria-label="Eliminar ${escapeHtml(row.name)} del encuentro"
      >
        Eliminar
      </button>
    </article>
  `;
}

function renderEncounterRowToken(row, tokenUrl) {
  if (tokenUrl) {
    return `
      <div class="encounter-row__token" aria-hidden="true">
        <img
          class="encounter-row__token-image"
          src="${escapeHtml(tokenUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
    `;
  }

  return `
    <div class="encounter-row__token encounter-row__token--empty" aria-hidden="true">
      ${escapeHtml(getBestiaryInitials(row.name))}
    </div>
  `;
}

function renderEncounterSourceSelector(row) {
  const isOpen = state.activeEncounterSourceRowId === row.id;
  const sourceOptions = getEncounterSourceOptions(row);
  const sourceCode = row.source || "?";

  return `
    <div class="encounter-row__source" data-encounter-source-menu>
      <span>Source</span>
      <button
        class="encounter-source__trigger"
        type="button"
        data-action="toggle-encounter-source"
        data-encounter-row-id="${escapeHtml(row.id)}"
        aria-expanded="${isOpen}"
        aria-haspopup="listbox"
      >
        ${escapeHtml(sourceCode)}
      </button>
      ${
        isOpen
          ? `
            <div class="encounter-source__popover" role="listbox" aria-label="Fuentes posibles">
              ${sourceOptions.length > 0 ? sourceOptions.map((entry) => `
                <button
                  class="encounter-source__option ${entry.source === row.source ? "is-active" : ""}"
                  type="button"
                  data-action="select-encounter-source"
                  data-encounter-row-id="${escapeHtml(row.id)}"
                  data-encounter-source-value="${escapeHtml(entry.source)}"
                >
                  <strong>${escapeHtml(getBestiarySourceFullName(entry.source) || entry.source)}</strong>
                  <span>${escapeHtml(entry.source)}</span>
                </button>
              `).join("") : `<span class="encounter-source__empty">No hay otras fuentes para esta criatura.</span>`}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderBestiary() {
  const filteredEntries = getFilteredBestiary();
  const selectedEntry = getSelectedBestiaryEntry(filteredEntries);

  return `
    ${renderEncounterInventorySection()}

    <section class="panel panel--table bestiary-showcase bestiary-showcase--hearth">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Repositorio de enemigos</p>
          <h3>Catalogo sincronizado con CSV</h3>
        </div>
        <div class="section-heading__side">
          <div class="section-meta">
            <span>${getBestiaryStatusLabel()}</span>
            <span>${filteredEntries.length} visibles</span>
            <span>${state.bestiary.length} totales</span>
          </div>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="Filtros del bestiario">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderBestiaryQueryField()}
          <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-bestiary-filters">Limpiar filtros</button>
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--filters">
          ${renderBestiaryFilterDropdown("type", "Tipo")}
          ${renderBestiaryFilterDropdown("environment", "Entorno")}
          ${renderBestiaryFilterDropdown("crBase", "CR")}
          ${renderBestiaryFilterDropdown("source", "Fuente")}
        </div>
      </div>

      ${renderBestiaryContent(filteredEntries, selectedEntry)}
    </section>
  `;
}

function renderItems() {
  const filteredEntries = getFilteredItems();
  const selectedEntry = getSelectedItemEntry(filteredEntries);

  return `
    <section class="panel panel--table">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Tesoro sincronizado</p>
          <h3>Catalogo de items desde CSV</h3>
        </div>
        <div class="section-meta">
          <span>${getItemStatusLabel()}</span>
          <span>${filteredEntries.length} visibles</span>
          <span>${state.items.length} totales</span>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="Filtros de items">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderItemQueryField()}
          <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-item-filters">Limpiar filtros</button>
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--item-filters">
          ${renderItemFilterDropdown("type", "Tipo")}
          ${renderItemFilterDropdown("rarity", "Rareza")}
          ${renderItemFilterDropdown("source", "Fuente")}
          ${renderItemAttunementFilterButton()}
        </div>
      </div>

      ${renderItemsContent(filteredEntries, selectedEntry)}
    </section>
  `;
}

function renderArcanum() {
  const filteredEntries = getFilteredArcanum();
  const selectedEntry = getSelectedArcanumEntry(filteredEntries);

  return `
    <section class="panel panel--table">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Grimorio sincronizado</p>
          <h3>Catalogo de hechizos desde CSV</h3>
        </div>
        <div class="section-meta">
          <span>${getArcanumStatusLabel()}</span>
          <span>${filteredEntries.length} visibles</span>
          <span>${state.arcanum.length} totales</span>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="Filtros del arcanum">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderArcanumQueryField()}
          ${renderArcanumConcentrationFilterButton()}
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--filters">
          ${renderArcanumFilterDropdown("level", "Nivel")}
          ${renderArcanumFilterDropdown("castingTime", "Velocidad Hechizo")}
          ${renderArcanumFilterDropdown("school", "Escuela")}
          ${renderArcanumFilterDropdown("class", "Clase")}
          ${renderArcanumFilterDropdown("source", "Fuente")}
        </div>
      </div>

      ${renderArcanumContent(filteredEntries, selectedEntry)}
    </section>
  `;
}

function renderItemsContent(filteredEntries, selectedEntry) {
  if (state.itemStatus === "loading") {
    return `
      <div class="empty-state empty-state--panel">
        Cargando Items.csv...
      </div>
    `;
  }

  if (state.itemStatus === "error") {
    return renderAssetLoadErrorState(state.itemMessage || "No se pudo leer Items.csv.", state.itemDebugInfo);
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Items del catalogo" data-item-list-root>
        ${renderItemList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-item-detail-root>
        ${selectedEntry ? renderItemDetail(selectedEntry) : renderItemDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderArcanumContent(filteredEntries, selectedEntry) {
  if (state.arcanumStatus === "loading") {
    return `
      <div class="empty-state empty-state--panel">
        Cargando Spells.csv...
      </div>
    `;
  }

  if (state.arcanumStatus === "error") {
    return renderAssetLoadErrorState(state.arcanumMessage || "No se pudo leer Spells.csv.", state.arcanumDebugInfo);
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Hechizos del arcanum" data-arcanum-list-root>
        ${renderArcanumList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-arcanum-detail-root>
        ${selectedEntry ? renderArcanumDetail(selectedEntry) : renderArcanumDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderItemRow(entry, isSelected) {
  const attunementChip = entry.requiresAttunement
    ? `<span class="pill item-row__attunement-pill">Sintonizacion</span>`
    : "";
  const itemStats = [
    entry.value ? `PRECIO: ${entry.valueLabel}` : "",
    entry.weight ? `PESO: ${entry.weightLabel} | Talla: ${entry.sizeLabel}` : `Talla: ${entry.sizeLabel}`
  ].filter(Boolean).join(" | ");
  const rarityClass = getItemRarityClass(entry.rarityLabel);
  const typeSummary = getItemMostSpecificTypeLabel(entry.type);

  return `
    <button
      class="bestiary-row ${isSelected ? "is-selected" : ""}"
      type="button"
      role="listitem"
      data-action="select-item-entry"
      data-entry-id="${entry.id}"
      data-item-row-id="${entry.id}"
    >
      <div class="bestiary-row__main item-row__main">
        <div class="item-row__heading">
          <div class="item-row__title-stack">
            <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
            <span class="pill bestiary-row__source-pill">${escapeHtml(`FUENTE: ${entry.source || "?"}`)}</span>
          </div>
          <p class="item-row__type-summary">${escapeHtml(typeSummary)}</p>
        </div>
        <div class="bestiary-row__chips">
          <span class="pill item-row__rarity-pill ${rarityClass}">${escapeHtml(entry.rarityLabel)}</span>
        </div>
      </div>
      ${itemStats || attunementChip ? `
        <div class="bestiary-row__stats item-row__stats">
          ${itemStats ? `<span>${escapeHtml(itemStats)}</span>` : "<span></span>"}
          ${attunementChip}
        </div>
      ` : ""}
    </button>
  `;
}

function renderItemList(filteredEntries, selectedId) {
  if (filteredEntries.length === 0) {
    return `
      <div class="empty-state empty-state--panel">
        No hay items que coincidan con los filtros actuales.
      </div>
    `;
  }

  const virtualWindow = getItemVirtualWindow(filteredEntries.length);
  const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
  const listHtml = visibleEntries
    .map((entry) => renderItemRow(entry, entry.id === selectedId))
    .join("");

  return `
    <div
      class="bestiary-list__virtual"
      style="padding-top: ${virtualWindow.topPadding}px; padding-bottom: ${virtualWindow.bottomPadding}px;"
      data-item-virtual-start="${virtualWindow.startIndex}"
      data-item-virtual-end="${virtualWindow.endIndex}"
    >
      ${listHtml}
    </div>
  `;
}

function renderArcanumRow(entry, isSelected) {
  const detailItems = [
    ["Escuela", entry.school || "-"],
    ["Lanzamiento", entry.castingTime || "Sin tiempo"],
    ["Alcance", entry.range || "Sin alcance"],
    ["Duracion", entry.duration || "Sin duracion"]
  ];
  const concentrationChip = entry.hasConcentration
    ? `
      <div class="arcanum-row__status">
        <span class="pill arcanum-row__status-pill">Concentracion</span>
      </div>
    `
    : "";

  return `
    <div
      class="bestiary-row ${isSelected ? "is-selected" : ""}"
      role="listitem"
      tabindex="0"
      data-action="select-arcanum-entry"
      data-entry-id="${entry.id}"
      data-arcanum-row-id="${entry.id}"
    >
      <div class="bestiary-row__layout">
        <div class="bestiary-row__content">
          <div class="bestiary-row__header">
            <div class="arcanum-row__title-stack">
              <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
              <button
                class="pill bestiary-row__source-pill bestiary-row__filter-pill"
                type="button"
                data-action="filter-arcanum-by-source"
                data-arcanum-source-value="${escapeHtml(entry.source)}"
                aria-label="Filtrar por fuente ${escapeHtml(entry.sourceFullName || entry.source || "Sin fuente")}"
              >
                ${escapeHtml(`FUENTE: ${entry.source || "?"}`)}
              </button>
            </div>
            <button
              class="pill bestiary-row__filter-pill arcanum-row__level-pill"
              type="button"
              data-action="filter-arcanum-by-level"
              data-arcanum-level-value="${escapeHtml(entry.level)}"
              aria-label="Filtrar por nivel ${escapeHtml(entry.levelLabel || "Sin nivel")}"
            >
              ${escapeHtml(`NIVEL: ${entry.levelLabel || "Sin nivel"}`)}
            </button>
          </div>
          <div class="arcanum-row__body">
            <div class="bestiary-row__facts">
              ${detailItems.map(([label, value]) => `
                <p class="bestiary-row__fact">
                  <span class="bestiary-row__fact-label">${escapeHtml(label)}:</span>
                  <span class="bestiary-row__fact-value">${escapeHtml(value)}</span>
                </p>
              `).join("")}
            </div>
            ${concentrationChip}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderItemDetail(entry) {
  const media = renderItemDetailMedia(entry);
  const kpis = renderItemKpis(entry);
  const detailBlocks = renderItemDetailBlocks(entry);
  const chips = [
    renderDetailChip("Tipo resumido", entry.typeLine),
    renderDetailChip("Propiedades", entry.properties),
    renderDetailChip("Mastery", entry.mastery)
  ].filter(Boolean).join("");

  return `
    <div class="bestiary-detail__header item-detail__header">
      <p class="eyebrow">Item seleccionado</p>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="bestiary-detail__source">${escapeHtml(getItemSourceDescription(entry))}</p>
    </div>

    ${media ? `<div class="bestiary-detail__top">${media}</div>` : ""}

    ${kpis ? `<div class="bestiary-kpis">${kpis}</div>` : ""}

    ${detailBlocks ? `<div class="bestiary-detail__grid">${detailBlocks}</div>` : ""}

    ${chips ? `<div class="bestiary-resistances">${chips}</div>` : ""}

    <div class="bestiary-sections">
      ${renderBestiarySection("Description", entry.text || "Sin descripcion disponible.", { linkSpells: true })}
    </div>
  `;
}

function renderItemDetailEmpty() {
  return `
    <div class="empty-state empty-state--panel">
      Selecciona un item para ver la ficha completa.
    </div>
  `;
}

function renderItemDetailMedia(entry) {
  if (entry.imageUrl) {
    return `
      <figure class="bestiary-portrait bestiary-portrait--item-image">
          <img
            class="bestiary-portrait__image bestiary-portrait__image--contain"
            src="${escapeHtml(entry.imageUrl)}"
            alt="Ilustracion de ${escapeHtml(entry.name)} (${escapeHtml(entry.sourceLabel)})"
            loading="lazy"
          />
          <figcaption class="bestiary-portrait__caption">${escapeHtml(entry.sourceLabel)}</figcaption>
      </figure>
    `;
  }

  return "";
}

function renderArcanumDetail(entry) {
  const textSection = renderBestiarySection("Texto", entry.text || "Sin texto disponible.");
  const extraSections = [
    { title: "At Higher Levels", content: entry.atHigherLevels }
  ].filter((section) => section.content);

  return `
    <div class="bestiary-detail__header arcanum-detail__header">
      <p class="eyebrow">Conjuro seleccionado</p>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="bestiary-detail__source">${escapeHtml(entry.sourceLabel)}</p>
    </div>

    <div class="bestiary-detail__grid">
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Casting Time</span>
        <p>${escapeHtml(entry.castingTime || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Duracion</span>
        <p>${escapeHtml(entry.duration || "No indicada")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Alcance</span>
        <p>${escapeHtml(entry.range || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Componentes</span>
        <p>${escapeHtml(entry.components || "No indicados")}</p>
      </div>
    </div>

    <div class="bestiary-sections">
      ${textSection}
      <div class="bestiary-resistances">
        ${renderDetailChip("Clases", entry.classes || entry.optionalClasses)}
        ${renderDetailChip("Subclases", entry.subclasses)}
      </div>
      ${extraSections.map((section) => renderBestiarySection(section.title, section.content)).join("")}
    </div>
  `;
}

function renderArcanumDetailEmpty() {
  return `
    <div class="empty-state empty-state--panel">
      Selecciona un hechizo para ver su ficha completa.
    </div>
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
    return renderAssetLoadErrorState(state.bestiaryMessage || "No se pudo leer Bestiary.csv.", state.bestiaryDebugInfo);
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Criaturas del bestiario" data-bestiary-list-root>
        ${renderBestiaryList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-bestiary-detail-root>
        ${selectedEntry ? getCachedBestiaryDetailHtml(selectedEntry) : renderBestiaryDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderBestiaryRow(entry, isSelected) {
  const tokenBadge = entry.tokenUrl
    ? `
      <div class="bestiary-row__token" aria-hidden="true">
        <img
          class="bestiary-row__token-image"
          src="${escapeHtml(entry.tokenUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
    `
    : "";
  const detailItems = [
    ["Type", entry.type || "-"],
    ["Environment", entry.environment || "Sin entorno"]
  ];

  return `
    <div
      class="bestiary-row ${isSelected ? "is-selected" : ""}"
      role="listitem"
      tabindex="0"
      data-action="select-bestiary-entry"
      data-entry-id="${entry.id}"
      data-bestiary-row-id="${entry.id}"
    >
      <div class="bestiary-row__layout">
        <div class="bestiary-row__content">
          <div class="bestiary-row__header">
            <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
            <button
              class="pill bestiary-row__source-pill bestiary-row__filter-pill"
              type="button"
              data-action="filter-bestiary-by-source"
              data-bestiary-source-value="${escapeHtml(entry.source)}"
              aria-label="Filtrar por fuente ${escapeHtml(entry.source)}"
            >
              ${escapeHtml(`FUENTE: ${entry.source || "?"}`)}
            </button>
          </div>
          <div class="bestiary-row__facts">
            ${detailItems.map(([label, value]) => `
              <p class="bestiary-row__fact">
                <span class="bestiary-row__fact-label">${escapeHtml(label)}:</span>
                <span class="bestiary-row__fact-value">${escapeHtml(value)}</span>
              </p>
            `).join("")}
          </div>
          <div class="bestiary-row__footer">
            <div class="bestiary-row__cr">
              <button
                class="pill bestiary-row__filter-pill"
                type="button"
                data-action="filter-bestiary-by-cr"
                data-bestiary-cr-value="${escapeHtml(entry.crBaseLabel || "")}"
                aria-label="Filtrar por CR ${escapeHtml(entry.crBaseLabel || "Sin CR")}"
              >
                ${escapeHtml(`CR: ${entry.crBaseLabel || "Sin CR"}`)}
              </button>
            </div>
          </div>
        </div>
        ${tokenBadge ? `<div class="bestiary-row__token-wrap">${tokenBadge}</div>` : ""}
      </div>
    </div>
  `;
}

function renderBestiaryList(filteredEntries, selectedId) {
  if (filteredEntries.length === 0) {
    return `
      <div class="empty-state empty-state--panel">
        No hay criaturas que coincidan con los filtros actuales.
      </div>
    `;
  }

  const virtualWindow = getBestiaryVirtualWindow(filteredEntries.length);
  const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
  const listHtml = visibleEntries
    .map((entry) => getCachedBestiaryRowHtml(entry, entry.id === selectedId))
    .join("");

  return `
    <div
      class="bestiary-list__virtual"
      style="padding-top: ${virtualWindow.topPadding}px; padding-bottom: ${virtualWindow.bottomPadding}px;"
      data-bestiary-virtual-start="${virtualWindow.startIndex}"
      data-bestiary-virtual-end="${virtualWindow.endIndex}"
    >
      ${listHtml}
    </div>
  `;
}

function getBestiaryVirtualWindow(totalEntries) {
  const viewportHeight = state.bestiaryListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT;
  const maxScrollTop = Math.max(0, totalEntries * BESTIARY_VIRTUAL_ROW_HEIGHT - viewportHeight);
  const scrollTop = Math.min(state.bestiaryListScrollTop, maxScrollTop);
  const startIndex = getBestiaryVirtualStartIndex(scrollTop);
  const visibleCount = Math.ceil(viewportHeight / BESTIARY_VIRTUAL_ROW_HEIGHT) + BESTIARY_VIRTUAL_OVERSCAN * 2;
  const endIndex = Math.min(totalEntries, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * BESTIARY_VIRTUAL_ROW_HEIGHT,
    bottomPadding: Math.max(0, (totalEntries - endIndex) * BESTIARY_VIRTUAL_ROW_HEIGHT)
  };
}

function getBestiaryVirtualStartIndex(scrollTop) {
  return Math.max(0, Math.floor(scrollTop / BESTIARY_VIRTUAL_ROW_HEIGHT) - BESTIARY_VIRTUAL_OVERSCAN);
}

function resetBestiaryVirtualScroll() {
  state.bestiaryListScrollTop = 0;
}

function restoreBestiaryListScroll() {
  const listRoot = app.querySelector("[data-bestiary-list-root]");

  if (!listRoot) {
    return;
  }

  state.bestiaryListViewportHeight = listRoot.clientHeight;
  listRoot.scrollTop = state.bestiaryListScrollTop;
}

function getCachedBestiaryRowHtml(entry, isSelected) {
  const cacheKey = `${entry.id}::${isSelected ? "selected" : "idle"}`;
  const cachedHtml = bestiaryRenderCache.rowHtml.get(cacheKey);

  if (cachedHtml) {
    return cachedHtml;
  }

  const rowHtml = renderBestiaryRow(entry, isSelected);
  bestiaryRenderCache.rowHtml.set(cacheKey, rowHtml);
  return rowHtml;
}

function getCachedBestiaryDetailHtml(entry) {
  const cacheKey = `${entry.id}::${getArcanumSpellLinkSignature()}`;
  const cachedHtml = bestiaryRenderCache.detailHtml.get(cacheKey);

  if (cachedHtml) {
    return cachedHtml;
  }

  const detailHtml = renderBestiaryDetail(entry);
  bestiaryRenderCache.detailHtml.set(cacheKey, detailHtml);
  return detailHtml;
}

function updateBestiarySelectionUI(previousSelectedId, nextSelectedId) {
  if (previousSelectedId && previousSelectedId !== nextSelectedId) {
    app.querySelector(`[data-bestiary-row-id="${previousSelectedId}"]`)?.classList.remove("is-selected");
  }

  app.querySelector(`[data-bestiary-row-id="${nextSelectedId}"]`)?.classList.add("is-selected");

  const detailRoot = app.querySelector("[data-bestiary-detail-root]");

  if (!detailRoot) {
    return;
  }

  const filteredEntries = getFilteredBestiary();
  const selectedEntry = getSelectedBestiaryEntry(filteredEntries);
  detailRoot.innerHTML = selectedEntry ? getCachedBestiaryDetailHtml(selectedEntry) : renderBestiaryDetailEmpty();
}

function getItemVirtualWindow(totalEntries) {
  const viewportHeight = state.itemListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT;
  const maxScrollTop = Math.max(0, totalEntries * ITEM_VIRTUAL_ROW_HEIGHT - viewportHeight);
  const scrollTop = Math.min(state.itemListScrollTop, maxScrollTop);
  const startIndex = getItemVirtualStartIndex(scrollTop);
  const visibleCount = Math.ceil(viewportHeight / ITEM_VIRTUAL_ROW_HEIGHT) + ITEM_VIRTUAL_OVERSCAN * 2;
  const endIndex = Math.min(totalEntries, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * ITEM_VIRTUAL_ROW_HEIGHT,
    bottomPadding: Math.max(0, (totalEntries - endIndex) * ITEM_VIRTUAL_ROW_HEIGHT)
  };
}

function getItemVirtualStartIndex(scrollTop) {
  return Math.max(0, Math.floor(scrollTop / ITEM_VIRTUAL_ROW_HEIGHT) - ITEM_VIRTUAL_OVERSCAN);
}

function resetItemVirtualScroll() {
  state.itemListScrollTop = 0;
}

function restoreItemListScroll() {
  const listRoot = app.querySelector("[data-item-list-root]");

  if (!listRoot) {
    return;
  }

  state.itemListViewportHeight = listRoot.clientHeight;
  listRoot.scrollTop = state.itemListScrollTop;
}

function updateItemSelectionUI(previousSelectedId, nextSelectedId) {
  if (previousSelectedId && previousSelectedId !== nextSelectedId) {
    app.querySelector(`[data-item-row-id="${previousSelectedId}"]`)?.classList.remove("is-selected");
  }

  app.querySelector(`[data-item-row-id="${nextSelectedId}"]`)?.classList.add("is-selected");

  const detailRoot = app.querySelector("[data-item-detail-root]");

  if (!detailRoot) {
    return;
  }

  const filteredEntries = getFilteredItems();
  const selectedEntry = getSelectedItemEntry(filteredEntries);
  detailRoot.innerHTML = selectedEntry ? renderItemDetail(selectedEntry) : renderItemDetailEmpty();
}

function renderArcanumList(filteredEntries, selectedId) {
  if (filteredEntries.length === 0) {
    return `
      <div class="empty-state empty-state--panel">
        No hay hechizos que coincidan con los filtros actuales.
      </div>
    `;
  }

  const virtualWindow = getArcanumVirtualWindow(filteredEntries.length);
  const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
  const listHtml = visibleEntries
    .map((entry) => renderArcanumRow(entry, entry.id === selectedId))
    .join("");

  return `
    <div
      class="bestiary-list__virtual"
      style="padding-top: ${virtualWindow.topPadding}px; padding-bottom: ${virtualWindow.bottomPadding}px;"
      data-arcanum-virtual-start="${virtualWindow.startIndex}"
      data-arcanum-virtual-end="${virtualWindow.endIndex}"
    >
      ${listHtml}
    </div>
  `;
}

function getArcanumVirtualWindow(totalEntries) {
  const viewportHeight = state.arcanumListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT;
  const maxScrollTop = Math.max(0, totalEntries * BESTIARY_VIRTUAL_ROW_HEIGHT - viewportHeight);
  const scrollTop = Math.min(state.arcanumListScrollTop, maxScrollTop);
  const startIndex = getArcanumVirtualStartIndex(scrollTop);
  const visibleCount = Math.ceil(viewportHeight / BESTIARY_VIRTUAL_ROW_HEIGHT) + BESTIARY_VIRTUAL_OVERSCAN * 2;
  const endIndex = Math.min(totalEntries, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * BESTIARY_VIRTUAL_ROW_HEIGHT,
    bottomPadding: Math.max(0, (totalEntries - endIndex) * BESTIARY_VIRTUAL_ROW_HEIGHT)
  };
}

function getArcanumVirtualStartIndex(scrollTop) {
  return Math.max(0, Math.floor(scrollTop / BESTIARY_VIRTUAL_ROW_HEIGHT) - BESTIARY_VIRTUAL_OVERSCAN);
}

function resetArcanumVirtualScroll() {
  state.arcanumListScrollTop = 0;
}

function restoreArcanumListScroll() {
  const listRoot = app.querySelector("[data-arcanum-list-root]");

  if (!listRoot) {
    return;
  }

  state.arcanumListViewportHeight = listRoot.clientHeight;
  listRoot.scrollTop = state.arcanumListScrollTop;
}

function updateArcanumSelectionUI(previousSelectedId, nextSelectedId) {
  if (previousSelectedId && previousSelectedId !== nextSelectedId) {
    app.querySelector(`[data-arcanum-row-id="${previousSelectedId}"]`)?.classList.remove("is-selected");
  }

  app.querySelector(`[data-arcanum-row-id="${nextSelectedId}"]`)?.classList.add("is-selected");

  const detailRoot = app.querySelector("[data-arcanum-detail-root]");

  if (!detailRoot) {
    return;
  }

  const filteredEntries = getFilteredArcanum();
  const selectedEntry = getSelectedArcanumEntry(filteredEntries);
  detailRoot.innerHTML = selectedEntry ? renderArcanumDetail(selectedEntry) : renderArcanumDetailEmpty();
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
      <p class="bestiary-detail__source">${escapeHtml(entry.sourceFullName || entry.source || "Sin fuente")}</p>
      <p class="lead">${escapeHtml(entry.typeLine)}</p>
    </div>

    <div class="bestiary-detail__top">
      <div class="bestiary-detail__top-stats">
        ${renderBestiaryMetric("HP", entry.hp || "-")}
        ${renderBestiaryMetric("CA", entry.ac || "-")}
        ${renderBestiaryMetric("Velocidad", entry.speed || "-")}
        ${renderBestiaryMetric("CR", entry.crLabel)}
      </div>
      ${renderBestiaryDetailMedia(entry)}
    </div>

    <div class="bestiary-detail__abilities">
      ${statKeys.map((ability) => renderBestiaryAbility(entry, ability)).join("")}
    </div>

    <div class="bestiary-detail__grid">
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Sentidos</span>
        <p>${escapeHtml(entry.senses || "No indicado")}</p>
      </div>
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">Idiomas</span>
        <p>${escapeHtml(entry.languages || "No indicado")}</p>
      </div>
    </div>

    <div class="bestiary-resistances">
      ${renderDetailChip("Entorno", entry.environment)}
      ${renderDetailChip("Skills", entry.skills)}
      ${renderDetailChip("Saving Throws", entry.savingThrows)}
      ${renderDetailChip("Damage Vulnerabilities", entry.damageVulnerabilities)}
      ${renderDetailChip("Damage Resistances", entry.damageResistances)}
      ${renderDetailChip("Damage Immunities", entry.damageImmunities)}
      ${renderDetailChip("Condition Immunities", entry.conditionImmunities)}
    </div>

    <div class="bestiary-sections">
      ${sections.map((section) => renderBestiarySection(section.title, section.content, { linkSpells: true })).join("")}
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

function renderAssetLoadErrorState(message, debugInfo) {
  const debugLines = formatAssetLoadDebugLines(debugInfo);

  return `
    <div class="empty-state empty-state--panel empty-state--debug">
      <div class="empty-state__debug">
        <p class="empty-state__debug-title">Error de lectura</p>
        <p class="empty-state__debug-message">${escapeHtml(message)}</p>
        ${
          debugLines.length > 0
            ? `
              <div class="asset-debug-card">
                <p class="asset-debug-card__title">Diagnostico desktop</p>
                <pre class="asset-debug-card__body">${escapeHtml(debugLines.join("\n"))}</pre>
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function formatAssetLoadDebugLines(debugInfo) {
  if (!isPlainObject(debugInfo)) {
    return [];
  }

  const lines = [];
  const snapshot = isPlainObject(debugInfo.snapshot) ? debugInfo.snapshot : null;

  if (debugInfo.label) {
    lines.push(`Modulo: ${cleanText(debugInfo.label)}`);
  }

  if (debugInfo.desktopRelativePath) {
    lines.push(`Recurso esperado: ${cleanText(debugInfo.desktopRelativePath)}`);
  }

  if (debugInfo.assetUrl) {
    lines.push(`URL runtime: ${cleanText(debugInfo.assetUrl)}`);
  }

  if (debugInfo.loaderMode) {
    lines.push(`Secuencia de carga: ${cleanText(debugInfo.loaderMode)}`);
  }

  if (debugInfo.primaryError) {
    lines.push(`Error principal: ${cleanText(debugInfo.primaryError)}`);
  }

  if (debugInfo.secondaryError) {
    lines.push(`Error secundario: ${cleanText(debugInfo.secondaryError)}`);
  }

  lines.push(`Assets externos detectados: ${debugInfo.hasExternalAssets ? "si" : "no"}`);

  if (debugInfo.runtimeProtocol) {
    lines.push(`Protocolo runtime: ${cleanText(debugInfo.runtimeProtocol)}`);
  }

  lines.push(`API desktop visible: ${debugInfo.desktopApiAvailable ? "si" : "no"}`);
  lines.push(`readAssetText disponible: ${debugInfo.desktopApiReadAssetAvailable ? "si" : "no"}`);

  if (debugInfo.assetBaseUrl) {
    lines.push(`Base assets: ${cleanText(debugInfo.assetBaseUrl)}`);
  }

  if (snapshot) {
    if (snapshot.assetDirectory) {
      lines.push(`Carpeta assets resuelta: ${cleanText(snapshot.assetDirectory)}`);
    }

    if (Array.isArray(snapshot.candidates) && snapshot.candidates.length > 0) {
      lines.push("Rutas candidatas:");

      for (const candidate of snapshot.candidates) {
        if (!candidate?.path) {
          continue;
        }

        lines.push(`- ${candidate.exists ? "[OK]" : "[NO]"} ${cleanText(candidate.path)}`);
      }
    }

    if (Array.isArray(snapshot.files) && snapshot.files.length > 0) {
      lines.push("Ficheros revisados:");

      for (const file of snapshot.files) {
        if (!file?.relativePath) {
          continue;
        }

        lines.push(`- ${file.exists ? "[OK]" : "[NO]"} ${cleanText(file.relativePath)}`);
      }
    }
  }

  return lines;
}

function renderBestiaryDetailMedia(entry) {
  const mediaUrl = entry.imageUrl || entry.tokenUrl;

  if (mediaUrl) {
    return `
      <div class="bestiary-detail__media">
        <figure class="bestiary-portrait">
          <img
            class="bestiary-portrait__image"
            src="${escapeHtml(mediaUrl)}"
            alt="Ilustracion de ${escapeHtml(entry.name)} (${escapeHtml(entry.sourceLabel)})"
            loading="lazy"
          />
        </figure>
      </div>
    `;
  }

  return `
    <div class="bestiary-detail__media">
      <div class="bestiary-portrait bestiary-portrait--empty" aria-label="Ilustracion no disponible">
        <div class="bestiary-portrait__placeholder">${escapeHtml(getBestiaryInitials(entry.name))}</div>
        <p class="bestiary-portrait__hint">Sin ilustracion vinculada</p>
      </div>
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

function renderBestiaryMetric(label, value) {
  const metricValue = String(value ?? "");
  const sizeClass = getBestiaryMetricSizeClass(metricValue);

  return `
    <article class="bestiary-metric-card ${sizeClass}">
      <span>${escapeHtml(label)}</span>
      <strong title="${escapeHtml(metricValue)}">${escapeHtml(metricValue)}</strong>
    </article>
  `;
}

function getBestiaryMetricSizeClass(value) {
  const length = cleanText(value).length;

  if (length >= 28) {
    return "bestiary-metric-card--xs";
  }

  if (length >= 20) {
    return "bestiary-metric-card--sm";
  }

  return "";
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

function renderBestiarySection(title, content, options = {}) {
  const bodyHtml = options.linkSpells
    ? renderTextWithSpellLinks(content)
    : escapeHtml(content).replaceAll("\n", "<br />");

  return `
    <section class="detail-section">
      <h4>${title}</h4>
      <p>${bodyHtml}</p>
    </section>
  `;
}

function renderTextWithSpellLinks(content) {
  const text = cleanText(content);
  const spellLinkData = getArcanumSpellLinkData();

  if (!text || !spellLinkData.pattern) {
    return escapeHtml(content).replaceAll("\n", "<br />");
  }

  const chunks = [];
  let lastIndex = 0;
  spellLinkData.pattern.lastIndex = 0;

  for (const match of text.matchAll(spellLinkData.pattern)) {
    const [fullMatch, prefix, spellName] = match;
    const matchIndex = match.index ?? 0;
    const spellStartIndex = matchIndex + prefix.length;
    const canonicalName = spellLinkData.namesByLower.get(spellName.toLowerCase()) ?? spellName;

    chunks.push(escapeHtml(text.slice(lastIndex, spellStartIndex)));
    chunks.push(`<button class="spell-reference-link" type="button" data-action="filter-arcanum-by-spell-name" data-arcanum-spell-name="${escapeHtml(canonicalName)}">${escapeHtml(spellName)}</button>`);
    lastIndex = matchIndex + fullMatch.length;
  }

  chunks.push(escapeHtml(text.slice(lastIndex)));

  return chunks.join("").replaceAll("\n", "<br />");
}

function getArcanumSpellLinkData() {
  const signature = getArcanumSpellLinkSignature();

  if (arcanumSpellLinkCache.signature === signature) {
    return arcanumSpellLinkCache;
  }

  const spellNames = [...new Set(state.arcanum.map((entry) => cleanText(entry.name)).filter((name) => name.length >= 3))]
    .sort((left, right) => right.length - left.length || left.localeCompare(right, "es", { sensitivity: "base" }));
  const namesByLower = new Map(spellNames.map((name) => [name.toLowerCase(), name]));
  const pattern = spellNames.length > 0
    ? new RegExp(`(^|[^A-Za-z0-9])(${spellNames.map(escapeRegExp).join("|")})(?=$|[^A-Za-z0-9])`, "gi")
    : null;

  arcanumSpellLinkCache = {
    signature,
    pattern,
    namesByLower
  };

  return arcanumSpellLinkCache;
}

function getArcanumSpellLinkSignature() {
  return `${state.arcanum.length}:${state.arcanum.map((entry) => entry.id).join("|")}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        </div>
        <div class="th-actions">
          <button
            class="sort-button ${isActive ? "is-active" : ""}"
            type="button"
            data-action="toggle-sort"
            data-sort-key="${column.key}"
            aria-label="Ordenar por ${column.label}"
          >
            <span>${sortLabel}</span>
          </button>
          <button
            class="filter-button ${state.filters[column.key] ? "is-active" : ""}"
            type="button"
            data-action="toggle-filter"
            data-filter-key="${column.key}"
            aria-label="Abrir filtro de ${column.label}"
          >
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

function renderCombatRow(combatant, activeTurnCombatantId = "") {
  const isDead = isCombatantDead(combatant);
  const isActiveTurn = combatant.id === activeTurnCombatantId;

  return `
    <tr
      class="row--${combatant.side} ${state.selectedIds.has(combatant.id) ? "row--selected" : ""} ${isDead ? "row--dead" : ""} ${isActiveTurn ? "row--active-turn" : ""}"
      data-combat-row-id="${escapeHtml(combatant.id)}"
      tabindex="-1"
    >
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
            type="text"
            inputmode="text"
            value="${escapeHtml(String(value))}"
            data-edit-id="${combatant.id}"
            data-edit-key="${column.key}"
          />
          ${
            isInitiativeNat20
              ? `<span class="nat20-badge">Nat 20</span>`
              : combatant.initiativeRoll
                ? `<span class="initiative-note">d20 ${combatant.initiativeRoll}</span>`
                : ""
          }
        </div>
      </td>
    `;
  }

  if (column.key === "nombre") {
    const suggestions = getCombatNameSuggestions(combatant);
    const sourceChip = renderCombatantSourceChip(combatant);
    const token = renderCombatantNameToken(combatant);

    return `
      <td>
        <div class="name-cell combat-name-cell" data-combat-name-search-menu>
          <div class="combat-name-cell__main">
            <input
              class="cell-input cell-input--strong"
              type="text"
              inputmode="text"
              value="${escapeHtml(String(value))}"
              data-edit-id="${combatant.id}"
              data-edit-key="${column.key}"
              autocomplete="off"
            />
            ${token}
          </div>
          ${isDead || sourceChip ? `
            <div class="name-cell__chips">
              ${isDead ? `<span class="death-badge">Muerto</span>` : ""}
              ${sourceChip}
            </div>
          ` : ""}
          ${
            state.activeCombatNameSearchId === combatant.id && suggestions.length > 0
              ? `
                <div class="combat-name-suggestions" role="listbox" aria-label="Criaturas del bestiario">
                  ${suggestions.map((entry) => renderCombatNameSuggestion(combatant.id, entry)).join("")}
                </div>
              `
              : ""
          }
        </div>
      </td>
    `;
  }

  if (column.key === "pgMax") {
    const effectiveMax = getEffectivePgMax(combatant);
    const showEffectiveMax = toNumber(combatant.necrotic) !== 0;
    const armorClass = combatant.ca ?? "";

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
          <label class="armor-badge" aria-label="CA de ${escapeHtml(combatant.nombre || combatant.id)}">
            <svg class="armor-badge__icon" viewBox="0 0 48 54" aria-hidden="true">
              <path d="M24 3 42 9v14.7c0 11.8-7 22-18 27.3C13 45.7 6 35.5 6 23.7V9l18-6Z" />
            </svg>
            <input
              class="armor-badge__input"
              type="number"
              inputmode="numeric"
              value="${escapeHtml(String(armorClass))}"
              data-edit-id="${combatant.id}"
              data-edit-key="ca"
              aria-label="CA de ${escapeHtml(combatant.nombre || combatant.id)}"
            />
          </label>
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
    const tagValue = combatTagOptions.includes(value) ? value : "NEUTRAL";

    return `
      <td>
        <button
          class="tag-cycle-button tag-cycle-button--${tagValue.toLowerCase()}"
          type="button"
          data-action="cycle-combat-tag"
          data-combatant-id="${escapeHtml(combatant.id)}"
          aria-label="Cambiar bando de ${escapeHtml(combatant.nombre || combatant.id)}. Actual: ${escapeHtml(tagValue)}"
        >
          <span>${escapeHtml(tagValue)}</span>
        </button>
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

  if (column.key === "crExp") {
    const linkedCharacter = getLinkedCharacterForCombatant(combatant);

    if (linkedCharacter && cleanText(combatant.tag).toUpperCase() === "ALIADO") {
      return `
        <td>
          <div class="combat-character-xp-cell">
            ${renderCharacterExperienceBar(linkedCharacter, { compact: true })}
          </div>
        </td>
      `;
    }

    return `
      <td>
        <input
          class="cell-input"
          type="text"
          inputmode="text"
          value="${escapeHtml(formatCombatCrDisplay(value))}"
          data-edit-id="${combatant.id}"
          data-edit-key="${column.key}"
        />
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

function getLinkedCharacterForCombatant(combatant) {
  const characterId = cleanText(combatant.characterId);

  if (!characterId) {
    return null;
  }

  return state.characters.find((character) => character.id === characterId) ?? null;
}

function renderCombatNameSuggestion(combatantId, entry) {
  const sourceCode = entry.source || "?";

  return `
    <button
      class="combat-name-suggestions__option"
      type="button"
      data-action="select-combat-name-suggestion"
      data-combatant-id="${escapeHtml(combatantId)}"
      data-entry-id="${escapeHtml(entry.id)}"
    >
      <strong>${escapeHtml(entry.name)} (${escapeHtml(sourceCode)})</strong>
      <span>CR ${formatCrNumber(entry.crBaseValue)} | ${escapeHtml(entry.type || "Sin tipo")}</span>
    </button>
  `;
}

function renderCombatantNameToken(combatant) {
  if (!isEnemyCombatant(combatant)) {
    return "";
  }

  const bestiaryEntry = getCombatantBestiaryEntry(combatant);
  const tokenUrl = bestiaryEntry?.tokenUrl || "";

  if (!tokenUrl) {
    return "";
  }

  return `
    <span class="combat-name-token-wrap">
      <button
        class="combat-name-token-button"
        type="button"
        data-action="open-combatant-bestiary"
        data-entry-id="${escapeHtml(bestiaryEntry.id)}"
        aria-label="Abrir ${escapeHtml(bestiaryEntry.name)} en bestiario"
      >
        <img
          class="combat-name-token"
          src="${escapeHtml(tokenUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </button>
      ${renderCombatTokenPreview(bestiaryEntry)}
    </span>
  `;
}

function renderCombatTokenPreview(entry) {
  const sections = [
    entry.traits ? { title: "Traits", content: entry.traits } : null,
    entry.actions ? { title: "Actions", content: entry.actions } : null
  ].filter(Boolean);
  const defenses = [
    { label: "Vulnerabilidades", value: entry.damageVulnerabilities },
    { label: "Resistencias", value: entry.damageResistances },
    { label: "Inmunidades", value: entry.damageImmunities },
    { label: "Condiciones inmunes", value: entry.conditionImmunities }
  ].filter((item) => item.value);

  return `
    <div class="combat-token-preview" role="tooltip">
      <div class="combat-token-preview__header">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(entry.sourceFullName || getBestiarySourceFullName(entry.source) || entry.source || "Sin fuente")}</span>
        </div>
        <small>CR ${escapeHtml(entry.crBaseLabel || entry.crLabel || "-")}</small>
      </div>
      <div class="combat-token-preview__metrics">
        ${renderBestiaryMetric("CA", entry.ac || "-")}
        ${renderBestiaryMetric("Velocidad", entry.speed || "-")}
      </div>
      <div class="combat-token-preview__abilities">
        ${statKeys.map((ability) => renderBestiaryAbility(entry, ability)).join("")}
      </div>
      ${
        defenses.length > 0
          ? `
            <div class="combat-token-preview__defenses">
              ${defenses.map((item) => renderDetailChip(item.label, item.value)).join("")}
            </div>
          `
          : ""
      }
      <div class="combat-token-preview__sections">
        ${
          sections.length > 0
            ? sections.map((section) => renderBestiarySection(section.title, section.content)).join("")
            : `<section class="detail-section"><h4>Traits</h4><p>Sin traits o acciones indicadas.</p></section>`
        }
      </div>
    </div>
  `;
}

function renderCombatantSourceChip(combatant) {
  if (!isEnemyCombatant(combatant)) {
    return "";
  }

  const bestiaryEntry = getCombatantBestiaryEntry(combatant);
  const sourceCode = combatant.source || bestiaryEntry?.source || "";
  const sourceOptions = getCombatantSourceOptions(combatant);

  if (!sourceCode || sourceOptions.length === 0) {
    return "";
  }

  const isOpen = state.activeCombatSourceId === combatant.id;

  return `
    <span class="combat-source-chip" data-combat-source-menu>
      <button
        class="death-badge combat-source-chip__trigger"
        type="button"
        data-action="toggle-combat-source"
        data-combatant-id="${escapeHtml(combatant.id)}"
        aria-expanded="${isOpen}"
      >
        ${escapeHtml(sourceCode)}
      </button>
      ${
        isOpen
          ? `
            <span class="combat-source-chip__popover" role="listbox" aria-label="Sources disponibles">
              ${sourceOptions.map((entry) => `
                <button
                  class="combat-source-chip__option ${entry.source === sourceCode ? "is-active" : ""}"
                  type="button"
                  data-action="select-combat-source"
                  data-combatant-id="${escapeHtml(combatant.id)}"
                  data-combat-source="${escapeHtml(entry.source)}"
                >
                  <strong>${escapeHtml(entry.source)}</strong>
                  <span>${escapeHtml(entry.sourceFullName || getBestiarySourceFullName(entry.source) || entry.source)}</span>
                </button>
              `).join("")}
            </span>
          `
          : ""
      }
    </span>
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

function renderCharactersScreen() {
  const visibleCharacters = getVisibleCharacters();
  let activeCharacter = getActiveCharacter();

  if (!activeCharacter && state.characters.length > 0) {
    activeCharacter = visibleCharacters[0] ?? state.characters[0];
    state.activeCharacterId = activeCharacter.id;
  }
  return `
    <section class="panel panel--table characters-screen">
      ${renderCharactersOverviewPanel(state.characters)}
      <div class="section-heading">
        <div>
          <p class="eyebrow">Aliados de campana</p>
          <h3>Personajes</h3>
        </div>
        <div class="section-meta">
          <span>${state.characters.length} fichas</span>
        </div>
      </div>

      <div class="characters-toolbar-wrap" data-character-skill-config-menu>
      <div class="characters-toolbar">
        <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-character">
          Nuevo personaje
        </button>
        <button class="toolbar-button" type="button" data-action="duplicate-character" ${activeCharacter ? "" : "disabled"}>
          Duplicar
        </button>
        <button class="toolbar-button toolbar-button--danger" type="button" data-action="delete-character" ${activeCharacter ? "" : "disabled"}>
          Eliminar
        </button>
        <button
          class="toolbar-button characters-toolbar__skills-action ${state.characterSkillConfigOpen ? "is-active" : ""}"
          type="button"
          data-action="toggle-character-skill-config"
          aria-expanded="${state.characterSkillConfigOpen}"
        >
          <span class="button-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="m19.14 12.94.04-.94-.04-.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.5 7.5 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.57.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.84a.5.5 0 0 0 .12.64l2.03 1.58-.04.94.04.94-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.57-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
            </svg>
          </span>
          Skills
        </button>
        <button class="toolbar-button toolbar-button--combat characters-toolbar__combat-action" type="button" data-action="add-character-to-combat" ${activeCharacter ? "" : "disabled"}>
          Anadir al combate
        </button>
      </div>
      ${state.characterSkillConfigOpen ? renderCharacterSkillConfigSection() : ""}
      </div>

      <div class="characters-layout">
        <aside class="characters-list" aria-label="Lista de personajes">
          ${
            visibleCharacters.length > 0
              ? visibleCharacters.map((character) => renderCharacterListItem(character)).join("")
              : `<div class="empty-state empty-state--compact">No hay personajes. Crea un aliado para usarlo en combate.</div>`
          }
        </aside>
        <div class="characters-editor">
          ${activeCharacter ? renderCharacterEditor(activeCharacter) : renderCharacterEmpty()}
        </div>
      </div>
    </section>
  `;
}

function renderCharacterListItem(character) {
  const isActive = character.id === state.activeCharacterId;
  const subtitle = [
    character.className,
    character.level ? `Nivel ${character.level}` : "",
    character.playerName
  ].filter(Boolean).join(" | ");
  const classIcon = getCharacterClassIcon(character.className);

  return `
    <button
      class="character-list-item ${isActive ? "is-active" : ""}"
      type="button"
      data-action="select-character"
      data-character-id="${escapeHtml(character.id)}"
      aria-pressed="${isActive}"
    >
      ${renderCharacterAvatar(character)}
      <span class="character-list-item__copy">
        <strong>${escapeHtml(character.name || "Personaje sin nombre")}</strong>
        <small>${escapeHtml(subtitle || "ALIADO")}</small>
      </span>
      ${
        classIcon
          ? `<span class="character-list-item__class-icon" data-class-icon-key="${escapeHtml(classIcon.key)}" aria-hidden="true"><img src="${escapeHtml(classIcon.src)}" alt="${escapeHtml(classIcon.alt)}" /></span>`
          : ""
      }
    </button>
  `;
}

function renderCharacterAvatar(character) {
  if (character.tokenUrl) {
    return `<img class="character-avatar" src="${escapeHtml(character.tokenUrl)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`;
  }

  return `<span class="character-avatar character-avatar--empty" aria-hidden="true">${escapeHtml(getCharacterInitials(character))}</span>`;
}

function renderCharacterEditor(character) {
  return `
    <div class="bestiary-detail__header character-sheet__header">
      <div class="character-sheet__header-main">
        <p class="eyebrow">Ficha rapida 5e</p>
        <div class="character-sheet__header-fields">
          ${renderCharacterTextField("name", "Nombre", character.name, "Seraphina Vale", { compact: true })}
          ${renderCharacterTextField("playerName", "Jugador", character.playerName, "Victor", { compact: true })}
        </div>
      </div>
      ${renderCharacterHeaderAside(character)}
    </div>

    <div class="character-editor__section character-editor__section--identity">
      <div class="character-identity-grid">
        ${renderCharacterTextField("className", "Clase", character.className, "Guerrero")}
        ${renderCharacterTextField("subclassName", "Subclase", character.subclassName, "Campeon")}
        ${renderCharacterTextField("species", "Especie", character.species, "Humano")}
        ${renderCharacterTextField("size", "Talla", character.size, "Mediano")}
      </div>
    </div>

    <div class="character-stat-portrait-group">
      ${renderCharacterStatsPanel(character)}
      <div class="character-sheet__side">
        <div class="character-metrics-strip">
          ${renderCharacterMetricField("maxHp", "PG MAX", character.maxHp)}
          ${renderCharacterMetricField("armorClass", "CA", character.armorClass)}
          ${renderCharacterMetricField("initiativeBonus", "Bonus iniciativa", character.initiativeBonus)}
          ${renderCharacterMetricField("speed", "Velocidad", character.speed, "30 ft")}
        </div>
        ${renderCharacterDetailMedia(character)}
      </div>
    </div>

    <div class="bestiary-sections character-sheet__extras">
      ${renderCharacterSkillSection(character)}
      ${renderCharacterInventorySection(character)}
    </div>
  `;
}

function renderCharactersOverviewPanel(characters) {
  if (!characters.length) {
    return "";
  }

  return `
    <section class="character-overview">
      <div class="section-heading section-heading--compact">
        <div>
          <p class="eyebrow">Resumen de grupo</p>
          <h3>Vista rapida</h3>
        </div>
      </div>
      <div class="table-wrap character-overview__table-wrap" role="region" aria-label="Resumen de personajes">
        <table class="combat-table character-overview-table">
          <colgroup>
            <col style="width: 9rem" />
            <col style="width: 5.5rem" />
            <col style="width: 4.5rem" />
            <col style="width: 5.5rem" />
            <col style="width: 5.5rem" />
            <col style="width: 6.5rem" />
            <col style="width: 10.5rem" />
            <col style="width: 9.5rem" />
            <col style="width: 33rem" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Personaje</th>
              <th scope="col">PG max</th>
              <th scope="col">CA</th>
              <th scope="col">Vel.</th>
              <th scope="col">Talla</th>
              <th scope="col">Percep.</th>
              <th scope="col">XP</th>
              <th scope="col">Carga</th>
              <th scope="col">Skills</th>
            </tr>
          </thead>
          <tbody>
            ${characters.map((character) => renderCharacterOverviewRow(character)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCharacterOverviewRow(character) {
  const experience = getCharacterExperienceProgress(character);
  const load = getCharacterInventoryLoad(character);
  const xpLabelParts = {
    left: `NV ${experience.level}`,
    right: `${Math.round(experience.progressPercent)}%`
  };
  const loadLabelParts = {
    left: `${formatWeight(load.totalWeight)} / ${formatWeight(load.maxWeight)}`,
    right: `${Math.round(load.percent)}%`
  };

  return `
    <tr>
      <td>
        <div class="character-overview__identity">
          <strong>${escapeHtml(character.name || "Personaje")}</strong>
          <small>${escapeHtml(character.className || "Sin clase")}</small>
        </div>
      </td>
      <td>${renderCharacterOverviewField(character.id, "maxHp", character.maxHp ?? 0, "number")}</td>
      <td>${renderCharacterOverviewField(character.id, "armorClass", character.armorClass ?? 0, "number")}</td>
      <td>${renderCharacterOverviewField(character.id, "speed", character.speed || "", "text", "30 ft")}</td>
      <td>${renderCharacterOverviewField(character.id, "size", character.size || "", "text", "Mediano")}</td>
      <td>${escapeHtml(String(getCharacterPassivePerception(character)))}</td>
      <td>
        <div class="character-overview__stack">
          ${renderCharacterOverviewSplitProgressBar(
        xpLabelParts.left,
        xpLabelParts.right,
        experience.progressPercent,
        "xp"
      )}
        </div>
      </td>
      <td>${renderCharacterOverviewSplitProgressBar(
        loadLabelParts.left,
        loadLabelParts.right,
        load.percent,
        "load"
      )}</td>
      <td>${renderCharacterSkillSummary(character)}</td>
    </tr>
  `;
}

function renderCharacterOverviewField(characterId, key, value, type = "text", placeholder = "") {
  const numericAttributes = type === "number" ? " inputmode=\"numeric\"" : "";
  const placeholderAttribute = placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : "";

  return `
    <input
      class="character-overview__input"
      type="${type}"
      ${numericAttributes}
      value="${escapeHtml(String(value ?? ""))}"
      ${placeholderAttribute}
      data-character-overview-id="${escapeHtml(characterId)}"
      data-character-overview-field="${escapeHtml(key)}"
    />
  `;
}

function renderCharacterOverviewValue(value) {
  return `<span class="character-overview__value">${escapeHtml(String(value ?? ""))}</span>`;
}

function renderCharacterOverviewProgressBar(label, percent, tone, extraStyle = "") {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const styleAttribute = [`--overview-fill: ${clampedPercent.toFixed(2)}%`, extraStyle].filter(Boolean).join("; ");

  return `
    <div class="character-overview-bar character-overview-bar--${tone}" style="${styleAttribute}">
      <span class="character-overview-bar__fill" aria-hidden="true"></span>
      <span class="character-overview-bar__label">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderCharacterOverviewSplitProgressBar(leftLabel, rightLabel, percent, tone, extraStyle = "") {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const styleAttribute = [`--overview-fill: ${clampedPercent.toFixed(2)}%`, extraStyle].filter(Boolean).join("; ");

  return `
    <div class="character-overview-bar character-overview-bar--${tone}" style="${styleAttribute}">
      <span class="character-overview-bar__fill" aria-hidden="true"></span>
      <span class="character-overview-bar__label character-overview-bar__label--split">
        <span class="character-overview-bar__label-left">${escapeHtml(leftLabel)}</span>
        <span class="character-overview-bar__label-right">${escapeHtml(rightLabel)}</span>
      </span>
    </div>
  `;
}

function getCharacterSkillSummaryBarParts(progress) {
  return {
    level: `NV. ${progress.level}`,
    detail: progress.isMaxLevel
      ? "MAX"
      : `${formatExperiencePoints(progress.levelExperiencePoints)} / ${formatExperiencePoints(progress.requiredExperiencePoints)}`
  };
}

function renderCharacterOverviewSkillProgressBar(progress, extraStyle = "") {
  const clampedPercent = Math.max(0, Math.min(100, progress.progressPercent));
  const styleAttribute = [`--overview-fill: ${clampedPercent.toFixed(2)}%`, extraStyle].filter(Boolean).join("; ");
  const parts = getCharacterSkillSummaryBarParts(progress);

  return `
    <div class="character-overview-bar character-overview-bar--skill" style="${styleAttribute}">
      <span class="character-overview-bar__fill" aria-hidden="true"></span>
      <span class="character-overview-bar__label character-overview-bar__label--split">
        <span class="character-overview-bar__label-left">${escapeHtml(parts.level)}</span>
        <span class="character-overview-bar__label-right">${escapeHtml(parts.detail)}</span>
      </span>
    </div>
  `;
}

function normalizeStoredCharacterSkillColor(value, fallback = "#5eb7a6") {
  const normalizedValue = cleanText(value);
  const hexPattern = /^#([0-9a-f]{6})$/i;

  if (hexPattern.test(normalizedValue)) {
    return normalizedValue.toLowerCase();
  }

  return cleanText(fallback) || "#5eb7a6";
}

function hexToRgba(hexColor, alpha) {
  const normalized = normalizeStoredCharacterSkillColor(hexColor, "#5eb7a6").replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildCharacterSkillThemeFromAccent(accentColor) {
  const accent = normalizeStoredCharacterSkillColor(accentColor, "#5eb7a6");
  return {
    accent,
    border: hexToRgba(accent, 0.34),
    surfaceGlow: hexToRgba(accent, 0.18),
    surface: hexToRgba(accent, 0.12),
    summarySurface: hexToRgba(accent, 0.18),
    fillStart: hexToRgba(accent, 0.94),
    fillEnd: "rgba(240, 200, 121, 0.92)"
  };
}

function hslToHex(hue, saturation = 68, lightness = 63) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (normalizedHue < 60) {
    red = chroma;
    green = x;
  } else if (normalizedHue < 120) {
    red = x;
    green = chroma;
  } else if (normalizedHue < 180) {
    green = chroma;
    blue = x;
  } else if (normalizedHue < 240) {
    green = x;
    blue = chroma;
  } else if (normalizedHue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (value) => Math.round((value + match) * 255).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function getDefaultCharacterSkillColorForIdentity(skillId = "", skillName = "") {
  const normalizedId = cleanText(skillId);
  const normalizedName = cleanText(skillName).toLowerCase();
  const directColors = {
    "skill-despiece": "#d88d5a",
    "skill-pesca": "#5d9cec",
    "skill-forrajeo": "#78b96d",
    "skill-cocina": "#f0c879",
    "skill-cerraduras": "#b987f2",
    "skill-trampas-puertas-secretas": "#e06d78"
  };

  if (directColors[normalizedId]) {
    return directColors[normalizedId];
  }

  const key = normalizedId || normalizedName || "skill";
  const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return characterSkillColorPalette[hash % characterSkillColorPalette.length];
}

function getNextCharacterSkillColor(existingDefinitions = state.characterSkillDefinitions) {
  const usedColors = new Set(
    Array.isArray(existingDefinitions)
      ? existingDefinitions.map((definition) => normalizeStoredCharacterSkillColor(definition?.color, "")).filter(Boolean)
      : []
  );
  const firstUnused = characterSkillColorPalette.find((color) => !usedColors.has(color));

  if (firstUnused) {
    return firstUnused;
  }

  const nextIndex = Array.isArray(existingDefinitions) ? existingDefinitions.length : 0;
  return hslToHex((nextIndex * 47) + 23);
}

function getCharacterSkillTheme(skillDefinition) {
  return buildCharacterSkillThemeFromAccent(
    skillDefinition?.color || getDefaultCharacterSkillColorForIdentity(skillDefinition?.id, skillDefinition?.name)
  );
}

function getCharacterSkillThemeStyle(skillDefinition) {
  const theme = getCharacterSkillTheme(skillDefinition);
  return [
    `--skill-accent: ${theme.accent}`,
    `--skill-border: ${theme.border}`,
    `--skill-surface-glow: ${theme.surfaceGlow}`,
    `--skill-surface: ${theme.surface}`,
    `--skill-summary-surface: ${theme.summarySurface}`,
    `--skill-fill-start: ${theme.fillStart}`,
    `--skill-fill-end: ${theme.fillEnd}`
  ].join("; ");
}

function renderCharacterSkillSummary(character) {
  if (!state.characterSkillDefinitions.length) {
    return `<span class="character-overview__value">Sin skills</span>`;
  }

  return `
    <div class="character-skill-summary">
      ${state.characterSkillDefinitions.map((skillDefinition) => {
        const progress = getCharacterSkillProgress(getCharacterSkillProgressEntry(character, skillDefinition.id));
        const themeStyle = getCharacterSkillThemeStyle(skillDefinition);

        return `
          <div class="character-skill-summary__item" style="${themeStyle}">
            <div class="character-skill-summary__meta">
              <strong>${escapeHtml(skillDefinition.name || "Skill")}</strong>
              <small>${escapeHtml(progress.label)}</small>
            </div>
            ${renderCharacterOverviewSkillProgressBar(progress, themeStyle)}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCharacterHeaderAside(character) {
  return `
    <div class="character-sheet__header-side">
      ${renderCharacterCarryLoadCard(character)}
      ${renderCharacterExperienceBar(character)}
    </div>
  `;
}

function renderCharacterCarryLoadCard(character) {
  const load = getCharacterInventoryLoad(character);
  const loadPercentLabel = `${Math.round(load.percent)}%`;

  return `
    <section class="character-carry-card" aria-label="Carga del inventario">
      <div class="character-carry-card__icon-wrap" aria-hidden="true">
        <svg class="character-carry-card__icon" viewBox="0 0 64 64" focusable="false">
          <path d="M22 18c0-6 4-10 10-10s10 4 10 10h6c5 0 8 3 8 8v24c0 4-3 7-7 7H15c-4 0-7-3-7-7V26c0-5 3-8 8-8h6zm6 0h8c0-3-1-5-4-5s-4 2-4 5zm-9 8c-3 0-5 2-5 5v18c0 2 1 3 3 3h30c2 0 3-1 3-3V31c0-3-2-5-5-5h-2v5c0 2-1 3-3 3s-3-1-3-3v-5H27v5c0 2-1 3-3 3s-3-1-3-3v-5h-2z"/>
        </svg>
        <span class="character-carry-card__percent">${escapeHtml(loadPercentLabel)}</span>
      </div>
      <div class="character-carry-card__meta">
        <span>Carga</span>
        <strong>${escapeHtml(formatWeight(load.totalWeight))} / ${escapeHtml(formatWeight(load.maxWeight))} lb</strong>
      </div>
    </section>
  `;
}

function renderCharacterSkillConfigSection() {
  return `
    <section class="detail-section character-skill-config">
      <div class="character-skill-config__header">
        <div>
          <h4>Skills comunes</h4>
          <p>Esta lista y sus ganancias de XP se comparten entre todos los personajes.</p>
        </div>
      </div>
      <div class="character-skill-config__actions">
        <button class="toolbar-button toolbar-button--subtle" type="button" data-action="add-character-skill-definition">
          Anadir skill
        </button>
      </div>
      <div class="character-skill-config__list">
        ${
          state.characterSkillDefinitions.length > 0
            ? state.characterSkillDefinitions.map((skillDefinition) => renderCharacterSkillConfigRow(skillDefinition)).join("")
            : `<div class="empty-state empty-state--compact">No hay skills comunes configuradas.</div>`
        }
      </div>
    </section>
  `;
}

function renderCharacterSkillConfigRow(skillDefinition) {
  const hasIntermediateGains = normalizeStoredCharacterSkillGains(skillDefinition.intermediateGains, []).length > 0;
  const themeStyle = getCharacterSkillThemeStyle(skillDefinition);

  return `
    <div class="character-skill-config__row ${hasIntermediateGains ? "character-skill-config__row--with-intermediate" : ""}" style="${themeStyle}">
      <label class="character-skill-config__field character-skill-config__field--name">
        <span>Skill</span>
        <input
          class="filter-input character-skill-config__input"
          type="text"
          value="${escapeHtml(skillDefinition.name)}"
          placeholder="Nueva skill"
          data-character-skill-definition-field="name"
          data-character-skill-definition-id="${escapeHtml(skillDefinition.id)}"
        />
      </label>
      <label class="character-skill-config__field">
        <span>XP por fracaso</span>
        <span class="character-skill-config__gains">
          ${renderCharacterSkillGainInputs(skillDefinition.id, "failureGains", skillDefinition.failureGains)}
        </span>
      </label>
      ${
        hasIntermediateGains
          ? `
            <label class="character-skill-config__field">
              <span>XP intermedio</span>
              <span class="character-skill-config__gains">
                ${renderCharacterSkillGainInputs(skillDefinition.id, "intermediateGains", skillDefinition.intermediateGains)}
              </span>
            </label>
          `
          : ""
      }
      <label class="character-skill-config__field">
        <span>XP por exito</span>
        <span class="character-skill-config__gains">
          ${renderCharacterSkillGainInputs(skillDefinition.id, "successGains", skillDefinition.successGains)}
        </span>
      </label>
      <button
        class="toolbar-button toolbar-button--subtle-danger"
        type="button"
        data-action="remove-character-skill-definition"
        data-character-skill-definition-id="${escapeHtml(skillDefinition.id)}"
      >
        Quitar
      </button>
    </div>
  `;
}

function renderCharacterSkillGainInputs(skillDefinitionId, field, values) {
  return values.map((value, index) => `
    <input
      class="filter-input character-skill-config__input"
      type="number"
      inputmode="numeric"
      min="0"
      value="${escapeHtml(String(value))}"
      data-character-skill-definition-field="${escapeHtml(field)}"
      data-character-skill-definition-id="${escapeHtml(skillDefinitionId)}"
      data-character-skill-definition-gain-index="${index}"
      aria-label="${escapeHtml(`${field} ${index + 1}`)}"
    />
  `).join("");
}

function renderCharacterSkillSection(character) {
  const isExpanded = state.characterSkillsExpanded;

  return `
    <section class="detail-section character-skill-tracks">
      <div class="character-skill-tracks__header">
        <div>
          <h4>Skills de campana</h4>
          <p>${isExpanded ? "Configura nivel y progreso de este personaje en las skills comunes." : "Vista resumida de progreso y nivel actual."}</p>
        </div>
        <button
          class="character-skill-tracks__toggle"
          type="button"
          data-action="toggle-character-skills-view"
          aria-expanded="${isExpanded}"
        >
          ${isExpanded ? "Ocultar detalle" : "Ver detalle"}
        </button>
      </div>
      <div class="character-skill-tracks__list">
        ${
          state.characterSkillDefinitions.length > 0
            ? state.characterSkillDefinitions.map((skillDefinition) => renderCharacterSkillRow(character, skillDefinition)).join("")
            : `<div class="empty-state empty-state--compact">No hay skills comunes configuradas.</div>`
        }
      </div>
    </section>
  `;
}

function renderCharacterSkillRow(character, skillDefinition) {
  const skillProgress = getCharacterSkillProgressEntry(character, skillDefinition.id);
  const progress = getCharacterSkillProgress(skillProgress);
  const successGains = normalizeStoredCharacterSkillGains(skillDefinition.successGains, [2]);
  const intermediateGains = normalizeStoredCharacterSkillGains(skillDefinition.intermediateGains, []);
  const failureGains = normalizeStoredCharacterSkillGains(skillDefinition.failureGains, [1]);
  const levelExperienceLabel = progress.isMaxLevel
    ? "Rango maximo"
    : `${formatExperiencePoints(progress.levelExperiencePoints)} / ${formatExperiencePoints(progress.requiredExperiencePoints)} XP`;
  const themeStyle = getCharacterSkillThemeStyle(skillDefinition);
  const isExpanded = state.characterSkillsExpanded;
  const skillLevelLabel = progress.level > 0 ? `Nv ${progress.level}` : "Nv 0";
  const skillRankLabel = progress.level > 0 ? progress.label : "Sin rango";
  const clickableAttributes = !isExpanded
    ? ' data-action="toggle-character-skills-view" role="button" tabindex="0" aria-expanded="false"'
    : "";

  return `
    <article class="character-skill-row${!isExpanded ? " character-skill-row--clickable" : ""}" style="${themeStyle}"${clickableAttributes}>
      <div class="character-skill-row__top">
        <div class="character-skill-row__rank">
          <strong>${escapeHtml(skillDefinition.name)}</strong>
        </div>
        <div class="character-skill-row__meta">
          <span>${escapeHtml(skillRankLabel)}</span>
          <strong>${escapeHtml(skillLevelLabel)}</strong>
        </div>
      </div>
      <div class="character-skill-row__progress">
        ${renderCharacterSkillProgressBar(skillDefinition, skillProgress, levelExperienceLabel)}
      </div>
      ${
        isExpanded
          ? `
            <div class="character-skill-row__fields">
              <label class="character-skill-row__field character-skill-row__field--level">
                <span>Nivel</span>
                <select
                  class="character-skill-row__input character-skill-row__input--select"
                  data-character-skill-progress-field="level"
                  data-character-skill-id="${escapeHtml(skillDefinition.id)}"
                >
                  <option value="0" ${progress.level === 0 ? "selected" : ""}>0 - Sin rango</option>
                  ${characterSkillLevelProgression.map((entry) => `
                    <option value="${entry.level}" ${progress.level === entry.level ? "selected" : ""}>
                      ${entry.level} - ${escapeHtml(entry.label)}
                    </option>
                  `).join("")}
                </select>
              </label>
              <label class="character-skill-row__field">
                <span>XP nivel</span>
                <input
                  class="character-skill-row__input"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="${escapeHtml(String(progress.requiredExperiencePoints))}"
                  value="${escapeHtml(String(progress.levelExperiencePoints))}"
                  data-character-skill-progress-field="experiencePoints"
                  data-character-skill-id="${escapeHtml(skillDefinition.id)}"
                  aria-label="Experiencia del nivel actual"
                  ${progress.isMaxLevel ? "disabled" : ""}
                />
              </label>
            </div>
            <div class="character-skill-row__actions">
              ${renderCharacterSkillAwardButtons(skillDefinition.id, "failure", failureGains)}
              ${renderCharacterSkillAwardButtons(skillDefinition.id, "intermediate", intermediateGains)}
              ${renderCharacterSkillAwardButtons(skillDefinition.id, "success", successGains)}
            </div>
          `
          : ""
      }
    </article>
  `;
}

function renderCharacterSkillAwardButtons(skillDefinitionId, result, gains) {
  const resultLabel = result === "failure"
    ? "Fracaso"
    : result === "intermediate"
      ? "Intermedio"
      : "Exito";
  const toneClass = result === "failure"
    ? "character-skill-row__action--failure"
    : result === "intermediate"
      ? "character-skill-row__action--intermediate"
      : "character-skill-row__action--success";

  return gains.map((gain, index) => {
    const hasTiers = gains.length > 1;
    const tierLabel = hasTiers ? ` ${index + 1}` : "";

    return `
      <button
        class="character-skill-row__action ${toneClass}"
        type="button"
        data-action="award-character-skill-xp"
        data-character-skill-id="${escapeHtml(skillDefinitionId)}"
        data-character-skill-result="${escapeHtml(result)}"
        data-character-skill-gain-index="${index}"
      >
        <span>${escapeHtml(`${resultLabel}${tierLabel}`)}</span>
        <strong>+${escapeHtml(String(gain))} XP</strong>
      </button>
    `;
  }).join("");
}

function renderCharacterSkillProgressBar(skillDefinition, skillProgress, progressLabelOverride = "") {
  const progress = getCharacterSkillProgress(skillProgress);
  const fillStyle = `--skill-fill: ${progress.progressPercent.toFixed(2)}%`;
  const progressLabel = progressLabelOverride || (progress.isMaxLevel
    ? "Rango maximo"
    : `${progress.levelExperiencePoints} / ${progress.requiredExperiencePoints} XP`);
  const rankLabel = progress.level > 0
    ? `Nv ${progress.level} Â· ${progress.label}`
    : "Nv 0 Â· Sin rango";

  return `
    <div class="character-skill-progress" style="${fillStyle}" aria-label="Progreso de ${escapeHtml(skillDefinition.name || "skill")}">
      <div class="character-skill-progress__labels">
        <strong>${escapeHtml(rankLabel)}</strong>
      </div>
      <div class="character-skill-progress__status">
        <div class="character-skill-progress__track">
          <span class="character-skill-progress__fill" aria-hidden="true"></span>
          <span class="character-skill-progress__label">${escapeHtml(progressLabel)}</span>
        </div>
        <span class="character-skill-progress__percent">${escapeHtml(progress.isMaxLevel ? "MAX" : `${Math.round(progress.progressPercent)}%`)}</span>
      </div>
    </div>
  `;
}

function renderCharacterInventorySection(character) {
  const isOpen = character.inventoryOpen !== false;
  const nonCurrencyRows = character.inventory.filter((row) => !isCharacterCurrencyRow(row.name));
  const itemCount = nonCurrencyRows.length;
  const load = getCharacterInventoryLoad(character);

  return `
    <section class="detail-section character-inventory" data-character-inventory-menu>
      <div class="character-section-toggle character-section-toggle--inventory">
        <div class="character-inventory__heading">
          <span>Inventario</span>
          <div class="character-inventory__weight-summary">
            <strong>${escapeHtml(formatWeight(load.totalWeight))} / ${escapeHtml(formatWeight(load.maxWeight))} lb</strong>
          </div>
        </div>
        <div class="character-inventory__currency-summary">
          ${characterCurrencyRows.map((currency) => renderCharacterCurrencyPill(character, currency)).join("")}
        </div>
        <button
          class="character-section-toggle__button"
          type="button"
          data-action="toggle-character-inventory"
          aria-expanded="${isOpen}"
          aria-label="${isOpen ? "Ocultar inventario" : "Mostrar inventario"}"
        >
          <strong aria-hidden="true">${isOpen ? "-" : "+"}</strong>
        </button>
      </div>
      ${
        isOpen
          ? `
            <div class="character-inventory__body">
              <div class="character-inventory__toolbar">
                <p>${itemCount} objetos</p>
                <button class="toolbar-button toolbar-button--subtle" type="button" data-action="add-character-inventory-row">
                  Anadir objeto
                </button>
              </div>
              <div class="character-inventory__list">
                <div class="character-inventory__header" aria-hidden="true">
                  <span>Nombre</span>
                  <span>Talla</span>
                  <span>Cantidad</span>
                  <span></span>
                </div>
                ${
                  nonCurrencyRows.length > 0
                    ? nonCurrencyRows.map((row) => renderCharacterInventoryRow(row)).join("")
                    : `<div class="empty-state empty-state--compact">No hay objetos en inventario.</div>`
                }
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCharacterCurrencyPill(character, currency) {
  const row = character.inventory.find((entry) => cleanText(entry.name).toUpperCase() === currency.name);

  return `
    <label class="character-currency-pill character-currency-pill--${currency.icon}" title="${currency.name}">
      <span class="character-currency-pill__icon" aria-hidden="true"></span>
      <strong>${currency.shortLabel}</strong>
      <input
        class="character-currency-pill__input"
        type="number"
        inputmode="numeric"
        min="0"
        value="${escapeHtml(String(row?.quantity ?? 0))}"
        aria-label="${escapeHtml(currency.name)}"
        data-character-inventory-field="quantity"
        data-character-inventory-row="${escapeHtml(row?.id ?? "")}"
      />
    </label>
  `;
}

function getCharacterInventoryMatchedItemEntry(row) {
  return state.items.find((entry) => entry.id === row.itemId)
    ?? getItemEntryByName(row.name);
}

function renderCharacterInventoryItemPreview(entry) {
  return `
    <div class="character-inventory__item-preview" role="tooltip">
      <div class="character-inventory__item-preview-card">
        ${renderItemDetail(entry)}
      </div>
    </div>
  `;
}

function renderCharacterInventoryRow(row) {
  const isCurrencyRow = isCharacterCurrencyRow(row.name);
  const suggestions = getCharacterInventorySuggestions(row.id);
  const showSuggestions = state.showCharacterInventorySuggestions
    && state.activeCharacterInventoryRowId === row.id
    && suggestions.length > 0;
  const matchedItem = !isCurrencyRow ? getCharacterInventoryMatchedItemEntry(row) : null;

  return `
    <div class="character-inventory__row" data-character-inventory-menu>
      <div class="character-inventory__name-cell${matchedItem ? " character-inventory__name-cell--linked" : ""}" data-character-inventory-menu>
        <input
          class="filter-input character-inventory__input${matchedItem ? " character-inventory__input--linked" : ""}"
          type="search"
          value="${escapeHtml(row.name)}"
          placeholder="${isCurrencyRow ? "" : "Busca un item del catalogo"}"
          data-character-inventory-name="${escapeHtml(row.id)}"
          ${isCurrencyRow ? "readonly" : ""}
        />
        ${matchedItem ? renderCharacterInventoryItemPreview(matchedItem) : ""}
        ${
          !isCurrencyRow && showSuggestions
            ? `
              <div class="bestiary-query__popover character-inventory__suggestions" role="listbox" aria-label="Sugerencias de inventario">
                ${suggestions.map((entry) => `
                  <button
                    class="bestiary-query__option"
                    type="button"
                    data-action="select-character-inventory-suggestion"
                    data-character-inventory-row-id="${escapeHtml(row.id)}"
                    data-item-entry-id="${escapeHtml(entry.id)}"
                  >
                    ${escapeHtml(entry.name)}
                  </button>
                `).join("")}
              </div>
            `
            : ""
        }
      </div>
      <label class="character-inventory__field">
        <select
          class="filter-input character-inventory__input"
          data-character-inventory-field="size"
          data-character-inventory-row="${escapeHtml(row.id)}"
          ${isCurrencyRow ? "disabled" : ""}
        >
          ${itemSizeThresholds.map((size) => `
            <option value="${size.label}" ${row.size === size.label ? "selected" : ""}>${size.label}</option>
          `).join("")}
        </select>
      </label>
      <label class="character-inventory__field">
        <input
          class="filter-input character-inventory__input"
          type="number"
          inputmode="numeric"
          min="0"
          value="${escapeHtml(String(row.quantity))}"
          data-character-inventory-field="quantity"
          data-character-inventory-row="${escapeHtml(row.id)}"
        />
      </label>
      <button
        class="toolbar-button toolbar-button--subtle-danger character-inventory__remove"
        type="button"
        data-action="remove-character-inventory-row"
        data-character-inventory-row-id="${escapeHtml(row.id)}"
        aria-label="Quitar ${escapeHtml(row.name || "objeto")}"
        ${isCurrencyRow ? "disabled" : ""}
      >
        Quitar
      </button>
    </div>
  `;
}

function renderCharacterStatsPanel(character) {
  const proficiencyBonus = getCharacterProficiencyBonus(character);
  const proficientKeys = getCharacterProficiencySet(character);
  const passivePerception = getCharacterPassivePerception(character);

  return `
    <section class="character-stat-sheet" aria-label="Estadisticas del personaje">
      <div class="character-stat-sheet__proficiency">
        <span>${escapeHtml(formatModifier(proficiencyBonus))}</span>
        <strong>Bonus competencia</strong>
      </div>
      <div class="character-stat-sheet__blocks">
        ${characterAbilityKeys.map((key) => renderCharacterStatBlock(character, key, proficientKeys, proficiencyBonus)).join("")}
      </div>
      <div class="character-stat-sheet__passive">
        <span>${escapeHtml(String(passivePerception))}</span>
        <strong>Percepcion Pasiva</strong>
      </div>
    </section>
  `;
}

function getCharacterPassivePerception(character) {
  const proficiencyBonus = getCharacterProficiencyBonus(character);
  const proficientKeys = getCharacterProficiencySet(character);

  return 10
    + getAbilityModifier(character.abilities.wis ?? 10)
    + (proficientKeys.has("skill:perception") ? proficiencyBonus : 0);
}

function renderCharacterStatBlock(character, key, proficientKeys, proficiencyBonus) {
  const score = character.abilities[key] ?? 10;
  const modifier = getAbilityModifier(score);
  const meta = characterStatBlocks[key];
  const saveKey = `save:${key}`;

  return `
    <article class="character-stat-block">
      <label class="character-stat-block__score">
        <span class="character-stat-block__modifier">${escapeHtml(formatModifier(modifier))}</span>
        <input
          type="number"
          inputmode="numeric"
          value="${escapeHtml(String(score))}"
          data-character-ability="${escapeHtml(key)}"
          aria-label="${escapeHtml(meta.label)}"
        />
        <strong>${escapeHtml(meta.label)}</strong>
      </label>
      <div class="character-stat-block__checks">
        ${renderCharacterCheckRow("save", "Salvacion", modifier, proficiencyBonus, saveKey, proficientKeys.has(saveKey))}
        ${meta.skills.map((skill) => {
          const skillKey = `skill:${skill.id}`;
          return renderCharacterCheckRow("skill", skill.label, modifier, proficiencyBonus, skillKey, proficientKeys.has(skillKey));
        }).join("")}
      </div>
    </article>
  `;
}

function renderCharacterCheckRow(type, label, modifier, proficiencyBonus, proficiencyKey, isChecked) {
  const value = modifier + (isChecked ? proficiencyBonus : 0);

  return `
    <label class="character-check-row">
      <input
        type="checkbox"
        data-character-proficiency="${escapeHtml(proficiencyKey)}"
        ${isChecked ? "checked" : ""}
        aria-label="${escapeHtml(label)}"
      />
      <span class="character-check-row__mark character-check-row__mark--${type}" aria-hidden="true"></span>
      <strong>${escapeHtml(formatModifier(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderCharacterMetricField(key, label, value, placeholder = "") {
  const isNumberField = ["armorClass", "currentHp", "maxHp", "initiativeBonus"].includes(key);

  return `
    <label class="character-metric-field">
      <span>${escapeHtml(label)}</span>
      <input
        class="character-metric-field__input"
        type="${isNumberField ? "number" : "text"}"
        ${isNumberField ? "inputmode=\"numeric\"" : ""}
        value="${escapeHtml(String(value ?? ""))}"
        placeholder="${escapeHtml(placeholder)}"
        data-character-field="${escapeHtml(key)}"
      />
    </label>
  `;
}

function renderCharacterDetailMedia(character) {
  const title = character.name || "Personaje sin nombre";

  return `
    <div class="bestiary-detail__media character-sheet__media">
      <div class="character-sheet__media-actions">
        ${renderCharacterImageControls(character)}
      </div>
      <figure class="bestiary-portrait character-sheet__portrait">
        ${
          character.tokenUrl
            ? `
              <img
                class="bestiary-portrait__image character-sheet__portrait-image"
                src="${escapeHtml(character.tokenUrl)}"
                alt="Retrato de ${escapeHtml(title)}"
                loading="lazy"
                decoding="async"
              />
            `
            : `
              <div class="bestiary-portrait bestiary-portrait--empty character-sheet__portrait-empty" aria-label="Retrato no disponible">
                <div class="bestiary-portrait__placeholder">${escapeHtml(getCharacterInitials(character))}</div>
                <p class="bestiary-portrait__hint">Sin retrato vinculado</p>
              </div>
            `
        }
      </figure>
    </div>
  `;
}

function renderCharacterImageControls(character) {
  return `
    <div class="character-image-controls">
      <label class="toolbar-button toolbar-button--subtle character-image-controls__button">
        Cargar imagen
        <input
          class="character-image-controls__input"
          type="file"
          accept="image/*"
          data-character-image
        />
      </label>
      ${
        character.tokenUrl
          ? `<button class="toolbar-button toolbar-button--subtle-danger" type="button" data-action="remove-character-image">Quitar</button>`
          : ""
      }
    </div>
  `;
}

function getCharacterInventorySuggestions(rowId) {
  const character = getActiveCharacter();
  const row = character?.inventory.find((entry) => entry.id === rowId);
  const query = cleanText(row?.name).toLowerCase();

  if (!query || state.itemStatus !== "ready" || isCharacterCurrencyRow(row?.name)) {
    return [];
  }

  return state.items
    .filter((entry) => entry.nameLower.includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }))
    .slice(0, 12);
}

function renderCharacterTextField(key, label, value, placeholder = "", options = {}) {
  const compactClass = options.compact ? " character-identity-field--compact" : "";
  const lengthClass = getCharacterTextLengthClass(value);

  return `
    <label class="toolbar-field character-identity-field${compactClass}">
      <span>${escapeHtml(label)}</span>
      <input
        class="filter-input character-identity-field__input ${lengthClass}"
        type="text"
        value="${escapeHtml(value ?? "")}"
        placeholder="${escapeHtml(placeholder)}"
        data-character-field="${escapeHtml(key)}"
      />
    </label>
  `;
}

function renderCharacterNumberField(key, label, value) {
  return `
    <label class="toolbar-field character-identity-field">
      <span>${escapeHtml(label)}</span>
      <input
        class="filter-input character-identity-field__input"
        type="number"
        inputmode="numeric"
        value="${escapeHtml(String(value ?? ""))}"
        data-character-field="${escapeHtml(key)}"
      />
    </label>
  `;
}

function getCharacterTextLengthClass(value) {
  const length = cleanText(value).length;

  if (length >= 24) {
    return "character-identity-field__input--xs";
  }

  if (length >= 18) {
    return "character-identity-field__input--sm";
  }

  return "";
}

function renderCharacterAbilityField(character, key) {
  const score = character.abilities[key] ?? 10;
  const modifier = getAbilityModifier(score);

  return `
    <label class="ability-card character-ability">
      <span>${key.toUpperCase()}</span>
      <input
        class="filter-input"
        type="number"
        inputmode="numeric"
        value="${escapeHtml(String(score))}"
        data-character-ability="${escapeHtml(key)}"
      />
      <strong>${formatModifier(modifier)}</strong>
    </label>
  `;
}

function renderCharacterEmpty() {
  return `
    <div class="empty-state empty-state--panel">
      Crea un personaje aliado para editar su ficha rapida.
    </div>
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

function getItemSummaries(filteredEntries) {
  const sources = new Set(filteredEntries.map((entry) => entry.source).filter(Boolean)).size;
  const rarities = new Set(filteredEntries.map((entry) => entry.rarityLabel).filter(Boolean)).size;
  const illustrated = filteredEntries.filter((entry) => entry.hasImage).length;

  return [
    { label: "Items", value: filteredEntries.length },
    { label: "Fuentes", value: sources },
    { label: "Rarezas", value: rarities },
    { label: "Con arte", value: illustrated }
  ];
}

function getArcanumSummaries(filteredEntries) {
  const sources = new Set(filteredEntries.map((entry) => entry.source).filter(Boolean)).size;
  const schools = new Set(filteredEntries.map((entry) => entry.school).filter(Boolean)).size;
  const selected = getSelectedArcanumEntry(filteredEntries);

  return [
    { label: "Hechizos", value: filteredEntries.length },
    { label: "Fuentes", value: sources },
    { label: "Escuelas", value: schools },
    { label: "Seleccion", value: selected ? selected.name : "Ninguno" }
  ];
}

function getVisibleCombatants() {
  return [...state.combatants]
    .filter(matchesFilters)
    .sort(compareCombatants);
}

function getVisibleCharacters() {
  return [...state.characters]
    .sort((left, right) => cleanText(left.name).localeCompare(cleanText(right.name), "es", { numeric: true, sensitivity: "base" }));
}

function getActiveCharacter() {
  return state.characters.find((character) => character.id === state.activeCharacterId) ?? null;
}

function getCharacterInitials(character) {
  const words = cleanText(character.name).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "PJ";
  }

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function formatCharacterSubtitle(character) {
  const classParts = [
    character.className,
    character.subclassName
  ].filter(Boolean).join(" / ");
  const level = character.level ? `Nv ${character.level}` : "";

  return [
    classParts,
    level,
    character.species
  ].filter(Boolean).join(" | ");
}

function formatCharacterIdentityLine(character) {
  return [
    character.background,
    character.playerName ? `Jugador: ${character.playerName}` : "",
    character.size ? `Talla ${character.size}` : ""
  ].filter(Boolean).join(" | ") || "Ficha editable lista para entrar en combate.";
}

function renderCharacterExperienceBar(character, options = {}) {
  const progress = getCharacterExperienceProgress(character);
  const fillStyle = `--xp-fill: ${progress.progressPercent.toFixed(2)}%`;
  const baseClassName = options.compact
    ? "character-experience character-experience--compact"
    : "character-experience";
  const progressPercentLabel = `${Math.round(progress.progressPercent)}%`;
  const progressLabel = `${formatExperiencePoints(progress.levelExperiencePoints)} / ${formatExperiencePoints(progress.requiredExperiencePoints)} XP`;

  if (options.compact) {
    const primaryLabel = `Nv ${progress.level}`;

    return `
      <section class="${baseClassName}" style="${fillStyle}" aria-label="Progreso de experiencia de ${escapeHtml(character.name || "personaje")}">
        <div class="character-experience__labels">
          <strong>${escapeHtml(primaryLabel)}</strong>
        </div>
        <div class="character-experience__progress">
          <div class="character-experience__track" aria-hidden="true">
            <span class="character-experience__fill"></span>
            <span class="character-experience__track-label">${escapeHtml(progressLabel)}</span>
          </div>
          <span class="character-experience__percent">${escapeHtml(progressPercentLabel)}</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="${baseClassName}" style="${fillStyle}" aria-label="Progreso de experiencia de ${escapeHtml(character.name || "personaje")}">
      <div class="character-experience__fields">
        <label class="character-experience__field character-experience__field--level">
          <span>Nivel</span>
          <input
            class="character-experience__input"
            type="number"
            inputmode="numeric"
            value="${escapeHtml(String(character.level ?? progress.level))}"
            data-character-field="level"
            aria-label="Nivel"
          />
        </label>
        <label class="character-experience__field">
          <span>XP</span>
          <input
            class="character-experience__input"
            type="number"
            inputmode="numeric"
            value="${escapeHtml(String(character.experiencePoints ?? progress.levelExperiencePoints))}"
            data-character-field="experiencePoints"
            aria-label="Experiencia"
          />
        </label>
      </div>
      <div class="character-experience__progress">
        <div class="character-experience__track" aria-hidden="true">
          <span class="character-experience__fill"></span>
          <span class="character-experience__track-label">${escapeHtml(progressLabel)}</span>
        </div>
        <span class="character-experience__percent">${escapeHtml(progressPercentLabel)}</span>
      </div>
    </section>
  `;
}

function getCharacterExperienceProgress(character) {
  const levelEntry = getCharacterLevelProgressionEntry(character.level);
  const nextLevelEntry = characterLevelProgression.find((entry) => entry.level === levelEntry.level + 1) ?? null;
  const requiredExperiencePoints = getCharacterLevelExperienceRequirement(levelEntry.level);
  const levelExperiencePoints = normalizeStoredCharacterLevelExperiencePoints(character.experiencePoints, levelEntry.level);
  const totalExperiencePoints = levelEntry.experiencePoints + levelExperiencePoints;

  if (!nextLevelEntry) {
    return {
      level: levelEntry.level,
      levelExperiencePoints,
      totalExperiencePoints,
      currentLevelStart: levelEntry.experiencePoints,
      nextLevelStart: levelEntry.experiencePoints + requiredExperiencePoints,
      requiredExperiencePoints,
      progressPercent: requiredExperiencePoints > 0
        ? (levelExperiencePoints / requiredExperiencePoints) * 100
        : 100,
      isMaxLevel: true
    };
  }

  return {
    level: levelEntry.level,
    levelExperiencePoints,
    totalExperiencePoints,
    currentLevelStart: levelEntry.experiencePoints,
    nextLevelStart: nextLevelEntry.experiencePoints,
    requiredExperiencePoints,
    progressPercent: requiredExperiencePoints > 0
      ? (levelExperiencePoints / requiredExperiencePoints) * 100
      : 0,
    isMaxLevel: false
  };
}

function formatExperiencePoints(value) {
  return experienceFormatter.format(Math.max(0, Math.floor(toNumber(value))));
}

function getCharacterLevelProgressionEntry(level) {
  const normalizedLevel = normalizeStoredCharacterLevel(level);
  return characterLevelProgression.find((entry) => entry.level === normalizedLevel) ?? characterLevelProgression[0];
}

function getCharacterLevelExperienceRequirement(level) {
  const currentEntry = getCharacterLevelProgressionEntry(level);
  const nextEntry = characterLevelProgression.find((entry) => entry.level === currentEntry.level + 1);

  if (nextEntry) {
    return Math.max(0, nextEntry.experiencePoints - currentEntry.experiencePoints);
  }

  const previousEntry = characterLevelProgression.find((entry) => entry.level === currentEntry.level - 1);
  return previousEntry ? Math.max(0, currentEntry.experiencePoints - previousEntry.experiencePoints) : 0;
}

function getCharacterSkillMaxExperiencePoints() {
  return characterSkillLevelProgression[characterSkillLevelProgression.length - 1]?.experiencePoints ?? 0;
}

function getCharacterSkillMaxLevel() {
  return characterSkillLevelProgression[characterSkillLevelProgression.length - 1]?.level ?? 0;
}

function getCharacterSkillRequiredExperienceForLevel(level) {
  const numericLevel = Math.max(0, Math.floor(toNumber(level) || 0));

  if (numericLevel <= 0) {
    return characterSkillLevelProgression[0]?.experiencePoints ?? 0;
  }

  const nextEntry = characterSkillLevelProgression.find((entry) => entry.level === numericLevel + 1) ?? null;
  const currentEntry = characterSkillLevelProgression.find((entry) => entry.level === numericLevel) ?? null;

  return nextEntry?.experiencePoints
    ?? currentEntry?.experiencePoints
    ?? getCharacterSkillMaxExperiencePoints();
}

function getCharacterSkillProgress(skillTrack) {
  const level = normalizeStoredCharacterSkillLevel(skillTrack?.level);
  const currentEntry = characterSkillLevelProgression.find((entry) => entry.level === level) ?? null;
  const requiredExperiencePoints = getCharacterSkillRequiredExperienceForLevel(level);
  const levelExperiencePoints = Math.min(
    normalizeStoredCharacterSkillExperiencePoints(skillTrack?.experiencePoints),
    requiredExperiencePoints
  );
  const progressPercent = requiredExperiencePoints > 0
    ? (levelExperiencePoints / requiredExperiencePoints) * 100
    : 0;
  const isMaxLevel = level >= getCharacterSkillMaxLevel() && levelExperiencePoints >= requiredExperiencePoints;

  return {
    level,
    label: currentEntry?.label ?? "Sin rango",
    bonus: currentEntry?.bonus ?? 0,
    experiencePoints: levelExperiencePoints,
    levelExperiencePoints,
    currentLevelStart: 0,
    nextLevelStart: requiredExperiencePoints,
    requiredExperiencePoints,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
    isMaxLevel
  };
}

function getCharacterProficiencyBonus(character) {
  return getCharacterLevelProgressionEntry(character.level).proficiencyBonus;
}

function getDefaultCharacterProficiencyBonus(level) {
  return getCharacterLevelProgressionEntry(level).proficiencyBonus;
}

function getCharacterProficiencySet(character) {
  return new Set(normalizeStoredCharacterProficiencies(character.proficiencies));
}

function getCombatStatsFromCharacter(character) {
  return {
    STR: toNumber(character.abilities.str) || 10,
    DEX: toNumber(character.abilities.dex) || 10,
    CON: toNumber(character.abilities.con) || 10,
    INT: toNumber(character.abilities.int) || 10,
    WIS: toNumber(character.abilities.wis) || 10,
    CHA: toNumber(character.abilities.cha) || 10
  };
}

function getCombatTurnOrder(combatants = getVisibleCombatants()) {
  return [...combatants]
    .sort((left, right) => toNumber(right.iniactiva) - toNumber(left.iniactiva)
      || getCombatantStandSortValue(left) - getCombatantStandSortValue(right)
      || cleanText(left.nombre).localeCompare(cleanText(right.nombre), "es", { numeric: true, sensitivity: "base" }));
}

function getCombatTurnParticipants(turnOrder = getCombatTurnOrder()) {
  return turnOrder.filter(shouldShowInCombatTurnChain);
}

function shouldShowInCombatTurnChain(combatant) {
  const side = combatant.tag ? mapTagToSide(combatant.tag) : combatant.side;
  const hasInitiative = cleanText(combatant.iniactiva) !== "";

  if (!hasInitiative) {
    return false;
  }

  if ((side === "enemies" || side === "neutral") && toNumber(combatant.pgAct) < 1) {
    return false;
  }

  return true;
}

function getActiveTurnCombatantId(turnOrder = getCombatTurnOrder()) {
  if (turnOrder.length === 0) {
    return "";
  }

  return turnOrder.some((combatant) => combatant.id === state.activeTurnCombatantId)
    ? state.activeTurnCombatantId
    : turnOrder[0].id;
}

function getCombatNameSuggestions(combatant) {
  const query = cleanText(combatant.nombre).toLowerCase();

  if (!query || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => entry.nameLower.includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })
      || left.source.localeCompare(right.source, "es", { sensitivity: "base" }))
    .slice(0, 10);
}

function getCombatantBestiaryEntry(combatant) {
  const name = cleanText(combatant.nombre).toLowerCase();

  if (!name) {
    return null;
  }

  if (combatant.source) {
    const source = cleanText(combatant.source);
    const sourceMatch = state.bestiary.find((entry) => cleanText(entry.name).toLowerCase() === name && entry.source === source);
    return sourceMatch ?? null;
  }

  return state.bestiary.find((entry) => cleanText(entry.name).toLowerCase() === name) ?? null;
}

function getCombatantTokenUrl(combatant) {
  return getCombatantBestiaryEntry(combatant)?.tokenUrl || cleanText(combatant.tokenUrl);
}

function getCombatantInitials(combatant) {
  const words = cleanText(combatant.nombre).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getCombatantSourceOptions(combatant) {
  const name = cleanText(combatant.nombre).toLowerCase();

  if (!name || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => cleanText(entry.name).toLowerCase() === name)
    .sort((left, right) => getBestiarySourceFullName(left.source).localeCompare(getBestiarySourceFullName(right.source), "es", {
      sensitivity: "base"
    }));
}

function getFilteredBestiary() {
  const cacheKey = getBestiaryCacheKey(state.bestiaryFilters, true);
  const cachedEntries = bestiaryRenderCache.filteredEntries.get(cacheKey);

  if (cachedEntries) {
    return cachedEntries;
  }

  const filteredEntries = [...state.bestiary]
    .filter((entry) => matchesBestiaryFilters(entry))
    .sort(compareBestiaryEntries);

  bestiaryRenderCache.filteredEntries.set(cacheKey, filteredEntries);
  return filteredEntries;
}

function getFilteredItems() {
  return [...state.items]
    .filter(matchesItemFilters)
    .sort(compareItemEntries);
}

function getFilteredArcanum() {
  return [...state.arcanum]
    .filter(matchesArcanumFilters)
    .sort(compareArcanumEntries);
}

function getSelectedBestiaryEntry(filteredEntries = getFilteredBestiary()) {
  const currentEntry = filteredEntries.find((entry) => entry.id === state.bestiarySelectedId);

  if (currentEntry) {
    return currentEntry;
  }

  return filteredEntries[0] ?? null;
}

function getSelectedItemEntry(filteredEntries = getFilteredItems()) {
  const currentEntry = filteredEntries.find((entry) => entry.id === state.itemSelectedId);

  if (currentEntry) {
    return currentEntry;
  }

  return filteredEntries[0] ?? null;
}

function getSelectedArcanumEntry(filteredEntries = getFilteredArcanum()) {
  const currentEntry = filteredEntries.find((entry) => entry.id === state.arcanumSelectedId);

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

function matchesBestiaryFilters(entry, overrides = {}) {
  const filters = {
    ...state.bestiaryFilters,
    ...overrides
  };
  const query = cleanText(filters.query).toLowerCase();
  const source = Array.isArray(filters.source) ? filters.source : [];
  const type = Array.isArray(filters.type) ? filters.type : [];
  const environment = Array.isArray(filters.environment) ? filters.environment : [];
  const crBase = Array.isArray(filters.crBase) ? filters.crBase : [];

  if (query && !entry.nameLower.includes(query)) {
    return false;
  }

  if (source.length > 0 && !source.includes(entry.source)) {
    return false;
  }

  if (type.length > 0 && !type.includes(entry.type)) {
    return false;
  }

  if (environment.length > 0 && !environment.some((value) => entry.environmentTokens.includes(value))) {
    return false;
  }

  if (crBase.length > 0 && !crBase.includes(entry.crBaseLabel)) {
    return false;
  }

  return true;
}

function matchesItemFilters(entry, overrides = {}) {
  const filters = {
    ...state.itemFilters,
    ...overrides
  };
  const query = cleanText(filters.query).toLowerCase();
  const source = Array.isArray(filters.source) ? filters.source : [];
  const rarity = Array.isArray(filters.rarity) ? filters.rarity : [];
  const type = Array.isArray(filters.type) ? filters.type : [];
  const attunement = cleanText(filters.attunement);

  if (query && !entry.nameLower.includes(query)) {
    return false;
  }

  if (source.length > 0 && !source.includes(entry.source)) {
    return false;
  }

  if (rarity.length > 0 && !rarity.includes(entry.rarityLabel)) {
    return false;
  }

  if (type.length > 0 && !type.some((value) => matchesItemTypeFilter(entry, value))) {
    return false;
  }

  if (attunement) {
    const attunementValue = entry.requiresAttunement ? "requires" : "none";

    if (attunement !== attunementValue) {
      return false;
    }
  }

  return true;
}

function matchesArcanumFilters(entry, overrides = {}) {
  const filters = {
    ...state.arcanumFilters,
    ...overrides
  };
  const query = cleanText(filters.query).toLowerCase();
  const source = Array.isArray(filters.source) ? filters.source : [];
  const level = Array.isArray(filters.level) ? filters.level : [];
  const school = Array.isArray(filters.school) ? filters.school : [];
  const spellClass = Array.isArray(filters.class) ? filters.class : [];
  const castingTime = Array.isArray(filters.castingTime) ? filters.castingTime : [];
  const concentration = cleanText(filters.concentration);

  if (query && !entry.nameLower.includes(query)) {
    return false;
  }

  if (source.length > 0 && !source.includes(entry.source)) {
    return false;
  }

  if (level.length > 0 && !level.includes(entry.level)) {
    return false;
  }

  if (school.length > 0 && !school.includes(entry.schoolFilterValue)) {
    return false;
  }

  if (spellClass.length > 0 && !spellClass.some((value) => entry.classFilterTokens.includes(value))) {
    return false;
  }

  if (castingTime.length > 0 && !castingTime.includes(entry.castingSpeed)) {
    return false;
  }

  if (concentration === "only" && !entry.hasConcentration) {
    return false;
  }

  if (concentration === "none" && entry.hasConcentration) {
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

  if (state.sort.key === "tag") {
    return (getCombatantSideSortRank(left) - getCombatantSideSortRank(right)) * multiplier
      || String(left.nombre ?? "").localeCompare(String(right.nombre ?? ""), "es", { numeric: true, sensitivity: "base" });
  }

  if (state.sort.key === "numPeana") {
    return (getCombatantStandSortValue(left) - getCombatantStandSortValue(right)) * multiplier
      || String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es", { numeric: true, sensitivity: "base" });
  }

  if (column?.type === "number") {
    const first = column.key === "pgMax" ? getEffectivePgMax(left) : toNumber(leftValue);
    const second = column.key === "pgMax" ? getEffectivePgMax(right) : toNumber(rightValue);
    return (first - second) * multiplier;
  }

  return String(leftValue ?? "")
    .localeCompare(String(rightValue ?? ""), "es", { numeric: true, sensitivity: "base" }) * multiplier;
}

function getCombatantSideSortRank(combatant) {
  const tag = cleanText(combatant.tag);
  const side = cleanText(combatant.side);

  if (tag === "ALIADO" || side === "allies") {
    return 1;
  }

  if (tag === "NEUTRAL" || side === "neutral") {
    return 2;
  }

  if (tag === "ENEMIGO" || side === "enemies") {
    return 3;
  }

  return 4;
}

function compareBestiaryEntries(left, right) {
  const { key, direction } = state.bestiarySort;
  const multiplier = direction === "desc" ? -1 : 1;

  if (key === "crBase") {
    return ((left.crValue - right.crValue)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "type") {
    return (left.type.localeCompare(right.type, "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "environment") {
    return (left.environment.localeCompare(right.environment, "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "source") {
    return (getSourceFullName(left.source).localeCompare(getSourceFullName(right.source), "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "castingTime") {
    return (compareSpellCastingSpeed(left.castingSpeed, right.castingSpeed)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  return left.name.localeCompare(right.name, "es", { sensitivity: "base" }) * multiplier;
}

function toggleBestiarySort(key) {
  if (state.bestiarySort.key !== key) {
    state.bestiarySort = { key, direction: "asc" };
    return;
  }

  state.bestiarySort = {
    key,
    direction: state.bestiarySort.direction === "asc" ? "desc" : "asc"
  };
}

function toggleArcanumSort(key) {
  if (state.arcanumSort.key !== key) {
    state.arcanumSort = { key, direction: "asc" };
    return;
  }

  state.arcanumSort = {
    key,
    direction: state.arcanumSort.direction === "asc" ? "desc" : "asc"
  };
}

function toggleItemSort(key) {
  if (state.itemSort.key !== key) {
    state.itemSort = { key, direction: key === "value" ? "desc" : "asc" };
    return;
  }

  state.itemSort = {
    key,
    direction: state.itemSort.direction === "asc" ? "desc" : "asc"
  };
}

function toggleItemAttunementFilter() {
  const currentValue = state.itemFilters.attunement;

  if (currentValue === "requires") {
    state.itemFilters.attunement = "none";
    return;
  }

  if (currentValue === "none") {
    state.itemFilters.attunement = "";
    return;
  }

  state.itemFilters.attunement = "requires";
}

function toggleArcanumConcentrationFilter() {
  const currentValue = state.arcanumFilters.concentration;

  if (currentValue === "only") {
    state.arcanumFilters.concentration = "none";
    return;
  }

  if (currentValue === "none") {
    state.arcanumFilters.concentration = "";
    return;
  }

  state.arcanumFilters.concentration = "only";
}

function compareItemEntries(left, right) {
  const { key, direction } = state.itemSort;
  const multiplier = direction === "desc" ? -1 : 1;

  if (key === "rarity") {
    return ((left.rarityRank - right.rarityRank)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "value") {
    return ((left.valueNumber - right.valueNumber)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "weight") {
    return ((left.weightNumber - right.weightNumber)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "source") {
    return (getSourceFullName(left.source).localeCompare(getSourceFullName(right.source), "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "type") {
    return (left.type.localeCompare(right.type, "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "attunement") {
    return (left.attunementShort.localeCompare(right.attunementShort, "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  return left.name.localeCompare(right.name, "es", { sensitivity: "base" }) * multiplier;
}

function compareArcanumEntries(left, right) {
  const { key, direction } = state.arcanumSort;
  const multiplier = direction === "desc" ? -1 : 1;

  if (key === "level") {
    return ((left.levelValue - right.levelValue)
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "school") {
    return (left.school.localeCompare(right.school, "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "class") {
    return ((left.classTokens[0] ?? "").localeCompare(right.classTokens[0] ?? "", "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  if (key === "source") {
    return (getSourceFullName(left.source).localeCompare(getSourceFullName(right.source), "es", { sensitivity: "base" })
      || left.name.localeCompare(right.name, "es", { sensitivity: "base" })) * multiplier;
  }

  return left.name.localeCompare(right.name, "es", { sensitivity: "base" }) * multiplier;
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
  const previousCombatants = state.combatants;
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    const column = columns.find((item) => item.key === key) ?? (key === "ca" ? { key, type: "number" } : null);
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

  if (["pgAct", "pgMax", "pgTemp", "necrotic"].includes(key)) {
    distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  }
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
function updateItemFilter(key, value) {
  state.itemFilters[key] = key === "type" ? normalizeItemTypeFilterSelection(value) : value;
}

function updateArcanumFilter(key, value) {
  state.arcanumFilters[key] = value;
}

function createCharacter(overrides = {}) {
  const character = createDefaultCharacter(overrides);

  state.characters = [character, ...state.characters];
  state.activeCharacterId = character.id;
  saveCharacters();
}

function createDefaultCharacter(overrides = {}) {
  const nextNumber = state.characters.length + 1;
  const maxHp = normalizeStoredNonNegativeNumber(overrides.maxHp ?? 10);

  return normalizeStoredCharacter({
    id: createStableId("character"),
    name: `Personaje ${nextNumber}`,
    playerName: "",
    className: "",
    subclassName: "",
    level: 1,
    experiencePoints: 0,
    species: "",
    background: "",
    size: "Mediano",
    proficiencyBonus: getDefaultCharacterProficiencyBonus(1),
    proficiencies: [],
    tokenUrl: "",
    armorClass: 10,
    maxHp,
    currentHp: maxHp,
    tempHp: 0,
    speed: "30 ft",
    initiativeBonus: 0,
    conditions: "",
    stand: "",
    notes: "",
    skillProgress: getDefaultCharacterSkillProgress(),
    inventoryOpen: true,
    inventory: getDefaultCharacterInventory(),
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    },
    ...overrides
  });
}

function selectCharacter(characterId) {
  if (state.characters.some((character) => character.id === characterId)) {
    state.activeCharacterId = characterId;
    state.activeCharacterInventoryRowId = "";
    state.showCharacterInventorySuggestions = false;
  }
}

function duplicateActiveCharacter() {
  const character = getActiveCharacter();

  if (!character) {
    return;
  }

  const copy = normalizeStoredCharacter({
    ...character,
    id: createStableId("character"),
    name: `${character.name || "Personaje"} copia`
  });

  state.characters = [copy, ...state.characters];
  state.activeCharacterId = copy.id;
  saveCharacters();
}

function deleteActiveCharacter() {
  const character = getActiveCharacter();

  if (!character) {
    return;
  }

  state.characters = state.characters.filter((item) => item.id !== character.id);
  state.activeCharacterId = state.characters[0]?.id ?? "";
  saveCharacters();
}

function updateCharacterField(key, rawValue, normalize = true) {
  updateCharacterFieldForId(state.activeCharacterId, key, rawValue, normalize);
}

function updateCharacterFieldForId(characterId, key, rawValue, normalize = true) {
  const numberFields = new Set(["level", "experiencePoints", "armorClass", "maxHp", "currentHp", "tempHp", "initiativeBonus"]);

  state.characters = state.characters.map((character) => {
    if (character.id !== characterId) {
      return character;
    }

    const value = numberFields.has(key) && normalize ? normalizeStoredNumber(rawValue) : rawValue;
    const updatedCharacter = normalizeStoredCharacter({
      ...character,
      [key]: value
    });

    if (key === "maxHp" && toNumber(updatedCharacter.currentHp) > toNumber(updatedCharacter.maxHp)) {
      updatedCharacter.currentHp = updatedCharacter.maxHp;
    }

    return updatedCharacter;
  });
}

function getCharacterProgressStateFromTotalExperience(totalExperiencePoints) {
  const normalizedTotalExperiencePoints = Math.max(0, Math.floor(toNumber(totalExperiencePoints) || 0));
  const levelEntry = [...characterLevelProgression]
    .reverse()
    .find((entry) => normalizedTotalExperiencePoints >= entry.experiencePoints) ?? characterLevelProgression[0];

  return {
    level: levelEntry.level,
    experiencePoints: normalizeStoredCharacterLevelExperiencePoints(
      normalizedTotalExperiencePoints - levelEntry.experiencePoints,
      levelEntry.level
    ),
    totalExperiencePoints: normalizedTotalExperiencePoints
  };
}

function addExperienceToCharacters(characterIds, totalExperiencePoints) {
  const uniqueCharacterIds = [...new Set(characterIds.map((characterId) => cleanText(characterId)).filter(Boolean))];

  if (uniqueCharacterIds.length === 0 || totalExperiencePoints <= 0) {
    return;
  }

  const baseGain = Math.floor(totalExperiencePoints / uniqueCharacterIds.length);
  const remainder = totalExperiencePoints % uniqueCharacterIds.length;
  const gainByCharacterId = new Map(
    uniqueCharacterIds.map((characterId, index) => [characterId, baseGain + (index < remainder ? 1 : 0)])
  );

  state.characters = state.characters.map((character) => {
    const gain = gainByCharacterId.get(character.id);

    if (!gain) {
      return character;
    }

    const currentProgress = getCharacterExperienceProgress(character);
    const nextProgress = getCharacterProgressStateFromTotalExperience(currentProgress.totalExperiencePoints + gain);

    return normalizeStoredCharacter({
      ...character,
      level: nextProgress.level,
      experiencePoints: nextProgress.experiencePoints,
      totalExperiencePoints: nextProgress.totalExperiencePoints
    });
  });
}

function getDefaultCharacterSkillDefinitions() {
  return defaultCharacterSkillTemplates.map((template) => normalizeStoredCharacterSkillDefinition({
    id: template.id,
    name: template.name,
    successGains: template.successGains,
    intermediateGains: template.intermediateGains,
    failureGains: template.failureGains
  })).filter(Boolean);
}

function createDefaultCharacterSkillDefinition(overrides = {}) {
  return normalizeStoredCharacterSkillDefinition({
    id: createStableId("skill-def"),
    name: "Nueva skill",
    color: getNextCharacterSkillColor(state.characterSkillDefinitions),
    successGains: [2],
    intermediateGains: [],
    failureGains: [1],
    ...overrides
  });
}

function getDefaultCharacterSkillProgress() {
  return state.characterSkillDefinitions.map((skillDefinition) => normalizeStoredCharacterSkillProgressEntry({
    skillId: skillDefinition.id,
    experiencePoints: 0
  })).filter(Boolean);
}

function syncCharactersToSkillDefinitions() {
  state.characters = state.characters
    .map((character) => normalizeStoredCharacter(character, state.characterSkillDefinitions))
    .filter(Boolean);
}

function addCharacterSkillDefinition(overrides = {}) {
  const skillDefinition = createDefaultCharacterSkillDefinition(overrides);
  state.characterSkillDefinitions = [...state.characterSkillDefinitions, skillDefinition];
  syncCharactersToSkillDefinitions();
  return skillDefinition.id;
}

function updateCharacterSkillDefinition(skillDefinitionId, key, rawValue, normalize = true, gainIndex = 0) {
  const normalizedSkillDefinitionId = cleanText(skillDefinitionId);
  const normalizedGainIndex = Math.max(0, Math.floor(toNumber(gainIndex) || 0));

  if (!normalizedSkillDefinitionId) {
    return;
  }

  state.characterSkillDefinitions = state.characterSkillDefinitions
    .map((skillDefinition) => {
      if (skillDefinition.id !== normalizedSkillDefinitionId) {
        return skillDefinition;
      }

      if (key === "successGains" || key === "intermediateGains" || key === "failureGains") {
        const defaultGains = key === "successGains" ? [2] : key === "intermediateGains" ? [] : [1];
        const nextValues = [...normalizeStoredCharacterSkillGains(skillDefinition[key], defaultGains)];
        nextValues[normalizedGainIndex] = normalize
          ? normalizeStoredCharacterSkillGain(rawValue, defaultGains[normalizedGainIndex] ?? defaultGains[0] ?? 0)
          : rawValue;

        return normalizeStoredCharacterSkillDefinition({
          ...skillDefinition,
          [key]: nextValues
        });
      }

      return normalizeStoredCharacterSkillDefinition({
        ...skillDefinition,
        [key]: rawValue
      });
    })
    .filter(Boolean);

  syncCharactersToSkillDefinitions();
}

function removeCharacterSkillDefinition(skillDefinitionId) {
  const normalizedSkillDefinitionId = cleanText(skillDefinitionId);

  if (!normalizedSkillDefinitionId) {
    return;
  }

  state.characterSkillDefinitions = state.characterSkillDefinitions
    .filter((skillDefinition) => skillDefinition.id !== normalizedSkillDefinitionId);
  syncCharactersToSkillDefinitions();
}

function toggleCharacterSkillsView() {
  state.characterSkillsExpanded = !state.characterSkillsExpanded;
}

function getCharacterSkillProgressEntry(character, skillId) {
  const normalizedSkillId = cleanText(skillId);
  const skillProgress = Array.isArray(character?.skillProgress)
    ? character.skillProgress.find((entry) => entry.skillId === normalizedSkillId)
    : null;

  return normalizeStoredCharacterSkillProgressEntry({
    skillId: normalizedSkillId,
    level: skillProgress?.level ?? 0,
    experiencePoints: skillProgress?.experiencePoints ?? 0
  });
}

function updateCharacterSkillProgress(skillId, key, rawValue, normalize = true) {
  const normalizedSkillId = cleanText(skillId);

  if (!normalizedSkillId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const currentProgress = getCharacterSkillProgressEntry(character, normalizedSkillId);
    const currentProgressState = getCharacterSkillProgress(currentProgress);
    const nextRelativeExperiencePoints = normalizeStoredNonNegativeNumber(rawValue);
    const nextLevel = key === "level"
      ? normalizeStoredCharacterSkillLevel(rawValue)
      : currentProgress.level;
    const requiredExperiencePoints = getCharacterSkillRequiredExperienceForLevel(nextLevel);
    const nextExperiencePoints = key === "level"
      ? 0
      : key === "experiencePoints"
        ? Math.min(
          Math.max(0, Math.floor(toNumber(nextRelativeExperiencePoints) || 0)),
          requiredExperiencePoints
        )
        : (normalize ? normalizeStoredNumber(rawValue) : rawValue);

    return normalizeStoredCharacter({
      ...character,
      skillProgress: character.skillProgress.map((entry) => entry.skillId === normalizedSkillId
        ? normalizeStoredCharacterSkillProgressEntry({
          ...currentProgress,
          level: nextLevel,
          experiencePoints: nextExperiencePoints
        })
        : entry)
    }, state.characterSkillDefinitions);
  });
}

function awardCharacterSkillExperience(skillId, result, gainIndex = 0) {
  const normalizedSkillId = cleanText(skillId);
  const skillDefinition = state.characterSkillDefinitions.find((entry) => entry.id === normalizedSkillId);
  const gains = normalizeStoredCharacterSkillGains(
    result === "failure"
      ? skillDefinition?.failureGains
      : result === "intermediate"
        ? skillDefinition?.intermediateGains
        : skillDefinition?.successGains,
    result === "failure" ? [1] : result === "intermediate" ? [] : [2]
  );
  const normalizedGainIndex = Math.max(0, Math.floor(toNumber(gainIndex) || 0));
  const gain = Math.max(0, toNumber(gains[normalizedGainIndex] ?? gains[0] ?? 0));

  if (!normalizedSkillId || !skillDefinition) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const currentProgress = getCharacterSkillProgressEntry(character, normalizedSkillId);
    let nextLevel = currentProgress.level;
    let nextExperiencePoints = Math.max(0, toNumber(currentProgress.experiencePoints) + gain);

    while (nextLevel < getCharacterSkillMaxLevel()) {
      const requiredExperiencePoints = getCharacterSkillRequiredExperienceForLevel(nextLevel);

      if (nextExperiencePoints < requiredExperiencePoints) {
        break;
      }

      nextExperiencePoints -= requiredExperiencePoints;
      nextLevel += 1;
    }

    if (nextLevel >= getCharacterSkillMaxLevel()) {
      nextLevel = getCharacterSkillMaxLevel();
      nextExperiencePoints = Math.min(
        nextExperiencePoints,
        getCharacterSkillRequiredExperienceForLevel(nextLevel)
      );
    }

    return normalizeStoredCharacter({
      ...character,
      skillProgress: character.skillProgress.map((entry) => entry.skillId === normalizedSkillId
        ? normalizeStoredCharacterSkillProgressEntry({
          ...currentProgress,
          level: nextLevel,
          experiencePoints: nextExperiencePoints
        })
        : entry)
    }, state.characterSkillDefinitions);
  });
}

function toggleCharacterInventorySection() {
  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      inventoryOpen: character.inventoryOpen === false
    })
    : character);
}

function addCharacterInventoryRow(overrides = {}) {
  const row = normalizeStoredCharacterInventoryRow({
    id: createStableId("character-item"),
    quantity: 1,
    ...overrides
  });

  if (!row) {
    return "";
  }

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      inventoryOpen: true,
      inventory: [...character.inventory, row]
    })
    : character);
  state.activeCharacterInventoryRowId = row.id;
  state.showCharacterInventorySuggestions = false;
  return row.id;
}

function getDefaultCharacterInventory() {
  return characterCurrencyRows.map((currency) => normalizeStoredCharacterInventoryRow({
    id: createStableId("character-item"),
    name: currency.name,
    quantity: 0
  })).filter(Boolean);
}

function isCharacterCurrencyRow(name) {
  const normalizedName = cleanText(name).toUpperCase();
  return characterCurrencyRows.some((currency) => currency.name === normalizedName);
}

function getCurrencyInventorySizeLabel(quantity) {
  const weightInPounds = Math.max(0, toNumber(quantity)) / 20;
  return getItemSizeLabelFromWeight(weightInPounds);
}

function getCharacterInventoryLoad(character) {
  const totalWeight = character.inventory.reduce((sum, row) => sum + getCharacterInventoryRowWeight(row), 0);
  const maxWeight = Math.max(0, (character.abilities?.str ?? 10) * 15);
  const percent = maxWeight > 0 ? Math.min(999, (totalWeight / maxWeight) * 100) : 0;

  return {
    totalWeight,
    maxWeight,
    percent
  };
}

function getCharacterInventoryRowWeight(row) {
  const quantity = Math.max(0, toNumber(row.quantity));

  if (isCharacterCurrencyRow(row.name)) {
    return quantity / 20;
  }

  const matchedItem = state.items.find((entry) => entry.id === row.itemId)
    ?? getItemEntryByName(row.name);

  if (matchedItem && matchedItem.weightNumber > 0) {
    return matchedItem.weightNumber * quantity;
  }

  const sizeLabel = normalizeItemSizeLabel(row.size) || inferItemSizeLabel(row.name);
  return getItemSizeWeightFloor(sizeLabel) * quantity;
}

function getItemSizeWeightFloor(sizeLabel) {
  return itemSizeThresholds.find((entry) => entry.label === sizeLabel)?.minWeight ?? 0;
}

function formatWeight(value) {
  const numericValue = Math.max(0, Number(value) || 0);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : String(Number(numericValue.toFixed(2)));
}

function removeCharacterInventoryRow(rowId) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      inventory: character.inventory.filter((row) => row.id !== normalizedRowId)
    })
    : character);

  if (state.activeCharacterInventoryRowId === normalizedRowId) {
    state.activeCharacterInventoryRowId = "";
    state.showCharacterInventorySuggestions = false;
  }
}

function updateCharacterInventoryRow(rowId, key, rawValue, normalize = true) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const inventory = character.inventory.map((row) => {
      if (row.id !== normalizedRowId) {
        return row;
      }

      const nextRow = {
        ...row,
        [key]: key === "quantity" && normalize
          ? normalizeStoredNonNegativeNumber(rawValue)
          : rawValue
      };

      if (key === "name") {
        const matchedItem = getItemEntryByName(rawValue);
        nextRow.itemId = matchedItem?.id ?? "";
        nextRow.size = matchedItem?.sizeLabel ?? inferItemSizeLabel(rawValue);
      }

      if (isCharacterCurrencyRow(nextRow.name)) {
        nextRow.itemId = "";
        nextRow.size = getCurrencyInventorySizeLabel(nextRow.quantity);
      }

      return normalizeStoredCharacterInventoryRow(nextRow);
    });

    return normalizeStoredCharacter({
      ...character,
      inventory
    });
  });
}

function selectCharacterInventorySuggestion(rowId, itemEntryId) {
  const normalizedRowId = cleanText(rowId);
  const itemEntry = state.items.find((entry) => entry.id === cleanText(itemEntryId));

  if (!normalizedRowId || !itemEntry) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    return normalizeStoredCharacter({
      ...character,
      inventory: character.inventory.map((row) => row.id === normalizedRowId
        ? normalizeStoredCharacterInventoryRow({
          ...row,
          itemId: itemEntry.id,
          name: itemEntry.name,
          size: itemEntry.sizeLabel
        })
        : row)
    });
  });

  state.activeCharacterInventoryRowId = normalizedRowId;
  state.showCharacterInventorySuggestions = false;
}

function updateCharacterProficiency(key, isChecked) {
  const normalizedKey = normalizeCharacterProficiencyKey(key);

  if (!normalizedKey) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const proficiencies = new Set(normalizeStoredCharacterProficiencies(character.proficiencies));

    if (isChecked) {
      proficiencies.add(normalizedKey);
    } else {
      proficiencies.delete(normalizedKey);
    }

    return normalizeStoredCharacter({
      ...character,
      proficiencies: [...proficiencies]
    });
  });
}

function updateCharacterAbility(key, rawValue, normalize = true) {
  if (!characterAbilityKeys.includes(key)) {
    return;
  }

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      abilities: {
        ...character.abilities,
        [key]: normalize ? normalizeStoredNumber(rawValue) || 10 : rawValue
      }
    })
    : character);
}

async function updateActiveCharacterImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    updateCharacterField("tokenUrl", dataUrl, true);
    saveCharacters();
    render();
  } catch {
    // The image is optional; keep the current character unchanged on read errors.
  }
}

function removeActiveCharacterImage() {
  updateCharacterField("tokenUrl", "", true);
  saveCharacters();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function addActiveCharacterToCombat() {
  const character = getActiveCharacter();

  if (!character) {
    return;
  }

  addCharactersToCombat([character], {
    closePicker: false
  });
}

function addCharacterToCombatById(characterId) {
  const character = state.characters.find((item) => item.id === characterId);

  if (!character) {
    return;
  }

  addCharactersToCombat([character]);
}

function addAllCharactersToCombat() {
  addCharactersToCombat(getVisibleCharacters());
}

function addCharactersToCombat(characters, options = {}) {
  const validCharacters = characters.filter(Boolean);

  if (validCharacters.length === 0) {
    return;
  }

  const combatants = validCharacters.map((character, index) => {
    const id = `entity-${state.nextId + index}`;
    state.inlineAdjustments[id] = { ...blankInlineAdjustments };
    return createCombatantFromCharacter(character, id);
  });

  state.combatants = [
    ...combatants,
    ...state.combatants
  ];
  state.nextId += combatants.length;

  if (options.closePicker !== false) {
    state.combatEncounterPickerOpen = false;
    state.combatAddPickerMode = "";
  }

  saveCombatTrackerState();
}

function createCombatantFromCharacter(character, id) {
  const abilities = getCombatStatsFromCharacter(character);
  const maxHp = Math.max(0, toNumber(character.maxHp));
  const currentHp = maxHp;

  return normalizeCombatant({
    id,
    side: "allies",
    characterId: character.id,
    source: "Personajes",
    tokenUrl: character.tokenUrl,
    ubicacion: "",
    iniactiva: character.initiativeBonus,
    nombre: character.name,
    numPeana: "",
    pgMax: maxHp,
    pgAct: currentHp,
    pgTemp: 0,
    necrotic: 0,
    ca: character.armorClass,
    condiciones: "",
    stats: formatStatsFromObject(abilities),
    tamano: cleanText(character.size) || "Mediano",
    movimiento: character.speed,
    vision: "",
    lenguas: "",
    crExp: formatCharacterSubtitle(character),
    tag: "ALIADO",
    initiativeRoll: null,
    initiativeNat20: false
  });
}

function toggleExclusiveBestiaryFilterValue(key, value) {
  const currentValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];
  const nextValues = currentValues.length === 1 && currentValues[0] === value ? [] : [value];
  updateBestiaryFilter(key, nextValues);
}

function toggleBestiaryFilterValue(key, value, checked) {
  const currentValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];
  const nextValues = checked
    ? [...new Set([...currentValues, value])]
    : currentValues.filter((item) => item !== value);

  updateBestiaryFilter(key, nextValues);
}

function toggleItemFilterValue(key, value, checked) {
  const currentValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];

  if (key === "type") {
    updateItemFilter(key, getNextItemTypeFilterValues(currentValues, value, checked));
    return;
  }

  const nextValues = checked
    ? [...new Set([...currentValues, value])]
    : currentValues.filter((item) => item !== value);

  updateItemFilter(key, nextValues);
}

function toggleExclusiveArcanumFilterValue(key, value) {
  const currentValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];
  const nextValues = currentValues.length === 1 && currentValues[0] === value ? [] : [value];
  updateArcanumFilter(key, nextValues);
}

function toggleArcanumFilterValue(key, value, checked) {
  const currentValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];
  const nextValues = checked
    ? [...new Set([...currentValues, value])]
    : currentValues.filter((item) => item !== value);

  updateArcanumFilter(key, nextValues);
}

function createEncounter() {
  const nextNumber = state.encounters.length + 1;
  const encounter = {
    id: createStableId("encounter"),
    name: `Encuentro ${nextNumber}`,
    folderId: state.activeEncounterFolderId,
    rows: []
  };

  state.encounters = [encounter, ...state.encounters];
  state.encounterFolders = state.encounterFolders.map((folder) => folder.id === encounter.folderId
    ? {
      ...folder,
      isExpanded: true
    }
    : folder);
  state.activeEncounterId = encounter.id;
  state.encounterInventoryOpen = true;
  state.activeEncounterSourceRowId = "";
  state.encounterSearchQuery = "";
  state.showEncounterSearchSuggestions = false;
  saveEncounterInventory();
}

function createEncounterFolder() {
  const folder = {
    id: createStableId("encounter-folder"),
    name: `Carpeta ${state.encounterFolders.length + 1}`,
    isExpanded: true
  };

  state.encounterFolders = [...state.encounterFolders, folder];
  state.activeEncounterFolderId = folder.id;
  saveEncounterInventory();
}

function toggleEncounterFolder(folderId) {
  state.activeEncounterFolderId = folderId ?? "";

  if (!folderId) {
    state.systemEncounterFolderExpanded = !state.systemEncounterFolderExpanded;
    saveEncounterInventory();
    return;
  }

  state.encounterFolders = state.encounterFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      isExpanded: !folder.isExpanded
    }
    : folder);
  saveEncounterInventory();
}

function updateEncounterFolderName(folderId, name) {
  state.encounterFolders = state.encounterFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      name
    }
    : folder);
  saveEncounterInventory();
}

function toggleEncounterSelection(encounterId) {
  const nextSelectedIds = new Set(state.selectedEncounterIds);

  if (nextSelectedIds.has(encounterId)) {
    nextSelectedIds.delete(encounterId);
  } else {
    nextSelectedIds.add(encounterId);
  }

  state.selectedEncounterIds = nextSelectedIds;
}

function toggleEncounterFolderSelection(folderId) {
  const nextSelectedIds = new Set(state.selectedEncounterFolderIds);

  if (nextSelectedIds.has(folderId)) {
    nextSelectedIds.delete(folderId);
  } else {
    nextSelectedIds.add(folderId);
  }

  state.selectedEncounterFolderIds = nextSelectedIds;
}

function deleteEncounterFolder(folderId) {
  state.encounterFolders = state.encounterFolders.filter((folder) => folder.id !== folderId);
  state.selectedEncounterFolderIds.delete(folderId);
  state.encounters = state.encounters.map((encounter) => encounter.folderId === folderId
    ? {
      ...encounter,
      folderId: ""
    }
    : encounter);

  if (state.activeEncounterFolderId === folderId) {
    state.activeEncounterFolderId = "";
  }

  saveEncounterInventory();
}

function moveFolderToFolder(sourceFolderId, targetFolderId, placement) {
  if (!sourceFolderId || !targetFolderId || sourceFolderId === targetFolderId) {
    return;
  }

  const sourceFolder = state.encounterFolders.find((folder) => folder.id === sourceFolderId);

  if (!sourceFolder) {
    return;
  }

  const foldersWithoutSource = state.encounterFolders.filter((folder) => folder.id !== sourceFolderId);
  const targetIndex = foldersWithoutSource.findIndex((folder) => folder.id === targetFolderId);

  if (targetIndex === -1) {
    return;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  state.encounterFolders = [
    ...foldersWithoutSource.slice(0, insertIndex),
    sourceFolder,
    ...foldersWithoutSource.slice(insertIndex)
  ];
  state.activeEncounterFolderId = sourceFolderId;
  saveEncounterInventory();
}

function moveFoldersToFolder(sourceFolderIds, targetFolderId, placement) {
  const cleanSourceIds = sourceFolderIds.filter(Boolean);

  if (cleanSourceIds.length === 0 || cleanSourceIds.includes(targetFolderId)) {
    return;
  }

  const sourceIdSet = new Set(cleanSourceIds);
  const movedFolders = state.encounterFolders.filter((folder) => sourceIdSet.has(folder.id));
  const foldersWithoutSources = state.encounterFolders.filter((folder) => !sourceIdSet.has(folder.id));
  const targetIndex = foldersWithoutSources.findIndex((folder) => folder.id === targetFolderId);

  if (movedFolders.length === 0 || targetIndex === -1) {
    return;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  state.encounterFolders = [
    ...foldersWithoutSources.slice(0, insertIndex),
    ...movedFolders,
    ...foldersWithoutSources.slice(insertIndex)
  ];
  state.activeEncounterFolderId = movedFolders[0].id;
  saveEncounterInventory();
}

function moveEncounterToFolder(encounterId, folderId) {
  const encounter = state.encounters.find((item) => item.id === encounterId);

  if (!encounter) {
    return;
  }

  state.encounters = [
    ...state.encounters.filter((item) => item.id !== encounterId),
    {
      ...encounter,
      folderId
    }
  ];
  expandEncounterFolder(folderId);
  state.activeEncounterId = encounterId;
  state.activeEncounterFolderId = folderId;
  saveEncounterInventory();
}

function moveEncountersToFolder(encounterIds, folderId) {
  const encounterIdSet = new Set(encounterIds);
  const movedEncounters = state.encounters
    .filter((encounter) => encounterIdSet.has(encounter.id))
    .map((encounter) => ({
      ...encounter,
      folderId
    }));

  if (movedEncounters.length === 0) {
    return;
  }

  state.encounters = [
    ...state.encounters.filter((encounter) => !encounterIdSet.has(encounter.id)),
    ...movedEncounters
  ];
  expandEncounterFolder(folderId);
  state.activeEncounterId = movedEncounters[0].id;
  state.activeEncounterFolderId = folderId;
  saveEncounterInventory();
}

function moveEncounterToEncounter(sourceEncounterId, targetEncounterId, placement) {
  if (!sourceEncounterId || !targetEncounterId || sourceEncounterId === targetEncounterId) {
    return;
  }

  const sourceEncounter = state.encounters.find((encounter) => encounter.id === sourceEncounterId);
  const targetEncounter = state.encounters.find((encounter) => encounter.id === targetEncounterId);

  if (!sourceEncounter || !targetEncounter) {
    return;
  }

  const encountersWithoutSource = state.encounters.filter((encounter) => encounter.id !== sourceEncounterId);
  const targetIndex = encountersWithoutSource.findIndex((encounter) => encounter.id === targetEncounterId);

  if (targetIndex === -1) {
    return;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  const movedEncounter = {
    ...sourceEncounter,
    folderId: targetEncounter.folderId ?? ""
  };

  state.encounters = [
    ...encountersWithoutSource.slice(0, insertIndex),
    movedEncounter,
    ...encountersWithoutSource.slice(insertIndex)
  ];
  expandEncounterFolder(movedEncounter.folderId);
  state.activeEncounterId = sourceEncounterId;
  state.activeEncounterFolderId = movedEncounter.folderId;
  saveEncounterInventory();
}

function moveEncountersToEncounter(sourceEncounterIds, targetEncounterId, placement) {
  if (sourceEncounterIds.includes(targetEncounterId)) {
    return;
  }

  const sourceIdSet = new Set(sourceEncounterIds);
  const targetEncounter = state.encounters.find((encounter) => encounter.id === targetEncounterId);

  if (!targetEncounter) {
    return;
  }

  const movedEncounters = state.encounters
    .filter((encounter) => sourceIdSet.has(encounter.id))
    .map((encounter) => ({
      ...encounter,
      folderId: targetEncounter.folderId ?? ""
    }));
  const encountersWithoutSources = state.encounters.filter((encounter) => !sourceIdSet.has(encounter.id));
  const targetIndex = encountersWithoutSources.findIndex((encounter) => encounter.id === targetEncounterId);

  if (movedEncounters.length === 0 || targetIndex === -1) {
    return;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  state.encounters = [
    ...encountersWithoutSources.slice(0, insertIndex),
    ...movedEncounters,
    ...encountersWithoutSources.slice(insertIndex)
  ];
  expandEncounterFolder(targetEncounter.folderId ?? "");
  state.activeEncounterId = movedEncounters[0].id;
  state.activeEncounterFolderId = targetEncounter.folderId ?? "";
  saveEncounterInventory();
}

function expandEncounterFolder(folderId) {
  if (!folderId) {
    return;
  }

  state.encounterFolders = state.encounterFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      isExpanded: true
    }
    : folder);
}

function selectEncounter(id) {
  const encounter = state.encounters.find((item) => item.id === id);

  if (!encounter) {
    return;
  }

  state.activeEncounterId = id;
  state.activeEncounterFolderId = encounter.folderId ?? "";
  state.activeEncounterRowId = "";
  state.activeEncounterSourceRowId = "";
  state.encounterSearchQuery = "";
  state.showEncounterSearchSuggestions = false;
}

function deleteEncounter(id) {
  const nextEncounters = state.encounters.filter((encounter) => encounter.id !== id);

  if (nextEncounters.length === state.encounters.length) {
    return;
  }

  state.encounters = nextEncounters;
  state.selectedEncounterIds.delete(id);

  if (state.activeEncounterId === id) {
    state.activeEncounterId = state.encounters[0]?.id ?? "";
  }

  state.activeEncounterRowId = "";

  state.encounterSearchQuery = "";
  state.activeEncounterSourceRowId = "";
  state.showEncounterSearchSuggestions = false;
  saveEncounterInventory();
}

function updateActiveEncounterName(name) {
  const activeEncounter = getActiveEncounter();

  if (!activeEncounter) {
    return;
  }

  state.encounters = state.encounters.map((encounter) => encounter.id === activeEncounter.id
    ? {
      ...encounter,
      name
    }
    : encounter);
  saveEncounterInventory();
}

function addCreatureToActiveEncounter(entryId) {
  const activeEncounter = getActiveEncounter();
  const entry = state.bestiary.find((item) => item.id === entryId);

  if (!activeEncounter || !entry) {
    return;
  }

  const row = {
    id: createStableId("encounter-row"),
    entryId: entry.id,
    name: entry.name,
    source: entry.source,
    tokenUrl: entry.tokenUrl,
    hp: entry.hp,
    hpValue: entry.hpValue,
    ac: entry.ac,
    acValue: entry.acValue,
    crLabel: entry.crBaseLabel || entry.crLabel || "",
    crValue: entry.crBaseValue,
    units: 1
  };

  state.encounters = state.encounters.map((encounter) => encounter.id === activeEncounter.id
    ? {
      ...encounter,
      rows: [...encounter.rows, row]
    }
    : encounter);
  state.activeEncounterSourceRowId = "";
  state.encounterSearchQuery = "";
  state.showEncounterSearchSuggestions = false;
  saveEncounterInventory();
}

function removeEncounterRow(rowId) {
  const activeEncounter = getActiveEncounter();

  if (!activeEncounter) {
    return;
  }

  state.encounters = state.encounters.map((encounter) => encounter.id === activeEncounter.id
    ? {
      ...encounter,
      rows: encounter.rows.filter((row) => row.id !== rowId)
    }
    : encounter);
  if (state.activeEncounterRowId === rowId) {
    state.activeEncounterRowId = "";
  }
  saveEncounterInventory();
}

function updateEncounterRowUnits(rowId, value, normalize = true) {
  const activeEncounter = getActiveEncounter();
  const units = normalize
    ? Math.max(1, Math.floor(toNumber(value)))
    : cleanText(value);

  if (!activeEncounter) {
    return;
  }

  state.encounters = state.encounters.map((encounter) => encounter.id === activeEncounter.id
    ? {
      ...encounter,
      rows: encounter.rows.map((row) => row.id === rowId
        ? {
          ...row,
          units
        }
        : row)
    }
    : encounter);
  saveEncounterInventory();
}

function updateEncounterRowSource(rowId, source) {
  const activeEncounter = getActiveEncounter();
  const cleanSource = cleanText(source);

  if (!activeEncounter) {
    return;
  }

  state.encounters = state.encounters.map((encounter) => encounter.id === activeEncounter.id
    ? {
      ...encounter,
      rows: encounter.rows.map((row) => row.id === rowId
        ? getEncounterRowWithSource(row, cleanSource)
        : row)
    }
    : encounter);
  saveEncounterInventory();
}

function getEncounterRowWithSource(row, source) {
  const matchingEntry = state.bestiary.find((entry) => entry.name === row.name && entry.source === source);

  if (!matchingEntry) {
    return {
      ...row,
      source
    };
  }

  return {
    ...row,
    entryId: matchingEntry.id,
    source,
    tokenUrl: matchingEntry.tokenUrl,
    hp: matchingEntry.hp,
    hpValue: matchingEntry.hpValue,
    ac: matchingEntry.ac,
    acValue: matchingEntry.acValue,
    crLabel: matchingEntry.crBaseLabel || matchingEntry.crLabel || row.crLabel,
    crValue: matchingEntry.crBaseValue
  };
}

function getActiveEncounter() {
  return state.encounters.find((encounter) => encounter.id === state.activeEncounterId) ?? null;
}

function getEncounterFolderGroups() {
  const groups = [
    {
      id: "",
      name: "Sin carpeta",
      isExpanded: state.systemEncounterFolderExpanded
    },
    ...state.encounterFolders
  ];

  return groups.filter((folder) => folder.id || getEncountersByFolder("").length > 0 || state.encounterFolders.length === 0);
}

function getEncountersByFolder(folderId) {
  return state.encounters.filter((encounter) => (encounter.folderId ?? "") === folderId);
}

function getEncounterRowBestiaryEntry(row) {
  const rowName = cleanText(row.name).toLowerCase();
  const rowSource = cleanText(row.source);
  const sourceMatch = rowSource
    ? state.bestiary.find((entry) => cleanText(entry.name).toLowerCase() === rowName && entry.source === rowSource)
    : null;

  if (rowSource) {
    return sourceMatch;
  }

  return sourceMatch
    ?? state.bestiary.find((entry) => entry.id === row.entryId)
    ?? null;
}

function selectEncounterRow(rowId) {
  const activeEncounter = getActiveEncounter();
  const row = activeEncounter?.rows.find((item) => item.id === rowId);

  if (!row) {
    return;
  }

  const bestiaryEntry = getEncounterRowBestiaryEntry(row);
  state.activeEncounterRowId = rowId;
  state.bestiaryFilters = {
    ...blankBestiaryFilters,
    query: row.name
  };
  state.bestiaryFilterSearch = { ...blankBestiaryFilterSearch };
  state.activeBestiaryFilterKey = "";
  state.showBestiaryQuerySuggestions = false;
  state.bestiarySelectedId = bestiaryEntry?.id ?? row.entryId ?? "";
  resetBestiaryVirtualScroll();
}

function getEncounterRowHpValue(row, bestiaryEntry = getEncounterRowBestiaryEntry(row)) {
  return row.hpValue || bestiaryEntry?.hpValue || parseLeadingNumber(row.hp);
}

function getEncounterRowAcValue(row, bestiaryEntry = getEncounterRowBestiaryEntry(row)) {
  return row.acValue || bestiaryEntry?.acValue || parseLeadingNumber(row.ac);
}

function getEncounterCreatureSuggestions() {
  const query = cleanText(state.encounterSearchQuery).toLowerCase();

  if (!query || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => entry.nameLower.includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })
      || left.source.localeCompare(right.source, "es", { sensitivity: "base" }))
    .slice(0, 12);
}

function getEncounterSourceOptions(row) {
  const rowName = cleanText(row.name).toLowerCase();

  if (!rowName || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => cleanText(entry.name).toLowerCase() === rowName)
    .sort((left, right) => getBestiarySourceFullName(left.source).localeCompare(getBestiarySourceFullName(right.source), "es", {
      sensitivity: "base"
    }));
}

function getEncounterSummary(encounter) {
  return encounter.rows.reduce((summary, row) => {
    const units = Math.max(0, toNumber(row.units));

    return {
      units: summary.units + units,
      totalCr: summary.totalCr + units * toNumber(row.crValue)
    };
  }, {
    units: 0,
    totalCr: 0
  });
}

function getCombatEncounterPickerGroups() {
  const folderGroups = state.encounterFolders.map((folder) => ({
    id: folder.id,
    name: folder.name || "Carpeta sin nombre",
    isExpanded: folder.isExpanded !== false,
    encounters: getEncountersByFolder(folder.id)
  }));
  const unfiledEncounters = getEncountersByFolder("");

  if (unfiledEncounters.length === 0) {
    return folderGroups;
  }

  return [
    ...folderGroups,
    {
      id: "",
      name: "Sin carpeta",
      isExpanded: state.systemEncounterFolderExpanded,
      encounters: unfiledEncounters
    }
  ];
}

function toggleCombatEncounterPickerFolder(folderId) {
  const cleanFolderId = cleanText(folderId);

  if (!cleanFolderId) {
    state.systemEncounterFolderExpanded = !state.systemEncounterFolderExpanded;
    saveEncounterInventory();
    return;
  }

  state.encounterFolders = state.encounterFolders.map((folder) => folder.id === cleanFolderId
    ? {
      ...folder,
      isExpanded: !folder.isExpanded
    }
    : folder);
  saveEncounterInventory();
}

function importEncounterToCombat(encounterId) {
  const encounter = state.encounters.find((item) => item.id === encounterId);

  if (!encounter) {
    return;
  }

  const combatants = [];
  let nextEnemyNumber = getNextEnemyStandNumber();

  for (const row of encounter.rows) {
    const units = Math.max(1, Math.floor(toNumber(row.units) || 1));

    for (let index = 0; index < units; index += 1) {
      const id = `entity-${state.nextId + combatants.length}`;
      const combatant = createCombatantFromEncounterRow(row, id, nextEnemyNumber, encounter.name);
      combatants.push(combatant);
      state.inlineAdjustments[id] = { ...blankInlineAdjustments };
      nextEnemyNumber += 1;
    }
  }

  if (combatants.length === 0) {
    return;
  }

  state.combatants = [
    ...combatants,
    ...state.combatants
  ];
  state.nextId += combatants.length;
  state.combatEncounterPickerOpen = false;
  state.combatAddPickerMode = "";
}

function createCombatantFromEncounterRow(row, id, standNumber, encounterName = "") {
  const bestiaryEntry = getEncounterRowBestiaryEntry(row);

  if (bestiaryEntry) {
    return createCombatantFromBestiaryEntry(bestiaryEntry, {
      id,
      ubicacion: encounterName,
      numPeana: formatStandNumber(standNumber)
    }, {
      rollInitiative: true
    });
  }

  return createCombatantFromBestiaryEntry({
    name: row.name,
    source: row.source,
    tokenUrl: "",
    hpValue: getEncounterRowHpValue(row, bestiaryEntry) || 1,
    acValue: getEncounterRowAcValue(row, bestiaryEntry) || "",
    abilities: parseStats(""),
    cr: row.crLabel || "",
    size: "",
    speed: "",
    senses: "",
    languages: ""
  }, {
    id,
    ubicacion: encounterName,
    numPeana: formatStandNumber(standNumber)
  }, {
    rollInitiative: true
  });
}

function getNextEnemyStandNumber() {
  const standNumbers = state.combatants
    .map(getCombatantStandNumber)
    .filter((value) => value > 0);

  return Math.max(0, ...standNumbers) + 1;
}

function getCombatantStandNumber(combatant) {
  const value = cleanText(combatant.numPeana);
  const numericMatch = value.match(/^\d+$/);
  const legacyEnemyMatch = value.match(/^E-(\d+)$/i);

  if (numericMatch) {
    return Number(numericMatch[0]);
  }

  if (legacyEnemyMatch) {
    return Number(legacyEnemyMatch[1]);
  }

  return 0;
}

function getCombatantStandSortValue(combatant) {
  const standNumber = getCombatantStandNumber(combatant);
  return standNumber > 0 ? standNumber : Number.POSITIVE_INFINITY;
}

function formatStandNumber(value) {
  return String(Math.max(1, Math.floor(toNumber(value)) || 1));
}

function createCombatantFromBestiaryEntry(entry, existingCombatant = {}, options = {}) {
  const pgMax = entry.hpValue || parseLeadingNumber(entry.hp) || 1;
  const ca = entry.acValue || parseLeadingNumber(entry.ac) || "";
  const combatant = {
    id: existingCombatant.id,
    side: "enemies",
    ubicacion: existingCombatant.ubicacion ?? "",
    iniactiva: existingCombatant.iniactiva ?? "",
    nombre: entry.name,
    source: entry.source ?? "",
    tokenUrl: entry.tokenUrl ?? "",
    numPeana: cleanText(existingCombatant.numPeana) || formatStandNumber(getNextEnemyStandNumber()),
    pgMax,
    pgAct: pgMax,
    pgTemp: 0,
    necrotic: 0,
    ca,
    condiciones: existingCombatant.condiciones ?? "",
    stats: formatStatsFromObject(entry.abilities ?? parseStats("")),
    tamano: entry.size ?? "",
    movimiento: entry.speed ?? "",
    vision: entry.senses ?? "",
    lenguas: entry.languages ?? "",
    crExp: entry.crBaseLabel || entry.crLabel || entry.cr || "",
    tag: "ENEMIGO",
    initiativeRoll: existingCombatant.initiativeRoll ?? null,
    initiativeNat20: existingCombatant.initiativeNat20 ?? false
  };

  return options.rollInitiative ? getCombatantWithGeneratedInitiative(combatant) : combatant;
}

function fillCombatantFromBestiary(combatantId, entryId) {
  const entry = state.bestiary.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => combatant.id === combatantId
    ? createCombatantFromBestiaryEntry(entry, combatant, { rollInitiative: true })
    : combatant);
  state.activeCombatNameSearchId = "";
  state.activeCombatSourceId = "";
  state.inlineAdjustments[combatantId] = state.inlineAdjustments[combatantId] ?? { ...blankInlineAdjustments };
}

function openCombatantBestiary(entryId) {
  const entry = state.bestiary.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  state.activeScreen = "bestiary";
  state.bestiaryFilters = {
    ...blankBestiaryFilters,
    query: entry.name,
    source: entry.source ? [entry.source] : []
  };
  state.bestiaryFilterSearch = { ...blankBestiaryFilterSearch };
  state.activeBestiaryFilterKey = "";
  state.showBestiaryQuerySuggestions = false;
  state.bestiarySelectedId = entry.id;
  resetBestiaryVirtualScroll();
}

function selectCombatantSource(combatantId, source) {
  const combatant = state.combatants.find((item) => item.id === combatantId);
  const cleanSource = cleanText(source);

  if (!combatant || !cleanSource) {
    return;
  }

  const name = cleanText(combatant.nombre).toLowerCase();
  const entry = state.bestiary.find((item) => cleanText(item.name).toLowerCase() === name && item.source === cleanSource);

  if (!entry) {
    return;
  }

  state.combatants = state.combatants.map((item) => item.id === combatantId
    ? createCombatantFromBestiaryEntry(entry, item)
    : item);
  state.activeCombatSourceId = "";
}

function addBlankCombatant() {
  const id = `entity-${state.nextId}`;

  state.combatants = [
    ...state.combatants,
    {
      id,
      side: "enemies",
      source: "",
      ubicacion: "",
      iniactiva: "",
      nombre: "Nueva entidad enemiga",
      numPeana: formatStandNumber(getNextEnemyStandNumber()),
      pgMax: "",
      pgAct: "",
      pgTemp: "",
      necrotic: "",
      ca: "",
      condiciones: "",
      stats: formatStatsWithModifiers("STR 10 DEX 10 CON 10 INT 10 WIS 10 CHA 10"),
      tamano: "",
      movimiento: "",
      vision: "",
      lenguas: "",
      crExp: "",
      tag: "ENEMIGO",
      initiativeRoll: null,
      initiativeNat20: false
    }
  ];

  state.inlineAdjustments[id] = { ...blankInlineAdjustments };
  state.activeCombatNameSearchId = id;
  state.nextId += 1;
  return id;
}

function addEntity() {
  const basePg = 10;
  const id = `entity-${state.nextId}`;

  state.combatants = [
    {
      id,
      side: state.newEntitySide,
      source: "",
      ubicacion: "",
      iniactiva: "",
      nombre: state.newEntitySide === "allies" ? "Nueva entidad aliada" : "Nueva entidad enemiga",
      numPeana: formatStandNumber(getNextEnemyStandNumber()),
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

  const removedActiveTurn = state.selectedIds.has(state.activeTurnCombatantId);
  state.combatants = state.combatants.filter((combatant) => !state.selectedIds.has(combatant.id));

  for (const id of state.selectedIds) {
    delete state.inlineAdjustments[id];
  }

  if (removedActiveTurn) {
    state.activeTurnCombatantId = "";
  }

  state.selectedIds = new Set();
}

function deleteEnemies() {
  const removedIds = new Set(state.combatants.filter(isEnemyCombatant).map((combatant) => combatant.id));

  if (removedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.filter((combatant) => !removedIds.has(combatant.id));

  for (const id of removedIds) {
    delete state.inlineAdjustments[id];
    state.selectedIds.delete(id);
  }

  if (removedIds.has(state.activeTurnCombatantId)) {
    state.activeTurnCombatantId = "";
  }
}

function isEnemyCombatant(combatant) {
  return combatant.tag === "ENEMIGO" || combatant.side === "enemies";
}

function startCombatTurns() {
  const turnOrder = getCombatTurnParticipants();

  state.isCombatActive = true;
  state.activeTurnCombatantId = turnOrder[0]?.id ?? "";
  state.combatRound = 1;
  resetBattleTimer();
  startBattleTimer();
}

function endCombatTurns() {
  state.isCombatActive = false;
  state.activeTurnCombatantId = "";
  state.combatRound = 1;
  pauseBattleTimer();
}

function advanceCombatTurn() {
  if (!state.isCombatActive) {
    return;
  }

  const turnOrder = getCombatTurnParticipants();

  if (turnOrder.length === 0) {
    state.activeTurnCombatantId = "";
    state.combatRound = 1;
    return;
  }

  const currentId = getActiveTurnCombatantId(turnOrder);
  const currentIndex = Math.max(0, turnOrder.findIndex((combatant) => combatant.id === currentId));
  const nextIndex = (currentIndex + 1) % turnOrder.length;

  state.activeTurnCombatantId = turnOrder[nextIndex].id;

  if (nextIndex === 0) {
    state.combatRound = getCombatRound() + 1;
  }
}

function getCombatRound() {
  return Math.max(1, Math.floor(toNumber(state.combatRound)) || 1);
}

function cycleCombatantTag(combatantId) {
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== combatantId) {
      return combatant;
    }

    const currentIndex = combatTagOptions.indexOf(combatant.tag);
    const nextTag = combatTagOptions[(currentIndex + 1) % combatTagOptions.length];

    return normalizeCombatant({
      ...combatant,
      tag: nextTag
    }, "tag");
  });
}

function generateInitiative() {
  if (state.selectedIds.size === 0) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
      return combatant;
    }

    return getCombatantWithGeneratedInitiative(combatant);
  });

  state.sort = { key: "iniactiva", direction: "desc" };
}

function getCombatantWithGeneratedInitiative(combatant) {
  const roll = randomD20();
  const dexModifier = getDexModifier(combatant.stats);

  return {
    ...combatant,
    iniactiva: roll + dexModifier,
    initiativeRoll: roll,
    initiativeNat20: roll === 20
  };
}

function applyPgActAdjustment(id, mode) {
  const amount = Number(getInlineAdjustment(id).pgAct);

  if (!Number.isFinite(amount) || amount < 0) {
    return;
  }

  const previousCombatants = state.combatants;
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

  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  setInlineAdjustment(id, "pgAct", "");
}

function applyNecroticAdjustment(id) {
  const amount = Number(getInlineAdjustment(id).necrotic);

  if (!Number.isFinite(amount)) {
    return;
  }

  const previousCombatants = state.combatants;
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    return normalizeCombatant({
      ...combatant,
      necrotic: toNumber(combatant.necrotic) + amount
    }, "necrotic");
  });

  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  setInlineAdjustment(id, "necrotic", "");
}

function applyAreaDamage() {
  const amount = Number(state.areaDamage);

  if (!Number.isFinite(amount) || amount < 0 || state.selectedIds.size === 0) {
    return;
  }

  const previousCombatants = state.combatants;
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

  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  state.areaDamage = "";
}

function distributeExperienceForNewlyDefeatedEnemies(previousCombatants = []) {
  const previousCombatantsById = new Map(previousCombatants.map((combatant) => [combatant.id, combatant]));
  const defeatedEnemies = state.combatants.filter((combatant) => {
    const previousCombatant = previousCombatantsById.get(combatant.id);

    return Boolean(previousCombatant)
      && isEnemyCombatant(combatant)
      && combatant.experienceGranted !== true
      && !isCombatantDead(previousCombatant)
      && isCombatantDead(combatant);
  });

  if (defeatedEnemies.length === 0) {
    return;
  }

  const totalExperience = defeatedEnemies.reduce((sum, combatant) => sum + getCombatantExperienceAward(combatant), 0);
  const eligibleCharacterIds = getEligibleCharacterIdsForCombatExperience();

  state.combatants = state.combatants.map((combatant) => defeatedEnemies.some((entry) => entry.id === combatant.id)
    ? {
      ...combatant,
      experienceGranted: true
    }
    : combatant);

  if (totalExperience > 0 && eligibleCharacterIds.length > 0) {
    addExperienceToCharacters(eligibleCharacterIds, totalExperience);
  }
}

function getEligibleCharacterIdsForCombatExperience() {
  const seenCharacterIds = new Set();

  return getCombatTurnOrder(state.combatants)
    .filter((combatant) => combatant.side === "allies" && combatant.iniactiva !== "")
    .map((combatant) => getLinkedCharacterForCombatant(combatant))
    .filter(Boolean)
    .filter((character) => {
      if (seenCharacterIds.has(character.id)) {
        return false;
      }

      seenCharacterIds.add(character.id);
      return true;
    })
    .map((character) => character.id);
}

function getCombatantExperienceAward(combatant) {
  const bestiaryEntry = getCombatantBestiaryEntry(combatant);
  const challengeRatingLabel = formatCombatCrDisplay(bestiaryEntry?.crBaseLabel || bestiaryEntry?.crLabel || combatant.crExp);

  return challengeRatingExperienceByCr[challengeRatingLabel] ?? 0;
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
  state.bestiaryDebugInfo = null;
  render();

  try {
    const [text, imageMap] = await Promise.all([
      loadTextAsset(BESTIARY_CSV_PATH, "data/Bestiary.csv"),
      loadBestiaryImages()
    ]);
    const rows = parseCsv(text);

    state.bestiaryImageMap = imageMap;
    state.bestiary = rows.map((row, index) => normalizeBestiaryEntry(row, index, imageMap));
    hydrateBestiaryStaticOptions();
    resetBestiaryRenderCache();
    state.bestiaryStatus = "ready";
    state.bestiaryDebugInfo = null;
    state.bestiarySelectedId = state.bestiary[0]?.id ?? "";
    render();
  } catch (error) {
    state.bestiaryStatus = "error";
    state.bestiaryMessage = error instanceof Error ? error.message : `No se pudo cargar ${BESTIARY_CSV_PATH}.`;
    state.bestiaryDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Bestiario",
      assetUrl: BESTIARY_CSV_PATH,
      desktopRelativePath: "data/Bestiary.csv",
      loaderMode: "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadItems() {
  state.itemStatus = "loading";
  state.itemMessage = "";
  state.itemDebugInfo = null;
  render();

  try {
    const [text, imageMap] = await Promise.all([
      loadTextAsset(ITEMS_CSV_PATH, "data/Items.csv"),
      loadItemImages()
    ]);
    const rows = parseCsv(text);

    state.itemImageMap = imageMap;
    state.items = rows.map((row, index) => normalizeItemEntry(row, index, imageMap));
    resetItemVirtualScroll();
    state.itemStatus = "ready";
    state.itemDebugInfo = null;
    state.itemSelectedId = state.items[0]?.id ?? "";
    render();
  } catch (error) {
    state.itemStatus = "error";
    state.itemMessage = error instanceof Error ? error.message : `No se pudo cargar ${ITEMS_CSV_PATH}.`;
    state.itemDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Items",
      assetUrl: ITEMS_CSV_PATH,
      desktopRelativePath: "data/Items.csv",
      loaderMode: "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadArcanum() {
  state.arcanumStatus = "loading";
  state.arcanumMessage = "";
  state.arcanumDebugInfo = null;
  render();

  try {
    const text = await loadTextAsset(SPELLS_CSV_PATH, "data/Spells.csv");
    const rows = parseCsv(text);

    state.arcanum = rows.map((row, index) => normalizeSpellEntry(row, index));
    resetBestiaryRenderCache();
    state.arcanumStatus = "ready";
    state.arcanumDebugInfo = null;
    state.arcanumSelectedId = state.arcanum[0]?.id ?? "";
    render();
  } catch (error) {
    state.arcanumStatus = "error";
    state.arcanumMessage = error instanceof Error ? error.message : `No se pudo cargar ${SPELLS_CSV_PATH}.`;
    state.arcanumDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Arcanum",
      assetUrl: SPELLS_CSV_PATH,
      desktopRelativePath: "data/Spells.csv",
      loaderMode: "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadBestiaryImages() {
  return loadJsonAsset(BESTIARY_IMAGES_PATH, "data/BestiaryImages.json");
}

async function loadItemImages() {
  return loadJsonAsset(ITEMS_IMAGES_PATH, "data/ItemsImages.json");
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

function normalizeBestiaryEntry(row, index, imageMap = {}) {
  const name = cleanText(row.Name);
  const source = cleanText(row.Source);
  const sourceFullName = getBestiarySourceFullName(source);
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
  const crBaseLabel = extractCrBaseLabel(cr);
  const compositeKey = buildBestiaryCompositeKey(name, source);
  const searchText = [
    name,
    source,
    type,
    alignment,
    senses,
    languages,
    cr,
    crBaseLabel,
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
    id: compositeKey || `bestiary-${index + 1}`,
    compositeKey,
    name,
    nameLower: name.toLowerCase(),
    source,
    sourceFullName,
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
    crBaseLabel,
    imageUrl: resolveBestiaryImageAsset(name, source, imageMap, "imageUrl"),
    tokenUrl: resolveBestiaryImageAsset(name, source, imageMap, "tokenUrl"),
    crValue: parseCrValue(cr),
    crBaseValue: parseCrValue(crBaseLabel),
    acValue: parseLeadingNumber(ac),
    hpValue: parseLeadingNumber(hp),
    environmentShort: environmentTokens.slice(0, 2).join(", "),
    searchText
  };
}

function normalizeItemEntry(row, index, imageMap = {}) {
  const name = cleanText(row.Name);
  const source = cleanText(row.Source);
  const page = cleanText(row.Page);
  const rarity = cleanText(row.Rarity);
  const type = cleanText(row.Type);
  const attunement = cleanText(row.Attunement);
  const damage = cleanText(row.Damage);
  const properties = cleanText(row.Properties);
  const mastery = cleanText(row.Mastery);
  const weight = cleanText(row.Weight);
  const value = cleanText(row.Value);
  const text = cleanText(row.Text);
  const sourceLabel = page ? `${source} p.${page}` : source || "Sin fuente";
  const rarityLabel = formatItemRarity(rarity);
  const requiresAttunement = Boolean(attunement);
  const typeLine = [type, requiresAttunement ? "Requiere attunement" : ""].filter(Boolean).join(" | ");
  const compositeKey = buildItemCompositeKey(name, source);
  const valueNumber = parseItemValue(value);
  const weightNumber = parseItemWeight(weight);
  const sizeLabel = getItemSizeLabel(weightNumber, name, type);
  const imageUrl = resolveItemImageAsset(name, source, imageMap);
  const searchText = [
    name,
    source,
    rarity,
    type,
    attunement,
    damage,
    properties,
    mastery,
    weight,
    sizeLabel,
    value,
    text
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: compositeKey || `item-${index + 1}`,
    compositeKey,
    name,
    nameLower: name.toLowerCase(),
    source,
    page,
    rarity,
    rarityLabel,
    rarityShort: shortenLabel(rarityLabel, 14),
    rarityRank: getItemRarityRank(rarity),
    rarityGlyph: getItemRarityGlyph(rarity),
    type,
    typeLine: typeLine || "Item sin clasificacion",
    attunement,
    requiresAttunement,
    attunementShort: requiresAttunement ? "Requiere" : "No requiere",
    damage,
    properties,
    mastery,
    weight,
    weightNumber,
    weightLabel: weight || "Peso N/D",
    weightShort: shortenLabel(weight || "N/D", 10),
    sizeLabel,
    value,
    valueNumber,
    valueLabel: value || "Valor N/D",
    valueShort: shortenLabel(value || "N/D", 12),
    sourceLabel,
    text,
    imageUrl,
    hasImage: Boolean(imageUrl),
    propertiesShort: shortenLabel(properties, 36),
    searchText
  };
}

function getItemEntryByName(name) {
  const normalizedName = cleanText(name).toLowerCase();

  if (!normalizedName) {
    return null;
  }

  return state.items.find((entry) => entry.nameLower === normalizedName) ?? null;
}

function getItemSizeLabel(weightNumber, name = "", type = "") {
  if (Number.isFinite(weightNumber) && weightNumber > 0) {
    return getItemSizeLabelFromWeight(weightNumber);
  }

  return inferItemSizeLabel([type, name].filter(Boolean).join(" "));
}

function getItemSizeLabelFromWeight(weightNumber) {
  let currentSize = itemSizeThresholds[0].label;

  for (const threshold of itemSizeThresholds) {
    if (weightNumber >= threshold.minWeight) {
      currentSize = threshold.label;
    }
  }

  return currentSize;
}

function inferItemSizeLabel(value) {
  const normalizedValue = cleanText(value).toLowerCase();

  if (!normalizedValue) {
    return "S";
  }

  if (/(vehicle|ship|wagon|cart|cannon|ballista|mythallar|catapult|boat|war machine)/.test(normalizedValue)) {
    return "XXL";
  }

  if (/(armor|shield|chest|crate|barrel|cauldron|apparatus|carpet|broom|saddle)/.test(normalizedValue)) {
    return "L";
  }

  if (/(sword|axe|hammer|mace|spear|staff|bow|crossbow|halberd|glaive|trident|lance|maul|flail|weapon|tool)/.test(normalizedValue)) {
    return "M";
  }

  if (/(book|scroll|wand|rod|lantern|mask|helm|helmet|boots|gloves|gauntlets|cloak|cape|bag|pouch|quiver|orb|idol|figurine|instrument|torch|potion|vial)/.test(normalizedValue)) {
    return "S";
  }

  if (/(ring|amulet|necklace|brooch|bracelet|earring|coin|gem|jewel|key|token|needle|badge|stone|pearl|card|charm)/.test(normalizedValue)) {
    return "XS";
  }

  return "S";
}

function normalizeSpellEntry(row, index) {
  const name = cleanText(row.Name);
  const source = cleanText(row.Source);
  const page = cleanText(row.Page);
  const level = cleanText(row.Level);
  const school = cleanText(row.School);
  const castingTime = cleanText(row["Casting Time"]);
  const duration = cleanText(row.Duration);
  const range = cleanText(row.Range);
  const components = cleanText(row.Components);
  const classes = cleanText(row.Classes);
  const optionalClasses = cleanText(row["Optional/Variant Classes"]);
  const subclasses = cleanText(row.Subclasses);
  const text = cleanText(row.Text);
  const atHigherLevels = cleanText(row["At Higher Levels"]);
  const classTokens = uniqueSortedStrings([
    ...splitList(classes),
    ...splitList(optionalClasses)
  ]);
  const classFilterTokens = uniqueSortedStrings(classTokens.map(getArcanumParentheticalBase));
  const levelValue = parseSpellLevel(level);
  const levelLabel = formatSpellLevel(level);
  const levelShort = formatSpellLevelShort(level);
  const schoolFilterValue = getArcanumParentheticalBase(school);
  const castingSpeed = getSpellCastingSpeed(castingTime);
  const sourceFullName = getSourceFullName(source);
  const sourceLabel = page ? `${sourceFullName} p.${page}` : sourceFullName || "Sin fuente";
  const schoolLine = [levelLabel, school].filter(Boolean).join(" | ");
  const compositeKey = buildArcanumCompositeKey(name, source, level);
  const searchText = [
    name,
    source,
    sourceFullName,
    level,
    school,
    castingTime,
    duration,
    range,
    components,
    classes,
    optionalClasses,
    subclasses,
    text,
    atHigherLevels
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: compositeKey || `arcanum-${index + 1}`,
    compositeKey,
    name,
    nameLower: name.toLowerCase(),
    source,
    sourceFullName,
    page,
    level,
    levelValue,
    levelLabel,
    levelShort,
    school,
    schoolFilterValue,
    schoolLine: schoolLine || "Hechizo sin clasificacion",
    castingTime,
    castingSpeed,
    duration,
    range,
    components,
    classes,
    optionalClasses,
    subclasses,
    text,
    atHigherLevels,
    classTokens,
    classFilterTokens,
    sourceLabel,
    castingTimeShort: shortenLabel(castingTime, 18),
    rangeShort: shortenLabel(range, 18),
    durationShort: shortenLabel(duration, 18),
    hasConcentration: hasConcentrationDuration(duration),
    tagSummary: [components, classTokens[0], school].filter(Boolean).join(" | "),
    searchText
  };
}

function renderBestiaryFilterDropdown(key, label) {
  const isOpen = state.activeBestiaryFilterKey === key;
  const selectedValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];
  const allowSearch = key === "type" || key === "environment" || key === "source";
  const visibleOptions = isOpen ? getVisibleBestiaryFilterOptions(key) : [];

  return `
    <div class="toolbar-field bestiary-filter bestiary-filter--${key}" data-bestiary-filter-menu>
      <span>${label}</span>
      <div class="bestiary-filter__controls">
        <button
          class="bestiary-filter__trigger ${selectedValues.length > 0 ? "is-active" : ""}"
          type="button"
          data-action="toggle-bestiary-filter"
          data-bestiary-filter-key="${key}"
          aria-expanded="${isOpen}"
          aria-haspopup="dialog"
        >
          <span>${escapeHtml(getBestiaryFilterSummary(key, label))}</span>
          <span aria-hidden="true">${isOpen ? "^" : "v"}</span>
        </button>
        ${renderBestiarySortButton(key, `Ordenar por ${label}`)}
      </div>
      ${
        isOpen
          ? `
            <div class="bestiary-filter__popover" data-bestiary-filter-menu>
              ${
                allowSearch
                  ? `
                    <label class="bestiary-filter__search">
                      <span>Buscar ${label.toLowerCase()}</span>
                      <input
                        class="filter-input"
                        type="search"
                        value="${escapeHtml(state.bestiaryFilterSearch[key])}"
                        placeholder="Buscar opcion..."
                        data-bestiary-filter-search="${key}"
                      />
                    </label>
                  `
                  : ""
              }
              <div class="bestiary-filter__actions">
                <button
                  class="filter-clear"
                  type="button"
                  data-action="select-visible-bestiary-options"
                  data-bestiary-filter-key="${key}"
                  ${visibleOptions.length === 0 ? "disabled" : ""}
                >
                  Seleccionar visibles
                </button>
                <button
                  class="filter-clear"
                  type="button"
                  data-action="clear-bestiary-filter"
                  data-bestiary-filter-key="${key}"
                  ${selectedValues.length === 0 ? "disabled" : ""}
                >
                  Limpiar
                </button>
              </div>
              ${renderBestiarySelectedFilterChips(key)}
              <div class="bestiary-filter__list" role="group" aria-label="${label}">
                ${
                  visibleOptions.length > 0
                    ? visibleOptions.map((value) => renderBestiaryFilterCheckbox(key, value)).join("")
                    : `<p class="bestiary-filter__empty">No hay opciones que coincidan con la busqueda.</p>`
                }
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderBestiarySelectedFilterChips(key) {
  const selectedValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];

  if (selectedValues.length === 0) {
    return "";
  }

  return `
    <div class="bestiary-filter__chips" aria-label="Valores filtrados">
      ${selectedValues.map((value) => `
        <span class="bestiary-filter__chip">${escapeHtml(getBestiaryFilterDisplayValue(key, value))}</span>
      `).join("")}
    </div>
  `;
}

function renderBestiaryQueryField() {
  const suggestions = getBestiaryNameSuggestions();

  return `
    <div class="toolbar-field toolbar-field--search bestiary-query" data-bestiary-query-menu>
      <span>Buscar criatura</span>
      <div class="bestiary-filter__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.bestiaryFilters.query)}"
          placeholder="Escribe un nombre de criatura"
          data-bestiary-query
        />
        ${renderBestiarySortButton("name", "Ordenar por nombre")}
      </div>
      ${
        state.showBestiaryQuerySuggestions && suggestions.length > 0
          ? `
            <div class="bestiary-query__popover" role="listbox" aria-label="Sugerencias de criatura">
              ${suggestions.map((value) => `
                <button
                  class="bestiary-query__option"
                  type="button"
                  data-action="select-bestiary-query-suggestion"
                  data-bestiary-query-value="${escapeHtml(value)}"
                >
                  ${escapeHtml(value)}
                </button>
              `).join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderBestiarySortButton(key, label) {
  const isActive = state.bestiarySort.key === key;
  const indicator = !isActive ? "Sort" : state.bestiarySort.direction === "asc" ? "Asc" : "Desc";

  return `
    <button
      class="bestiary-sort-button ${isActive ? "is-active" : ""}"
      type="button"
      data-action="toggle-bestiary-sort"
      data-bestiary-sort-key="${key}"
      aria-label="${label}"
      title="${label}"
    >
      ${indicator}
    </button>
  `;
}

function renderBestiaryFilterCheckbox(key, value) {
  const selectedValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];
  const displayValue = getBestiaryFilterDisplayValue(key, value);

  return `
    <label class="bestiary-filter__option">
      <input
        type="checkbox"
        value="${escapeHtml(value)}"
        data-bestiary-filter-option="${key}"
        ${selectedValues.includes(value) ? "checked" : ""}
      />
      <span>${escapeHtml(displayValue)}</span>
    </label>
  `;
}

function renderItemFilterDropdown(key, label) {
  const isOpen = state.activeItemFilterKey === key;
  const selectedValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];
  const allowSearch = key === "type" || key === "source";
  const visibleOptions = isOpen ? getVisibleItemFilterOptions(key) : [];

  return `
    <div class="toolbar-field bestiary-filter bestiary-filter--${key}" data-item-filter-menu>
      <span>${label}</span>
      <div class="bestiary-filter__controls">
        <button
          class="bestiary-filter__trigger ${selectedValues.length > 0 ? "is-active" : ""}"
          type="button"
          data-action="toggle-item-filter"
          data-item-filter-key="${key}"
          aria-expanded="${isOpen}"
          aria-haspopup="dialog"
        >
          <span>${escapeHtml(getItemFilterSummary(key, label))}</span>
          <span aria-hidden="true">${isOpen ? "^" : "v"}</span>
        </button>
        ${renderItemSortButton(key, `Ordenar por ${label}`)}
      </div>
      ${
        isOpen
          ? `
            <div class="bestiary-filter__popover" data-item-filter-menu>
              ${
                allowSearch
                  ? `
                    <label class="bestiary-filter__search">
                      <span>Buscar ${label.toLowerCase()}</span>
                      <input
                        class="filter-input"
                        type="search"
                        value="${escapeHtml(state.itemFilterSearch[key])}"
                        placeholder="Buscar opcion..."
                        data-item-filter-search="${key}"
                      />
                    </label>
                  `
                  : ""
              }
              <div class="bestiary-filter__actions">
                <button
                  class="filter-clear"
                  type="button"
                  data-action="select-visible-item-options"
                  data-item-filter-key="${key}"
                  ${visibleOptions.length === 0 ? "disabled" : ""}
                >
                  Seleccionar visibles
                </button>
                <button
                  class="filter-clear"
                  type="button"
                  data-action="clear-item-filter"
                  data-item-filter-key="${key}"
                  ${selectedValues.length === 0 ? "disabled" : ""}
                >
                  Limpiar
                </button>
              </div>
              ${renderItemSelectedFilterChips(key)}
              <div class="bestiary-filter__list" role="group" aria-label="${label}">
                ${
                  visibleOptions.length > 0
                    ? visibleOptions.map((value) => renderItemFilterCheckbox(key, value)).join("")
                    : `<p class="bestiary-filter__empty">No hay opciones que coincidan con la busqueda.</p>`
                }
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderItemKpis(entry) {
  return [
    renderItemKpi("Rareza", entry.rarity && entry.rarity !== "none" ? entry.rarityShort : ""),
    renderItemKpi("Valor", entry.value ? entry.valueShort : ""),
    renderItemKpi("Peso", entry.weight ? entry.weightShort : ""),
    renderItemKpi("Talla", entry.sizeLabel),
    renderItemKpi("Attunement", entry.attunement ? entry.attunementShort : "")
  ].filter(Boolean).join("");
}

function renderItemKpi(label, value) {
  if (!value) {
    return "";
  }

  return `
    <article class="summary-card summary-card--compact">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderItemDetailBlocks(entry) {
  return [
    renderItemDetailBlock("Fuente", entry.sourceLabel),
    renderItemDetailBlock("Rareza", entry.rarity && entry.rarity !== "none" ? entry.rarityLabel : ""),
    renderItemDetailBlock("Tipo", entry.type),
    renderItemDetailBlock("Attunement", entry.attunement),
    renderItemDetailBlock("Damage", entry.damage),
    renderItemDetailBlock("Properties", entry.properties),
    renderItemDetailBlock("Mastery", entry.mastery),
    renderItemDetailBlock("Valor y peso", [
      entry.value ? entry.valueLabel : "",
      entry.weight ? entry.weightLabel : "",
      `Talla ${entry.sizeLabel}`
    ].filter(Boolean).join(" | "))
  ].filter(Boolean).join("");
}

function renderItemDetailBlock(label, value) {
  if (!value) {
    return "";
  }

  return `
    <div class="bestiary-detail__block">
      <span class="bestiary-detail__label">${escapeHtml(label)}</span>
      <p>${escapeHtml(value)}</p>
    </div>
  `;
}

function renderItemAttunementFilterButton() {
  const value = state.itemFilters.attunement;
  const label = value === "requires"
    ? "Sintonizacion: si"
    : value === "none"
      ? "Sintonizacion: no"
      : "Sintonizacion: todos";

  return `
    <button
      class="toolbar-button item-attunement-toggle ${value ? "is-active" : ""}"
      type="button"
      data-action="toggle-item-attunement-filter"
      aria-pressed="${Boolean(value)}"
      title="Filtrar por items con o sin sintonizacion"
    >
      ${label}
    </button>
  `;
}

function renderItemQueryField() {
  const suggestions = getItemNameSuggestions();

  return `
    <div class="toolbar-field toolbar-field--search bestiary-query" data-item-query-menu>
      <span>Buscar item</span>
      <div class="bestiary-filter__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.itemFilters.query)}"
          placeholder="Nombre, texto, propiedades, rareza..."
          data-item-query
        />
        ${renderItemSortButton("name", "Ordenar por nombre")}
      </div>
      ${
        state.showItemQuerySuggestions && suggestions.length > 0
          ? `
            <div class="bestiary-query__popover" role="listbox" aria-label="Sugerencias de item">
              ${suggestions.map((value) => `
                <button
                  class="bestiary-query__option"
                  type="button"
                  data-action="select-item-query-suggestion"
                  data-item-query-value="${escapeHtml(value)}"
                >
                  ${escapeHtml(value)}
                </button>
              `).join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderItemSortButton(key, label) {
  const isActive = state.itemSort.key === key;
  const indicator = !isActive ? "Sort" : state.itemSort.direction === "asc" ? "Asc" : "Desc";

  return `
    <button
      class="bestiary-sort-button ${isActive ? "is-active" : ""}"
      type="button"
      data-action="toggle-item-sort"
      data-item-sort-key="${key}"
      aria-label="${label}"
      title="${label}"
    >
      ${indicator}
    </button>
  `;
}

function renderItemFilterCheckbox(key, value) {
  const selectedValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];
  const displayValue = getItemFilterDisplayValue(key, value);
  const typeLevelClass = key === "type" ? ` bestiary-filter__option--level-${getItemTypeGroupLevel(value)}` : "";
  const typeParentClass = key === "type" && hasItemTypeChildren(value) ? " bestiary-filter__option--parent" : "";
  const rarityClass = key === "rarity" ? ` item-filter__option--rarity ${getItemRarityClass(value)}` : "";

  return `
    <label class="bestiary-filter__option${typeLevelClass}${typeParentClass}${rarityClass}">
      <input
        type="checkbox"
        value="${escapeHtml(value)}"
        data-item-filter-option="${key}"
        ${selectedValues.includes(value) ? "checked" : ""}
      />
      <span>${escapeHtml(displayValue)}</span>
    </label>
  `;
}

function renderItemSelectedFilterChips(key) {
  const selectedValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];

  if (selectedValues.length === 0) {
    return "";
  }

  return `
    <div class="bestiary-filter__chips" aria-label="Valores filtrados">
      ${selectedValues.map((value) => `
        <span class="bestiary-filter__chip">${escapeHtml(getItemFilterDisplayValue(key, value))}</span>
      `).join("")}
    </div>
  `;
}

function renderArcanumFilterDropdown(key, label) {
  const isOpen = state.activeArcanumFilterKey === key;
  const selectedValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];
  const allowSearch = key === "school" || key === "class" || key === "source";
  const visibleOptions = isOpen ? getVisibleArcanumFilterOptions(key) : [];

  return `
    <div class="toolbar-field bestiary-filter bestiary-filter--${key}" data-arcanum-filter-menu>
      <span>${label}</span>
      <div class="bestiary-filter__controls">
        <button
          class="bestiary-filter__trigger ${selectedValues.length > 0 ? "is-active" : ""}"
          type="button"
          data-action="toggle-arcanum-filter"
          data-arcanum-filter-key="${key}"
          aria-expanded="${isOpen}"
          aria-haspopup="dialog"
        >
          <span>${escapeHtml(getArcanumFilterSummary(key, label))}</span>
          <span aria-hidden="true">${isOpen ? "^" : "v"}</span>
        </button>
        ${renderArcanumSortButton(key, `Ordenar por ${label}`)}
      </div>
      ${
        isOpen
          ? `
            <div class="bestiary-filter__popover" data-arcanum-filter-menu>
              ${
                allowSearch
                  ? `
                    <label class="bestiary-filter__search">
                      <span>Buscar ${label.toLowerCase()}</span>
                      <input
                        class="filter-input"
                        type="search"
                        value="${escapeHtml(state.arcanumFilterSearch[key])}"
                        placeholder="Buscar opcion..."
                        data-arcanum-filter-search="${key}"
                      />
                    </label>
                  `
                  : ""
              }
              <div class="bestiary-filter__actions">
                <button
                  class="filter-clear"
                  type="button"
                  data-action="select-visible-arcanum-options"
                  data-arcanum-filter-key="${key}"
                  ${visibleOptions.length === 0 ? "disabled" : ""}
                >
                  Seleccionar visibles
                </button>
                <button
                  class="filter-clear"
                  type="button"
                  data-action="clear-arcanum-filter"
                  data-arcanum-filter-key="${key}"
                  ${selectedValues.length === 0 ? "disabled" : ""}
                >
                  Limpiar
                </button>
              </div>
              ${renderArcanumSelectedFilterChips(key)}
              <div class="bestiary-filter__list" role="group" aria-label="${label}">
                ${
                  visibleOptions.length > 0
                    ? visibleOptions.map((value) => renderArcanumFilterCheckbox(key, value)).join("")
                    : `<p class="bestiary-filter__empty">No hay opciones que coincidan con la busqueda.</p>`
                }
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderArcanumSelectedFilterChips(key) {
  const selectedValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];

  if (selectedValues.length === 0) {
    return "";
  }

  return `
    <div class="bestiary-filter__chips" aria-label="Valores filtrados">
      ${selectedValues.map((value) => `
        <span class="bestiary-filter__chip">${escapeHtml(getArcanumFilterDisplayValue(key, value))}</span>
      `).join("")}
    </div>
  `;
}

function renderArcanumQueryField() {
  const suggestions = getArcanumNameSuggestions();

  return `
    <div class="toolbar-field toolbar-field--search bestiary-query" data-arcanum-query-menu>
      <span>Buscar hechizo</span>
      <div class="bestiary-filter__controls arcanum-query__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.arcanumFilters.query)}"
          placeholder="Nombre, texto, componentes, clases..."
          data-arcanum-query
        />
        ${renderArcanumSortButton("name", "Ordenar por nombre")}
        <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-arcanum-filters">Limpiar filtros</button>
      </div>
      ${
        state.showArcanumQuerySuggestions && suggestions.length > 0
          ? `
            <div class="bestiary-query__popover" role="listbox" aria-label="Sugerencias de hechizo">
              ${suggestions.map((value) => `
                <button
                  class="bestiary-query__option"
                  type="button"
                  data-action="select-arcanum-query-suggestion"
                  data-arcanum-query-value="${escapeHtml(value)}"
                >
                  ${escapeHtml(value)}
                </button>
              `).join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderArcanumConcentrationFilterButton() {
  const value = state.arcanumFilters.concentration;
  const label = value === "only"
    ? "Concentracion: si"
    : value === "none"
      ? "Concentracion: no"
      : "Concentracion: todos";

  return `
    <button
      class="toolbar-button arcanum-concentration-toggle ${value ? "is-active" : ""}"
      type="button"
      data-action="toggle-arcanum-concentration-filter"
      aria-pressed="${Boolean(value)}"
      title="Filtrar por hechizos con o sin concentracion"
    >
      ${label}
    </button>
  `;
}

function renderArcanumSortButton(key, label) {
  const isActive = state.arcanumSort.key === key;
  const indicator = !isActive ? "Sort" : state.arcanumSort.direction === "asc" ? "Asc" : "Desc";

  return `
    <button
      class="bestiary-sort-button ${isActive ? "is-active" : ""}"
      type="button"
      data-action="toggle-arcanum-sort"
      data-arcanum-sort-key="${key}"
      aria-label="${label}"
      title="${label}"
    >
      ${indicator}
    </button>
  `;
}

function renderArcanumFilterCheckbox(key, value) {
  const selectedValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];
  const displayValue = getArcanumFilterDisplayValue(key, value);

  return `
    <label class="bestiary-filter__option">
      <input
        type="checkbox"
        value="${escapeHtml(value)}"
        data-arcanum-filter-option="${key}"
        ${selectedValues.includes(value) ? "checked" : ""}
      />
      <span>${escapeHtml(displayValue)}</span>
    </label>
  `;
}

function getBestiaryFilterOptions(key) {
  if (!hasBestiaryConstraintsBesides(key)) {
    return bestiaryRenderCache.staticOptions[key] ?? [];
  }

  return [...new Set(
    getBestiaryEntriesForFilterOptions(key).flatMap((entry) => {
      if (key === "environment") {
        return entry.environmentTokens;
      }

      if (key === "crBase") {
        return [entry.crBaseLabel];
      }

      return [entry[key]];
    }).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues(key, left, right));
}

function getBestiaryEntriesForFilterOptions(key) {
  const overrides = { [key]: [] };
  const cacheKey = `${key}::${getBestiaryCacheKey(overridesBestiaryFilters(overrides), false)}`;
  const cachedEntries = bestiaryRenderCache.optionEntries.get(cacheKey);

  if (cachedEntries) {
    return cachedEntries;
  }

  const compatibleEntries = state.bestiary.filter((entry) => matchesBestiaryFilters(entry, overrides));
  bestiaryRenderCache.optionEntries.set(cacheKey, compatibleEntries);
  return compatibleEntries;
}

function getVisibleBestiaryFilterOptions(key) {
  const search = cleanText(state.bestiaryFilterSearch[key]).toLowerCase();
  const cacheKey = `${key}::${search}::${getBestiaryCacheKey(overridesBestiaryFilters({ [key]: [] }), false)}`;
  const cachedOptions = bestiaryRenderCache.visibleOptions.get(cacheKey);

  if (cachedOptions) {
    return cachedOptions;
  }

  const visibleOptions = getBestiaryFilterOptions(key).filter((value) => {
    const displayValue = getBestiaryFilterDisplayValue(key, value).toLowerCase();

    if (!search) {
      return true;
    }

    return value.toLowerCase().includes(search) || displayValue.includes(search);
  });

  bestiaryRenderCache.visibleOptions.set(cacheKey, visibleOptions);
  return visibleOptions;
}

function getBestiaryFilterSummary(key, label) {
  const selectedValues = Array.isArray(state.bestiaryFilters[key]) ? state.bestiaryFilters[key] : [];

  if (selectedValues.length === 0) {
    return `${label}: todos`;
  }

  if (selectedValues.length === 1) {
    return `${label}: ${getBestiaryFilterDisplayValue(key, selectedValues[0])}`;
  }

  return `${label}: ${selectedValues.length} seleccionados`;
}

function getBestiaryNameSuggestions() {
  const query = cleanText(state.bestiaryFilters.query).toLowerCase();

  if (!query) {
    return [];
  }

  const cacheKey = `${query}::${getBestiaryCacheKey(overridesBestiaryFilters({ query: "" }), false)}`;
  const cachedSuggestions = bestiaryRenderCache.suggestions.get(cacheKey);

  if (cachedSuggestions) {
    return cachedSuggestions;
  }

  const suggestionSource = hasBestiaryConstraintsBesides("query")
    ? state.bestiary
      .filter((entry) => matchesBestiaryFilters(entry, { query: "" }))
      .filter((entry) => entry.nameLower.includes(query))
      .map((entry) => entry.name)
    : bestiaryRenderCache.staticOptions.names.filter((name) => name.toLowerCase().includes(query));

  const suggestions = [...new Set(suggestionSource)].slice(0, 12);

  bestiaryRenderCache.suggestions.set(cacheKey, suggestions);
  return suggestions;
}

function overridesBestiaryFilters(overrides = {}) {
  return {
    ...state.bestiaryFilters,
    ...overrides
  };
}

function getBestiaryCacheKey(filters, includeSort = true) {
  const parts = [
    cleanText(filters.query).toLowerCase(),
    [...(filters.type ?? [])].sort().join("|"),
    [...(filters.environment ?? [])].sort().join("|"),
    [...(filters.crBase ?? [])].sort().join("|"),
    [...(filters.source ?? [])].sort().join("|")
  ];

  if (includeSort) {
    parts.push(state.bestiarySort.key, state.bestiarySort.direction);
  }

  return parts.join("::");
}

function hasBestiaryConstraintsBesides(excludedKey) {
  if (excludedKey !== "query" && cleanText(state.bestiaryFilters.query)) {
    return true;
  }

  return ["type", "environment", "crBase", "source"].some((key) => {
    if (key === excludedKey) {
      return false;
    }

    return (state.bestiaryFilters[key] ?? []).length > 0;
  });
}

function getItemFilterOptions(key) {
  if (key === "type") {
    const values = [...new Set(
      getItemEntriesForFilterOptions(key).flatMap((entry) => getItemTypeFilterValues(entry.type)).filter(Boolean)
    )];

    return getOrderedItemTypeFilterOptions(values);
  }

  return [...new Set(
    getItemEntriesForFilterOptions(key).map((entry) => key === "rarity" ? entry.rarityLabel : entry[key]).filter(Boolean)
  )].sort((left, right) => compareItemFilterValues(key, left, right));
}

function getItemEntriesForFilterOptions(key) {
  return state.items.filter((entry) => matchesItemFilters(entry, { [key]: [] }));
}

function getVisibleItemFilterOptions(key) {
  const search = cleanText(state.itemFilterSearch[key]).toLowerCase();

  return getItemFilterOptions(key).filter((value) => {
    const displayValue = getItemFilterDisplayValue(key, value).toLowerCase();

    if (!search) {
      return true;
    }

    return value.toLowerCase().includes(search) || displayValue.includes(search);
  });
}

function getItemFilterSummary(key, label) {
  const selectedValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];

  if (selectedValues.length === 0) {
    return `${label}: todos`;
  }

  if (selectedValues.length === 1) {
    return `${label}: ${getItemFilterDisplayValue(key, selectedValues[0])}`;
  }

  return `${label}: ${selectedValues.length} seleccionados`;
}

function getItemNameSuggestions() {
  const query = cleanText(state.itemFilters.query).toLowerCase();

  if (!query) {
    return [];
  }

  const suggestionSource = hasItemConstraintsBesides("query")
    ? state.items
      .filter((entry) => matchesItemFilters(entry, { query: "" }))
      .filter((entry) => entry.nameLower.includes(query))
      .map((entry) => entry.name)
    : state.items
      .filter((entry) => entry.nameLower.includes(query))
      .map((entry) => entry.name);

  return [...new Set(suggestionSource)].slice(0, 12);
}

function hasItemConstraintsBesides(excludedKey) {
  if (excludedKey !== "query" && cleanText(state.itemFilters.query)) {
    return true;
  }

  return ["source", "rarity", "type"].some((key) => {
    if (key === excludedKey) {
      return false;
    }

    return (state.itemFilters[key] ?? []).length > 0;
  }) || (excludedKey !== "attunement" && Boolean(state.itemFilters.attunement));
}

function resetBestiaryRenderCache() {
  bestiaryRenderCache.filteredEntries.clear();
  bestiaryRenderCache.optionEntries.clear();
  bestiaryRenderCache.visibleOptions.clear();
  bestiaryRenderCache.suggestions.clear();
  bestiaryRenderCache.rowHtml.clear();
  bestiaryRenderCache.listHtml.clear();
  bestiaryRenderCache.detailHtml.clear();
}

function hydrateBestiaryStaticOptions() {
  bestiaryRenderCache.staticOptions.type = [...new Set(
    state.bestiary.map((entry) => entry.type).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues("type", left, right));

  bestiaryRenderCache.staticOptions.environment = [...new Set(
    state.bestiary.flatMap((entry) => entry.environmentTokens).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues("environment", left, right));

  bestiaryRenderCache.staticOptions.crBase = [...new Set(
    state.bestiary.map((entry) => entry.crBaseLabel).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues("crBase", left, right));

  bestiaryRenderCache.staticOptions.source = [...new Set(
    state.bestiary.map((entry) => entry.source).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues("source", left, right));

  bestiaryRenderCache.staticOptions.names = [...new Set(
    state.bestiary.map((entry) => entry.name).filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

function getArcanumFilterOptions(key) {
  return [...new Set(
    getArcanumEntriesForFilterOptions(key).flatMap((entry) => {
      if (key === "class") {
        return entry.classFilterTokens;
      }

      if (key === "school") {
        return [entry.schoolFilterValue];
      }

      if (key === "castingTime") {
        return [entry.castingSpeed];
      }

      return [entry[key]];
    }).filter(Boolean)
  )].sort((left, right) => compareArcanumFilterValues(key, left, right));
}

function getArcanumEntriesForFilterOptions(key) {
  return state.arcanum.filter((entry) => matchesArcanumFilters(entry, { [key]: [] }));
}

function getVisibleArcanumFilterOptions(key) {
  const search = cleanText(state.arcanumFilterSearch[key]).toLowerCase();

  return getArcanumFilterOptions(key).filter((value) => {
    const displayValue = getArcanumFilterDisplayValue(key, value).toLowerCase();

    if (!search) {
      return true;
    }

    return value.toLowerCase().includes(search) || displayValue.includes(search);
  });
}

function getArcanumFilterSummary(key, label) {
  const selectedValues = Array.isArray(state.arcanumFilters[key]) ? state.arcanumFilters[key] : [];

  if (selectedValues.length === 0) {
    return `${label}: todos`;
  }

  if (selectedValues.length === 1) {
    return `${label}: ${getArcanumFilterDisplayValue(key, selectedValues[0])}`;
  }

  return `${label}: ${selectedValues.length} seleccionados`;
}

function getArcanumNameSuggestions() {
  const query = cleanText(state.arcanumFilters.query).toLowerCase();

  if (!query) {
    return [];
  }

  const suggestionSource = hasArcanumConstraintsBesides("query")
    ? state.arcanum
      .filter((entry) => matchesArcanumFilters(entry, { query: "" }))
      .filter((entry) => entry.nameLower.includes(query))
      .map((entry) => entry.name)
    : state.arcanum
      .filter((entry) => entry.nameLower.includes(query))
      .map((entry) => entry.name);

  return [...new Set(suggestionSource)].slice(0, 12);
}

function hasArcanumConstraintsBesides(excludedKey) {
  if (excludedKey !== "query" && cleanText(state.arcanumFilters.query)) {
    return true;
  }

  return ["level", "school", "class", "source", "castingTime"].some((key) => {
    if (key === excludedKey) {
      return false;
    }

    return (state.arcanumFilters[key] ?? []).length > 0;
  }) || (excludedKey !== "concentration" && Boolean(state.arcanumFilters.concentration));
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
function getItemStatusLabel() {
  if (state.itemStatus === "loading") {
    return "Cargando CSV";
  }

  if (state.itemStatus === "error") {
    return "Error de lectura";
  }

  return `CSV activo: ${ITEMS_CSV_PATH}`;
}

function getArcanumStatusLabel() {
  if (state.arcanumStatus === "loading") {
    return "Cargando CSV";
  }

  if (state.arcanumStatus === "error") {
    return "Error de lectura";
  }

  return `CSV activo: ${SPELLS_CSV_PATH}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim();
}

function buildBestiaryCompositeKey(name, source) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);

  if (!normalizedName && !normalizedSource) {
    return "";
  }

  return `bestiary-${normalizedName || "unknown"}--${normalizedSource || "unknown"}`;
}

function buildItemCompositeKey(name, source) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);

  if (!normalizedName && !normalizedSource) {
    return "";
  }

  return `item-${normalizedName || "unknown"}--${normalizedSource || "unknown"}`;
}

function buildArcanumCompositeKey(name, source, level) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);
  const normalizedLevel = slugify(level);

  if (!normalizedName && !normalizedSource && !normalizedLevel) {
    return "";
  }

  return `arcanum-${normalizedName || "unknown"}--${normalizedSource || "unknown"}--${normalizedLevel || "unknown"}`;
}

function parseSpellLevel(level) {
  const normalizedLevel = cleanText(level).toLowerCase();

  if (!normalizedLevel) {
    return 99;
  }

  if (normalizedLevel.includes("cantrip")) {
    return 0;
  }

  const match = normalizedLevel.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function formatSpellLevel(level) {
  const normalizedLevel = cleanText(level);

  if (!normalizedLevel) {
    return "Nivel no indicado";
  }

  if (normalizedLevel.toLowerCase().includes("cantrip")) {
    return "Cantrip";
  }

  return normalizedLevel;
}

function formatSpellLevelShort(level) {
  const value = parseSpellLevel(level);

  if (value === 0) {
    return "Cantrip";
  }

  if (value === 99) {
    return "N/D";
  }

  return `${value}`;
}

function getSpellCastingSpeed(castingTime) {
  const normalizedCastingTime = cleanText(castingTime).toLowerCase();

  if (normalizedCastingTime.includes("bonus")) {
    return "Bonus";
  }

  if (normalizedCastingTime.includes("reaction")) {
    return "Reaction";
  }

  if (normalizedCastingTime.includes("action")) {
    return "Action";
  }

  return "";
}

function compareSpellCastingSpeed(left, right) {
  const order = {
    Action: 1,
    Bonus: 2,
    Reaction: 3
  };

  return (order[left] ?? 99) - (order[right] ?? 99)
    || left.localeCompare(right, "es", { sensitivity: "base" });
}

function getArcanumParentheticalBase(value) {
  return cleanText(value)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasConcentrationDuration(duration) {
  return slugify(duration).split("-").includes("concentration")
    || slugify(duration).split("-").includes("concentracion");
}

function resolveItemImageAsset(name, source, imageMap) {
  const compositeVariants = [
    `${cleanText(name)}||${cleanText(source)}`,
    `${cleanText(name)}|${cleanText(source)}`,
    buildItemCompositeKey(name, source),
    `${slugify(name)}--${slugify(source)}`
  ]
    .map((key) => key.toLowerCase())
    .filter(Boolean);

  const nameVariants = [cleanText(name), slugify(name)]
    .map((key) => key.toLowerCase())
    .filter(Boolean);

  for (const key of compositeVariants) {
    const match = findImageMapValue(imageMap, key);

    if (match) {
      return match;
    }
  }

  for (const key of nameVariants) {
    const match = findImageMapValue(imageMap, key);

    if (match) {
      return match;
    }
  }

  return "";
}

function resolveRuntimeAssetUrl(assetUrl) {
  const normalizedAssetUrl = cleanText(assetUrl).trim();

  if (!normalizedAssetUrl) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalizedAssetUrl)) {
    return normalizedAssetUrl;
  }

  if (DESKTOP_ASSET_BASE_URL) {
    try {
      return new URL(normalizedAssetUrl.replace(/^\.?\//, ""), `${DESKTOP_ASSET_BASE_URL}/`).toString();
    } catch {
      return `${DESKTOP_ASSET_BASE_URL}/${normalizedAssetUrl.replace(/^\.?\//, "")}`;
    }
  }

  return normalizedAssetUrl;
}

function findImageMapValue(imageMap, key) {
  const entry = imageMap?.[key];

  if (typeof entry === "string") {
    return resolveRuntimeAssetUrl(entry);
  }

  if (isPlainObject(entry) && typeof entry.imageUrl === "string") {
    return resolveRuntimeAssetUrl(entry.imageUrl);
  }

  return "";
}

function formatItemRarity(rarity) {
  const normalized = cleanText(rarity);

  if (!normalized) {
    return "Sin rareza";
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function getItemRarityRank(rarity) {
  const normalized = cleanText(rarity).toLowerCase();
  const rarityOrder = {
    "none": 0,
    "common": 1,
    "uncommon": 2,
    "rare": 3,
    "very rare": 4,
    "legendary": 5,
    "artifact": 6,
    "unknown": 7,
    "unknown (magic)": 8,
    "varies": 9,
    "sin rareza": 10
  };

  return rarityOrder[normalized] ?? 99;
}

function getItemRarityGlyph(rarity) {
  const normalized = cleanText(rarity).toLowerCase();

  if (!normalized || normalized === "none") {
    return "IT";
  }

  return normalized
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("") || "IT";
}

function getItemRarityClass(rarity) {
  const normalized = slugify(rarity);

  if (!normalized) {
    return "item-row__rarity-pill--unknown";
  }

  return `item-row__rarity-pill--${normalized}`;
}

function parseItemValue(value) {
  const normalized = cleanText(value).toLowerCase().replaceAll(",", "");

  if (!normalized) {
    return 0;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);

  if (normalized.includes("pp")) {
    return amount * 10;
  }

  if (normalized.includes("sp")) {
    return amount / 10;
  }

  if (normalized.includes("cp")) {
    return amount / 100;
  }

  return amount;
}

function shortenLabel(value, maxLength = 20) {
  const text = cleanText(value);

  if (!text) {
    return "-";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function getSourceFullName(source) {
  const normalizedSource = cleanText(source);
  return SOURCE_NAMES[normalizedSource] ?? normalizedSource;
}

function getBestiarySourceFullName(source) {
  return getSourceFullName(source);
}

function resolveBestiaryImageAsset(name, source, imageMap, assetKey) {
  const compositeVariants = [
    `${cleanText(name)}||${cleanText(source)}`,
    `${cleanText(name)}|${cleanText(source)}`,
    buildBestiaryCompositeKey(name, source),
    `${slugify(name)}--${slugify(source)}`
  ]
    .map((key) => key.toLowerCase())
    .filter(Boolean);

  const nameVariants = [cleanText(name), slugify(name)]
    .map((key) => key.toLowerCase())
    .filter(Boolean);

  for (const key of [...compositeVariants, ...nameVariants]) {
    const imageValue = imageMap[key];

    if (typeof imageValue === "string" && imageValue.trim()) {
      const resolvedValue = resolveRuntimeAssetUrl(assetKey === "imageUrl" ? imageValue.trim() : "");
      return shouldUseBestiaryAssetInCurrentRuntime(resolvedValue) ? resolvedValue : "";
    }

    if (isPlainObject(imageValue) && typeof imageValue[assetKey] === "string" && imageValue[assetKey].trim()) {
      const resolvedValue = resolveRuntimeAssetUrl(imageValue[assetKey].trim());
      return shouldUseBestiaryAssetInCurrentRuntime(resolvedValue) ? resolvedValue : "";
    }
  }

  return "";
}

function shouldUseBestiaryAssetInCurrentRuntime(assetUrl) {
  const normalizedAssetUrl = cleanText(assetUrl).trim();

  if (!normalizedAssetUrl) {
    return false;
  }

  if (!isPackagedDesktopApp()) {
    return true;
  }

  if (/^file:/i.test(normalizedAssetUrl)) {
    return true;
  }

  return !/^\.?\/?images\/bestiary\//i.test(normalizedAssetUrl);
}

function getBestiaryInitials(name) {
  const initials = cleanText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "??";
}

function splitList(value) {
  return cleanText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSortedStrings(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

function slugify(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseLeadingNumber(value) {
  const match = String(value).match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function parseItemWeight(value) {
  const text = cleanText(value);

  if (!text) {
    return 0;
  }

  const fractionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);

  if (fractionMatch) {
    return Number(fractionMatch[1].replace(",", ".")) / Number(fractionMatch[2].replace(",", "."));
  }

  const numberMatch = text.match(/\d[\d.,]*/);

  if (!numberMatch) {
    return 0;
  }

  let normalized = numberMatch[0].replace(/(?<=\d)[.,](?=\d{3}(?:[.,]|$))/g, "");
  normalized = normalized.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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

function extractCrBaseLabel(value) {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return "";
  }

  return cleanValue.split("(")[0].trim();
}

function getBestiaryFilterInputValue(target) {
  if (target.multiple) {
    return [...target.selectedOptions].map((option) => option.value).filter(Boolean);
  }

  return target.value;
}

function compareBestiaryFilterValues(key, left, right) {
  if (key === "crBase") {
    return parseCrValue(left) - parseCrValue(right)
      || left.localeCompare(right, "es", { numeric: true, sensitivity: "base" });
  }

  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function getBestiaryFilterDisplayValue(key, value) {
  if (key === "source") {
    const source = cleanText(value);
    const sourceFullName = getBestiarySourceFullName(source);
    return sourceFullName && sourceFullName !== source
      ? `${sourceFullName} (${source})`
      : source;
  }

  return value;
}

function compareItemFilterValues(key, left, right) {
  if (key === "type") {
    const leftGroupIndex = getItemTypeGroupIndex(left);
    const rightGroupIndex = getItemTypeGroupIndex(right);

    if (leftGroupIndex !== rightGroupIndex) {
      return leftGroupIndex - rightGroupIndex;
    }

    const leftSpecificIndex = getItemSpecificTypeSortIndex(left);
    const rightSpecificIndex = getItemSpecificTypeSortIndex(right);

    if (leftSpecificIndex !== rightSpecificIndex) {
      return leftSpecificIndex - rightSpecificIndex;
    }
  }

  if (key === "rarity") {
    return getItemRarityRank(left) - getItemRarityRank(right)
      || left.localeCompare(right, "es", { sensitivity: "base" });
  }

  if (key === "source") {
    return getSourceFullName(left).localeCompare(getSourceFullName(right), "es", { sensitivity: "base" })
      || left.localeCompare(right, "es", { sensitivity: "base" });
  }

  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function getItemFilterDisplayValue(key, value) {
  if (key === "type") {
    const group = ITEM_TYPE_GROUPS.find((item) => item.value === value);

    if (group) {
      return group.label;
    }

    return formatItemTypeFilterDisplay(value);
  }

  if (key === "source") {
    const source = cleanText(value);
    const sourceFullName = getSourceFullName(source);
    return sourceFullName && sourceFullName !== source
      ? `${sourceFullName} (${source})`
      : source;
  }

  if (key === "attunement") {
    return value === "requires" ? "Requiere attunement" : "Sin attunement";
  }

  return value;
}

function getItemSourceDescription(entry) {
  const sourceFullName = getSourceFullName(entry.source);
  const source = entry.source || "Sin fuente";

  if (sourceFullName && sourceFullName !== source) {
    return `${sourceFullName} (${source})`;
  }

  return source;
}

function formatItemTypeFilterDisplay(value) {
  const type = cleanText(value);
  const weaponMatch = type.match(/^(.*?\bWeapon\s*\([^)]*\))/i);

  if (weaponMatch && type.slice(weaponMatch[1].length).trim().startsWith(",")) {
    return weaponMatch[1].trim();
  }

  return type;
}

function getItemTypeFilterValues(type) {
  const groupValues = ITEM_TYPE_GROUPS
    .filter((group) => group.matches(type))
    .map((group) => group.value);
  const specificType = getItemSpecificTypeFilterValue(type);

  return [...new Set([...groupValues, specificType].filter(Boolean))];
}

function getOrderedItemTypeFilterOptions(values) {
  const availableValues = new Set(values);
  const groupValues = new Set(ITEM_TYPE_GROUPS.map((group) => group.value));
  const specificValues = values
    .filter((value) => !groupValues.has(value))
    .sort((left, right) => getItemFilterDisplayValue("type", left).localeCompare(
      getItemFilterDisplayValue("type", right),
      "es",
      { sensitivity: "base" }
    ));
  const usedSpecificValues = new Set();
  const orderedValues = [];

  ITEM_TYPE_GROUPS.forEach((group) => {
    if (!availableValues.has(group.value)) {
      return;
    }

    orderedValues.push(group.value);

    if (group.level === 2) {
      specificValues
        .filter((value) => group.matches(value))
        .forEach((value) => {
          orderedValues.push(value);
          usedSpecificValues.add(value);
        });
    }
  });

  specificValues
    .filter((value) => !usedSpecificValues.has(value))
    .forEach((value) => orderedValues.push(value));

  return orderedValues;
}

function getItemMostSpecificTypeLabel(type) {
  const values = getItemTypeFilterValues(type);
  const [mostSpecificValue] = [...values].sort((left, right) => {
    const levelDifference = getItemTypeGroupLevel(right) - getItemTypeGroupLevel(left);

    if (levelDifference !== 0) {
      return levelDifference;
    }

    return getItemTypeGroupIndex(right) - getItemTypeGroupIndex(left);
  });

  return getItemFilterDisplayValue("type", mostSpecificValue || type);
}

function getItemSpecificTypeFilterValue(type) {
  const cleanType = cleanText(type);
  const displayValue = formatItemTypeFilterDisplay(type);

  if (displayValue !== cleanType) {
    return cleanType;
  }

  return ITEM_TYPE_GROUPS.some((group) => group.matches(type)) ? "" : type;
}

function getNextItemTypeFilterValues(currentValues, value, checked) {
  if (!checked) {
    return currentValues.filter((item) => item !== value);
  }

  const descendants = getItemTypeDescendants(value);
  const ancestors = getItemTypeAncestors(value);
  const relatedValues = new Set([...descendants, ...ancestors]);
  const nextValues = currentValues.filter((item) => !relatedValues.has(item) && item !== value);

  return [...nextValues, value];
}

function normalizeItemTypeFilterSelection(values) {
  const selectedValues = Array.isArray(values) ? [...new Set(values)] : [];

  return selectedValues.filter((value) => {
    const ancestors = getItemTypeAncestors(value);
    return !ancestors.some((ancestor) => selectedValues.includes(ancestor));
  });
}

function matchesItemTypeFilter(entry, value) {
  const group = ITEM_TYPE_GROUPS.find((item) => item.value === value);

  if (group) {
    return group.matches(entry.type);
  }

  return entry.type === value;
}

function getItemTypeGroupIndex(value) {
  const index = ITEM_TYPE_GROUPS.findIndex((group) => group.value === value);
  return index === -1 ? getItemSpecificTypeSortIndex(value) : index;
}

function getItemSpecificTypeSortIndex(value) {
  const matchingGroupIndexes = ITEM_TYPE_GROUPS
    .map((group, index) => group.value !== value && group.matches(value) ? index : -1)
    .filter((index) => index >= 0);

  if (matchingGroupIndexes.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(...matchingGroupIndexes) + 0.5;
}

function getItemTypeGroupLevel(value) {
  const group = ITEM_TYPE_GROUPS.find((item) => item.value === value);

  if (group) {
    return group.level ?? 0;
  }

  const matchingLevels = ITEM_TYPE_GROUPS
    .filter((item) => item.matches(value))
    .map((item) => item.level ?? 0);

  return matchingLevels.length > 0 ? Math.max(...matchingLevels) + 1 : 0;
}

function hasItemTypeChildren(value) {
  return (ITEM_TYPE_GROUP_CHILDREN[value] ?? []).length > 0;
}

function getItemTypeDescendants(value, visited = new Set()) {
  const children = ITEM_TYPE_GROUP_CHILDREN[value] ?? [];
  const descendants = [];

  children.forEach((child) => {
    if (visited.has(child)) {
      return;
    }

    visited.add(child);
    descendants.push(child, ...getItemTypeDescendants(child, visited));
  });

  return [...new Set(descendants)];
}

function getItemTypeAncestors(value) {
  if (!ITEM_TYPE_GROUPS.some((group) => group.value === value)) {
    const matchingGroups = ITEM_TYPE_GROUPS
      .filter((group) => group.matches(value))
      .map((group) => group.value);

    return [...new Set(matchingGroups.flatMap((groupValue) => [
      groupValue,
      ...getItemTypeAncestors(groupValue)
    ]))];
  }

  return Object.entries(ITEM_TYPE_GROUP_CHILDREN)
    .filter(([, children]) => children.includes(value))
    .flatMap(([parent]) => [parent, ...getItemTypeAncestors(parent)]);
}

function compareArcanumFilterValues(key, left, right) {
  if (key === "level") {
    return parseSpellLevel(left) - parseSpellLevel(right)
      || left.localeCompare(right, "es", { numeric: true, sensitivity: "base" });
  }

  if (key === "castingTime") {
    return compareSpellCastingSpeed(left, right);
  }

  if (key === "source") {
    return getSourceFullName(left).localeCompare(getSourceFullName(right), "es", { sensitivity: "base" })
      || left.localeCompare(right, "es", { sensitivity: "base" });
  }

  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function getArcanumFilterDisplayValue(key, value) {
  if (key === "level") {
    return formatSpellLevel(value);
  }

  if (key === "source") {
    const source = cleanText(value);
    const sourceFullName = getSourceFullName(source);
    return sourceFullName && sourceFullName !== source
      ? `${sourceFullName} (${source})`
      : source;
  }

  return value;
}

function getCampaignSaveNameDialogDefaultValue() {
  return cleanText(state.campaignName)
    || getCampaignNameFromFileName(cleanText(state.campaignFileName))
    || "Campana sin nombre";
}

function openCampaignSaveNameDialog(mode) {
  state.campaignSaveNameDialogOpen = true;
  state.campaignSaveNameDialogMode = mode;
  state.campaignSaveNameDialogValue = getCampaignSaveNameDialogDefaultValue();
  state.campaignSaveNameDialogError = "";
  render({
    focusSelector: "[data-campaign-save-name-input]",
    selectionStart: state.campaignSaveNameDialogValue.length,
    selectionEnd: state.campaignSaveNameDialogValue.length
  });
}

function closeCampaignSaveNameDialog() {
  state.campaignSaveNameDialogOpen = false;
  state.campaignSaveNameDialogMode = "";
  state.campaignSaveNameDialogValue = "";
  state.campaignSaveNameDialogError = "";
}

function clearActiveCampaignFileSelection() {
  state.campaignFileName = "";
  state.campaignFilePath = "";
  saveCampaignMeta();
}

async function submitCampaignSaveNameDialog() {
  const campaignName = cleanText(state.campaignSaveNameDialogValue);
  const dialogMode = state.campaignSaveNameDialogMode;

  if (!campaignName) {
    state.campaignSaveNameDialogError = "Escribe un nombre para la campana.";
    render({
      focusSelector: "[data-campaign-save-name-input]"
    });
    return;
  }

  closeCampaignSaveNameDialog();
  render();
  await waitForNextPaint();

  if (dialogMode === "save-as") {
    await saveCampaignFileAs({
      campaignName,
      suggestedFileName: getCampaignFileName(campaignName),
      skipNamePrompt: true
    });
    return;
  }

  await saveCampaignFile({
    campaignName,
    suggestedFileName: getCampaignFileName(campaignName),
    skipNamePrompt: true
  });
}

async function saveCampaignFile(options = {}) {
  try {
    const hasSelectedCampaignFile = Boolean(cleanText(state.campaignFilePath) || cleanText(state.campaignFileName));
    const campaignName = cleanText(options.campaignName) || cleanText(state.campaignName) || "Campana sin nombre";

    if (!hasSelectedCampaignFile && !options.skipNamePrompt) {
      openCampaignSaveNameDialog("save");
      return;
    }

    state.campaignName = campaignName;
    const result = await saveCampaignToDesktop({
      suggestedFileName: cleanText(options.suggestedFileName) || getCampaignFileName(campaignName)
    });

    if (result?.canceled) {
      return;
    }

    if (result) {
      applyCampaignFileResult(result);
      state.campaignMessage = `Archivo guardado: ${state.campaignFileName}`;
      render();
      return;
    }

    const payload = createCampaignSavePayload();
    const fileName = cleanText(options.suggestedFileName) || getCampaignFileName(payload.campaign.name);
    downloadJsonFile(payload, fileName);
    state.campaignName = payload.campaign.name;
    state.campaignMessage = `Archivo creado: ${fileName}`;
    saveCampaignMeta();
    render();
  } catch {
    state.campaignMessage = "No se pudo guardar la campaÃ±a.";
    render();
  }
}

async function saveCampaignFileAs(options = {}) {
  try {
    const campaignName = cleanText(options.campaignName) || cleanText(state.campaignName) || "Campana sin nombre";

    if (!options.skipNamePrompt) {
      openCampaignSaveNameDialog("save-as");
      return;
    }

    state.campaignName = campaignName;
    const result = await saveCampaignToDesktop({
      saveAs: true,
      force: true,
      suggestedFileName: cleanText(options.suggestedFileName) || getCampaignFileName(campaignName)
    });

    if (result?.canceled) {
      return;
    }

    if (result) {
      applyCampaignFileResult(result);
      state.campaignMessage = `Archivo guardado: ${state.campaignFileName}`;
      render();
      return;
    }

    const payload = createCampaignSavePayload();
    const fileName = cleanText(options.suggestedFileName) || getCampaignFileName(payload.campaign.name);
    downloadJsonFile(payload, fileName);
    state.campaignName = payload.campaign.name;
    state.campaignMessage = `Archivo creado: ${fileName}`;
    saveCampaignMeta();
    render();
  } catch {
    state.campaignMessage = "No se pudo guardar la campaÃ±a.";
    render();
  }
}

async function createNewCampaign() {
  const blankPayload = createBlankCampaignSavePayload();

  try {
    clearPersistedCampaignState();
    clearActiveCampaignFileSelection();
    resetCampaignStateFromPayload(blankPayload);
    state.campaignName = cleanText(blankPayload.campaign?.name) || "CampaÃ±a sin nombre";
    state.campaignMessage = "Nueva campaÃ±a sin guardar.";
    render();
  } catch {
    state.campaignMessage = "No se pudo crear la campaÃ±a.";
    render();
  }
}

function resetCampaignStateFromPayload(payload, fileResult = null) {
  const campaign = normalizeCampaignSave(payload);

  if (!fileResult) {
    state.campaignFileName = "";
    state.campaignFilePath = "";
  }

  applyCampaignSave(campaign, fileResult);
}

function applyCampaignFileResult(result) {
  const filePath = cleanText(result?.filePath);
  const fileName = cleanText(result?.fileName) || getFileNameFromPath(filePath);

  if (!fileName && !filePath) {
    return;
  }

  state.campaignFileName = fileName || state.campaignFileName;
  state.campaignFilePath = filePath || state.campaignFilePath;
  state.campaignName = cleanText(result.name)
    || cleanText(result.payload?.campaign?.name)
    || getCampaignNameFromFileName(fileName);
  saveCampaignMeta();
}

function getCampaignNameFromFileName(fileName) {
  return cleanText(fileName)
    .replace(/\.mimic-campaign\.json$/i, "")
    .replace(/\.json$/i, "")
    .replace(/-/g, " ")
    .trim()
    || "CampaÃ±a";
}

function createBlankCampaignSavePayload(name = "CampaÃ±a sin nombre") {
  return {
    schema: CAMPAIGN_FILE_SCHEMA,
    version: CAMPAIGN_FILE_VERSION,
    app: "Mimic Dice",
    savedAt: new Date().toISOString(),
    campaign: {
      name: cleanText(name) || "CampaÃ±a sin nombre"
    },
    characterSkills: {
      definitions: getDefaultCharacterSkillDefinitions()
    },
    characters: [],
    encounterInventory: {
      folders: [],
      systemFolderExpanded: true,
      encounters: []
    },
    combatTracker: {
      combatants: [],
      filters: { ...blankFilters },
      sort: getDefaultCombatSort(),
      sortDefaultVersion: COMBAT_TRACKER_SORT_DEFAULT_VERSION,
      newEntitySide: "allies",
      nextId: 1,
      inlineAdjustments: {},
      areaDamage: "",
      isCombatActive: false,
      activeTurnCombatantId: "",
      combatRound: 1,
      battleTimer: {
        elapsedMs: 0,
        isRunning: false
      }
    },
    ui: {
      activeScreen: "combat-tracker",
      activeEncounterId: "",
      activeEncounterFolderId: ""
    }
  };
}

async function saveCampaignToDesktop(options = {}) {
  if (campaignSaveInProgress && !options.force) {
    return campaignSaveInProgress;
  }

  if (campaignSaveInProgress) {
    await campaignSaveInProgress.catch(() => null);
  }

  const desktopApi = getDesktopCampaignApi();

  if (!desktopApi) {
    return null;
  }

  const payload = createCampaignSavePayload();
  const comparableSnapshot = getComparableCampaignSnapshot(payload);
  const filePath = cleanText(state.campaignFilePath);
  const fileName = cleanText(options.suggestedFileName)
    || state.campaignFileName
    || getCampaignFileName(payload.campaign.name);
  const hasExistingCampaignFile = Boolean(filePath || state.campaignFileName);
  const shouldSaveAs = options.saveAs || (!hasExistingCampaignFile && !options.silent);
  const saveAction = shouldSaveAs ? desktopApi.saveCampaignAs : desktopApi.saveCampaign;

  if (typeof saveAction !== "function") {
    return null;
  }

  campaignSaveInProgress = (
    shouldSaveAs
      ? saveAction(payload, fileName, { deriveNameFromFile: true, filePath })
      : saveAction(payload, fileName, filePath)
  )
    .then((result) => {
      if (result?.canceled) {
        scheduleDesktopCampaignDirtyStateSync();
        return result;
      }

      applyCampaignFileResult(result);
      lastSavedCampaignSnapshot = comparableSnapshot;
      scheduleDesktopCampaignDirtyStateSync();
      return {
        ...result,
        fileName: cleanText(result?.fileName) || fileName,
        filePath: cleanText(result?.filePath) || filePath
      };
    })
    .finally(() => {
      campaignSaveInProgress = null;
    });

  return campaignSaveInProgress;
}

async function autosaveCampaign() {
  try {
    if (!state.campaignFilePath && !state.campaignFileName) {
      return true;
    }

    if (!hasCampaignChangesSinceLastSave()) {
      return true;
    }

    await saveCampaignToDesktop({ silent: true });
    return true;
  } catch {
    return false;
  }
}

async function saveCampaignBeforeClose() {
  try {
    if (!state.campaignFilePath && !state.campaignFileName) {
      return true;
    }

    if (!hasCampaignChangesSinceLastSave()) {
      return true;
    }

    await saveCampaignToDesktop({ force: true, silent: true });
    return true;
  } catch {
    return false;
  }
}

function startCampaignAutosave() {
  if (typeof window === "undefined" || campaignAutosaveTimer) {
    return;
  }

  if (typeof getDesktopCampaignApi()?.saveCampaign !== "function") {
    return;
  }

  campaignAutosaveTimer = window.setInterval(() => {
    autosaveCampaign();
  }, CAMPAIGN_AUTOSAVE_INTERVAL_MS);
}

function registerCampaignCloseAutosave() {
  const desktopApi = getDesktopCampaignApi();

  if (
    typeof desktopApi?.onCampaignSaveBeforeClose !== "function"
    || typeof desktopApi.finishCampaignSaveBeforeClose !== "function"
  ) {
    return;
  }

  if (typeof desktopApi.markCampaignCloseReady === "function") {
    desktopApi.markCampaignCloseReady();
  }

  syncDesktopCampaignDirtyState(true);

  desktopApi.onCampaignSaveBeforeClose(async (requestId) => {
    const saved = await saveCampaignBeforeClose();
    desktopApi.finishCampaignSaveBeforeClose(requestId, { saved });
  });
}

async function chooseCampaignFile() {
  const desktopLoad = getDesktopCampaignApi()?.loadCampaign;

  if (typeof desktopLoad === "function") {
    await loadDesktopCampaignFile(desktopLoad);
    return;
  }

  const input = app.querySelector("[data-campaign-file-input]");
  input?.click();
}

async function loadDesktopCampaignFile(loadCampaign) {
  try {
    const result = await loadCampaign();

    if (result?.canceled) {
      return;
    }

    const campaign = normalizeCampaignSave(result?.payload);

    applyCampaignSave(campaign, result);
    state.campaignMessage = `CampaÃ±a cargada: ${campaign.name}`;
    render();
  } catch {
    state.campaignMessage = "No se pudo cargar el archivo de campaÃ±a.";
    render();
  }
}

async function loadCampaignFile(file) {
  if (!file) {
    return;
  }

  try {
    const rawValue = await file.text();
    const parsedValue = JSON.parse(rawValue);
    const campaign = normalizeCampaignSave(parsedValue);

    applyCampaignSave(campaign, {
      fileName: file.name,
      name: campaign.name,
      payload: parsedValue
    });
    state.campaignMessage = `CampaÃ±a cargada: ${campaign.name}`;
    render();
  } catch {
    state.campaignMessage = "No se pudo cargar el archivo de campaÃ±a.";
    render();
  }
}

function getDesktopCampaignApi() {
  return typeof window !== "undefined" && isPlainObject(window.mimicDice)
    ? window.mimicDice
    : null;
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return cleanText(error.message) || error.name;
  }

  return cleanText(error);
}

async function getDesktopAssetDebugSnapshot() {
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.getDesktopDebugInfo !== "function") {
    return null;
  }

  try {
    const debugInfo = await desktopApi.getDesktopDebugInfo();
    return isPlainObject(debugInfo) ? debugInfo : null;
  } catch {
    return null;
  }
}

async function createAssetLoadDebugInfo({ label = "", assetUrl = "", desktopRelativePath = "", loaderMode = "", primaryError = null, secondaryError = null } = {}) {
  const desktopApi = getDesktopCampaignApi();

  return {
    label: cleanText(label),
    assetUrl: cleanText(assetUrl),
    desktopRelativePath: cleanText(desktopRelativePath),
    loaderMode: cleanText(loaderMode),
    primaryError: getErrorMessage(primaryError),
    secondaryError: getErrorMessage(secondaryError),
    hasExternalAssets: HAS_DESKTOP_EXTERNAL_ASSETS,
    assetBaseUrl: DESKTOP_ASSET_BASE_URL,
    runtimeProtocol: typeof window !== "undefined" ? cleanText(window.location?.protocol) : "",
    desktopApiAvailable: Boolean(desktopApi),
    desktopApiReadAssetAvailable: typeof desktopApi?.readAssetText === "function",
    snapshot: await getDesktopAssetDebugSnapshot()
  };
}

async function resolveAssetLoadDebugInfo(error, fallbackInfo = {}) {
  if (isPlainObject(error?.assetDebugInfo)) {
    return error.assetDebugInfo;
  }

  return createAssetLoadDebugInfo({
    ...fallbackInfo,
    primaryError: error
  });
}

async function loadTextAsset(assetUrl, desktopRelativePath = "") {
  const desktopApi = getDesktopCampaignApi();
  let desktopReadError = null;

  if (desktopRelativePath && typeof desktopApi?.readAssetText === "function") {
    try {
      return await desktopApi.readAssetText(desktopRelativePath);
    } catch (error) {
      desktopReadError = error;
    }
  }

  try {
    const response = await fetch(assetUrl, {
      cache: "no-store"
    });

    if (!response.ok) {
      const statusError = new Error(`No se pudo leer ${assetUrl} (${response.status}).`);
      statusError.assetDebugInfo = await createAssetLoadDebugInfo({
        label: assetUrl.includes("Bestiary") ? "Bestiario" : assetUrl.includes("Items") ? "Items" : assetUrl.includes("Spells") ? "Arcanum" : "Assets",
        assetUrl,
        desktopRelativePath,
        loaderMode: desktopReadError ? "desktopApi.readAssetText -> fetch" : "fetch",
        primaryError: desktopReadError || statusError,
        secondaryError: desktopReadError ? statusError : null
      });
      throw statusError;
    }

    return response.text();
  } catch (fetchError) {
    const combinedMessageParts = [];

    if (desktopReadError) {
      combinedMessageParts.push(`Desktop API: ${getErrorMessage(desktopReadError)}`);
    }

    combinedMessageParts.push(`Fetch: ${getErrorMessage(fetchError) || `No se pudo leer ${assetUrl}.`}`);

    const combinedError = new Error(combinedMessageParts.join(" | "));
    combinedError.assetDebugInfo = await createAssetLoadDebugInfo({
      label: assetUrl.includes("Bestiary") ? "Bestiario" : assetUrl.includes("Items") ? "Items" : assetUrl.includes("Spells") ? "Arcanum" : "Assets",
      assetUrl,
      desktopRelativePath,
      loaderMode: desktopReadError ? "desktopApi.readAssetText -> fetch" : "fetch",
      primaryError: desktopReadError || fetchError,
      secondaryError: desktopReadError ? fetchError : null
    });
    throw combinedError;
  }
}

async function loadJsonAsset(assetUrl, desktopRelativePath = "") {
  const desktopApi = getDesktopCampaignApi();

  if (desktopRelativePath && typeof desktopApi?.readAssetText === "function") {
    try {
      const rawValue = await desktopApi.readAssetText(desktopRelativePath);
      const data = JSON.parse(rawValue);
      return isPlainObject(data) ? data : {};
    } catch {
      return {};
    }
  }

  try {
    const response = await fetch(assetUrl, {
      cache: "no-store"
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return isPlainObject(data) ? data : {};
  } catch {
    return {};
  }
}

function waitForNextPaint() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const schedule = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);

  return new Promise((resolve) => {
    schedule(() => {
      schedule(resolve);
    });
  });
}

function syncDesktopCampaignDirtyState(force = false) {
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.setCampaignDirtyState !== "function") {
    return;
  }

  const hasUnsavedChanges = hasCampaignChangesSinceLastSave();

  if (!force && lastDesktopCampaignDirtyValue === hasUnsavedChanges) {
    return;
  }

  lastDesktopCampaignDirtyValue = hasUnsavedChanges;
  desktopApi.setCampaignDirtyState({ hasUnsavedChanges });
}

function scheduleDesktopCampaignDirtyStateSync(delay = 0) {
  if (typeof window === "undefined") {
    return;
  }

  if (campaignDirtyStateSyncTimer) {
    window.clearTimeout(campaignDirtyStateSyncTimer);
  }

  campaignDirtyStateSyncTimer = window.setTimeout(() => {
    campaignDirtyStateSyncTimer = 0;
    syncDesktopCampaignDirtyState();
  }, Math.max(0, delay));
}

function createCampaignSavePayload(options = {}) {
  const name = cleanText(state.campaignName) || "CampaÃ±a sin nombre";
  const savedAt = options.savedAt ?? new Date().toISOString();

  return {
    schema: CAMPAIGN_FILE_SCHEMA,
    version: CAMPAIGN_FILE_VERSION,
    app: "Mimic Dice",
    savedAt,
    campaign: {
      name
    },
    characterSkills: {
      definitions: getCharacterSkillDefinitionsSaveData()
    },
    characters: getCharactersSaveData(),
    encounterInventory: getEncounterInventorySaveData(),
    combatTracker: getCombatTrackerSaveData({
      includeBattleTimer: true
    }),
    ui: {
      activeScreen: state.activeScreen,
      activeEncounterId: state.activeEncounterId,
      activeEncounterFolderId: state.activeEncounterFolderId
    }
  };
}

function getComparableCampaignSnapshot(payload = createCampaignSavePayload({ savedAt: "" })) {
  return JSON.stringify({
    ...payload,
    savedAt: ""
  });
}

function hasCampaignChangesSinceLastSave() {
  return getComparableCampaignSnapshot() !== lastSavedCampaignSnapshot;
}

function normalizeCampaignSave(value) {
  if (!isPlainObject(value)) {
    throw new Error("Invalid campaign file");
  }

  const schema = cleanText(value.schema);

  if (schema && schema !== CAMPAIGN_FILE_SCHEMA) {
    throw new Error("Unknown campaign schema");
  }

  if (!schema && !isPlainObject(value.encounterInventory) && !isPlainObject(value.combatTracker)) {
    throw new Error("Missing campaign data");
  }

  const characterSkills = isPlainObject(value.characterSkills) ? value.characterSkills : {};
  const characterSkillDefinitions = normalizeStoredCharacterSkillDefinitions(
    characterSkills.definitions,
    value.characters
  );
  const encounterInventory = normalizeStoredEncounterInventory(value.encounterInventory);
  const characters = normalizeStoredCharacters(value.characters, characterSkillDefinitions);
  const combatTracker = normalizeStoredCombatTrackerState(value.combatTracker);
  const battleTimer = normalizeStoredBattleTimer(value.combatTracker?.battleTimer);
  const ui = isPlainObject(value.ui) ? value.ui : {};
  const campaign = isPlainObject(value.campaign) ? value.campaign : {};
  const name = cleanText(campaign.name) || cleanText(value.name) || "CampaÃ±a sin nombre";

  return {
    name,
    characterSkillDefinitions,
    characters,
    encounterInventory,
    combatTracker,
    battleTimer,
    activeScreen: normalizeStoredActiveScreen(ui.activeScreen),
    activeEncounterId: cleanText(ui.activeEncounterId),
    activeEncounterFolderId: cleanText(ui.activeEncounterFolderId)
  };
}

function resetTransientCampaignUiState() {
  state.fileMenuOpen = false;
  closeCampaignSaveNameDialog();
  state.characterSkillConfigOpen = false;
  state.characterSkillsExpanded = false;
  state.activeCharacterInventoryRowId = "";
  state.showCharacterInventorySuggestions = false;
  state.encounterInventoryOpen = false;
  state.selectedIds = new Set();
  state.activeFilterKey = "";
  state.activeCombatNameSearchId = "";
  state.activeCombatSourceId = "";
  state.combatEncounterPickerOpen = false;
  state.combatAddPickerMode = "";
  state.activeEncounterRowId = "";
  state.activeEncounterSourceRowId = "";
  state.selectedEncounterIds = new Set();
  state.selectedEncounterFolderIds = new Set();
  state.encounterSearchQuery = "";
  state.showEncounterSearchSuggestions = false;
  state.draggedEncounterId = "";
  state.draggedEncounterFolderId = "";
  state.draggedFolderId = "";
}

function applyCampaignSave(campaign, fileResult = null) {
  stopBattleTimerInterval();

  state.campaignName = campaign.name;
  state.campaignFileName = cleanText(fileResult?.fileName) || state.campaignFileName;
  state.campaignFilePath = cleanText(fileResult?.filePath) || state.campaignFilePath;
  state.activeScreen = campaign.activeScreen;
  resetTransientCampaignUiState();
  state.combatants = campaign.combatTracker.combatants;
  state.filters = campaign.combatTracker.filters;
  state.sort = campaign.combatTracker.sort;
  state.newEntitySide = campaign.combatTracker.newEntitySide;
  state.nextId = campaign.combatTracker.nextId;
  state.inlineAdjustments = campaign.combatTracker.inlineAdjustments;
  state.areaDamage = campaign.combatTracker.areaDamage;
  state.isCombatActive = campaign.combatTracker.isCombatActive;
  state.activeTurnCombatantId = campaign.combatTracker.activeTurnCombatantId;
  state.combatRound = campaign.combatTracker.combatRound;
  state.battleTimer = campaign.battleTimer;
  state.characterSkillDefinitions = campaign.characterSkillDefinitions;
  state.characters = campaign.characters;
  state.activeCharacterId = state.characters[0]?.id ?? "";

  state.encounterFolders = campaign.encounterInventory.folders;
  state.encounters = campaign.encounterInventory.encounters;
  state.systemEncounterFolderExpanded = campaign.encounterInventory.systemFolderExpanded;
  state.activeEncounterId = normalizeCampaignActiveEncounterId(campaign.activeEncounterId, state.encounters);
  state.activeEncounterFolderId = normalizeCampaignActiveEncounterFolderId(
    campaign.activeEncounterFolderId,
    state.activeEncounterId,
    state.encounters,
    state.encounterFolders
  );

  saveCombatTrackerState();
  saveCharacterSkillDefinitions();
  saveCharacters();
  saveEncounterInventory();

  if (fileResult) {
    applyCampaignFileResult(fileResult);
  }

  saveCampaignMeta();
  lastSavedCampaignSnapshot = getComparableCampaignSnapshot();
  scheduleDesktopCampaignDirtyStateSync();
}

function normalizeCampaignActiveEncounterId(value, encounters) {
  const activeEncounterId = cleanText(value);
  return encounters.some((encounter) => encounter.id === activeEncounterId)
    ? activeEncounterId
    : encounters[0]?.id ?? "";
}

function normalizeCampaignActiveEncounterFolderId(value, activeEncounterId, encounters, folders) {
  const activeEncounter = encounters.find((encounter) => encounter.id === activeEncounterId);

  if (activeEncounter) {
    return activeEncounter.folderId ?? "";
  }

  const activeFolderId = cleanText(value);
  return activeFolderId && folders.some((folder) => folder.id === activeFolderId) ? activeFolderId : "";
}

function normalizeStoredActiveScreen(value) {
  const activeScreen = cleanText(value);
  return screens.some((screen) => screen.id === activeScreen) ? activeScreen : "combat-tracker";
}

function normalizeStoredBattleTimer(value) {
  if (!isPlainObject(value)) {
    return {
      elapsedMs: 0,
      startedAt: 0,
      isRunning: false
    };
  }

  return {
    elapsedMs: Math.max(0, Math.floor(toNumber(value.elapsedMs))),
    startedAt: 0,
    isRunning: false
  };
}

function getCampaignFileName(name) {
  const safeName = cleanText(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "campana";

  return `${safeName}.mimic-campaign.json`;
}

function downloadJsonFile(value, fileName) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isPackagedDesktopApp() {
  return typeof window !== "undefined" && Boolean(window.mimicDice?.isPackaged);
}

function getDesktopBuildSignature() {
  return typeof window !== "undefined"
    ? cleanText(window.mimicDice?.buildSignature)
    : "";
}

function removeManagedLocalStorageKeys(options = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const includeResetMarker = options.includeResetMarker === true;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = cleanText(window.localStorage.key(index));

    if (!key.startsWith(MANAGED_STORAGE_KEY_PREFIX)) {
      continue;
    }

    if (!includeResetMarker && key === DESKTOP_STORAGE_RESET_VERSION_KEY) {
      continue;
    }

    window.localStorage.removeItem(key);
  }
}

function resetDesktopLocalStorageIfNeeded() {
  if (typeof window === "undefined" || !isPackagedDesktopApp()) {
    return;
  }

  try {
    const currentBuildSignature = getDesktopBuildSignature();
    const storedResetVersion = window.localStorage.getItem(DESKTOP_STORAGE_RESET_VERSION_KEY);
    const storedBuildSignature = cleanText(window.localStorage.getItem(DESKTOP_BUILD_SIGNATURE_STORAGE_KEY));

    if (
      storedResetVersion === DESKTOP_STORAGE_RESET_VERSION
      && (!currentBuildSignature || storedBuildSignature === currentBuildSignature)
    ) {
      return;
    }

    removeManagedLocalStorageKeys();
    window.localStorage.setItem(DESKTOP_STORAGE_RESET_VERSION_KEY, DESKTOP_STORAGE_RESET_VERSION);
    if (currentBuildSignature) {
      window.localStorage.setItem(DESKTOP_BUILD_SIGNATURE_STORAGE_KEY, currentBuildSignature);
    }
  } catch {
    // Desktop build can continue even if storage is unavailable.
  }
}

function clearPersistedCampaignState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    removeManagedLocalStorageKeys();
    window.localStorage.setItem(DESKTOP_STORAGE_RESET_VERSION_KEY, DESKTOP_STORAGE_RESET_VERSION);
    const currentBuildSignature = getDesktopBuildSignature();

    if (currentBuildSignature) {
      window.localStorage.setItem(DESKTOP_BUILD_SIGNATURE_STORAGE_KEY, currentBuildSignature);
    }
  } catch {
    // Ignore storage cleanup failures and keep the in-memory reset.
  }
}

function usesDesktopFileOnlyPersistence() {
  return isPackagedDesktopApp() || IS_FILE_PROTOCOL_RUNTIME;
}

function getFileNameFromPath(filePath) {
  return cleanText(filePath).split(/[\\/]/).filter(Boolean).pop() || "";
}

function loadCampaignMeta() {
  if (typeof window === "undefined") {
    return { name: "", fileName: "", filePath: "" };
  }

  if (usesDesktopFileOnlyPersistence()) {
    return { name: "", fileName: "", filePath: "" };
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(CAMPAIGN_META_STORAGE_KEY) || "{}");
    const filePath = cleanText(parsedValue.filePath);
    const fileName = cleanText(parsedValue.fileName) || getFileNameFromPath(filePath);

    return {
      name: fileName ? cleanText(parsedValue.name) || getCampaignNameFromFileName(fileName) : "",
      fileName,
      filePath
    };
  } catch {
    return { name: "", fileName: "", filePath: "" };
  }
}

function saveCampaignMeta() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(CAMPAIGN_META_STORAGE_KEY, JSON.stringify({
        name: cleanText(state.campaignName),
        fileName: cleanText(state.campaignFileName),
        filePath: cleanText(state.campaignFilePath)
      }));
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function loadCharacterSkillDefinitions() {
  if (typeof window === "undefined") {
    return getDefaultCharacterSkillDefinitions();
  }

  if (usesDesktopFileOnlyPersistence()) {
    return getDefaultCharacterSkillDefinitions();
  }

  try {
    const rawValue = window.localStorage.getItem(CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY);

    if (rawValue) {
      return normalizeStoredCharacterSkillDefinitions(JSON.parse(rawValue || "[]"));
    }

    const legacyCharactersRaw = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
    return normalizeStoredCharacterSkillDefinitions(undefined, JSON.parse(legacyCharactersRaw || "[]"));
  } catch {
    return getDefaultCharacterSkillDefinitions();
  }
}

function saveCharacterSkillDefinitions() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(
        CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY,
        JSON.stringify(getCharacterSkillDefinitionsSaveData())
      );
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getCharacterSkillDefinitionsSaveData() {
  return state.characterSkillDefinitions
    .map((skillDefinition) => normalizeStoredCharacterSkillDefinition(skillDefinition))
    .filter(Boolean);
}

function loadCharacters(skillDefinitions = getDefaultCharacterSkillDefinitions()) {
  if (typeof window === "undefined") {
    return [];
  }

  if (usesDesktopFileOnlyPersistence()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
    return normalizeStoredCharacters(JSON.parse(rawValue || "[]"), skillDefinitions);
  } catch {
    return [];
  }
}

function saveCharacters() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(getCharactersSaveData()));
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getCharactersSaveData() {
  return state.characters
    .map((character) => normalizeStoredCharacter(character, state.characterSkillDefinitions))
    .filter(Boolean);
}

function resolveCharacterSkillDefinitions(skillDefinitions, legacyCharacters = []) {
  if (Array.isArray(skillDefinitions)) {
    return skillDefinitions;
  }

  if (typeof state !== "undefined" && Array.isArray(state.characterSkillDefinitions)) {
    return state.characterSkillDefinitions;
  }

  return normalizeStoredCharacterSkillDefinitions(undefined, legacyCharacters);
}

function normalizeStoredCharacters(value, skillDefinitions = undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  const resolvedSkillDefinitions = resolveCharacterSkillDefinitions(skillDefinitions, value);

  return value
    .map((character) => normalizeStoredCharacter(character, resolvedSkillDefinitions))
    .filter(Boolean);
}

function normalizeStoredCharacter(character, skillDefinitions = undefined) {
  if (!isPlainObject(character)) {
    return null;
  }

  const resolvedSkillDefinitions = resolveCharacterSkillDefinitions(skillDefinitions, [character]);

  const maxHp = normalizeStoredNonNegativeNumber(character.maxHp);
  const hasCurrentHp = character.currentHp !== undefined && character.currentHp !== null;
  let currentHp = hasCurrentHp ? normalizeStoredNonNegativeNumber(character.currentHp) : maxHp;
  const level = normalizeStoredCharacterLevel(character.level);
  const levelStartExperiencePoints = getCharacterLevelProgressionEntry(level).experiencePoints;
  const hasSeparatedExperience = character.totalExperiencePoints !== undefined;
  const levelExperiencePoints = hasSeparatedExperience
    ? normalizeStoredCharacterLevelExperiencePoints(character.experiencePoints, level)
    : normalizeLegacyCharacterLevelExperiencePoints(character.experiencePoints, level);

  if (currentHp !== "" && maxHp !== "") {
    currentHp = Math.min(currentHp, maxHp);
  }

  return {
    id: cleanText(character.id) || createStableId("character"),
    name: cleanText(character.name) || "Personaje",
    playerName: cleanText(character.playerName),
    className: cleanText(character.className),
    subclassName: cleanText(character.subclassName),
    level,
    experiencePoints: levelExperiencePoints,
    totalExperiencePoints: levelStartExperiencePoints + levelExperiencePoints,
    species: cleanText(character.species),
    background: cleanText(character.background),
    size: cleanText(character.size) || "Mediano",
    proficiencyBonus: getDefaultCharacterProficiencyBonus(level),
    proficiencies: normalizeStoredCharacterProficiencies(character.proficiencies),
    tokenUrl: cleanText(character.tokenUrl),
    armorClass: Math.max(0, Math.floor(toNumber(normalizeStoredNumber(character.armorClass)) || 10)),
    maxHp,
    currentHp,
    tempHp: normalizeStoredNonNegativeNumber(character.tempHp),
    speed: cleanText(character.speed) || "30 ft",
    initiativeBonus: normalizeStoredNumber(character.initiativeBonus),
    conditions: cleanText(character.conditions),
    stand: normalizeStoredStandLabel(character.stand),
    notes: cleanText(character.notes),
    skillProgress: normalizeStoredCharacterSkillProgress(
      character.skillProgress,
      resolvedSkillDefinitions,
      character.skillTracks
    ),
    inventoryOpen: character.inventoryOpen !== false,
    inventory: normalizeStoredCharacterInventory(character.inventory),
    abilities: normalizeStoredCharacterAbilities(character.abilities)
  };
}

function normalizeStoredCharacterLevel(value) {
  return Math.max(1, Math.min(20, Math.floor(toNumber(value)) || 1));
}

function normalizeStoredCharacterLevelExperiencePoints(value, level) {
  const numericValue = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
  return Math.min(numericValue, getCharacterLevelExperienceRequirement(level));
}

function normalizeLegacyCharacterLevelExperiencePoints(value, level) {
  const totalExperiencePoints = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
  const levelStartExperiencePoints = getCharacterLevelProgressionEntry(level).experiencePoints;
  return normalizeStoredCharacterLevelExperiencePoints(totalExperiencePoints - levelStartExperiencePoints, level);
}

function normalizeStoredCharacterAbilities(abilities) {
  const source = isPlainObject(abilities) ? abilities : {};

  return Object.fromEntries(characterAbilityKeys.map((key) => {
    const score = Math.max(1, Math.min(30, Math.floor(toNumber(source[key])) || 10));
    return [key, score];
  }));
}

function normalizeStoredCharacterSkillDefinitions(definitions, legacyCharacters = []) {
  if (Array.isArray(definitions)) {
    const normalizedDefinitions = definitions
      .map((definition) => normalizeStoredCharacterSkillDefinition(definition))
      .filter(Boolean);

    return dedupeCharacterSkillDefinitions(normalizedDefinitions);
  }

  const legacyDefinitions = getLegacyCharacterSkillDefinitionsFromCharacters(legacyCharacters);
  return legacyDefinitions.length > 0 ? legacyDefinitions : getDefaultCharacterSkillDefinitions();
}

function dedupeCharacterSkillDefinitions(definitions) {
  const seen = new Set();

  return definitions.filter((definition) => {
    if (!definition || seen.has(definition.id)) {
      return false;
    }

    seen.add(definition.id);
    return true;
  });
}

function getLegacyCharacterSkillDefinitionsFromCharacters(characters) {
  if (!Array.isArray(characters)) {
    return [];
  }

  const definitions = [];
  const seenNames = new Set();

  characters.forEach((character) => {
    if (!isPlainObject(character) || !Array.isArray(character.skillTracks)) {
      return;
    }

    character.skillTracks.forEach((skillTrack) => {
      const normalizedSkillTrack = normalizeLegacyCharacterSkillTrack(skillTrack);

      if (!normalizedSkillTrack || seenNames.has(normalizedSkillTrack.name.toLowerCase())) {
        return;
      }

      seenNames.add(normalizedSkillTrack.name.toLowerCase());
      definitions.push(normalizeStoredCharacterSkillDefinition({
        id: normalizedSkillTrack.id,
        name: normalizedSkillTrack.name,
        successGains: normalizedSkillTrack.successGains,
        intermediateGains: normalizedSkillTrack.intermediateGains,
        failureGains: normalizedSkillTrack.failureGains
      }));
    });
  });

  return definitions.filter(Boolean);
}

function normalizeLegacyCharacterSkillTrack(skillTrack) {
  if (!isPlainObject(skillTrack)) {
    return null;
  }

  const name = cleanText(skillTrack.name);
  const id = cleanText(skillTrack.id) || createCharacterSkillDefinitionId(name);
  const canonicalConfig = getCharacterSkillCanonicalConfig(id, name);

  return {
    id,
    name: name || "Nueva skill",
    color: canonicalConfig?.color ?? normalizeStoredCharacterSkillColor(
      skillTrack.color,
      getDefaultCharacterSkillColorForIdentity(id, name)
    ),
    experiencePoints: normalizeStoredCharacterSkillExperiencePoints(skillTrack.experiencePoints),
    successGains: canonicalConfig?.successGains
      ?? normalizeStoredCharacterSkillGains(skillTrack.successGains ?? skillTrack.successGain, [2]),
    intermediateGains: canonicalConfig?.intermediateGains
      ?? normalizeStoredCharacterSkillGains(skillTrack.intermediateGains, []),
    failureGains: canonicalConfig?.failureGains
      ?? normalizeStoredCharacterSkillGains(skillTrack.failureGains ?? skillTrack.failureGain, [1])
  };
}

function normalizeStoredCharacterSkillDefinition(definition) {
  if (!isPlainObject(definition)) {
    return null;
  }

  const name = cleanText(definition.name) || "Nueva skill";
  const id = cleanText(definition.id) || createCharacterSkillDefinitionId(name) || createStableId("skill-def");
  const canonicalConfig = getCharacterSkillCanonicalConfig(id, name);

  return {
    id,
    name,
    color: canonicalConfig?.color ?? normalizeStoredCharacterSkillColor(
      definition.color,
      getDefaultCharacterSkillColorForIdentity(id, name)
    ),
    successGains: canonicalConfig?.successGains
      ?? normalizeStoredCharacterSkillGains(definition.successGains ?? definition.successGain, [2]),
    intermediateGains: canonicalConfig?.intermediateGains
      ?? normalizeStoredCharacterSkillGains(definition.intermediateGains, []),
    failureGains: canonicalConfig?.failureGains
      ?? normalizeStoredCharacterSkillGains(definition.failureGains ?? definition.failureGain, [1])
  };
}

function getCharacterSkillCanonicalConfig(skillId, skillName) {
  const normalizedId = cleanText(skillId);
  const normalizedName = cleanText(skillName).toLowerCase();

  if (normalizedId === "skill-cocina" || normalizedName === "cocina") {
    return {
      color: "#f0c879",
      successGains: [3],
      intermediateGains: [2],
      failureGains: [1]
    };
  }

  if (
    normalizedId === "skill-trampas-puertas-secretas"
    || normalizedName === "trampas y puertas secretas"
  ) {
    return {
      color: "#e06d78",
      successGains: [3],
      intermediateGains: [],
      failureGains: [0]
    };
  }

  return null;
}

function createCharacterSkillDefinitionId(name) {
  const slug = cleanText(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `skill-${slug}` : "";
}

function normalizeStoredCharacterSkillProgress(skillProgress, skillDefinitions, legacySkillTracks = []) {
  const progressBySkillId = new Map();
  const legacySkillTracksByName = new Map(
    Array.isArray(legacySkillTracks)
      ? legacySkillTracks
        .map((skillTrack) => normalizeLegacyCharacterSkillTrack(skillTrack))
        .filter(Boolean)
        .map((skillTrack) => [skillTrack.name.toLowerCase(), skillTrack])
      : []
  );

  if (Array.isArray(skillProgress)) {
    skillProgress
      .map((entry) => normalizeStoredCharacterSkillProgressEntry(entry))
      .filter(Boolean)
      .forEach((entry) => progressBySkillId.set(entry.skillId, entry));
  }

  return skillDefinitions.map((skillDefinition) => {
    const existingProgress = progressBySkillId.get(skillDefinition.id);
    const legacyProgress = legacySkillTracksByName.get(skillDefinition.name.toLowerCase());

    return normalizeStoredCharacterSkillProgressEntry({
      skillId: skillDefinition.id,
      level: existingProgress?.level,
      experiencePoints: existingProgress?.experiencePoints ?? legacyProgress?.experiencePoints ?? 0
    });
  }).filter(Boolean);
}

function normalizeStoredCharacterSkillProgressEntry(entry) {
  if (!isPlainObject(entry)) {
    return null;
  }

  const skillId = cleanText(entry.skillId);

  if (!skillId) {
    return null;
  }

  const hasExplicitLevel = entry.level !== undefined && entry.level !== null && entry.level !== "";

  if (!hasExplicitLevel) {
    const legacyExperiencePoints = normalizeStoredCharacterSkillExperiencePoints(entry.experiencePoints);
    const legacyCurrentEntry = [...characterSkillLevelProgression]
      .reverse()
      .find((progressionEntry) => legacyExperiencePoints >= progressionEntry.experiencePoints) ?? null;
    const legacyLevel = legacyCurrentEntry?.level ?? 0;
    const legacyLevelStart = legacyCurrentEntry?.experiencePoints ?? 0;

    return {
      skillId,
      level: legacyLevel,
      experiencePoints: Math.max(0, legacyExperiencePoints - legacyLevelStart)
    };
  }

  return {
    skillId,
    level: normalizeStoredCharacterSkillLevel(entry.level),
    experiencePoints: normalizeStoredCharacterSkillExperiencePoints(entry.experiencePoints)
  };
}

function normalizeStoredCharacterSkillLevel(value) {
  const numericValue = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
  return Math.min(numericValue, getCharacterSkillMaxLevel());
}

function normalizeStoredCharacterSkillExperiencePoints(value) {
  const numericValue = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
  return Math.min(numericValue, getCharacterSkillMaxExperiencePoints());
}

function normalizeStoredCharacterSkillGain(value, fallback = 0) {
  if (value === "" || value === undefined || value === null) {
    return fallback;
  }

  return Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
}

function normalizeStoredCharacterSkillGains(value, defaultValues = [0]) {
  const normalizedDefaults = Array.isArray(defaultValues)
    ? defaultValues.map((entry) => normalizeStoredCharacterSkillGain(entry, 0))
    : [normalizeStoredCharacterSkillGain(defaultValues, 0)];
  const sourceValues = Array.isArray(value)
    ? value
    : (value === undefined || value === null || value === "")
      ? normalizedDefaults
      : [value];
  const normalizedValues = sourceValues
    .map((entry, index) => normalizeStoredCharacterSkillGain(entry, normalizedDefaults[Math.min(index, normalizedDefaults.length - 1)] ?? 0))
    .filter((entry) => entry !== null && entry !== undefined);

  if (normalizedValues.length > 0 || normalizedDefaults.length === 0) {
    return normalizedValues;
  }

  return normalizedDefaults;
}

function normalizeStoredCharacterInventory(inventory) {
  const normalizedRows = Array.isArray(inventory)
    ? inventory.map((row) => normalizeStoredCharacterInventoryRow(row)).filter(Boolean)
    : [];
  const nonCurrencyRows = normalizedRows.filter((row) => !isCharacterCurrencyRow(row.name));
  const currencyRows = characterCurrencyRows.map((currency) => {
    const existingRow = normalizedRows.find((row) => cleanText(row.name).toUpperCase() === currency.name);
    return normalizeStoredCharacterInventoryRow(existingRow ?? {
      id: createStableId("character-item"),
      name: currency.name,
      quantity: 0
    });
  }).filter(Boolean);

  return [...currencyRows, ...nonCurrencyRows];
}

function normalizeStoredCharacterInventoryRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const name = cleanText(row.name);
  const matchedItem = getItemEntryByName(name);
  const quantity = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(row.quantity)) || 0));
  const size = isCharacterCurrencyRow(name)
    ? getCurrencyInventorySizeLabel(quantity)
    : normalizeItemSizeLabel(row.size) || matchedItem?.sizeLabel || inferItemSizeLabel(name);

  return {
    id: cleanText(row.id) || createStableId("character-item"),
    itemId: isCharacterCurrencyRow(name) ? "" : cleanText(row.itemId) || matchedItem?.id || "",
    name,
    size,
    quantity
  };
}

function normalizeItemSizeLabel(value) {
  const normalizedValue = cleanText(value).toUpperCase();
  return itemSizeThresholds.some((entry) => entry.label === normalizedValue) ? normalizedValue : "";
}

function normalizeStoredCharacterProficiencies(proficiencies) {
  if (!Array.isArray(proficiencies)) {
    return [];
  }

  return [...new Set(proficiencies.map((key) => normalizeCharacterProficiencyKey(key)).filter(Boolean))];
}

function normalizeCharacterProficiencyKey(key) {
  const value = cleanText(key);

  if (characterAbilityKeys.some((ability) => value === `save:${ability}`)) {
    return value;
  }

  const skillKeys = Object.values(characterStatBlocks)
    .flatMap((block) => block.skills)
    .map((skill) => `skill:${skill.id}`);

  return skillKeys.includes(value) ? value : "";
}

function loadCombatTrackerState() {
  const defaultState = getDefaultCombatTrackerState();

  if (typeof window === "undefined") {
    return defaultState;
  }

  if (usesDesktopFileOnlyPersistence()) {
    return defaultState;
  }

  try {
    const rawValue = window.localStorage.getItem(COMBAT_TRACKER_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue || "{}");
    return normalizeStoredCombatTrackerState(parsedValue, defaultState);
  } catch {
    return defaultState;
  }
}

function removeLegacyCombatTrackerPlaceholders(combatants) {
  if (!Array.isArray(combatants) || combatants.length === 0) {
    return [];
  }

  const normalizedNames = combatants.map((combatant) => cleanText(combatant?.nombre).toLowerCase()).filter(Boolean);

  if (
    normalizedNames.length === LEGACY_COMBAT_PLACEHOLDER_NAMES.size
    && normalizedNames.every((name) => LEGACY_COMBAT_PLACEHOLDER_NAMES.has(name))
  ) {
    return [];
  }

  return combatants;
}

function normalizeStoredCombatTrackerState(value, defaultState = getDefaultCombatTrackerState()) {
  if (!isPlainObject(value)) {
    return defaultState;
  }

  const combatants = removeLegacyCombatTrackerPlaceholders(Array.isArray(value.combatants)
    ? value.combatants.map((combatant) => normalizeStoredCombatant(combatant)).filter(Boolean)
    : defaultState.combatants);
  const nextId = normalizeStoredNextCombatantId(value.nextId, combatants);
  const sort = value.sortDefaultVersion === COMBAT_TRACKER_SORT_DEFAULT_VERSION
    ? normalizeStoredCombatSort(value.sort)
    : getDefaultCombatSort();

  return {
    combatants,
    filters: normalizeStoredCombatFilters(value.filters),
    sort,
    newEntitySide: normalizeStoredCombatSide(value.newEntitySide),
    nextId,
    inlineAdjustments: normalizeStoredInlineAdjustments(value.inlineAdjustments, combatants),
    areaDamage: cleanText(value.areaDamage),
    isCombatActive: value.isCombatActive === true,
    activeTurnCombatantId: normalizeStoredActiveTurnCombatantId(value.activeTurnCombatantId, combatants),
    combatRound: normalizeStoredCombatRound(value.combatRound)
  };
}

function saveCombatTrackerState() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(COMBAT_TRACKER_STORAGE_KEY, JSON.stringify(getCombatTrackerSaveData()));
    } catch {
      // Storage can be unavailable in private contexts; the in-memory tracker still works.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getCombatTrackerSaveData(options = {}) {
  const data = {
    combatants: state.combatants,
    filters: state.filters,
    sort: state.sort,
    sortDefaultVersion: COMBAT_TRACKER_SORT_DEFAULT_VERSION,
    newEntitySide: state.newEntitySide,
    nextId: state.nextId,
    inlineAdjustments: state.inlineAdjustments,
    areaDamage: state.areaDamage,
    isCombatActive: state.isCombatActive,
    activeTurnCombatantId: state.activeTurnCombatantId,
    combatRound: state.combatRound
  };

  if (options.includeBattleTimer) {
    data.battleTimer = {
      elapsedMs: getBattleTimerElapsedMs(),
      isRunning: false
    };
  }

  return data;
}

function getDefaultCombatTrackerState() {
  const combatants = initialCombatants.map((combatant) => normalizeStoredCombatant(combatant)).filter(Boolean);

  return {
    combatants,
    filters: { ...blankFilters },
    sort: getDefaultCombatSort(),
    newEntitySide: "allies",
    nextId: normalizeStoredNextCombatantId(initialCombatants.length + 1, combatants),
    inlineAdjustments: normalizeStoredInlineAdjustments({}, combatants),
    areaDamage: "",
    isCombatActive: false,
    activeTurnCombatantId: "",
    combatRound: 1
  };
}

function getDefaultCombatSort() {
  return { key: "numPeana", direction: "asc" };
}

function normalizeStoredCombatant(combatant) {
  if (!isPlainObject(combatant)) {
    return null;
  }

  const tag = normalizeStoredCombatTag(combatant.tag, combatant.side);
  const side = mapTagToSide(tag);
  const pgMax = normalizeStoredNonNegativeNumber(combatant.pgMax);
  const pgTemp = normalizeStoredNonNegativeNumber(combatant.pgTemp);
  const necrotic = normalizeStoredNonNegativeNumber(combatant.necrotic);
  let pgAct = normalizeStoredNonNegativeNumber(combatant.pgAct);

  if (pgAct !== "" && pgMax !== "") {
    pgAct = Math.min(pgAct, Math.max(0, toNumber(pgMax) - toNumber(necrotic)));
  }

  return {
    id: cleanText(combatant.id) || createStableId("entity"),
    side,
    characterId: cleanText(combatant.characterId),
    source: cleanText(combatant.source),
    tokenUrl: cleanText(combatant.tokenUrl),
    ubicacion: cleanText(combatant.ubicacion),
    iniactiva: normalizeStoredNumber(combatant.iniactiva),
    nombre: cleanText(combatant.nombre),
    numPeana: normalizeStoredStandLabel(combatant.numPeana),
    pgMax,
    pgAct,
    pgTemp,
    necrotic,
    ca: normalizeStoredNumber(combatant.ca),
    condiciones: cleanText(combatant.condiciones),
    stats: formatStatsWithModifiers(combatant.stats ?? ""),
    tamano: cleanText(combatant.tamano),
    movimiento: cleanText(combatant.movimiento),
    vision: cleanText(combatant.vision),
    lenguas: cleanText(combatant.lenguas),
    crExp: cleanText(combatant.crExp),
    tag,
    experienceGranted: combatant.experienceGranted === true,
    initiativeRoll: combatant.initiativeRoll === null || combatant.initiativeRoll === ""
      ? null
      : normalizeStoredNumber(combatant.initiativeRoll),
    initiativeNat20: combatant.initiativeNat20 === true
  };
}

function normalizeStoredCombatFilters(filters) {
  const normalizedFilters = { ...blankFilters };

  if (!isPlainObject(filters)) {
    return normalizedFilters;
  }

  for (const key of Object.keys(normalizedFilters)) {
    normalizedFilters[key] = cleanText(filters[key]);
  }

  return normalizedFilters;
}

function normalizeStoredCombatSort(sort) {
  if (!isPlainObject(sort)) {
    return getDefaultCombatSort();
  }

  const key = cleanText(sort.key);

  if (!columns.some((column) => column.key === key)) {
    return getDefaultCombatSort();
  }

  return {
    key,
    direction: sort.direction === "desc" ? "desc" : "asc"
  };
}

function normalizeStoredInlineAdjustments(inlineAdjustments, combatants) {
  const storedAdjustments = isPlainObject(inlineAdjustments) ? inlineAdjustments : {};

  return Object.fromEntries(combatants.map((combatant) => {
    const current = isPlainObject(storedAdjustments[combatant.id]) ? storedAdjustments[combatant.id] : {};

    return [
      combatant.id,
      {
        pgAct: cleanText(current.pgAct),
        necrotic: cleanText(current.necrotic)
      }
    ];
  }));
}

function normalizeStoredNextCombatantId(value, combatants) {
  const storedId = Math.floor(toNumber(value));
  const nextGeneratedId = combatants.reduce((maxId, combatant) => {
    const match = cleanText(combatant.id).match(/^entity-(\d+)$/i);
    return match ? Math.max(maxId, Number(match[1]) + 1) : maxId;
  }, 1);

  return Math.max(storedId, nextGeneratedId, combatants.length + 1);
}

function normalizeStoredActiveTurnCombatantId(value, combatants) {
  const activeTurnCombatantId = cleanText(value);
  return combatants.some((combatant) => combatant.id === activeTurnCombatantId) ? activeTurnCombatantId : "";
}

function normalizeStoredCombatRound(value) {
  return Math.max(1, Math.floor(toNumber(value)) || 1);
}

function normalizeStoredCombatSide(side) {
  return ["allies", "neutral", "enemies"].includes(side) ? side : "allies";
}

function normalizeStoredCombatTag(tag, side) {
  const cleanTag = cleanText(tag).toUpperCase();

  if (combatTagOptions.includes(cleanTag)) {
    return cleanTag;
  }

  return mapSideToTag(normalizeStoredCombatSide(side));
}

function normalizeStoredNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeStoredStandLabel(value) {
  const cleanValue = cleanText(value);
  const legacyMatch = cleanValue.match(/^[A-Z]+-(\d+)$/i);

  return legacyMatch ? String(Number(legacyMatch[1])) : cleanValue;
}

function normalizeStoredNonNegativeNumber(value) {
  const normalizedValue = normalizeStoredNumber(value);
  return normalizedValue === "" ? "" : Math.max(0, normalizedValue);
}

function loadEncounterInventory() {
  if (typeof window === "undefined") {
    return { folders: [], encounters: [], systemFolderExpanded: true };
  }

  if (usesDesktopFileOnlyPersistence()) {
    return { folders: [], encounters: [], systemFolderExpanded: true };
  }

  try {
    const storage = window.localStorage;
    const rawValue = storage.getItem(ENCOUNTER_INVENTORY_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue || "{}");
    return normalizeStoredEncounterInventory(parsedValue);
  } catch {
    return { folders: [], encounters: [], systemFolderExpanded: true };
  }
}

function normalizeStoredEncounterInventory(value) {
  if (Array.isArray(value)) {
    return {
      folders: [],
      systemFolderExpanded: true,
      encounters: value
        .map((encounter) => normalizeStoredEncounter(encounter))
        .filter(Boolean)
    };
  }

  if (!isPlainObject(value)) {
    return { folders: [], encounters: [], systemFolderExpanded: true };
  }

  return {
    folders: Array.isArray(value.folders)
      ? value.folders.map((folder) => normalizeStoredEncounterFolder(folder)).filter(Boolean)
      : [],
    systemFolderExpanded: value.systemFolderExpanded !== false,
    encounters: Array.isArray(value.encounters)
      ? value.encounters.map((encounter) => normalizeStoredEncounter(encounter)).filter(Boolean)
      : []
  };
}

function saveEncounterInventory() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(ENCOUNTER_INVENTORY_STORAGE_KEY, JSON.stringify(getEncounterInventorySaveData()));
    } catch {
      // Storage can be unavailable in private contexts; the in-memory inventory still works.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getEncounterInventorySaveData() {
  return {
    folders: state.encounterFolders,
    systemFolderExpanded: state.systemEncounterFolderExpanded,
    encounters: state.encounters
  };
}

function normalizeStoredEncounterFolder(folder) {
  if (!isPlainObject(folder)) {
    return null;
  }

  const id = cleanText(folder.id) || createStableId("encounter-folder");

  return {
    id,
    name: cleanText(folder.name) || "Carpeta",
    isExpanded: folder.isExpanded !== false
  };
}

function normalizeStoredEncounter(encounter) {
  if (!isPlainObject(encounter)) {
    return null;
  }

  const rows = Array.isArray(encounter.rows)
    ? encounter.rows.map((row) => normalizeStoredEncounterRow(row)).filter(Boolean)
    : [];

  return {
    id: cleanText(encounter.id) || createStableId("encounter"),
    name: cleanText(encounter.name),
    folderId: cleanText(encounter.folderId),
    rows
  };
}

function normalizeStoredEncounterRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const name = cleanText(row.name);

  if (!name) {
    return null;
  }

  return {
    id: cleanText(row.id) || createStableId("encounter-row"),
    entryId: cleanText(row.entryId),
    name,
    source: cleanText(row.source),
    tokenUrl: cleanText(row.tokenUrl),
    hp: cleanText(row.hp),
    hpValue: toNumber(row.hpValue),
    ac: cleanText(row.ac),
    acValue: toNumber(row.acValue),
    crLabel: cleanText(row.crLabel),
    crValue: toNumber(row.crValue),
    units: Math.max(1, Math.floor(toNumber(row.units) || 1))
  };
}

function createStableId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatCrNumber(value) {
  const numericValue = toNumber(value);

  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return String(Number(numericValue.toFixed(3)));
}

function formatCombatCrDisplay(value) {
  const cleanValue = cleanText(value).replace(/^CR\s*/i, "").trim();

  if (!cleanValue) {
    return "";
  }

  const fractionMatch = cleanValue.match(/^(\d+)\s*\/\s*(\d+)/);

  if (fractionMatch && Number(fractionMatch[2]) <= 8) {
    return `${fractionMatch[1]}/${fractionMatch[2]}`;
  }

  const numberMatch = cleanValue.match(/^(\d+(?:\.\d+)?)/);
  return numberMatch ? numberMatch[1] : "";
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

    updateBattleTimerReadout();
  }, 1000);
}

function updateBattleTimerReadout() {
  const readout = app.querySelector("[data-battle-timer-readout]");

  if (!readout) {
    return;
  }

  readout.textContent = formatBattleTimer(getBattleTimerElapsedMs());
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

