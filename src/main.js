import { columns, initialCombatants } from "./data/combatTrackerData.js";
import { getSortedReleaseNotes } from "./data/releaseNotes.js";
import {
  buildArcanumCompositeKey,
  buildBestiaryCompositeKey,
  buildItemCompositeKey,
  compareSpellCastingSpeed,
  formatSpellLevel,
  getBestiaryInitials,
  getBestiarySourceFullName,
  getSpellCastingSpeed,
  getItemRarityClass,
  getItemRarityRank,
  getItemSizeLabelFromWeight,
  getSourceFullName,
  inferItemSizeLabel,
  normalizeBestiaryEntry,
  normalizeItemEntry,
  normalizeSpellEntry,
  parseSpellLevel
} from "./data/compendiumEntries.js";
import {
  CONTENT_TRANSLATION_MODE_GLOSSARY,
  CONTENT_TRANSLATION_MODE_ORIGINAL,
  CONTENT_TRANSLATION_MODE_SIDECAR,
  attachCompendiumTranslationIdentityRows,
  detectCsvContentLanguage,
  getContentTranslationModeLabel,
  isCompendiumTranslationSidecarUsable,
  mergeCompendiumTranslationRows,
  translateCompendiumRows
} from "./data/contentTranslation.js";
import { loadVersionedCompendiumBundle } from "./data/compendiumBundles.js";
import { getLocalizedSystemTableDefinitions, getLocalizedSystemTableFolders, initialTableDefinitions, initialTableFolders } from "./data/tablesSeedData.js";
import { screens } from "./navigation/screens.js";
import { getCombatMiniActionIconUrl, getCombatSpellbookIconUrl, getCombatStatusIconUrl, getCombatToolbarActionIconUrl } from "./assets/combatIcons.js";
import { getCharacterClassIcon } from "./assets/characterClassIcons.js";
import { getScreenIconUrl } from "./assets/screenIcons.js";
import moonFullIconUrl from "./assets/moon-icons/luna_llena.png";
import moonWaxingQuarterIconUrl from "./assets/moon-icons/Cuarto_creciente.png";
import moonWaxingCrescentIconUrl from "./assets/moon-icons/Luna_creciente.png";
import moonNewIconUrl from "./assets/moon-icons/Luna_nueva.png";
import moonWaningCrescentIconUrl from "./assets/moon-icons/Luna_menguante.png";
import moonWaningQuarterIconUrl from "./assets/moon-icons/Cuarto_menguante.png";
import { syncCompendiumLayoutHeights } from "./shared/compendiumLayout.js";
import { parseCsv } from "./shared/csv.js";
import { createCompendiumDetailRenderers } from "./screens/compendiums/detailRender.js";
import { createCompendiumListRenderers } from "./screens/compendiums/listRender.js";
import { createCharacterStateController } from "./screens/characters/characterState.js";
import { createCombatTrackerStateController } from "./screens/combat-tracker/combatTrackerState.js";
import { createDiaryRenderers } from "./screens/diary/diaryRender.js";
import { createTablesController } from "./screens/tables/tableController.js";
import { createTableRenderers } from "./screens/tables/tableRender.js";
import {
  extractCrBaseLabel,
  formatCombatCrDisplay,
  formatCrNumber,
  formatModifier,
  formatStatsFromObject,
  formatStatsWithModifiers,
  getAbilityModifier,
  parseCrValue,
  parseHitPointDiceFormula,
  parseItemWeight,
  parseStats,
  rollHitPointDiceFormula
} from "./shared/dndRules.js";
import { isPlainObject, normalizeNumberInput, randomD20, toNumber } from "./shared/numberUtils.js";
import {
  cleanText,
  escapeHtml,
  escapeRegExp,
  normalizeSearchText,
  parseLeadingNumber,
  shortenLabel,
  slugify,
  splitList,
  uniqueSortedStrings
} from "./shared/text.js";
import { getVirtualStartIndex, getVirtualWindow } from "./shared/virtualList.js";
import {
  beginGoogleAuth,
  canUseCloudAccounts,
  cloneCloudCampaign,
  CloudApiError,
  createCloudCampaign,
  createCloudLibraryEntry,
  deleteCloudCampaign,
  deleteCloudLibraryEntry,
  fetchAuthSession,
  getCloudCampaign,
  getCloudLibraryEntry,
  listCloudCampaigns,
  listCloudLibraryEntries,
  listPublicCloudCampaigns,
  listPublicCloudLibraryEntries,
  setCloudCampaignVisibility,
  setCloudLibraryEntryVisibility,
  signOutAccount,
  updateCloudCampaign,
  updateCloudProfileImage,
  updateCloudProfileName,
  uploadCloudImage
} from "./cloud/cloudClient.js";
import appIconUrl from "../build-resources/icon.png";
import combatAreaXpIconUrl from "./assets/buttons-icons/XP.png";
import combatHitDiceIconUrl from "./assets/buttons-icons/Dados_golpe.png";
import combatShieldIconUrl from "./assets/buttons-icons/Shield.png";
import combatSoundUrl from "./assets/sound-effects/combate.mp3";
import longRestSoundUrl from "./assets/sound-effects/descanso.mp3";
import diceRollSoundUrl from "./assets/sound-effects/dice_roll.mp3";
import levelUpSoundUrl from "./assets/sound-effects/level_up.mp3";
import deathSoundUrl from "./assets/sound-effects/Death.mp3";
import {
  APP_LANGUAGE_EN,
  APP_LANGUAGE_ES,
  BESTIARY_IMAGES_PATH,
  BESTIARY_RENDER_DEBOUNCE_MS,
  BESTIARY_VIRTUAL_DEFAULT_VIEWPORT,
  BESTIARY_VIRTUAL_OVERSCAN,
  BESTIARY_VIRTUAL_ROW_HEIGHT,
  CAMPAIGN_AUTOSAVE_INTERVAL_MS,
  CAMPAIGN_FILE_SCHEMA,
  CAMPAIGN_FILE_VERSION,
  CAMPAIGN_META_STORAGE_KEY,
  CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY,
  CHARACTERS_STORAGE_KEY,
  COMBAT_TRACKER_SORT_DEFAULT_VERSION,
  COMBAT_TRACKER_STORAGE_KEY,
  CONTENT_LANGUAGE_EN,
  CONTENT_LANGUAGE_ES,
  DEFAULT_BESTIARY_CSV_RELATIVE_PATH,
  DEFAULT_ITEMS_CSV_RELATIVE_PATH,
  DEFAULT_SPELLS_CSV_RELATIVE_PATH,
  DESKTOP_ASSET_BASE_URL,
  DESKTOP_BUILD_SIGNATURE_STORAGE_KEY,
  DESKTOP_STORAGE_RESET_VERSION,
  DESKTOP_STORAGE_RESET_VERSION_KEY,
  DIARY_STORAGE_KEY,
  ENCOUNTER_INVENTORY_STORAGE_KEY,
  HAS_DESKTOP_EXTERNAL_ASSETS,
  IS_FILE_PROTOCOL_RUNTIME,
  ITEM_VIRTUAL_OVERSCAN,
  ITEM_VIRTUAL_ROW_HEIGHT,
  ITEMS_IMAGES_PATH,
  MANAGED_STORAGE_KEY_PREFIX,
  TABLES_STORAGE_KEY
} from "./config/appConstants.js";
import {
  UI_ATTRIBUTE_TRANSLATIONS_EN,
  UI_REGEX_TRANSLATIONS_EN,
  UI_STRINGS,
  UI_TEXT_TRANSLATIONS_EN,
  UI_TRANSLATION_EXCLUDED_SELECTOR
} from "./data/uiText.js";
import { ITEM_TYPE_GROUP_CHILDREN, ITEM_TYPE_GROUPS } from "./data/itemTypeGroups.js";
import {
  ENEMY_HP_MODE_FIXED,
  ENEMY_HP_MODE_VARIABLE,
  LEGACY_COMBAT_PLACEHOLDER_NAMES,
  TOPBAR_NAV_ROWS,
  challengeRatingExperienceByCr,
  characterAbilityKeys,
  characterCurrencyRows,
  characterLevelProgression,
  characterSkillColorPalette,
  characterSkillLevelProgression,
  characterStatBlocks,
  combatTagOptions,
  defaultCharacterSkillTemplates,
  experienceFormatter,
  itemSizeThresholds,
  statKeys
} from "./data/gameConstants.js";
import {
  HARPTOS_CALENDAR_PERIODS,
  HARPTOS_DEFAULT_YEAR,
  HARPTOS_PERIODS_BY_ID
} from "./data/harptosCalendar.js";

const UI_TEXT_TRANSLATIONS_EN_NORMALIZED = new Map(
  [...UI_TEXT_TRANSLATIONS_EN.entries()].map(([key, value]) => [normalizeTranslationKey(key), value])
);
const UI_ATTRIBUTE_TRANSLATIONS_EN_NORMALIZED = new Map(
  [...UI_ATTRIBUTE_TRANSLATIONS_EN.entries()].map(([key, value]) => [normalizeTranslationKey(key), value])
);
const HARPTOS_MONTH_PERIODS = HARPTOS_CALENDAR_PERIODS.filter((period) => period.kind === "month");
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

const blankFilters = Object.fromEntries(columns.map((column) => [column.key, []]));
const blankCombatFilterDrafts = Object.fromEntries(columns.map((column) => [column.key, ""]));
const blankInlineAdjustments = { pgAct: "", necrotic: "" };
const RELEASE_NOTES = getSortedReleaseNotes();
const APP_VERSION = RELEASE_NOTES[0]?.version || "v1.0";
const OPTIONS_MENU_SECTION_GENERAL = "general";
const OPTIONS_MENU_SECTION_LANGUAGES = "languages";
const OPTIONS_MENU_SECTION_SOUND = "sound";
const OPTIONS_MENU_SECTIONS = Object.freeze([
  OPTIONS_MENU_SECTION_GENERAL,
  OPTIONS_MENU_SECTION_LANGUAGES,
  OPTIONS_MENU_SECTION_SOUND
]);
const SOUND_EFFECT_KEYS = Object.freeze(["combat", "initiative", "longRest", "levelUp", "death"]);
const defaultSoundSettings = Object.freeze({
  enabled: true,
  combat: true,
  initiative: true,
  longRest: true,
  levelUp: true,
  death: true
});
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
const ITEM_TYPE_TOKEN_FILTER_PREFIX = "__item-type-token__:";

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
const excludedArcanumLevelFilterValues = new Set([
  "Genio (TCE) Brujo"
]);
const arcanumFilterLabels = {
  source: "fuentes",
  level: "niveles",
  school: "escuelas",
  class: "clases",
  castingTime: "velocidades"
};
let activeCharacterOverviewHeaderTooltipElement = null;
const defaultRepositoryCsvPaths = {
  bestiary: DEFAULT_BESTIARY_CSV_RELATIVE_PATH,
  items: DEFAULT_ITEMS_CSV_RELATIVE_PATH,
  arcanum: DEFAULT_SPELLS_CSV_RELATIVE_PATH
};
const BESTIARY_CUSTOM_IMAGE_MAP_STORAGE_KEY = `${MANAGED_STORAGE_KEY_PREFIX}:bestiary-custom-image-map`;
const ITEMS_CUSTOM_IMAGE_MAP_STORAGE_KEY = `${MANAGED_STORAGE_KEY_PREFIX}:items-custom-image-map`;
const ARCANUM_CUSTOM_MAP_STORAGE_KEY = `${MANAGED_STORAGE_KEY_PREFIX}:arcanum-custom-map`;
const CLOUD_CAMPAIGN_META_STORAGE_KEY = `${MANAGED_STORAGE_KEY_PREFIX}:cloud-campaign:v1`;
const REPOSITORY_CSV_UPLOAD_DB_NAME = "mimic-dice-repository-csv";
const REPOSITORY_CSV_UPLOAD_STORE_NAME = "uploads";
const defaultDataCsvFiles = Object.values(defaultRepositoryCsvPaths);
const blankRepositoryCsvUploads = Object.freeze({
  bestiary: null,
  items: null,
  arcanum: null
});
const blankContentSourceMeta = {
  detectedLanguage: CONTENT_LANGUAGE_EN,
  translationMode: CONTENT_TRANSLATION_MODE_ORIGINAL,
  sidecarPath: "",
  message: ""
};
const DATA_EXCHANGE_EXPORT_SCHEMA = "mimic-dice-selection-export";
const DATA_EXCHANGE_EXPORT_VERSION = 1;
const DATA_EXCHANGE_CATEGORY_CHARACTERS = "characters";
const DATA_EXCHANGE_CATEGORY_ENCOUNTERS = "encounters";
const DATA_EXCHANGE_CATEGORY_DIARY = "diary";
const COMPENDIUM_CREATION_FIELDS = Object.freeze({
  bestiary: [
    { key: "Name", label: "Nombre", required: true },
    { key: "Source", label: "Fuente" },
    { key: "Page", label: "Pagina" },
    { key: "Size", label: "Tamano" },
    { key: "Type", label: "Tipo" },
    { key: "Alignment", label: "Alineamiento" },
    { key: "AC", label: "CA" },
    { key: "HP", label: "PG" },
    { key: "Speed", label: "Velocidad" },
    { key: "Strength", label: "FUE", type: "number" },
    { key: "Dexterity", label: "DES", type: "number" },
    { key: "Constitution", label: "CON", type: "number" },
    { key: "Intelligence", label: "INT", type: "number" },
    { key: "Wisdom", label: "SAB", type: "number" },
    { key: "Charisma", label: "CAR", type: "number" },
    { key: "Saving Throws", label: "Salvaciones" },
    { key: "Skills", label: "Habilidades" },
    { key: "Damage Vulnerabilities", label: "Vulnerabilidades" },
    { key: "Damage Resistances", label: "Resistencias" },
    { key: "Damage Immunities", label: "Inmunidades de dano" },
    { key: "Condition Immunities", label: "Inmunidades de estado" },
    { key: "Senses", label: "Sentidos" },
    { key: "Languages", label: "Idiomas" },
    { key: "CR", label: "CR" },
    { key: "Environment", label: "Entorno" },
    { key: "Treasure", label: "Tesoro" },
    { key: "Traits", label: "Rasgos", type: "textarea" },
    { key: "Actions", label: "Acciones", type: "textarea" },
    { key: "Bonus Actions", label: "Acciones bonus", type: "textarea" },
    { key: "Reactions", label: "Reacciones", type: "textarea" },
    { key: "Legendary Actions", label: "Acciones legendarias", type: "textarea" },
    { key: "Mythic Actions", label: "Acciones miticas", type: "textarea" },
    { key: "Lair Actions", label: "Acciones de guarida", type: "textarea" },
    { key: "Regional Effects", label: "Efectos regionales", type: "textarea" }
  ],
  items: [
    { key: "Name", label: "Nombre", required: true },
    { key: "Source", label: "Fuente" },
    { key: "Page", label: "Pagina" },
    { key: "Rarity", label: "Rareza" },
    { key: "Type", label: "Tipo" },
    { key: "Attunement", label: "Sintonizacion" },
    { key: "Damage", label: "Dano" },
    { key: "Properties", label: "Propiedades" },
    { key: "Mastery", label: "Maestria" },
    { key: "Weight", label: "Peso" },
    { key: "Value", label: "Valor" },
    { key: "Text", label: "Descripcion", type: "textarea" }
  ],
  arcanum: [
    { key: "Name", label: "Nombre", required: true },
    { key: "Source", label: "Fuente" },
    { key: "Page", label: "Pagina" },
    { key: "Level", label: "Nivel" },
    { key: "Casting Time", label: "Tiempo de lanzamiento" },
    { key: "Duration", label: "Duracion" },
    { key: "School", label: "Escuela" },
    { key: "Range", label: "Alcance" },
    { key: "Components", label: "Componentes" },
    { key: "Classes", label: "Clases" },
    { key: "Optional/Variant Classes", label: "Clases opcionales" },
    { key: "Subclasses", label: "Subclases" },
    { key: "Text", label: "Descripcion", type: "textarea" },
    { key: "At Higher Levels", label: "A niveles superiores", type: "textarea" }
  ]
});
const COMPENDIUM_KIND_LABELS = Object.freeze({
  bestiary: "criatura",
  items: "objeto",
  arcanum: "hechizo"
});
const COMPENDIUM_REPOSITORY_LABELS = Object.freeze({
  bestiary: "Bestiario",
  items: "Items",
  arcanum: "Arcanum"
});

const app = document.querySelector("#app");
let state;
let battleTimerInterval = null;
let campaignAutosaveTimer = 0;
let campaignSaveInProgress = null;
let lastSavedCampaignSnapshot = "";
let initialDataLoadQueued = false;
let campaignDirtyStateSyncTimer = 0;
let lastDesktopCampaignDirtyValue = null;
let cloudCampaignAutosaveTimer = 0;
let cloudCampaignAutosaveInterval = 0;
let cloudImportUpdateCheckTimer = 0;
let cloudCatalogImportQueue = Promise.resolve();
let cloudCampaignSaveInProgress = null;
let cloudCampaignSaveSuspended = false;
let lastCloudCampaignSnapshot = "";
let cloudCampaignChangeRevision = 0;
let lastCloudCampaignSavedChangeRevision = 0;
let cloudCampaignVisibilityHandlerRegistered = false;
const cloudImageUploadCache = new Map();
const cloudCatalogBaseKeysPromiseByRepository = new Map();
const cloudCatalogBaseKeysByRepository = new Map();
const cloudCatalogSelectionGroups = new Map();
const cloudCatalogGroupCollections = new Map();
const combatLookupCache = {
  bestiaryEntries: null,
  characters: null,
  bestiaryByIdentity: new Map(),
  bestiaryByAlias: new Map(),
  charactersById: new Map(),
  charactersByName: new Map()
};
let activeTableColumnResize = null;
let activeCombatSpellbookPopoverSyncFrame = 0;
let activeCombatSpellPreviewSyncFrame = 0;
const notificationTimeouts = new Map();
let repositoryCsvUploadDatabasePromise = null;
const appStateProxy = new Proxy({}, {
  get: (_target, property) => state?.[property],
  set: (_target, property, value) => {
    if (state) {
      state[property] = value;
    }
    return true;
  }
});
const {
  loadCombatTrackerState,
  removeLegacyCombatTrackerPlaceholders,
  normalizeStoredCombatTrackerState,
  saveCombatTrackerState,
  getCombatTrackerSaveData,
  getDefaultCombatTrackerState,
  getDefaultCombatSort,
  normalizeStoredEnemyHpMode,
  normalizeStoredCombatant,
  normalizeStoredCombatFilters,
  normalizeStoredCombatSort,
  normalizeStoredInlineAdjustments,
  normalizeStoredNextCombatantId,
  normalizeStoredActiveTurnCombatantId,
  normalizeStoredCombatRound,
  normalizeStoredCombatSide,
  normalizeStoredCombatTag,
  normalizeStoredNumber,
  normalizeStoredStandLabel,
  normalizeStoredNonNegativeNumber
} = createCombatTrackerStateController({
  state: appStateProxy,
  COMBAT_TRACKER_STORAGE_KEY,
  usesDesktopFileOnlyPersistence,
  scheduleDesktopCampaignDirtyStateSync,
  createStableId,
  getBattleTimerElapsedMs,
  mapTagToSide,
  mapSideToTag
});
const {
  loadCharacterSkillDefinitions,
  saveCharacterSkillDefinitions,
  getCharacterSkillDefinitionsSaveData,
  loadCharacters,
  saveCharacters,
  getCharactersSaveData,
  resolveCharacterSkillDefinitions,
  normalizeStoredCharacters,
  normalizeStoredCharacter,
  createDefaultCharacterClassEntry,
  normalizeStoredCharacterClassEntries,
  normalizeStoredCharacterClassEntry,
  normalizeStoredCharacterClassLevel,
  ensureCharacterClassEntryCount,
  hasMeaningfulCharacterClassEntry,
  getCharacterVisibleClassEntries,
  getCharacterTotalLevelFromClassEntries,
  normalizeStoredCharacterLevel,
  normalizeStoredCharacterLevelExperiencePoints,
  normalizeLegacyCharacterLevelExperiencePoints,
  normalizeStoredCharacterAbilities,
  normalizeStoredCharacterSkillDefinitions,
  dedupeCharacterSkillDefinitions,
  getLegacyCharacterSkillDefinitionsFromCharacters,
  normalizeLegacyCharacterSkillTrack,
  normalizeStoredCharacterSkillDefinition,
  getCharacterSkillCanonicalConfig,
  createCharacterSkillDefinitionId,
  normalizeStoredCharacterSkillProgress,
  normalizeStoredCharacterSkillProgressEntry,
  normalizeStoredCharacterSkillLevel,
  normalizeStoredCharacterSkillExperiencePoints,
  normalizeStoredCharacterSkillGain,
  normalizeStoredCharacterSkillGains,
  normalizeStoredCharacterSpells,
  normalizeStoredCharacterSpellRow,
  normalizeCharacterSpellLevelLabel,
  getCharacterSpellLevelLabel,
  isCharacterSpellCantripLabel,
  formatCompactSpellLevelLabel,
  formatCharacterSignedFieldValue,
  createBlankCharacterSpellRow,
  normalizeStoredCharacterSpellbookAbilities,
  normalizeStoredCharacterSpellbookAbilityRow,
  normalizeStoredCharacterSpellbookAbilitySpent,
  createBlankCharacterSpellbookAbilityRow,
  getMeaningfulCharacterSpellbookAbilityRows,
  clearCharacterSpellbookAbilityUsesSpent,
  getDefaultCharacterSpellSlots,
  normalizeStoredCharacterSpellSlots,
  normalizeStoredCharacterSpellSlotRow,
  normalizeStoredCharacterSpellSlotSpent,
  normalizeStoredCharacterSpellSlotVisibleLevels,
  ensureCharacterSpellSlotLevels,
  clearCharacterSpellSlotsSpent,
  normalizeStoredCharacterInventory,
  normalizeStoredCharacterInventoryRow,
  createBlankCharacterInventoryRow,
  normalizeItemSizeLabel,
  normalizeStoredCharacterProficiencies,
  normalizeCharacterProficiencyKey
} = createCharacterStateController({
  state: appStateProxy,
  CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY,
  CHARACTERS_STORAGE_KEY,
  usesDesktopFileOnlyPersistence,
  scheduleDesktopCampaignDirtyStateSync,
  createStableId,
  getDefaultCharacterSkillDefinitions,
  normalizeStoredNonNegativeNumber,
  normalizeStoredNumber,
  normalizeStoredStandLabel,
  getCharacterLevelProgressionEntry,
  getCharacterLevelExperienceRequirement,
  getDefaultCharacterProficiencyBonus,
  getCharacterSkillMaxLevel,
  getCharacterSkillMaxExperiencePoints,
  normalizeStoredCharacterSkillColor,
  getDefaultCharacterSkillColorForIdentity,
  findCompendiumEntryByReference,
  getCurrentCompendiumEntries,
  getCompendiumEntryIdentityKey,
  isCharacterCurrencyRow,
  getCurrencyInventorySizeLabel
});
const {
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
} = createTablesController({
  state: appStateProxy,
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
});

resetDesktopLocalStorageIfNeeded();
const storedCampaignPreferences = loadCampaignMeta();
const initialCampaignMeta = {
  ...storedCampaignPreferences,
  name: "",
  fileName: "",
  filePath: "",
  savedAt: "",
  includeNpcInCombatExperience: false,
  repositoryCsvPaths: { ...defaultRepositoryCsvPaths }
};
const initialCharacterSkillDefinitions = getDefaultCharacterSkillDefinitions();
const initialCharacters = [];
const initialEncounterInventory = { folders: [], encounters: [], systemFolderExpanded: true };
const initialCombatTrackerState = getDefaultCombatTrackerState();
const initialTablesState = getDefaultTablesState();
const initialDiaryState = getDefaultDiaryState();
let scheduledRenderTimer = 0;
let scheduledRenderFocusState = null;
let lastRenderedScreen = "";
let scheduledRenderViewportRestore = 0;
const compendiumLoadPromises = {
  bestiary: null,
  items: null,
  arcanum: null
};
const compendiumLoadTokens = {
  bestiary: 0,
  items: 0,
  arcanum: 0
};
const queuedCompendiumLoads = new Set();
let compendiumLoadGeneration = 0;
let arcanumSpellLinkCache = {
  signature: "",
  pattern: null,
  namesByLower: new Map()
};

state = {
  activeScreen: "combat-tracker",
  campaignName: initialCampaignMeta.name,
  campaignFileName: initialCampaignMeta.fileName,
  campaignFilePath: initialCampaignMeta.filePath,
  campaignSavedAt: initialCampaignMeta.savedAt,
  appLanguage: normalizeStoredAppLanguage(initialCampaignMeta.language),
  contentLanguage: normalizeStoredContentLanguage(initialCampaignMeta.contentLanguage),
  includeNpcInCombatExperience: normalizeStoredNpcExperienceSetting(initialCampaignMeta.includeNpcInCombatExperience),
  soundSettings: normalizeStoredSoundSettings(initialCampaignMeta.soundSettings),
  repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(initialCampaignMeta.repositoryCsvPaths),
  repositoryCsvUploads: { ...blankRepositoryCsvUploads },
  customBestiaryImageMap: {},
  customItemImageMap: {},
  customArcanumMap: {},
  dataCsvFiles: [...defaultDataCsvFiles],
  contentSourceMeta: {
    bestiary: { ...blankContentSourceMeta },
    items: { ...blankContentSourceMeta },
    arcanum: { ...blankContentSourceMeta }
  },
  campaignMessage: "",
  accountSession: null,
  accountStatus: canUseCloudAccounts() ? "loading" : "unavailable",
  accountDialogOpen: false,
  accountDialogView: "account",
  accountRegistrationCode: "",
  accountRegistrationPromptOpen: false,
  accountCampaignName: cleanText(initialCampaignMeta.name) || "Campaña sin nombre",
  accountProfileNameDraft: "",
  accountProfileNameEditing: false,
  accountError: "",
  cloudCampaigns: [],
  publicCloudCampaigns: [],
  cloudLibraryEntries: [],
  publicCloudLibraryEntries: [],
  cloudLibraryBusy: false,
  cloudCatalogTab: "campaign",
  cloudCatalogQuery: "",
  cloudCatalogOwner: "",
  cloudCatalogCampaign: "",
  cloudCatalogSort: "updated-desc",
  cloudCatalogGroupBy: "owner-campaign",
  cloudCatalogSelectedIds: new Set(),
  cloudCatalogCollapsedGroups: new Set(),
  cloudLocalCatalogItems: [],
  cloudCatalogPreview: null,
  cloudCatalogPreviewBusy: false,
  cloudOperationKind: "",
  cloudOperationTarget: "",
  cloudCampaignId: "",
  cloudCampaignRevision: 0,
  cloudCampaignIsPublic: false,
  cloudCampaignUpdatedAt: "",
  cloudImportedEntries: [],
  cloudImportUpdateCandidates: [],
  cloudImportUpdateDialogOpen: false,
  cloudImportUpdateSelectedIds: new Set(),
  cloudAutosaveStatus: "idle",
  cloudAutosaveMessage: "",
  campaignLoadedFromPublic: false,
  notifications: [],
  menuHubOpen: false,
  fileMenuOpen: false,
  optionsMenuOpen: false,
  optionsMenuSection: OPTIONS_MENU_SECTION_GENERAL,
  activeReleaseNotesVersion: APP_VERSION,
  importExportDialogOpen: false,
  importExportDialogCategory: "",
  importExportDialogMode: "",
  importExportDialogError: "",
  importExportCharacterIds: new Set(),
  importExportEncounterIds: new Set(),
  importExportEncounterFolderIds: new Set(),
  importExportDiaryNoteIds: new Set(),
  importExportDiaryFolderIds: new Set(),
  campaignSaveNameDialogOpen: false,
  campaignSaveNameDialogMode: "",
  campaignSaveNameDialogValue: "",
  campaignSaveNameDialogError: "",
  compendiumCreateDialogOpen: false,
  compendiumCreateKind: "",
  compendiumCreateMode: "create",
  compendiumEditRowKey: "",
  compendiumCreateDraft: {},
  compendiumCreateError: "",
  characterSpellbookAbilityDescriptionDialogOpen: false,
  characterSpellbookAbilityDescriptionDialogRowId: "",
  characterSpellbookAbilityDescriptionDialogValue: "",
  characterSkillConfigOpen: false,
  characterSkillsExpanded: false,
  charactersOverviewHidden: false,
  characterSkillDefinitions: initialCharacterSkillDefinitions,
  characters: initialCharacters,
  activeCharacterId: initialCharacters[0]?.id ?? "",
  characterXpAwardDrafts: {},
  selectedCharacterIds: new Set(initialCharacters[0]?.id ? [initialCharacters[0].id] : []),
  combatants: initialCombatTrackerState.combatants,
  filters: initialCombatTrackerState.filters,
  sort: initialCombatTrackerState.sort,
  combatSearchQuery: initialCombatTrackerState.combatSearchQuery,
  activeFilterKey: "",
  combatFilterDrafts: { ...blankCombatFilterDrafts },
  selectedIds: new Set(),
  newEntitySide: initialCombatTrackerState.newEntitySide,
  nextId: initialCombatTrackerState.nextId,
  inlineAdjustments: initialCombatTrackerState.inlineAdjustments,
  areaDamage: initialCombatTrackerState.areaDamage,
  combatAreaTargetPicker: getDefaultCombatAreaTargetPickerState(),
  isCombatActive: initialCombatTrackerState.isCombatActive,
  activeTurnCombatantId: initialCombatTrackerState.activeTurnCombatantId,
  combatRound: initialCombatTrackerState.combatRound,
  enemyHpMode: initialCombatTrackerState.enemyHpMode,
  battleTimer: {
    elapsedMs: 0,
    startedAt: 0,
    isRunning: false
  },
  combatTimerPanelOpen: false,
  combatMaxHpRestoreMenu: {
    combatantId: "",
    x: 0,
    y: 0
  },
  bestiary: [],
  bestiaryImageMap: {},
  bestiaryFilters: { ...blankBestiaryFilters },
  bestiarySort: { key: "name", direction: "asc" },
  activeBestiaryFilterKey: "",
  bestiaryFilterSearch: { ...blankBestiaryFilterSearch },
  showBestiaryQuerySuggestions: false,
  bestiarySelectedId: "",
  bestiaryStatus: "idle",
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
  activeCharacterSpellRowId: "",
  showCharacterSpellSuggestions: false,
  activeCombatSpellbookCombatantId: "",
  activeCombatPreviewKind: "",
  activeCombatPreviewKey: "",
  activeCombatPreviewName: "",
  activeCombatPreviewDescription: "",
  multiclassLevelUpQueue: [],
  itemStatus: "idle",
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
  arcanumStatus: "idle",
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
  tableFolders: initialTablesState.folders,
  systemTableFolderExpanded: initialTablesState.systemFolderExpanded,
  tables: initialTablesState.tables,
  activeTableId: initialTablesState.activeTableId,
  activeTableFolderId: initialTablesState.activeTableFolderId,
  openTableIds: initialTablesState.openTableIds,
  diaryFolders: initialDiaryState.folders,
  systemDiaryFolderExpanded: initialDiaryState.systemFolderExpanded,
  diaryNotes: initialDiaryState.notes,
  diaryTagColors: initialDiaryState.tagColors,
  activeDiaryFolderId: initialDiaryState.activeDiaryFolderId,
  activeDiaryNoteId: initialDiaryState.activeNoteId,
  diarySearchQuery: "",
  showDiarySearchSuggestions: false,
  diaryCalendarSectionCollapsed: {
    real: false,
    harptos: false
  },
  diaryHarptosDayNotes: initialDiaryState.harptosDayNotes,
  diaryHarptosOverviewOpen: false,
  diaryHarptosOverviewYear: getInitialDiaryHarptosOverviewYear(initialDiaryState),
  diaryHarptosOverviewPeriodId: getInitialDiaryHarptosOverviewPeriodId(initialDiaryState),
  diaryHarptosDayNoteDialogOpen: false,
  diaryHarptosDayNoteDialogYear: HARPTOS_DEFAULT_YEAR,
  diaryHarptosDayNoteDialogPeriodId: HARPTOS_MONTH_PERIODS[0]?.id ?? "hammer",
  diaryHarptosDayNoteDialogDay: 1,
  diaryHarptosDayNoteDialogValue: "",
  diaryHarptosDayNoteDialogColor: "#d88d5a",
  rollingTableId: "",
  rollingTableRowId: "",
  rolledTableId: "",
  rolledTableRowId: "",
  activeCombatNameSearchId: "",
  activeCombatSourceId: "",
  activeCombatStatusMenuId: "",
  combatStatusDrafts: {},
  combatTurnQuickMenu: {
    combatantId: "",
    x: 0,
    y: 0,
    value: ""
  },
  combatTurnRoundEditorOpen: false,
  combatTurnRoundDraft: "",
  combatTurnJumpMenuOpen: false
};

let activeDiaryMentionContext = null;
let activeDiaryTagColorPicker = null;

const localizedSystemTablesEs = getLocalizedSystemTableDefinitions(CONTENT_LANGUAGE_ES);
const localizedSystemTablesEn = getLocalizedSystemTableDefinitions(CONTENT_LANGUAGE_EN);
const localizedStatusTableEs = localizedSystemTablesEs.find((table) => cleanText(table.name).toLowerCase().includes("estado")) ?? localizedSystemTablesEs[0];
const localizedStatusTableEn = localizedSystemTablesEn.find((table) => cleanText(table.name).toLowerCase().includes("condition")) ?? localizedSystemTablesEn[0];
const combatStatusEsToEnMap = new Map(
  localizedStatusTableEs.rows.map((row, index) => [normalizeTranslationKey(cleanText(row[0]).toLowerCase()), cleanText(localizedStatusTableEn.rows[index]?.[0] || row[0])])
);
const combatStatusEnToEsMap = new Map(
  localizedStatusTableEn.rows.map((row, index) => [normalizeTranslationKey(cleanText(row[0]).toLowerCase()), cleanText(localizedStatusTableEs.rows[index]?.[0] || row[0])])
);
const DIARY_HARPTOS_DAY_NOTE_EMOJIS = Object.freeze([
  "🌧️", "⛈️", "❄️", "☀️", "🌤️", "🌙", "⭐", "🔥",
  "🌿", "🍂", "🌸", "🌲", "🍄", "🪨", "🏕️", "🏰",
  "⚔️", "🛡️", "🏹", "🧭", "🗺️", "🔮", "📜", "🕯️",
  "📚", "💎", "🪙", "🍺", "🍞", "🍎", "🐉", "🐺",
  "🦉", "🐴", "🕷️", "🐍", "👑", "🎭", "🎲", "🔔",
  "❤️", "💀", "☠️", "✨", "💥", "🚪", "🔒", "🧪"
]);
const HARPTOS_MOON_PHASE_ICON_URLS = Object.freeze({
  full: moonFullIconUrl,
  "waxing-quarter": moonWaxingQuarterIconUrl,
  "waxing-crescent": moonWaxingCrescentIconUrl,
  new: moonNewIconUrl,
  "waning-crescent": moonWaningCrescentIconUrl,
  "waning-quarter": moonWaningQuarterIconUrl
});
const HARPTOS_MOON_PHASE_RULES = Object.freeze({
  hammer: [
    { start: 1, end: 8, phase: "full" },
    { start: 9, end: 11, phase: "waxing-quarter" },
    { start: 12, end: 15, phase: "waxing-crescent" },
    { start: 16, end: 18, phase: "new" },
    { start: 19, end: 22, phase: "waning-crescent" },
    { start: 23, end: 29, phase: "waning-quarter" },
    { start: 30, end: 30, phase: "full" }
  ],
  alturiak: [
    { start: 1, end: 6, phase: "full" },
    { start: 7, end: 9, phase: "waxing-quarter" },
    { start: 10, end: 13, phase: "waxing-crescent" },
    { start: 14, end: 16, phase: "new" },
    { start: 17, end: 20, phase: "waning-crescent" },
    { start: 21, end: 27, phase: "waning-quarter" },
    { start: 28, end: 30, phase: "full" }
  ],
  ches: [
    { start: 1, end: 5, phase: "full" },
    { start: 6, end: 8, phase: "waxing-quarter" },
    { start: 9, end: 12, phase: "waxing-crescent" },
    { start: 13, end: 15, phase: "new" },
    { start: 16, end: 19, phase: "waning-crescent" },
    { start: 20, end: 26, phase: "waning-quarter" },
    { start: 27, end: 30, phase: "full" }
  ],
  tarsakh: [
    { start: 1, end: 4, phase: "full" },
    { start: 5, end: 7, phase: "waxing-quarter" },
    { start: 8, end: 11, phase: "waxing-crescent" },
    { start: 12, end: 14, phase: "new" },
    { start: 15, end: 18, phase: "waning-crescent" },
    { start: 19, end: 25, phase: "waning-quarter" },
    { start: 26, end: 30, phase: "full" }
  ],
  mirtul: [
    { start: 1, end: 2, phase: "full" },
    { start: 3, end: 5, phase: "waxing-quarter" },
    { start: 6, end: 9, phase: "waxing-crescent" },
    { start: 10, end: 12, phase: "new" },
    { start: 13, end: 16, phase: "waning-crescent" },
    { start: 17, end: 23, phase: "waning-quarter" },
    { start: 24, end: 30, phase: "full" }
  ],
  kythorn: [
    { start: 1, end: 1, phase: "full" },
    { start: 2, end: 4, phase: "waxing-quarter" },
    { start: 5, end: 8, phase: "waxing-crescent" },
    { start: 9, end: 11, phase: "new" },
    { start: 12, end: 15, phase: "waning-crescent" },
    { start: 16, end: 22, phase: "waning-quarter" },
    { start: 23, end: 30, phase: "full" }
  ],
  flamerule: [
    { start: 1, end: 4, phase: "full" },
    { start: 5, end: 7, phase: "waxing-quarter" },
    { start: 8, end: 11, phase: "waxing-crescent" },
    { start: 12, end: 14, phase: "new" },
    { start: 15, end: 18, phase: "waning-crescent" },
    { start: 19, end: 25, phase: "waning-quarter" },
    { start: 26, end: 30, phase: "full" }
  ],
  eleasis: [
    { start: 1, end: 1, phase: "full" },
    { start: 2, end: 4, phase: "waxing-quarter" },
    { start: 5, end: 8, phase: "waxing-crescent" },
    { start: 9, end: 11, phase: "new" },
    { start: 12, end: 15, phase: "waning-crescent" },
    { start: 16, end: 22, phase: "waning-quarter" },
    { start: 23, end: 30, phase: "full" }
  ],
  eleint: [
    { start: 1, end: 3, phase: "waxing-quarter" },
    { start: 4, end: 7, phase: "waxing-crescent" },
    { start: 8, end: 10, phase: "new" },
    { start: 11, end: 14, phase: "waning-crescent" },
    { start: 15, end: 21, phase: "waning-quarter" },
    { start: 22, end: 29, phase: "full" },
    { start: 30, end: 30, phase: "waxing-quarter" }
  ],
  marpenoth: [
    { start: 1, end: 1, phase: "waxing-quarter" },
    { start: 2, end: 5, phase: "waxing-crescent" },
    { start: 6, end: 8, phase: "new" },
    { start: 9, end: 12, phase: "waning-crescent" },
    { start: 13, end: 19, phase: "waning-quarter" },
    { start: 20, end: 27, phase: "full" },
    { start: 28, end: 30, phase: "waxing-quarter" }
  ],
  uktar: [
    { start: 1, end: 4, phase: "waxing-crescent" },
    { start: 5, end: 7, phase: "new" },
    { start: 8, end: 11, phase: "waning-crescent" },
    { start: 12, end: 18, phase: "waning-quarter" },
    { start: 19, end: 26, phase: "full" },
    { start: 27, end: 30, phase: "waxing-quarter" }
  ],
  nightal: [
    { start: 1, end: 3, phase: "waxing-crescent" },
    { start: 4, end: 6, phase: "new" },
    { start: 7, end: 10, phase: "waning-crescent" },
    { start: 11, end: 17, phase: "waning-quarter" },
    { start: 18, end: 25, phase: "full" },
    { start: 26, end: 30, phase: "waxing-quarter" }
  ]
});
synchronizeLanguageSpecificSystemData({ syncCombatants: true });

const {
  renderArcanumDetail,
  renderArcanumDetailEmpty,
  renderBestiaryAbility,
  renderBestiaryDetail,
  renderBestiaryDetailEmpty,
  renderBestiaryMetric,
  renderBestiarySection,
  renderDetailChip,
  renderItemDetail,
  renderItemDetailEmpty
} = createCompendiumDetailRenderers({
  t,
  getArcanumSpellLinkData,
  getItemAttunementLabel,
  getItemSourceDescription,
  isItemTypeTokenFilterActive
});
const {
  renderArcanumList,
  renderBestiaryList,
  renderBestiaryRow,
  renderItemList
} = createCompendiumListRenderers({
  t,
  translateUiString,
  getArcanumVirtualWindow,
  getBestiaryVirtualWindow,
  getCachedBestiaryRowHtml,
  getItemAttunementLabel,
  getItemMostSpecificTypeLabel,
  getItemRarityClass,
  getItemVirtualWindow
});

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);
app.addEventListener("keydown", handleKeydown);
app.addEventListener("paste", handlePaste);
app.addEventListener("mouseover", handleMouseOver);
app.addEventListener("mouseout", handleMouseOut);
app.addEventListener("focusin", handleFocusIn);
app.addEventListener("focusout", handleFocusOut);
app.addEventListener("pointerdown", handlePointerDown);
app.addEventListener("contextmenu", handleContextMenu);
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("pointermove", handlePointerMove);
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("resize", handleWindowResize);
app.addEventListener("scroll", handleScroll, true);
app.addEventListener("dragstart", handleDragStart);
app.addEventListener("dragover", handleDragOver);
app.addEventListener("drop", handleDrop);
app.addEventListener("dragend", handleDragEnd);
app.addEventListener("error", handleAppImageError, true);

startCampaignAutosave();
registerCampaignCloseAutosave();
render();
queueInitialDataLoad();
initializeCloudAccount();

function handleAppImageError(event) {
  const image = event.target?.closest?.("[data-cloud-catalog-image]");

  if (!image) {
    return;
  }

  image.closest(".cloud-catalog-card__media")?.classList.add("is-broken");
}

async function handleClick(event) {
  const screenButton = event.target.closest("[data-screen]");

  if (screenButton) {
    if (state.activeScreen === "tables" && screenButton.dataset.screen !== "tables") {
      stopActiveTableRoll();
      state.rolledTableId = "";
      state.rolledTableRowId = "";
    }

    state.activeScreen = screenButton.dataset.screen;
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
    state.combatEncounterPickerOpen = false;
    state.combatAddPickerMode = "";
    queueCompendiumLoadsForScreen(state.activeScreen);
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  const clickedBestiaryFilter = event.target.closest("[data-bestiary-filter-menu]");
  const clickedBestiaryQuery = event.target.closest("[data-bestiary-query-menu]");
  const clickedItemFilter = event.target.closest("[data-item-filter-menu]");
  const clickedItemQuery = event.target.closest("[data-item-query-menu]");
  const clickedCharacterInventoryMenu = event.target.closest("[data-character-inventory-menu]");
  const clickedCharacterSpellMenu = event.target.closest("[data-character-spell-menu]");
  const clickedArcanumFilter = event.target.closest("[data-arcanum-filter-menu]");
  const clickedArcanumQuery = event.target.closest("[data-arcanum-query-menu]");
  const clickedEncounterSearch = event.target.closest("[data-encounter-search-menu]");
  const clickedDiarySearch = event.target.closest("[data-diary-search-menu]");
  const clickedDiaryMentionRoot = event.target.closest("[data-diary-mention-root]");
  const clickedCombatTurnRoundMenu = event.target.closest("[data-combat-turn-round-menu]");
  const clickedCombatTurnJumpMenu = event.target.closest("[data-combat-turn-jump-menu]");
  const clickedCombatAreaTargetMenu = event.target.closest("[data-combat-area-target-menu]");
  const clickedEncounterSource = event.target.closest("[data-encounter-source-menu]");
  const clickedCombatEncounterMenu = event.target.closest("[data-combat-encounter-menu]");
  const clickedCombatNameSearch = event.target.closest("[data-combat-name-search-menu]");
  const clickedCombatSourceMenu = event.target.closest("[data-combat-source-menu]");
  const clickedCombatStatusMenu = event.target.closest("[data-combat-status-menu]");
  const clickedCombatFilterMenu = event.target.closest("[data-combat-filter-menu]");
  const clickedCombatSpellbookMenu = event.target.closest("[data-combat-spellbook-menu]");
  const clickedCombatInlineMenu = event.target.closest(".combat-inline-menu");
  const clickedFileMenu = event.target.closest("[data-file-menu]");
  const clickedOptionsMenu = event.target.closest("[data-options-menu]");
  const clickedCharacterSkillConfig = event.target.closest("[data-character-skill-config-menu]");
  const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;
  const clickedDiaryTag = event.target.closest("[data-diary-tag-filter]");
  const clickedDiaryMentionLink = event.target.closest("[data-diary-mention-link]");

  if (clickedDiaryTag) {
    event.preventDefault();
    state.diarySearchQuery = cleanText(clickedDiaryTag.dataset.diaryTagFilter);
    state.showDiarySearchSuggestions = false;
    render({
      focusSelector: "[data-diary-search]"
    });
    return;
  }

  if (clickedDiaryMentionLink) {
    const diaryEditor = clickedDiaryMentionLink.closest("[data-diary-editor]");

    if (diaryEditor && !ctrlOrMetaPressed) {
      return;
    }

    event.preventDefault();
    openDiaryMentionTarget(
      clickedDiaryMentionLink.dataset.diaryMentionKind,
      clickedDiaryMentionLink.dataset.diaryMentionId,
      clickedDiaryMentionLink.dataset.diaryMentionName
    );
    return;
  }

  if (ctrlOrMetaPressed) {
    const clickedInventoryName = event.target.closest("[data-character-inventory-name]");

    if (clickedInventoryName) {
      const activeCharacter = getActiveCharacter();
      const row = activeCharacter?.inventory.find((entry) => entry.id === clickedInventoryName.dataset.characterInventoryName);
      const matchedItem = row ? getCharacterInventoryMatchedItemEntry(row) : null;

      if (matchedItem) {
        event.preventDefault();
        resetItemVirtualScroll();
        state.activeScreen = "items";
        state.itemFilters = {
          ...blankItemFilters,
          query: matchedItem.name
        };
        state.itemFilterSearch = { ...blankItemFilterSearch };
        state.activeItemFilterKey = "";
        state.showItemQuerySuggestions = false;
        render({
          focusSelector: "[data-item-query]"
        });
        return;
      }
    }

    const clickedSpellName = event.target.closest("[data-character-spell-name]");

    if (clickedSpellName) {
      const activeCharacter = getActiveCharacter();
      const row = activeCharacter?.spells.find((entry) => entry.id === clickedSpellName.dataset.characterSpellName);
      const matchedSpell = row ? getCharacterSpellMatchedEntry(row) : null;

      if (matchedSpell) {
        event.preventDefault();
        resetArcanumVirtualScroll();
        state.activeScreen = "arcanum";
        state.arcanumFilters = {
          ...blankArcanumFilters,
          query: matchedSpell.name
        };
        state.arcanumFilterSearch = { ...blankArcanumFilterSearch };
        state.activeArcanumFilterKey = "";
        state.showArcanumQuerySuggestions = false;
        render({
          focusSelector: "[data-arcanum-query]"
        });
        return;
      }
    }
  }

  if (!clickedCombatInlineMenu) {
    closeOpenCombatInlineMenus();
  }

  if (
    state.menuHubOpen &&
    !clickedFileMenu &&
    actionButton?.dataset.action !== "toggle-file-menu"
  ) {
    state.menuHubOpen = false;

    if (!actionButton) {
      render();
      return;
    }
  }

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
    state.optionsMenuOpen &&
    !clickedOptionsMenu &&
    actionButton?.dataset.action !== "toggle-options-menu"
  ) {
    state.optionsMenuOpen = false;

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

  if (state.showCharacterSpellSuggestions && !clickedCharacterSpellMenu) {
    state.showCharacterSpellSuggestions = false;
    state.activeCharacterSpellRowId = "";

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

  if (state.showDiarySearchSuggestions && !clickedDiarySearch) {
    state.showDiarySearchSuggestions = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (activeDiaryMentionContext && !clickedDiaryMentionRoot) {
    hideDiaryMentionSuggestions();
  }

  if (state.combatTurnRoundEditorOpen && !clickedCombatTurnRoundMenu) {
    state.combatTurnRoundEditorOpen = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.combatTurnJumpMenuOpen && !clickedCombatTurnJumpMenu) {
    state.combatTurnJumpMenuOpen = false;

    if (!actionButton) {
      render();
      return;
    }
  }

  if (state.combatAreaTargetPicker.mode && !clickedCombatAreaTargetMenu) {
    closeCombatAreaTargetPicker();

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

  if (
    state.activeCombatStatusMenuId &&
    !clickedCombatStatusMenu &&
    actionButton?.dataset.action !== "toggle-combat-status-menu"
  ) {
    state.activeCombatStatusMenuId = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeFilterKey &&
    !clickedCombatFilterMenu &&
    actionButton?.dataset.action !== "toggle-filter"
  ) {
    state.activeFilterKey = "";

    if (!actionButton) {
      render();
      return;
    }
  }

  if (
    state.activeCombatSpellbookCombatantId &&
    !clickedCombatSpellbookMenu &&
    actionButton?.dataset.action !== "toggle-combat-spellbook-popup"
  ) {
    state.activeCombatSpellbookCombatantId = "";
    clearActiveCombatPreview();

    if (!actionButton) {
      render();
      return;
    }
  }

  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  if (action === "toggle-account-dialog") {
    if (state.accountDialogOpen) {
      state.accountDialogOpen = false;
      render();
      return;
    }

    await openAccountDialog();
    return;
  }

  if (action === "dismiss-account-dialog") {
    state.accountDialogOpen = false;
    state.accountRegistrationPromptOpen = false;
    state.accountError = "";
    render();
    return;
  }

  if (action === "set-account-dialog-view") {
    state.accountDialogView = cleanText(actionButton.dataset.accountDialogView) || "account";
    state.accountError = "";
    render();

    if (state.accountDialogView === "public") {
      await refreshPublicCloudCampaigns();
    } else if (state.accountDialogView === "library") {
      await refreshCloudLibrary();
    } else if (state.accountDialogView === "catalog") {
      await refreshCommunityCatalog();
    }
    return;
  }

  if (action === "open-account-dialog-view") {
    const nextView = cleanText(actionButton.dataset.accountDialogView) === "catalog" ? "catalog" : "account";
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
    await openAccountDialog();

    if (nextView === "catalog") {
      state.accountDialogView = "catalog";
      render();
      await refreshCommunityCatalog();
    }
    return;
  }

  if (action === "set-cloud-catalog-tab") {
    const nextTab = cleanText(actionButton.dataset.cloudCatalogTab).toLowerCase();

    if (CLOUD_CATALOG_TABS.some((tab) => tab.id === nextTab)) {
      state.cloudCatalogTab = nextTab;
      state.cloudCatalogOwner = "";
      state.cloudCatalogCampaign = "";
      state.cloudCatalogPreview = null;
      render();
    }
    return;
  }

  if (action === "refresh-community-catalog") {
    await refreshCommunityCatalog();
    return;
  }

  if (action === "toggle-cloud-catalog-group") {
    const groupKey = cleanText(actionButton.dataset.cloudCatalogGroupKey);
    const collapsed = new Set(state.cloudCatalogCollapsedGroups);

    if (collapsed.has(groupKey)) {
      collapsed.delete(groupKey);
    } else {
      collapsed.add(groupKey);
    }

    state.cloudCatalogCollapsedGroups = collapsed;
    render();
    return;
  }

  if (action === "toggle-all-cloud-catalog-groups") {
    const collectionKey = cleanText(actionButton.dataset.cloudCatalogGroupCollection);
    const groupKeys = cloudCatalogGroupCollections.get(collectionKey) || [];
    const collapsed = new Set(state.cloudCatalogCollapsedGroups);
    const allExpanded = groupKeys.length > 0 && groupKeys.every((key) => !collapsed.has(key));

    groupKeys.forEach((key) => {
      if (allExpanded) {
        collapsed.add(key);
      } else {
        collapsed.delete(key);
      }
    });

    state.cloudCatalogCollapsedGroups = collapsed;
    render();
    return;
  }

  if (action === "toggle-cloud-catalog-group-selection") {
    const groupKey = cleanText(actionButton.dataset.cloudCatalogSelectionGroup);
    const selectionKeys = cloudCatalogSelectionGroups.get(groupKey) || [];
    const nextSelection = new Set(state.cloudCatalogSelectedIds);
    const allSelected = selectionKeys.length > 0 && selectionKeys.every(isCloudCatalogSelectionKeySelected);
    const newlySelected = [];
    const newlyDeselected = [];

    selectionKeys.forEach((key) => {
      if (allSelected) {
        nextSelection.delete(key);
        newlyDeselected.push(key);
      } else {
        if (!isCloudCatalogSelectionKeySelected(key)) {
          nextSelection.add(key);
          newlySelected.push(key);
        }
      }
    });

    state.cloudCatalogSelectedIds = nextSelection;
    render();
    if (newlySelected.length > 0) {
      await importCloudCatalogSelectionKeys(newlySelected);
    } else if (newlyDeselected.length > 0) {
      await removeCloudCatalogSelectionKeys(newlyDeselected);
    }
    return;
  }

  if (action === "preview-cloud-catalog-item") {
    await previewCloudCatalogItem(
      actionButton.dataset.cloudCatalogKind,
      actionButton.dataset.cloudCatalogId
    );
    return;
  }

  if (action === "dismiss-cloud-catalog-preview") {
    state.cloudCatalogPreview = null;
    state.cloudCatalogPreviewBusy = false;
    render();
    return;
  }

  if (action === "refresh-cloud-import-entry") {
    await refreshCloudImportedEntryCopies(actionButton.dataset.cloudEntryId);
    return;
  }

  if (action === "publish-local-cloud-catalog-item") {
    await publishLocalCloudCatalogItem(actionButton.dataset.cloudCatalogId);
    return;
  }

  if (action === "account-login-google") {
    await startGoogleAccountFlow(false);
    return;
  }

  if (action === "account-register-google") {
    if (!state.accountRegistrationPromptOpen) {
      state.accountRegistrationPromptOpen = true;
      state.accountError = "";
      render({ focusSelector: "[data-account-registration-code]" });
      return;
    }
    await startGoogleAccountFlow(true);
    return;
  }

  if (action === "cancel-account-registration") {
    state.accountRegistrationPromptOpen = false;
    state.accountRegistrationCode = "";
    state.accountError = "";
    render();
    return;
  }

  if (action === "dismiss-cloud-import-update-dialog") {
    state.cloudImportUpdateDialogOpen = false;
    render();
    return;
  }

  if (action === "toggle-all-cloud-import-updates") {
    const candidateIds = state.cloudImportUpdateCandidates.map((candidate) => candidate.record.id);
    const allSelected = candidateIds.length > 0
      && candidateIds.every((id) => state.cloudImportUpdateSelectedIds.has(id));
    state.cloudImportUpdateSelectedIds = allSelected ? new Set() : new Set(candidateIds);
    render();
    return;
  }

  if (action === "refresh-selected-cloud-import-updates") {
    await refreshCloudImportedRecords([...state.cloudImportUpdateSelectedIds]);
    return;
  }

  if (action === "account-sign-out") {
    await handleAccountSignOut();
    return;
  }

  if (action === "edit-account-profile-name") {
    state.accountProfileNameDraft = cleanText(state.accountSession?.user?.name);
    state.accountProfileNameEditing = true;
    state.accountError = "";
    render({ focusSelector: "[data-account-profile-name]" });
    return;
  }

  if (action === "cancel-account-profile-name") {
    state.accountProfileNameDraft = cleanText(state.accountSession?.user?.name);
    state.accountProfileNameEditing = false;
    state.accountError = "";
    render();
    return;
  }

  if (action === "save-account-profile-name") {
    await saveAccountProfileName();
    return;
  }

  if (action === "refresh-cloud-campaigns") {
    await refreshCloudCampaigns();
    return;
  }

  if (action === "create-cloud-campaign") {
    await saveCurrentCampaignToCloud();
    return;
  }

  if (action === "load-cloud-campaign") {
    await loadCloudCampaignById(actionButton.dataset.cloudCampaignId);
    return;
  }

  if (action === "toggle-cloud-campaign-public") {
    await toggleCloudCampaignPublic(actionButton.dataset.cloudCampaignId);
    return;
  }

  if (action === "delete-cloud-campaign") {
    await removeCloudCampaign(actionButton.dataset.cloudCampaignId);
    return;
  }

  if (action === "clone-cloud-campaign") {
    await clonePublicCampaign(actionButton.dataset.cloudCampaignId);
    return;
  }

  if (action === "load-public-campaign-local") {
    await loadPublicCampaignLocally(actionButton.dataset.cloudCampaignId);
    return;
  }

  if (action === "publish-current-cloud-entry") {
    await publishCurrentCloudLibraryEntry(actionButton.dataset.cloudEntryType);
    return;
  }

  if (action === "import-cloud-library-entry") {
    await importCloudLibraryEntry(actionButton.dataset.cloudEntryId);
    return;
  }

  if (action === "toggle-cloud-library-public") {
    await toggleCloudLibraryEntryPublic(actionButton.dataset.cloudEntryId);
    return;
  }

  if (action === "delete-cloud-library-entry") {
    await removeCloudLibraryEntry(actionButton.dataset.cloudEntryId);
    return;
  }

  if (action === "open-character-import-export") {
    openImportExportDialog(DATA_EXCHANGE_CATEGORY_CHARACTERS);
    render();
    return;
  }

  if (action === "open-encounter-import-export") {
    openImportExportDialog(DATA_EXCHANGE_CATEGORY_ENCOUNTERS);
    render();
    return;
  }

  if (action === "open-diary-import-export") {
    openImportExportDialog(DATA_EXCHANGE_CATEGORY_DIARY);
    render();
    return;
  }

  if (action === "dismiss-import-export-dialog") {
    closeImportExportDialog();
    render();
    return;
  }

  if (action === "set-import-export-mode") {
    setImportExportDialogMode(actionButton.dataset.importExportMode);
    render();
    return;
  }

  if (action === "toggle-import-export-character") {
    toggleImportExportCharacterSelection(actionButton.dataset.characterId);
    render();
    return;
  }

  if (action === "toggle-import-export-encounter") {
    toggleImportExportEncounterSelection(actionButton.dataset.encounterId);
    render();
    return;
  }

  if (action === "toggle-import-export-encounter-folder") {
    toggleImportExportEncounterFolderSelection(actionButton.dataset.encounterFolderId);
    render();
    return;
  }

  if (action === "toggle-import-export-diary-note") {
    toggleImportExportDiaryNoteSelection(actionButton.dataset.diaryNoteId);
    render();
    return;
  }

  if (action === "toggle-import-export-diary-folder") {
    toggleImportExportDiaryFolderSelection(actionButton.dataset.diaryFolderId);
    render();
    return;
  }

  if (action === "select-all-import-export-characters") {
    toggleAllImportExportCharacters();
    render();
    return;
  }

  if (action === "select-all-import-export-encounters") {
    toggleAllImportExportEncounters();
    render();
    return;
  }

  if (action === "select-all-import-export-diary") {
    toggleAllImportExportDiary();
    render();
    return;
  }

  if (action === "confirm-import-export") {
    await confirmImportExportDialog();
    return;
  }

  if (action === "open-create-compendium-entity") {
    openCompendiumCreateDialog(actionButton.dataset.repositoryKey);
    render();
    return;
  }

  if (action === "open-edit-compendium-entity") {
    await openCompendiumEditDialog(
      actionButton.dataset.repositoryKey,
      actionButton.dataset.compendiumEntryId
    );
    return;
  }

  if (action === "delete-compendium-entity") {
    await deleteCustomCompendiumEntity(
      actionButton.dataset.repositoryKey,
      actionButton.dataset.compendiumEntryId
    );
    return;
  }

  if (action === "dismiss-compendium-create-dialog") {
    closeCompendiumCreateDialog();
    render();
    return;
  }

  if (action === "save-compendium-entity") {
    await saveCompendiumEntityFromDialog();
    return;
  }

  if (action === "toggle-file-menu") {
    const nextOpenState = !(state.menuHubOpen || state.fileMenuOpen);
    state.optionsMenuOpen = false;
    state.fileMenuOpen = false;
    state.menuHubOpen = nextOpenState;
    render();
    return;
  }

  if (action === "open-file-menu-section") {
    state.menuHubOpen = false;
    state.fileMenuOpen = true;
    render();
    return;
  }

  if (action === "open-menu-hub") {
    state.fileMenuOpen = false;
    state.menuHubOpen = true;
    render();
    return;
  }

  if (action === "open-options-menu-section" || action === "toggle-options-menu") {
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = !state.optionsMenuOpen;
    render();
    return;
  }

  if (action === "open-release-notes-screen") {
    state.activeScreen = "release-notes";
    state.activeReleaseNotesVersion = normalizeReleaseNotesVersion(actionButton.dataset.releaseVersion || APP_VERSION);
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
    render();
    return;
  }

  if (action === "select-release-notes-version") {
    state.activeReleaseNotesVersion = normalizeReleaseNotesVersion(actionButton.dataset.releaseVersion);
    render();
    return;
  }

  if (action === "close-options-menu") {
    state.optionsMenuOpen = false;
    state.menuHubOpen = false;
    render();
    return;
  }

  if (action === "set-options-section") {
    state.optionsMenuSection = normalizeStoredOptionsMenuSection(actionButton.dataset.optionsSection);
    render();
    return;
  }

  if (action === "set-app-language") {
    state.appLanguage = normalizeStoredAppLanguage(actionButton.dataset.appLanguage);
    synchronizeLanguageSpecificSystemData({ syncCombatants: true });
    saveCampaignMeta();
    saveCombatTrackerState();
    saveTablesState();
    render();
    return;
  }

  if (action === "set-content-language") {
    reconcileEncounterRowsWithCurrentBestiaryReferences();
    reconcileCombatantsWithCurrentBestiaryReferences();
    reconcileCharactersWithCurrentCompendiumReferences();
    state.contentLanguage = normalizeStoredContentLanguage(actionButton.dataset.contentLanguage);
    synchronizeLanguageSpecificSystemData({ syncCombatants: true });
    saveCampaignMeta();
    saveCombatTrackerState();
    saveTablesState();
    reloadCompendiumContent();
    return;
  }

  if (action === "new-campaign") {
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    createNewCampaign();
    render();
    return;
  }

  if (action === "save-campaign-file") {
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    render();
    saveCampaignFile();
    return;
  }

  if (action === "save-campaign-file-as") {
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    render();
    saveCampaignFileAs();
    return;
  }

  if (action === "choose-campaign-file") {
    state.menuHubOpen = false;
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

  if (action === "award-character-xp") {
    awardExperienceToCharacter(actionButton.dataset.characterId, getCharacterXpDraftValue(actionButton.dataset.characterId));
    render();
    return;
  }

  if (action === "award-character-level-up") {
    awardExperienceToCharacterLevelUp(actionButton.dataset.characterId);
    render();
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
    const shouldToggleCharacterSelection = event.ctrlKey
      || event.metaKey
      || event.getModifierState?.("Control")
      || event.getModifierState?.("Meta");
    selectCharacter(actionButton.dataset.characterId, {
      toggleSelection: shouldToggleCharacterSelection
    });
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

  if (action === "toggle-characters-overview") {
    state.charactersOverviewHidden = !state.charactersOverviewHidden;
    render();
    return;
  }

  if (action === "add-character-to-combat") {
    addActiveCharacterToCombat();
    render();
    return;
  }

  if (action === "add-all-characters-to-combat") {
    addAllCharactersToCombat();
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

  if (action === "create-table") {
    const tableId = createTable({
      folderId: actionButton.dataset.tableFolderId
    });
    saveTablesState();
    render({
      focusSelector: tableId ? `[data-table-name="${tableId}"]` : null
    });
    return;
  }

  if (action === "create-table-folder") {
    const folderId = createTableFolder();
    saveTablesState();
    render({
      focusSelector: folderId ? `[data-table-folder-name="${folderId}"]` : null
    });
    return;
  }

  if (action === "toggle-table-folder") {
    toggleTableFolder(actionButton.dataset.tableFolderId);
    saveTablesState();
    render();
    return;
  }

  if (action === "delete-table-folder") {
    deleteTableFolder(actionButton.dataset.tableFolderId);
    saveTablesState();
    render();
    return;
  }

  if (action === "import-table-workbook") {
    app.querySelector("[data-table-import-input]")?.click();
    return;
  }

  if (action === "export-table") {
    await exportTableToExcel(actionButton.dataset.tableId);
    return;
  }

  if (action === "roll-table") {
    startTableRoll(actionButton.dataset.tableId);
    return;
  }

  if (action === "open-loot-table-item") {
    openItemFromLootTable(actionButton.dataset.itemName);
    return;
  }

  if (action === "open-table-spell") {
    openSpellFromTable(actionButton.dataset.spellName);
    return;
  }

  if (action === "select-table") {
    selectTable(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "toggle-table-open") {
    toggleTableOpen(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "toggle-table-panel-collapse") {
    toggleTableCollapsed(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "open-all-tables") {
    openAllTables();
    saveTablesState();
    render();
    return;
  }

  if (action === "close-all-tables") {
    closeAllTables();
    saveTablesState();
    render();
    return;
  }

  if (action === "delete-table") {
    if (isProtectedTableId(actionButton.dataset.tableId)) {
      return;
    }

    deleteTable(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "add-table-column") {
    addTableColumn(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "insert-table-column-after") {
    insertTableColumnAfter(actionButton.dataset.tableId, actionButton.dataset.tableColumnId);
    saveTablesState();
    render();
    return;
  }

  if (action === "remove-table-column") {
    removeTableColumn(actionButton.dataset.tableId, actionButton.dataset.tableColumnId);
    saveTablesState();
    render();
    return;
  }

  if (action === "add-table-row") {
    addTableRow(actionButton.dataset.tableId);
    saveTablesState();
    render();
    return;
  }

  if (action === "insert-table-row-after") {
    insertTableRowAfter(actionButton.dataset.tableId, actionButton.dataset.tableRowId);
    saveTablesState();
    render();
    return;
  }

  if (action === "remove-table-row") {
    removeTableRow(actionButton.dataset.tableId, actionButton.dataset.tableRowId);
    saveTablesState();
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
      focusSelector: nextKey ? `[data-filter-search-key="${nextKey}"]` : null
    });
    return;
  }

  if (action === "clear-filter") {
    state.filters[actionButton.dataset.filterKey] = [];
    state.combatFilterDrafts[actionButton.dataset.filterKey] = "";
    render({
      focusSelector: `[data-filter-search-key="${actionButton.dataset.filterKey}"]`
    });
    return;
  }

  if (action === "clear-filters") {
    state.filters = { ...blankFilters };
    state.combatFilterDrafts = { ...blankCombatFilterDrafts };
    state.activeFilterKey = "";
    render();
    return;
  }

  if (action === "dismiss-notification") {
    dismissNotification(actionButton.dataset.notificationId);
    syncNotificationUi();
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

  if (action === "combat-long-rest") {
    playInterfaceSound(longRestSoundUrl, 0.72, "longRest");
    applyCombatLongRest();
    saveCombatTrackerState();
    saveCharacters();
    render();
    return;
  }

  if (action === "toggle-combat-spellbook-popup") {
    const combatantId = cleanText(actionButton.dataset.combatantId);
    const isClosing = state.activeCombatSpellbookCombatantId === combatantId;
    state.activeCombatSpellbookCombatantId = isClosing ? "" : combatantId;
    clearActiveCombatPreview();
    render();

    if (!isClosing) {
      queueCompendiumLoad("arcanum");
    }

    return;
  }

  if (action === "toggle-combat-spell-slot-spent") {
    toggleCombatSpellSlotSpent(
      actionButton.dataset.combatantId,
      actionButton.dataset.spellSlotLevel,
      actionButton.dataset.spellSlotIndex
    );
    saveCharacters();
    render();
    return;
  }

  if (action === "delete-combatant-row") {
    deleteCombatantRow(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "add-blank-combatant") {
    const combatantId = addBlankCombatant();
    state.filters = { ...blankFilters };
    state.combatFilterDrafts = { ...blankCombatFilterDrafts };
    state.activeFilterKey = "";
    state.sort = { key: "numPeana", direction: "asc" };
    render({
      focusSelector: `[data-edit-id="${combatantId}"][data-edit-key="nombre"]`
    });
    return;
  }

  if (action === "cycle-combat-tag") {
    cycleCombatantTag(actionButton.dataset.combatantId);
    saveCombatTrackerState();
    render();
    return;
  }

  if (action === "set-combat-tag") {
    setCombatantTag(actionButton.dataset.combatantId, actionButton.dataset.combatTag);
    saveCombatTrackerState();
    render();
    return;
  }

  if (action === "toggle-combat-status") {
    const combatantId = actionButton.dataset.combatantId;
    toggleCombatantStatus(combatantId, actionButton.dataset.combatStatus);
    state.activeCombatStatusMenuId = "";
    syncCombatTrackerMutation(combatantId);
    return;
  }

  if (action === "toggle-combat-status-menu") {
    event.preventDefault();
    const combatantId = cleanText(actionButton.dataset.combatantId);
    const previousCombatantId = state.activeCombatStatusMenuId;
    state.activeCombatStatusMenuId = state.activeCombatStatusMenuId === combatantId ? "" : combatantId;
    syncCombatTrackerMutation([previousCombatantId, combatantId]);
    return;
  }

  if (action === "select-combat-name-suggestion") {
    selectCombatNameSuggestion(
      actionButton.dataset.combatantId,
      actionButton.dataset.entryId,
      actionButton.dataset.entryKind
    );
    saveCombatTrackerState();
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
    clearActiveCombatPreview();
    openCombatantBestiary(actionButton.dataset.entryId);
    render();
    return;
  }

  if (action === "open-combatant-character") {
    clearActiveCombatPreview();
    openCombatantCharacter(actionButton.dataset.characterId);
    render();
    return;
  }

  if (action === "generate-iniactiva") {
    generateInitiative();
    render();
    return;
  }

  if (action === "start-combat-turns") {
    playInterfaceSound(combatSoundUrl, 0.76, "combat");
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

  if (action === "toggle-combat-turn-round-editor") {
    state.combatTurnRoundEditorOpen = !state.combatTurnRoundEditorOpen;
    state.combatTurnJumpMenuOpen = false;
    state.combatTurnRoundDraft = String(getCombatRound());
    render({
      focusSelector: state.combatTurnRoundEditorOpen ? "[data-combat-turn-round-input]" : null
    });
    return;
  }

  if (action === "apply-combat-turn-round") {
    setCombatTurnRound(state.combatTurnRoundDraft);
    render();
    return;
  }

  if (action === "toggle-combat-turn-jump-menu") {
    state.combatTurnJumpMenuOpen = !state.combatTurnJumpMenuOpen;
    state.combatTurnRoundEditorOpen = false;
    render();
    return;
  }

  if (action === "jump-combat-turn-to") {
    jumpCombatTurnTo(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "focus-combatant-row") {
    selectCombatTurnToken(actionButton.dataset.combatantId, {
      additive: event.ctrlKey || event.metaKey || event.getModifierState?.("Control") || event.getModifierState?.("Meta")
    });
    return;
  }

  if (action === "adjust-pg-act") {
    const combatantId = actionButton.dataset.id;
    const previousCharacters = state.characters;
    applyPgActAdjustment(combatantId, actionButton.dataset.mode);
    syncCombatTrackerMutation(combatantId, {
      forceFullRender: previousCharacters !== state.characters
    });
    return;
  }

  if (action === "adjust-necrotic") {
    const combatantId = actionButton.dataset.id;
    const previousCharacters = state.characters;
    applyNecroticAdjustment(combatantId);
    syncCombatTrackerMutation(combatantId, {
      forceFullRender: previousCharacters !== state.characters
    });
    return;
  }

  if (action === "toggle-combatant-shield") {
    const combatantId = actionButton.dataset.combatantId;
    toggleCombatantShield(combatantId);
    syncCombatTrackerMutation(combatantId);
    return;
  }

  if (action === "restore-combatant-max-hp") {
    const combatantId = actionButton.dataset.combatantId;
    restoreCombatantMaxHp(combatantId);
    closeCombatMaxHpRestoreMenu();
    syncCombatTrackerMutation(combatantId);
    return;
  }

  if (action === "adjust-area-pg-act") {
    openCombatAreaTargetPicker(actionButton.dataset.mode);
    render();
    return;
  }

  if (action === "adjust-area-necrotic") {
    openCombatAreaTargetPicker("necrotic");
    render();
    return;
  }

  if (action === "adjust-area-pg-temp") {
    openCombatAreaTargetPicker("temp");
    render();
    return;
  }

  if (action === "adjust-area-xp") {
    openCombatAreaTargetPicker("xp");
    render();
    return;
  }

  if (action === "toggle-combat-area-target") {
    toggleCombatAreaTargetSelection(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "toggle-combat-area-half") {
    toggleCombatAreaTargetHalfSelection(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "cancel-combat-area-targets") {
    closeCombatAreaTargetPicker();
    render();
    return;
  }

  if (action === "apply-combat-area-targets") {
    applyCombatAreaTargetPicker();
    render();
    return;
  }

  if (action === "adjust-combat-turn-quick-resource") {
    const combatantId = cleanText(state.combatTurnQuickMenu?.combatantId);
    const previousCharacters = state.characters;
    applyCombatTurnQuickMenuAdjustment(actionButton.dataset.mode);
    syncCombatTrackerMutation(combatantId, {
      forceFullRender: previousCharacters !== state.characters
    });
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

  if (action === "toggle-combat-timer-panel") {
    state.combatTimerPanelOpen = !state.combatTimerPanelOpen;
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

  if (action === "pick-repository-csv") {
    triggerRepositoryCsvInputPicker(actionButton.dataset.repositoryCsv);
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

  if (action === "toggle-character-spellbook") {
    toggleCharacterSpellbookSection();
    saveCharacters();
    render();
    return;
  }

  if (action === "add-character-spell-slot-level") {
    addCharacterSpellSlotLevel();
    saveCharacters();
    render();
    return;
  }

  if (action === "toggle-combat-spellbook-ability-spent") {
    toggleCombatSpellbookAbilitySpent(
      actionButton.dataset.combatantId,
      actionButton.dataset.characterSpellbookAbilityRowId,
      actionButton.dataset.characterSpellbookAbilityUseIndex
    );
    saveCharacters();
    render();
    return;
  }

  if (action === "add-character-spellbook-ability-row") {
    const rowId = addCharacterSpellbookAbilityRow();
    saveCharacters();
    render({
      focusSelector: rowId ? `[data-character-spellbook-ability-field="name"][data-character-spellbook-ability-row="${rowId}"]` : null
    });
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

  if (action === "add-character-class-row") {
    const rowId = addCharacterClassRow();
    saveCharacters();
    render({
      focusSelector: rowId ? `[data-character-class-field="name"][data-character-class-row="${rowId}"]` : null
    });
    return;
  }

  if (action === "remove-character-skill-definition") {
    removeCharacterSkillDefinition(actionButton.dataset.characterSkillDefinitionId);
    saveCharacters();
    saveCharacterSkillDefinitions();
    render();
    return;
  }

  if (action === "add-character-spell-row") {
    const rowId = addCharacterSpellRow();
    saveCharacters();
    render({
      focusSelector: rowId ? `[data-character-spell-name="${rowId}"]` : null
    });
    return;
  }

  if (action === "remove-character-spell-row") {
    removeCharacterSpellRow(actionButton.dataset.characterSpellRowId);
    saveCharacters();
    render();
    return;
  }

  if (action === "remove-character-spellbook-ability-row") {
    removeCharacterSpellbookAbilityRow(actionButton.dataset.characterSpellbookAbilityRowId);
    saveCharacters();
    render();
    return;
  }

  if (action === "open-character-spellbook-ability-description-dialog") {
    openCharacterSpellbookAbilityDescriptionDialog(actionButton.dataset.characterSpellbookAbilityRowId);
    render({
      focusSelector: "[data-character-spellbook-ability-description-input]"
    });
    return;
  }

  if (action === "dismiss-character-spellbook-ability-description-dialog") {
    closeCharacterSpellbookAbilityDescriptionDialog();
    render();
    return;
  }

  if (action === "save-character-spellbook-ability-description-dialog") {
    const focusRowId = cleanText(state.characterSpellbookAbilityDescriptionDialogRowId);
    saveCharacterSpellbookAbilityDescriptionDialog();
    saveCharacters();
    render({
      focusSelector: focusRowId ? `[data-character-spellbook-ability-row-id="${focusRowId}"][data-action="open-character-spellbook-ability-description-dialog"]` : null
    });
    return;
  }

  if (action === "choose-multiclass-level-up-class") {
    applyMulticlassLevelUpChoice(actionButton.dataset.characterId, actionButton.dataset.characterClassEntryId);
    saveCharacters();
    render();
    return;
  }

  if (action === "select-character-spell-suggestion") {
    selectCharacterSpellSuggestion(
      actionButton.dataset.characterSpellRowId,
      actionButton.dataset.arcanumEntryId
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-spell-name="${actionButton.dataset.characterSpellRowId}"]`
    });
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

  if (action === "create-diary-note") {
    const noteId = createDiaryNoteAndSelect({
      folderId: actionButton.dataset.diaryFolderId ?? state.activeDiaryFolderId
    });
    render({
      focusSelector: `[data-diary-title="${noteId}"]`
    });
    return;
  }

  if (action === "create-diary-folder") {
    const folderId = createDiaryFolder();
    saveDiaryState();
    render({
      focusSelector: folderId ? `[data-diary-folder-name="${folderId}"]` : null
    });
    return;
  }

  if (action === "toggle-diary-folder") {
    toggleDiaryFolder(actionButton.dataset.diaryFolderId);
    saveDiaryState();
    render();
    return;
  }

  if (action === "select-diary-note") {
    selectDiaryNote(actionButton.dataset.diaryNoteId);
    render({
      focusSelector: `[data-diary-title="${actionButton.dataset.diaryNoteId}"]`
    });
    return;
  }

  if (action === "delete-diary-note") {
    deleteActiveDiaryNote();
    render({
      focusSelector: `[data-diary-title="${state.activeDiaryNoteId}"]`
    });
    return;
  }

  if (action === "select-diary-search-suggestion") {
    state.showDiarySearchSuggestions = false;
    selectDiaryNote(actionButton.dataset.diaryNoteId);
    render({
      focusSelector: `[data-diary-title="${actionButton.dataset.diaryNoteId}"]`
    });
    return;
  }

  if (action === "open-harptos-note-from-calendar") {
    selectDiaryNote(actionButton.dataset.diaryNoteId);
    render({
      focusSelector: `[data-diary-title="${actionButton.dataset.diaryNoteId}"]`,
      scrollIntoView: true
    });
    return;
  }

  if (action === "insert-diary-mention") {
    event.preventDefault();
    insertDiaryMention(
      actionButton.dataset.diaryMentionKind,
      actionButton.dataset.diaryMentionId,
      actionButton.dataset.diaryMentionName
    );
    return;
  }

  if (action === "insert-diary-tag-token") {
    event.preventDefault();
    insertDiaryEditorToken("#");
    return;
  }

  if (action === "insert-diary-mention-token") {
    event.preventDefault();
    insertDiaryEditorToken("@");
    return;
  }

  if (action === "delete-diary-folder") {
    deleteDiaryFolder(actionButton.dataset.diaryFolderId);
    saveDiaryState();
    render({
      focusSelector: `[data-diary-title="${state.activeDiaryNoteId}"]`
    });
    return;
  }

  if (action === "apply-diary-command") {
    applyDiaryEditorCommand(
      actionButton.dataset.diaryCommand,
      actionButton.dataset.diaryCommandValue
    );
    return;
  }

  if (action === "set-diary-harptos-period") {
    updateDiaryHarptosDatePart(
      actionButton.dataset.diaryHarptosPeriod,
      actionButton.dataset.diaryHarptosSide,
      "periodId",
      actionButton.dataset.harptosPeriodId
    );
    render();
    return;
  }

  if (action === "set-diary-harptos-day") {
    updateDiaryHarptosDatePart(
      actionButton.dataset.diaryHarptosDay,
      actionButton.dataset.diaryHarptosSide,
      "day",
      actionButton.dataset.harptosDay
    );
    render();
    return;
  }

  if (action === "toggle-diary-calendar-section") {
    toggleDiaryCalendarSection(actionButton.dataset.diaryCalendarSection);
    render();
    return;
  }

  if (action === "toggle-diary-harptos-overview") {
    toggleDiaryHarptosOverview();
    render();
    return;
  }

  if (action === "set-diary-harptos-overview-period") {
    state.diaryHarptosOverviewPeriodId = getDiaryHarptosOverviewValidPeriodId(actionButton.dataset.harptosPeriodId);
    render();
    return;
  }

  if (action === "edit-diary-harptos-day-note") {
    openDiaryHarptosDayNoteDialog(
      actionButton.dataset.harptosPeriodId,
      actionButton.dataset.harptosDay,
      actionButton.dataset.harptosYear
    );
    return;
  }

  if (action === "dismiss-diary-harptos-day-note-dialog") {
    closeDiaryHarptosDayNoteDialog();
    render();
    return;
  }

  if (action === "confirm-diary-harptos-day-note-dialog") {
    submitDiaryHarptosDayNoteDialog();
    return;
  }

  if (action === "insert-diary-harptos-day-note-emoji") {
    insertDiaryHarptosDayNoteEmoji(actionButton.dataset.emojiValue);
    return;
  }

  if (action === "filter-item-by-type-token") {
    resetItemVirtualScroll();
    state.activeScreen = "items";
    toggleExclusiveItemFilterValue("type", getItemTypeFilterValueFromToken(actionButton.dataset.itemTypeToken ?? ""));
    render();
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

async function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-account-profile-image]")) {
    updateAccountProfileImage(target.files?.[0] ?? null);
    target.value = "";
    return;
  }

  if (target.matches("[data-cloud-catalog-select]")) {
    const selectionKey = cleanText(target.dataset.cloudCatalogSelect);
    const nextSelection = new Set(state.cloudCatalogSelectedIds);

    if (target.checked) {
      if (selectionKey.startsWith("campaign:")) {
        [...nextSelection].filter((key) => key.startsWith("campaign:")).forEach((key) => nextSelection.delete(key));
      }
      nextSelection.add(selectionKey);
    } else {
      nextSelection.delete(selectionKey);
    }

    state.cloudCatalogSelectedIds = nextSelection;
    render();
    if (target.checked) {
      await importCloudCatalogSelectionKeys([selectionKey]);
    } else {
      await removeCloudCatalogSelectionKeys([selectionKey]);
    }
    return;
  }

  if (target.matches("[data-cloud-import-update-select]")) {
    const recordId = cleanText(target.dataset.cloudImportUpdateSelect);
    const nextSelection = new Set(state.cloudImportUpdateSelectedIds);

    if (target.checked) {
      nextSelection.add(recordId);
    } else {
      nextSelection.delete(recordId);
    }

    state.cloudImportUpdateSelectedIds = nextSelection;
    render();
    return;
  }

  if (target.matches("[data-cloud-catalog-owner]")) {
    state.cloudCatalogOwner = target.value;
    render();
    return;
  }

  if (target.matches("[data-cloud-catalog-campaign]")) {
    state.cloudCatalogCampaign = target.value;
    render();
    return;
  }

  if (target.matches("[data-cloud-catalog-sort]")) {
    state.cloudCatalogSort = target.value;
    render();
    return;
  }

  if (target.matches("[data-cloud-catalog-group-by]")) {
    state.cloudCatalogGroupBy = ["none", "campaign", "owner", "owner-campaign"].includes(target.value)
      ? target.value
      : "owner-campaign";
    state.cloudCatalogCollapsedGroups = new Set();
    render();
    return;
  }

  if (target.matches("[data-import-export-character-checkbox]")) {
    toggleImportExportCharacterSelection(target.dataset.importExportCharacterCheckbox);
    render({
      focusSelector: `[data-import-export-character-checkbox="${target.dataset.importExportCharacterCheckbox}"]`
    });
    return;
  }

  if (target.matches("[data-import-export-encounter-checkbox]")) {
    toggleImportExportEncounterSelection(target.dataset.importExportEncounterCheckbox);
    render({
      focusSelector: `[data-import-export-encounter-checkbox="${target.dataset.importExportEncounterCheckbox}"]`
    });
    return;
  }

  if (target.matches("[data-import-export-encounter-folder-checkbox]")) {
    toggleImportExportEncounterFolderSelection(target.dataset.importExportEncounterFolderCheckbox);
    render({
      focusSelector: `[data-import-export-encounter-folder-checkbox="${target.dataset.importExportEncounterFolderCheckbox}"]`
    });
    return;
  }

  if (target.matches("[data-import-export-diary-note-checkbox]")) {
    toggleImportExportDiaryNoteSelection(target.dataset.importExportDiaryNoteCheckbox);
    render({
      focusSelector: `[data-import-export-diary-note-checkbox="${target.dataset.importExportDiaryNoteCheckbox}"]`
    });
    return;
  }

  if (target.matches("[data-import-export-diary-folder-checkbox]")) {
    toggleImportExportDiaryFolderSelection(target.dataset.importExportDiaryFolderCheckbox);
    render({
      focusSelector: `[data-import-export-diary-folder-checkbox="${target.dataset.importExportDiaryFolderCheckbox}"]`
    });
    return;
  }

  if (target.matches("[data-repository-csv-input]")) {
    handleRepositoryCsvFileSelection(target);
    return;
  }

  if (target.matches("[data-repository-csv]")) {
    updateRepositoryCsvPath(target.dataset.repositoryCsv, target.value);
    return;
  }

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

  if (target.matches("[data-character-multiclass]")) {
    toggleCharacterMulticlass(target.checked);
    saveCharacters();
    render();
    return;
  }

  if (target.matches("[data-character-class-field][data-character-class-row]")) {
    updateCharacterClassEntry(
      target.dataset.characterClassRow,
      target.dataset.characterClassField,
      target.value,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-class-field="${target.dataset.characterClassField}"][data-character-class-row="${target.dataset.characterClassRow}"]`
    });
    return;
  }

  if (target.matches("[data-character-field]")) {
    const fieldValue = target.type === "checkbox" ? target.checked : target.value;
    updateCharacterField(target.dataset.characterField, fieldValue, true);
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

  if (target.matches("[data-character-spell-field][data-character-spell-row]")) {
    const fieldValue = target.type === "checkbox" ? target.checked : target.value;
    updateCharacterSpellRow(
      target.dataset.characterSpellRow,
      target.dataset.characterSpellField,
      fieldValue,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-spell-field="${target.dataset.characterSpellField}"][data-character-spell-row="${target.dataset.characterSpellRow}"]`
    });
    return;
  }

  if (target.matches("[data-character-spellbook-ability-field][data-character-spellbook-ability-row]")) {
    updateCharacterSpellbookAbilityRow(
      target.dataset.characterSpellbookAbilityRow,
      target.dataset.characterSpellbookAbilityField,
      target.value,
      true
    );
    saveCharacters();
    render({
      focusSelector: `[data-character-spellbook-ability-field="${target.dataset.characterSpellbookAbilityField}"][data-character-spellbook-ability-row="${target.dataset.characterSpellbookAbilityRow}"]`
    });
    return;
  }

  if (target.matches("[data-character-spellbook-ability-description-input]")) {
    state.characterSpellbookAbilityDescriptionDialogValue = target.value;
    return;
  }

  if (target.matches("[data-character-spell-slot-level]")) {
    updateCharacterSpellSlot(target.dataset.characterSpellSlotLevel, target.value, true);
    saveCharacters();
    render({
      focusSelector: `[data-character-spell-slot-level="${target.dataset.characterSpellSlotLevel}"]`
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

  if (target.matches("[data-diary-real-date-mode]")) {
    updateDiaryRealDateMode(target.dataset.diaryRealDateMode, target.value);
    render({
      focusSelector: `[data-diary-real-date-mode="${target.dataset.diaryRealDateMode}"]`
    });
    return;
  }

  if (target.matches("[data-diary-real-date-start]")) {
    updateDiaryRealDateValue(target.dataset.diaryRealDateStart, "realDateStart", target.value);
    render({
      focusSelector: `[data-diary-real-date-start="${target.dataset.diaryRealDateStart}"]`
    });
    return;
  }

  if (target.matches("[data-diary-real-date-end]")) {
    updateDiaryRealDateValue(target.dataset.diaryRealDateEnd, "realDateEnd", target.value);
    render({
      focusSelector: `[data-diary-real-date-end="${target.dataset.diaryRealDateEnd}"]`
    });
    return;
  }

  if (target.matches("[data-diary-harptos-date-mode]")) {
    updateDiaryHarptosDateMode(target.dataset.diaryHarptosDateMode, target.value);
    render({
      focusSelector: `[data-diary-harptos-date-mode="${target.dataset.diaryHarptosDateMode}"]`
    });
    return;
  }

  if (target.matches("[data-diary-harptos-year]")) {
    updateDiaryHarptosDatePart(target.dataset.diaryHarptosYear, target.dataset.diaryHarptosSide, "year", target.value);
    render({
      focusSelector: `[data-diary-harptos-year="${target.dataset.diaryHarptosYear}"][data-diary-harptos-side="${target.dataset.diaryHarptosSide}"]`
    });
    return;
  }

  if (target.matches("[data-diary-harptos-period]")) {
    updateDiaryHarptosDatePart(target.dataset.diaryHarptosPeriod, target.dataset.diaryHarptosSide, "periodId", target.value);
    render({
      focusSelector: `[data-diary-harptos-period="${target.dataset.diaryHarptosPeriod}"][data-diary-harptos-side="${target.dataset.diaryHarptosSide}"]`
    });
    return;
  }

  if (target.matches("[data-diary-harptos-day]")) {
    updateDiaryHarptosDatePart(target.dataset.diaryHarptosDay, target.dataset.diaryHarptosSide, "day", target.value);
    render({
      focusSelector: `[data-diary-harptos-day="${target.dataset.diaryHarptosDay}"][data-diary-harptos-side="${target.dataset.diaryHarptosSide}"]`
    });
    return;
  }

  if (target.matches("[data-diary-folder-name]")) {
    updateDiaryFolderName(target.dataset.diaryFolderName, target.value);
    saveDiaryState();
    render({
      focusSelector: `[data-diary-folder-name="${target.dataset.diaryFolderName}"]`
    });
    return;
  }

  if (target.matches("[data-table-name]")) {
    updateTableName(target.dataset.tableName, target.value);
    saveTablesState();
    render({
      focusSelector: `[data-table-name="${target.dataset.tableName}"]`
    });
    return;
  }

  if (target.matches("[data-table-folder-name]")) {
    updateTableFolderName(target.dataset.tableFolderName, target.value);
    saveTablesState();
    render({
      focusSelector: `[data-table-folder-name="${target.dataset.tableFolderName}"]`
    });
    return;
  }

  if (target.matches("[data-table-import-input]")) {
    importTablesFromWorkbook(target.files?.[0] ?? null);
    target.value = "";
    return;
  }

  if (target.matches("[data-table-column-label][data-table-id][data-table-column-id]")) {
    updateTableColumnLabel(target.dataset.tableId, target.dataset.tableColumnId, target.value);
    saveTablesState();
    render({
      focusSelector: `[data-table-column-label="${target.dataset.tableColumnId}"][data-table-id="${target.dataset.tableId}"]`
    });
    return;
  }

  if (target.matches("[data-table-cell][data-table-id][data-table-row-id][data-table-column-id]")) {
    updateTableCell(target.dataset.tableId, target.dataset.tableRowId, target.dataset.tableColumnId, target.value);
    saveTablesState();
    return;
  }

  if (target.matches("[data-table-dimension][data-table-dimension-kind][data-table-id]")) {
    updateTableDimension(target.dataset.tableId, target.dataset.tableDimensionKind, target.value);
    saveTablesState();
    render();
    return;
  }

  if (target.matches("[data-campaign-file-input]")) {
    loadCampaignFile(target.files?.[0] ?? null);
    target.value = "";
    return;
  }

  if (target.matches("[data-select-row]")) {
    toggleRowSelection(target.dataset.selectRow, target.checked);
    syncCombatSelectionUi();
    return;
  }

  if (target.matches("[data-select-all]")) {
    toggleAllVisible(target.checked);
    syncCombatSelectionUi();
    return;
  }

  if (target.matches("[data-combat-turn-quick-value]")) {
    state.combatTurnQuickMenu = {
      ...state.combatTurnQuickMenu,
      value: target.value
    };
    return;
  }

  if (target.matches("[data-new-entity-side]")) {
    state.newEntitySide = target.value;
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-enemy-hp-mode-switch]")) {
    state.enemyHpMode = target.checked ? ENEMY_HP_MODE_VARIABLE : ENEMY_HP_MODE_FIXED;
    saveCombatTrackerState();
    render();
    return;
  }

  if (target.matches("[data-npc-xp-switch]")) {
    state.includeNpcInCombatExperience = target.checked;
    saveCampaignMeta();
    render();
    return;
  }

  if (target.matches("[data-sound-effects-enabled]")) {
    const normalizedSettings = normalizeStoredSoundSettings(state.soundSettings);
    state.soundSettings = {
      ...normalizedSettings,
      enabled: target.checked,
      ...Object.fromEntries(SOUND_EFFECT_KEYS.map((key) => [key, target.checked]))
    };
    saveCampaignMeta();
    render();
    return;
  }

  if (target.matches("[data-sound-effect-key]")) {
    const soundKey = cleanText(target.dataset.soundEffectKey);

    if (!SOUND_EFFECT_KEYS.includes(soundKey)) {
      return;
    }

    state.soundSettings = {
      ...normalizeStoredSoundSettings(state.soundSettings),
      enabled: target.checked ? true : normalizeStoredSoundSettings(state.soundSettings).enabled,
      [soundKey]: target.checked
    };
    saveCampaignMeta();
    render();
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-combat-filter-option]")) {
    toggleCombatFilterValue(target.dataset.combatFilterOption, target.value, target.checked);
    render({
      focusSelector: `[data-filter-search-key="${target.dataset.combatFilterOption}"]`
    });
    return;
  }

  if (target.matches("[data-edit-id][data-edit-key]")) {
    const previousCharacters = state.characters;
    updateCombatantField(target.dataset.editId, target.dataset.editKey, target.value);
    saveCombatTrackerState();

    if (target.dataset.editKey === "nombre") {
      return;
    }

    syncCombatTrackerMutation(target.dataset.editId, {
      forceFullRender: previousCharacters !== state.characters
    });
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

  if (target.matches("[data-account-profile-name]")) {
    state.accountProfileNameDraft = target.value;
    state.accountError = "";
    return;
  }

  if (target.matches("[data-cloud-catalog-query]")) {
    state.cloudCatalogQuery = target.value;
    scheduleRender({
      focusSelector: "[data-cloud-catalog-query]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-account-registration-code]")) {
    state.accountRegistrationCode = target.value;
    state.accountError = "";
    return;
  }

  if (target.matches("[data-account-campaign-name]")) {
    state.accountCampaignName = target.value;
    state.accountError = "";
    return;
  }

  if (target.matches("[data-campaign-save-name-input]")) {
    state.campaignSaveNameDialogValue = target.value;
    state.campaignSaveNameDialogError = "";
    return;
  }

  if (target.matches("[data-compendium-create-field]")) {
    updateCompendiumCreateDraftField(target.dataset.compendiumCreateField, target.value);
    return;
  }

  if (target.matches("[data-diary-title]")) {
    updateDiaryNoteTitle(target.dataset.diaryTitle, target.value);
    scheduleRender({
      focusSelector: `[data-diary-title="${target.dataset.diaryTitle}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-diary-folder-name]")) {
    updateDiaryFolderName(target.dataset.diaryFolderName, target.value);
    saveDiaryState();
    scheduleRender({
      focusSelector: `[data-diary-folder-name="${target.dataset.diaryFolderName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-diary-harptos-year]")) {
    updateDiaryHarptosDatePart(target.dataset.diaryHarptosYear, target.dataset.diaryHarptosSide, "year", target.value);
    return;
  }

  if (target.matches("[data-diary-harptos-overview-year]")) {
    state.diaryHarptosOverviewYear = normalizeDiaryHarptosOverviewYear(target.value);
    scheduleRender({
      focusSelector: "[data-diary-harptos-overview-year]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-diary-harptos-day-note-dialog-input]")) {
    state.diaryHarptosDayNoteDialogValue = target.value;
    return;
  }

  if (target.matches("[data-diary-harptos-day-note-dialog-color]")) {
    state.diaryHarptosDayNoteDialogColor = normalizeDiaryTagColorValue(target.value) || "#d88d5a";
    return;
  }

  if (target.matches("[data-diary-editor]")) {
    handleDiaryEditorInput(target);
    return;
  }

  if (target.matches("[data-table-name]")) {
    updateTableName(target.dataset.tableName, target.value);
    saveTablesState();
    scheduleRender({
      focusSelector: `[data-table-name="${target.dataset.tableName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-table-folder-name]")) {
    updateTableFolderName(target.dataset.tableFolderName, target.value);
    saveTablesState();
    scheduleRender({
      focusSelector: `[data-table-folder-name="${target.dataset.tableFolderName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-table-column-label][data-table-id][data-table-column-id]")) {
    updateTableColumnLabel(target.dataset.tableId, target.dataset.tableColumnId, target.value);
    saveTablesState();
    return;
  }

  if (target.matches("[data-table-cell][data-table-id][data-table-row-id][data-table-column-id]")) {
    updateTableCell(target.dataset.tableId, target.dataset.tableRowId, target.dataset.tableColumnId, target.value);
    saveTablesState();
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

  if (target.matches("[data-character-class-field][data-character-class-row]")) {
    updateCharacterClassEntry(
      target.dataset.characterClassRow,
      target.dataset.characterClassField,
      target.value,
      false
    );
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-field]")) {
    const fieldValue = target.type === "checkbox" ? target.checked : target.value;
    updateCharacterField(target.dataset.characterField, fieldValue, false);
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

  if (target.matches("[data-character-xp-draft]")) {
    state.characterXpAwardDrafts = {
      ...state.characterXpAwardDrafts,
      [target.dataset.characterXpDraft]: target.value
    };
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

  if (target.matches("[data-character-spell-name]")) {
    updateCharacterSpellRow(target.dataset.characterSpellName, "name", target.value, false);
    state.activeCharacterSpellRowId = target.dataset.characterSpellName;
    state.showCharacterSpellSuggestions = cleanText(target.value).length > 0;
    saveCharacters();
    scheduleRender({
      focusSelector: `[data-character-spell-name="${target.dataset.characterSpellName}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-character-spell-field][data-character-spell-row]")) {
    updateCharacterSpellRow(
      target.dataset.characterSpellRow,
      target.dataset.characterSpellField,
      target.type === "checkbox" ? target.checked : target.value,
      false
    );
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-spell-slot-level]")) {
    updateCharacterSpellSlot(target.dataset.characterSpellSlotLevel, target.value, false);
    saveCharacters();
    return;
  }

  if (target.matches("[data-character-spellbook-ability-field][data-character-spellbook-ability-row]")) {
    updateCharacterSpellbookAbilityRow(
      target.dataset.characterSpellbookAbilityRow,
      target.dataset.characterSpellbookAbilityField,
      target.value,
      false
    );
    saveCharacters();
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

  if (target.matches("[data-filter-search-key]")) {
    state.combatFilterDrafts[target.dataset.filterSearchKey] = target.value;
    render({
      focusSelector: `[data-filter-search-key="${target.dataset.filterSearchKey}"]`,
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

  if (target.matches("[data-combat-turn-quick-value]")) {
    state.combatTurnQuickMenu = {
      ...state.combatTurnQuickMenu,
      value: target.value
    };
    return;
  }

  if (target.matches("[data-combat-status-draft]")) {
    setCombatStatusDraft(target.dataset.combatStatusDraft, target.value);
    scheduleRender({
      focusSelector: `[data-combat-status-draft="${target.dataset.combatStatusDraft}"]`,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
    return;
  }

  if (target.matches("[data-area-damage]")) {
    state.areaDamage = target.value;
    saveCombatTrackerState();
    return;
  }

  if (target.matches("[data-combat-turn-round-input]")) {
    state.combatTurnRoundDraft = target.value;
    return;
  }

  if (target.matches("[data-combat-search]")) {
    state.combatSearchQuery = target.value;
    saveCombatTrackerState();
    scheduleRender({
      focusSelector: "[data-combat-search]",
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
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

  if (target.matches("[data-diary-search]")) {
    state.diarySearchQuery = target.value;
    state.showDiarySearchSuggestions = cleanText(target.value).length > 0;
    render({
      focusSelector: "[data-diary-search]",
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

  if (event.key === "Escape" && state.combatTurnQuickMenu?.combatantId) {
    event.preventDefault();
    closeCombatTurnQuickMenu();
    render();
    return;
  }

  if (event.key === "Escape" && (state.menuHubOpen || state.fileMenuOpen || state.optionsMenuOpen)) {
    event.preventDefault();
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
    render();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    state.menuHubOpen = false;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
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

  if (target.matches("[data-diary-harptos-day-note-dialog-input]") && event.key === "Enter") {
    event.preventDefault();
    submitDiaryHarptosDayNoteDialog();
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

  if (target.matches("[data-combat-turn-round-input]") && event.key === "Enter") {
    event.preventDefault();
    setCombatTurnRound(target.value);
    render();
    return;
  }

  if (event.key === "Escape" && state.combatAreaTargetPicker.mode) {
    closeCombatAreaTargetPicker();
    render();
    return;
  }

  if (target.matches("[data-diary-editor]") && event.key === "Escape") {
    hideDiaryMentionSuggestions();
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

  if (target.matches("[data-diary-search]") && event.key === "Enter") {
    event.preventDefault();
    const [firstMatch] = getDiarySearchMatches();

    if (firstMatch) {
      state.showDiarySearchSuggestions = false;
      selectDiaryNote(firstMatch.id);
      render({
        focusSelector: `[data-diary-title="${firstMatch.id}"]`
      });
      return;
    }

    state.showDiarySearchSuggestions = false;
    render({
      focusSelector: "[data-diary-search]"
    });
  }
}

async function handlePaste(event) {
  const target = event.target;

  if (!target.matches?.("[data-diary-editor]")) {
    return;
  }

  const clipboardItems = [...(event.clipboardData?.items ?? [])];
  const imageItem = clipboardItems.find((item) => item.type.startsWith("image/"));

  if (!imageItem) {
    return;
  }

  const file = imageItem.getAsFile();

  if (!file) {
    return;
  }

  event.preventDefault();

  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    insertHtmlAtCursor(`<img src="${escapeHtml(imageDataUrl)}" alt="Imagen pegada en nota" />`);
    updateActiveDiaryNoteContentHtml(target.innerHTML);
  } catch {
    // Keep text paste behavior untouched if image decode fails.
  }
}

function handleScroll(event) {
  const target = event.target;

  if (activeCharacterOverviewHeaderTooltipElement) {
    syncCharacterOverviewHeaderTooltipPosition();
  }

  if (state.activeCombatSpellbookCombatantId) {
    scheduleActiveCombatSpellbookPopoverSync();
  }

  if (state.activeCombatPreviewKey) {
    scheduleActiveCombatSpellPreviewSync();
  }

  if (target.matches?.("[data-bestiary-list-root]")) {
    const previousStartIndex = getBestiaryVirtualStartIndex(state.bestiaryListScrollTop);
    const previousViewportHeight = state.bestiaryListViewportHeight;
    state.bestiaryListScrollTop = target.scrollTop;
    state.bestiaryListViewportHeight = target.clientHeight;

    const nextStartIndex = getBestiaryVirtualStartIndex(state.bestiaryListScrollTop);
    const viewportChanged = Math.abs(previousViewportHeight - state.bestiaryListViewportHeight) > 24;

    if (previousStartIndex !== nextStartIndex || viewportChanged) {
      updateBestiaryListViewport();
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
      updateItemListViewport();
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
      updateArcanumListViewport();
    }
  }
}

function handleWindowResize() {
  syncCompendiumLayoutHeights();
  updateBestiaryListViewport(true);
  updateItemListViewport(true);
  updateArcanumListViewport(true);
  scheduleActiveCombatSpellbookPopoverSync();
  scheduleActiveCombatSpellPreviewSync();
  syncCharacterOverviewHeaderTooltipPosition();
}

function handleMouseOver(event) {
  const overviewTooltipTrigger = event.target.closest("[data-character-overview-tooltip]");

  if (overviewTooltipTrigger) {
    showCharacterOverviewHeaderTooltip(overviewTooltipTrigger);
  }

  const previewTrigger = event.target.closest("[data-combat-preview-key]");

  if (!previewTrigger) {
    return;
  }

  const previewKey = cleanText(previewTrigger.dataset.combatPreviewKey);
  const previewKind = cleanText(previewTrigger.dataset.combatPreviewKind);

  if (!previewKey || !previewKind || (state.activeCombatPreviewKey === previewKey && state.activeCombatPreviewKind === previewKind)) {
    return;
  }

  setActiveCombatPreviewFromTrigger(previewTrigger);
  syncCombatSpellPreviewOverlayMarkup();
}

function handleMouseOut(event) {
  const overviewTooltipTrigger = event.target.closest("[data-character-overview-tooltip]");

  if (overviewTooltipTrigger) {
    if (event.relatedTarget && overviewTooltipTrigger.contains(event.relatedTarget)) {
      return;
    }

    if (!event.relatedTarget?.closest?.("[data-character-overview-tooltip]")) {
      hideCharacterOverviewHeaderTooltip();
    }
  }

  const previewTrigger = event.target.closest("[data-combat-preview-key]");
  const previewOverlay = event.target.closest("[data-combat-spell-preview-overlay]");

  if (previewOverlay) {
    if (
      event.relatedTarget?.closest?.("[data-combat-spell-preview-overlay]")
      || event.relatedTarget?.closest?.("[data-combat-preview-key]")
    ) {
      return;
    }

    if (!state.activeCombatPreviewKey) {
      return;
    }

    clearActiveCombatPreview();
    syncCombatSpellPreviewOverlayMarkup();
    return;
  }

  if (!previewTrigger) {
    return;
  }

  if (
    (event.relatedTarget && previewTrigger.contains(event.relatedTarget))
    || event.relatedTarget?.closest?.("[data-combat-spell-preview-overlay]")
  ) {
    return;
  }

  if (!state.activeCombatPreviewKey) {
    return;
  }

  clearActiveCombatPreview();
  syncCombatSpellPreviewOverlayMarkup();
}

function handleFocusIn(event) {
  const overviewTooltipTrigger = event.target.closest("[data-character-overview-tooltip]");

  if (overviewTooltipTrigger) {
    showCharacterOverviewHeaderTooltip(overviewTooltipTrigger);
  }

  const previewTrigger = event.target.closest("[data-combat-preview-key]");

  if (!previewTrigger) {
    return;
  }

  const previewKey = cleanText(previewTrigger.dataset.combatPreviewKey);
  const previewKind = cleanText(previewTrigger.dataset.combatPreviewKind);

  if (!previewKey || !previewKind || (state.activeCombatPreviewKey === previewKey && state.activeCombatPreviewKind === previewKind)) {
    return;
  }

  setActiveCombatPreviewFromTrigger(previewTrigger);
  syncCombatSpellPreviewOverlayMarkup();
}

function handleFocusOut(event) {
  const overviewTooltipTrigger = event.target.closest("[data-character-overview-tooltip]");

  if (overviewTooltipTrigger) {
    if (event.relatedTarget && overviewTooltipTrigger.contains(event.relatedTarget)) {
      return;
    }

    if (!event.relatedTarget?.closest?.("[data-character-overview-tooltip]")) {
      hideCharacterOverviewHeaderTooltip();
    }
  }

  const previewTrigger = event.target.closest("[data-combat-preview-key]");

  if (!previewTrigger) {
    return;
  }

  if (event.relatedTarget && previewTrigger.contains(event.relatedTarget)) {
    return;
  }

  if (!state.activeCombatPreviewKey) {
    return;
  }

  clearActiveCombatPreview();
  syncCombatSpellPreviewOverlayMarkup();
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

function handlePointerDown(event) {
  if (
    state.combatTurnQuickMenu?.combatantId
    && !event.target.closest("[data-combat-turn-quick-menu]")
    && !event.target.closest("[data-combat-turn-token-context]")
  ) {
    closeCombatTurnQuickMenu();
    render();
    return;
  }

  if (
    state.combatMaxHpRestoreMenu?.combatantId
    && !event.target.closest("[data-combat-maxhp-restore-menu]")
    && !event.target.closest("[data-combat-pgmax-restore-context]")
  ) {
    closeCombatMaxHpRestoreMenu();
    render();
    return;
  }

  if (event.target.closest("[data-diary-command]")) {
    event.preventDefault();
    return;
  }

  const resizeHandle = event.target.closest("[data-table-resize-handle]");

  if (!resizeHandle) {
    return;
  }

  const tableId = cleanText(resizeHandle.dataset.tableId);
  const columnId = cleanText(resizeHandle.dataset.tableColumnId);
  const headerCell = resizeHandle.closest("th");
  const startWidth = Math.max(72, Math.round(headerCell?.getBoundingClientRect().width || 0));

  if (!tableId || !columnId || !startWidth) {
    return;
  }

  activeTableColumnResize = {
    pointerId: event.pointerId,
    tableId,
    columnId,
    startX: event.clientX,
    startWidth
  };
  document.body.classList.add("is-table-resizing");
  event.preventDefault();
}

function handleContextMenu(event) {
  const diaryTag = event.target.closest("[data-diary-tag-filter]");

  if (diaryTag) {
    event.preventDefault();
    openDiaryTagColorPicker(diaryTag, cleanText(diaryTag.dataset.diaryTagFilter));
    return;
  }

  const statusToken = event.target.closest("[data-combat-turn-status-remove]");

  if (statusToken) {
    event.preventDefault();
    toggleCombatantStatus(statusToken.dataset.combatantId, statusToken.dataset.combatStatus);
    saveCombatTrackerState();
    render();
    return;
  }

  const maxHpRestoreTrigger = event.target.closest("[data-combat-pgmax-restore-context]");

  if (maxHpRestoreTrigger) {
    const combatantId = cleanText(maxHpRestoreTrigger.dataset.combatPgmaxRestoreContext);
    const combatant = state.combatants.find((entry) => entry.id === combatantId);

    if (combatant && toNumber(combatant.necrotic) > 0) {
      event.preventDefault();
      openCombatMaxHpRestoreMenu(combatantId, event.clientX, event.clientY);
      render();
      return;
    }
  }

  const turnToken = event.target.closest("[data-combat-turn-token-context]");

  if (!turnToken) {
    return;
  }

  event.preventDefault();
  openCombatTurnQuickMenu(turnToken.dataset.combatTurnTokenContext, event.clientX, event.clientY);
  render({
    focusSelector: "[data-combat-turn-quick-value]"
  });
}

function handlePointerMove(event) {
  if (!activeTableColumnResize || event.pointerId !== activeTableColumnResize.pointerId) {
    return;
  }

  const nextWidth = Math.max(72, Math.round(activeTableColumnResize.startWidth + (event.clientX - activeTableColumnResize.startX)));
  setTableColumnWidth(activeTableColumnResize.tableId, activeTableColumnResize.columnId, nextWidth);
  applyTableColumnWidthPreview(activeTableColumnResize.tableId, activeTableColumnResize.columnId, nextWidth);
  event.preventDefault();
}

function handlePointerUp(event) {
  if (!activeTableColumnResize || (event.pointerId !== undefined && event.pointerId !== activeTableColumnResize.pointerId)) {
    return;
  }

  activeTableColumnResize = null;
  document.body.classList.remove("is-table-resizing");
  saveTablesState();
  render();
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
      loadDataCsvFileOptions();
    });
  });
}

function getCompendiumStatus(kind) {
  if (kind === "bestiary") {
    return state.bestiaryStatus;
  }

  if (kind === "items") {
    return state.itemStatus;
  }

  if (kind === "arcanum") {
    return state.arcanumStatus;
  }

  return "";
}

function getRequiredCompendiumsForScreen(screenId) {
  if (["combat-tracker", "initiative-board", "bestiary"].includes(screenId)) {
    return ["bestiary"];
  }

  if (screenId === "items") {
    return ["items"];
  }

  if (screenId === "arcanum") {
    return ["arcanum"];
  }

  if (screenId === "characters") {
    return ["items", "arcanum"];
  }

  if (screenId === "tables") {
    return ["items", "arcanum"];
  }

  if (screenId === "diary") {
    return ["bestiary", "items", "arcanum"];
  }

  return [];
}

function queueCompendiumLoadsForScreen(screenId) {
  getRequiredCompendiumsForScreen(screenId).forEach((kind, index) => {
    queueCompendiumLoad(kind, index * 80);
  });
}

function queueCompendiumLoad(kind, delay = 0) {
  if (
    typeof window === "undefined"
    || getCompendiumStatus(kind) !== "idle"
    || compendiumLoadPromises[kind]
    || queuedCompendiumLoads.has(kind)
  ) {
    return;
  }

  queuedCompendiumLoads.add(kind);
  const loadGeneration = compendiumLoadGeneration;
  window.setTimeout(() => {
    queuedCompendiumLoads.delete(kind);

    if (loadGeneration !== compendiumLoadGeneration) {
      return;
    }

    ensureCompendiumLoaded(kind);
  }, Math.max(0, delay));
}

function ensureCompendiumLoaded(kind) {
  if (getCompendiumStatus(kind) === "ready") {
    return Promise.resolve();
  }

  if (compendiumLoadPromises[kind]) {
    return compendiumLoadPromises[kind];
  }

  const loader = kind === "bestiary"
    ? loadBestiary
    : kind === "items"
      ? loadItems
      : kind === "arcanum"
        ? loadArcanum
        : null;

  if (!loader) {
    return Promise.resolve();
  }

  const loadPromise = loader().finally(() => {
    if (compendiumLoadPromises[kind] === loadPromise) {
      compendiumLoadPromises[kind] = null;
    }
  });

  compendiumLoadPromises[kind] = loadPromise;
  return loadPromise;
}

function isAppBootLoading() {
  return state.bestiary.length === 0 && state.bestiaryStatus === "loading";
}

function getAppBootProgress() {
  const statuses = [
    {
      label: "Bestiario",
      status: state.bestiaryStatus === "idle" ? "loading" : state.bestiaryStatus
    }
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

function renderDiaryHarptosDayNoteDialog() {
  if (!state.diaryHarptosDayNoteDialogOpen) {
    return "";
  }

  const dateLabel = formatDiaryHarptosDayLabel(
    state.diaryHarptosDayNoteDialogPeriodId,
    state.diaryHarptosDayNoteDialogDay,
    state.diaryHarptosDayNoteDialogYear,
    { includeYear: true }
  );

  return `
    <div class="campaign-save-dialog diary-harptos-day-note-dialog" role="presentation">
      <div
        class="campaign-save-dialog__backdrop"
        data-action="dismiss-diary-harptos-day-note-dialog"
        aria-hidden="true"
      ></div>
      <section
        class="campaign-save-dialog__panel diary-harptos-day-note-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-harptos-day-note-dialog-title"
      >
        <p class="campaign-save-dialog__eyebrow">${escapeHtml(t("diary_harptos_overview_button"))}</p>
        <h2 class="campaign-save-dialog__title" id="diary-harptos-day-note-dialog-title">
          ${escapeHtml(dateLabel)}
        </h2>
        <p class="campaign-save-dialog__text">
          ${escapeHtml(t("diary_harptos_day_note_dialog_text"))}
        </p>
        <label class="campaign-save-dialog__field">
          <span>${escapeHtml(t("diary_harptos_day_note_dialog_label"))}</span>
          <input
            class="campaign-save-dialog__input"
            type="text"
            value="${escapeHtml(state.diaryHarptosDayNoteDialogValue)}"
            data-diary-harptos-day-note-dialog-input
            placeholder="${escapeHtml(t("diary_harptos_day_note_dialog_placeholder"))}"
          />
        </label>
        <details class="diary-harptos-day-note-dialog__emoji-picker">
          <summary class="toolbar-button diary-harptos-day-note-dialog__emoji-trigger">
            ${escapeHtml(t("diary_harptos_day_note_dialog_emoji_button"))}
          </summary>
          <div class="diary-harptos-day-note-dialog__emoji-panel">
            <strong>${escapeHtml(t("diary_harptos_day_note_dialog_emoji_title"))}</strong>
            <div class="diary-harptos-day-note-dialog__emoji-grid">
              ${DIARY_HARPTOS_DAY_NOTE_EMOJIS.map((emoji) => `
                <button
                  class="diary-harptos-day-note-dialog__emoji-option"
                  type="button"
                  data-action="insert-diary-harptos-day-note-emoji"
                  data-emoji-value="${escapeHtml(emoji)}"
                  aria-label="${escapeHtml(t("diary_harptos_day_note_dialog_emoji_insert", { emoji }))}"
                >
                  ${escapeHtml(emoji)}
                </button>
              `).join("")}
            </div>
          </div>
        </details>
        <label class="campaign-save-dialog__field">
          <span>${escapeHtml(t("diary_harptos_day_note_dialog_color"))}</span>
          <input
            class="diary-harptos-day-note-dialog__color-input"
            type="color"
            value="${escapeHtml(normalizeDiaryTagColorValue(state.diaryHarptosDayNoteDialogColor) || "#d88d5a")}"
            data-diary-harptos-day-note-dialog-color
          />
        </label>
        <div class="campaign-save-dialog__actions">
          <button
            class="summary-button summary-button--ghost"
            type="button"
            data-action="dismiss-diary-harptos-day-note-dialog"
          >
            ${escapeHtml(t("diary_harptos_day_note_dialog_cancel"))}
          </button>
          <button
            class="summary-button"
            type="button"
            data-action="confirm-diary-harptos-day-note-dialog"
          >
            ${escapeHtml(t("diary_harptos_day_note_dialog_confirm"))}
          </button>
        </div>
      </section>
    </div>
  `;
}

function normalizeDataExchangeCategory(value) {
  const normalizedValue = cleanText(value).toLowerCase();
  return [DATA_EXCHANGE_CATEGORY_CHARACTERS, DATA_EXCHANGE_CATEGORY_ENCOUNTERS, DATA_EXCHANGE_CATEGORY_DIARY].includes(normalizedValue)
    ? normalizedValue
    : "";
}

function getCompendiumCreateFields(kind) {
  return COMPENDIUM_CREATION_FIELDS[kind] ?? [];
}

function createBlankCompendiumDraft(kind) {
  return Object.fromEntries(getCompendiumCreateFields(kind).map((field) => [field.key, ""]));
}

function openImportExportDialog(category) {
  const normalizedCategory = normalizeDataExchangeCategory(category);

  if (!normalizedCategory) {
    return;
  }

  state.importExportDialogOpen = true;
  state.importExportDialogCategory = normalizedCategory;
  state.importExportDialogMode = "menu";
  state.importExportDialogError = "";
  state.importExportCharacterIds = new Set(
    normalizedCategory === DATA_EXCHANGE_CATEGORY_CHARACTERS && state.activeCharacterId
      ? [state.activeCharacterId]
      : []
  );
  state.importExportEncounterIds = new Set(
    normalizedCategory === DATA_EXCHANGE_CATEGORY_ENCOUNTERS
      ? [...state.selectedEncounterIds]
      : []
  );
  state.importExportEncounterFolderIds = new Set(
    normalizedCategory === DATA_EXCHANGE_CATEGORY_ENCOUNTERS
      ? [...state.selectedEncounterFolderIds]
      : []
  );
  state.importExportDiaryNoteIds = new Set(
    normalizedCategory === DATA_EXCHANGE_CATEGORY_DIARY && state.activeDiaryNoteId
      ? [state.activeDiaryNoteId]
      : []
  );
  state.importExportDiaryFolderIds = new Set(
    normalizedCategory === DATA_EXCHANGE_CATEGORY_DIARY && state.activeDiaryFolderId
      ? [state.activeDiaryFolderId]
      : []
  );

  if (
    normalizedCategory === DATA_EXCHANGE_CATEGORY_ENCOUNTERS
    && state.importExportEncounterIds.size === 0
    && state.importExportEncounterFolderIds.size === 0
    && state.activeEncounterId
  ) {
    state.importExportEncounterIds.add(state.activeEncounterId);
  }

  if (
    normalizedCategory === DATA_EXCHANGE_CATEGORY_DIARY
    && state.importExportDiaryNoteIds.size === 0
    && state.importExportDiaryFolderIds.size === 0
    && state.activeDiaryNoteId
  ) {
    state.importExportDiaryNoteIds.add(state.activeDiaryNoteId);
  }
}

function closeImportExportDialog() {
  state.importExportDialogOpen = false;
  state.importExportDialogCategory = "";
  state.importExportDialogMode = "";
  state.importExportDialogError = "";
  state.importExportCharacterIds = new Set();
  state.importExportEncounterIds = new Set();
  state.importExportEncounterFolderIds = new Set();
  state.importExportDiaryNoteIds = new Set();
  state.importExportDiaryFolderIds = new Set();
}

function setImportExportDialogMode(mode) {
  const normalizedMode = cleanText(mode).toLowerCase();

  if (!["menu", "export", "import"].includes(normalizedMode)) {
    return;
  }

  state.importExportDialogMode = normalizedMode;
  state.importExportDialogError = "";
}

function toggleImportExportCharacterSelection(characterId) {
  const normalizedCharacterId = cleanText(characterId);

  if (!normalizedCharacterId) {
    return;
  }

  const nextIds = new Set(state.importExportCharacterIds);

  if (nextIds.has(normalizedCharacterId)) {
    nextIds.delete(normalizedCharacterId);
  } else {
    nextIds.add(normalizedCharacterId);
  }

  state.importExportCharacterIds = nextIds;
  state.importExportDialogError = "";
}

function toggleImportExportEncounterSelection(encounterId) {
  const normalizedEncounterId = cleanText(encounterId);

  if (!normalizedEncounterId) {
    return;
  }

  const nextIds = new Set(state.importExportEncounterIds);

  if (nextIds.has(normalizedEncounterId)) {
    nextIds.delete(normalizedEncounterId);
  } else {
    nextIds.add(normalizedEncounterId);
  }

  state.importExportEncounterIds = nextIds;
  state.importExportDialogError = "";
}

function toggleImportExportEncounterFolderSelection(folderId) {
  const normalizedFolderId = cleanText(folderId);
  const nextIds = new Set(state.importExportEncounterFolderIds);

  if (nextIds.has(normalizedFolderId)) {
    nextIds.delete(normalizedFolderId);
  } else {
    nextIds.add(normalizedFolderId);
  }

  state.importExportEncounterFolderIds = nextIds;
  state.importExportDialogError = "";
}

function toggleAllImportExportCharacters() {
  const allCharacterIds = state.characters.map((character) => character.id).filter(Boolean);
  state.importExportCharacterIds = state.importExportCharacterIds.size === allCharacterIds.length
    ? new Set()
    : new Set(allCharacterIds);
  state.importExportDialogError = "";
}

function toggleAllImportExportEncounters() {
  const allEncounterIds = state.encounters.map((encounter) => encounter.id).filter(Boolean);
  const allFolderIds = state.encounterFolders.map((folder) => folder.id).filter(Boolean);
  const allSelected =
    state.importExportEncounterIds.size === allEncounterIds.length
    && state.importExportEncounterFolderIds.size === allFolderIds.length;

  state.importExportEncounterIds = allSelected ? new Set() : new Set(allEncounterIds);
  state.importExportEncounterFolderIds = allSelected ? new Set() : new Set(allFolderIds);
  state.importExportDialogError = "";
}

function toggleImportExportDiaryNoteSelection(noteId) {
  const normalizedNoteId = cleanText(noteId);

  if (!normalizedNoteId) {
    return;
  }

  const nextIds = new Set(state.importExportDiaryNoteIds);

  if (nextIds.has(normalizedNoteId)) {
    nextIds.delete(normalizedNoteId);
  } else {
    nextIds.add(normalizedNoteId);
  }

  state.importExportDiaryNoteIds = nextIds;
  state.importExportDialogError = "";
}

function toggleImportExportDiaryFolderSelection(folderId) {
  const normalizedFolderId = cleanText(folderId);
  const nextIds = new Set(state.importExportDiaryFolderIds);

  if (nextIds.has(normalizedFolderId)) {
    nextIds.delete(normalizedFolderId);
  } else {
    nextIds.add(normalizedFolderId);
  }

  state.importExportDiaryFolderIds = nextIds;
  state.importExportDialogError = "";
}

function toggleAllImportExportDiary() {
  const allNoteIds = state.diaryNotes.map((note) => note.id).filter(Boolean);
  const allFolderIds = state.diaryFolders.map((folder) => folder.id).filter(Boolean);
  const allSelected =
    state.importExportDiaryNoteIds.size === allNoteIds.length
    && state.importExportDiaryFolderIds.size === allFolderIds.length;

  state.importExportDiaryNoteIds = allSelected ? new Set() : new Set(allNoteIds);
  state.importExportDiaryFolderIds = allSelected ? new Set() : new Set(allFolderIds);
  state.importExportDialogError = "";
}

function getImportExportSelectionCount() {
  if (state.importExportDialogCategory === DATA_EXCHANGE_CATEGORY_CHARACTERS) {
    return state.importExportCharacterIds.size;
  }

  if (state.importExportDialogCategory === DATA_EXCHANGE_CATEGORY_ENCOUNTERS) {
    const { folders, encounters } = getSelectedEncounterExportBundle();
    return folders.length + encounters.length;
  }

  if (state.importExportDialogCategory === DATA_EXCHANGE_CATEGORY_DIARY) {
    const { folders, notes } = getSelectedDiaryExportBundle();
    return folders.length + notes.length;
  }

  return 0;
}

function getSelectedEncounterExportBundle() {
  const selectedFolderIds = new Set(
    [...state.importExportEncounterFolderIds].filter((folderId) => state.encounterFolders.some((folder) => folder.id === folderId))
  );
  const selectedEncounterIds = new Set(
    [...state.importExportEncounterIds].filter((encounterId) => state.encounters.some((encounter) => encounter.id === encounterId))
  );

  state.encounters.forEach((encounter) => {
    if (selectedFolderIds.has(encounter.folderId ?? "")) {
      selectedEncounterIds.add(encounter.id);
    }
  });

  state.encounters.forEach((encounter) => {
    if (selectedEncounterIds.has(encounter.id) && cleanText(encounter.folderId)) {
      selectedFolderIds.add(cleanText(encounter.folderId));
    }
  });

  return {
    folders: state.encounterFolders
      .filter((folder) => selectedFolderIds.has(folder.id))
      .map((folder) => normalizeStoredEncounterFolder(folder))
      .filter(Boolean),
    encounters: state.encounters
      .filter((encounter) => selectedEncounterIds.has(encounter.id))
      .map((encounter) => normalizeStoredEncounter(encounter))
      .filter(Boolean)
  };
}

function createSelectionExportBasePayload(category) {
  return {
    schema: DATA_EXCHANGE_EXPORT_SCHEMA,
    version: DATA_EXCHANGE_EXPORT_VERSION,
    app: "Mimic Dice",
    exportedAt: new Date().toISOString(),
    campaign: {
      name: cleanText(state.campaignName) || "Campana"
    },
    category
  };
}

function createCharacterSelectionExportPayload() {
  const selectedCharacterIds = new Set(state.importExportCharacterIds);

  return {
    ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_CHARACTERS),
    characterSkills: {
      definitions: state.characterSkillDefinitions
    },
    characters: getCharactersSaveData().filter((character) => selectedCharacterIds.has(character.id))
  };
}

function createEncounterSelectionExportPayload() {
  const { folders, encounters } = getSelectedEncounterExportBundle();

  return {
    ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_ENCOUNTERS),
    encounterInventory: {
      folders,
      systemFolderExpanded: true,
      encounters
    }
  };
}

function createDiarySelectionExportPayload() {
  const { folders, notes, tagColors, harptosDayNotes } = getSelectedDiaryExportBundle();

  return {
    ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_DIARY),
    diary: {
      folders,
      systemFolderExpanded: true,
      notes,
      tagColors,
      harptosDayNotes,
      activeDiaryFolderId: "",
      activeNoteId: ""
    }
  };
}

function buildSelectionExportFileName(category) {
  const campaignSlug = slugify(cleanText(state.campaignName) || "campana") || "campana";
  const categorySlug = category === DATA_EXCHANGE_CATEGORY_CHARACTERS
    ? "personajes"
    : category === DATA_EXCHANGE_CATEGORY_DIARY
      ? "diario"
      : "encuentros";
  return `${campaignSlug}-${categorySlug}.json`;
}

async function saveJsonDataFile(payload, fileName, title) {
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.saveJsonFile === "function") {
    return desktopApi.saveJsonFile(payload, fileName, title);
  }

  downloadJsonFile(payload, fileName);
  return {
    canceled: false,
    fileName
  };
}

async function pickBrowserJsonPayload() {
  if (typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0] ?? null;

      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch {
        resolve(null);
      }
    }, { once: true });
    input.click();
  });
}

async function loadJsonDataFile(title) {
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.loadJsonFile === "function") {
    const result = await desktopApi.loadJsonFile(title);
    return result?.canceled ? null : result?.payload ?? null;
  }

  return pickBrowserJsonPayload();
}

async function confirmImportExportDialog() {
  const category = normalizeDataExchangeCategory(state.importExportDialogCategory);
  const mode = cleanText(state.importExportDialogMode).toLowerCase();

  if (!category || !mode || mode === "menu") {
    state.importExportDialogError = "Elige una accion antes de continuar.";
    render();
    return;
  }

  if (mode === "export") {
    await exportSelectionData(category);
    return;
  }

  await importSelectionData(category);
}

async function exportSelectionData(category) {
  const selectionCount = getImportExportSelectionCount();

  if (selectionCount === 0) {
    state.importExportDialogError = category === DATA_EXCHANGE_CATEGORY_CHARACTERS
      ? "Selecciona al menos un personaje."
      : category === DATA_EXCHANGE_CATEGORY_DIARY
        ? "Selecciona al menos una carpeta o una nota."
        : "Selecciona al menos una carpeta o un encuentro.";
    render();
    return;
  }

  const payload = category === DATA_EXCHANGE_CATEGORY_CHARACTERS
    ? createCharacterSelectionExportPayload()
    : category === DATA_EXCHANGE_CATEGORY_DIARY
      ? createDiarySelectionExportPayload()
      : createEncounterSelectionExportPayload();
  const fileName = buildSelectionExportFileName(category);
  const title = category === DATA_EXCHANGE_CATEGORY_CHARACTERS
    ? "Exportar personajes"
    : category === DATA_EXCHANGE_CATEGORY_DIARY
      ? "Exportar notas"
      : "Exportar encuentros";

  try {
    const result = await saveJsonDataFile(payload, fileName, title);

    if (result?.canceled) {
      return;
    }

    closeImportExportDialog();
    pushNotification({
      title: "Exportacion completada",
      message: category === DATA_EXCHANGE_CATEGORY_CHARACTERS
        ? `${payload.characters.length} personajes exportados.`
        : category === DATA_EXCHANGE_CATEGORY_DIARY
          ? `${payload.diary.folders.length} carpetas y ${payload.diary.notes.length} notas exportadas.`
          : `${payload.encounterInventory.encounters.length} encuentros exportados.`
    });
    render();
  } catch {
    state.importExportDialogError = "No se pudo exportar la seleccion.";
    render();
  }
}

async function importSelectionData(expectedCategory) {
  try {
    const payload = await loadJsonDataFile(
      expectedCategory === DATA_EXCHANGE_CATEGORY_CHARACTERS
        ? "Importar personajes"
        : expectedCategory === DATA_EXCHANGE_CATEGORY_DIARY
          ? "Importar notas"
          : "Importar encuentros"
    );

    if (!payload) {
      return;
    }

    const payloadCategory = normalizeDataExchangeCategory(payload?.category);

    if (payloadCategory !== expectedCategory) {
      state.importExportDialogError = expectedCategory === DATA_EXCHANGE_CATEGORY_CHARACTERS
        ? "Ese JSON no contiene personajes exportados por Mimic Dice."
        : expectedCategory === DATA_EXCHANGE_CATEGORY_DIARY
          ? "Ese JSON no contiene notas exportadas por Mimic Dice."
          : "Ese JSON no contiene encuentros exportados por Mimic Dice.";
      render();
      return;
    }

    if (expectedCategory === DATA_EXCHANGE_CATEGORY_CHARACTERS) {
      importCharactersFromPayload(payload);
    } else if (expectedCategory === DATA_EXCHANGE_CATEGORY_DIARY) {
      importDiaryFromPayload(payload);
    } else {
      importEncountersFromPayload(payload);
    }

    closeImportExportDialog();
    render();
  } catch {
    state.importExportDialogError = "No se pudo importar el JSON seleccionado.";
    render();
  }
}

function rekeyImportedCharacter(character, skillDefinitions) {
  return normalizeStoredCharacter({
    ...character,
    id: createStableId("character"),
    classEntries: ensureCharacterClassEntryCount(character.classEntries, character.isMulticlass ? 2 : 1).map((entry) => ({
      ...entry,
      id: createStableId("character-class")
    })),
    spells: normalizeStoredCharacterSpells(character.spells).map((entry) => ({
      ...entry,
      id: createStableId("character-spell")
    })),
    spellbookAbilities: normalizeStoredCharacterSpellbookAbilities(character.spellbookAbilities).map((entry) => ({
      ...entry,
      id: createStableId("character-spellbook-ability")
    })),
    inventory: normalizeStoredCharacterInventory(character.inventory).map((entry) => ({
      ...entry,
      id: createStableId("character-item")
    }))
  }, skillDefinitions);
}

function importCharactersFromPayload(payload, options = {}) {
  const importedDefinitions = normalizeStoredCharacterSkillDefinitions(payload?.characterSkills?.definitions, payload?.characters);
  const mergedDefinitions = dedupeCharacterSkillDefinitions([
    ...state.characterSkillDefinitions,
    ...importedDefinitions
  ]);
  const importedCharacters = normalizeStoredCharacters(payload?.characters, mergedDefinitions)
    .map((character) => rekeyImportedCharacter(character, mergedDefinitions))
    .filter(Boolean);

  if (importedCharacters.length === 0) {
    throw new Error("No characters in payload.");
  }

  state.characterSkillDefinitions = mergedDefinitions;
  state.characters = [...importedCharacters, ...state.characters];
  state.activeCharacterId = importedCharacters[0]?.id ?? state.activeCharacterId;
  state.selectedCharacterIds = new Set(importedCharacters[0]?.id ? [importedCharacters[0].id] : []);
  saveCharacterSkillDefinitions();
  saveCharacters();
  if (options.notify !== false) {
    pushNotification({
      title: "Importacion completada",
      message: `${importedCharacters.length} personajes anadidos.`
    });
  }
  return { entityIds: importedCharacters.map((character) => character.id) };
}

function importEncountersFromPayload(payload, options = {}) {
  const normalizedInventory = normalizeStoredEncounterInventory(payload?.encounterInventory);
  const folderIdMap = new Map();
  const importedFolders = normalizedInventory.folders.map((folder) => {
    const nextId = createStableId("encounter-folder");
    folderIdMap.set(folder.id, nextId);
    return normalizeStoredEncounterFolder({
      ...folder,
      id: nextId,
      isExpanded: true
    });
  }).filter(Boolean);
  const importedEncounters = normalizedInventory.encounters.map((encounter) => normalizeStoredEncounter({
    ...encounter,
    id: createStableId("encounter"),
    folderId: folderIdMap.get(encounter.folderId) ?? "",
    rows: Array.isArray(encounter.rows)
      ? encounter.rows.map((row) => ({
        ...row,
        id: createStableId("encounter-row")
      }))
      : []
  })).filter(Boolean);

  if (importedFolders.length === 0 && importedEncounters.length === 0) {
    throw new Error("No encounters in payload.");
  }

  state.encounterFolders = [...state.encounterFolders, ...importedFolders];
  state.encounters = [...state.encounters, ...importedEncounters];
  state.activeEncounterId = importedEncounters[0]?.id ?? state.activeEncounterId;
  state.activeEncounterFolderId = importedEncounters[0]?.folderId ?? importedFolders[0]?.id ?? state.activeEncounterFolderId;
  state.selectedEncounterIds = new Set();
  state.selectedEncounterFolderIds = new Set();
  saveEncounterInventory();
  if (options.notify !== false) {
    pushNotification({
      title: "Importacion completada",
      message: `${importedEncounters.length} encuentros anadidos.`
    });
  }
  return {
    entityIds: importedEncounters.map((encounter) => encounter.id),
    folderIds: importedFolders.map((folder) => folder.id)
  };
}

function importDiaryFromPayload(payload, options = {}) {
  const source = isPlainObject(payload?.diary) ? payload.diary : {};
  const importedFoldersSource = Array.isArray(source.folders)
    ? source.folders.map((folder) => normalizeStoredDiaryFolder(folder)).filter(Boolean)
    : [];
  const importedNotesSource = Array.isArray(source.notes)
    ? source.notes.map((note) => normalizeStoredDiaryNote(note)).filter(Boolean)
    : [];
  const importedTagColors = normalizeStoredDiaryTagColors(source.tagColors);
  const importedHarptosDayNotes = normalizeStoredDiaryHarptosDayNotes(source.harptosDayNotes);
  const folderIdMap = new Map();
  const importedFolders = importedFoldersSource.map((folder) => {
    const nextId = createStableId("diary-folder");
    folderIdMap.set(folder.id, nextId);
    return normalizeStoredDiaryFolder({
      ...folder,
      id: nextId,
      isExpanded: true
    });
  }).filter(Boolean);
  const importedNotes = importedNotesSource.map((note) => normalizeStoredDiaryNote({
    ...note,
    id: createStableId("diary-note"),
    folderId: folderIdMap.get(note.folderId) ?? ""
  })).filter(Boolean);

  if (
    importedFolders.length === 0
    && importedNotes.length === 0
    && Object.keys(importedHarptosDayNotes).length === 0
  ) {
    throw new Error("No diary entries in payload.");
  }

  state.diaryFolders = [...state.diaryFolders, ...importedFolders];
  state.diaryNotes = [...importedNotes, ...state.diaryNotes];
  state.diaryTagColors = {
    ...state.diaryTagColors,
    ...importedTagColors
  };
  state.diaryHarptosDayNotes = {
    ...state.diaryHarptosDayNotes,
    ...importedHarptosDayNotes
  };

  if (importedNotes[0]?.id) {
    state.activeDiaryNoteId = importedNotes[0].id;
    state.activeDiaryFolderId = importedNotes[0].folderId ?? "";
  } else if (importedFolders[0]?.id) {
    state.activeDiaryFolderId = importedFolders[0].id;
  }

  reconcileDiaryUiState();
  saveDiaryState();
  if (options.notify !== false) {
    pushNotification({
      title: "Importacion completada",
      message: `${importedFolders.length} carpetas y ${importedNotes.length} notas anadidas.`
    });
  }
  return {
    entityIds: importedNotes.map((note) => note.id),
    folderIds: importedFolders.map((folder) => folder.id),
    dayNotes: importedHarptosDayNotes
  };
}

function openCompendiumCreateDialog(kind) {
  if (!COMPENDIUM_CREATION_FIELDS[kind]) {
    return;
  }

  state.compendiumCreateDialogOpen = true;
  state.compendiumCreateKind = kind;
  state.compendiumCreateMode = "create";
  state.compendiumEditRowKey = "";
  state.compendiumCreateDraft = createBlankCompendiumDraft(kind);
  state.compendiumCreateError = "";
}

function closeCompendiumCreateDialog() {
  state.compendiumCreateDialogOpen = false;
  state.compendiumCreateKind = "";
  state.compendiumCreateMode = "create";
  state.compendiumEditRowKey = "";
  state.compendiumCreateDraft = {};
  state.compendiumCreateError = "";
}

function getCompendiumEntryById(repositoryKey, entryId) {
  return getCurrentCompendiumEntries(repositoryKey)
    .find((entry) => cleanText(entry?.id) === cleanText(entryId)) || null;
}

async function openCompendiumEditDialog(repositoryKey, entryId) {
  const entry = getCompendiumEntryById(repositoryKey, entryId);

  if (!entry?.isCustom) {
    return;
  }

  try {
    const currentText = await loadRepositoryCsvRawText(repositoryKey);
    const rowKey = cleanText(entry.repositoryRowKey);
    const sourceRow = parseCsv(currentText)
      .find((row) => getCloudCatalogCompendiumRowKey(repositoryKey, row) === rowKey);

    if (!sourceRow) {
      throw new Error("No se encontró la entidad personalizada en el CSV activo.");
    }

    state.compendiumCreateDialogOpen = true;
    state.compendiumCreateKind = repositoryKey;
    state.compendiumCreateMode = "edit";
    state.compendiumEditRowKey = rowKey;
    state.compendiumCreateDraft = Object.fromEntries(getCompendiumCreateFields(repositoryKey)
      .map((field) => [field.key, String(sourceRow[field.key] ?? "")]));
    state.compendiumCreateError = "";
    render();
  } catch (error) {
    pushNotification({
      title: "No se pudo editar",
      message: getErrorMessage(error) || "No se pudo leer la entidad personalizada.",
      tone: "danger"
    });
    render();
  }
}

function getCompendiumCustomMap(repositoryKey) {
  if (repositoryKey === "bestiary") {
    return state.customBestiaryImageMap;
  }

  if (repositoryKey === "items") {
    return state.customItemImageMap;
  }

  return state.customArcanumMap;
}

function saveCompendiumCustomMap(repositoryKey, value) {
  if (repositoryKey === "bestiary") {
    saveBestiaryCustomImageMap(value);
  } else if (repositoryKey === "items") {
    saveItemCustomImageMap(value);
  } else {
    saveArcanumCustomMap(value);
  }
}

function getCompendiumCustomMapKeys(repositoryKey, row) {
  const name = cleanText(row?.Name);
  const source = cleanText(row?.Source);
  const level = cleanText(row?.Level);
  const directKey = repositoryKey === "arcanum"
    ? `${name}||${source}||${level}`.toLowerCase()
    : `${name}||${source}`.toLowerCase();
  const compositeKey = repositoryKey === "bestiary"
    ? buildBestiaryCompositeKey(name, source)
    : repositoryKey === "items"
      ? buildItemCompositeKey(name, source)
      : buildArcanumCompositeKey(name, source, level);

  return [...new Set([
    directKey,
    getCloudCatalogCompendiumRowKey(repositoryKey, row).toLowerCase(),
    cleanText(compositeKey).toLowerCase()
  ].filter(Boolean))];
}

function moveCompendiumCustomMapEntry(repositoryKey, previousRow, nextRow = null) {
  const currentMap = { ...getCompendiumCustomMap(repositoryKey) };
  const previousKeys = getCompendiumCustomMapKeys(repositoryKey, previousRow);
  const preservedValue = previousKeys
    .find((key) => Object.prototype.hasOwnProperty.call(currentMap, key));
  const value = preservedValue ? currentMap[preservedValue] : undefined;

  previousKeys.forEach((key) => delete currentMap[key]);

  if (nextRow && value !== undefined) {
    const [nextKey] = getCompendiumCustomMapKeys(repositoryKey, nextRow);
    currentMap[nextKey] = value;
  }

  saveCompendiumCustomMap(repositoryKey, currentMap);
}

function updateCloudImportRefsAfterCompendiumEdit(repositoryKey, previousRowKey, nextRowKey = "", nextMapKey = "") {
  const sourceType = getCloudCatalogCompendiumType(repositoryKey);
  state.cloudImportedEntries = state.cloudImportedEntries.flatMap((record) => {
    if (
      cleanText(record?.sourceType).toLowerCase() !== sourceType
      || cleanText(record?.localRefs?.repositoryKey) !== repositoryKey
      || cleanText(record?.localRefs?.rowKey) !== previousRowKey
    ) {
      return [record];
    }

    if (!nextRowKey) {
      return [];
    }

    return [{
      ...record,
      localRefs: {
        ...record.localRefs,
        rowKey: nextRowKey,
        mapKey: nextMapKey
      }
    }];
  });
  const importRecordIds = new Set(state.cloudImportedEntries.map((record) => record.id));
  state.cloudImportUpdateCandidates = state.cloudImportUpdateCandidates
    .filter((candidate) => importRecordIds.has(candidate.record?.id));
  state.cloudImportUpdateSelectedIds = new Set([...state.cloudImportUpdateSelectedIds]
    .filter((recordId) => importRecordIds.has(recordId)));
}

async function deleteCustomCompendiumEntity(repositoryKey, entryId) {
  const entry = getCompendiumEntryById(repositoryKey, entryId);

  if (!entry?.isCustom || !window.confirm(`¿Eliminar “${entry.name}” del CSV activo?`)) {
    return;
  }

  try {
    const currentText = await loadRepositoryCsvRawText(repositoryKey);
    const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
    const headers = extractCsvHeaders(currentText, getCompendiumCsvHeaders(repositoryKey));
    const rowKey = cleanText(entry.repositoryRowKey);
    let deletedRow = null;
    const rows = parseCsv(currentText).flatMap((row) => {
      if (getCloudCatalogCompendiumRowKey(repositoryKey, row) === rowKey) {
        deletedRow = row;
        return [];
      }

      return [Object.fromEntries(headers.map((header) => [header, String(row?.[header] ?? "")]))];
    });

    if (!deletedRow) {
      throw new Error("No se encontró la entidad personalizada en el CSV activo.");
    }

    await writeRepositoryCsvRawText(repositoryKey, serializeCsvRows(headers, rows, lineBreak));
    moveCompendiumCustomMapEntry(repositoryKey, deletedRow);
    updateCloudImportRefsAfterCompendiumEdit(repositoryKey, rowKey);
    scheduleDesktopCampaignDirtyStateSync(60);
    await reloadCompendiumRepository(repositoryKey);
    pushNotification({
      title: "Entidad eliminada",
      message: `${entry.name} ya no está en ${COMPENDIUM_REPOSITORY_LABELS[repositoryKey] || "el catálogo"}.`
    });
    render();
  } catch (error) {
    pushNotification({
      title: "No se pudo eliminar",
      message: getErrorMessage(error) || "No se pudo actualizar el CSV activo.",
      tone: "danger"
    });
    render();
  }
}

function updateCompendiumCreateDraftField(key, value) {
  const normalizedKey = cleanText(key);

  if (!normalizedKey) {
    return;
  }

  state.compendiumCreateDraft = {
    ...state.compendiumCreateDraft,
    [normalizedKey]: value
  };
  state.compendiumCreateError = "";
}

function getCompendiumCsvHeaders(kind) {
  return getCompendiumCreateFields(kind).map((field) => field.key);
}

function buildCompendiumDraftRow(kind) {
  const headers = getCompendiumCsvHeaders(kind);
  return Object.fromEntries(headers.map((header) => [header, cleanText(state.compendiumCreateDraft[header])]));
}

function validateCompendiumDraft(kind, row) {
  const requiredFields = getCompendiumCreateFields(kind).filter((field) => field.required);
  const missingField = requiredFields.find((field) => !cleanText(row[field.key]));

  if (missingField) {
    return `${missingField.label} es obligatorio.`;
  }

  return "";
}

function extractCsvHeaders(csvText, fallbackHeaders = []) {
  const text = String(csvText || "");
  let current = "";
  let inQuotes = false;
  const cells = [];

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === ",") {
      cells.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (character === "\n" || character === "\r")) {
      cells.push(current);

      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      return cells.map((cell) => cell.replace(/^\uFEFF/, ""));
    }

    current += character;
  }

  if (current || cells.length > 0) {
    cells.push(current);
  }

  return cells.length > 0 ? cells.map((cell) => cell.replace(/^\uFEFF/, "")) : [...fallbackHeaders];
}

function escapeCsvCell(value) {
  const normalizedValue = String(value ?? "");
  return `"${normalizedValue.replace(/"/g, "\"\"")}"`;
}

function serializeCsvRows(headers, rows, lineBreak = "\n") {
  const safeHeaders = Array.isArray(headers) && headers.length > 0 ? headers : [];
  const lines = [
    safeHeaders.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => safeHeaders.map((header) => escapeCsvCell(row?.[header] ?? "")).join(","))
  ];
  return `${lines.join(lineBreak)}${lineBreak}`;
}

async function loadRepositoryCsvRawText(repositoryKey) {
  const pathValue = getRepositoryCsvPath(repositoryKey);
  const desktopApi = getDesktopCampaignApi();

  if (isUploadedRepositoryCsvPath(pathValue)) {
    const upload = await ensureRepositoryCsvUploadLoaded(repositoryKey, pathValue);
    return String(upload?.text || "");
  }

  if (isExternalRepositoryCsvPath(pathValue)) {
    const externalPath = decodeExternalRepositoryCsvPath(pathValue);

    if (typeof desktopApi?.readRepositoryCsvText !== "function" || !externalPath) {
      throw new Error("External CSV reader unavailable.");
    }

    return desktopApi.readRepositoryCsvText(externalPath);
  }

  return loadTextAsset(getDataAssetUrl(pathValue), pathValue);
}

async function writeRepositoryCsvRawText(repositoryKey, content) {
  const pathValue = getRepositoryCsvPath(repositoryKey);
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.writeRepositoryCsvText === "function" && !isUploadedRepositoryCsvPath(pathValue)) {
    return desktopApi.writeRepositoryCsvText(pathValue, content);
  }

  const baseDisplayName = getActiveRepositoryCsvDisplayName(repositoryKey).replace(/\.csv$/i, "") || `${repositoryKey}-custom`;
  const uploadFileName = `${baseDisplayName}.csv`;
  const uploadPath = encodeUploadedRepositoryCsvPath(repositoryKey, uploadFileName);
  const uploadRecord = {
    repositoryKey,
    path: uploadPath,
    name: uploadFileName,
    text: String(content)
  };

  await saveRepositoryCsvUploadRecord(uploadRecord);
  setRepositoryCsvUpload(repositoryKey, uploadRecord);
  state.repositoryCsvPaths = {
    ...state.repositoryCsvPaths,
    [repositoryKey]: uploadPath
  };
  saveCampaignMeta();

  return {
    ok: true,
    filePath: uploadPath
  };
}

async function reloadCompendiumRepository(repositoryKey) {
  if (repositoryKey === "bestiary") {
    await loadBestiary();
    return;
  }

  if (repositoryKey === "items") {
    await loadItems();
    return;
  }

  if (repositoryKey === "arcanum") {
    await loadArcanum();
  }
}

function selectCompendiumEntryAfterCreate(repositoryKey, row) {
  if (repositoryKey === "bestiary") {
    state.bestiarySelectedId = buildBestiaryCompositeKey(row.Name, row.Source);
    resetBestiaryVirtualScroll();
    return;
  }

  if (repositoryKey === "items") {
    state.itemSelectedId = buildItemCompositeKey(row.Name, row.Source);
    resetItemVirtualScroll();
    return;
  }

  if (repositoryKey === "arcanum") {
    state.arcanumSelectedId = buildArcanumCompositeKey(row.Name, row.Source, row.Level);
    resetArcanumVirtualScroll();
  }
}

async function saveCompendiumEntityFromDialog() {
  const repositoryKey = cleanText(state.compendiumCreateKind);
  const editMode = state.compendiumCreateMode === "edit";
  const row = buildCompendiumDraftRow(repositoryKey);
  const validationError = validateCompendiumDraft(repositoryKey, row);

  if (validationError) {
    state.compendiumCreateError = validationError;
    render();
    return;
  }

  try {
    const currentText = await loadRepositoryCsvRawText(repositoryKey);
    const parsedRows = parseCsv(currentText);
    const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
    const headers = extractCsvHeaders(currentText, getCompendiumCsvHeaders(repositoryKey));
    const normalizedRows = parsedRows.map((entry) => Object.fromEntries(headers.map((header) => [header, String(entry?.[header] ?? "")])));
    const nextRowKey = getCloudCatalogCompendiumRowKey(repositoryKey, row);
    const editRowKey = cleanText(state.compendiumEditRowKey);
    const editIndex = editMode
      ? parsedRows.findIndex((entry) => getCloudCatalogCompendiumRowKey(repositoryKey, entry) === editRowKey)
      : -1;

    if (editMode && editIndex < 0) {
      throw new Error("No se encontró la entidad personalizada que querías editar.");
    }

    const duplicateIndex = parsedRows.findIndex((entry, index) => (
      index !== editIndex
      && getCloudCatalogCompendiumRowKey(repositoryKey, entry) === nextRowKey
    ));

    if (duplicateIndex >= 0) {
      throw new Error("Ya existe una entidad con el mismo nombre, fuente y nivel.");
    }

    const previousRow = editMode ? parsedRows[editIndex] : null;
    const replacementRow = editMode ? { ...previousRow, ...row } : row;
    const nextRows = editMode
      ? normalizedRows.map((entry, index) => index === editIndex
        ? Object.fromEntries(headers.map((header) => [header, String(replacementRow?.[header] ?? "")]))
        : entry)
      : [...normalizedRows, row];
    const nextText = serializeCsvRows(headers, nextRows, lineBreak);

    await writeRepositoryCsvRawText(repositoryKey, nextText);

    if (editMode) {
      const nextMapKey = getCompendiumCustomMapKeys(repositoryKey, replacementRow)[0] || "";
      moveCompendiumCustomMapEntry(repositoryKey, previousRow, replacementRow);
      updateCloudImportRefsAfterCompendiumEdit(repositoryKey, editRowKey, nextRowKey, nextMapKey);
    }

    scheduleDesktopCampaignDirtyStateSync(60);
    await reloadCompendiumRepository(repositoryKey);
    selectCompendiumEntryAfterCreate(repositoryKey, replacementRow);
    closeCompendiumCreateDialog();
    pushNotification({
      title: editMode ? "Entidad actualizada" : "Entidad creada",
      message: editMode
        ? `${cleanText(replacementRow.Name)} guardada en ${COMPENDIUM_REPOSITORY_LABELS[repositoryKey] || "el catálogo"}.`
        : `${COMPENDIUM_KIND_LABELS[repositoryKey] || "Entidad"} anadida a ${COMPENDIUM_REPOSITORY_LABELS[repositoryKey] || "repositorio"}.`
    });
    render();
  } catch (error) {
    const message = getErrorMessage(error);
    state.compendiumCreateError = message
      ? `No se pudo ${editMode ? "actualizar" : "guardar"} la entidad en el CSV activo. ${message}`
      : "No se pudo guardar la entidad en el CSV activo.";
    render();
  }
}

function renderImportExportDialog() {
  if (!state.importExportDialogOpen) {
    return "";
  }

  const category = normalizeDataExchangeCategory(state.importExportDialogCategory);
  const title = category === DATA_EXCHANGE_CATEGORY_CHARACTERS
    ? "Personajes"
    : category === DATA_EXCHANGE_CATEGORY_DIARY
      ? "Notas"
      : "Encuentros";
  const mode = cleanText(state.importExportDialogMode).toLowerCase() || "menu";
  const selectionCount = getImportExportSelectionCount();

  return `
    <div class="campaign-save-dialog data-exchange-dialog" role="presentation">
      <button
        class="campaign-save-dialog__backdrop"
        type="button"
        data-action="dismiss-import-export-dialog"
        aria-label="Cerrar dialogo de importacion y exportacion"
      ></button>
      <section
        class="campaign-save-dialog__panel data-exchange-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-exchange-dialog-title"
      >
        <p class="campaign-save-dialog__eyebrow">${escapeHtml(t("import_export_title"))}</p>
        <h2 class="campaign-save-dialog__title" id="data-exchange-dialog-title">${escapeHtml(title)}</h2>
        <p class="campaign-save-dialog__text">
          ${escapeHtml(
            mode === "menu"
              ? t("import_export_prompt_menu", { title: title.toLowerCase() })
              : mode === "export"
                ? t("import_export_prompt_export", { title: title.toLowerCase() })
                : t("import_export_prompt_import", { title: title.toLowerCase() })
          )}
        </p>
        ${
          mode === "menu"
            ? renderImportExportModePicker()
            : mode === "export"
              ? renderImportExportSelectionPanel(category)
              : renderImportExportImportPanel(category)
        }
        ${
          state.importExportDialogError
            ? `<p class="campaign-save-dialog__error">${escapeHtml(state.importExportDialogError)}</p>`
            : ""
        }
        <div class="campaign-save-dialog__actions">
          <button class="toolbar-button" type="button" data-action="${mode === "menu" ? "dismiss-import-export-dialog" : "set-import-export-mode"}" ${mode === "menu" ? "" : 'data-import-export-mode="menu"'}>
            ${escapeHtml(mode === "menu" ? t("import_export_close") : t("import_export_back"))}
          </button>
          ${
            mode === "menu"
              ? ""
              : `
                <button
                  class="toolbar-button toolbar-button--accent"
                  type="button"
                  data-action="confirm-import-export"
                  ${mode === "export" && selectionCount === 0 ? "disabled" : ""}
                >
                  ${escapeHtml(mode === "import" ? t("import_export_confirm_import") : t("import_export_confirm_export"))}
                </button>
              `
          }
        </div>
      </section>
    </div>
  `;
}

function renderImportExportModePicker() {
  return `
    <div class="data-exchange-dialog__mode-grid">
      <button class="data-exchange-dialog__mode-card" type="button" data-action="set-import-export-mode" data-import-export-mode="export">
        <strong>${escapeHtml(t("import_export_mode_export"))}</strong>
        <span>${escapeHtml(t("import_export_mode_export_desc"))}</span>
      </button>
      <button class="data-exchange-dialog__mode-card" type="button" data-action="set-import-export-mode" data-import-export-mode="import">
        <strong>${escapeHtml(t("import_export_mode_import"))}</strong>
        <span>${escapeHtml(t("import_export_mode_import_desc"))}</span>
      </button>
    </div>
  `;
}

function renderImportExportSelectionPanel(category) {
  if (category === DATA_EXCHANGE_CATEGORY_CHARACTERS) {
    return renderCharacterExportSelectionPanel();
  }

  if (category === DATA_EXCHANGE_CATEGORY_DIARY) {
    return renderDiaryExportSelectionPanel();
  }

  return renderEncounterExportSelectionPanel();
}

function renderCharacterExportSelectionPanel() {
  return `
    <div class="data-exchange-dialog__selection-panel">
      <div class="data-exchange-dialog__selection-toolbar">
        <span>${state.importExportCharacterIds.size} seleccionados</span>
        <button class="filter-clear" type="button" data-action="select-all-import-export-characters">
          ${escapeHtml(state.importExportCharacterIds.size === state.characters.length && state.characters.length > 0 ? t("import_export_clear_selection") : t("import_export_select_all"))}
        </button>
      </div>
      <div class="data-exchange-dialog__list" role="list">
        ${
          state.characters.length > 0
            ? state.characters.map((character) => `
              <label class="data-exchange-dialog__list-item" role="listitem">
                <input
                  type="checkbox"
                  data-import-export-character-checkbox="${escapeHtml(character.id)}"
                  ${state.importExportCharacterIds.has(character.id) ? "checked" : ""}
                />
                <div>
                  <strong>${escapeHtml(character.name || "Personaje")}</strong>
                  <span>${escapeHtml(character.className || character.species || "Ficha de personaje")}</span>
                </div>
              </label>
            `).join("")
            : `<div class="empty-state empty-state--compact">No hay personajes para exportar.</div>`
        }
      </div>
    </div>
  `;
}

function renderEncounterExportSelectionPanel() {
  const exportBundle = getSelectedEncounterExportBundle();

  return `
    <div class="data-exchange-dialog__selection-panel">
      <div class="data-exchange-dialog__selection-toolbar">
        <span>${exportBundle.folders.length} carpetas | ${exportBundle.encounters.length} encuentros</span>
        <button class="filter-clear" type="button" data-action="select-all-import-export-encounters">
          ${
            state.importExportEncounterIds.size === state.encounters.length
            && state.importExportEncounterFolderIds.size === state.encounterFolders.length
            && (state.encounters.length > 0 || state.encounterFolders.length > 0)
              ? escapeHtml(t("import_export_clear_selection"))
              : escapeHtml(t("import_export_select_all"))
          }
        </button>
      </div>
      <div class="data-exchange-dialog__list" role="list">
        ${
          state.encounterFolders.length === 0 && state.encounters.length === 0
            ? `<div class="empty-state empty-state--compact">No hay encuentros para exportar.</div>`
            : `
              ${state.encounterFolders.map((folder) => `
                <div class="data-exchange-dialog__encounter-group" role="listitem">
                  <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--folder">
                    <input
                      type="checkbox"
                      data-import-export-encounter-folder-checkbox="${escapeHtml(folder.id)}"
                      ${state.importExportEncounterFolderIds.has(folder.id) ? "checked" : ""}
                    />
                    <div>
                      <strong>${escapeHtml(folder.name || "Carpeta")}</strong>
                      <span>${getEncountersByFolder(folder.id).length} encuentros</span>
                    </div>
                  </label>
                  ${
                    getEncountersByFolder(folder.id).map((encounter) => `
                      <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--child">
                        <input
                          type="checkbox"
                          data-import-export-encounter-checkbox="${escapeHtml(encounter.id)}"
                          ${state.importExportEncounterIds.has(encounter.id) ? "checked" : ""}
                        />
                        <div>
                          <strong>${escapeHtml(encounter.name || "Encuentro")}</strong>
                          <span>${escapeHtml(getEncounterSummaryLabel(encounter))}</span>
                        </div>
                      </label>
                    `).join("")
                  }
                </div>
              `).join("")}
              ${
                getEncountersByFolder("").length > 0
                  ? `
                    <div class="data-exchange-dialog__encounter-group" role="listitem">
                      <p class="data-exchange-dialog__group-label">Sin carpeta</p>
                      ${getEncountersByFolder("").map((encounter) => `
                        <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--child">
                          <input
                            type="checkbox"
                            data-import-export-encounter-checkbox="${escapeHtml(encounter.id)}"
                            ${state.importExportEncounterIds.has(encounter.id) ? "checked" : ""}
                          />
                          <div>
                            <strong>${escapeHtml(encounter.name || "Encuentro")}</strong>
                            <span>${escapeHtml(getEncounterSummaryLabel(encounter))}</span>
                          </div>
                        </label>
                      `).join("")}
                    </div>
                  `
                  : ""
              }
            `
        }
      </div>
    </div>
  `;
}

function renderDiaryExportSelectionPanel() {
  const exportBundle = getSelectedDiaryExportBundle();

  return `
    <div class="data-exchange-dialog__selection-panel">
      <div class="data-exchange-dialog__selection-toolbar">
        <span>${exportBundle.folders.length} carpetas | ${exportBundle.notes.length} notas</span>
        <button class="filter-clear" type="button" data-action="select-all-import-export-diary">
          ${
            state.importExportDiaryNoteIds.size === state.diaryNotes.length
            && state.importExportDiaryFolderIds.size === state.diaryFolders.length
            && (state.diaryNotes.length > 0 || state.diaryFolders.length > 0)
              ? escapeHtml(t("import_export_clear_selection"))
              : escapeHtml(t("import_export_select_all"))
          }
        </button>
      </div>
      <div class="data-exchange-dialog__list" role="list">
        ${
          state.diaryFolders.length === 0 && state.diaryNotes.length === 0
            ? `<div class="empty-state empty-state--compact">No hay notas para exportar.</div>`
            : `
              ${state.diaryFolders.map((folder) => `
                <div class="data-exchange-dialog__encounter-group" role="listitem">
                  <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--folder">
                    <input
                      type="checkbox"
                      data-import-export-diary-folder-checkbox="${escapeHtml(folder.id)}"
                      ${state.importExportDiaryFolderIds.has(folder.id) ? "checked" : ""}
                    />
                    <div>
                      <strong>${escapeHtml(folder.name || "Carpeta")}</strong>
                      <span>${getDiaryNotesByFolder(folder.id).length} notas</span>
                    </div>
                  </label>
                  ${
                    getDiaryNotesByFolder(folder.id).map((note) => `
                      <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--child">
                        <input
                          type="checkbox"
                          data-import-export-diary-note-checkbox="${escapeHtml(note.id)}"
                          ${state.importExportDiaryNoteIds.has(note.id) ? "checked" : ""}
                        />
                        <div>
                          <strong>${escapeHtml(note.title || "Nota")}</strong>
                          <span>${escapeHtml(getDiaryImportExportSummaryLabel(note))}</span>
                        </div>
                      </label>
                    `).join("")
                  }
                </div>
              `).join("")}
              ${
                getDiaryNotesByFolder("").length > 0
                  ? `
                    <div class="data-exchange-dialog__encounter-group" role="listitem">
                      <p class="data-exchange-dialog__group-label">Sin carpeta</p>
                      ${getDiaryNotesByFolder("").map((note) => `
                        <label class="data-exchange-dialog__list-item data-exchange-dialog__list-item--child">
                          <input
                            type="checkbox"
                            data-import-export-diary-note-checkbox="${escapeHtml(note.id)}"
                            ${state.importExportDiaryNoteIds.has(note.id) ? "checked" : ""}
                          />
                          <div>
                            <strong>${escapeHtml(note.title || "Nota")}</strong>
                            <span>${escapeHtml(getDiaryImportExportSummaryLabel(note))}</span>
                          </div>
                        </label>
                      `).join("")}
                    </div>
                  `
                  : ""
              }
            `
        }
      </div>
    </div>
  `;
}

function getEncounterSummaryLabel(encounter) {
  const summary = getEncounterSummary(encounter);
  return `${summary.units} unidades | CR ${formatCrNumber(summary.totalCr)}`;
}

function getDiaryImportExportSummaryLabel(note) {
  const realSummary = formatDiaryRealDateSummary(note) || "Sin fecha";
  const tags = getDiaryNoteTags(note);
  return tags.length > 0 ? `${realSummary} | ${tags.length} tags` : realSummary;
}

function renderImportExportImportPanel(category) {
  return `
    <div class="data-exchange-dialog__import-panel">
      <div class="empty-state empty-state--compact">
        ${
          category === DATA_EXCHANGE_CATEGORY_CHARACTERS
            ? "Se abrira el explorador para elegir un JSON de personajes exportado antes."
            : category === DATA_EXCHANGE_CATEGORY_DIARY
              ? "Se abrira el explorador para elegir un JSON de notas exportado antes."
            : "Se abrira el explorador para elegir un JSON de encuentros exportado antes."
        }
      </div>
    </div>
  `;
}

function renderCompendiumCreateDialog() {
  if (!state.compendiumCreateDialogOpen || !COMPENDIUM_CREATION_FIELDS[state.compendiumCreateKind]) {
    return "";
  }

  const repositoryKey = state.compendiumCreateKind;
  const nounLabel = COMPENDIUM_KIND_LABELS[repositoryKey] || "entidad";
  const repositoryLabel = COMPENDIUM_REPOSITORY_LABELS[repositoryKey] || "repositorio";
  const editMode = state.compendiumCreateMode === "edit";

  return `
    <div class="campaign-save-dialog compendium-create-dialog" role="presentation">
      <button
        class="campaign-save-dialog__backdrop"
        type="button"
        data-action="dismiss-compendium-create-dialog"
        aria-label="Cerrar formulario de ${editMode ? "edición" : "creación"}"
      ></button>
      <section
        class="campaign-save-dialog__panel compendium-create-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compendium-create-dialog-title"
      >
        <p class="campaign-save-dialog__eyebrow">${editMode ? "Editar" : "Crear"} ${escapeHtml(nounLabel)}</p>
        <h2 class="campaign-save-dialog__title" id="compendium-create-dialog-title">${escapeHtml(repositoryLabel)}</h2>
        <p class="campaign-save-dialog__text">${editMode
          ? `Guardar reemplazará esta entidad personalizada en el CSV activo de ${escapeHtml(repositoryLabel)}.`
          : `Guardar escribirá una nueva fila en el CSV activo de ${escapeHtml(repositoryLabel)}.`}</p>
        <div class="compendium-create-dialog__grid">
          ${getCompendiumCreateFields(repositoryKey).map((field) => renderCompendiumCreateField(field)).join("")}
        </div>
        ${
          state.compendiumCreateError
            ? `<p class="campaign-save-dialog__error">${escapeHtml(state.compendiumCreateError)}</p>`
            : ""
        }
        <div class="campaign-save-dialog__actions">
          <button class="toolbar-button" type="button" data-action="dismiss-compendium-create-dialog">
            Cancelar
          </button>
          <button class="toolbar-button toolbar-button--accent" type="button" data-action="save-compendium-entity">
            ${editMode ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderCompendiumCreateField(field) {
  const value = cleanText(state.compendiumCreateDraft[field.key]);
  const isTextArea = field.type === "textarea";
  const inputClass = isTextArea
    ? "campaign-save-dialog__input compendium-create-dialog__textarea"
    : "campaign-save-dialog__input";

  return `
    <label class="campaign-save-dialog__field compendium-create-dialog__field ${isTextArea ? "compendium-create-dialog__field--full" : ""}">
      <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
      ${
        isTextArea
          ? `
            <textarea
              class="${inputClass}"
              data-compendium-create-field="${escapeHtml(field.key)}"
            >${escapeHtml(value)}</textarea>
          `
          : `
            <input
              class="${inputClass}"
              type="${field.type === "number" ? "number" : "text"}"
              value="${escapeHtml(value)}"
              data-compendium-create-field="${escapeHtml(field.key)}"
            />
          `
      }
    </label>
  `;
}

function renderCharacterSpellbookAbilityDescriptionDialog() {
  if (!state.characterSpellbookAbilityDescriptionDialogOpen) {
    return "";
  }

  return `
    <div class="campaign-save-dialog character-ability-description-dialog" role="presentation">
      <div
        class="campaign-save-dialog__backdrop"
        data-action="dismiss-character-spellbook-ability-description-dialog"
        aria-hidden="true"
      ></div>
      <section
        class="campaign-save-dialog__panel character-ability-description-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-ability-description-dialog-title"
      >
        <p class="campaign-save-dialog__eyebrow">Descripcion de habilidad</p>
        <h2 class="campaign-save-dialog__title" id="character-ability-description-dialog-title">
          Editar descripcion
        </h2>
        <p class="campaign-save-dialog__text">
          Escribe texto de ayuda o reglas para esta habilidad.
        </p>
        <label class="campaign-save-dialog__field">
          <span>Descripcion</span>
          <textarea
            class="campaign-save-dialog__input character-ability-description-dialog__input"
            data-character-spellbook-ability-description-input
            placeholder="Describe que hace esta habilidad, limites, coste o notas utiles."
          >${escapeHtml(state.characterSpellbookAbilityDescriptionDialogValue)}</textarea>
        </label>
        <div class="campaign-save-dialog__actions">
          <button
            class="summary-button summary-button--ghost"
            type="button"
            data-action="dismiss-character-spellbook-ability-description-dialog"
          >
            Cancelar
          </button>
          <button
            class="summary-button"
            type="button"
            data-action="save-character-spellbook-ability-description-dialog"
          >
            Guardar descripcion
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderMulticlassLevelUpDialog() {
  const pendingLevelUp = getActiveMulticlassLevelUpPrompt();

  if (!pendingLevelUp) {
    return "";
  }

  const character = state.characters.find((entry) => entry.id === pendingLevelUp.characterId);

  if (!character) {
    return "";
  }

  const classEntries = getCharacterVisibleClassEntries(character);
  const characterName = cleanText(character.name) || "Personaje";
  const stepLabel = pendingLevelUp.totalChoices > 1
    ? `Eleccion ${pendingLevelUp.totalChoices - pendingLevelUp.remainingChoices + 1} de ${pendingLevelUp.totalChoices}`
    : "Elige clase";

  return `
    <div class="campaign-save-dialog multiclass-levelup-dialog" role="presentation">
      <div class="campaign-save-dialog__backdrop" aria-hidden="true"></div>
      <section
        class="campaign-save-dialog__panel multiclass-levelup-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="multiclass-levelup-dialog-title"
      >
        <div class="multiclass-levelup-dialog__header">
          <div class="multiclass-levelup-dialog__header-copy">
            <p class="campaign-save-dialog__eyebrow">Subida de nivel multiclase</p>
            <h2 class="campaign-save-dialog__title" id="multiclass-levelup-dialog-title">
              ${escapeHtml(characterName)}
            </h2>
          </div>
          <div class="multiclass-levelup-dialog__portrait" aria-hidden="true">
            ${
              cleanText(character.tokenUrl)
                ? `<img src="${escapeHtml(character.tokenUrl)}" alt="" loading="lazy" decoding="async" />`
                : `<span>${escapeHtml(getInitials(characterName))}</span>`
            }
          </div>
        </div>
        <p class="campaign-save-dialog__text">
          ${escapeHtml(stepLabel)}. Indica en que clase quieres aplicar esta subida de nivel.
        </p>
        <div class="multiclass-levelup-dialog__choices">
          ${classEntries.map((entry) => renderMulticlassLevelUpChoiceButton(character, pendingLevelUp, entry)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCharacterOverviewHeaderTooltipOverlay() {
  return `
    <div
      class="character-overview-floating-tooltip"
      data-character-overview-floating-tooltip
      role="tooltip"
      aria-hidden="true"
      hidden
    ></div>
  `;
}

function captureRenderViewportState() {
  if (typeof window === "undefined" || lastRenderedScreen !== state.activeScreen) {
    return null;
  }

  return {
    screen: lastRenderedScreen,
    windowX: window.scrollX,
    windowY: window.scrollY,
    containers: [...app.querySelectorAll("[data-render-scroll-key]")].map((element) => ({
      key: element.dataset.renderScrollKey,
      left: element.scrollLeft,
      top: element.scrollTop
    }))
  };
}

function restoreRenderViewportState(viewportState) {
  if (!viewportState || viewportState.screen !== state.activeScreen) {
    return;
  }

  const scrollContainers = new Map(
    [...app.querySelectorAll("[data-render-scroll-key]")]
      .map((element) => [element.dataset.renderScrollKey, element])
  );

  viewportState.containers.forEach(({ key, left, top }) => {
    const element = scrollContainers.get(key);

    if (element) {
      element.scrollLeft = left;
      element.scrollTop = top;
    }
  });

  window.scrollTo(viewportState.windowX, viewportState.windowY);
}

function cancelRenderViewportRestore() {
  if (!scheduledRenderViewportRestore) {
    return;
  }

  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(scheduledRenderViewportRestore);
  } else {
    window.clearTimeout(scheduledRenderViewportRestore);
  }

  scheduledRenderViewportRestore = 0;
}

function scheduleRenderViewportRestore(viewportState) {
  if (!viewportState) {
    return;
  }

  const schedule = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);

  scheduledRenderViewportRestore = schedule(() => {
    scheduledRenderViewportRestore = 0;
    restoreRenderViewportState(viewportState);
  });
}

function restoreRenderFocus(focusState) {
  if (!focusState?.focusSelector) {
    return;
  }

  const target = app.querySelector(focusState.focusSelector);

  if (!target) {
    return;
  }

  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }

  if (typeof focusState.selectionStart === "number" && typeof target.setSelectionRange === "function") {
    target.setSelectionRange(focusState.selectionStart, focusState.selectionEnd ?? focusState.selectionStart);
  }

  if (focusState.scrollIntoView && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    });
  }
}

function render(focusState = null) {
  cancelScheduledRender();
  cancelRenderViewportRestore();
  const viewportState = captureRenderViewportState();

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
            <h1>
              Mimic Dice
              <button
                class="brand__version"
                type="button"
                data-action="open-release-notes-screen"
                data-release-version="${escapeHtml(APP_VERSION)}"
                aria-label="${escapeHtml(state.appLanguage === APP_LANGUAGE_EN ? `Open release notes for ${APP_VERSION}` : `Abrir notas de version de ${APP_VERSION}`)}"
                title="${escapeHtml(state.appLanguage === APP_LANGUAGE_EN ? `Release notes ${APP_VERSION}` : `Notas de version ${APP_VERSION}`)}"
              >
                ${escapeHtml(APP_VERSION)}
              </button>
            </h1>
            <div class="brand__campaign-row">
              ${renderAccountChip()}
              <p class="brand__campaign-name">${escapeHtml(getCampaignDisplayName())}</p>
            </div>
          </div>
        </div>
        ${renderTopbarNavigation()}
        <div class="shell-menu-bar" aria-label="Menus principales">
          ${renderFileMenu()}
        </div>
      </header>
      <main class="workspace">
        ${renderScreen()}
      </main>
      <div data-notification-root>
        ${renderNotifications()}
      </div>
      ${renderCombatSpellPreviewOverlay()}
      ${renderCharacterOverviewHeaderTooltipOverlay()}
      ${renderBootOverlay()}
      ${renderOptionsDialog()}
      ${renderImportExportDialog()}
      ${renderCampaignSaveNameDialog()}
      ${renderDiaryHarptosDayNoteDialog()}
      ${renderCharacterSpellbookAbilityDescriptionDialog()}
      ${renderCompendiumCreateDialog()}
      ${renderMulticlassLevelUpDialog()}
      ${renderAccountDialog()}
      ${renderCloudImportUpdateDialog()}
    </div>
  `;

  if (state.activeScreen === "bestiary") {
    restoreBestiaryListScroll();
  }

  if (state.activeScreen === "items") {
    restoreItemListScroll();
  }

  if (state.activeScreen === "arcanum") {
    restoreArcanumListScroll();
  }

  if (state.activeScreen === "tables") {
    syncRolledTableRowIntoView();
  }

  syncCompendiumLayoutHeights();
  applyInterfaceTranslations(app);
  syncTopbarNavigationMetrics();
  lastRenderedScreen = state.activeScreen;
  restoreRenderViewportState(viewportState);
  restoreRenderFocus(focusState);

  if (!focusState?.scrollIntoView) {
    scheduleRenderViewportRestore(viewportState);
  }

  scheduleActiveCombatSpellbookPopoverSync();
  scheduleActiveCombatSpellPreviewSync();
  activeCharacterOverviewHeaderTooltipElement = null;
  hideCharacterOverviewHeaderTooltip();

  saveCombatTrackerState();

}

function getSafeAccountImageUrl(value) {
  const imageUrl = cleanText(value);

  if (!imageUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(imageUrl, window.location.origin);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.href : "";
  } catch {
    return "";
  }
}

function renderAccountAvatar(user = null) {
  const imageUrl = getSafeAccountImageUrl(user?.image);

  if (imageUrl) {
    return `<img class="account-avatar__image" src="${escapeHtml(imageUrl)}" alt="" referrerpolicy="no-referrer" />`;
  }

  return `
    <svg class="account-avatar__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.35-8 5.25V21h16v-1.75C20 16.35 16.4 14 12 14Z" />
    </svg>
  `;
}

function getAccountDisplayName() {
  return cleanText(state.accountSession?.user?.name)
    || cleanText(state.accountSession?.user?.email)
    || "Invitado";
}

function getCloudAutosaveLabel() {
  if (!state.cloudCampaignId) {
    return "Sin campaña activa en la nube";
  }

  const labels = {
    idle: "Autoguardado preparado",
    pending: "Cambios pendientes",
    saving: "Guardando...",
    saved: state.cloudCampaignUpdatedAt
      ? `Guardado ${formatCampaignSavedAt(state.cloudCampaignUpdatedAt)}`
      : "Guardado",
    error: "Error de autoguardado",
    conflict: "Conflicto: recarga la campaña"
  };
  return labels[state.cloudAutosaveStatus] || labels.idle;
}

function renderAccountChip() {
  const user = state.accountSession?.user ?? null;
  const isAuthenticated = Boolean(user?.id);
  const isSaving = isAuthenticated && state.cloudAutosaveStatus === "saving";

  return `
    <span class="account-chip-root" data-account-chip-root>
      <button
        class="account-chip ${isAuthenticated ? "is-authenticated" : ""}${isSaving ? " is-cloud-busy" : ""}"
        type="button"
        data-action="toggle-account-dialog"
        aria-label="${escapeHtml(isAuthenticated ? `Abrir cuenta de ${getAccountDisplayName()}` : "Abrir acceso de usuario invitado") }"
        title="${escapeHtml(isAuthenticated ? getCloudAutosaveLabel() : "Acceso local como invitado") }"
      >
        <span class="account-avatar">${renderAccountAvatar(user)}</span>
        <span class="account-chip__label">${escapeHtml(getAccountDisplayName())}</span>
        ${isAuthenticated ? `<span class="account-chip__status account-chip__status--${escapeHtml(state.cloudAutosaveStatus)}" aria-hidden="true"></span>` : ""}
      </button>
    </span>
  `;
}

function formatCloudCampaignSize(bytes) {
  const numericBytes = Math.max(0, Number(bytes) || 0);

  if (numericBytes < 1024) {
    return `${numericBytes} B`;
  }

  if (numericBytes < 1024 * 1024) {
    return `${Math.round(numericBytes / 1024)} KB`;
  }

  return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isCloudOperationActive(kind, target) {
  return state.cloudOperationKind === kind && state.cloudOperationTarget === target;
}

function beginCloudOperation(kind, target, options = {}) {
  state.cloudOperationKind = cleanText(kind);
  state.cloudOperationTarget = cleanText(target);

  if (options.renderNow !== false) {
    render();
  }
}

function endCloudOperation(kind, target) {
  if (!isCloudOperationActive(kind, target)) {
    return;
  }

  state.cloudOperationKind = "";
  state.cloudOperationTarget = "";
}

function renderCloudButtonLabel(label, busyLabel, kind, target) {
  const isBusy = isCloudOperationActive(kind, target);

  return `
    <span class="cloud-button-label">
      ${isBusy ? `<span class="cloud-button-spinner" aria-hidden="true"></span>` : ""}
      <span>${escapeHtml(isBusy ? busyLabel : label)}</span>
    </span>
  `;
}

function getCloudButtonBusyClass(kind, target) {
  return isCloudOperationActive(kind, target) ? " is-cloud-busy" : "";
}

function renderCloudButtonBusyAttributes(kind, target) {
  return isCloudOperationActive(kind, target) ? `disabled aria-busy="true"` : "";
}

function renderCloudCampaignCard(campaign, options = {}) {
  const isActive = campaign.id === state.cloudCampaignId;
  const publicLibrary = options.publicLibrary === true;
  const canClone = Boolean(state.accountSession?.user?.id);
  const loadTarget = `campaign:${campaign.id}`;
  const publicLoadTarget = `public-campaign:${campaign.id}`;
  const visibilityTarget = `campaign-visibility:${campaign.id}`;

  return `
    <article class="account-campaign-card ${isActive ? "is-active" : ""}">
      <div class="account-campaign-card__header">
        <div>
          <strong>${escapeHtml(campaign.name || "Campaña sin nombre")}</strong>
          <small>
            ${escapeHtml(formatCampaignSavedAt(campaign.updatedAt) || "Sin fecha")}
            · ${escapeHtml(formatCloudCampaignSize(campaign.payloadBytes))}
            ${publicLibrary ? ` · por ${escapeHtml(campaign.ownerName || "Usuario")}` : ""}
          </small>
        </div>
        <span class="account-campaign-card__visibility ${campaign.isPublic ? "is-public" : ""}">
          ${campaign.isPublic ? "Pública" : "Privada"}
        </span>
      </div>
      <div class="account-campaign-card__actions">
        ${
          publicLibrary
            ? canClone
              ? `<button class="account-action-button${getCloudButtonBusyClass("loading", publicLoadTarget)}" type="button" data-action="clone-cloud-campaign" data-cloud-campaign-id="${escapeHtml(campaign.id)}" ${renderCloudButtonBusyAttributes("loading", publicLoadTarget)}>${renderCloudButtonLabel("Crear copia privada", "Creando copia...", "loading", publicLoadTarget)}</button>`
              : `<button class="account-action-button${getCloudButtonBusyClass("loading", publicLoadTarget)}" type="button" data-action="load-public-campaign-local" data-cloud-campaign-id="${escapeHtml(campaign.id)}" ${renderCloudButtonBusyAttributes("loading", publicLoadTarget)}>${renderCloudButtonLabel("Cargar copia local", "Cargando...", "loading", publicLoadTarget)}</button>`
            : `
              <button class="account-action-button${getCloudButtonBusyClass("loading", loadTarget)}" type="button" data-action="load-cloud-campaign" data-cloud-campaign-id="${escapeHtml(campaign.id)}" ${renderCloudButtonBusyAttributes("loading", loadTarget)}>
                ${renderCloudButtonLabel(isActive ? "Recargar" : "Cargar", "Cargando...", "loading", loadTarget)}
              </button>
              <button class="account-action-button account-action-button--ghost${getCloudButtonBusyClass("saving", visibilityTarget)}" type="button" data-action="toggle-cloud-campaign-public" data-cloud-campaign-id="${escapeHtml(campaign.id)}" ${renderCloudButtonBusyAttributes("saving", visibilityTarget)}>
                ${renderCloudButtonLabel(campaign.isPublic ? "Hacer privada" : "Hacer pública", "Guardando...", "saving", visibilityTarget)}
              </button>
              <button class="account-action-button account-action-button--danger" type="button" data-action="delete-cloud-campaign" data-cloud-campaign-id="${escapeHtml(campaign.id)}">Eliminar</button>
            `
        }
      </div>
    </article>
  `;
}

function getCloudLibraryTypeLabel(type) {
  return {
    campaign: "Campaña",
    character: "Personaje",
    encounter: "Encuentro",
    spell: "Hechizo",
    item: "Objeto",
    monster: "Enemigo",
    diary: "Diario",
    table: "Tabla"
  }[cleanText(type).toLowerCase()] || "Contenido";
}

function renderCloudLibraryCard(entry, options = {}) {
  const publicLibrary = options.publicLibrary === true;
  const importTarget = `library:${entry.id}`;
  const visibilityTarget = `library-visibility:${entry.id}`;

  return `
    <article class="account-campaign-card account-library-card">
      <div class="account-campaign-card__header">
        <div>
          <span class="account-library-card__type">${escapeHtml(getCloudLibraryTypeLabel(entry.type))}</span>
          <strong>${escapeHtml(entry.name || "Contenido sin nombre")}</strong>
          <small>
            ${escapeHtml(formatCampaignSavedAt(entry.updatedAt) || "Sin fecha")}
            · ${escapeHtml(formatCloudCampaignSize(entry.payloadBytes))}
            ${publicLibrary ? ` · por ${escapeHtml(entry.ownerName || "Usuario")}` : ""}
          </small>
        </div>
        <span class="account-campaign-card__visibility ${entry.isPublic ? "is-public" : ""}">${entry.isPublic ? "Público" : "Privado"}</span>
      </div>
      ${entry.description ? `<p class="account-library-card__description">${escapeHtml(entry.description)}</p>` : ""}
      <div class="account-campaign-card__actions">
        <button class="account-action-button${getCloudButtonBusyClass("loading", importTarget)}" type="button" data-action="import-cloud-library-entry" data-cloud-entry-id="${escapeHtml(entry.id)}" ${renderCloudButtonBusyAttributes("loading", importTarget)}>${renderCloudButtonLabel("Añadir a mi campaña", "Añadiendo...", "loading", importTarget)}</button>
        ${!publicLibrary && entry.isOwner ? `
          <button class="account-action-button account-action-button--ghost${getCloudButtonBusyClass("saving", visibilityTarget)}" type="button" data-action="toggle-cloud-library-public" data-cloud-entry-id="${escapeHtml(entry.id)}" ${renderCloudButtonBusyAttributes("saving", visibilityTarget)}>${renderCloudButtonLabel(entry.isPublic ? "Hacer privado" : "Hacer público", "Guardando...", "saving", visibilityTarget)}</button>
          <button class="account-action-button account-action-button--danger" type="button" data-action="delete-cloud-library-entry" data-cloud-entry-id="${escapeHtml(entry.id)}">Eliminar</button>
        ` : ""}
      </div>
    </article>
  `;
}

const CLOUD_CATALOG_TABS = Object.freeze([
  { id: "campaign", label: "Campañas" },
  { id: "character", label: "Personajes" },
  { id: "monster", label: "Enemigos" },
  { id: "encounter", label: "Encuentros" },
  { id: "item", label: "Objetos" },
  { id: "spell", label: "Hechizos" },
  { id: "diary", label: "Diarios" },
  { id: "table", label: "Tablas" }
]);

function normalizeCloudCatalogItem(item, kind) {
  return {
    ...item,
    catalogKind: kind,
    type: kind === "campaign" ? "campaign" : cleanText(item?.type).toLowerCase(),
    ownerName: cleanText(item?.ownerName) || "Usuario de Mimic Dice"
  };
}

function getCloudImportedRecordLocalSourceKeys(record) {
  const refs = isPlainObject(record?.localRefs) ? record.localRefs : {};
  const entityIds = Array.isArray(refs.entityIds) ? refs.entityIds.map(cleanText).filter(Boolean) : [];
  const type = cleanText(record?.sourceType).toLowerCase();

  if (type === "character") {
    return entityIds.map((id) => `character:${id}`);
  }

  if (type === "encounter") {
    return entityIds.map((id) => `encounter:${id}`);
  }

  if (type === "diary") {
    return entityIds.map((id) => `diary-note:${id}`);
  }

  if (type === "table") {
    return entityIds.map((id) => `table:${id}`);
  }

  if (["monster", "item", "spell"].includes(type) && cleanText(refs.rowKey)) {
    return [`compendium:${type}:${cleanText(refs.rowKey)}`.slice(0, 220)];
  }

  return [];
}

function findCloudImportedRecordForLocalEntry(localEntry) {
  const sourceEntityKey = cleanText(localEntry?.sourceEntityKey || localEntry?.id);

  if (!sourceEntityKey) {
    return null;
  }

  return state.cloudImportedEntries.find((record) => (
    getCloudImportedRecordLocalSourceKeys(record).includes(sourceEntityKey)
  )) || null;
}

function getLoadedCloudImportSourceEntryIds() {
  const localSourceKeys = new Set(state.cloudLocalCatalogItems
    .map((entry) => cleanText(entry?.sourceEntityKey || entry?.id))
    .filter(Boolean));

  return new Set(state.cloudImportedEntries
    .filter((record) => getCloudImportedRecordLocalSourceKeys(record).some((key) => localSourceKeys.has(key)))
    .map((record) => cleanText(record.sourceEntryId))
    .filter(Boolean));
}

function getCloudCatalogItems({ owned = false } = {}) {
  const tab = state.cloudCatalogTab;

  if (tab === "campaign") {
    const source = owned ? state.cloudCampaigns : state.publicCloudCampaigns;
    const activeCampaignId = cleanText(state.cloudCampaignId);
    return source
      .filter((campaign) => owned || campaign.isPublic === true)
      .filter((campaign) => owned
        ? campaign.isOwner !== false && Boolean(activeCampaignId) && cleanText(campaign.id) === activeCampaignId
        : campaign.isOwner !== true || !activeCampaignId || cleanText(campaign.id) !== activeCampaignId)
      .map((campaign) => normalizeCloudCatalogItem(campaign, "campaign"));
  }

  if (!owned) {
    const activeCampaignId = cleanText(state.cloudCampaignId);
    const loadedSourceEntryIds = getLoadedCloudImportSourceEntryIds();
    const publicEntries = state.publicCloudLibraryEntries
      .filter((entry) => cleanText(entry.type).toLowerCase() === tab && entry.isPublic === true)
      .filter((entry) => !loadedSourceEntryIds.has(cleanText(entry.id)))
      .filter((entry) => entry.isOwner !== true
        || !activeCampaignId
        || cleanText(entry.sourceCampaignId) !== activeCampaignId)
      .map((entry) => normalizeCloudCatalogItem(entry, "entry"));
    return [...new Map(publicEntries.map((entry) => [getCloudCatalogCampaignEntityKey(entry), entry])).values()];
  }

  const cloudEntries = state.cloudLibraryEntries
    .filter((entry) => cleanText(entry.type).toLowerCase() === tab && entry.isOwner === true);
  const localEntries = state.cloudLocalCatalogItems
    .filter((entry) => cleanText(entry.type).toLowerCase() === tab);
  const activeCampaignId = cleanText(state.cloudCampaignId);
  const cloudBySourceKey = new Map(cloudEntries
    .filter((entry) => activeCampaignId && cleanText(entry.sourceCampaignId) === activeCampaignId && cleanText(entry.sourceEntityKey))
    .map((entry) => [cleanText(entry.sourceEntityKey), entry]));
  const mergedLocalEntries = localEntries.map((localEntry) => {
    const cloudEntry = cloudBySourceKey.get(localEntry.sourceEntityKey);
    const importRecord = findCloudImportedRecordForLocalEntry(localEntry);
    const provenance = {
      loadedCampaignContent: true,
      loadedOrigin: importRecord ? "imported" : "original",
      importedFromOwnerName: cleanText(importRecord?.sourceOwnerName),
      importedFromCampaignName: cleanText(importRecord?.sourceCampaignName),
      importedSourceEntryId: cleanText(importRecord?.sourceEntryId)
    };

    if (!cloudEntry) {
      return normalizeCloudCatalogItem({ ...localEntry, ...provenance }, "local");
    }

    return normalizeCloudCatalogItem({
      ...localEntry,
      ...cloudEntry,
      imageUrl: cleanText(cloudEntry.imageUrl || localEntry.imageUrl),
      groupName: cleanText(cloudEntry.groupName || localEntry.groupName),
      payload: localEntry.payload,
      ...provenance
    }, "entry");
  });

  return mergedLocalEntries;
}

function getCloudCatalogCampaignEntityKey(entry) {
  if (cleanText(entry?.type).toLowerCase() === "campaign" || entry?.catalogKind === "campaign") {
    return `campaign:${cleanText(entry?.id)}`;
  }

  return [
    cleanText(entry?.ownerId) || normalizeSearchText(entry?.ownerName),
    cleanText(entry?.sourceCampaignId) || normalizeSearchText(entry?.sourceCampaignName),
    cleanText(entry?.type).toLowerCase(),
    normalizeSearchText(entry?.name)
  ].join("||");
}

function getCloudCatalogOtherCampaignItems() {
  if (!state.accountSession?.user?.id) {
    return [];
  }

  const tab = state.cloudCatalogTab;
  const activeCampaignId = cleanText(state.cloudCampaignId);
  const activeCampaignName = normalizeSearchText(state.campaignName);

  if (tab === "campaign") {
    return state.cloudCampaigns
      .filter((campaign) => campaign.isOwner !== false && cleanText(campaign.id) !== activeCampaignId)
      .map((campaign) => normalizeCloudCatalogItem(campaign, "campaign"));
  }

  const loadedSourceEntryIds = getLoadedCloudImportSourceEntryIds();
  const candidateEntries = state.cloudLibraryEntries
    .filter((entry) => cleanText(entry.type).toLowerCase() === tab && entry.isOwner === true)
    .filter((entry) => {
      const sourceCampaignId = cleanText(entry.sourceCampaignId);
      const sourceCampaignName = normalizeSearchText(entry.sourceCampaignName);

      if (sourceCampaignId) {
        return sourceCampaignId !== activeCampaignId;
      }
      return Boolean(sourceCampaignName && sourceCampaignName !== activeCampaignName);
    });
  const loadedEntryKeys = new Set(candidateEntries
    .filter((entry) => loadedSourceEntryIds.has(cleanText(entry.id)))
    .map(getCloudCatalogCampaignEntityKey));
  const candidates = candidateEntries
    .filter((entry) => !loadedEntryKeys.has(getCloudCatalogCampaignEntityKey(entry)))
    .sort((left, right) => (left.entryKind === "campaign" ? -1 : 1) - (right.entryKind === "campaign" ? -1 : 1));
  const uniqueEntries = new Map();

  candidates.forEach((entry) => {
    const key = getCloudCatalogCampaignEntityKey(entry);

    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, entry);
    }
  });

  return [...uniqueEntries.values()].map((entry) => normalizeCloudCatalogItem(entry, "entry"));
}

function getCloudCatalogOwnerOptions(items) {
  return [...new Set(items.flatMap((item) => [
    cleanText(item.ownerName),
    cleanText(item.importedFromOwnerName)
  ]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

function getCloudCatalogCampaignLabel(item) {
  return cleanText(item.sourceCampaignName)
    || (cleanText(item.type).toLowerCase() === "campaign" ? cleanText(item.name) : "Publicaciones independientes");
}

function getCloudCatalogCampaignOptions(items) {
  return [...new Set(items.flatMap((item) => [
    getCloudCatalogCampaignLabel(item),
    cleanText(item.importedFromCampaignName)
  ]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

function filterAndSortCloudCatalogItems(items) {
  const query = normalizeSearchText(state.cloudCatalogQuery);
  const owner = cleanText(state.cloudCatalogOwner);
  const campaign = cleanText(state.cloudCatalogCampaign);
  const filtered = items.filter((item) => {
    if (owner && item.ownerName !== owner && item.importedFromOwnerName !== owner) {
      return false;
    }

    if (campaign
      && getCloudCatalogCampaignLabel(item) !== campaign
      && item.importedFromCampaignName !== campaign) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeSearchText([
      item.name,
      item.ownerName,
      item.description,
      item.sourceCampaignName,
      item.importedFromOwnerName,
      item.importedFromCampaignName,
      item.groupName
    ].filter(Boolean).join(" ")).includes(query);
  });

  const sort = state.cloudCatalogSort;
  return filtered.sort((left, right) => {
    if (sort === "updated-asc") {
      return String(left.updatedAt).localeCompare(String(right.updatedAt));
    }

    if (sort === "name-asc" || sort === "name-desc") {
      const comparison = cleanText(left.name).localeCompare(cleanText(right.name), "es", { sensitivity: "base", numeric: true });
      return sort === "name-desc" ? -comparison : comparison;
    }

    if (sort === "owner-asc") {
      return left.ownerName.localeCompare(right.ownerName, "es", { sensitivity: "base" })
        || cleanText(left.name).localeCompare(cleanText(right.name), "es", { sensitivity: "base" });
    }

    return String(right.updatedAt).localeCompare(String(left.updatedAt));
  });
}

function getCloudCatalogSelectionKey(item) {
  if (item.loadedOrigin === "imported" && cleanText(item.importedSourceEntryId)) {
    return `entry:${cleanText(item.importedSourceEntryId)}`;
  }

  return `${item.catalogKind}:${item.id}`;
}

function getCloudImportedRecordsForSelectionKey(selectionKey) {
  const normalizedKey = cleanText(selectionKey);

  if (!normalizedKey.startsWith("entry:")) {
    return [];
  }

  const entryId = normalizedKey.slice("entry:".length);
  return state.cloudImportedEntries.filter((record) => cleanText(record.sourceEntryId) === entryId);
}

function isCloudCatalogSelectionKeySelected(selectionKey) {
  return state.cloudCatalogSelectedIds.has(selectionKey)
    || getCloudImportedRecordsForSelectionKey(selectionKey).length > 0;
}

function getCloudImportCandidatesForEntry(entryId) {
  const normalizedId = cleanText(entryId);
  return state.cloudImportUpdateCandidates.filter((candidate) => (
    cleanText(candidate.latest?.id) === normalizedId
  ));
}

function renderCloudCatalogRefreshButton(item) {
  if (item.catalogKind !== "entry") {
    return "";
  }

  const candidates = getCloudImportCandidatesForEntry(item.id);

  if (candidates.length === 0) {
    return "";
  }

  const target = `import-refresh:${item.id}`;
  return `<button class="account-action-button${getCloudButtonBusyClass("loading", target)}" type="button" data-action="refresh-cloud-import-entry" data-cloud-entry-id="${escapeHtml(item.id)}" ${renderCloudButtonBusyAttributes("loading", target)}>${renderCloudButtonLabel(candidates.length > 1 ? `Actualizar ${candidates.length} copias` : "Actualizar copia", "Actualizando...", "loading", target)}</button>`;
}

function renderCloudCatalogMeta(item) {
  const isImported = item.loadedOrigin === "imported";
  const ownerName = isImported
    ? cleanText(item.importedFromOwnerName) || item.ownerName
    : item.ownerName;
  const campaignLabel = isImported
    ? cleanText(item.importedFromCampaignName) || getCloudCatalogCampaignLabel(item)
    : getCloudCatalogCampaignLabel(item);
  return `
    <small class="cloud-catalog-card__meta">
      <span>Usuario: ${escapeHtml(ownerName)}</span>
      <span>Campaña: ${escapeHtml(campaignLabel)}</span>
      <span>Guardado ${escapeHtml(formatCampaignSavedAt(item.updatedAt) || "sin fecha")}</span>
      ${item.groupName ? `<span>Carpeta: ${escapeHtml(item.groupName)}</span>` : ""}
    </small>
  `;
}

function renderCloudCatalogCardImage(item) {
  if (!["character", "monster", "item", "spell"].includes(cleanText(item.type).toLowerCase()) || !cleanText(item.imageUrl)) {
    return "";
  }

  const initials = cleanText(item.name)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "?";
  return `
    <span class="cloud-catalog-card__media cloud-catalog-card__media--${escapeHtml(cleanText(item.type).toLowerCase())}">
      <span class="cloud-catalog-card__image-fallback" aria-hidden="true">${escapeHtml(initials)}</span>
      <img class="cloud-catalog-card__image" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-cloud-catalog-image />
    </span>
  `;
}

function renderCloudCatalogCardMain(item, body, selection = "") {
  const image = renderCloudCatalogCardImage(item);
  return `
    <div class="cloud-catalog-card__main ${image ? "has-image" : ""} ${selection ? "has-check" : ""}">
      ${image}
      ${body}
      ${selection}
    </div>
  `;
}

function renderOwnedCloudCatalogCard(item) {
  const isLoadedContent = item.loadedCampaignContent === true;
  const canRemoveImportedContent = item.loadedOrigin === "imported" && Boolean(cleanText(item.importedSourceEntryId));
  const selectionKey = canRemoveImportedContent ? getCloudCatalogSelectionKey(item) : "";
  const checked = selectionKey ? isCloudCatalogSelectionKeySelected(selectionKey) : false;
  const selection = selectionKey ? `
    <label class="cloud-catalog-card__check">
      <input type="checkbox" data-cloud-catalog-select="${escapeHtml(selectionKey)}" ${checked ? "checked" : ""} />
      <span>Seleccionar</span>
    </label>
  ` : "";
  const publishLoadedContent = isLoadedContent && !item.isPublic;
  const target = publishLoadedContent
    ? `local-visibility:${item.sourceEntityKey || item.id}`
    : item.catalogKind === "campaign"
    ? `campaign-visibility:${item.id}`
    : `library-visibility:${item.id}`;
  const action = publishLoadedContent
    ? "publish-local-cloud-catalog-item"
    : item.catalogKind === "campaign"
    ? "toggle-cloud-campaign-public"
    : "toggle-cloud-library-public";
  const idAttribute = publishLoadedContent
    ? `data-cloud-catalog-id="${escapeHtml(item.sourceEntityKey || item.id)}"`
    : item.catalogKind === "campaign"
    ? `data-cloud-campaign-id="${escapeHtml(item.id)}"`
    : `data-cloud-entry-id="${escapeHtml(item.id)}"`;
  const visibilityLabel = item.isPublic ? "Público" : "Privado";
  const actionLabel = item.loadedOrigin === "imported" && !item.isPublic
    ? "Publicar alternativa"
    : !item.isPublic ? "Hacer público" : "Hacer privado";
  const body = `
    <div class="cloud-catalog-card__body">
      <div class="cloud-catalog-card__badges">
        <span class="account-library-card__type">${escapeHtml(getCloudLibraryTypeLabel(item.type))}</span>
        <span class="account-campaign-card__visibility ${item.isPublic ? "is-public" : ""}">${visibilityLabel}</span>
      </div>
      <strong>${escapeHtml(item.name || "Contenido sin nombre")}</strong>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      ${renderCloudCatalogMeta(item)}
    </div>
  `;

  return `
    <article class="cloud-catalog-card cloud-catalog-card--owned ${checked ? "is-selected" : ""}">
      ${renderCloudCatalogCardMain(item, body, selection)}
      <div class="cloud-catalog-card__actions">
        ${state.accountSession?.user?.id ? `<button class="account-action-button account-action-button--ghost${getCloudButtonBusyClass("saving", target)}" type="button" data-action="${action}" ${idAttribute} ${renderCloudButtonBusyAttributes("saving", target)}>${renderCloudButtonLabel(actionLabel, "Guardando...", "saving", target)}</button>` : ""}
        ${renderCloudCatalogRefreshButton(item)}
        <button class="account-action-button account-action-button--ghost cloud-catalog-card__detail" type="button" data-action="preview-cloud-catalog-item" data-cloud-catalog-kind="${escapeHtml(item.catalogKind)}" data-cloud-catalog-id="${escapeHtml(item.id)}">Ver detalle</button>
      </div>
    </article>
  `;
}

function renderPublicCloudCatalogCard(item) {
  const selectionKey = getCloudCatalogSelectionKey(item);
  const checked = isCloudCatalogSelectionKeySelected(selectionKey);
  const selection = `
    <label class="cloud-catalog-card__check">
      <input type="checkbox" data-cloud-catalog-select="${escapeHtml(selectionKey)}" ${checked ? "checked" : ""} />
      <span>Seleccionar</span>
    </label>
  `;
  const body = `
    <div class="cloud-catalog-card__body">
      <span class="account-library-card__type">${escapeHtml(getCloudLibraryTypeLabel(item.type))}</span>
      <strong>${escapeHtml(item.name || "Contenido sin nombre")}</strong>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      ${renderCloudCatalogMeta(item)}
    </div>
  `;

  return `
    <article class="cloud-catalog-card ${checked ? "is-selected" : ""}">
      ${renderCloudCatalogCardMain(item, body, selection)}
      <div class="cloud-catalog-card__actions">
        ${renderCloudCatalogRefreshButton(item)}
        <button class="account-action-button account-action-button--ghost cloud-catalog-card__detail" type="button" data-action="preview-cloud-catalog-item" data-cloud-catalog-kind="${escapeHtml(item.catalogKind)}" data-cloud-catalog-id="${escapeHtml(item.id)}">Ver detalle</button>
      </div>
    </article>
  `;
}

function renderCloudCatalogGrid(items, owned) {
  const cardRenderer = owned ? renderOwnedCloudCatalogCard : renderPublicCloudCatalogCard;
  return `<div class="cloud-catalog-list">${items.map(cardRenderer).join("")}</div>`;
}

function renderCloudCatalogGroup(key, title, items, owned, content, subtitle = "") {
  const isExpanded = !state.cloudCatalogCollapsedGroups.has(key);
  const selectionKeys = owned || state.cloudCatalogTab === "campaign"
    ? []
    : items.map(getCloudCatalogSelectionKey);
  const allSelected = selectionKeys.length > 0 && selectionKeys.every(isCloudCatalogSelectionKeySelected);

  if (selectionKeys.length > 0) {
    cloudCatalogSelectionGroups.set(key, selectionKeys);
  }

  return `
    <section class="cloud-catalog-group ${isExpanded ? "is-expanded" : ""}">
      <div class="cloud-catalog-group__header">
        <button class="cloud-catalog-group__toggle" type="button" data-action="toggle-cloud-catalog-group" data-cloud-catalog-group-key="${escapeHtml(key)}" aria-expanded="${isExpanded}">
          <span class="cloud-catalog-group__chevron" aria-hidden="true">›</span>
          <span><strong>${escapeHtml(title)}</strong>${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}</span>
          <span class="cloud-catalog-group__count">${items.length}</span>
        </button>
        ${selectionKeys.length > 0 ? `<button class="cloud-catalog-group__select" type="button" data-action="toggle-cloud-catalog-group-selection" data-cloud-catalog-selection-group="${escapeHtml(key)}" aria-pressed="${allSelected}">${allSelected ? "Quitar selección" : "Seleccionar todo"}</button>` : ""}
      </div>
      ${isExpanded ? `<div class="cloud-catalog-group__content">${content}</div>` : ""}
    </section>
  `;
}

function getCloudCatalogGroupingLevels() {
  const tab = state.cloudCatalogTab;
  const structured = ["encounter", "diary", "table"].includes(tab);
  const campaignLevel = {
    id: "campaign",
    key: (item) => cleanText(item.sourceCampaignName) || (tab === "campaign" ? cleanText(item.name) : "Publicaciones independientes"),
    title: (item) => cleanText(item.sourceCampaignName) || (tab === "campaign" ? cleanText(item.name) : "Publicaciones independientes"),
    subtitle: () => ""
  };
  const ownerLevel = {
    id: "owner",
    key: (item) => cleanText(item.ownerName) || "Usuario de Mimic Dice",
    title: (item) => cleanText(item.ownerName) || "Usuario de Mimic Dice",
    subtitle: () => ""
  };
  const folderLevel = {
    id: "folder",
    key: (item) => cleanText(item.groupName) || "Sin carpeta",
    title: (item) => cleanText(item.groupName) || "Sin carpeta",
    subtitle: () => ""
  };
  const folderWithCampaignLevel = {
    ...folderLevel,
    key: (item) => `${cleanText(item.sourceCampaignName) || "independent"}::${cleanText(item.groupName) || "Sin carpeta"}`,
    subtitle: (item) => cleanText(item.sourceCampaignName)
  };
  const levels = [];

  if (state.cloudCatalogGroupBy === "owner-campaign") {
    levels.push(ownerLevel, campaignLevel);
  } else if (state.cloudCatalogGroupBy === "owner") {
    levels.push(ownerLevel);
  } else if (state.cloudCatalogGroupBy === "campaign") {
    levels.push(campaignLevel);
  } else if (structured && tab !== "table") {
    levels.push(campaignLevel);
  }

  if (structured) {
    levels.push(state.cloudCatalogGroupBy === "owner" || (state.cloudCatalogGroupBy === "none" && tab === "table")
      ? folderWithCampaignLevel
      : folderLevel);
  }

  return levels;
}

function renderCloudCatalogHierarchy(items, owned, levels, depth = 0, path = "", scope = "") {
  if (depth >= levels.length) {
    return renderCloudCatalogGrid(items, owned);
  }

  const level = levels[depth];
  const groups = items.reduce((result, item) => {
    const value = level.key(item);
    result.set(value, [...(result.get(value) || []), item]);
    return result;
  }, new Map());
  const hierarchyScope = scope || (owned ? "owned" : "public");
  const content = [...groups.entries()].map(([value, groupItems]) => {
    const firstItem = groupItems[0] || {};
    const key = `${path || `${hierarchyScope}:${state.cloudCatalogTab}`}:${level.id}:${value}`;
    return renderCloudCatalogGroup(
      key,
      level.title(firstItem),
      groupItems,
      owned,
      renderCloudCatalogHierarchy(groupItems, owned, levels, depth + 1, key, hierarchyScope),
      level.subtitle(firstItem)
    );
  }).join("");

  return `<div class="cloud-catalog-groups ${depth > 0 ? "cloud-catalog-groups--nested" : ""}">${content}</div>`;
}

function renderGroupedCloudCatalogItems(items, owned, scope = "") {
  const levels = getCloudCatalogGroupingLevels();
  return levels.length > 0
    ? renderCloudCatalogHierarchy(items, owned, levels, 0, "", scope)
    : renderCloudCatalogGrid(items, owned);
}

function collectCloudCatalogGroupKeys(items, levels, depth = 0, path = "", scope = "public") {
  if (depth >= levels.length) {
    return [];
  }

  const level = levels[depth];
  const groups = items.reduce((result, item) => {
    const value = level.key(item);
    result.set(value, [...(result.get(value) || []), item]);
    return result;
  }, new Map());

  return [...groups.entries()].flatMap(([value, groupItems]) => {
    const key = `${path || `${scope}:${state.cloudCatalogTab}`}:${level.id}:${value}`;
    return [key, ...collectCloudCatalogGroupKeys(groupItems, levels, depth + 1, key, scope)];
  });
}

function registerCloudCatalogGroupCollection(collectionKey, items, scope) {
  const keys = collectCloudCatalogGroupKeys(items, getCloudCatalogGroupingLevels(), 0, "", scope);
  cloudCatalogGroupCollections.set(collectionKey, keys);
  return keys;
}

function renderCloudCatalogGroupCollectionToggle(collectionKey, groupKeys) {
  if (groupKeys.length === 0) {
    return "";
  }

  const allExpanded = groupKeys.every((key) => !state.cloudCatalogCollapsedGroups.has(key));
  return `<button class="account-action-button account-action-button--ghost" type="button" data-action="toggle-all-cloud-catalog-groups" data-cloud-catalog-group-collection="${escapeHtml(collectionKey)}" aria-expanded="${allExpanded}">${allExpanded ? "Plegar todo" : "Desplegar todo"}</button>`;
}

function renderCloudCatalogPreviewContent() {
  const preview = state.cloudCatalogPreview;

  if (!preview?.payload) {
    return `<p class="account-dialog__empty">No hay detalle disponible.</p>`;
  }

  const payload = preview.payload;

  if (preview.kind === "campaign") {
    const catalogCounts = (Array.isArray(payload?.cloudCatalog?.entries) ? payload.cloudCatalog.entries : [])
      .filter((entry) => !isBundledBaseCloudCatalogDescriptor(entry))
      .reduce((counts, entry) => ({ ...counts, [entry.type]: (counts[entry.type] || 0) + 1 }), {});
    return `
      <div class="cloud-catalog-preview__stats">
        <span><strong>${Array.isArray(payload.characters) ? payload.characters.length : 0}</strong> personajes</span>
        <span><strong>${Array.isArray(payload.encounterInventory?.encounters) ? payload.encounterInventory.encounters.length : 0}</strong> encuentros</span>
        <span><strong>${Array.isArray(payload.diary?.notes) ? payload.diary.notes.length : 0}</strong> notas</span>
        <span><strong>${Array.isArray(payload.tables?.tables) ? payload.tables.tables.length : 0}</strong> tablas</span>
        <span><strong>${catalogCounts.monster || 0}</strong> enemigos personalizados</span>
        <span><strong>${catalogCounts.item || 0}</strong> objetos personalizados</span>
        <span><strong>${catalogCounts.spell || 0}</strong> hechizos personalizados</span>
      </div>
    `;
  }

  const type = cleanText(preview.item?.type).toLowerCase();

  if (type === "character") {
    const character = normalizeStoredCharacter(payload.characters?.[0], payload.characterSkills?.definitions);
    return character
      ? `<div class="characters-editor cloud-catalog-preview__sheet" inert>${renderCharacterEditor(character)}</div>`
      : `<p class="account-dialog__empty">Ficha de personaje no disponible.</p>`;
  }

  if (type === "encounter") {
    const encounter = normalizeStoredEncounter(payload.encounterInventory?.encounters?.[0]);
    return encounter
      ? `<div class="encounter-editor cloud-catalog-preview__sheet" inert>${renderEncounterEditor(encounter)}</div>`
      : `<p class="account-dialog__empty">Editor de encuentro no disponible.</p>`;
  }

  if (["monster", "item", "spell"].includes(type)) {
    const row = isPlainObject(payload.row) ? payload.row : {};
    const assets = isPlainObject(payload.assets) ? payload.assets : {};
    const imageKey = `${cleanText(row.Name)}||${cleanText(row.Source)}`.toLowerCase();

    if (type === "monster") {
      const entry = normalizeBestiaryEntry(row, 0, {
        [imageKey]: { imageUrl: cleanText(assets.imageUrl), tokenUrl: cleanText(assets.tokenUrl) }
      }, { isPackagedDesktopApp: isPackagedDesktopApp() });
      return `<div class="bestiary-detail cloud-catalog-preview__sheet" inert>${renderBestiaryDetail(entry)}</div>`;
    }

    if (type === "item") {
      const entry = normalizeItemEntry(row, 0, { [imageKey]: cleanText(assets.imageUrl) }, {
        contentLanguage: state.contentLanguage
      });
      return `<div class="bestiary-detail cloud-catalog-preview__sheet" inert>${renderItemDetail(entry)}</div>`;
    }

    const entry = normalizeSpellEntry(row, 0);
    const spellImage = cleanText(assets.imageUrl || preview.item?.imageUrl);
    return `<div class="bestiary-detail cloud-catalog-preview__sheet" inert>${spellImage ? `<figure class="bestiary-portrait bestiary-portrait--item-image"><img class="bestiary-portrait__image bestiary-portrait__image--contain" src="${escapeHtml(spellImage)}" alt="" /></figure>` : ""}${renderArcanumDetail(entry)}</div>`;
  }

  if (type === "diary") {
    const note = normalizeStoredDiaryNote(payload.diary?.notes?.[0]);
    return note
      ? `<div class="cloud-catalog-preview__sheet" inert>${renderDiaryEditor(note)}</div>`
      : `<p class="account-dialog__empty">El calendario no contiene una hoja individual para previsualizar.</p>`;
  }

  if (type === "table") {
    const table = normalizeStoredTable(payload.tables?.tables?.[0], 0);
    const folder = (Array.isArray(payload.tables?.folders) ? payload.tables.folders : [])
      .find((entry) => cleanText(entry?.id) === cleanText(table?.folderId));
    return table
      ? `<div class="tables-screen cloud-catalog-preview__sheet" inert>${renderTablePanel({ ...table, collapsed: false }, { folderName: folder?.name })}</div>`
      : `<p class="account-dialog__empty">Tabla no disponible.</p>`;
  }

  return `<p class="account-dialog__empty">Detalle preparado para importar.</p>`;
}

function renderCloudCatalogPreview() {
  if (!state.cloudCatalogPreview && !state.cloudCatalogPreviewBusy) {
    return "";
  }

  return `
    <div class="cloud-catalog-preview" role="presentation">
      <button class="cloud-catalog-preview__backdrop" type="button" data-action="dismiss-cloud-catalog-preview" aria-label="Cerrar detalle"></button>
      <section class="cloud-catalog-preview__panel" role="dialog" aria-modal="true" aria-labelledby="cloud-catalog-preview-title">
        <div class="account-dialog__header">
          <div>
            <p class="account-dialog__eyebrow">Detalle del catálogo</p>
            <h2 id="cloud-catalog-preview-title">${escapeHtml(state.cloudCatalogPreview?.item?.name || "Cargando...")}</h2>
          </div>
          <button class="account-dialog__close" type="button" data-action="dismiss-cloud-catalog-preview" aria-label="Cerrar">×</button>
        </div>
        ${state.cloudCatalogPreviewBusy ? `<p class="cloud-catalog-preview__loading"><span class="cloud-button-spinner" aria-hidden="true"></span> Cargando detalle...</p>` : renderCloudCatalogPreviewContent()}
      </section>
    </div>
  `;
}

function renderCommunityCatalog() {
  cloudCatalogSelectionGroups.clear();
  cloudCatalogGroupCollections.clear();
  const ownedCatalogItems = getCloudCatalogItems({ owned: true });
  const otherCampaignCatalogItems = getCloudCatalogOtherCampaignItems();
  const otherCampaignItemKeys = new Set(otherCampaignCatalogItems.map(getCloudCatalogCampaignEntityKey));
  const publicCatalogItems = getCloudCatalogItems()
    .filter((item) => !otherCampaignItemKeys.has(getCloudCatalogCampaignEntityKey(item)));
  const allCatalogItems = [...ownedCatalogItems, ...otherCampaignCatalogItems, ...publicCatalogItems];
  const ownedItems = filterAndSortCloudCatalogItems(ownedCatalogItems);
  const otherCampaignItems = filterAndSortCloudCatalogItems(otherCampaignCatalogItems);
  const publicItems = filterAndSortCloudCatalogItems(publicCatalogItems);
  const originalItems = ownedItems.filter((item) => item.loadedOrigin !== "imported");
  const importedItems = ownedItems.filter((item) => item.loadedOrigin === "imported");
  const ownerOptions = getCloudCatalogOwnerOptions(allCatalogItems);
  const campaignOptions = getCloudCatalogCampaignOptions(allCatalogItems);
  const otherCampaignSelectionGroupKey = `other-campaigns-filtered:${state.cloudCatalogTab}`;
  const otherCampaignSelectionKeys = state.cloudCatalogTab === "campaign" ? [] : otherCampaignItems.map(getCloudCatalogSelectionKey);
  const allOtherCampaignSelected = otherCampaignSelectionKeys.length > 0
    && otherCampaignSelectionKeys.every(isCloudCatalogSelectionKeySelected);
  const filteredSelectionGroupKey = `filtered:${state.cloudCatalogTab}`;
  const filteredSelectionKeys = state.cloudCatalogTab === "campaign" ? [] : publicItems.map(getCloudCatalogSelectionKey);
  const allFilteredSelected = filteredSelectionKeys.length > 0
    && filteredSelectionKeys.every(isCloudCatalogSelectionKeySelected);
  const otherCampaignGroupCollectionKey = `other-campaigns:${state.cloudCatalogTab}`;
  const communityGroupCollectionKey = `community:${state.cloudCatalogTab}`;
  const otherCampaignGroupKeys = registerCloudCatalogGroupCollection(
    otherCampaignGroupCollectionKey,
    otherCampaignItems,
    "own-other-campaigns"
  );
  const communityGroupKeys = registerCloudCatalogGroupCollection(
    communityGroupCollectionKey,
    publicItems,
    "community"
  );
  const otherCampaignContent = otherCampaignItems.length > 0
    ? renderGroupedCloudCatalogItems(otherCampaignItems, false, "own-other-campaigns")
    : `<p class="account-dialog__empty">No hay contenido de otras campañas con estos filtros.</p>`;
  const communityContent = publicItems.length > 0
    ? renderGroupedCloudCatalogItems(publicItems, false, "community")
    : `<p class="account-dialog__empty">No hay contenido público con estos filtros.</p>`;

  if (filteredSelectionKeys.length > 0) {
    cloudCatalogSelectionGroups.set(filteredSelectionGroupKey, filteredSelectionKeys);
  }

  if (otherCampaignSelectionKeys.length > 0) {
    cloudCatalogSelectionGroups.set(otherCampaignSelectionGroupKey, otherCampaignSelectionKeys);
  }

  return `
    <button class="account-dialog__back" type="button" data-action="set-account-dialog-view" data-account-dialog-view="account">← Volver</button>
    <p class="account-dialog__intro">Selecciona contenido para copiarlo inmediatamente. Campañas crean una copia privada nueva; nunca modifican el original.</p>
    <nav class="cloud-catalog-tabs" aria-label="Categorías del catálogo">
      ${CLOUD_CATALOG_TABS.map((tab) => `<button class="cloud-catalog-tab ${state.cloudCatalogTab === tab.id ? "is-active" : ""}" type="button" data-action="set-cloud-catalog-tab" data-cloud-catalog-tab="${tab.id}">${escapeHtml(tab.label)}</button>`).join("")}
    </nav>
    <div class="cloud-catalog-filters">
      <label><span>Buscar</span><input type="search" value="${escapeHtml(state.cloudCatalogQuery)}" placeholder="Nombre, usuario o campaña" data-cloud-catalog-query /></label>
      <label><span>Usuario</span><select data-cloud-catalog-owner><option value="">Todos</option>${ownerOptions.map((owner) => `<option value="${escapeHtml(owner)}" ${state.cloudCatalogOwner === owner ? "selected" : ""}>${escapeHtml(owner)}</option>`).join("")}</select></label>
      <label><span>Campaña</span><select data-cloud-catalog-campaign><option value="">Todas</option>${campaignOptions.map((campaign) => `<option value="${escapeHtml(campaign)}" ${state.cloudCatalogCampaign === campaign ? "selected" : ""}>${escapeHtml(campaign)}</option>`).join("")}</select></label>
      <label><span>Orden</span><select data-cloud-catalog-sort>
        <option value="updated-desc" ${state.cloudCatalogSort === "updated-desc" ? "selected" : ""}>Más recientes</option>
        <option value="updated-asc" ${state.cloudCatalogSort === "updated-asc" ? "selected" : ""}>Más antiguos</option>
        <option value="name-asc" ${state.cloudCatalogSort === "name-asc" ? "selected" : ""}>Nombre A–Z</option>
        <option value="name-desc" ${state.cloudCatalogSort === "name-desc" ? "selected" : ""}>Nombre Z–A</option>
        <option value="owner-asc" ${state.cloudCatalogSort === "owner-asc" ? "selected" : ""}>Usuario A–Z</option>
      </select></label>
      <label><span>Agrupar</span><select data-cloud-catalog-group-by>
        <option value="none" ${state.cloudCatalogGroupBy === "none" ? "selected" : ""}>Carpetas habituales</option>
        <option value="campaign" ${state.cloudCatalogGroupBy === "campaign" ? "selected" : ""}>Campaña</option>
        <option value="owner" ${state.cloudCatalogGroupBy === "owner" ? "selected" : ""}>Usuario</option>
        <option value="owner-campaign" ${state.cloudCatalogGroupBy === "owner-campaign" ? "selected" : ""}>Usuario y campaña</option>
      </select></label>
      <button class="account-action-button account-action-button--ghost${getCloudButtonBusyClass("loading", "catalog:refresh")}" type="button" data-action="refresh-community-catalog" ${renderCloudButtonBusyAttributes("loading", "catalog:refresh")}>${renderCloudButtonLabel("Actualizar", "Actualizando...", "loading", "catalog:refresh")}</button>
    </div>
    <section class="account-dialog__section cloud-catalog-section">
        <div class="account-dialog__section-heading"><h3>Tus contenidos cargados en la campaña: ${escapeHtml(state.campaignName || "Campaña sin nombre")}</h3><span>${ownedItems.length}</span></div>
        <div class="cloud-catalog-loaded-groups">
          <section class="cloud-catalog-loaded-group">
            <div class="cloud-catalog-loaded-group__heading"><h4>Originales de esta campaña</h4><span>${originalItems.length}</span></div>
            ${originalItems.length > 0 ? renderCloudCatalogGrid(originalItems, true) : `<p class="account-dialog__empty">No hay contenido original de esta categoría.</p>`}
          </section>
          <section class="cloud-catalog-loaded-group cloud-catalog-loaded-group--imported">
            <div class="cloud-catalog-loaded-group__heading"><h4>Importados de otras campañas o usuarios</h4><span>${importedItems.length}</span></div>
            ${importedItems.length > 0 ? renderCloudCatalogGrid(importedItems, true) : `<p class="account-dialog__empty">No hay contenido importado de esta categoría.</p>`}
          </section>
        </div>
      </section>
    ${state.accountSession?.user?.id ? `
      <section class="account-dialog__section cloud-catalog-section">
        <div class="account-dialog__section-heading">
          <h3>Otros contenidos tuyos de otras campañas</h3>
          <div class="account-dialog__section-actions">
            <span>${otherCampaignItems.length}</span>
            ${renderCloudCatalogGroupCollectionToggle(otherCampaignGroupCollectionKey, otherCampaignGroupKeys)}
            ${otherCampaignSelectionKeys.length > 0 ? `<button class="account-action-button account-action-button--ghost" type="button" data-action="toggle-cloud-catalog-group-selection" data-cloud-catalog-selection-group="${escapeHtml(otherCampaignSelectionGroupKey)}" aria-pressed="${allOtherCampaignSelected}">${allOtherCampaignSelected ? "Quitar selección filtrada" : "Seleccionar todo lo filtrado"}</button>` : ""}
          </div>
        </div>
        ${otherCampaignContent}
      </section>
    ` : ""}
    <section class="account-dialog__section cloud-catalog-section">
      <div class="account-dialog__section-heading">
        <h3>Comunidad</h3>
        <div class="account-dialog__section-actions">
          <span>${publicItems.length}</span>
          ${renderCloudCatalogGroupCollectionToggle(communityGroupCollectionKey, communityGroupKeys)}
          ${filteredSelectionKeys.length > 0 ? `<button class="account-action-button account-action-button--ghost" type="button" data-action="toggle-cloud-catalog-group-selection" data-cloud-catalog-selection-group="${escapeHtml(filteredSelectionGroupKey)}" aria-pressed="${allFilteredSelected}">${allFilteredSelected ? "Quitar selección filtrada" : "Seleccionar todo lo filtrado"}</button>` : ""}
        </div>
      </div>
      ${communityContent}
    </section>
    ${isCloudOperationActive("loading", "catalog:import") || isCloudOperationActive("loading", "catalog:remove") ? `
      <div class="cloud-catalog-selection-bar" role="status">
        <span class="cloud-button-label"><span class="cloud-button-spinner" aria-hidden="true"></span><span>${isCloudOperationActive("loading", "catalog:remove") ? "Retirando contenido seleccionado..." : "Cargando contenido seleccionado..."}</span></span>
      </div>
    ` : ""}
  `;
}

function renderAccountDialog() {
  if (!state.accountDialogOpen) {
    return "";
  }

  const user = state.accountSession?.user ?? null;
  const isAuthenticated = Boolean(user?.id);
  const catalogView = state.accountDialogView === "catalog";
  const publicView = state.accountDialogView === "public";
  const libraryView = state.accountDialogView === "library";
  const loadedCampaignName = state.campaignFileName || state.cloudCampaignId || state.campaignLoadedFromPublic
    ? cleanText(state.campaignName) || getCampaignNameFromFileName(state.campaignFileName)
    : "";

  return `
    <div class="account-dialog" data-account-dialog-root role="presentation">
      <button class="account-dialog__backdrop" type="button" data-action="dismiss-account-dialog" aria-label="Cerrar cuenta"></button>
      <section class="account-dialog__panel ${catalogView ? "account-dialog__panel--catalog" : ""}" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <div class="account-dialog__header">
          <div>
            <p class="account-dialog__eyebrow">Mimic Dice Cloud</p>
            <div class="account-dialog__title-row">
              <h2 id="account-dialog-title">${catalogView ? "Catálogo de la comunidad" : libraryView ? "Biblioteca de la comunidad" : publicView ? "Campañas públicas" : isAuthenticated ? "Tu cuenta" : "Acceso de usuario"}</h2>
              ${catalogView && loadedCampaignName ? `<span class="account-dialog__campaign-name">${escapeHtml(loadedCampaignName)}</span>` : ""}
            </div>
          </div>
          <button class="account-dialog__close" type="button" data-action="dismiss-account-dialog" aria-label="Cerrar">×</button>
        </div>
        ${state.accountError ? `<p class="account-dialog__error" role="alert">${escapeHtml(state.accountError)}</p>` : ""}
        ${!catalogView && !libraryView && !publicView ? `<button class="account-public-library-button account-public-library-button--featured" type="button" data-action="set-account-dialog-view" data-account-dialog-view="catalog">Abrir catálogo de la comunidad</button>` : ""}
        ${
          catalogView
            ? renderCommunityCatalog()
            : libraryView
            ? `
              <button class="account-dialog__back" type="button" data-action="set-account-dialog-view" data-account-dialog-view="account">← Volver</button>
              <p class="account-dialog__intro">Contenido individual reutilizable. Al añadirlo se crea una copia dentro de tu campaña actual.</p>
              ${isAuthenticated ? `
                <section class="account-dialog__section">
                  <div class="account-dialog__section-heading"><h3>Tus publicaciones</h3></div>
                  <div class="account-campaign-list">
                    ${state.cloudLibraryEntries.length > 0
                      ? state.cloudLibraryEntries.map((entry) => renderCloudLibraryCard(entry)).join("")
                      : `<p class="account-dialog__empty">Todavía no has publicado contenido individual.</p>`}
                  </div>
                </section>
              ` : ""}
              <section class="account-dialog__section">
                <h3>Contenido público</h3>
                <div class="account-campaign-list">
                  ${state.publicCloudLibraryEntries.length > 0
                    ? state.publicCloudLibraryEntries.map((entry) => renderCloudLibraryCard(entry, { publicLibrary: true })).join("")
                    : `<p class="account-dialog__empty">No hay contenido público disponible.</p>`}
                </div>
              </section>
            `
            : publicView
            ? `
              <button class="account-dialog__back" type="button" data-action="set-account-dialog-view" data-account-dialog-view="account">← Volver</button>
              <p class="account-dialog__intro">Copias compartidas por otros usuarios. La copia original nunca puede ser modificada por ti.</p>
              <div class="account-campaign-list">
                ${state.publicCloudCampaigns.length > 0
                  ? state.publicCloudCampaigns.map((campaign) => renderCloudCampaignCard(campaign, { publicLibrary: true })).join("")
                  : `<p class="account-dialog__empty">No hay campañas públicas disponibles.</p>`}
              </div>
            `
            : isAuthenticated
              ? `
                <div class="account-profile">
                  <span class="account-profile__avatar account-avatar">${renderAccountAvatar(user)}</span>
                  <div class="account-profile__identity">
                    ${state.accountProfileNameEditing
                      ? `<input class="account-profile__name-input" type="text" minlength="2" maxlength="80" value="${escapeHtml(state.accountProfileNameDraft)}" data-account-profile-name aria-label="Nombre de usuario" />`
                      : `<strong>${escapeHtml(getAccountDisplayName())}</strong>`}
                    <small>${escapeHtml(cleanText(user.email))}</small>
                  </div>
                  <div class="account-profile__actions">
                    <label class="account-action-button account-action-button--ghost account-profile__image-button${getCloudButtonBusyClass("saving", "profile:image")}" ${isCloudOperationActive("saving", "profile:image") ? `aria-busy="true"` : ""}>
                      ${renderCloudButtonLabel("Cambiar imagen", "Guardando...", "saving", "profile:image")}
                      <input class="account-profile__image-input" type="file" accept="image/*" data-account-profile-image ${isCloudOperationActive("saving", "profile:image") ? "disabled" : ""} />
                    </label>
                    ${state.accountProfileNameEditing ? `
                      <button class="account-action-button${getCloudButtonBusyClass("saving", "profile:name")}" type="button" data-action="save-account-profile-name" ${renderCloudButtonBusyAttributes("saving", "profile:name")}>${renderCloudButtonLabel("Guardar nombre", "Guardando...", "saving", "profile:name")}</button>
                      <button class="account-action-button account-action-button--ghost" type="button" data-action="cancel-account-profile-name" ${isCloudOperationActive("saving", "profile:name") ? "disabled" : ""}>Cancelar</button>
                    ` : `<button class="account-action-button account-action-button--ghost" type="button" data-action="edit-account-profile-name">Cambiar nombre</button>`}
                    <button class="account-action-button account-action-button--ghost" type="button" data-action="account-sign-out">Cerrar sesión</button>
                  </div>
                </div>
                <section class="account-dialog__section">
                  <h3>Nombre de la campaña en la nube</h3>
                  <div class="account-create-row">
                    <input type="text" maxlength="120" value="${escapeHtml(state.accountCampaignName)}" data-account-campaign-name aria-label="Nombre de campaña en la nube" />
                  </div>
                  <div class="account-autosave-status account-autosave-status--${escapeHtml(state.cloudAutosaveStatus)}" data-cloud-save-status>
                    <strong>${escapeHtml(getCloudAutosaveLabel())}</strong>
                    ${state.cloudAutosaveMessage ? `<small>${escapeHtml(state.cloudAutosaveMessage)}</small>` : ""}
                  </div>
                  <small>Autoguardado empieza cuando cargas o creas una campaña cloud. JSON local sigue disponible.</small>
                </section>
                <section class="account-dialog__section">
                  <div class="account-dialog__section-heading">
                    <h3>Tus campañas</h3>
                    <div class="account-dialog__section-actions">
                      <button class="account-action-button${getCloudButtonBusyClass("saving", "campaign:create")}" type="button" data-action="create-cloud-campaign" ${renderCloudButtonBusyAttributes("saving", "campaign:create")}>${renderCloudButtonLabel("Crear campaña", "Creando...", "saving", "campaign:create")}</button>
                      <button class="account-action-button account-action-button--ghost" type="button" data-action="refresh-cloud-campaigns">Actualizar</button>
                    </div>
                  </div>
                  <div class="account-campaign-list">
                    ${state.cloudCampaigns.length > 0
                      ? state.cloudCampaigns.map((campaign) => renderCloudCampaignCard(campaign)).join("")
                      : `<p class="account-dialog__empty">Todavía no tienes campañas cloud.</p>`}
                  </div>
                </section>
              `
              : `
                <p class="account-dialog__intro">Como invitado, todo sigue funcionando localmente con almacenamiento del navegador y archivos JSON.</p>
                ${state.accountStatus === "loading" ? `<p class="account-dialog__empty">Comprobando sesión...</p>` : ""}
                ${state.accountStatus === "unavailable" ? `<p class="account-dialog__empty">Cuentas cloud solo disponibles en versión web.</p>` : `
                  <button class="account-google-button${getCloudButtonBusyClass("loading", "auth:login")}" type="button" data-action="account-login-google" ${renderCloudButtonBusyAttributes("loading", "auth:login")}>
                    <span class="account-google-button__icon">G</span> ${renderCloudButtonLabel("Iniciar sesión con Google", "Abriendo selector...", "loading", "auth:login")}
                  </button>
                  <div class="account-dialog__divider"><span>Registro por invitación</span></div>
                  ${state.accountRegistrationPromptOpen ? `
                    <label class="account-dialog__field">
                      <span>Código de registro</span>
                      <input type="password" autocomplete="one-time-code" value="${escapeHtml(state.accountRegistrationCode)}" data-account-registration-code />
                    </label>
                    <div class="account-registration-actions">
                      <button class="account-google-button account-google-button--register${getCloudButtonBusyClass("loading", "auth:register")}" type="button" data-action="account-register-google" ${renderCloudButtonBusyAttributes("loading", "auth:register")}>
                        <span class="account-google-button__icon">G</span> ${renderCloudButtonLabel("Continuar con Google", "Abriendo selector...", "loading", "auth:register")}
                      </button>
                      <button class="account-action-button account-action-button--ghost" type="button" data-action="cancel-account-registration">Cancelar</button>
                    </div>
                  ` : `
                    <button class="account-google-button account-google-button--register" type="button" data-action="account-register-google">
                      <span class="account-google-button__icon">G</span> Registrarse con Google
                    </button>
                  `}
                `}
              `
        }
      </section>
      ${renderCloudCatalogPreview()}
    </div>
  `;
}

function renderCloudImportUpdateDialog() {
  if (!state.cloudImportUpdateDialogOpen || state.cloudImportUpdateCandidates.length === 0) {
    return "";
  }

  const allSelected = state.cloudImportUpdateCandidates.every((candidate) => (
    state.cloudImportUpdateSelectedIds.has(candidate.record.id)
  ));
  const selectedCount = state.cloudImportUpdateSelectedIds.size;
  const operationTarget = "import-refresh:selection";

  return `
    <div class="cloud-import-update-dialog" role="presentation">
      <button class="cloud-import-update-dialog__backdrop" type="button" data-action="dismiss-cloud-import-update-dialog" aria-label="Ignorar por ahora"></button>
      <section class="cloud-import-update-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="cloud-import-update-title">
        <div class="account-dialog__header">
          <div>
            <p class="account-dialog__eyebrow">Contenido de la comunidad</p>
            <h2 id="cloud-import-update-title">Hay versiones nuevas</h2>
          </div>
          <button class="account-dialog__close" type="button" data-action="dismiss-cloud-import-update-dialog" aria-label="Ignorar por ahora">×</button>
        </div>
        <p class="account-dialog__intro">Tu copia no cambia sola. Elige qué entidades quieres reemplazar por la última versión publicada.</p>
        <div class="cloud-import-update-dialog__toolbar">
          <button class="account-action-button account-action-button--ghost" type="button" data-action="toggle-all-cloud-import-updates">${allSelected ? "Quitar todas" : "Seleccionar todas"}</button>
          <span>${selectedCount} seleccionadas</span>
        </div>
        <div class="cloud-import-update-list">
          ${state.cloudImportUpdateCandidates.map(({ record, latest }) => `
            <label class="cloud-import-update-card">
              <input type="checkbox" data-cloud-import-update-select="${escapeHtml(record.id)}" ${state.cloudImportUpdateSelectedIds.has(record.id) ? "checked" : ""} />
              <span>
                <strong>${escapeHtml(latest.name || record.sourceName)}</strong>
                <small>${escapeHtml(getCloudLibraryTypeLabel(latest.type || record.sourceType))} · ${escapeHtml(latest.ownerName || record.sourceOwnerName)}${latest.sourceCampaignName || record.sourceCampaignName ? ` · ${escapeHtml(latest.sourceCampaignName || record.sourceCampaignName)}` : ""}</small>
                <small>Tu versión: ${escapeHtml(formatCampaignSavedAt(record.sourceUpdatedAt) || "sin fecha")} · Nueva: ${escapeHtml(formatCampaignSavedAt(latest.updatedAt) || "sin fecha")}</small>
              </span>
            </label>
          `).join("")}
        </div>
        <div class="cloud-import-update-dialog__actions">
          <button class="account-action-button account-action-button--ghost" type="button" data-action="dismiss-cloud-import-update-dialog">Ignorar por ahora</button>
          <button class="account-action-button${getCloudButtonBusyClass("loading", operationTarget)}" type="button" data-action="refresh-selected-cloud-import-updates" ${selectedCount > 0 ? renderCloudButtonBusyAttributes("loading", operationTarget) : "disabled"}>${renderCloudButtonLabel("Actualizar selección", "Actualizando...", "loading", operationTarget)}</button>
        </div>
      </section>
    </div>
  `;
}

function renderTopbarNavigation() {
  const buttonOrder = [
    "combat-tracker",
    "initiative-board",
    "bestiary",
    "arcanum",
    "items",
    "diary",
    "tables"
  ];
  const buttonScreens = buttonOrder
    .map((screenId) => screens.find((screen) => screen.id === screenId))
    .filter(Boolean);

  return `
    <div class="topbar__nav-stack" aria-label="Barra principal">
      <div class="nav-row nav-row--combined">
        <nav class="nav nav--row" aria-label="Pantallas principales">
          ${buttonScreens.map((screen) => renderScreenButton(screen)).join("")}
        </nav>
      </div>
    </div>
  `;
}

function renderScreenButton(screen, extraClassName = "") {
  const buttonLabel = state.appLanguage === APP_LANGUAGE_EN ? screen.label : screen.shortLabel;
  const screenIconUrl = getScreenIconUrl(screen.id);

  return `
    <button
      class="nav__button ${extraClassName} ${screen.id === state.activeScreen ? "is-active" : ""}"
      type="button"
      data-screen="${screen.id}"
      data-tooltip="${escapeHtml(buttonLabel)}"
      aria-pressed="${screen.id === state.activeScreen}"
      aria-label="${escapeHtml(buttonLabel)}"
      title="${escapeHtml(buttonLabel)}"
    >
      <span class="nav__icon">
        ${
          screenIconUrl
            ? `<img src="${escapeHtml(screenIconUrl)}" alt="" loading="eager" decoding="async" aria-hidden="true" />`
            : screen.icon
        }
      </span>
      <span class="nav__label">${escapeHtml(buttonLabel)}</span>
    </button>
  `;
}

function renderFileMenu() {
  const activeCampaignFileName = cleanText(state.campaignFileName) || getFileNameFromPath(state.campaignFilePath);
  const activeCampaignFilePath = cleanText(state.campaignFilePath);
  const activeCampaignSavedAt = formatCampaignSavedAt(state.campaignSavedAt);
  const buttonActive = state.menuHubOpen || state.fileMenuOpen || state.optionsMenuOpen;

  return `
    <div class="file-menu" data-file-menu>
      <button
        class="nav__button file-menu__trigger ${buttonActive ? "is-active" : ""}"
        type="button"
        data-action="toggle-file-menu"
        aria-expanded="${buttonActive}"
        aria-haspopup="menu"
        aria-label="${escapeHtml(t("menu_options"))}"
      >
        <span class="nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m19.14 12.94.04-.94-.04-.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.5 7.5 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.57.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.84a.5.5 0 0 0 .12.64l2.03 1.58-.04.94.04.94-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.57-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
          </svg>
        </span>
        <span class="nav__label">${escapeHtml(t("menu_options"))}</span>
      </button>
      ${
        state.menuHubOpen
          ? `
            <div class="file-menu__popover" role="menu">
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-file-menu-section">
                ${escapeHtml(t("menu_file"))}
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-account-dialog-view" data-account-dialog-view="account">
                ${escapeHtml(t("menu_account"))}
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-account-dialog-view" data-account-dialog-view="catalog">
                ${escapeHtml(t("menu_community_catalog"))}
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-options-menu-section">
                ${escapeHtml(t("menu_settings"))}
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-release-notes-screen">
                ${escapeHtml(t("menu_release_notes"))}
              </button>
            </div>
          `
          : ""
      }
      ${
        state.fileMenuOpen
          ? `
            <div class="file-menu__popover" role="menu">
              <button class="file-menu__item" type="button" role="menuitem" data-action="open-menu-hub">
                ${escapeHtml(t("options_back"))}
              </button>
              ${
                activeCampaignFileName
                  ? `
                    <div class="file-menu__status">
                      <span class="file-menu__status-label">Fichero de campana activa:</span>
                      <strong class="file-menu__status-name">${escapeHtml(activeCampaignFileName)}</strong>
                      ${activeCampaignSavedAt ? `<small class="file-menu__status-date">Ultimo guardado: ${escapeHtml(activeCampaignSavedAt)}</small>` : ""}
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
                Nueva campaña
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="save-campaign-file">
                Guardar campaña
                <span>Ctrl+S</span>
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="save-campaign-file-as">
                Guardar campaña como
              </button>
              <button class="file-menu__item" type="button" role="menuitem" data-action="choose-campaign-file">
                Cargar campaña
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

function renderOptionsDialog() {
  if (!state.optionsMenuOpen) {
    return "";
  }

  const activeSection = normalizeStoredOptionsMenuSection(state.optionsMenuSection);
  const usesVariableHp = state.enemyHpMode === ENEMY_HP_MODE_VARIABLE;
  const includesNpcExperience = state.includeNpcInCombatExperience === true;
  const soundSettings = normalizeStoredSoundSettings(state.soundSettings);
  const optionSections = [
    { key: OPTIONS_MENU_SECTION_GENERAL, label: t("options_section_general") },
    { key: OPTIONS_MENU_SECTION_LANGUAGES, label: t("options_section_languages") },
    { key: OPTIONS_MENU_SECTION_SOUND, label: t("options_section_sound") }
  ];
  const soundOptions = [
    { key: "combat", label: t("options_sound_combat") },
    { key: "initiative", label: t("options_sound_initiative") },
    { key: "longRest", label: t("options_sound_long_rest") },
    { key: "levelUp", label: t("options_sound_level_up") },
    { key: "death", label: t("options_sound_death") }
  ];
  const renderGeneralSection = () => `
    <section class="options-dialog__section">
      <div class="options-dialog__section-heading">
        <strong>${escapeHtml(t("options_section_general"))}</strong>
      </div>
      <div class="options-dialog__switch-card ${usesVariableHp ? "is-selected" : ""}">
        <div class="options-dialog__switch-copy">
          <strong>${escapeHtml(usesVariableHp ? t("options_enemy_hp_variable") : t("options_enemy_hp_standard"))}</strong>
          <small>${escapeHtml(usesVariableHp ? t("options_enemy_hp_variable_help") : t("options_enemy_hp_standard_help"))}</small>
        </div>
        <label class="options-dialog__switch" aria-label="Alternar vida variable de enemigos">
          <input
            class="options-dialog__switch-input"
            type="checkbox"
            data-enemy-hp-mode-switch
            ${usesVariableHp ? "checked" : ""}
          />
          <span class="options-dialog__switch-track">
            <span class="options-dialog__switch-thumb"></span>
          </span>
        </label>
      </div>
      <div class="options-dialog__switch-card ${includesNpcExperience ? "is-selected" : ""}">
        <div class="options-dialog__switch-copy">
          <strong>${escapeHtml(includesNpcExperience ? t("options_npc_xp_on") : t("options_npc_xp_off"))}</strong>
          <small>${escapeHtml(includesNpcExperience ? t("options_npc_xp_on_help") : t("options_npc_xp_off_help"))}</small>
        </div>
        <label class="options-dialog__switch" aria-label="${escapeHtml(t("options_npc_xp_title"))}">
          <input
            class="options-dialog__switch-input"
            type="checkbox"
            data-npc-xp-switch
            ${includesNpcExperience ? "checked" : ""}
          />
          <span class="options-dialog__switch-track">
            <span class="options-dialog__switch-thumb"></span>
          </span>
        </label>
      </div>
    </section>
  `;
  const renderLanguageSection = () => `
    <section class="options-dialog__section">
      <div class="options-dialog__section-heading">
        <strong>${escapeHtml(t("options_section_languages"))}</strong>
      </div>
      <div class="options-dialog__language-card">
        <strong>${escapeHtml(t("options_language_title"))}</strong>
        <div class="options-dialog__language-actions">
          <button
            class="summary-button ${state.appLanguage === APP_LANGUAGE_ES ? "" : "summary-button--ghost"}"
            type="button"
            data-action="set-app-language"
            data-app-language="${APP_LANGUAGE_ES}"
          >
            ${escapeHtml(t("options_language_es"))}
          </button>
          <button
            class="summary-button ${state.appLanguage === APP_LANGUAGE_EN ? "" : "summary-button--ghost"}"
            type="button"
            data-action="set-app-language"
            data-app-language="${APP_LANGUAGE_EN}"
          >
            ${escapeHtml(t("options_language_en"))}
          </button>
        </div>
      </div>
      <div class="options-dialog__language-card">
        <strong>${escapeHtml(t("options_content_language_title"))}</strong>
        <small>${escapeHtml(t("options_content_language_help"))}</small>
        <div class="options-dialog__language-actions">
          <button
            class="summary-button ${state.contentLanguage === CONTENT_LANGUAGE_ES ? "" : "summary-button--ghost"}"
            type="button"
            data-action="set-content-language"
            data-content-language="${CONTENT_LANGUAGE_ES}"
          >
            ${escapeHtml(t("options_content_language_es"))}
          </button>
          <button
            class="summary-button ${state.contentLanguage === CONTENT_LANGUAGE_EN ? "" : "summary-button--ghost"}"
            type="button"
            data-action="set-content-language"
            data-content-language="${CONTENT_LANGUAGE_EN}"
          >
            ${escapeHtml(t("options_content_language_en"))}
          </button>
        </div>
      </div>
    </section>
  `;
  const renderSoundSection = () => `
    <section class="options-dialog__section">
      <div class="options-dialog__section-heading">
        <strong>${escapeHtml(t("options_section_sound"))}</strong>
      </div>
      <div class="options-dialog__language-card">
        <strong>${escapeHtml(t("options_sound_title"))}</strong>
        <div class="options-dialog__switch-card ${soundSettings.enabled ? "is-selected" : ""}">
          <div class="options-dialog__switch-copy">
            <strong>${escapeHtml(t("options_sound_enabled"))}</strong>
            <small>${escapeHtml(t("options_sound_enabled_help"))}</small>
          </div>
          <label class="options-dialog__switch" aria-label="${escapeHtml(t("options_sound_title"))}">
            <input
              class="options-dialog__switch-input"
              type="checkbox"
              data-sound-effects-enabled
              ${soundSettings.enabled ? "checked" : ""}
            />
            <span class="options-dialog__switch-track">
              <span class="options-dialog__switch-thumb"></span>
            </span>
          </label>
        </div>
        <div class="options-dialog__sound-list">
          ${soundOptions.map((option) => `
            <label class="options-dialog__sound-option${soundSettings[option.key] ? " is-selected" : ""}">
              <input
                class="options-dialog__sound-checkbox"
                type="checkbox"
                data-sound-effect-key="${escapeHtml(option.key)}"
                ${soundSettings[option.key] ? "checked" : ""}
              />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `).join("")}
        </div>
      </div>
    </section>
  `;
  const sectionContent = activeSection === OPTIONS_MENU_SECTION_LANGUAGES
    ? renderLanguageSection()
    : activeSection === OPTIONS_MENU_SECTION_SOUND
      ? renderSoundSection()
      : renderGeneralSection();

  return `
    <div class="options-dialog" data-options-menu>
      <button
        class="options-dialog__backdrop"
        type="button"
        data-action="close-options-menu"
        aria-label="Cerrar opciones"
      ></button>
      <section
        class="options-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label="${escapeHtml(t("menu_settings"))}"
      >
        <div class="options-dialog__layout">
          <aside class="options-dialog__sidebar" aria-label="${escapeHtml(t("menu_settings"))}">
            <div class="options-dialog__sidebar-title">${escapeHtml(t("menu_settings"))}</div>
            <div class="options-dialog__section-list">
              ${optionSections.map((section) => `
                <button
                  class="options-dialog__section-button${section.key === activeSection ? " is-active" : ""}"
                  type="button"
                  data-action="set-options-section"
                  data-options-section="${escapeHtml(section.key)}"
                >
                  ${escapeHtml(section.label)}
                </button>
              `).join("")}
            </div>
          </aside>
          <div class="options-dialog__content">
            <div class="options-dialog__header">
              <button
                class="summary-button summary-button--ghost options-dialog__close"
                type="button"
                data-action="close-options-menu"
              >
                ${escapeHtml(t("options_close"))}
              </button>
            </div>
            ${sectionContent}
          </div>
        </div>
      </section>
    </div>
  `;
}

function syncTopbarNavigationMetrics() {
  const navStack = app.querySelector(".topbar__nav-stack");
  const navButtons = navStack ? [...navStack.querySelectorAll(".nav__button[data-screen]")] : [];
  const firstButton = navButtons[0] ?? null;

  if (!navStack || !firstButton || navButtons.length === 0) {
    return;
  }

  const firstButtonWidth = firstButton.getBoundingClientRect().width;
  const maxButtonWidth = navButtons.reduce((maxWidth, button) => {
    const label = button.querySelector(".nav__label");
    const icon = button.querySelector(".nav__icon");
    const naturalWidth = Math.ceil(
      Math.max(
        button.getBoundingClientRect().width,
        (label?.scrollWidth ?? 0) + 20,
        (icon?.getBoundingClientRect().width ?? 0) + 18,
        96
      )
    );

    return Math.max(maxWidth, naturalWidth);
  }, 0);

  navStack.style.setProperty("--nav-stagger", `${Math.max(0, firstButtonWidth / 4)}px`);
  navStack.style.setProperty("--nav-button-width", `${Math.ceil(maxButtonWidth)}px`);
}

function getCampaignDisplayName() {
  return state.campaignFileName || state.cloudCampaignId || state.campaignLoadedFromPublic
    ? cleanText(state.campaignName) || getCampaignNameFromFileName(state.campaignFileName)
    : "Sin campaña";
}

function normalizeStoredAppLanguage(value) {
  return cleanText(value) === APP_LANGUAGE_EN ? APP_LANGUAGE_EN : APP_LANGUAGE_ES;
}

function normalizeStoredContentLanguage(value) {
  return cleanText(value) === CONTENT_LANGUAGE_EN ? CONTENT_LANGUAGE_EN : CONTENT_LANGUAGE_ES;
}

function normalizeStoredNpcExperienceSetting(value) {
  return value === true;
}

function normalizeStoredSoundSettings(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    enabled: source.enabled !== false,
    combat: source.combat !== false,
    initiative: source.initiative !== false,
    longRest: source.longRest !== false,
    levelUp: source.levelUp !== false,
    death: source.death !== false
  };
}

function normalizeStoredOptionsMenuSection(value) {
  const normalizedValue = cleanText(value).toLowerCase();
  return OPTIONS_MENU_SECTIONS.includes(normalizedValue) ? normalizedValue : OPTIONS_MENU_SECTION_GENERAL;
}

function normalizeStoredRepositoryCsvPaths(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    bestiary: normalizeRepositoryCsvPath(source.bestiary) || defaultRepositoryCsvPaths.bestiary,
    items: normalizeRepositoryCsvPath(source.items) || defaultRepositoryCsvPaths.items,
    arcanum: normalizeRepositoryCsvPath(source.arcanum) || defaultRepositoryCsvPaths.arcanum
  };
}

function isEnglishInterface() {
  return normalizeStoredAppLanguage(state?.appLanguage) === APP_LANGUAGE_EN;
}

function getCurrentHitPointLabelShort() {
  return isEnglishInterface() ? "HP" : "PV";
}

function getSystemTableKind(table) {
  if (!isPlainObject(table)) {
    return "";
  }

  const tableId = cleanText(table.id).toLowerCase();
  const tableName = cleanText(table.name).toLowerCase();
  const firstColumnLabel = cleanText(Array.isArray(table.columns) ? table.columns[0]?.label : "").toLowerCase();

  if (tableId.startsWith("loot-table-")) {
    return tableId;
  }

  const lootTableMatch = normalizeSearchText(tableName).match(/^(?:table|tabla)\s+([a-i])$/i);

  if (lootTableMatch) {
    return `loot-table-${lootTableMatch[1].toLowerCase()}`;
  }

  if (
    tableName === "tabla estados"
    || tableName === "conditions table"
    || tableName.includes("estado")
    || tableName.includes("condition")
    || firstColumnLabel.includes("estado")
    || firstColumnLabel.includes("condition")
  ) {
    return "status";
  }

  if (tableName === "tabla magia salvaje" || tableName === "wild magic table" || (tableName.includes("magia salvaje") || tableName.includes("wild magic"))) {
    return "wild-magic";
  }

  return "";
}

function getItemAttunementLabel() {
  return normalizeStoredContentLanguage(state.contentLanguage) === CONTENT_LANGUAGE_EN
    ? "Attunement"
    : "Sintonizacion";
}

function getLocalizedSystemTableTemplate(kind, language = state.contentLanguage) {
  const normalizedLanguage = normalizeStoredContentLanguage(language);
  return getLocalizedSystemTableDefinitions(normalizedLanguage).find((table) => getSystemTableKind(table) === kind) ?? null;
}

function applyLocalizedSystemTableTemplate(table, template) {
  if (!isPlainObject(table) || !isPlainObject(template)) {
    return table;
  }

  const nextColumns = template.columns.map((label, index) => ({
    id: cleanText(table.columns?.[index]?.id) || createStableId("table-col"),
    label: cleanText(label) || `Columna ${index + 1}`,
    width: normalizeStoredTableColumnWidth(table.columns?.[index]?.width)
  }));
  const nextRows = template.rows.map((row, rowIndex) => ({
    id: cleanText(table.rows?.[rowIndex]?.id) || createStableId("table-row"),
    cells: Object.fromEntries(nextColumns.map((column, columnIndex) => [column.id, cleanText(row[columnIndex])]))
  }));

  return {
    ...table,
    name: cleanText(template.name) || cleanText(table.name),
    columns: nextColumns,
    rows: nextRows
  };
}

function getCanonicalCombatStatusName(statusName) {
  const rawStatus = cleanText(statusName);
  const normalizedStatus = normalizeTranslationKey(rawStatus.toLowerCase());
  const exhaustionMatch = rawStatus.match(/^(agotamiento|exhaustion)(?:\s+(\d+))?$/i);

  if (exhaustionMatch) {
    const level = Math.max(1, Math.floor(toNumber(exhaustionMatch[2]) || 1));
    return `Agotamiento ${level}`;
  }

  if (normalizedStatus === "domido") {
    return "Dormido";
  }

  return combatStatusEnToEsMap.get(normalizedStatus) || rawStatus;
}

function translateCombatStatusNameForLanguage(statusName, language = state.contentLanguage) {
  const rawStatus = cleanText(statusName);
  const normalizedLanguage = normalizeStoredAppLanguage(language);
  const exhaustionMatch = rawStatus.match(/^(agotamiento|exhaustion)(?:\s+(\d+))?$/i);

  if (exhaustionMatch) {
    const level = Math.max(1, Math.floor(toNumber(exhaustionMatch[2]) || 1));
    return normalizedLanguage === APP_LANGUAGE_EN ? `Exhaustion ${level}` : `Agotamiento ${level}`;
  }

  const normalizedStatus = normalizeTranslationKey(rawStatus.toLowerCase());

  if (normalizedStatus === "domido") {
    return normalizedLanguage === APP_LANGUAGE_EN ? "Sleeping" : "Dormido";
  }

  if (normalizedLanguage === APP_LANGUAGE_EN) {
    return combatStatusEsToEnMap.get(normalizedStatus) || rawStatus;
  }

  return combatStatusEnToEsMap.get(normalizedStatus) || rawStatus;
}

function synchronizeLanguageSpecificSystemData({ syncCombatants = false } = {}) {
  const dataLanguage = normalizeStoredContentLanguage(state.contentLanguage);

  state.tableFolders = state.tableFolders.map((folder) => {
    if (folder.id !== "table-folder-loot-tables") {
      return folder;
    }

    const template = getLocalizedSystemTableFolders(dataLanguage).find((entry) => entry.id === folder.id);
    return template ? { ...folder, name: template.name } : folder;
  });

  state.tables = state.tables.map((table) => {
    const kind = getSystemTableKind(table);

    if (!kind) {
      return table;
    }

    const template = getLocalizedSystemTableTemplate(kind, dataLanguage);
    return template ? applyLocalizedSystemTableTemplate(table, template) : table;
  });

  if (!syncCombatants) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    const currentStatuses = getCombatantStatusNames(combatant);

    if (currentStatuses.length === 0) {
      return combatant;
    }

    const nextStatuses = currentStatuses.map((entry) => translateCombatStatusNameForLanguage(entry, dataLanguage));

    return normalizeCombatant({
      ...combatant,
      condiciones: nextStatuses.join(", ")
    });
  });
}

function t(key, replacements = {}) {
  const language = normalizeStoredAppLanguage(state?.appLanguage);
  const template = UI_STRINGS[language]?.[key] ?? UI_STRINGS[APP_LANGUAGE_ES]?.[key] ?? key;

  return Object.entries(replacements).reduce((result, [replacementKey, replacementValue]) => {
    return result.replaceAll(`{${replacementKey}}`, String(replacementValue));
  }, template);
}

function normalizeTranslationKey(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function translateUiString(value) {
  let translatedValue = String(value);

  if (UI_TEXT_TRANSLATIONS_EN.has(translatedValue)) {
    return UI_TEXT_TRANSLATIONS_EN.get(translatedValue);
  }

  const normalizedKey = normalizeTranslationKey(translatedValue);

  if (UI_TEXT_TRANSLATIONS_EN_NORMALIZED.has(normalizedKey)) {
    return UI_TEXT_TRANSLATIONS_EN_NORMALIZED.get(normalizedKey);
  }

  for (const [pattern, replacement] of UI_REGEX_TRANSLATIONS_EN) {
    if (pattern.test(translatedValue)) {
      translatedValue = translatedValue.replace(pattern, replacement);
    }
  }

  return translatedValue;
}

function shouldSkipUiTranslation(element) {
  return Boolean(element?.closest?.(UI_TRANSLATION_EXCLUDED_SELECTOR));
}

function applyInterfaceTranslations(root = app) {
  if (!root || normalizeStoredAppLanguage(state.appLanguage) !== APP_LANGUAGE_EN) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const parentElement = currentNode.parentElement;

    if (parentElement && !shouldSkipUiTranslation(parentElement)) {
      const rawValue = currentNode.nodeValue ?? "";
      const trimmedValue = rawValue.trim();

      if (trimmedValue) {
        const translatedValue = translateUiString(trimmedValue);

        if (translatedValue !== trimmedValue) {
          currentNode.nodeValue = rawValue.replace(trimmedValue, translatedValue);
        }
      }
    }

    currentNode = walker.nextNode();
  }

  root.querySelectorAll("*").forEach((element) => {
    if (shouldSkipUiTranslation(element)) {
      return;
    }

    ["placeholder", "title", "aria-label", "data-tooltip"].forEach((attributeName) => {
      const attributeValue = element.getAttribute(attributeName);

      if (!attributeValue) {
        return;
      }

      let translatedValue =
        UI_ATTRIBUTE_TRANSLATIONS_EN.get(attributeValue)
        ?? UI_ATTRIBUTE_TRANSLATIONS_EN_NORMALIZED.get(normalizeTranslationKey(attributeValue))
        ?? translateUiString(attributeValue);

      for (const [pattern, replacement] of UI_REGEX_TRANSLATIONS_EN) {
        if (pattern.test(translatedValue)) {
          translatedValue = translatedValue.replace(pattern, replacement);
        }
      }

      if (translatedValue !== attributeValue) {
        element.setAttribute(attributeName, translatedValue);
      }
    });
  });
}

function renderScreen() {
  if (state.activeScreen === "combat-tracker") {
    try {
      return renderCombatTracker();
    } catch (error) {
      console.error("Combat Tracker render failed", error);
      return renderScreenErrorPanel(
        "Combat Tracker",
        error instanceof Error ? error.message : "Error desconocido al renderizar combate."
      );
    }
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

  if (state.activeScreen === "diary") {
    return renderDiaryScreen();
  }

  if (state.activeScreen === "tables") {
    return renderTablesScreen();
  }

  if (state.activeScreen === "release-notes") {
    return renderReleaseNotesScreen();
  }

  return renderPlaceholderScreen(
    "Session Vault",
    "Esta pantalla puede agrupar criaturas guardadas, encuentros preparados, notas de sesion y presets de campana."
  );
}

function renderReleaseNotesScreen() {
  const activeRelease = getActiveReleaseNote();

  return `
    <section class="panel release-notes-screen">
      <div class="section-heading">
        ${renderScreenHeadingIdentity(
          "release-notes",
          state.appLanguage === APP_LANGUAGE_EN ? "Change history" : "Historial de cambios",
          state.appLanguage === APP_LANGUAGE_EN ? "Release notes" : "Notas de version"
        )}
        <div class="section-heading__side">
          <span class="section-meta">
            <span>${escapeHtml(APP_VERSION)}</span>
          </span>
        </div>
      </div>
      <div class="release-notes-layout">
        <aside class="release-notes-sidebar" aria-label="${escapeHtml(state.appLanguage === APP_LANGUAGE_EN ? "Published versions" : "Versiones publicadas")}">
          ${RELEASE_NOTES.map((release) => `
            <button
              class="release-version-card${release.version === activeRelease.version ? " is-active" : ""}"
              type="button"
              data-action="select-release-notes-version"
              data-release-version="${escapeHtml(release.version)}"
              aria-pressed="${release.version === activeRelease.version}"
            >
              <strong>${escapeHtml(getLocalizedReleaseNoteContent(release).heading)}</strong>
              <span>${escapeHtml(getLocalizedReleaseNoteContent(release).sidebarModifiedLabel)}</span>
              <small>${escapeHtml(formatReleaseNoteDate(release.modifiedDate))}</small>
            </button>
          `).join("")}
        </aside>
        <div class="release-notes-detail">
          ${renderReleaseNoteDetail(activeRelease)}
        </div>
      </div>
    </section>
  `;
}

function renderReleaseNoteDetail(release) {
  const content = getLocalizedReleaseNoteContent(release);

  return `
    <article class="release-note-card">
      <header class="release-note-card__header">
        <div>
          <p class="release-note-card__modified">${escapeHtml(content.modifiedLabel)}: ${escapeHtml(formatReleaseNoteDate(release.modifiedDate))}</p>
          <h3>${escapeHtml(content.heading)}</h3>
        </div>
        <span class="release-note-card__version">${escapeHtml(release.version)}</span>
      </header>
      <p class="release-note-card__summary">${escapeHtml(content.summary)}</p>
      <div class="release-note-card__groups">
        ${content.groups.map((group) => `
          <section class="release-note-group">
            <h4>${escapeHtml(group.title)}</h4>
            <div class="release-note-card__sections">
              ${group.sections.map((section) => `
                <section class="release-note-section">
                  <h5>${escapeHtml(section.title)}</h5>
                  <ul>
                    ${section.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}
                  </ul>
                </section>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function getActiveReleaseNote() {
  return RELEASE_NOTES.find((release) => release.version === state.activeReleaseNotesVersion) ?? RELEASE_NOTES[0];
}

function getLocalizedReleaseNoteContent(release) {
  const language = state.appLanguage === APP_LANGUAGE_EN ? APP_LANGUAGE_EN : APP_LANGUAGE_ES;
  return release.content?.[language] ?? release.content?.[APP_LANGUAGE_ES] ?? {
    heading: release.version,
    modifiedLabel: language === APP_LANGUAGE_EN ? "Last modified" : "Ultima modificacion",
    sidebarModifiedLabel: language === APP_LANGUAGE_EN ? "Notes modified" : "Notas modificadas",
    summary: "",
    groups: []
  };
}

function formatReleaseNoteDate(value) {
  const [year, month, day] = cleanText(value).split("-").map((part) => Math.floor(Number(part)));

  if (!year || !month || !day) {
    return cleanText(value);
  }

  if (state.appLanguage === APP_LANGUAGE_EN) {
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function normalizeReleaseNotesVersion(value) {
  const normalizedValue = cleanText(value);
  return RELEASE_NOTES.some((release) => release.version === normalizedValue)
    ? normalizedValue
    : RELEASE_NOTES[0]?.version || APP_VERSION;
}

function renderScreenErrorPanel(title, message) {
  return `
    <section class="panel">
      <div class="empty-state">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message || "Se produjo un error al renderizar esta pantalla.")}</p>
      </div>
    </section>
  `;
}

function renderCombatTracker() {
  const visibleCombatantResult = getVisibleCombatants();
  const visibleCombatants = Array.isArray(visibleCombatantResult) ? visibleCombatantResult : [];
  const turnOrderResult = getCombatTurnOrder(visibleCombatants);
  const turnOrder = Array.isArray(turnOrderResult) ? turnOrderResult : [];
  const turnParticipantResult = getCombatTurnParticipants(turnOrder);
  const turnParticipants = Array.isArray(turnParticipantResult) ? turnParticipantResult : [];
  const activeTurnCombatantId = state.isCombatActive ? getActiveTurnCombatantId(turnParticipants) : "";
  const allVisibleSelected =
    visibleCombatants.length > 0 &&
    visibleCombatants.every((combatant) => state.selectedIds.has(combatant.id));
  const battleTimerLabel = formatBattleTimer(getBattleTimerElapsedMs());
  const initiativeActionIconUrl = getCombatToolbarActionIconUrl("initiative");
  const combatActionIconUrl = getCombatToolbarActionIconUrl("combat");
  const longRestActionIconUrl = getCombatToolbarActionIconUrl("longRest");
  const combatActionTooltip = state.isCombatActive
    ? "Para el contador y oculta el visual de combate"
    : "Muestra el visual de combate para todas las filas ordenadas con un valor de iniciativa y enciende el contador";
  const combatActionLabel = state.isCombatActive
    ? "<span>Fin del</span><span>combate</span>"
    : "<span class=\"combat-action-button__single-line\">Combate !</span>";
  const hasVisibleCombatants = visibleCombatants.length > 0;
  const areaAmountValue = Number(state.areaDamage);
  const hasAreaAmount = Number.isFinite(areaAmountValue) && areaAmountValue >= 0;

  return `
    <section class="panel panel--table combat-tracker-panel">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("combat-tracker", "", t("combat_table_title"))}
        <div class="section-heading__side">
          ${!state.combatTimerPanelOpen
            ? `
              <div class="combat-heading__actions">
                ${renderCombatTimerToggleButton(false)}
              </div>
            `
            : ""}
        </div>
      </div>

      ${
        state.combatTimerPanelOpen || state.isCombatActive
          ? `
            <div class="combat-top-row">
              ${state.isCombatActive ? renderCombatTurnPanel(turnParticipants, activeTurnCombatantId) : ""}
              ${state.combatTimerPanelOpen ? renderCombatTimerPanel(battleTimerLabel) : ""}
            </div>
          `
          : ""
      }

      <div class="table-toolbar" aria-label="Acciones de tabla">
        <div class="table-toolbar__group combat-toolbar__search-row">
          <input
            class="filter-input filter-input--wide combat-search-input"
            type="search"
            value="${escapeHtml(state.combatSearchQuery)}"
            placeholder="Filtro buscador"
            data-combat-search
            aria-label="Filtro buscador"
          />
        </div>
        <div class="table-toolbar__group combat-toolbar__action-row">
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
        </div>
        <div class="table-toolbar__group combat-toolbar__secondary-row">
          ${renderCombatAreaEffectsBox(visibleCombatants, hasVisibleCombatants, hasAreaAmount)}

          <button
            class="toolbar-button toolbar-button--combat"
            type="button"
            data-action="generate-iniactiva"
            data-tooltip="Lanza la iniciativa sumando el bonus para las filas seleccionadas"
            ${state.selectedIds.size === 0 ? "disabled" : ""}
          >
            <span class="button-icon" aria-hidden="true"><img src="${escapeHtml(initiativeActionIconUrl)}" alt="" decoding="async" /></span>
            <span class="combat-action-button__label"><span>${escapeHtml(t("Generar"))}</span><span>${escapeHtml(t("iniciativa"))}</span></span>
          </button>
          <button
            class="toolbar-button toolbar-button--combat"
            type="button"
            data-action="${state.isCombatActive ? "end-combat-turns" : "start-combat-turns"}"
            data-tooltip="${escapeHtml(combatActionTooltip)}"
            ${!state.isCombatActive && turnParticipants.length === 0 ? "disabled" : ""}
          >
            <span class="button-icon" aria-hidden="true"><img src="${escapeHtml(combatActionIconUrl)}" alt="" decoding="async" /></span>
            <span class="combat-action-button__label combat-action-button__label--combat${state.isCombatActive ? "" : " combat-action-button__label--combat-start"}">
              ${combatActionLabel}
            </span>
          </button>
          <button
            class="toolbar-button toolbar-button--combat"
            type="button"
            data-action="combat-long-rest"
            data-tooltip="Todos los Aliados recuperan toda la vida, restauran vida maxima, dados de golpe, estados y usos de hechizos y habilidades."
          >
            <span class="button-icon" aria-hidden="true"><img src="${escapeHtml(longRestActionIconUrl)}" alt="" decoding="async" /></span>
            <span class="combat-action-button__label"><span>${escapeHtml(t("Descanso"))}</span><span>${escapeHtml(t("Largo"))}</span></span>
          </button>
        </div>
      </div>

      <div class="table-wrap" role="region" aria-label="Combat tracker" tabindex="0" data-render-scroll-key="combat-table">
        <table class="combat-table">
          <colgroup>
            <col style="width: 2.4rem" />
            ${columns.map((column) => `<col style="width: ${column.width}" />`).join("")}
          </colgroup>
          <thead>
            <tr>
              <th class="cell-select" scope="col">
                <span class="combat-inline-tooltip-anchor combat-inline-tooltip-anchor--corner" data-tooltip="Seleccionar todas las filas de la tabla">
                  <input
                    type="checkbox"
                    data-select-all
                    aria-label="Seleccionar todas las entidades visibles"
                    ${allVisibleSelected ? "checked" : ""}
                  />
                </span>
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
                  <span class="combat-inline-tooltip-anchor combat-inline-tooltip-anchor--side-right" data-tooltip="Añadir fila">
                    <button
                      class="add-row-button"
                      type="button"
                      data-action="add-blank-combatant"
                      aria-label="Anadir fila en blanco"
                    >
                      <span class="add-row-button__icon" aria-hidden="true">+</span>
                    </button>
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${renderCombatMaxHpRestoreMenu()}
    </section>
  `;
}

function renderCombatTimerToggleButton(isActive = false) {
  return `
    <button
      class="toolbar-button toolbar-button--combat combat-overview-toggle ${isActive ? "is-active" : ""}"
      type="button"
      data-action="toggle-combat-timer-panel"
      aria-expanded="${isActive}"
    >
      <span class="button-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M8 3h8v2h-1v2.1c0 .9.3 1.7.9 2.3l1.7 1.7c.9.9.9 2.3 0 3.2l-1.7 1.7c-.6.6-.9 1.4-.9 2.3V19h1v2H8v-2h1v-.7c0-.9-.3-1.7-.9-2.3l-1.7-1.7a2.27 2.27 0 0 1 0-3.2l1.7-1.7c.6-.6.9-1.4.9-2.3V5H8V3Zm2.6 4.6-.1.8c-.1 1.3-.7 2.5-1.7 3.4L7.3 13l1.5 1.2c1 .9 1.6 2.1 1.7 3.4l.1.4h2.8l.1-.4c.1-1.3.7-2.5 1.7-3.4l1.5-1.2-1.5-1.2c-1-.9-1.6-2.1-1.7-3.4l-.1-.8h-2.8Zm.4 2.4h1.9l.4 1.3 1.4 1.1-1.4 1.1-.4 1.3H11l-.4-1.3-1.4-1.1 1.4-1.1.4-1.3Z" />
        </svg>
      </span>
      Contador
    </button>
  `;
}

function renderCombatTimerPanel(battleTimerLabel) {
  return `
    <div class="combat-timer">
      <article class="combat-timer__card">
        <div class="combat-timer__toolbar">
          ${renderCombatTimerToggleButton(true)}
        </div>
        <div class="combat-timer__visual">
          <div class="combat-timer__hourglass" aria-hidden="true">
            <span class="combat-timer__hourglass-cap combat-timer__hourglass-cap--top"></span>
            <span class="combat-timer__hourglass-cap combat-timer__hourglass-cap--bottom"></span>
            <span class="combat-timer__hourglass-bulb combat-timer__hourglass-bulb--top"></span>
            <span class="combat-timer__hourglass-bulb combat-timer__hourglass-bulb--bottom"></span>
            <span class="combat-timer__hourglass-neck"></span>
            <span class="combat-timer__hourglass-sand combat-timer__hourglass-sand--top"></span>
            <span class="combat-timer__hourglass-sand combat-timer__hourglass-sand--stream"></span>
            <span class="combat-timer__hourglass-sand combat-timer__hourglass-sand--bottom"></span>
          </div>
          <div class="combat-timer__readout">
            <strong data-battle-timer-readout>${battleTimerLabel}</strong>
          </div>
        </div>
        <div class="summary-card__actions combat-timer__actions">
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
      </article>
    </div>
  `;
}

function renderCombatTurnPanel(turnOrder, activeTurnCombatantId) {
  if (turnOrder.length === 0) {
    return `
      <section class="panel panel--inner combat-turn-section">
        <div class="combat-turn-panel">
          <p class="combat-turn-panel__empty">No hay entidades visibles para el turno.</p>
        </div>
      </section>
    `;
  }

  const turnTokenScale = getCombatTurnTokenScale(turnOrder.length);

  return `
    <section class="panel panel--inner combat-turn-section">
      <div class="combat-turn-panel">
        <div class="combat-turn-panel__controls">
          <button
            class="summary-button summary-button--turn combat-turn-panel__button"
            type="button"
            data-action="advance-combat-turn"
          >
            ${escapeHtml(t("Pasar turno"))}
          </button>
          <div class="combat-turn-panel__menu-wrap" data-combat-turn-jump-menu>
            <button
              class="summary-button combat-turn-panel__button"
              type="button"
              data-action="toggle-combat-turn-jump-menu"
              aria-expanded="${state.combatTurnJumpMenuOpen}"
            >
              ${escapeHtml(t("jump_turn_to"))}
            </button>
            ${state.combatTurnJumpMenuOpen ? renderCombatTurnJumpMenu(turnOrder, activeTurnCombatantId) : ""}
          </div>
          <div class="combat-turn-panel__menu-wrap" data-combat-turn-round-menu>
            <button
              class="round-chip round-chip--button"
              type="button"
              data-action="toggle-combat-turn-round-editor"
              aria-expanded="${state.combatTurnRoundEditorOpen}"
            >
              ${escapeHtml(t("round_label"))} ${escapeHtml(String(getCombatRound()))}
            </button>
            ${state.combatTurnRoundEditorOpen ? renderCombatTurnRoundEditor() : ""}
          </div>
        </div>
        <div
          class="combat-turn-strip"
          style="--turn-token-scale:${turnTokenScale};--turn-strip-count:${turnOrder.length}"
          aria-label="Orden de iniciativa"
          data-render-scroll-key="combat-turn-strip"
        >
          ${turnOrder.map((combatant) => renderCombatTurnToken(combatant, combatant.id === activeTurnCombatantId)).join("")}
        </div>
      </div>
    </section>
    ${renderCombatTurnQuickMenu()}
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
  const initiativeIconUrl = getCombatToolbarActionIconUrl("initiative");
  const standNumber = cleanText(combatant.numPeana);
  const label = cleanText(combatant.nombre) || "Sin nombre";
  const side = mapTagToSide(combatant.tag);
  const initials = getCombatantInitials(combatant);
  const statusNames = getCombatantStatusNames(combatant).slice(0, 3);
  const isFallenAlly = side === "allies" && toNumber(combatant.pgAct) < 1;
  const maxHp = Math.max(1, getEffectivePgMax(combatant));
  const hpFill = Math.max(0, Math.min(100, Math.round((toNumber(combatant.pgAct) / maxHp) * 100)));
  const hpVisualFill = getCombatHealthVisualFill(hpFill);
  const hpToneColor = getCombatHealthToneColor(hpFill);

  return `
    <div
      class="combat-turn-token-wrap ${isActive ? "is-active" : ""} ${isFallenAlly ? "is-fallen-ally" : ""}"
      style="--turn-hp-fill:${hpVisualFill}%;--turn-hp-color:${hpToneColor}"
      role="button"
      tabindex="0"
      data-action="focus-combatant-row"
      data-combatant-id="${escapeHtml(combatant.id)}"
      title="${escapeHtml(label)} | Inic ${escapeHtml(String(combatant.iniactiva ?? ""))}"
    >
      <span class="combat-turn-token__initiative" data-tooltip="Iniciativa en el combate">
        <img class="combat-turn-token__initiative-icon" src="${escapeHtml(initiativeIconUrl)}" alt="" decoding="async" aria-hidden="true" />
        <span>${escapeHtml(String(combatant.iniactiva ?? "-"))}</span>
      </span>
      <div class="combat-turn-token combat-turn-token--${side}" data-combat-turn-token-context="${escapeHtml(combatant.id)}">
        ${
          tokenUrl
            ? `<img src="${escapeHtml(tokenUrl)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`
            : `<span class="combat-turn-token__placeholder" aria-hidden="true">${escapeHtml(initials)}</span>`
        }
        ${isEnemyCombatant(combatant) && standNumber ? `<span class="combat-turn-token__stand">${escapeHtml(standNumber)}</span>` : ""}
      </div>
      <div class="combat-turn-token__statuses">
        ${statusNames.map((statusName) => renderCombatTurnStatusChip(combatant.id, statusName)).join("")}
      </div>
    </div>
  `;
}

function renderCombatTurnQuickMenu() {
  const combatantId = cleanText(state.combatTurnQuickMenu?.combatantId);

  if (!combatantId) {
    return "";
  }

  const combatant = state.combatants.find((entry) => entry.id === combatantId);

  if (!combatant) {
    return "";
  }

  const menuStyle = getCombatTurnQuickMenuStyle();
  const effectiveMax = getEffectivePgMax(combatant);
  const tempHp = Math.max(0, toNumber(combatant.pgTemp));

  return `
    <div class="combat-turn-quick-menu" style="${escapeHtml(menuStyle)}" data-combat-turn-quick-menu>
      <div class="combat-turn-quick-menu__panel">
        <div class="combat-turn-quick-menu__header">
          <strong>${escapeHtml(cleanText(combatant.nombre) || "Entidad")}</strong>
          <span>${escapeHtml(`${getCurrentHitPointLabelShort()} ${toNumber(combatant.pgAct)}/${effectiveMax} | TEMP ${tempHp}`)}</span>
        </div>
        <div class="resource-cell__actions-row combat-turn-quick-menu__actions-row">
          <div class="inline-adjust inline-adjust--group combat-turn-quick-menu__controls">
            <input
              class="mini-input combat-turn-quick-menu__input"
              type="number"
              inputmode="numeric"
              placeholder="0"
              value="${escapeHtml(state.combatTurnQuickMenu?.value ?? "")}"
              data-combat-turn-quick-value
              aria-label="Cantidad para ajustar recursos de ${escapeHtml(cleanText(combatant.nombre) || combatant.id)}"
            />
            <div class="mini-actions combat-turn-quick-menu__actions">
              <button class="mini-action mini-action--damage" type="button" data-action="adjust-combat-turn-quick-resource" data-mode="damage" data-tooltip="DaÃ±o">
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("damage")}</span>
              </button>
              <button class="mini-action mini-action--heal" type="button" data-action="adjust-combat-turn-quick-resource" data-mode="heal" data-tooltip="Curacion">
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("heal")}</span>
              </button>
              <button class="mini-action mini-action--necrotic" type="button" data-action="adjust-combat-turn-quick-resource" data-mode="necrotic" data-tooltip="Necrotico">
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("necrotic")}</span>
              </button>
              <button class="mini-action mini-action--temp" type="button" data-action="adjust-combat-turn-quick-resource" data-mode="temp" data-tooltip="Vida temporal">
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("temp")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCombatMaxHpRestoreMenu() {
  const combatantId = cleanText(state.combatMaxHpRestoreMenu?.combatantId);

  if (!combatantId) {
    return "";
  }

  const combatant = state.combatants.find((entry) => entry.id === combatantId);

  if (!combatant || toNumber(combatant.necrotic) <= 0) {
    return "";
  }

  const menuStyle = getCombatMaxHpRestoreMenuStyle();

  return `
    <div class="combat-maxhp-restore-menu" style="${escapeHtml(menuStyle)}" data-combat-maxhp-restore-menu>
      <div class="combat-maxhp-restore-menu__panel">
        <button
          class="toolbar-button toolbar-button--combat combat-maxhp-restore-menu__button"
          type="button"
          data-action="restore-combatant-max-hp"
          data-combatant-id="${escapeHtml(combatant.id)}"
        >
          RESTAURAR
        </button>
      </div>
    </div>
  `;
}

function getCombatTurnQuickMenuStyle() {
  const rawX = Math.round(toNumber(state.combatTurnQuickMenu?.x));
  const rawY = Math.round(toNumber(state.combatTurnQuickMenu?.y));
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  const padding = 12;
  const menuWidth = 320;
  const menuHeight = 120;
  const left = Math.max(padding, Math.min(rawX, viewportWidth - menuWidth - padding));
  const top = Math.max(padding, Math.min(rawY, viewportHeight - menuHeight - padding));

  return `left:${left}px;top:${top}px;`;
}

function getCombatMaxHpRestoreMenuStyle() {
  const rawX = Math.round(toNumber(state.combatMaxHpRestoreMenu?.x));
  const rawY = Math.round(toNumber(state.combatMaxHpRestoreMenu?.y));
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  const padding = 12;
  const menuWidth = 208;
  const menuHeight = 72;
  const left = Math.max(padding, Math.min(rawX, viewportWidth - menuWidth - padding));
  const top = Math.max(padding, Math.min(rawY, viewportHeight - menuHeight - padding));

  return `left:${left}px;top:${top}px;`;
}

function renderCombatTurnStatusChip(combatantId, statusName) {
  const localizedStatusName = translateCombatStatusNameForLanguage(statusName, state.appLanguage);
  const description = getCombatStatusDescription(statusName) || "Sin descripcion disponible.";
  const tone = getCombatStatusToneClass(statusName);
  const iconUrl = getCombatStatusIconUrl(getCanonicalCombatStatusName(statusName));
  const fallbackLabel = cleanText(localizedStatusName).slice(0, 2).toUpperCase() || "?";

  return `
    <span
      class="combat-turn-token__status-wrap"
      tabindex="0"
      aria-label="${escapeHtml(localizedStatusName)}"
      data-combat-turn-status-remove
      data-combatant-id="${escapeHtml(combatantId)}"
      data-combat-status="${escapeHtml(statusName)}"
    >
      <span class="combat-turn-token__status ${tone}" aria-hidden="true">
        ${
          iconUrl
            ? `<img class="combat-turn-token__status-icon" src="${escapeHtml(iconUrl)}" alt="" decoding="async" />`
            : `<span class="combat-turn-token__status-fallback">${escapeHtml(fallbackLabel)}</span>`
        }
      </span>
      <span class="combat-turn-token__status-tooltip" role="tooltip">
        <strong>${escapeHtml(localizedStatusName)}</strong>
        <span>${escapeHtml(description)}</span>
      </span>
    </span>
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

function selectCombatTurnToken(combatantId, options = {}) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  if (options.additive) {
    if (state.selectedIds.has(normalizedCombatantId)) {
      state.selectedIds.delete(normalizedCombatantId);
    } else {
      state.selectedIds.add(normalizedCombatantId);
    }

    render();
    return;
  }

  state.selectedIds = new Set([normalizedCombatantId]);
  render();
  focusCombatantRow(normalizedCombatantId);
}

function closeOpenCombatInlineMenus() {
  app.querySelectorAll(".combat-inline-menu[open]").forEach((element) => {
    element.removeAttribute("open");
  });
}

function renderCombatEncounterPicker() {
  const encounters = Array.isArray(state.encounters) ? state.encounters : [];
  const characters = Array.isArray(state.characters) ? state.characters : [];
  const hasEncounters = encounters.length > 0;
  const hasCharacters = characters.length > 0;
  const hasAddOptions = hasEncounters || hasCharacters;

  return `
    <div class="combat-encounter-picker${state.combatEncounterPickerOpen ? " is-open" : ""}" data-combat-encounter-menu>
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
      <span>${Array.isArray(state.characters) ? state.characters.length : 0} aliados creados</span>
    </button>
    <button
      class="combat-encounter-picker__option"
      type="button"
      data-action="select-combat-add-source"
      data-add-source="encounters"
      ${hasEncounters ? "" : "disabled"}
    >
      <strong>Encuentro</strong>
      <span>${Array.isArray(state.encounters) ? state.encounters.length : 0} encuentros guardados</span>
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
  const availableCharacters = characters.filter((character) => !isCharacterAlreadyInCombat(character.id));

  return `
    ${renderCombatAddPickerBackButton()}
    <button
      class="combat-encounter-picker__option combat-encounter-picker__option--accent"
      type="button"
      data-action="import-all-combat-characters"
      ${availableCharacters.length > 0 ? "" : "disabled"}
    >
      <strong>Anadir todos</strong>
      <span>${availableCharacters.length} disponibles</span>
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
  const isAlreadyInCombat = isCharacterAlreadyInCombat(character.id);

  return `
    <button
      class="combat-encounter-picker__option combat-encounter-picker__option--character"
      type="button"
      data-action="import-combat-character"
      data-character-id="${escapeHtml(character.id)}"
      ${isAlreadyInCombat ? "disabled" : ""}
    >
      <span class="combat-character-picker__avatar">
        ${renderCharacterAvatar(character)}
      </span>
      <span>
        <strong>${escapeHtml(character.name || "Personaje sin nombre")}</strong>
        <small>${escapeHtml(isAlreadyInCombat ? `${subtitle} | Ya en combate` : subtitle)}</small>
      </span>
    </button>
  `;
}

function renderCombatAddPickerBackButton() {
  return `
    <button class="combat-encounter-picker__back" type="button" data-action="back-combat-add-menu">
      <span aria-hidden="true"><</span>
      ${escapeHtml(t("options_back"))}
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

  return `
    <section class="encounter-inventory">
      ${state.encounterInventoryOpen ? renderEncounterInventoryPanel(activeEncounter) : ""}
      <div class="encounter-inventory__bar">
        <p class="eyebrow encounter-inventory__title">${escapeHtml(translateUiString("Repositorio de enemigos"))}</p>
      </div>
    </section>
  `;
}

function renderEncounterInventoryPanel(activeEncounter) {
  return `
    <div class="encounter-inventory__panel">
      <aside class="encounter-list" aria-label="Encuentros guardados">
        <div class="encounter-list__header">
          <div class="encounter-list__header-main">
            <p class="eyebrow">Listas guardadas</p>
            <h3>Encuentros</h3>
            <div class="encounter-list__actions encounter-list__actions--stacked">
              <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-encounter-folder">
                Nueva carpeta
              </button>
              <button class="toolbar-button" type="button" data-action="create-encounter">
                Nuevo encuentro
              </button>
            </div>
          </div>
          <div class="encounter-list__header-side">
            <button class="toolbar-button" type="button" data-action="open-encounter-import-export">
              ${escapeHtml(t("import_export_button"))}
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
    <section class="panel panel--table compendium-panel bestiary-showcase bestiary-showcase--hearth">
      <div class="section-heading section-heading--bestiary">
        ${renderScreenHeadingIdentity("bestiary", "", t("bestiary_title"))}
        <div class="encounter-inventory__heading encounter-inventory__heading--inline">
          <p class="eyebrow bestiary-heading__eyebrow">${escapeHtml(t("bestiary_encounter_editor"))}</p>
          <button
            class="toolbar-button toolbar-button--accent encounter-inventory__toggle"
            type="button"
            data-action="toggle-encounter-inventory"
            aria-expanded="${state.encounterInventoryOpen}"
          >
            ${escapeHtml(t(state.encounterInventoryOpen ? "bestiary_hide_inventory" : "bestiary_show_inventory"))}
          </button>
        </div>
      <div class="section-heading__side">
        <div class="section-meta bestiary-showcase__meta">
          ${renderRepositoryCsvPicker("bestiary")}
          <span>${escapeHtml(t("bestiary_visible", { count: filteredEntries.length }))}</span>
          <span>${escapeHtml(t("bestiary_total", { count: state.bestiary.length }))}</span>
        </div>
      </div>
      </div>

      ${renderEncounterInventorySection()}

      <div class="bestiary-toolbar" aria-label="${escapeHtml(t("bestiary_filters_label"))}">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderBestiaryQueryField()}
          <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-bestiary-filters">${escapeHtml(t("bestiary_clear_filters"))}</button>
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--filters">
          ${renderBestiaryFilterDropdown("type", t("filter_type"))}
          ${renderBestiaryFilterDropdown("environment", t("filter_environment"))}
          ${renderBestiaryFilterDropdown("crBase", "CR")}
          ${renderBestiaryFilterDropdown("source", t("filter_source"))}
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
    <section class="panel panel--table compendium-panel">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("items", t("items_eyebrow"), t("items_title"))}
        <div class="section-meta">
          ${renderRepositoryCsvPicker("items")}
          <span>${escapeHtml(t("bestiary_visible", { count: filteredEntries.length }))}</span>
          <span>${escapeHtml(t("bestiary_total", { count: state.items.length }))}</span>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="${escapeHtml(t("items_filters_label"))}">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderItemQueryField()}
          <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-item-filters">${escapeHtml(t("bestiary_clear_filters"))}</button>
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--item-filters">
          ${renderItemFilterDropdown("type", t("filter_type"))}
          ${renderItemFilterDropdown("rarity", "Rareza")}
          ${renderItemFilterDropdown("source", t("filter_source"))}
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
    <section class="panel panel--table compendium-panel">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("arcanum", t("arcanum_eyebrow"), t("arcanum_title"))}
        <div class="section-meta">
          ${renderRepositoryCsvPicker("arcanum")}
          <span>${escapeHtml(t("bestiary_visible", { count: filteredEntries.length }))}</span>
          <span>${escapeHtml(t("bestiary_total", { count: state.arcanum.length }))}</span>
        </div>
      </div>

      <div class="bestiary-toolbar" aria-label="${escapeHtml(t("arcanum_filters_label"))}">
        <div class="bestiary-toolbar__row bestiary-toolbar__row--primary">
          ${renderArcanumQueryField()}
          ${renderArcanumConcentrationFilterButton()}
        </div>
        <div class="bestiary-toolbar__row bestiary-toolbar__row--filters">
          ${renderArcanumFilterDropdown("level", t("arcanum_filter_level"))}
          ${renderArcanumFilterDropdown("castingTime", t("arcanum_filter_casting"))}
          ${renderArcanumFilterDropdown("school", t("arcanum_filter_school"))}
          ${renderArcanumFilterDropdown("class", t("arcanum_filter_class"))}
          ${renderArcanumFilterDropdown("source", t("filter_source"))}
        </div>
      </div>

      ${renderArcanumContent(filteredEntries, selectedEntry)}
    </section>
  `;
}

function renderRepositoryCsvPicker(repositoryKey) {
  const selectedPath = state.repositoryCsvPaths[repositoryKey] ?? defaultRepositoryCsvPaths[repositoryKey] ?? "";
  const displayName = getActiveRepositoryCsvDisplayName(repositoryKey);
  const displayPath = getActiveRepositoryCsvDisplayPath(repositoryKey) || getRepositoryCsvDisplayPath(selectedPath);
  const createLabel = {
    bestiary: t("create_creature"),
    items: t("create_item"),
    arcanum: t("create_spell")
  }[repositoryKey] || "Crear entidad";

  return `
    <div class="repository-csv-picker repository-csv-picker--dialog">
      <button class="toolbar-button repository-csv-picker__create" type="button" data-action="open-create-compendium-entity" data-repository-key="${escapeHtml(repositoryKey)}">
        ${escapeHtml(createLabel)}
      </button>
      <label class="repository-csv-picker__button repository-csv-picker__button--file">
        <input
          class="repository-csv-picker__input"
          type="file"
          accept=".csv,text/csv"
          data-repository-csv-input="${escapeHtml(repositoryKey)}"
          aria-label="${escapeHtml(t("csv_loader_label"))}"
        />
        ${escapeHtml(t("csv_loader_label"))}
      </label>
      <div class="repository-csv-picker__file" title="${escapeHtml(displayPath)}">
        ${escapeHtml(displayName)}
      </div>
    </div>
  `;
}

function renderItemsContent(filteredEntries, selectedEntry) {
  if (state.itemStatus === "error") {
    return renderAssetLoadErrorState(state.itemMessage || "No se pudo leer el CSV de objetos.", state.itemDebugInfo);
  }

  if (state.itemStatus !== "ready") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("loading_items"))}
      </div>
    `;
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Objetos del catalogo" data-item-list-root>
        ${renderItemList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-item-detail-root>
        ${selectedEntry ? renderSelectedCompendiumDetail("items", selectedEntry) : renderItemDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderArcanumContent(filteredEntries, selectedEntry) {
  if (state.arcanumStatus === "error") {
    return renderAssetLoadErrorState(state.arcanumMessage || "No se pudo leer Spells.csv.", state.arcanumDebugInfo);
  }

  if (state.arcanumStatus !== "ready") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("loading_arcanum"))}
      </div>
    `;
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Hechizos del arcanum" data-arcanum-list-root>
        ${renderArcanumList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-arcanum-detail-root>
        ${selectedEntry ? renderSelectedCompendiumDetail("arcanum", selectedEntry) : renderArcanumDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderBestiaryContent(filteredEntries, selectedEntry) {
  if (state.bestiaryStatus === "error") {
    return renderAssetLoadErrorState(state.bestiaryMessage || "No se pudo leer Bestiary.csv.", state.bestiaryDebugInfo);
  }

  if (state.bestiaryStatus !== "ready") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("loading_bestiary"))}
      </div>
    `;
  }

  return `
    <div class="bestiary-layout">
      <div class="bestiary-list" role="list" aria-label="Criaturas del bestiario" data-bestiary-list-root>
        ${renderBestiaryList(filteredEntries, selectedEntry?.id ?? "")}
      </div>
      <aside class="bestiary-detail panel panel--inner" data-bestiary-detail-root>
        ${selectedEntry ? renderSelectedCompendiumDetail("bestiary", selectedEntry) : renderBestiaryDetailEmpty()}
      </aside>
    </div>
  `;
}

function renderCompendiumDetailActions(repositoryKey, entry) {
  if (!entry?.isCustom) {
    return "";
  }

  const nounLabel = COMPENDIUM_KIND_LABELS[repositoryKey] || "entidad";
  return `
    <div class="compendium-detail-actions" aria-label="Acciones de ${escapeHtml(nounLabel)} personalizada">
      <span class="compendium-detail-actions__badge">Contenido personalizado</span>
      <div>
        <button class="toolbar-button toolbar-button--subtle" type="button" data-action="open-edit-compendium-entity" data-repository-key="${escapeHtml(repositoryKey)}" data-compendium-entry-id="${escapeHtml(entry.id)}">Editar</button>
        <button class="toolbar-button toolbar-button--subtle-danger" type="button" data-action="delete-compendium-entity" data-repository-key="${escapeHtml(repositoryKey)}" data-compendium-entry-id="${escapeHtml(entry.id)}">Eliminar</button>
      </div>
    </div>
  `;
}

function renderSelectedCompendiumDetail(repositoryKey, entry) {
  const detail = repositoryKey === "bestiary"
    ? getCachedBestiaryDetailHtml(entry)
    : repositoryKey === "items"
      ? renderItemDetail(entry)
      : renderArcanumDetail(entry);
  return `${renderCompendiumDetailActions(repositoryKey, entry)}${detail}`;
}

function getBestiaryVirtualWindow(totalEntries) {
  return getVirtualWindow({
    totalEntries,
    viewportHeight: state.bestiaryListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT,
    scrollTop: state.bestiaryListScrollTop,
    rowHeight: BESTIARY_VIRTUAL_ROW_HEIGHT,
    overscan: BESTIARY_VIRTUAL_OVERSCAN
  });
}

function getBestiaryVirtualStartIndex(scrollTop) {
  return getVirtualStartIndex(scrollTop, BESTIARY_VIRTUAL_ROW_HEIGHT, BESTIARY_VIRTUAL_OVERSCAN);
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
  updateBestiaryListViewport(true);
}

function updateBestiaryListViewport(force = false) {
  const listRoot = app.querySelector("[data-bestiary-list-root]");

  if (!listRoot) {
    return;
  }

  const filteredEntries = getFilteredBestiary();
  const selectedId = getSelectedBestiaryEntry(filteredEntries)?.id ?? "";
  const nextWindow = filteredEntries.length > 0 ? getBestiaryVirtualWindow(filteredEntries.length) : null;
  const currentVirtual = listRoot.querySelector(".bestiary-list__virtual");
  const currentStart = currentVirtual?.dataset.bestiaryVirtualStart ?? "";
  const currentEnd = currentVirtual?.dataset.bestiaryVirtualEnd ?? "";
  const currentTotal = currentVirtual?.dataset.bestiaryVirtualTotal ?? "";
  const nextStart = nextWindow ? String(nextWindow.startIndex) : "";
  const nextEnd = nextWindow ? String(nextWindow.endIndex) : "";
  const nextTotal = String(filteredEntries.length);

  if (!force && currentStart === nextStart && currentEnd === nextEnd && currentTotal === nextTotal) {
    return;
  }

  listRoot.innerHTML = renderBestiaryList(filteredEntries, selectedId);
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
  detailRoot.innerHTML = selectedEntry ? renderSelectedCompendiumDetail("bestiary", selectedEntry) : renderBestiaryDetailEmpty();
}

function getItemVirtualWindow(totalEntries) {
  return getVirtualWindow({
    totalEntries,
    viewportHeight: state.itemListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT,
    scrollTop: state.itemListScrollTop,
    rowHeight: ITEM_VIRTUAL_ROW_HEIGHT,
    overscan: ITEM_VIRTUAL_OVERSCAN
  });
}

function getItemVirtualStartIndex(scrollTop) {
  return getVirtualStartIndex(scrollTop, ITEM_VIRTUAL_ROW_HEIGHT, ITEM_VIRTUAL_OVERSCAN);
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
  updateItemListViewport(true);
}

function updateItemListViewport(force = false) {
  const listRoot = app.querySelector("[data-item-list-root]");

  if (!listRoot) {
    return;
  }

  const filteredEntries = getFilteredItems();
  const selectedId = getSelectedItemEntry(filteredEntries)?.id ?? "";
  const nextWindow = filteredEntries.length > 0 ? getItemVirtualWindow(filteredEntries.length) : null;
  const currentVirtual = listRoot.querySelector(".bestiary-list__virtual");
  const currentStart = currentVirtual?.dataset.itemVirtualStart ?? "";
  const currentEnd = currentVirtual?.dataset.itemVirtualEnd ?? "";
  const currentTotal = currentVirtual?.dataset.itemVirtualTotal ?? "";
  const nextStart = nextWindow ? String(nextWindow.startIndex) : "";
  const nextEnd = nextWindow ? String(nextWindow.endIndex) : "";
  const nextTotal = String(filteredEntries.length);

  if (!force && currentStart === nextStart && currentEnd === nextEnd && currentTotal === nextTotal) {
    return;
  }

  listRoot.innerHTML = renderItemList(filteredEntries, selectedId);
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
  detailRoot.innerHTML = selectedEntry ? renderSelectedCompendiumDetail("items", selectedEntry) : renderItemDetailEmpty();
}

function getArcanumVirtualWindow(totalEntries) {
  return getVirtualWindow({
    totalEntries,
    viewportHeight: state.arcanumListViewportHeight || BESTIARY_VIRTUAL_DEFAULT_VIEWPORT,
    scrollTop: state.arcanumListScrollTop,
    rowHeight: BESTIARY_VIRTUAL_ROW_HEIGHT,
    overscan: BESTIARY_VIRTUAL_OVERSCAN
  });
}

function getArcanumVirtualStartIndex(scrollTop) {
  return getVirtualStartIndex(scrollTop, BESTIARY_VIRTUAL_ROW_HEIGHT, BESTIARY_VIRTUAL_OVERSCAN);
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
  updateArcanumListViewport(true);
}

function updateArcanumListViewport(force = false) {
  const listRoot = app.querySelector("[data-arcanum-list-root]");

  if (!listRoot) {
    return;
  }

  const filteredEntries = getFilteredArcanum();
  const selectedId = getSelectedArcanumEntry(filteredEntries)?.id ?? "";
  const nextWindow = filteredEntries.length > 0 ? getArcanumVirtualWindow(filteredEntries.length) : null;
  const currentVirtual = listRoot.querySelector(".bestiary-list__virtual");
  const currentStart = currentVirtual?.dataset.arcanumVirtualStart ?? "";
  const currentEnd = currentVirtual?.dataset.arcanumVirtualEnd ?? "";
  const currentTotal = currentVirtual?.dataset.arcanumVirtualTotal ?? "";
  const nextStart = nextWindow ? String(nextWindow.startIndex) : "";
  const nextEnd = nextWindow ? String(nextWindow.endIndex) : "";
  const nextTotal = String(filteredEntries.length);

  if (!force && currentStart === nextStart && currentEnd === nextEnd && currentTotal === nextTotal) {
    return;
  }

  listRoot.innerHTML = renderArcanumList(filteredEntries, selectedId);
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
  detailRoot.innerHTML = selectedEntry ? renderSelectedCompendiumDetail("arcanum", selectedEntry) : renderArcanumDetailEmpty();
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

function renderScreenHeadingIdentity(screenId, eyebrow, title) {
  const screenIconUrl = getScreenIconUrl(screenId);

  return `
    <div class="section-heading__identity">
      ${
        screenIconUrl
          ? `
            <img class="section-heading__icon" src="${escapeHtml(screenIconUrl)}" alt="" decoding="async" aria-hidden="true" />
          `
          : ""
      }
      <div class="section-heading__text">
        ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        <h3>${escapeHtml(title)}</h3>
      </div>
    </div>
  `;
}

function renderCombatMiniActionIcon(kind) {
  const iconUrl = getCombatMiniActionIconUrl(kind);

  if (iconUrl) {
    return `<img class="mini-action__icon-image" src="${escapeHtml(iconUrl)}" alt="" decoding="async" />`;
  }

  if (kind === "damage") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 2c2.4 3.1 5.5 6.2 5.5 10.1A5.5 5.5 0 1 1 6.5 12C6.5 8.2 9.6 5.1 12 2Z" />
      </svg>
    `;
  }

  if (kind === "heal") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />
      </svg>
    `;
  }

  if (kind === "necrotic") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M9 3c1.6 2 3.1 4.1 3.1 6.6A3.1 3.1 0 1 1 5.9 9.6C5.9 7.1 7.4 5 9 3Zm6 2.3c1.4 1.7 2.8 3.6 2.8 5.7a2.8 2.8 0 1 1-5.6 0c0-2.1 1.4-4 2.8-5.7ZM7 14c2 0 3.8 1.1 4.8 2.9 1-1.8 2.8-2.9 4.8-2.9 2.1 0 4 1.2 5 3.1-.9 2-2.6 3.9-5 4.9-2-.8-3.7-2.3-4.8-4.1-1.1 1.8-2.8 3.3-4.8 4.1-2.4-1-4.1-2.9-5-4.9 1-1.9 2.9-3.1 5-3.1Z" />
      </svg>
    `;
  }

  if (kind === "temp") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 2 20 5v6.5c0 5.1-3 9.5-8 11.7-5-2.2-8-6.6-8-11.7V5l8-3Zm0 4.1L7 7.9v3.5c0 3.6 1.9 6.6 5 8.3 3.1-1.7 5-4.7 5-8.3V7.9l-5-1.8Z" />
      </svg>
    `;
  }

  return "";
}

function getCombatHealthToneColor(healthPercent) {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(toNumber(healthPercent))));

  if (clampedPercent === 0) {
    return "rgba(16, 14, 14, 0.96)";
  }

  if (clampedPercent <= 25) {
    return "rgba(184, 60, 74, 0.92)";
  }

  if (clampedPercent <= 50) {
    return "rgba(201, 124, 44, 0.94)";
  }

  return "rgba(84, 160, 101, 0.9)";
}

function getCombatHealthVisualFill(healthPercent) {
  const clampedPercent = Math.max(0, Math.min(100, toNumber(healthPercent)));

  if (clampedPercent <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(100 * Math.pow(clampedPercent / 100, 0.45))));
}

function renderHeaderCell(column) {
  const selectedFilterValues = Array.isArray(state.filters?.[column.key]) ? state.filters[column.key] : [];
  const filterValue = cleanText(state.combatFilterDrafts?.[column.key]);
  const filterOptions = getCombatFilterOptions(column.key, filterValue);
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
        <div class="th-actions" data-combat-filter-menu>
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
            class="filter-button ${selectedFilterValues.length > 0 ? "is-active" : ""}"
            type="button"
            data-action="toggle-filter"
            data-filter-key="${column.key}"
            aria-label="Abrir filtro de ${column.label}"
          >
            <span>${escapeHtml(t("filter_button"))}</span>
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
                      value="${escapeHtml(filterValue)}"
                      data-filter-search-key="${column.key}"
                      placeholder="${escapeHtml(t("search_values_placeholder"))}"
                      aria-label="Filtrar ${column.label}"
                    />
                  </label>
                  <div class="combat-filter-options" role="group" aria-label="Valores de ${escapeHtml(column.label)}">
                    ${
                      filterOptions.length > 0
                        ? filterOptions.map((optionValue) => `
                          <label class="combat-filter-option">
                            <input
                              type="checkbox"
                              data-combat-filter-option="${column.key}"
                              value="${escapeHtml(optionValue)}"
                              ${selectedFilterValues.includes(optionValue) ? "checked" : ""}
                            />
                            <span>${escapeHtml(optionValue)}</span>
                          </label>
                        `).join("")
                        : `<div class="combat-filter-options__empty">No hay valores coincidentes.</div>`
                    }
                  </div>
                  <button
                    class="filter-clear"
                    type="button"
                    data-action="clear-filter"
                    data-filter-key="${column.key}"
                  >
                    ${escapeHtml(t("filter_clear_short"))}
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
  const rowContext = getCombatRowContext(combatant);

  return `
    <tr
      class="row--${combatant.side} ${state.selectedIds.has(combatant.id) ? "row--selected" : ""} ${isDead ? "row--dead" : ""} ${isActiveTurn ? "row--active-turn" : ""}"
      data-combat-row-id="${escapeHtml(combatant.id)}"
      tabindex="-1"
    >
      <td class="cell-select">
        <div class="cell-select__stack">
          <span class="combat-inline-tooltip-anchor combat-inline-tooltip-anchor--corner" data-tooltip="Seleccionar fila">
            <input
              type="checkbox"
              data-select-row="${combatant.id}"
              aria-label="Seleccionar ${escapeHtml(combatant.nombre || combatant.id)}"
              ${state.selectedIds.has(combatant.id) ? "checked" : ""}
            />
          </span>
          <span class="combat-inline-tooltip-anchor combat-inline-tooltip-anchor--corner" data-tooltip="Eliminar fila">
            <button
              class="cell-row-delete"
              type="button"
              data-action="delete-combatant-row"
              data-combatant-id="${escapeHtml(combatant.id)}"
              aria-label="Eliminar ${escapeHtml(combatant.nombre || combatant.id)}"
            >
              <span aria-hidden="true">x</span>
            </button>
          </span>
        </div>
      </td>
      ${columns.map((column) => renderDataCell(combatant, column, isDead, rowContext)).join("")}
    </tr>
  `;
}

function createTranslatedMarkupElement(markup) {
  const template = document.createElement("template");
  template.innerHTML = cleanText(markup);
  applyInterfaceTranslations(template.content);
  return template.content.firstElementChild;
}

function syncCombatTrackerMutation(combatantIds, options = {}) {
  saveCombatTrackerState();

  if (
    options.forceFullRender
    || state.activeScreen !== "combat-tracker"
    || lastRenderedScreen !== "combat-tracker"
  ) {
    render();
    return false;
  }

  const visibleCombatants = getVisibleCombatants();
  const renderedRows = [...app.querySelectorAll("[data-combat-row-id]")];
  const renderedIds = renderedRows.map((row) => cleanText(row.dataset.combatRowId));
  const visibleIds = visibleCombatants.map((combatant) => combatant.id);

  if (
    renderedIds.length !== visibleIds.length
    || renderedIds.some((id, index) => id !== visibleIds[index])
  ) {
    render();
    return false;
  }

  const targetIds = new Set(
    (Array.isArray(combatantIds) ? combatantIds : [combatantIds])
      .map((id) => cleanText(id))
      .filter(Boolean)
  );
  const combatantById = new Map(visibleCombatants.map((combatant) => [combatant.id, combatant]));
  const rowById = new Map(renderedRows.map((row) => [cleanText(row.dataset.combatRowId), row]));
  const turnParticipants = state.isCombatActive
    ? getCombatTurnParticipants(getCombatTurnOrder(visibleCombatants))
    : [];
  const activeTurnCombatantId = state.isCombatActive
    ? getActiveTurnCombatantId(turnParticipants)
    : "";

  for (const combatantId of targetIds) {
    const currentRow = rowById.get(combatantId);
    const combatant = combatantById.get(combatantId);

    if (!currentRow || !combatant) {
      continue;
    }

    const nextRow = createTranslatedMarkupElement(renderCombatRow(combatant, activeTurnCombatantId));

    if (nextRow) {
      currentRow.replaceWith(nextRow);
    }
  }

  if (!syncCombatTurnTokens(targetIds, turnParticipants, activeTurnCombatantId)) {
    render();
    return false;
  }

  if (!cleanText(state.combatTurnQuickMenu?.combatantId)) {
    app.querySelector("[data-combat-turn-quick-menu]")?.remove();
  }

  if (!cleanText(state.combatMaxHpRestoreMenu?.combatantId)) {
    app.querySelector("[data-combat-maxhp-restore-menu]")?.remove();
  }

  syncNotificationUi();
  scheduleActiveCombatSpellbookPopoverSync();
  scheduleActiveCombatSpellPreviewSync();
  return true;
}

function syncCombatTurnTokens(targetIds, turnParticipants, activeTurnCombatantId) {
  if (!state.isCombatActive) {
    return true;
  }

  const turnStrip = app.querySelector(".combat-turn-strip");
  const renderedTokens = turnStrip
    ? [...turnStrip.querySelectorAll(':scope > [data-action="focus-combatant-row"]')]
    : [];
  const renderedIds = renderedTokens.map((token) => cleanText(token.dataset.combatantId));
  const participantIds = turnParticipants.map((combatant) => combatant.id);

  if (
    !turnStrip
    || renderedIds.length !== participantIds.length
    || renderedIds.some((id, index) => id !== participantIds[index])
  ) {
    return false;
  }

  const participantById = new Map(turnParticipants.map((combatant) => [combatant.id, combatant]));

  renderedTokens.forEach((token) => {
    const combatantId = cleanText(token.dataset.combatantId);

    if (!targetIds.has(combatantId)) {
      return;
    }

    const combatant = participantById.get(combatantId);
    const nextToken = combatant
      ? createTranslatedMarkupElement(renderCombatTurnToken(combatant, combatantId === activeTurnCombatantId))
      : null;

    if (nextToken) {
      token.replaceWith(nextToken);
    }
  });

  return true;
}

function syncCombatSelectionUi() {
  if (state.activeScreen !== "combat-tracker" || lastRenderedScreen !== "combat-tracker") {
    render();
    return;
  }

  const visibleCombatants = getVisibleCombatants();
  const visibleIds = new Set(visibleCombatants.map((combatant) => combatant.id));

  app.querySelectorAll("[data-combat-row-id]").forEach((row) => {
    const combatantId = cleanText(row.dataset.combatRowId);
    const isSelected = state.selectedIds.has(combatantId);
    row.classList.toggle("row--selected", isSelected);

    const checkbox = row.querySelector("[data-select-row]");

    if (checkbox) {
      checkbox.checked = isSelected;
    }
  });

  const selectAll = app.querySelector("[data-select-all]");

  if (selectAll) {
    selectAll.checked = visibleIds.size > 0 && [...visibleIds].every((id) => state.selectedIds.has(id));
  }

  const hasSelection = state.selectedIds.size > 0;
  const deleteButton = app.querySelector('[data-action="delete-selected"]');
  const initiativeButton = app.querySelector('[data-action="generate-iniactiva"]');

  if (deleteButton) {
    deleteButton.disabled = !hasSelection;
  }

  if (initiativeButton) {
    initiativeButton.disabled = !hasSelection;
  }
}

function syncNotificationUi() {
  const notificationRoot = app.querySelector("[data-notification-root]");

  if (!notificationRoot) {
    return;
  }

  notificationRoot.innerHTML = renderNotifications();
  applyInterfaceTranslations(notificationRoot);
}

function renderDataCell(combatant, column, isDead, rowContext = getCombatRowContext(combatant)) {
  const value = getCombatantColumnValue(combatant, column.key);
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
    const { linkedCharacter, bestiaryEntry, tokenUrl } = rowContext;
    const isNameSearchActive = state.activeCombatNameSearchId === combatant.id;
    const suggestions = isNameSearchActive ? getCombatNameSuggestions(combatant) : [];
    const sourceChip = renderCombatantSourceChip(combatant, bestiaryEntry);
    const token = renderCombatantNameToken(combatant, { linkedCharacter, bestiaryEntry, tokenUrl });
    const tagChip = renderCombatantTagChip(combatant);
    const npcChip = renderCombatantNpcChip(combatant, linkedCharacter);
    const nameInputStyle = getCombatNameInputStyle(value);

    return `
      <td>
        <div class="name-cell combat-name-cell" data-combat-name-search-menu>
          <div class="combat-name-cell__main">
            <input
              class="cell-input cell-input--strong"
              type="text"
              inputmode="text"
              value="${escapeHtml(String(value))}"
              style="${escapeHtml(nameInputStyle)}"
              data-edit-id="${combatant.id}"
              data-edit-key="${column.key}"
              autocomplete="off"
            />
            ${token}
          </div>
          ${isDead || sourceChip || tagChip || npcChip || linkedCharacter ? `
            <div class="name-cell__chips">
              ${isDead ? `<span class="death-badge">Muerto</span>` : ""}
              ${tagChip}
              ${npcChip}
              ${sourceChip}
              ${linkedCharacter ? renderCombatSpellbookControl(combatant, linkedCharacter) : ""}
            </div>
          ` : ""}
          ${
            isNameSearchActive && suggestions.length > 0
              ? `
                <div class="combat-name-suggestions" role="listbox" aria-label="Sugerencias de combate">
                  ${suggestions.map((entry) => renderCombatNameSuggestion(combatant.id, entry)).join("")}
                </div>
              `
              : ""
          }
        </div>
      </td>
    `;
  }

  if (column.key === "estados") {
    return `
      <td>
        ${renderCombatStatusCell(combatant)}
      </td>
    `;
  }

  if (column.key === "pgMax") {
    const effectiveMax = getEffectivePgMax(combatant);
    const showEffectiveMax = toNumber(combatant.necrotic) !== 0;
    const armorClass = getCombatantArmorClassValue(combatant);
    const maxHpFill = Math.max(0, Math.min(100, Math.round((effectiveMax / Math.max(1, toNumber(combatant.pgMax))) * 100)));
    const maxHpInput = `
      <input
        class="cell-input cell-input--center${showEffectiveMax ? " cell-input--hp" : ""}"
        type="number"
        inputmode="${inputMode}"
        value="${escapeHtml(String(showEffectiveMax ? effectiveMax : value))}"
        data-edit-id="${combatant.id}"
        data-edit-key="${column.key}"
      />
    `;
    const maxHpField = showEffectiveMax
      ? `<label class="hp-bar hp-bar--compact hp-bar--necrotic" data-combat-pgmax-restore-context="${escapeHtml(combatant.id)}" style="--hp-fill:${maxHpFill}%;--hp-tone-color:rgba(143, 98, 214, 0.92)">${maxHpInput}</label>`
      : maxHpInput;

    return `
      <td>
        <div class="resource-cell resource-cell--pgmax">
          <div class="resource-cell__top">
            ${maxHpField}
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
          <div class="resource-cell__bottom">
            ${showEffectiveMax ? `<span class="resource-note">Original ${value}</span>` : ""}
            <button
              class="toolbar-button toolbar-button--subtle combat-shield-toggle ${isCombatantShieldEquipped(combatant) ? "is-active" : ""}"
              type="button"
              data-action="toggle-combatant-shield"
              data-combatant-id="${escapeHtml(combatant.id)}"
              data-tooltip="EQUIPAR/DESEQUIPAR UN ESCUDO"
              aria-pressed="${isCombatantShieldEquipped(combatant) ? "true" : "false"}"
              aria-label="Equipar o desequipar un escudo"
            >
              <img class="combat-shield-toggle__icon combat-shield-toggle__icon--image" src="${escapeHtml(combatShieldIconUrl)}" alt="" decoding="async" aria-hidden="true" />
            </button>
          </div>
        </div>
      </td>
    `;
  }

  if (column.key === "pgAct") {
    const { linkedCharacter } = rowContext;
    const maxForBar = Math.max(1, getEffectivePgMax(combatant));
    const healthPercent = Math.max(0, Math.min(100, Math.round((toNumber(combatant.pgAct) / maxForBar) * 100)));
    const hpVisualFill = getCombatHealthVisualFill(healthPercent);
    const hpToneColor = getCombatHealthToneColor(healthPercent);
    const showHitDice = shouldShowCombatHitDiceField(combatant, linkedCharacter);
    const hitDiceValue = showHitDice ? getCombatantHitDiceValue(combatant, linkedCharacter) : "";

    return `
      <td>
        <div class="resource-cell">
          <div class="resource-cell__pair">
            <div class="resource-cell__act-wrap">
              <label class="hp-bar hp-bar--compact" style="--hp-fill:${hpVisualFill}%;--hp-tone-color:${hpToneColor}">
                <input
                  class="cell-input cell-input--hp cell-input--center"
                  type="number"
                  inputmode="${inputMode}"
                  value="${escapeHtml(String(value))}"
                  data-edit-id="${combatant.id}"
                  data-edit-key="${column.key}"
                />
              </label>
              <span class="resource-cell__act-label"><span>${escapeHtml(getCurrentHitPointLabelShort())}</span></span>
            </div>
            <div class="resource-cell__temp-wrap">
              <input
                class="cell-input resource-cell__temp-input cell-input--center"
                type="number"
                inputmode="${inputMode}"
                value="${escapeHtml(String(combatant.pgTemp ?? ""))}"
                data-edit-id="${combatant.id}"
                data-edit-key="pgTemp"
                aria-label="PG TEMP de ${escapeHtml(combatant.nombre || combatant.id)}"
              />
              ${renderCombatResourceIcon(getCombatMiniActionIconUrl("temp"), "Vida temporal", "combat-resource-icon--temp")}
            </div>
          </div>
          <div class="resource-cell__actions-row">
            <div class="inline-adjust inline-adjust--group">
            <input
              class="mini-input"
              type="number"
              inputmode="numeric"
              placeholder="0"
              value="${escapeHtml(inlineValues.pgAct)}"
              data-adjust-id="${combatant.id}"
              data-adjust-field="pgAct"
              aria-label="Cantidad para ajustar recursos de ${escapeHtml(combatant.nombre)}"
            />
            <div class="mini-actions">
              <button
                class="mini-action mini-action--damage"
                type="button"
                data-action="adjust-pg-act"
                data-id="${combatant.id}"
                data-mode="damage"
                data-tooltip="Daño"
                aria-label="Restar puntos de golpe a ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("damage")}</span>
              </button>
              <button
                class="mini-action mini-action--heal"
                type="button"
                data-action="adjust-pg-act"
                data-id="${combatant.id}"
                data-mode="heal"
                data-tooltip="Curacion"
                aria-label="Sumar puntos de golpe a ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("heal")}</span>
              </button>
              <button
                class="mini-action mini-action--necrotic"
                type="button"
                data-action="adjust-necrotic"
                data-id="${combatant.id}"
                data-tooltip="Necrotico"
                aria-label="Ajustar danio necrotico de ${escapeHtml(combatant.nombre)}"
              >
                <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("necrotic")}</span>
              </button>
            </div>
            </div>
            ${
              showHitDice
                ? `
                  <div class="resource-cell__temp-wrap resource-cell__hit-dice-wrap">
                    <input
                      class="cell-input resource-cell__temp-input cell-input--center"
                      type="number"
                      inputmode="${inputMode}"
                      value="${escapeHtml(String(hitDiceValue))}"
                      data-edit-id="${combatant.id}"
                      data-edit-key="hitDice"
                      aria-label="Dados de golpe de ${escapeHtml(combatant.nombre || combatant.id)}"
                    />
                    ${renderCombatResourceIcon(combatHitDiceIconUrl, isEnglishInterface() ? "HIT DICE" : "Dados de golpe", "combat-resource-icon--hit-dice")}
                  </div>
                `
                : ""
            }
          </div>
        </div>
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

  if (column.key === "crExp") {
    const { linkedCharacter } = rowContext;

    if (linkedCharacter && cleanText(combatant.tag).toUpperCase() === "ALIADO") {
      if (isNpcCharacter(linkedCharacter)) {
        return `
          <td>
            <div class="combat-character-xp-cell combat-character-xp-cell--npc">
              ${renderCharacterExperienceControls(linkedCharacter, { compact: true, npcOnly: true, combatInline: true })}
            </div>
          </td>
        `;
      }

      return `
        <td>
          <div class="combat-character-xp-cell">
            ${renderCharacterExperienceBar(linkedCharacter, { compact: true, combatCompact: true })}
            ${renderCharacterExperienceControls(linkedCharacter, { compact: true, combatInline: true })}
          </div>
        </td>
      `;
    }

    return `
      <td>
        <input
          class="cell-input cell-input--center"
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
        class="cell-input ${["numPeana"].includes(column.key) ? "cell-input--center" : ""}"
        type="${column.type === "number" ? "number" : "text"}"
        inputmode="${inputMode}"
        value="${escapeHtml(String(value))}"
        data-edit-id="${combatant.id}"
        data-edit-key="${column.key}"
      />
    </td>
  `;
}

function addCombatLookupEntry(index, key, entry) {
  if (!key) {
    return;
  }

  const matches = index.get(key);

  if (matches) {
    matches.push(entry);
  } else {
    index.set(key, [entry]);
  }
}

function ensureCombatLookupIndexes() {
  if (combatLookupCache.bestiaryEntries !== state.bestiary) {
    combatLookupCache.bestiaryEntries = state.bestiary;
    combatLookupCache.bestiaryByIdentity = new Map();
    combatLookupCache.bestiaryByAlias = new Map();

    (Array.isArray(state.bestiary) ? state.bestiary : []).forEach((entry) => {
      uniqueSortedStrings([
        getCompendiumEntryIdentityKey(entry),
        cleanText(entry.id),
        cleanText(entry.compositeKey),
        cleanText(entry.identityKey)
      ].filter(Boolean)).forEach((identityKey) => {
        addCombatLookupEntry(combatLookupCache.bestiaryByIdentity, identityKey, entry);
      });
      getBestiaryEntryNameAliases(entry).forEach((alias) => {
        addCombatLookupEntry(combatLookupCache.bestiaryByAlias, alias, entry);
      });
    });
  }

  if (combatLookupCache.characters !== state.characters) {
    combatLookupCache.characters = state.characters;
    combatLookupCache.charactersById = new Map();
    combatLookupCache.charactersByName = new Map();

    (Array.isArray(state.characters) ? state.characters : []).forEach((character) => {
      const characterId = cleanText(character.id);
      const characterName = normalizeSearchText(character.name);

      if (characterId) {
        combatLookupCache.charactersById.set(characterId, character);
      }

      if (characterName && !combatLookupCache.charactersByName.has(characterName)) {
        combatLookupCache.charactersByName.set(characterName, character);
      }
    });
  }

  return combatLookupCache;
}

function getCombatRowContext(combatant) {
  const linkedCharacter = getLinkedCharacterForCombatant(combatant);
  const bestiaryEntry = getCombatantBestiaryEntry(combatant);

  return {
    linkedCharacter,
    bestiaryEntry,
    tokenUrl: getCombatantTokenUrl(combatant, linkedCharacter, bestiaryEntry)
  };
}

function getLinkedCharacterForCombatant(combatant) {
  const lookups = ensureCombatLookupIndexes();
  const characterId = cleanText(combatant.characterId);

  if (characterId) {
    const linkedById = lookups.charactersById.get(characterId) ?? null;

    if (linkedById) {
      return linkedById;
    }
  }

  const normalizedName = normalizeSearchText(combatant.nombre);

  if (!normalizedName) {
    return null;
  }

  return lookups.charactersByName.get(normalizedName) ?? null;
}

function renderCombatResourceIcon(iconUrl, tooltip, extraClassName = "") {
  const classes = ["combat-resource-icon"];

  if (extraClassName) {
    classes.push(extraClassName);
  }

  return `
    <span class="combat-inline-tooltip-anchor combat-inline-tooltip-anchor--side-right ${classes.join(" ")}" data-tooltip="${escapeHtml(tooltip)}" tabindex="0">
      <img src="${escapeHtml(iconUrl)}" alt="" decoding="async" aria-hidden="true" />
    </span>
  `;
}

function renderCombatSpellbookControl(combatant, linkedCharacter) {
  if (!linkedCharacter || !hasCombatSpellbookData(linkedCharacter)) {
    return "";
  }

  const isOpen = state.activeCombatSpellbookCombatantId === combatant.id;
  const spellbookIconUrl = getCombatSpellbookIconUrl();

  return `
    <div class="combat-spellbook-anchor" data-combat-spellbook-menu>
      <button
        class="toolbar-button toolbar-button--subtle combat-spellbook-button${isOpen ? " is-active" : ""}"
        type="button"
        data-action="toggle-combat-spellbook-popup"
        data-combatant-id="${escapeHtml(combatant.id)}"
        aria-expanded="${isOpen}"
        aria-label="Abrir hechizos y habilidades de ${escapeHtml(linkedCharacter.name || combatant.nombre || "personaje")}"
        data-tooltip="Hechizos y Habilidades"
      >
        <span class="button-icon" aria-hidden="true">
          <img src="${escapeHtml(spellbookIconUrl)}" alt="" decoding="async" />
        </span>
      </button>
      ${isOpen ? renderCombatSpellbookPopover(combatant, linkedCharacter) : ""}
    </div>
  `;
}

function renderNotifications() {
  if (!Array.isArray(state.notifications) || state.notifications.length === 0) {
    return "";
  }

  return `
    <aside class="notification-stack" aria-live="polite" aria-atomic="false">
      ${state.notifications.map((notification) => {
        const effectIconUrl = notification.effectKind ? getCombatMiniActionIconUrl(notification.effectKind) : "";

        return `
        <article class="notification-card notification-card--${escapeHtml(notification.tone || "info")}${notification.imageUrl ? " notification-card--with-media" : ""}${effectIconUrl ? " notification-card--with-effect" : ""}" role="status">
          ${
            notification.imageUrl
              ? `
                <div class="notification-card__media" aria-hidden="true">
                  <img src="${escapeHtml(notification.imageUrl)}" alt="" loading="lazy" decoding="async" />
                </div>
              `
              : ""
          }
          <div class="notification-card__copy">
            <strong>${escapeHtml(notification.title || "Notificación")}</strong>
            <p>${escapeHtml(notification.message || "")}</p>
          </div>
          ${
            effectIconUrl
              ? `
                <div class="notification-card__effect notification-card__effect--${escapeHtml(effectIconUrl ? notification.effectKind || "" : "")}" aria-hidden="true">
                  <img src="${escapeHtml(effectIconUrl)}" alt="" loading="lazy" decoding="async" />
                </div>
              `
              : ""
          }
          <button
            class="notification-card__close"
            type="button"
            data-action="dismiss-notification"
            data-notification-id="${escapeHtml(notification.id)}"
            aria-label="Cerrar notificación"
          >
            x
          </button>
        </article>
      `;
      }).join("")}
    </aside>
  `;
}

function renderCombatSpellPreviewOverlay() {
  const previewKind = cleanText(state.activeCombatPreviewKind);
  const previewKey = cleanText(state.activeCombatPreviewKey);

  if (!previewKind || !previewKey) {
    return "";
  }

  if (previewKind === "bestiary") {
    const previewEntry = ensureCombatLookupIndexes().bestiaryByIdentity.get(previewKey)?.[0]
      ?? state.bestiary.find((entry) => cleanText(entry.id) === previewKey)
      ?? null;

    if (!previewEntry) {
      return "";
    }

    return `
      <aside class="combat-spell-preview-overlay combat-spell-preview-overlay--entity" data-combat-spell-preview-overlay role="tooltip" aria-hidden="true">
        ${renderCombatTokenPreview(previewEntry)}
      </aside>
    `;
  }

  if (previewKind === "character") {
    const previewCharacter = ensureCombatLookupIndexes().charactersById.get(previewKey) ?? null;

    if (!previewCharacter) {
      return "";
    }

    return `
      <aside class="combat-spell-preview-overlay combat-spell-preview-overlay--entity" data-combat-spell-preview-overlay role="tooltip" aria-hidden="true">
        ${renderCombatCharacterPreview(previewCharacter)}
      </aside>
    `;
  }

  if (previewKind === "spell") {
    const previewEntry = findCompendiumEntryByReference(state.arcanum, { name: previewKey, entryId: previewKey });

    if (!previewEntry) {
      return "";
    }

    return `
      <aside class="combat-spell-preview-overlay" data-combat-spell-preview-overlay role="tooltip" aria-hidden="true">
        <div class="character-spellbook__preview-card">
          ${renderArcanumDetail(previewEntry)}
        </div>
      </aside>
    `;
  }

  if (previewKind === "ability") {
    const previewName = cleanText(state.activeCombatPreviewName) || (isEnglishInterface() ? "Unnamed ability" : "Habilidad sin nombre");
    const previewDescription = cleanText(state.activeCombatPreviewDescription);
    const previewLabel = isEnglishInterface() ? "ABILITIES" : "Habilidad";

    if (!previewDescription) {
      return "";
    }

    return `
      <aside class="combat-spell-preview-overlay" data-combat-spell-preview-overlay role="tooltip" aria-hidden="true">
        <div class="character-spellbook__preview-card character-spellbook__preview-card--ability">
          <div class="character-ability-preview">
            <p class="eyebrow">${escapeHtml(previewLabel)}</p>
            <h3>${escapeHtml(previewName)}</h3>
            <p>${escapeHtml(previewDescription).replaceAll("\n", "<br />")}</p>
          </div>
        </div>
      </aside>
    `;
  }

  return "";
}

function syncCombatSpellPreviewOverlayMarkup() {
  const existingOverlay = app.querySelector("[data-combat-spell-preview-overlay]");
  const overlayMarkup = renderCombatSpellPreviewOverlay();

  if (!overlayMarkup) {
    existingOverlay?.remove();
    return;
  }

  if (existingOverlay) {
    existingOverlay.outerHTML = overlayMarkup;
  } else {
    const shellRoot = app.querySelector(".shell");
    shellRoot?.insertAdjacentHTML("beforeend", overlayMarkup);
  }

  scheduleActiveCombatSpellPreviewSync();
}

function setActiveCombatPreviewFromTrigger(trigger) {
  const previewKind = cleanText(trigger?.dataset?.combatPreviewKind);
  const previewKey = cleanText(trigger?.dataset?.combatPreviewKey);

  if (!previewKind || !previewKey) {
    clearActiveCombatPreview();
    return;
  }

  state.activeCombatPreviewKind = previewKind;
  state.activeCombatPreviewKey = previewKey;
  state.activeCombatPreviewName = cleanText(trigger?.dataset?.combatPreviewName);
  state.activeCombatPreviewDescription = cleanText(trigger?.dataset?.combatPreviewDescription);
}

function clearActiveCombatPreview() {
  state.activeCombatPreviewKind = "";
  state.activeCombatPreviewKey = "";
  state.activeCombatPreviewName = "";
  state.activeCombatPreviewDescription = "";
}

function renderCombatSpellbookPopover(combatant, character) {
  const spellSlots = getCombatSpellbookVisibleSlots(character);
  const preparedSpells = getPreparedCombatSpellbookSpells(character);
  const spellbookAbilities = getMeaningfulCharacterSpellbookAbilityRows(character.spellbookAbilities);
  const showSpellSection = hasCombatSpellData(character);
  const showAbilitySection = spellbookAbilities.length > 0;
  const showMeta = showSpellSection;

  return `
    <section class="combat-spellbook-popover detail-section" data-combat-spellbook-menu data-combat-spellbook-popover>
      <div class="combat-spellbook-popover__layout${showMeta ? "" : " combat-spellbook-popover__layout--single"}">
        <div class="combat-spellbook-popover__sections">
          ${
            showSpellSection
              ? `
                <section class="combat-spellbook-popover__section">
                  <div class="combat-spellbook-popover__section-title">Hechizos</div>
                  <div class="combat-spellbook-popover__slots">
                    ${
                      spellSlots.length > 0
                        ? `
                          <div class="combat-spellbook-popover__header">
                            <span>Nivel</span>
                            <span>Espacios totales</span>
                            <span>Espacios gastados</span>
                          </div>
                          ${spellSlots.map((entry) => renderCombatSpellbookSlotRow(combatant, entry)).join("")}
                        `
                        : `<div class="combat-spellbook-popover__empty-state">Sin espacios de conjuro definidos.</div>`
                    }
                    <div class="combat-spellbook-popover__footer">Conjuros preparados</div>
                    ${renderCombatPreparedSpellList(preparedSpells)}
                  </div>
                </section>
              `
              : ""
          }
          ${showSpellSection && showAbilitySection ? '<div class="combat-spellbook-popover__divider" aria-hidden="true"></div>' : ""}
          ${
            showAbilitySection
              ? `
                <section class="combat-spellbook-popover__section">
                  <div class="combat-spellbook-popover__section-title">Habilidades</div>
                  ${renderCombatSpellbookAbilityList(combatant, spellbookAbilities)}
                </section>
              `
              : ""
          }
        </div>
        ${
          showMeta
            ? `
              <div class="combat-spellbook-popover__meta">
                ${renderCombatSpellbookMetric("Modificador de ataque magico", formatCombatSpellAttackModifier(character.spellAttackModifier))}
                ${renderCombatSpellbookMetric("CD SALVACION CONJUROS", formatCombatSpellSaveDc(character.spellSaveDc))}
              </div>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function hasCombatSpellbookData(character) {
  return hasCombatSpellData(character) || hasCombatAbilityData(character);
}

function hasCombatSpellData(character) {
  if (!character) {
    return false;
  }

  const visibleLevels = normalizeStoredCharacterSpellSlotVisibleLevels(character.spellSlotLevelsVisible, character.spellSlots);
  const hasSpellRows = getMeaningfulCharacterSpellRows(character.spells).length > 0;
  const hasSlotData = getVisibleCharacterSpellSlots(character).some((entry) => entry.slots > 0) || visibleLevels > 1;

  return hasSpellRows
    || hasSlotData
    || character.spellSaveDc !== ""
    || character.spellAttackModifier !== "";
}

function hasCombatAbilityData(character) {
  return getMeaningfulCharacterSpellbookAbilityRows(character?.spellbookAbilities).length > 0;
}

function getCombatSpellbookVisibleSlots(character) {
  return getVisibleCharacterSpellSlots(character).filter((entry) => entry.slots > 0);
}

function getPreparedCombatSpellbookSpells(character) {
  const spellRows = Array.isArray(character?.spells) ? character.spells : [];
  return getSortedCharacterSpellRows(spellRows)
    .filter((row) => row.prepared === true)
    .filter((row) => cleanText(getCharacterSpellMatchedEntry(row)?.name || row?.name));
}

function renderCombatSpellbookAbilityList(combatant, rows) {
  if (rows.length === 0) {
    return `<div class="combat-spellbook-popover__empty-state">No hay habilidades definidas.</div>`;
  }

  return `
    <div class="combat-spellbook-popover__abilities">
      <div class="combat-spellbook-popover__ability-header" aria-hidden="true">
        <span>Nombre</span>
        <span>Usos</span>
      </div>
      ${rows.map((row) => renderCombatSpellbookAbilityRow(combatant, row)).join("")}
    </div>
  `;
}

function renderCombatSpellbookAbilityRow(combatant, row) {
  const abilityName = cleanText(row?.name) || "Sin nombre";
  const description = cleanText(row?.description);
  const abilityNameMarkup = description
    ? `
      <span
        class="combat-spellbook-popover__ability-name"
        tabindex="0"
        data-combat-preview-kind="ability"
        data-combat-preview-key="${escapeHtml(cleanText(row?.id) || abilityName)}"
        data-combat-preview-name="${escapeHtml(abilityName)}"
        data-combat-preview-description="${escapeHtml(description)}"
      >${escapeHtml(abilityName)}</span>
    `
    : `<span class="combat-spellbook-popover__ability-name">${escapeHtml(abilityName)}</span>`;

  return `
    <div class="combat-spellbook-popover__ability-row">
      ${abilityNameMarkup}
      <div class="combat-spellbook-popover__ability-uses" role="group" aria-label="Usos de ${escapeHtml(abilityName)}">
        ${renderCombatSpellbookAbilityUseDots(combatant.id, row)}
      </div>
    </div>
  `;
}

function renderCombatSpellbookAbilityUseDots(combatantId, row) {
  const uses = Math.max(0, Math.floor(toNumber(row?.uses) || 0));

  if (uses <= 0) {
    return `<span class="combat-spellbook-popover__empty">-</span>`;
  }

  return Array.from({ length: uses }, (_, index) => `
    <button
      class="combat-spellbook-popover__dot${row.spent[index] ? " is-spent" : ""}"
      type="button"
      data-action="toggle-combat-spellbook-ability-spent"
      data-combatant-id="${escapeHtml(combatantId)}"
      data-character-spellbook-ability-row-id="${escapeHtml(row.id)}"
      data-character-spellbook-ability-use-index="${escapeHtml(String(index))}"
      aria-pressed="${row.spent[index] ? "true" : "false"}"
      aria-label="${row.spent[index] ? "Recuperar" : "Gastar"} uso ${escapeHtml(String(index + 1))} de ${escapeHtml(cleanText(row?.name) || "habilidad")}"
    ></button>
  `).join("");
}

function renderCombatPreparedSpellList(spellRows) {
  if (spellRows.length === 0) {
    return `<div class="combat-spellbook-popover__empty-state">No hay conjuros preparados.</div>`;
  }

  return `
    <div class="combat-spellbook-popover__prepared">
      ${spellRows.map((row) => renderCombatPreparedSpellRow(row)).join("")}
    </div>
  `;
}

function renderCombatPreparedSpellRow(row) {
  const matchedSpell = getCharacterSpellMatchedEntry(row);
  const spellName = matchedSpell?.name || row.name || "Sin nombre";
  const levelLabel = formatCompactSpellLevelLabel(matchedSpell?.levelValue ?? getCharacterSpellSortLevel(row));

  return `
    <div class="combat-spellbook-popover__spell-row">
      <div class="combat-spellbook-popover__spell-link-wrap">
        ${
          matchedSpell
            ? `
              <button
                class="combat-spellbook-popover__spell-link"
                type="button"
                data-action="filter-arcanum-by-spell-name"
                data-arcanum-spell-name="${escapeHtml(matchedSpell.name)}"
                data-combat-preview-kind="spell"
                data-combat-preview-key="${escapeHtml(matchedSpell.name)}"
                data-combat-preview-name="${escapeHtml(matchedSpell.name)}"
              >
                ${escapeHtml(spellName)}
              </button>
            `
            : `<span class="combat-spellbook-popover__spell-name">${escapeHtml(spellName)}</span>`
        }
      </div>
      <span class="combat-spellbook-popover__spell-level">${escapeHtml(levelLabel)}</span>
    </div>
  `;
}

function renderCombatSpellbookSlotRow(combatant, entry) {
  return `
    <div class="combat-spellbook-popover__row">
      <span class="combat-spellbook-popover__level">${escapeHtml(String(entry.level))}</span>
      <span class="combat-spellbook-popover__total">${escapeHtml(String(entry.slots))}</span>
      <div class="combat-spellbook-popover__spent" role="group" aria-label="Espacios gastados de nivel ${escapeHtml(String(entry.level))}">
        ${renderCombatSpellbookSpentDots(combatant.id, entry)}
      </div>
    </div>
  `;
}

function renderCombatSpellbookSpentDots(combatantId, entry) {
  if (entry.slots <= 0) {
    return `<span class="combat-spellbook-popover__empty">-</span>`;
  }

  return Array.from({ length: entry.slots }, (_, index) => `
    <button
      class="combat-spellbook-popover__dot${entry.spent[index] ? " is-spent" : ""}"
      type="button"
      data-action="toggle-combat-spell-slot-spent"
      data-combatant-id="${escapeHtml(combatantId)}"
      data-spell-slot-level="${escapeHtml(String(entry.level))}"
      data-spell-slot-index="${escapeHtml(String(index))}"
      aria-pressed="${entry.spent[index] ? "true" : "false"}"
      aria-label="${entry.spent[index] ? "Recuperar" : "Gastar"} espacio de nivel ${escapeHtml(String(entry.level))} ${escapeHtml(String(index + 1))}"
    ></button>
  `).join("");
}

function renderCombatSpellbookMetric(label, value) {
  return `
    <div class="combat-spellbook-popover__metric">
      <div class="combat-spellbook-popover__metric-value">${escapeHtml(value)}</div>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function formatCombatSpellSaveDc(value) {
  return value === "" || value === null || value === undefined ? "-" : String(value);
}

function formatCombatSpellAttackModifier(value) {
  return value === "" || value === null || value === undefined
    ? "-"
    : formatModifier(toNumber(value));
}

function isNpcCharacter(character) {
  return character?.isNpc === true;
}

function getCombatantColumnValue(combatant, key) {
  if (key === "pgMax") {
    return combatant.pgMax ?? "";
  }

  if (key === "estados") {
    return getCombatantStatusNames(combatant).join(", ");
  }

  return combatant[key] ?? "";
}

function isCombatantShieldEquipped(combatant) {
  return combatant?.shieldEquipped === true;
}

function getCombatantArmorClassValue(combatant) {
  if (combatant?.ca === "" || combatant?.ca === null || combatant?.ca === undefined) {
    return "";
  }

  return Math.max(0, toNumber(combatant.ca) + (isCombatantShieldEquipped(combatant) ? 2 : 0));
}

function renderCombatantTagChip(combatant) {
  const tagValue = combatTagOptions.includes(combatant.tag) ? combatant.tag : "NEUTRAL";

  return `
    <details class="combat-inline-menu combat-inline-menu--tag">
      <summary
        class="tag-cycle-button tag-cycle-button--${tagValue.toLowerCase()} tag-cycle-button--compact"
        aria-label="Cambiar bando de ${escapeHtml(combatant.nombre || combatant.id)}. Actual: ${escapeHtml(tagValue)}"
      >
        <span>${escapeHtml(tagValue)}</span>
      </summary>
      <div class="combat-inline-menu__popover">
        ${combatTagOptions.map((tagOption) => `
          <button
            class="combat-inline-menu__option combat-inline-menu__option--${tagOption.toLowerCase()} ${tagOption === tagValue ? "is-active" : ""}"
            type="button"
            data-action="set-combat-tag"
            data-combatant-id="${escapeHtml(combatant.id)}"
            data-combat-tag="${escapeHtml(tagOption)}"
          >
            ${escapeHtml(tagOption)}
          </button>
        `).join("")}
      </div>
    </details>
  `;
}

function renderCombatantNpcChip(combatant, linkedCharacter = getLinkedCharacterForCombatant(combatant)) {
  return isNpcCharacter(linkedCharacter)
    ? `<span class="combat-npc-chip">NPC</span>`
    : "";
}

function renderCombatStatusCell(combatant) {
  const statusNames = getCombatantStatusNames(combatant);
  const isMenuOpen = state.activeCombatStatusMenuId === combatant.id;
  const statusDraft = isMenuOpen ? getCombatStatusDraft(combatant.id) : "";
  const statusEntries = isMenuOpen ? getFilteredCombatStatusReferenceEntries(statusDraft) : [];
  const normalizedDraft = normalizeTranslationKey(statusDraft.toLowerCase());
  const hasExactDraftMatch = isMenuOpen && statusEntries.some((entry) => {
    const localizedStatusName = translateCombatStatusNameForLanguage(entry.name, state.appLanguage);
    return normalizeTranslationKey(entry.name.toLowerCase()) === normalizedDraft
      || normalizeTranslationKey(localizedStatusName.toLowerCase()) === normalizedDraft;
  });
  const firstStatus = statusNames[0] ?? "";
  const remainingStatuses = statusNames.slice(1);

  return `
    <div class="combat-status-cell">
      <div class="combat-status-cell__top">
        <details class="combat-inline-menu combat-inline-menu--status" data-combat-status-menu ${isMenuOpen ? "open" : ""}>
          <summary class="combat-status-cell__add" data-action="toggle-combat-status-menu" data-combatant-id="${escapeHtml(combatant.id)}">
            + Estado
          </summary>
          ${isMenuOpen ? `
            <div class="combat-inline-menu__popover combat-inline-menu__popover--status">
            <label class="combat-inline-menu__search">
              <span>Buscar o escribir estado</span>
              <input
                class="filter-input combat-inline-menu__search-input"
                type="text"
                value="${escapeHtml(statusDraft)}"
                data-combat-status-draft="${escapeHtml(combatant.id)}"
                placeholder="Ej. Derribado"
              />
            </label>
            ${
              statusDraft && !hasExactDraftMatch
                ? `
                  <button
                    class="combat-inline-menu__option combat-inline-menu__option--custom"
                    type="button"
                    data-action="toggle-combat-status"
                    data-combatant-id="${escapeHtml(combatant.id)}"
                    data-combat-status="${escapeHtml(translateCombatStatusNameForLanguage(statusDraft, APP_LANGUAGE_ES))}"
                  >
                    <span class="combat-inline-menu__option-body">
                      <strong>Anadir estado personalizado</strong>
                      <span>${escapeHtml(statusDraft)}</span>
                    </span>
                  </button>
                `
                : ""
            }
            ${
              statusEntries.length > 0
                ? statusEntries.map((entry) => {
                  const canonicalEntryName = getCanonicalCombatStatusName(entry.name);
                  const localizedEntryName = translateCombatStatusNameForLanguage(entry.name, state.appLanguage);
                  const isActive = statusNames.some((statusName) => normalizeTranslationKey(getCanonicalCombatStatusName(statusName).toLowerCase()) === normalizeTranslationKey(canonicalEntryName.toLowerCase()));
                  const iconUrl = getCombatStatusIconUrl(canonicalEntryName);

                  return `
                  <button
                    class="combat-inline-menu__option combat-inline-menu__option--status-card ${getCombatStatusToneClass(entry.name)} ${isActive ? "is-active" : ""}"
                    type="button"
                    data-action="toggle-combat-status"
                    data-combatant-id="${escapeHtml(combatant.id)}"
                    data-combat-status="${escapeHtml(canonicalEntryName)}"
                  >
                    <span class="combat-inline-menu__option-body">
                      <strong>${escapeHtml(localizedEntryName)}</strong>
                      ${entry.description ? `<span>${escapeHtml(entry.description)}</span>` : ""}
                    </span>
                    ${
                      iconUrl
                        ? `
                          <span class="combat-inline-menu__option-icon" aria-hidden="true">
                            <img src="${escapeHtml(iconUrl)}" alt="" decoding="async" />
                          </span>
                        `
                        : ""
                    }
                  </button>
                `;
                }).join("")
                : `<div class="combat-inline-menu__empty">${statusDraft ? "No hay coincidencias en la tabla de estados." : "No hay tabla de estados disponible."}</div>`
            }
            </div>
          ` : ""}
        </details>
        ${firstStatus ? renderCombatStatusChip(combatant.id, firstStatus) : ""}
      </div>
      <div class="combat-status-cell__chips">
        ${
          remainingStatuses.length > 0
            ? remainingStatuses.map((statusName) => renderCombatStatusChip(combatant.id, statusName)).join("")
            : firstStatus
              ? ""
              : `<span class="combat-status-cell__empty">Sin estados</span>`
        }
      </div>
    </div>
  `;
}

function renderCombatStatusChip(combatantId, statusName) {
  const localizedStatusName = translateCombatStatusNameForLanguage(statusName, state.appLanguage);
  const description = getCombatStatusDescription(statusName);
  const tone = getCombatStatusToneClass(statusName);

  return `
    <div class="combat-status-chip-wrap">
      <button
        class="combat-status-chip ${tone}"
        type="button"
        data-action="toggle-combat-status"
        data-combatant-id="${escapeHtml(combatantId)}"
        data-combat-status="${escapeHtml(statusName)}"
        aria-label="Quitar estado ${escapeHtml(localizedStatusName)}"
      >
        ${escapeHtml(localizedStatusName)}
      </button>
      ${
        description
          ? `<div class="combat-status-chip__tooltip">${escapeHtml(description)}</div>`
          : ""
      }
    </div>
  `;
}

function getCombatantStatusNames(combatant) {
  const rawStatuses = splitList(combatant?.condiciones ?? "", /[,;|]/);
  return [...new Set(rawStatuses.map((value) => cleanText(value)).filter(Boolean))];
}

function getExhaustionLevelFromStatusNames(statusNames) {
  return statusNames.reduce((highestLevel, statusName) => {
    const match = cleanText(statusName).match(/^(?:agotamiento|exhaustion)(?:\s+(\d+))?$/i);

    if (!match) {
      return highestLevel;
    }

    const level = Math.max(1, Math.floor(toNumber(match[1]) || 1));
    return Math.max(highestLevel, level);
  }, 0);
}

function removeExhaustionStatuses(statusNames) {
  return statusNames.filter((statusName) => !/^(?:agotamiento|exhaustion)(?:\s+\d+)?$/i.test(cleanText(statusName)));
}

function formatExhaustionStatus(level) {
  return translateCombatStatusNameForLanguage(`Agotamiento ${Math.max(1, Math.floor(toNumber(level)) || 1)}`, state.appLanguage).toUpperCase();
}

function getCombatNameInputStyle(value) {
  const length = cleanText(value).length;

  if (length >= 40) {
    return "font-size:0.68rem;";
  }

  if (length >= 32) {
    return "font-size:0.76rem;";
  }

  if (length >= 24) {
    return "font-size:0.84rem;";
  }

  return "";
}

function getCombatStatusToneClass(statusName) {
  const normalized = normalizeTranslationKey(getCanonicalCombatStatusName(statusName).toLowerCase()).replace(/\s+\d+$/u, "");
  const toneMap = {
    agarrado: "combat-status-chip--grappled",
    agotamiento: "combat-status-chip--exhaustion",
    apresado: "combat-status-chip--restrained",
    asustado: "combat-status-chip--frightened",
    aturdido: "combat-status-chip--stunned",
    cegado: "combat-status-chip--blinded",
    ciego: "combat-status-chip--blinded",
    derribado: "combat-status-chip--prone",
    dormido: "combat-status-chip--sleeping",
    ensordecido: "combat-status-chip--deafened",
    envenenado: "combat-status-chip--poisoned",
    hechizado: "combat-status-chip--charmed",
    incapacitado: "combat-status-chip--incapacitated",
    inconsciente: "combat-status-chip--unconscious",
    invisible: "combat-status-chip--invisible",
    paralizado: "combat-status-chip--paralyzed",
    petrificado: "combat-status-chip--petrified",
    restringido: "combat-status-chip--restrained",
    restrenido: "combat-status-chip--restrained",
    ardiendo: "combat-status-chip--burning",
    maldito: "combat-status-chip--cursed",
    sangrando: "combat-status-chip--bleeding"
  };

  return toneMap[normalized] ?? "combat-status-chip--default";
}

function getCombatStatusDraft(combatantId) {
  return cleanText(state.combatStatusDrafts?.[combatantId]);
}

function setCombatStatusDraft(combatantId, value) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  state.combatStatusDrafts = {
    ...state.combatStatusDrafts,
    [normalizedCombatantId]: cleanText(value)
  };
}

function clearCombatStatusDraft(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId || !state.combatStatusDrafts?.[normalizedCombatantId]) {
    return;
  }

  const nextDrafts = { ...state.combatStatusDrafts };
  delete nextDrafts[normalizedCombatantId];
  state.combatStatusDrafts = nextDrafts;
}

function getCombatStatusDescription(statusName) {
  const canonicalStatusName = getCanonicalCombatStatusName(statusName);
  const exhaustionLevel = Math.max(0, Math.floor(toNumber(cleanText(canonicalStatusName).match(/^agotamiento(?:\s+(\d+))?$/i)?.[1]) || 0));

  if (exhaustionLevel > 0) {
    return `El personaje tiene un -${exhaustionLevel} al resultado de todas sus tiradas.`;
  }

  const normalizedName = normalizeTranslationKey(cleanText(canonicalStatusName).toLowerCase());
  return getCombatStatusReferenceEntries()
    .find((entry) => normalizeTranslationKey(getCanonicalCombatStatusName(entry.name).toLowerCase()) === normalizedName)
    ?.description ?? "";
}

function getFilteredCombatStatusReferenceEntries(query) {
  const search = cleanText(query).toLowerCase();
  const entries = getCombatStatusReferenceEntries();

  if (!search) {
    return entries;
  }

  return entries.filter((entry) => entry.name.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search));
}

function getCombatStatusReferenceEntries() {
  const statusTable = getCombatStatusReferenceTable();

  if (!statusTable) {
    return [];
  }

  const columns = Array.isArray(statusTable.columns) ? statusTable.columns : [];
  const rows = Array.isArray(statusTable.rows) ? statusTable.rows : [];
  const [nameColumn, descriptionColumn] = columns;

  if (!nameColumn || !descriptionColumn) {
    return [];
  }

  return rows
    .map((row) => {
      const name = getTableRowCellValue(row, nameColumn, 0);
      const description = getTableRowCellValue(row, descriptionColumn, 1);

      if (!name) {
        return null;
      }

      return { name, description };
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, isEnglishInterface() ? "en" : "es", { sensitivity: "base" }));
}

function getCombatStatusReferenceTable() {
  const tables = Array.isArray(state.tables) ? state.tables.filter((table) => isPlainObject(table)) : [];
  return tables.find((table) => getSystemTableKind(table) === "status") ?? null;
}

function isProtectedTable(table) {
  return getSystemTableKind(table) === "status" || getSystemTableKind(table) === "wild-magic";
}

function isProtectedTableId(tableId) {
  const normalizedTableId = cleanText(tableId);

  if (!normalizedTableId) {
    return false;
  }

  return isProtectedTable(state.tables.find((table) => table.id === normalizedTableId));
}

function getTableRowCellValue(row, column, columnIndex = 0) {
  if (!column) {
    return "";
  }

  if (Array.isArray(row)) {
    return cleanText(row[columnIndex]);
  }

  if (!isPlainObject(row)) {
    return "";
  }

  if (Array.isArray(row.cells)) {
    return cleanText(row.cells[columnIndex]);
  }

  if (isPlainObject(row.cells)) {
    return cleanText(row.cells[column.id] ?? row.cells[column.label]);
  }

  return cleanText(row[column.id] ?? row[column.label]);
}

function renderCombatNameSuggestion(combatantId, entry) {
  return `
    <button
      class="combat-name-suggestions__option"
      type="button"
      data-action="select-combat-name-suggestion"
      data-combatant-id="${escapeHtml(combatantId)}"
      data-entry-id="${escapeHtml(entry.id)}"
      data-entry-kind="${escapeHtml(entry.kind || "bestiary")}"
    >
      <strong>${escapeHtml(entry.name)} (${escapeHtml(entry.badge || "?")})</strong>
      <span>${escapeHtml(entry.subtitle || "")}</span>
    </button>
  `;
}

function renderCombatantNameToken(combatant, context = getCombatRowContext(combatant)) {
  const { linkedCharacter, bestiaryEntry, tokenUrl } = context;
  const initials = linkedCharacter
    ? getCharacterInitials(linkedCharacter)
    : getCombatantInitials(combatant);

  if (linkedCharacter) {
    return `
      <span class="combat-name-token-wrap combat-name-token-wrap--ally">
        <button
          class="combat-name-token-button combat-name-token-static"
          type="button"
          data-action="open-combatant-character"
          data-character-id="${escapeHtml(linkedCharacter.id)}"
          data-combat-preview-kind="character"
          data-combat-preview-key="${escapeHtml(linkedCharacter.id)}"
          aria-label="Abrir ficha de ${escapeHtml(linkedCharacter.name || combatant.nombre || "personaje")}"
        >
          ${
            tokenUrl
              ? `<img
                  class="combat-name-token"
                  src="${escapeHtml(tokenUrl)}"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />`
              : `<span class="combat-name-token__placeholder">${escapeHtml(initials)}</span>`
          }
        </button>
      </span>
    `;
  }

  if (bestiaryEntry && tokenUrl) {
    return `
      <span class="combat-name-token-wrap">
        <button
          class="combat-name-token-button"
          type="button"
          data-action="open-combatant-bestiary"
          data-entry-id="${escapeHtml(bestiaryEntry.id)}"
          data-combat-preview-kind="bestiary"
          data-combat-preview-key="${escapeHtml(getCompendiumEntryIdentityKey(bestiaryEntry) || bestiaryEntry.id)}"
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
      </span>
    `;
  }

  if (!tokenUrl) {
    return "";
  }

  return `
    <span class="combat-name-token-wrap combat-name-token-wrap--ally">
      <span class="combat-name-token-static">
        <img
          class="combat-name-token"
          src="${escapeHtml(tokenUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
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
  const sizeLabel = isEnglishInterface() ? "SIZE" : "TAMAÑO";
  const sourceLabel = entry.sourceFullName || getBestiarySourceFullName(entry.source) || entry.source || "Sin fuente";
  const crLabel = entry.crBaseLabel || entry.crLabel || "-";

  return `
    <div class="combat-token-preview combat-token-preview--floating">
      <div class="combat-token-preview__header">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(sourceLabel)}</span>
        </div>
        <div class="combat-token-preview__header-meta">
          <small>CR ${escapeHtml(crLabel)}</small>
          <span>${escapeHtml(sizeLabel)}: ${escapeHtml(entry.size || "-")}</span>
        </div>
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

function renderCombatCharacterPreview(character) {
  const subtitleParts = [
    character.className,
    character.subclassName,
    character.species,
    character.level ? `Nivel ${character.level}` : ""
  ].filter(Boolean);

  return `
    <button
      class="combat-token-preview combat-token-preview--character combat-token-preview--floating"
      type="button"
      data-action="open-combatant-character"
      data-character-id="${escapeHtml(character.id)}"
      aria-label="Abrir ficha de ${escapeHtml(character.name || "Personaje sin nombre")}"
    >
      <div class="combat-token-preview__header">
        <div>
          <strong>${escapeHtml(character.name || "Personaje sin nombre")}</strong>
          <span>${escapeHtml(subtitleParts.join(" | ") || "Aliado")}</span>
        </div>
        <small>PB ${escapeHtml(formatModifier(getCharacterProficiencyBonus(character)))}</small>
      </div>
      <div class="combat-token-preview__sections">
        ${renderCombatCharacterStatsPreview(character)}
        ${renderCombatCharacterSkillChipsSection(character)}
        ${renderCombatCharacterCurrencySection(character)}
      </div>
    </button>
  `;
}

function renderCombatCharacterStatsPreview(character) {
  const proficiencyBonus = getCharacterProficiencyBonus(character);
  const proficientKeys = getCharacterProficiencySet(character);
  const passivePerception = getCharacterPassivePerception(character);

  return `
    <section class="character-stat-sheet character-stat-sheet--preview" aria-label="Caracteristicas y competencias">
      <div class="character-stat-sheet__proficiency">
        <span>${escapeHtml(formatModifier(proficiencyBonus))}</span>
        <strong>Bonus competencia</strong>
      </div>
      <div class="character-stat-sheet__blocks">
        ${characterAbilityKeys.map((key) => renderCombatCharacterStatBlockPreview(character, key, proficientKeys, proficiencyBonus)).join("")}
      </div>
      <div class="character-stat-sheet__passive">
        <span>${escapeHtml(String(passivePerception))}</span>
        <strong>Percepcion Pasiva</strong>
      </div>
    </section>
  `;
}

function renderCombatCharacterStatBlockPreview(character, key, proficientKeys, proficiencyBonus) {
  const score = character.abilities[key] ?? 10;
  const modifier = getAbilityModifier(score);
  const meta = characterStatBlocks[key];
  const saveKey = `save:${key}`;

  return `
    <article class="character-stat-block">
      <div class="character-stat-block__score character-stat-block__score--readonly">
        <span class="character-stat-block__modifier">${escapeHtml(formatModifier(modifier))}</span>
        <strong class="character-stat-block__score-value">${escapeHtml(String(score))}</strong>
        <strong>${escapeHtml(meta.label)}</strong>
      </div>
      <div class="character-stat-block__checks">
        ${renderCombatCharacterCheckRowPreview("save", "Salvacion", modifier, proficiencyBonus, proficientKeys.has(saveKey))}
        ${meta.skills.map((skill) => {
          const skillKey = `skill:${skill.id}`;
          return renderCombatCharacterCheckRowPreview("skill", skill.label, modifier, proficiencyBonus, proficientKeys.has(skillKey));
        }).join("")}
      </div>
    </article>
  `;
}

function renderCombatCharacterCheckRowPreview(type, label, modifier, proficiencyBonus, isChecked) {
  const value = modifier + (isChecked ? proficiencyBonus : 0);

  return `
    <div class="character-check-row character-check-row--readonly">
      <span class="character-check-row__mark character-check-row__mark--${type} ${isChecked ? "is-checked" : ""}" aria-hidden="true"></span>
      <strong>${escapeHtml(formatModifier(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderCombatCharacterSkillChipsSection(character) {
  if (state.characterSkillDefinitions.length === 0) {
    return `
      <section class="detail-section">
        <h4>Maestrias</h4>
        <p>Sin maestrias de campana configuradas.</p>
      </section>
    `;
  }

  return `
    <section class="detail-section">
      <h4>Maestrias</h4>
      <div class="combat-token-preview__skill-chips">
        ${state.characterSkillDefinitions.map((skillDefinition) => {
          const progress = getCharacterSkillProgress(getCharacterSkillProgressEntry(character, skillDefinition.id));
          const skillColor = normalizeStoredCharacterSkillColor(skillDefinition.color, getDefaultCharacterSkillColorForIdentity(skillDefinition.id, skillDefinition.name));
          return `
            <span class="combat-character-skill-chip" style="--combat-skill-color:${skillColor}">
              <strong>${escapeHtml(skillDefinition.name)}</strong>
              <span>NV ${escapeHtml(String(progress.level))}</span>
            </span>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCombatCharacterCurrencySection(character) {
  const load = getCharacterInventoryLoad(character);
  const rows = character.inventory.filter((row) => !isCharacterCurrencyRow(row.name) && (cleanText(row.name) || toNumber(row.quantity) > 0));

  return `
    <section class="detail-section">
      <h4>Inventario</h4>
      <div class="combat-token-preview__currency-grid">
        ${characterCurrencyRows.map((currency) => renderCombatCharacterCurrencyPill(character, currency)).join("")}
      </div>
      ${
        rows.length > 0
          ? `
            <div class="combat-token-preview__inventory-list combat-token-preview__inventory-list--simple">
              ${rows.map((row) => renderCombatCharacterInventoryPreviewRow(row)).join("")}
            </div>
          `
          : `<p class="combat-token-preview__inventory-empty">Sin objetos cargados.</p>`
      }
      <p class="combat-token-preview__inventory-meta">Carga ${escapeHtml(formatWeight(load.totalWeight))} / ${escapeHtml(formatWeight(load.maxWeight))} lb</p>
    </section>
  `;
}

function renderCombatCharacterCurrencyPill(character, currency) {
  const row = character.inventory.find((entry) => cleanText(entry.name).toUpperCase() === currency.name);

  return `
    <div class="character-currency-pill character-currency-pill--${currency.icon} character-currency-pill--readonly" title="${currency.name}">
      <span class="character-currency-pill__icon" aria-hidden="true"></span>
      <strong>${currency.shortLabel}</strong>
      <small class="character-currency-pill__value">${escapeHtml(String(row?.quantity ?? 0))}</small>
    </div>
  `;
}

function renderCombatCharacterInventoryPreviewRow(row) {
  const quantity = Math.max(0, toNumber(row.quantity) || 0);
  const sizeLabel = normalizeItemSizeLabel(row.size) || inferItemSizeLabel(row.name);

  return `
    <div class="combat-token-preview__inventory-row">
      <strong>${escapeHtml(row.name || "Objeto sin nombre")}</strong>
      <span>x${escapeHtml(String(quantity))}${sizeLabel ? ` | ${escapeHtml(sizeLabel)}` : ""}</span>
    </div>
  `;
}

function renderCombatantSourceChip(combatant, bestiaryEntry = getCombatantBestiaryEntry(combatant)) {
  if (!isEnemyCombatant(combatant)) {
    return "";
  }

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
  const selectedCombatCharacters = getSelectedCharactersForCombat().filter((character) => !isCharacterAlreadyInCombat(character.id));
  const availableCombatCharacters = visibleCharacters.filter((character) => !isCharacterAlreadyInCombat(character.id));

  if (!activeCharacter && state.characters.length > 0) {
    activeCharacter = visibleCharacters[0] ?? state.characters[0];
    state.activeCharacterId = activeCharacter.id;
  }
  return `
    <section class="panel panel--table characters-screen">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("initiative-board", "", "Personajes")}
      </div>

      ${renderCharactersOverviewPanel(state.characters)}

      <div class="section-heading section-heading--compact characters-repository-heading">
        <div>
          <p class="eyebrow">Repositorio de personajes</p>
        </div>
        <div class="section-meta">
          <span>${state.characters.length} fichas de personaje</span>
        </div>
      </div>
      <div class="characters-repository-divider" aria-hidden="true"></div>

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
        <button class="toolbar-button" type="button" data-action="open-character-import-export">
          ${escapeHtml(t("import_export_button"))}
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
          Maestrias
        </button>
      <button class="toolbar-button toolbar-button--combat characters-toolbar__combat-action" type="button" data-action="add-character-to-combat" ${selectedCombatCharacters.length > 0 ? "" : "disabled"}>
        Anadir al combate
      </button>
      <button class="toolbar-button toolbar-button--combat characters-toolbar__combat-action" type="button" data-action="add-all-characters-to-combat" ${availableCombatCharacters.length > 0 ? "" : "disabled"}>
        Anadir todos
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

const { renderDiaryScreen, renderDiaryEditor } = createDiaryRenderers({
  state: appStateProxy,
  t,
  escapeHtml,
  cleanText,
  renderScreenHeadingIdentity,
  getScreenIconUrl,
  getDiarySearchMatches,
  getDiaryFolderGroups,
  getActiveDiaryNote,
  getDiaryNoteSearchPreview,
  getDiaryNoteUpdatedLabel,
  getDiaryNotesByFolder,
  formatDiaryRealDateSummary,
  formatDiaryHarptosDateSummary,
  getDiaryNoteTags,
  renderDiaryTagSummaryChipHtml,
  normalizeDiaryContentHtml,
  HARPTOS_MONTH_PERIODS,
  HARPTOS_CALENDAR_PERIODS,
  HARPTOS_PERIODS_BY_ID,
  getDiaryHarptosOverviewValidPeriodId,
  normalizeDiaryHarptosOverviewYear,
  getDiaryHarptosMonthToneClass,
  getDiaryHarptosSeasonKey,
  getDiaryHarptosReferencedNotesForDay,
  getDiaryHarptosDayNoteStorageKey,
  normalizeDiaryHarptosQuickNote,
  formatDiaryHarptosDayLabel,
  getDiaryHarptosMoonPhase,
  getDiaryHarptosTransitionClass,
  getDiaryHarptosQuickNoteChipStyle,
  reconcileDiaryUiState
});
function renderCombatAreaEffectsBox(visibleCombatants, hasVisibleCombatants, hasAreaAmount) {
  return `
    <div
      class="combat-area-bulk-box area-damage combat-inline-tooltip-anchor combat-inline-tooltip-anchor--panel"
      data-tooltip="${escapeHtml(t("area_effects_help"))}"
      data-area-label="${escapeHtml(t("area_effects"))}"
      data-combat-area-target-menu
    >
      <input
        class="area-damage__input"
        type="number"
        inputmode="numeric"
        placeholder="${escapeHtml(t("amount_label"))}"
        value="${escapeHtml(state.areaDamage)}"
        data-area-damage
        aria-label="Cantidad para efecto en area"
      />
      <div class="mini-actions area-damage__actions">
        <button
          class="mini-action mini-action--damage"
          type="button"
          data-action="adjust-area-pg-act"
          data-mode="damage"
          data-tooltip="Daño"
          ${!hasVisibleCombatants || !hasAreaAmount ? "disabled" : ""}
          aria-label="Abrir selector de objetivos para daño"
        >
          <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("damage")}</span>
        </button>
        <button
          class="mini-action mini-action--heal"
          type="button"
          data-action="adjust-area-pg-act"
          data-mode="heal"
          data-tooltip="Curacion"
          ${!hasVisibleCombatants || !hasAreaAmount ? "disabled" : ""}
          aria-label="Abrir selector de objetivos para curacion"
        >
          <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("heal")}</span>
        </button>
        <button
          class="mini-action mini-action--necrotic"
          type="button"
          data-action="adjust-area-necrotic"
          data-tooltip="Necrotico"
          ${!hasVisibleCombatants || !hasAreaAmount ? "disabled" : ""}
          aria-label="Abrir selector de objetivos para necrotico"
        >
          <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("necrotic")}</span>
        </button>
        <button
          class="mini-action mini-action--temp"
          type="button"
          data-action="adjust-area-pg-temp"
          data-tooltip="Vida temporal"
          ${!hasVisibleCombatants || !hasAreaAmount ? "disabled" : ""}
          aria-label="Abrir selector de objetivos para vida temporal"
        >
          <span class="mini-action__icon" aria-hidden="true">${renderCombatMiniActionIcon("temp")}</span>
        </button>
        <button
          class="mini-action mini-action--xp"
          type="button"
          data-action="adjust-area-xp"
          data-tooltip="Experiencia"
          ${!hasVisibleCombatants || !hasAreaAmount ? "disabled" : ""}
          aria-label="Abrir selector de objetivos para experiencia"
        >
          <span class="mini-action__icon" aria-hidden="true"><img src="${escapeHtml(combatAreaXpIconUrl)}" alt="" decoding="async" /></span>
        </button>
      </div>
      ${state.combatAreaTargetPicker.mode ? renderCombatAreaTargetPicker(visibleCombatants) : ""}
    </div>
  `;
}

function renderCombatAreaTargetPicker(visibleCombatants) {
  const mode = cleanText(state.combatAreaTargetPicker.mode);
  const selectedIds = state.combatAreaTargetPicker.selectedIds instanceof Set
    ? state.combatAreaTargetPicker.selectedIds
    : new Set();
  const halfDamageIds = state.combatAreaTargetPicker.halfDamageIds instanceof Set
    ? state.combatAreaTargetPicker.halfDamageIds
    : new Set();
  const targetCombatants = getCombatAreaTargetList(mode, visibleCombatants);
  const supportsHalfDamage = mode === "damage" || mode === "necrotic";
  const titleByMode = {
    damage: "Dano en area",
    heal: "Curacion en area",
    necrotic: "Necrotico en area",
    temp: "Vida temporal en area",
    xp: "Experiencia en area"
  };
  const amountLabelByMode = {
    damage: `${cleanText(state.areaDamage) || "0"} PG`,
    heal: `${cleanText(state.areaDamage) || "0"} PG`,
    necrotic: `${cleanText(state.areaDamage) || "0"} PG`,
    temp: `${cleanText(state.areaDamage) || "0"} PG temp`,
    xp: `${cleanText(state.areaDamage) || "0"} PX`
  };
  const titleLabel = titleByMode[mode] || "Efecto en area";
  const titleDetail = amountLabelByMode[mode] || `${cleanText(state.areaDamage) || "0"}`;
  const subtitle = mode === "xp"
    ? "Solo aliados con personaje enlazado. Clic tarjeta para marcar."
    : supportsHalfDamage
      ? "Clic tarjeta para marcar. HALF = mitad."
      : "Clic tarjeta para marcar.";

  return `
    <div class="combat-area-target-picker" role="dialog" aria-label="${escapeHtml(`${titleLabel} ${titleDetail}`)}">
      <div class="combat-area-target-picker__header">
        <strong>${escapeHtml(`${titleLabel} · ${titleDetail}`)}</strong>
        <span>${escapeHtml(subtitle)}</span>
      </div>
      <div class="combat-area-target-picker__list">
        ${targetCombatants.length > 0
          ? targetCombatants.map((combatant) => renderCombatAreaTargetCard(
            combatant,
            selectedIds.has(combatant.id),
            halfDamageIds.has(combatant.id),
            supportsHalfDamage
          )).join("")
          : '<div class="combat-area-target-picker__empty">No hay objetivos validos.</div>'}
      </div>
      <div class="combat-area-target-picker__footer">
        <button class="toolbar-button toolbar-button--subtle-danger" type="button" data-action="cancel-combat-area-targets">
          Cancel
        </button>
        <button
          class="toolbar-button toolbar-button--accent"
          type="button"
          data-action="apply-combat-area-targets"
          ${selectedIds.size === 0 ? "disabled" : ""}
        >
          Apply
        </button>
      </div>
    </div>
  `;
}

function getCombatAreaTargetList(mode, visibleCombatants = getVisibleCombatants()) {
  const normalizedMode = cleanText(mode);
  const candidates = Array.isArray(visibleCombatants) ? visibleCombatants : [];

  if (normalizedMode !== "xp") {
    return candidates;
  }

  return candidates.filter((combatant) => mapTagToSide(combatant.tag) === "allies" && getLinkedCharacterForCombatant(combatant));
}

function renderCombatAreaTargetCard(combatant, isSelected, isHalfDamage, supportsHalfDamage) {
  const tokenUrl = getCombatantTokenUrl(combatant);
  const standNumber = cleanText(combatant.numPeana) || "-";
  const sideLabel = cleanText(combatant.tag) || "NEUTRAL";
  const label = cleanText(combatant.nombre) || "Sin nombre";
  const initials = getCombatantInitials(combatant);

  return `
    <div
      class="combat-area-target-card ${isSelected ? "is-selected" : ""}"
      data-action="toggle-combat-area-target"
      data-combatant-id="${escapeHtml(combatant.id)}"
    >
      <span class="combat-turn-jump-card__media" aria-hidden="true">
        ${tokenUrl
          ? `<img src="${escapeHtml(tokenUrl)}" alt="" loading="lazy" decoding="async" />`
          : `<span class="combat-turn-jump-card__placeholder">${escapeHtml(initials)}</span>`}
      </span>
      <span class="combat-turn-jump-card__copy">
        <strong>${escapeHtml(label)}</strong>
        <small>Peana ${escapeHtml(standNumber)} | ${escapeHtml(sideLabel)}</small>
      </span>
      <span class="combat-area-target-card__checks">
        ${
          supportsHalfDamage
            ? `
              <label
                class="combat-area-target-card__check combat-area-target-card__check--half ${isSelected ? "" : "is-disabled"}"
                data-action="toggle-combat-area-half"
                data-combatant-id="${escapeHtml(combatant.id)}"
              >
                <input
                  type="checkbox"
                  data-action="toggle-combat-area-half"
                  data-combatant-id="${escapeHtml(combatant.id)}"
                  ${isHalfDamage ? "checked" : ""}
                  ${isSelected ? "" : "disabled"}
                />
                <span
                  data-action="toggle-combat-area-half"
                  data-combatant-id="${escapeHtml(combatant.id)}"
                >
                  HALF
                </span>
              </label>
            `
            : ""
        }
      </span>
    </div>
  `;
}

function renderCombatTurnRoundEditor() {
  return `
    <div class="combat-turn-panel__popover combat-turn-panel__popover--round">
      <input
        class="filter-input combat-turn-panel__round-input"
        type="number"
        min="1"
        inputmode="numeric"
        value="${escapeHtml(state.combatTurnRoundDraft || String(getCombatRound()))}"
        data-combat-turn-round-input
        aria-label="Numero de turno"
      />
      <button class="toolbar-button toolbar-button--accent" type="button" data-action="apply-combat-turn-round">
        OK
      </button>
    </div>
  `;
}

function renderCombatTurnJumpMenu(turnOrder, activeTurnCombatantId) {
  return `
    <div class="combat-turn-panel__popover combat-turn-panel__popover--jump" role="listbox" aria-label="Saltar turno a">
      ${turnOrder.map((combatant) => renderCombatTurnJumpOption(combatant, combatant.id === activeTurnCombatantId)).join("")}
    </div>
  `;
}

function renderCombatTurnJumpOption(combatant, isActive) {
  const tokenUrl = getCombatantTokenUrl(combatant);
  const standNumber = cleanText(combatant.numPeana) || "-";
  const sideLabel = cleanText(combatant.tag) || "NEUTRAL";
  const label = cleanText(combatant.nombre) || "Sin nombre";
  const initials = getCombatantInitials(combatant);

  return `
    <button
      class="combat-turn-jump-card ${isActive ? "is-active" : ""}"
      type="button"
      data-action="jump-combat-turn-to"
      data-combatant-id="${escapeHtml(combatant.id)}"
    >
      <span class="combat-turn-jump-card__media" aria-hidden="true">
        ${tokenUrl
          ? `<img src="${escapeHtml(tokenUrl)}" alt="" loading="lazy" decoding="async" />`
          : `<span class="combat-turn-jump-card__placeholder">${escapeHtml(initials)}</span>`}
      </span>
      <span class="combat-turn-jump-card__copy">
        <strong>${escapeHtml(label)}</strong>
        <small>Peana ${escapeHtml(standNumber)} | ${escapeHtml(sideLabel)}</small>
      </span>
    </button>
  `;
}

function toggleDiaryHarptosOverview() {
  if (!state.diaryHarptosOverviewOpen) {
    const activeNote = getActiveDiaryNote();
    const startDate = activeNote?.harptosStart ? normalizeStoredHarptosDate(activeNote.harptosStart) : null;
    state.diaryHarptosOverviewYear = startDate?.year ?? state.diaryHarptosOverviewYear ?? HARPTOS_DEFAULT_YEAR;
    state.diaryHarptosOverviewPeriodId = getDiaryHarptosOverviewValidPeriodId(startDate?.periodId || state.diaryHarptosOverviewPeriodId);
  }

  state.diaryHarptosOverviewOpen = !state.diaryHarptosOverviewOpen;
}

function getInitialDiaryHarptosOverviewYear(diaryState) {
  const activeNote = diaryState?.notes?.find((note) => note.id === diaryState?.activeNoteId) ?? diaryState?.notes?.[0] ?? null;
  return normalizeDiaryHarptosOverviewYear(activeNote?.harptosStart?.year);
}

function getInitialDiaryHarptosOverviewPeriodId(diaryState) {
  const activeNote = diaryState?.notes?.find((note) => note.id === diaryState?.activeNoteId) ?? diaryState?.notes?.[0] ?? null;
  return getDiaryHarptosOverviewValidPeriodId(activeNote?.harptosStart?.periodId);
}

function normalizeDiaryHarptosOverviewYear(value) {
  return Math.max(1, Math.floor(toNumber(value)) || HARPTOS_DEFAULT_YEAR);
}

function getDiaryHarptosOverviewValidPeriodId(periodId) {
  const currentPeriodId = cleanText(periodId);

  if (HARPTOS_MONTH_PERIODS.some((period) => period.id === currentPeriodId)) {
    return currentPeriodId;
  }

  const currentIndex = HARPTOS_CALENDAR_PERIODS.findIndex((period) => period.id === currentPeriodId);

  if (currentIndex >= 0) {
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (HARPTOS_CALENDAR_PERIODS[index]?.kind === "month") {
        return HARPTOS_CALENDAR_PERIODS[index].id;
      }
    }
  }

  const visibleMonthId = HARPTOS_MONTH_PERIODS[0]?.id ?? "hammer";
  return HARPTOS_MONTH_PERIODS.some((period) => period.id === visibleMonthId) ? visibleMonthId : HARPTOS_MONTH_PERIODS[0]?.id ?? "hammer";
}

function formatDiaryHarptosDayLabel(periodId, day, year, options = {}) {
  const normalizedPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  const period = HARPTOS_PERIODS_BY_ID.get(normalizedPeriodId) ?? HARPTOS_MONTH_PERIODS[0];
  const normalizedYear = normalizeDiaryHarptosOverviewYear(year);
  const normalizedDay = Math.max(1, Math.min(period.days, Math.floor(toNumber(day)) || 1));
  const baseLabel = `${normalizedDay} ${period.name}`;
  return options.includeYear ? `${baseLabel}, ${normalizedYear}` : baseLabel;
}

function getDiaryHarptosMoonPhase(periodId, day) {
  const normalizedPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  const normalizedDay = Math.max(1, Math.floor(toNumber(day)) || 1);
  const phaseRule = (HARPTOS_MOON_PHASE_RULES[normalizedPeriodId] ?? []).find((entry) => normalizedDay >= entry.start && normalizedDay <= entry.end);

  if (!phaseRule) {
    return null;
  }

  const iconUrl = HARPTOS_MOON_PHASE_ICON_URLS[phaseRule.phase] ?? "";

  if (!iconUrl) {
    return null;
  }

  return {
    phase: phaseRule.phase,
    iconUrl,
    label: t(`diary_harptos_moon_${phaseRule.phase}`)
  };
}

function getDiaryHarptosMonthToneClass(periodId) {
  const normalizedPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  const toneMap = {
    hammer: "diary-harptos-season-tone diary-harptos-season-tone--winter",
    alturiak: "diary-harptos-season-tone diary-harptos-season-tone--winter",
    ches: "diary-harptos-season-tone diary-harptos-season-tone--winter-spring",
    tarsakh: "diary-harptos-season-tone diary-harptos-season-tone--spring",
    mirtul: "diary-harptos-season-tone diary-harptos-season-tone--spring",
    kythorn: "diary-harptos-season-tone diary-harptos-season-tone--spring-summer",
    flamerule: "diary-harptos-season-tone diary-harptos-season-tone--summer",
    eleasis: "diary-harptos-season-tone diary-harptos-season-tone--summer",
    eleint: "diary-harptos-season-tone diary-harptos-season-tone--summer-autumn",
    marpenoth: "diary-harptos-season-tone diary-harptos-season-tone--autumn",
    uktar: "diary-harptos-season-tone diary-harptos-season-tone--autumn",
    nightal: "diary-harptos-season-tone diary-harptos-season-tone--autumn-winter"
  };

  return toneMap[normalizedPeriodId] ?? "diary-harptos-season-tone diary-harptos-season-tone--transition";
}

function getDiaryHarptosTransitionClass(periodId, day) {
  const normalizedPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  const normalizedDay = Math.max(1, Math.floor(toNumber(day)) || 1);
  const classMap = {
    "ches|19": "diary-harptos-overview__day-card--transition-winter-spring",
    "kythorn|20": "diary-harptos-overview__day-card--transition-spring-summer",
    "eleint|21": "diary-harptos-overview__day-card--transition-summer-autumn",
    "nightal|20": "diary-harptos-overview__day-card--transition-autumn-winter"
  };
  return classMap[`${normalizedPeriodId}|${normalizedDay}`] ?? "";
}

function normalizeDiaryHarptosDayNoteKey(value) {
  const normalizedValue = cleanText(value);
  return /^\d+\|[a-z0-9-]+\|\d+$/i.test(normalizedValue) ? normalizedValue : "";
}

function normalizeDiaryHarptosQuickNote(value) {
  if (isPlainObject(value)) {
    const label = cleanText(value.label);
    const color = normalizeDiaryTagColorValue(value.color) || "#d88d5a";
    return label ? { label, color } : null;
  }

  const label = cleanText(value);
  return label ? { label, color: "#d88d5a" } : null;
}

function getDiaryHarptosQuickNoteChipStyle(colorValue) {
  const accent = normalizeDiaryTagColorValue(colorValue) || "#d88d5a";
  return [
    `--diary-harptos-chip-border: ${hexToRgba(accent, 0.5)}`,
    `--diary-harptos-chip-bg: ${hexToRgba(accent, 0.24)}`,
    "--diary-harptos-chip-color: #24180f"
  ].join("; ");
}

function getDiaryHarptosDayNoteStorageKey(year, periodId, day) {
  const normalizedYear = normalizeDiaryHarptosOverviewYear(year);
  const normalizedPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  const period = HARPTOS_PERIODS_BY_ID.get(normalizedPeriodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const normalizedDay = Math.max(1, Math.min(period.days, Math.floor(toNumber(day)) || 1));
  return `${normalizedYear}|${normalizedPeriodId}|${normalizedDay}`;
}

function updateDiaryHarptosDayNote(periodId, day, year, value, color = "#d88d5a") {
  const key = getDiaryHarptosDayNoteStorageKey(year, periodId, day);
  const nextValue = cleanText(value);
  const nextColor = normalizeDiaryTagColorValue(color) || "#d88d5a";
  const nextNotes = {
    ...state.diaryHarptosDayNotes
  };

  if (nextValue) {
    nextNotes[key] = {
      label: nextValue,
      color: nextColor
    };
  } else {
    delete nextNotes[key];
  }

  state.diaryHarptosDayNotes = nextNotes;
  saveDiaryState();
}

function openDiaryHarptosDayNoteDialog(periodId, day, year) {
  const key = getDiaryHarptosDayNoteStorageKey(year, periodId, day);
  const currentNote = normalizeDiaryHarptosQuickNote(state.diaryHarptosDayNotes?.[key]);
  state.diaryHarptosDayNoteDialogOpen = true;
  state.diaryHarptosDayNoteDialogYear = normalizeDiaryHarptosOverviewYear(year);
  state.diaryHarptosDayNoteDialogPeriodId = getDiaryHarptosOverviewValidPeriodId(periodId);
  state.diaryHarptosDayNoteDialogDay = Math.max(1, Math.floor(toNumber(day)) || 1);
  state.diaryHarptosDayNoteDialogValue = currentNote?.label ?? "";
  state.diaryHarptosDayNoteDialogColor = currentNote?.color ?? "#d88d5a";
  render({
    focusSelector: "[data-diary-harptos-day-note-dialog-input]",
    selectionStart: state.diaryHarptosDayNoteDialogValue.length,
    selectionEnd: state.diaryHarptosDayNoteDialogValue.length
  });
}

function closeDiaryHarptosDayNoteDialog() {
  state.diaryHarptosDayNoteDialogOpen = false;
  state.diaryHarptosDayNoteDialogYear = HARPTOS_DEFAULT_YEAR;
  state.diaryHarptosDayNoteDialogPeriodId = HARPTOS_MONTH_PERIODS[0]?.id ?? "hammer";
  state.diaryHarptosDayNoteDialogDay = 1;
  state.diaryHarptosDayNoteDialogValue = "";
  state.diaryHarptosDayNoteDialogColor = "#d88d5a";
}

function submitDiaryHarptosDayNoteDialog() {
  updateDiaryHarptosDayNote(
    state.diaryHarptosDayNoteDialogPeriodId,
    state.diaryHarptosDayNoteDialogDay,
    state.diaryHarptosDayNoteDialogYear,
    state.diaryHarptosDayNoteDialogValue,
    state.diaryHarptosDayNoteDialogColor
  );
  closeDiaryHarptosDayNoteDialog();
  render();
}

function insertDiaryHarptosDayNoteEmoji(emojiValue) {
  const emoji = cleanText(emojiValue);

  if (!emoji) {
    return;
  }

  const currentValue = state.diaryHarptosDayNoteDialogValue;
  const separator = currentValue && !/\s$/u.test(currentValue) ? " " : "";
  state.diaryHarptosDayNoteDialogValue = `${currentValue}${separator}${emoji}`.trim();
  render({
    focusSelector: "[data-diary-harptos-day-note-dialog-input]",
    selectionStart: state.diaryHarptosDayNoteDialogValue.length,
    selectionEnd: state.diaryHarptosDayNoteDialogValue.length
  });
}

function getDiaryHarptosDayOfYear(value) {
  const normalizedDate = normalizeStoredHarptosDate(value);
  let dayOfYear = 0;

  for (const period of HARPTOS_CALENDAR_PERIODS) {
    if (period.id === normalizedDate.periodId) {
      return dayOfYear + Math.max(1, Math.min(period.days, normalizedDate.day));
    }

    dayOfYear += period.days;
  }

  return 1;
}

function compareDiaryHarptosDates(left, right) {
  const leftDate = normalizeStoredHarptosDate(left);
  const rightDate = normalizeStoredHarptosDate(right);

  if (leftDate.year !== rightDate.year) {
    return leftDate.year - rightDate.year;
  }

  return getDiaryHarptosDayOfYear(leftDate) - getDiaryHarptosDayOfYear(rightDate);
}

function doesDiaryNoteReferenceHarptosDay(note, year, periodId, day) {
  const targetDate = normalizeStoredHarptosDate({ year, periodId, day });
  const startDate = normalizeStoredHarptosDate(note.harptosStart);
  const endDate = note.harptosDateMode === "range"
    ? normalizeStoredHarptosDate(note.harptosEnd, startDate)
    : { ...startDate };
  const [rangeStart, rangeEnd] = compareDiaryHarptosDates(startDate, endDate) <= 0
    ? [startDate, endDate]
    : [endDate, startDate];

  return compareDiaryHarptosDates(rangeStart, targetDate) <= 0
    && compareDiaryHarptosDates(targetDate, rangeEnd) <= 0;
}

function getDiaryHarptosReferencedNotesForDay(year, periodId, day) {
  return state.diaryNotes.filter((note) => doesDiaryNoteReferenceHarptosDay(note, year, periodId, day));
}

function getDiaryHarptosSeasonKey(periodId, day) {
  const targetDate = normalizeStoredHarptosDate({ year: HARPTOS_DEFAULT_YEAR, periodId, day });

  if (
    isDiaryHarptosDateInRange(targetDate, { periodId: "hammer", day: 1 }, { periodId: "ches", day: 18 })
    || isDiaryHarptosDateInRange(targetDate, { periodId: "nightal", day: 21 }, { periodId: "nightal", day: 30 })
  ) {
    return "winter";
  }

  if (isDiaryHarptosDateInRange(targetDate, { periodId: "ches", day: 20 }, { periodId: "kythorn", day: 19 })) {
    return "spring";
  }

  if (isDiaryHarptosDateInRange(targetDate, { periodId: "kythorn", day: 21 }, { periodId: "eleint", day: 20 })) {
    return "summer";
  }

  if (isDiaryHarptosDateInRange(targetDate, { periodId: "eleint", day: 22 }, { periodId: "nightal", day: 19 })) {
    return "autumn";
  }

  return "transition";
}

function isDiaryHarptosDateInRange(targetDate, startDate, endDate) {
  const normalizedTarget = normalizeStoredHarptosDate({ year: HARPTOS_DEFAULT_YEAR, ...targetDate });
  const normalizedStart = normalizeStoredHarptosDate({ year: HARPTOS_DEFAULT_YEAR, ...startDate });
  const normalizedEnd = normalizeStoredHarptosDate({ year: HARPTOS_DEFAULT_YEAR, ...endDate });

  return compareDiaryHarptosDates(normalizedStart, normalizedTarget) <= 0
    && compareDiaryHarptosDates(normalizedTarget, normalizedEnd) <= 0;
}

const {
  renderTablesScreen,
  renderTablePanel,
  syncRolledTableRowIntoView,
  openItemFromLootTable,
  openSpellFromTable
} = createTableRenderers({
  state: appStateProxy,
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
});
function renderCharacterListItem(character) {
  const isActive = character.id === state.activeCharacterId;
  const isSelected = state.selectedCharacterIds.has(character.id);
  const subtitle = [
    character.className,
    character.level ? `Nivel ${character.level}` : "",
    isNpcCharacter(character) ? "" : character.playerName
  ].filter(Boolean).join(" | ");
  const classIcon = getCharacterClassIcon(character.className);

  return `
    <button
      class="character-list-item ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-character"
      data-character-id="${escapeHtml(character.id)}"
      aria-pressed="${isSelected}"
      title="Ctrl o Cmd + clic para multiseleccionar"
    >
      ${renderCharacterAvatar(character)}
      <span class="character-list-item__copy">
        <strong>${escapeHtml(character.name || "Personaje sin nombre")}</strong>
        <small>${escapeHtml(subtitle || (isNpcCharacter(character) ? "NPC" : "ALIADO"))}</small>
        ${isNpcCharacter(character) ? `<span class="character-list-item__npc">NPC</span>` : ""}
        ${isSelected ? `<span class="character-list-item__selection-mark" aria-hidden="true">+</span>` : ""}
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
        <p class="eyebrow">Ficha de personaje</p>
        <div class="character-sheet__header-fields">
          ${renderCharacterTextField("name", "Nombre", character.name, "Seraphina Vale", { compact: true })}
          <div class="character-sheet__player-row">
            ${renderCharacterTextField("playerName", "Jugador", character.playerName, "Victor", { compact: true, short: true })}
            ${renderCharacterNpcField(character)}
          </div>
        </div>
      </div>
      ${renderCharacterHeaderAside(character)}
    </div>

    <div class="character-editor__section--identity">
      <div class="character-identity-grid">
        ${renderCharacterClassSection(character)}
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
      ${renderCharacterSpellbookSection(character)}
      ${renderCharacterSkillSection(character)}
      ${renderCharacterInventorySection(character)}
    </div>
  `;
}

function renderCharactersOverviewPanel(characters) {
  if (!characters.length) {
    return "";
  }

  const passivePerceptionTooltip = isEnglishInterface() ? "PASIVE PERCEPTION" : "PERCEPCION PASIVA";
  const trapPerceptionTooltip = isEnglishInterface()
    ? "Perception of traps and secret doors"
    : "Percepcion de trampas y puertas secretas";

  return `
    <section class="character-overview">
      <div class="section-heading section-heading--compact">
        <div class="character-overview__heading-inline">
          <p class="eyebrow">Resumen de grupo</p>
          <button
            class="toolbar-button toolbar-button--subtle character-overview__toggle"
            type="button"
            data-action="toggle-characters-overview"
            aria-expanded="${state.charactersOverviewHidden ? "false" : "true"}"
          >
            ${state.charactersOverviewHidden ? "Ver tabla" : "Ocultar tabla"}
          </button>
        </div>
      </div>
      ${
        state.charactersOverviewHidden
          ? ""
          : `
            <div class="table-wrap character-overview__table-wrap" role="region" aria-label="Resumen de personajes">
              <table class="combat-table character-overview-table">
                <colgroup>
                  <col style="width: 9rem" />
                  <col style="width: 5.5rem" />
                  <col style="width: 4.5rem" />
                  <col style="width: 5.5rem" />
                  <col style="width: 5.5rem" />
                  <col style="width: 4.8rem" />
                  <col style="width: 4.8rem" />
                  <col style="width: 8.6rem" />
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
                    <th scope="col">
                      <span class="character-overview__header-tooltip" tabindex="0" data-character-overview-tooltip="${escapeHtml(passivePerceptionTooltip)}">P.P</span>
                    </th>
                    <th scope="col">
                      <span class="character-overview__header-tooltip" tabindex="0" data-character-overview-tooltip="${escapeHtml(trapPerceptionTooltip)}">P.T</span>
                    </th>
                    <th scope="col">XP</th>
                    <th scope="col">Carga</th>
                    <th scope="col">Maestrias</th>
                  </tr>
                </thead>
                <tbody>
                  ${characters.map((character) => renderCharacterOverviewRow(character)).join("")}
                </tbody>
              </table>
            </div>
          `
      }
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
      <td>${renderCharacterOverviewField(character.id, "trapPerception", character.trapPerception ?? 0, "number")}</td>
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
    return `<span class="character-overview__value">Sin maestrias</span>`;
  }

  return `
    <div class="character-skill-summary">
      ${state.characterSkillDefinitions.map((skillDefinition) => {
        const progress = getCharacterSkillProgress(getCharacterSkillProgressEntry(character, skillDefinition.id));
        const themeStyle = getCharacterSkillThemeStyle(skillDefinition);

        return `
          <div class="character-skill-summary__item" style="${themeStyle}">
            <div class="character-skill-summary__meta">
              <strong>${escapeHtml(skillDefinition.name || "Maestria")}</strong>
              <small>${escapeHtml(progress.level > 0 ? progress.label : "Sin rango")}</small>
            </div>
            <div class="character-skill-summary__bar">
              ${renderCharacterOverviewSkillProgressBar(progress, themeStyle)}
            </div>
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
      <div class="character-header-support">
        <div class="character-experience-panel">
          ${renderCharacterExperienceBar(character)}
        </div>
        ${renderCharacterExperienceControls(character, { sheetLayout: true })}
      </div>
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
  const masterySettingsTitle = isEnglishInterface() ? "Masteries Settings" : "Configuracion de maestrias";
  const masterySettingsDescription = isEnglishInterface()
    ? "This list and its XP gains are shared by all characters."
    : "Esta lista y sus ganancias de XP se comparten entre todos los personajes.";

  return `
    <section class="detail-section character-skill-config">
      <div class="character-skill-config__header">
        <div>
          <h4>${escapeHtml(masterySettingsTitle)}</h4>
          <p>${escapeHtml(masterySettingsDescription)}</p>
        </div>
      </div>
      <div class="character-skill-config__actions">
        <button class="toolbar-button toolbar-button--subtle" type="button" data-action="add-character-skill-definition">
          Anadir maestria
        </button>
      </div>
      <div class="character-skill-config__list">
        ${
          state.characterSkillDefinitions.length > 0
            ? state.characterSkillDefinitions.map((skillDefinition) => renderCharacterSkillConfigRow(skillDefinition)).join("")
            : `<div class="empty-state empty-state--compact">No hay maestrias comunes configuradas.</div>`
        }
      </div>
    </section>
  `;
}

function renderCharacterSkillConfigRow(skillDefinition) {
  const hasIntermediateGains = normalizeStoredCharacterSkillGains(skillDefinition.intermediateGains, []).length > 0;
  const themeStyle = getCharacterSkillThemeStyle(skillDefinition);
  const isCookingSkill = cleanText(skillDefinition.id) === "skill-cocina" || cleanText(skillDefinition.name).toLowerCase() === "cocina";
  const cookingInputStyle = isCookingSkill ? ' style="width:7.2rem;max-width:7.2rem;min-width:7.2rem;"' : "";
  const localizedSkillName = isEnglishInterface()
    ? translateUiString(skillDefinition.name || "Maestria")
    : (skillDefinition.name || "Maestria");

  return `
    <div class="character-skill-config__row ${hasIntermediateGains ? "character-skill-config__row--with-intermediate" : ""}" style="${themeStyle}">
      <label class="character-skill-config__field character-skill-config__field--name">
        <span>Maestria</span>
        <input
          class="filter-input character-skill-config__input${isCookingSkill ? " character-skill-config__input--cooking" : ""}"
          type="text"
          ${cookingInputStyle}
          value="${escapeHtml(localizedSkillName)}"
          placeholder="Nueva maestria"
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

function renderCharacterSpellbookSection(character) {
  const isOpen = character.spellsOpen === true;
  const sortedSpellRows = getSortedCharacterSpellRows(character.spells);
  const spellCount = getMeaningfulCharacterSpellRows(character.spells).length;
  const preparedCount = character.spells.filter((row) => row.prepared).length;
  const visibleSpellSlots = getVisibleCharacterSpellSlots(character);
  const spellbookAbilities = normalizeStoredCharacterSpellbookAbilities(character.spellbookAbilities);
  const abilityCount = getMeaningfulCharacterSpellbookAbilityRows(spellbookAbilities).length;
  const spellbookTitle = isEnglishInterface() ? "Spells and Abilities" : "Hechizos y habilidades";
  const spellbookToggleLabel = isEnglishInterface()
    ? (isOpen ? "Hide spells and abilities" : "Show spells and abilities")
    : (isOpen ? "Ocultar hechizos y habilidades" : "Mostrar hechizos y habilidades");
  const modifierLabel = isEnglishInterface() ? "Modifier" : "Modificador";

  return `
    <section class="detail-section character-spellbook" data-character-spell-menu>
      <div class="character-section-toggle character-section-toggle--spellbook">
        <div class="character-section-toggle__click" data-action="toggle-character-spellbook">
          <div class="character-spellbook__heading">
            <span>${escapeHtml(spellbookTitle)}</span>
            <div class="character-spellbook__summary">
              <strong>${escapeHtml(String(preparedCount))} preparados</strong>
              <small>${escapeHtml(String(spellCount))} totales</small>
            </div>
          </div>
        </div>
        <button
          class="character-section-toggle__button"
          type="button"
          data-action="toggle-character-spellbook"
          aria-expanded="${isOpen}"
          aria-label="${escapeHtml(spellbookToggleLabel)}"
        >
          <strong aria-hidden="true">${isOpen ? "-" : "+"}</strong>
        </button>
      </div>
      ${
        isOpen
          ? `
            <div class="character-spellbook__body">
              <div class="character-spellbook__panel">
                <div class="character-spellbook__panel-title">
                  <span>Hechizos</span>
                  <small>${escapeHtml(String(spellCount))} conocidos</small>
                </div>
                <div class="character-spellbook__slots">
                  <div class="character-spellbook__slots-grid character-spellbook__slots-grid--meta">
                    <label class="character-spellbook__slot-field character-spellbook__slot-field--meta character-spellbook__slot-field--modifier">
                      <span>${escapeHtml(modifierLabel)}</span>
                      <input
                        class="filter-input character-spellbook__slot-input"
                        type="text"
                        inputmode="text"
                        value="${escapeHtml(formatCharacterSignedFieldValue(character.spellAttackModifier))}"
                        placeholder="+0"
                        data-character-field="spellAttackModifier"
                      />
                    </label>
                    <label class="character-spellbook__slot-field character-spellbook__slot-field--meta character-spellbook__slot-field--dc">
                      <span>CD</span>
                      <input
                        class="filter-input character-spellbook__slot-input"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        value="${escapeHtml(String(character.spellSaveDc ?? ""))}"
                        data-character-field="spellSaveDc"
                      />
                    </label>
                  </div>
                  <div class="character-spellbook__slots-header">
                    <p>Espacios de hechizo</p>
                  </div>
                  <div class="character-spellbook__slots-grid">
                    ${visibleSpellSlots.map((entry) => renderCharacterSpellSlotField(entry)).join("")}
                    <button
                      class="toolbar-button toolbar-button--subtle character-spellbook__slot-add"
                      type="button"
                      data-action="add-character-spell-slot-level"
                      ${visibleSpellSlots.length >= 9 ? "disabled" : ""}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div class="character-spellbook__list">
                  <div class="character-spellbook__header" aria-hidden="true">
                    <span>Nombre</span>
                    <span>Nivel</span>
                    <span>Preparado</span>
                    <span></span>
                  </div>
                  ${sortedSpellRows.map((row) => renderCharacterSpellRow(row)).join("")}
                  <div class="character-rows-add">
                    <button class="toolbar-button toolbar-button--subtle character-rows-add__button" type="button" data-action="add-character-spell-row">
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div class="character-spellbook__panel">
                <div class="character-spellbook__panel-title">
                  <span>Habilidades</span>
                  <small>${escapeHtml(String(abilityCount))} registradas</small>
                </div>
                <div class="character-spellbook__ability-list">
                  <div class="character-spellbook__ability-header" aria-hidden="true">
                    <span>Nombre</span>
                    <span>Descripcion</span>
                    <span>Usos</span>
                    <span></span>
                  </div>
                  ${spellbookAbilities.map((row) => renderCharacterSpellbookAbilityRow(row)).join("")}
                  <div class="character-rows-add">
                    <button class="toolbar-button toolbar-button--subtle character-rows-add__button" type="button" data-action="add-character-spellbook-ability-row">
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCharacterSpellSlotField(entry) {
  return `
    <label class="character-spellbook__slot-field">
      <span>Nivel ${escapeHtml(String(entry.level))}</span>
      <input
        class="filter-input character-spellbook__slot-input"
        type="number"
        inputmode="numeric"
        min="0"
        value="${escapeHtml(String(entry.slots))}"
        data-character-spell-slot-level="${escapeHtml(String(entry.level))}"
      />
    </label>
  `;
}

function getVisibleCharacterSpellSlots(character) {
  const visibleLevels = normalizeStoredCharacterSpellSlotVisibleLevels(character.spellSlotLevelsVisible, character.spellSlots);
  return ensureCharacterSpellSlotLevels(character.spellSlots, visibleLevels).slice(0, visibleLevels);
}

function getCharacterSpellSuggestions(rowId) {
  const character = getActiveCharacter();
  const row = character?.spells.find((entry) => entry.id === rowId);
  const query = normalizeSearchText(row?.name);

  if (!query || state.arcanumStatus !== "ready") {
    return [];
  }

  return state.arcanum
    .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }))
    .slice(0, 12);
}

function buildSuggestionDuplicateCountMap(entries) {
  return entries.reduce((counts, entry) => {
    const key = cleanText(entry?.name).toLowerCase();

    if (!key) {
      return counts;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());
}

function formatCompendiumSuggestionLabel(entry, duplicateCounts) {
  const duplicateCount = duplicateCounts.get(cleanText(entry?.name).toLowerCase()) ?? 0;
  return duplicateCount > 1
    ? `${entry.name} (${entry.source || "?"})`
    : entry.name;
}

function getCharacterSpellMatchedEntry(row) {
  return findCompendiumEntryByReference(state.arcanum, {
    entryKey: row.spellKey,
    entryId: row.spellId,
    name: row.name,
    canonicalName: row.canonicalName,
    localizedName: row.localizedName
  });
}

function getCharacterSpellSortLevel(row) {
  const matchedSpell = getCharacterSpellMatchedEntry(row);
  const rawLevel = matchedSpell?.levelShort || row?.level || "";

  if (isCharacterSpellCantripLabel(rawLevel)) {
    return 0;
  }

  return matchedSpell?.levelValue ?? parseSpellLevel(rawLevel);
}

function compareCharacterSpellRows(left, right) {
  const levelDifference = getCharacterSpellSortLevel(left) - getCharacterSpellSortLevel(right);

  if (levelDifference !== 0) {
    return levelDifference;
  }

  const leftName = cleanText(getCharacterSpellMatchedEntry(left)?.name || left?.name).toLowerCase();
  const rightName = cleanText(getCharacterSpellMatchedEntry(right)?.name || right?.name).toLowerCase();
  const nameDifference = leftName.localeCompare(rightName, "es", { sensitivity: "base" });

  if (nameDifference !== 0) {
    return nameDifference;
  }

  return cleanText(left?.id).localeCompare(cleanText(right?.id), "es", { sensitivity: "base" });
}

function getSortedCharacterSpellRows(spellRows) {
  return Array.isArray(spellRows) ? [...spellRows].sort(compareCharacterSpellRows) : [];
}

function hasMeaningfulCharacterSpellRow(row) {
  return Boolean(cleanText(row?.name) || cleanText(row?.level) || row?.prepared === true);
}

function getMeaningfulCharacterSpellRows(spellRows) {
  return getSortedCharacterSpellRows(spellRows).filter((row) => hasMeaningfulCharacterSpellRow(row));
}

function renderCharacterSpellPreview(entry) {
  return `
    <div class="character-spellbook__preview" role="tooltip">
      <div class="character-spellbook__preview-card">
        ${renderArcanumDetail(entry)}
      </div>
    </div>
  `;
}

function renderCharacterSpellRow(row) {
  const matchedSpell = getCharacterSpellMatchedEntry(row);
  const suggestions = getCharacterSpellSuggestions(row.id);
  const duplicateCounts = buildSuggestionDuplicateCountMap(suggestions);
  const showSuggestions = state.showCharacterSpellSuggestions
    && state.activeCharacterSpellRowId === row.id
    && suggestions.length > 0;
  const rawLevelValue = matchedSpell?.levelShort || row.level;
  const levelLabel = getCharacterSpellSortLevel(row) === 0 || isCharacterSpellCantripLabel(rawLevelValue)
    ? "TRUCO"
    : getCharacterSpellLevelLabel(rawLevelValue);

  return `
    <div class="character-spellbook__row" data-character-spell-menu>
      <div class="character-spellbook__name-cell${matchedSpell ? " character-spellbook__name-cell--linked" : ""}" data-character-spell-menu>
        <div class="character-spellbook__name-stack">
          <input
            class="filter-input character-spellbook__input${matchedSpell ? " character-spellbook__input--linked" : ""}"
            type="search"
            value="${escapeHtml(row.name)}"
            placeholder="Nombre del hechizo"
            data-character-spell-name="${escapeHtml(row.id)}"
          />
        </div>
        ${matchedSpell ? renderCharacterSpellPreview(matchedSpell) : ""}
        ${
          showSuggestions
            ? `
              <div class="bestiary-query__popover character-spellbook__suggestions" role="listbox" aria-label="Sugerencias de hechizos">
                ${suggestions.map((entry) => `
                  <button
                    class="bestiary-query__option"
                    type="button"
                    data-action="select-character-spell-suggestion"
                    data-character-spell-row-id="${escapeHtml(row.id)}"
                    data-arcanum-entry-id="${escapeHtml(entry.id)}"
                  >
                    ${escapeHtml(formatCompendiumSuggestionLabel(entry, duplicateCounts))}
                  </button>
                `).join("")}
              </div>
            `
            : ""
        }
      </div>
      <label class="character-spellbook__field">
        <input
          class="filter-input character-spellbook__input"
          type="text"
          value="${escapeHtml(levelLabel)}"
          placeholder="N/D"
          data-character-spell-field="level"
          data-character-spell-row="${escapeHtml(row.id)}"
          ${matchedSpell ? "disabled" : ""}
        />
      </label>
      <label class="character-spellbook__prepared">
        <input
          type="checkbox"
          data-character-spell-field="prepared"
          data-character-spell-row="${escapeHtml(row.id)}"
          ${row.prepared ? "checked" : ""}
        />
      </label>
      <button
        class="toolbar-button toolbar-button--subtle-danger character-spellbook__remove"
        type="button"
        data-action="remove-character-spell-row"
        data-character-spell-row-id="${escapeHtml(row.id)}"
        aria-label="Quitar ${escapeHtml(row.name || "hechizo")}"
      >
        Quitar
      </button>
    </div>
  `;
}

function renderCharacterSpellbookAbilityRow(row) {
  const description = cleanText(row.description);
  const hasDescription = Boolean(description);

  return `
    <div class="character-spellbook__ability-row">
      <label class="character-spellbook__name-cell${hasDescription ? " character-spellbook__name-cell--described" : ""}">
        <input
          class="filter-input character-spellbook__input${hasDescription ? " character-spellbook__input--described" : ""}"
          type="text"
          value="${escapeHtml(row.name)}"
          placeholder="Nombre de la habilidad"
          data-character-spellbook-ability-field="name"
          data-character-spellbook-ability-row="${escapeHtml(row.id)}"
        />
        ${hasDescription ? renderCharacterSpellbookAbilityPreview(row) : ""}
      </label>
      <div class="character-spellbook__ability-description-cell">
        <button
          class="toolbar-button toolbar-button--subtle character-spellbook__description-button"
          type="button"
          data-action="open-character-spellbook-ability-description-dialog"
          data-character-spellbook-ability-row-id="${escapeHtml(row.id)}"
        >
          Editar
        </button>
      </div>
      <label class="character-spellbook__ability-field">
        <input
          class="filter-input character-spellbook__input"
          type="number"
          inputmode="numeric"
          min="0"
          value="${escapeHtml(String(row.uses ?? 0))}"
          data-character-spellbook-ability-field="uses"
          data-character-spellbook-ability-row="${escapeHtml(row.id)}"
        />
      </label>
      <button
        class="toolbar-button toolbar-button--subtle-danger character-spellbook__remove"
        type="button"
        data-action="remove-character-spellbook-ability-row"
        data-character-spellbook-ability-row-id="${escapeHtml(row.id)}"
        aria-label="Quitar ${escapeHtml(row.name || "habilidad")}"
      >
        Quitar
      </button>
    </div>
  `;
}

function renderCharacterSpellbookAbilityPreview(row) {
  const descriptionHtml = escapeHtml(cleanText(row.description)).replaceAll("\n", "<br />");
  const previewLabel = isEnglishInterface() ? "ABILITIES" : "Habilidad";
  const unnamedLabel = isEnglishInterface() ? "Unnamed ability" : "Habilidad sin nombre";

  return `
    <div class="character-spellbook__preview character-spellbook__preview--ability" role="tooltip">
      <div class="character-spellbook__preview-card character-spellbook__preview-card--ability">
        <div class="character-ability-preview">
          <p class="eyebrow">${escapeHtml(previewLabel)}</p>
          <h3>${escapeHtml(row.name || unnamedLabel)}</h3>
          <p>${descriptionHtml}</p>
        </div>
      </div>
    </div>
  `;
}

function renderCharacterSkillSection(character) {
  const isExpanded = state.characterSkillsExpanded;
  const campaignMasteriesTitle = isEnglishInterface() ? "Campaign Masteries" : "Maestrias de campaña";
  const campaignMasteriesSummary = isEnglishInterface()
    ? "Summary view of current progress and level."
    : "Vista resumida de progreso y nivel actual.";
  const campaignMasteriesDetail = isEnglishInterface()
    ? "Set this character's level and progress in the shared masteries."
    : "Configura nivel y progreso de este personaje en las maestrias comunes.";

  return `
    <section class="detail-section character-skill-tracks">
      <div class="character-skill-tracks__header">
        <div class="character-skill-tracks__summary" data-action="toggle-character-skills-view">
          <h4>${escapeHtml(campaignMasteriesTitle)}</h4>
          <p>${escapeHtml(isExpanded ? campaignMasteriesDetail : campaignMasteriesSummary)}</p>
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
            : `<div class="empty-state empty-state--compact">No hay maestrias comunes configuradas.</div>`
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
    ? `Nv ${progress.level} · ${progress.label}`
    : "Nv 0 · Sin rango";

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
        <div class="character-inventory__heading character-section-toggle__click" data-action="toggle-character-inventory">
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
                <div class="character-rows-add">
                  <button class="toolbar-button toolbar-button--subtle character-rows-add__button" type="button" data-action="add-character-inventory-row">
                    +
                  </button>
                </div>
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
  const currencyDescription = getCharacterCurrencyDescription(currency);

  return `
    <label class="character-currency-pill character-currency-pill--${currency.icon}" title="${escapeHtml(currencyDescription)}">
      <span class="character-currency-pill__icon" aria-hidden="true"></span>
      <strong>${currency.shortLabel}</strong>
      <input
        class="character-currency-pill__input"
        type="number"
        inputmode="numeric"
        min="0"
        value="${escapeHtml(String(row?.quantity ?? 0))}"
        aria-label="${escapeHtml(currencyDescription)}"
        data-character-inventory-field="quantity"
        data-character-inventory-row="${escapeHtml(row?.id ?? "")}"
      />
    </label>
  `;
}

function getCharacterInventoryMatchedItemEntry(row) {
  return findCompendiumEntryByReference(state.items, {
    entryKey: row.itemKey,
    entryId: row.itemId,
    name: row.name,
    canonicalName: row.canonicalName,
    localizedName: row.localizedName
  });
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
  const duplicateCounts = buildSuggestionDuplicateCountMap(suggestions);
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
          placeholder="${isCurrencyRow ? "" : "Busca un objeto del catalogo"}"
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
                    ${escapeHtml(formatCompendiumSuggestionLabel(entry, duplicateCounts))}
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

function getCharacterCurrencyDescription(currency) {
  const normalizedName = cleanText(currency?.name).toUpperCase();
  const descriptions = isEnglishInterface()
    ? {
      COBRE: "Copper pieces",
      PLATA: "Silver pieces",
      ORO: "Gold pieces",
      ELECTRO: "Electrum pieces",
      PLATINO: "Platinum pieces"
    }
    : {
      COBRE: "Piezas de cobre",
      PLATA: "Piezas de plata",
      ORO: "Piezas de oro",
      ELECTRO: "Piezas de electro",
      PLATINO: "Piezas de platino"
    };

  return descriptions[normalizedName] || cleanText(currency?.name);
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

function renderCharacterClassSection(character) {
  const isMulticlass = character.isMulticlass === true;
  const visibleEntries = getCharacterVisibleClassEntries(character);

  return `
    <div class="character-class-stack">
      <label class="character-multiclass-toggle" aria-label="Activar multiclase">
        <input
          type="checkbox"
          data-character-multiclass
          ${isMulticlass ? "checked" : ""}
        />
        <span>Multiclase</span>
      </label>
      <div class="character-class-stack__rows">
        ${visibleEntries.map((entry, index) => renderCharacterClassRow(entry, index)).join("")}
      </div>
      ${
        isMulticlass
          ? `
            <div class="character-class-stack__actions">
              <button class="toolbar-button toolbar-button--subtle character-class-stack__add" type="button" data-action="add-character-class-row">
                +
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderCharacterClassRow(entry, index) {
  return `
    <div class="character-class-row">
      ${renderCharacterClassTextField(entry.id, "name", "Clase", entry.name, index === 0 ? "Guerrero" : "Mago")}
      ${renderCharacterClassTextField(entry.id, "subclassName", "Subclase", entry.subclassName, index === 0 ? "Campeon" : "Evocacion")}
      ${renderCharacterClassLevelField(entry.id, entry.level)}
    </div>
  `;
}

function renderCharacterClassTextField(rowId, key, label, value, placeholder = "") {
  const lengthClass = getCharacterTextLengthClass(value);

  return `
    <label class="toolbar-field character-identity-field">
      <span>${escapeHtml(label)}</span>
      <input
        class="filter-input character-identity-field__input ${lengthClass}"
        type="text"
        value="${escapeHtml(value ?? "")}"
        placeholder="${escapeHtml(placeholder)}"
        data-character-class-field="${escapeHtml(key)}"
        data-character-class-row="${escapeHtml(rowId)}"
      />
    </label>
  `;
}

function renderCharacterClassLevelField(rowId, value) {
  return `
    <label class="toolbar-field character-identity-field character-identity-field--level">
      <span>Nivel</span>
      <input
        class="filter-input character-identity-field__input character-identity-field__input--sm"
        type="number"
        inputmode="numeric"
        min="0"
        max="20"
        value="${escapeHtml(String(value ?? 0))}"
        data-character-class-field="level"
        data-character-class-row="${escapeHtml(rowId)}"
      />
    </label>
  `;
}

function getCharacterInventorySuggestions(rowId) {
  const character = getActiveCharacter();
  const row = character?.inventory.find((entry) => entry.id === rowId);
  const query = normalizeSearchText(row?.name);

  if (!query || state.itemStatus !== "ready" || isCharacterCurrencyRow(row?.name)) {
    return [];
  }

  return state.items
    .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }))
    .slice(0, 12);
}

function renderCharacterTextField(key, label, value, placeholder = "", options = {}) {
  const compactClass = options.compact ? " character-identity-field--compact" : "";
  const shortClass = options.short ? " character-identity-field--short" : "";
  const lengthClass = getCharacterTextLengthClass(value);

  return `
    <label class="toolbar-field character-identity-field${compactClass}${shortClass}">
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

function renderCharacterNpcField(character) {
  return `
    <label class="character-npc-toggle" aria-label="Marcar personaje como NPC">
      <input
        type="checkbox"
        data-character-field="isNpc"
        ${isNpcCharacter(character) ? "checked" : ""}
      />
      <span>NPC</span>
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

function getVisibleCombatants() {
  const combatants = Array.isArray(state.combatants) ? state.combatants.filter(Boolean) : [];

  return [...combatants]
    .filter(matchesFilters)
    .filter(matchesCombatSearch)
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

function renderCharacterExperienceBar(character, options = {}) {
  const progress = getCharacterExperienceProgress(character);
  const fillStyle = `--xp-fill: ${progress.progressPercent.toFixed(2)}%`;
  const baseClassName = [
    "character-experience",
    options.compact ? "character-experience--compact" : "",
    options.combatCompact ? "character-experience--combat-compact" : ""
  ].filter(Boolean).join(" ");
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

  const levelUpDisabled = getExperiencePointsToNextLevel(character) <= 0;

  return `
    <section class="${baseClassName}" style="${fillStyle}" aria-label="Progreso de experiencia de ${escapeHtml(character.name || "personaje")}">
      <div class="character-experience__fields">
        <label class="character-experience__field character-experience__field--level">
          <span>LVL</span>
          <input
            class="character-experience__input"
            type="number"
            inputmode="numeric"
            value="${escapeHtml(String(progress.level))}"
            aria-label="LVL"
            readonly
          />
        </label>
        <button
          class="toolbar-button toolbar-button--combat character-experience__level-up"
          type="button"
          data-action="award-character-level-up"
          data-character-id="${escapeHtml(character.id)}"
          ${levelUpDisabled ? "disabled" : ""}
        >
          LVL UP !
        </button>
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

function getCharacterXpDraftValue(characterId) {
  return state.characterXpAwardDrafts?.[characterId] ?? "";
}

function getExperiencePointsToNextLevel(character) {
  const progress = getCharacterExperienceProgress(character);

  if (progress.isMaxLevel) {
    return 0;
  }

  return Math.max(0, progress.requiredExperiencePoints - progress.levelExperiencePoints);
}

function renderCharacterExperienceControls(character, options = {}) {
  if (!character?.id) {
    return "";
  }

  const compact = options.compact === true;
  const combatInline = options.combatInline === true;
  const npcOnly = options.npcOnly === true;
  const sheetLayout = options.sheetLayout === true;
  const draftValue = getCharacterXpDraftValue(character.id);
  const xpToNextLevel = getExperiencePointsToNextLevel(character);
  const levelUpDisabled = xpToNextLevel <= 0;
  const levelUpLabel = combatInline ? "LVL UP" : "LVL UP !";
  const controlClassName = [
    "character-xp-controls",
    compact ? "character-xp-controls--compact" : "",
    combatInline ? "character-xp-controls--combat-inline" : "",
    npcOnly ? "character-xp-controls--npc" : ""
  ].filter(Boolean).join(" ");

  if (npcOnly) {
    return `
      <div class="${controlClassName}">
        <label class="character-experience__field character-experience__field--level character-xp-controls__level-box">
          <span>LVL</span>
          <input
            class="character-experience__input"
            type="number"
            inputmode="numeric"
            value="${escapeHtml(String(normalizeStoredCharacterLevel(character.level)))}"
            aria-label="LVL"
            readonly
          />
        </label>
        <button
          class="toolbar-button toolbar-button--combat character-xp-controls__level-up"
          type="button"
          data-action="award-character-level-up"
          data-character-id="${escapeHtml(character.id)}"
          ${levelUpDisabled ? "disabled" : ""}
        >
          ${levelUpLabel}
        </button>
      </div>
    `;
  }

  if (sheetLayout) {
    return `
      <div class="${controlClassName} character-xp-controls--sheet">
        <input
          class="cell-input character-xp-controls__input"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          value="${escapeHtml(String(draftValue))}"
          placeholder="XP"
          data-character-xp-draft="${escapeHtml(character.id)}"
          aria-label="${escapeHtml(t("xp_adjust_input_aria"))}"
        />
        <button
          class="toolbar-button toolbar-button--subtle character-xp-controls__button"
          type="button"
          data-action="award-character-xp"
          data-character-id="${escapeHtml(character.id)}"
          aria-label="${escapeHtml(t("xp_adjust_add_aria"))}"
        >
          <span class="character-xp-controls__plus" aria-hidden="true">+</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="${controlClassName}">
      <input
        class="cell-input character-xp-controls__input"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        value="${escapeHtml(String(draftValue))}"
        placeholder="XP"
        data-character-xp-draft="${escapeHtml(character.id)}"
        aria-label="${escapeHtml(t("xp_adjust_input_aria"))}"
      />
      <button
        class="toolbar-button toolbar-button--subtle character-xp-controls__button"
        type="button"
        data-action="award-character-xp"
        data-character-id="${escapeHtml(character.id)}"
        aria-label="${escapeHtml(t("xp_adjust_add_aria"))}"
      >
        <span class="character-xp-controls__plus" aria-hidden="true">+</span>
      </button>
      <button
        class="toolbar-button toolbar-button--combat character-xp-controls__level-up"
        type="button"
        data-action="award-character-level-up"
        data-character-id="${escapeHtml(character.id)}"
        ${levelUpDisabled ? "disabled" : ""}
      >
        ${levelUpLabel}
      </button>
    </div>
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
  const query = normalizeSearchText(combatant.nombre);

  if (!query) {
    return [];
  }

  const bestiarySuggestions = state.bestiaryStatus === "ready"
    ? state.bestiary
      .filter((entry) => getBestiaryEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })
        || left.source.localeCompare(right.source, "es", { sensitivity: "base" }))
      .slice(0, 7)
      .map((entry) => ({
        id: entry.id,
        kind: "bestiary",
        name: entry.name,
        badge: entry.source || "?",
        subtitle: `CR ${formatCrNumber(entry.crBaseValue)} | ${entry.type || "Sin tipo"}`
      }))
    : [];

  const characterSuggestions = state.characters
    .filter((character) => normalizeSearchText(character.name).includes(query))
    .sort((left, right) => cleanText(left.name).localeCompare(cleanText(right.name), "es", { sensitivity: "base" }))
    .slice(0, 5)
    .map((character) => ({
      id: character.id,
      kind: "character",
      name: character.name,
      badge: "PJ",
      subtitle: [
        character.className,
        character.level ? `Nivel ${character.level}` : "",
        isNpcCharacter(character) ? "NPC" : character.playerName
      ].filter(Boolean).join(" | ") || "Personaje"
    }));

  return [...characterSuggestions, ...bestiarySuggestions].slice(0, 10);
}

function getCombatantBestiaryEntry(combatant) {
  const name = cleanText(combatant.nombre);

  if (!name) {
    return null;
  }

  const lookups = ensureCombatLookupIndexes();
  const source = cleanText(combatant.source);
  const identityKeys = [combatant.entryKey, combatant.entryId]
    .map((value) => cleanText(value))
    .filter(Boolean);

  for (const identityKey of identityKeys) {
    const match = (lookups.bestiaryByIdentity.get(identityKey) ?? [])
      .find((entry) => isSameCompendiumSource(entry, source));

    if (match) {
      return match;
    }
  }

  const names = getEncounterRowNameCandidates({
    name,
    canonicalName: combatant.canonicalName,
    localizedName: combatant.localizedName
  });

  for (const entryName of names) {
    const match = (lookups.bestiaryByAlias.get(entryName) ?? [])
      .find((entry) => isSameCompendiumSource(entry, source));

    if (match) {
      return match;
    }
  }

  return null;
}

function getCombatantTokenUrl(
  combatant,
  linkedCharacter = getLinkedCharacterForCombatant(combatant),
  bestiaryEntry = getCombatantBestiaryEntry(combatant)
) {
  return cleanText(linkedCharacter?.tokenUrl)
    || cleanText(bestiaryEntry?.tokenUrl)
    || cleanText(combatant.tokenUrl);
}

function getCombatantInitials(combatant) {
  const words = cleanText(combatant.nombre).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getCombatantSourceOptions(combatant) {
  const names = getEncounterRowNameCandidates({
    name: combatant.nombre,
    canonicalName: combatant.canonicalName,
    localizedName: combatant.localizedName
  });

  if (names.length === 0 || state.bestiaryStatus !== "ready") {
    return [];
  }

  const lookups = ensureCombatLookupIndexes();
  const matches = [];
  const seenEntries = new Set();

  names.forEach((name) => {
    (lookups.bestiaryByAlias.get(name) ?? []).forEach((entry) => {
      if (!seenEntries.has(entry)) {
        seenEntries.add(entry);
        matches.push(entry);
      }
    });
  });

  return matches.sort((left, right) => {
      const leftSource = getBestiarySourceFullName(left.source) || cleanText(left.source);
      const rightSource = getBestiarySourceFullName(right.source) || cleanText(right.source);
      return leftSource.localeCompare(rightSource, "es", { sensitivity: "base" });
    });
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
    const filterValues = Array.isArray(state.filters?.[column.key])
      ? state.filters[column.key].map((value) => cleanText(value)).filter(Boolean)
      : [];

    if (filterValues.length === 0) {
      return true;
    }

    return filterValues.includes(getCombatFilterValue(combatant, column.key));
  });
}

function matchesCombatSearch(combatant) {
  const search = normalizeSearchText(state.combatSearchQuery);

  if (!search) {
    return true;
  }

  const statusText = getCombatantStatusNames(combatant).join(" ");
  const haystack = normalizeSearchText([
    cleanText(combatant?.nombre),
    cleanText(combatant?.tag),
    statusText,
    cleanText(combatant?.ubicacion)
  ].join(" "));

  return haystack.includes(search);
}

function getCombatFilterValue(combatant, columnKey) {
  if (columnKey === "pgMax") {
    return String(combatant.pgMax ?? "");
  }

  if (columnKey === "estados") {
    return getCombatantStatusNames(combatant).join(", ");
  }

  if (columnKey === "tag") {
    return cleanText(combatant.tag);
  }

  return cleanText(getCombatantColumnValue(combatant, columnKey));
}

function getCombatFilterOptions(columnKey, searchQuery = "") {
  const normalizedQuery = cleanText(searchQuery).toLowerCase();
  const uniqueValues = new Set();

  state.combatants.forEach((combatant) => {
    const value = getCombatFilterValue(combatant, columnKey);

    if (value) {
      uniqueValues.add(value);
    }
  });

  return [...uniqueValues]
    .filter((value) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => left.localeCompare(right, "es", { numeric: true, sensitivity: "base" }));
}

function toggleCombatFilterValue(filterKey, value, checked) {
  const normalizedKey = cleanText(filterKey);
  const normalizedValue = cleanText(value);

  if (!normalizedKey || !normalizedValue) {
    return;
  }

  const currentValues = Array.isArray(state.filters?.[normalizedKey]) ? state.filters[normalizedKey] : [];
  const nextValues = checked
    ? [...new Set([...currentValues, normalizedValue])]
    : currentValues.filter((entry) => cleanText(entry) !== normalizedValue);

  state.filters[normalizedKey] = nextValues;
}

function matchesBestiaryFilters(entry, overrides = {}) {
  const filters = {
    ...state.bestiaryFilters,
    ...overrides
  };
  const query = normalizeSearchText(filters.query);
  const source = Array.isArray(filters.source) ? filters.source : [];
  const type = Array.isArray(filters.type) ? filters.type : [];
  const environment = Array.isArray(filters.environment) ? filters.environment : [];
  const crBase = Array.isArray(filters.crBase) ? filters.crBase : [];

  if (query && !getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query))) {
    return false;
  }

  if (source.length > 0 && !source.includes(entry.source)) {
    return false;
  }

  if (type.length > 0 && !type.some((value) => getBestiaryTypeFilterValue(value) === getBestiaryTypeFilterValue(entry.type))) {
    return false;
  }

  if (environment.length > 0 && !environment.some((value) => entry.environmentTokens.some((token) => getBestiaryEnvironmentFilterValue(token) === getBestiaryEnvironmentFilterValue(value)))) {
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
  const query = normalizeSearchText(filters.query);
  const source = Array.isArray(filters.source) ? filters.source : [];
  const rarity = Array.isArray(filters.rarity) ? filters.rarity : [];
  const type = Array.isArray(filters.type) ? filters.type : [];
  const attunement = cleanText(filters.attunement);

  if (query && !getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query))) {
    return false;
  }

  if (source.length > 0 && !source.includes(entry.source)) {
    return false;
  }

  if (rarity.length > 0 && !rarity.some((value) => normalizeItemRarityFilterValue(value) === normalizeItemRarityFilterValue(entry.rarityLabel))) {
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
  const query = normalizeSearchText(filters.query);
  const source = Array.isArray(filters.source) ? filters.source : [];
  const level = Array.isArray(filters.level) ? filters.level : [];
  const school = Array.isArray(filters.school) ? filters.school : [];
  const spellClass = Array.isArray(filters.class) ? filters.class : [];
  const castingTime = Array.isArray(filters.castingTime) ? filters.castingTime : [];
  const concentration = cleanText(filters.concentration);

  if (query && !getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query))) {
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

  if (castingTime.length > 0 && !castingTime.includes(entry.castingTime)) {
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
  const leftValue = getCombatantColumnValue(left, state.sort.key);
  const rightValue = getCombatantColumnValue(right, state.sort.key);

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
  const isResourceField = ["pgAct", "pgMax", "pgTemp", "necrotic"].includes(key);

  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    const column = columns.find((item) => item.key === key) ?? (key === "ca" || key === "hitDice" ? { key, type: "number" } : null);
    const nextValue = key === "ca"
      ? normalizeCombatantArmorClassInput(rawValue, isCombatantShieldEquipped(combatant), normalize)
      : getNormalizedValue(column, rawValue, normalize);
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

    if (!normalize && isResourceField) {
      return updatedCombatant;
    }

    return normalizeCombatant(updatedCombatant, key);
  });

  if (isResourceField && normalize) {
    syncDownedAllyUnconsciousStatus(previousCombatants);
    distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
    applyReviveExhaustion(previousCombatants);
    notifyCombatantDeaths(previousCombatants);
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
  state.selectedCharacterIds = new Set([character.id]);
  saveCharacters();
}

function createDefaultCharacter(overrides = {}) {
  const nextNumber = state.characters.length + 1;
  const maxHp = normalizeStoredNonNegativeNumber(overrides.maxHp ?? 10);
  const defaultPrimaryClassEntry = createDefaultCharacterClassEntry({ level: 1 });

  return normalizeStoredCharacter({
    id: createStableId("character"),
    name: `Personaje ${nextNumber}`,
    playerName: "",
    isNpc: false,
    className: defaultPrimaryClassEntry.name,
    subclassName: defaultPrimaryClassEntry.subclassName,
    isMulticlass: false,
    classEntries: [defaultPrimaryClassEntry],
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
    trapPerception: 0,
    conditions: "",
    stand: "",
    notes: "",
    skillProgress: getDefaultCharacterSkillProgress(),
    spellsOpen: false,
    spells: [],
    spellAttackModifier: "",
    spellSaveDc: "",
    spellSlotLevelsVisible: 1,
    spellSlots: getDefaultCharacterSpellSlots(),
    spellbookAbilities: [createBlankCharacterSpellbookAbilityRow()],
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

function selectCharacter(characterId, options = {}) {
  if (!state.characters.some((character) => character.id === characterId)) {
    return;
  }

  const toggleSelection = options.toggleSelection === true;
  const nextSelectedCharacterIds = new Set(state.selectedCharacterIds);

  if (toggleSelection) {
    if (nextSelectedCharacterIds.has(characterId)) {
      nextSelectedCharacterIds.delete(characterId);
    } else {
      nextSelectedCharacterIds.add(characterId);
    }

    if (nextSelectedCharacterIds.size === 0) {
      nextSelectedCharacterIds.add(characterId);
    }
  } else {
    nextSelectedCharacterIds.clear();
    nextSelectedCharacterIds.add(characterId);
  }

  state.selectedCharacterIds = nextSelectedCharacterIds;
  state.activeCharacterId = characterId;
  state.activeCharacterInventoryRowId = "";
  state.showCharacterInventorySuggestions = false;
  state.activeCharacterSpellRowId = "";
  state.showCharacterSpellSuggestions = false;
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
  state.selectedCharacterIds = new Set([copy.id]);
  saveCharacters();
}

function deleteActiveCharacter() {
  const character = getActiveCharacter();

  if (!character) {
    return;
  }

  state.characters = state.characters.filter((item) => item.id !== character.id);
  state.activeCharacterId = state.characters[0]?.id ?? "";
  state.selectedCharacterIds = new Set(state.activeCharacterId ? [state.activeCharacterId] : []);
  saveCharacters();
}

function updateCharacterField(key, rawValue, normalize = true) {
  updateCharacterFieldForId(state.activeCharacterId, key, rawValue, normalize);
}

function updateCharacterFieldForId(characterId, key, rawValue, normalize = true) {
  const numberFields = new Set(["level", "experiencePoints", "armorClass", "maxHp", "currentHp", "tempHp", "initiativeBonus", "trapPerception", "spellAttackModifier", "spellSaveDc"]);

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

  if (key === "level") {
    syncLinkedCombatantsHitDice(characterId);
  }
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

  const levelUpNotifications = [];
  const xpNotifications = [];
  const pendingMulticlassLevelUps = [];

  state.characters = state.characters.map((character) => {
    const gain = gainByCharacterId.get(character.id);

    if (!gain) {
      return character;
    }

    const currentProgress = getCharacterExperienceProgress(character);
    const nextProgress = getCharacterProgressStateFromTotalExperience(currentProgress.totalExperiencePoints + gain);
    const nextClassEntries = getCharacterClassEntriesForTargetLevel(character, nextProgress.level);
    const characterName = cleanText(character.name) || "Personaje";

    xpNotifications.push({
      title: "Experiencia ganada",
      message: `${characterName} gana ${gain} XP y suma ${nextProgress.totalExperiencePoints} XP en total.`,
      tone: "xp",
      imageUrl: cleanText(character.tokenUrl)
    });

    if (nextProgress.level > toNumber(character.level)) {
      const levelGain = nextProgress.level - toNumber(character.level);

      levelUpNotifications.push({
        title: "Subida de nivel",
        message: `${characterName} ha alcanzado el nivel ${nextProgress.level}.`,
        tone: "success",
        imageUrl: cleanText(character.tokenUrl)
      });

      if (character.isMulticlass === true && getCharacterVisibleClassEntries(character).length > 1) {
        pendingMulticlassLevelUps.push(createPendingMulticlassLevelUpPrompt(character, levelGain));
      }
    }

    return normalizeStoredCharacter({
      ...character,
      classEntries: nextClassEntries,
      experiencePoints: nextProgress.experiencePoints,
      totalExperiencePoints: nextProgress.totalExperiencePoints
    });
  });

  uniqueCharacterIds.forEach((characterId) => syncLinkedCombatantsHitDice(characterId));
  xpNotifications.forEach(pushNotification);
  levelUpNotifications.forEach(pushNotification);

  if (levelUpNotifications.length > 0) {
    playInterfaceSound(levelUpSoundUrl, 0.78, "levelUp");
  }

  if (pendingMulticlassLevelUps.length > 0) {
    state.multiclassLevelUpQueue = [...state.multiclassLevelUpQueue, ...pendingMulticlassLevelUps];
  }

  saveCharacters();
}

function awardExperienceToCharacter(characterId, rawAmount) {
  const normalizedCharacterId = cleanText(characterId);
  const amount = Math.max(0, Math.floor(toNumber(rawAmount) || 0));

  if (!normalizedCharacterId || amount <= 0) {
    return;
  }

  addExperienceToCharacters([normalizedCharacterId], amount);
  state.characterXpAwardDrafts = {
    ...state.characterXpAwardDrafts,
    [normalizedCharacterId]: ""
  };
}

function awardExperienceToCharacterLevelUp(characterId) {
  const normalizedCharacterId = cleanText(characterId);
  const character = state.characters.find((entry) => entry.id === normalizedCharacterId) ?? null;

  if (!character) {
    return;
  }

  const amount = getExperiencePointsToNextLevel(character);

  if (amount <= 0) {
    return;
  }

  addExperienceToCharacters([normalizedCharacterId], amount);
}

function toggleCombatantShield(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => combatant.id === normalizedCombatantId
    ? normalizeCombatant({
      ...combatant,
      shieldEquipped: !isCombatantShieldEquipped(combatant)
    })
    : combatant);
}

function restoreCombatantMaxHp(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => combatant.id === normalizedCombatantId
    ? normalizeCombatant({
      ...combatant,
      necrotic: 0
    }, "necrotic")
    : combatant);
}

function getCharacterClassEntriesForTargetLevel(character, targetLevel) {
  const nextLevel = Math.max(1, Math.floor(toNumber(targetLevel) || 1));
  const isMulticlass = character?.isMulticlass === true;
  const classEntries = ensureCharacterClassEntryCount(
    normalizeStoredCharacterClassEntries(character?.classEntries, character),
    isMulticlass ? 2 : 1
  );
  const currentLevel = getCharacterTotalLevelFromClassEntries(classEntries, isMulticlass);
  const primaryEntry = classEntries[0] ?? createDefaultCharacterClassEntry({ level: 1 });
  const nextPrimaryLevel = Math.max(1, Math.floor(toNumber(primaryEntry.level) || 1) + (nextLevel - currentLevel));

  return [
    {
      ...primaryEntry,
      level: nextPrimaryLevel
    },
    ...classEntries.slice(1)
  ];
}

function createPendingMulticlassLevelUpPrompt(character, levelGain = 1) {
  const classEntries = getCharacterVisibleClassEntries(character);
  const primaryEntry = classEntries[0] ?? createDefaultCharacterClassEntry({ level: 1 });

  return {
    characterId: character.id,
    primaryClassEntryId: primaryEntry.id,
    remainingChoices: Math.max(1, Math.floor(toNumber(levelGain) || 1)),
    totalChoices: Math.max(1, Math.floor(toNumber(levelGain) || 1))
  };
}

function getActiveMulticlassLevelUpPrompt() {
  return Array.isArray(state.multiclassLevelUpQueue) ? state.multiclassLevelUpQueue[0] ?? null : null;
}

function renderMulticlassLevelUpChoiceButton(character, pendingLevelUp, classEntry) {
  const className = cleanText(classEntry.name) || "Clase sin nombre";
  const subclassName = cleanText(classEntry.subclassName);
  const level = normalizeStoredCharacterClassLevel(classEntry.level);
  const choiceLabel = subclassName ? `${className} (${subclassName})` : className;

  return `
    <button
      class="toolbar-button toolbar-button--combat multiclass-levelup-dialog__choice"
      type="button"
      data-action="choose-multiclass-level-up-class"
      data-character-id="${escapeHtml(character.id)}"
      data-character-class-entry-id="${escapeHtml(classEntry.id)}"
    >
      <strong>${escapeHtml(choiceLabel)}</strong>
      <span>Nivel ${escapeHtml(String(level))}</span>
    </button>
  `;
}

function applyMulticlassLevelUpChoice(characterId, classEntryId) {
  const normalizedCharacterId = cleanText(characterId);
  const normalizedClassEntryId = cleanText(classEntryId);
  const pendingLevelUp = getActiveMulticlassLevelUpPrompt();

  if (!pendingLevelUp || pendingLevelUp.characterId !== normalizedCharacterId || !normalizedClassEntryId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== normalizedCharacterId) {
      return character;
    }

    if (normalizedClassEntryId === pendingLevelUp.primaryClassEntryId) {
      return character;
    }

    const classEntries = ensureCharacterClassEntryCount(character.classEntries, character.isMulticlass ? 2 : 1)
      .map((entry) => ({ ...entry }));
    const primaryEntry = classEntries.find((entry) => entry.id === pendingLevelUp.primaryClassEntryId);
    const targetEntry = classEntries.find((entry) => entry.id === normalizedClassEntryId);

    if (!primaryEntry || !targetEntry) {
      return character;
    }

    primaryEntry.level = Math.max(0, normalizeStoredCharacterClassLevel(primaryEntry.level) - 1);
    targetEntry.level = Math.min(20, normalizeStoredCharacterClassLevel(targetEntry.level) + 1);

    return normalizeStoredCharacter({
      ...character,
      classEntries
    });
  });

  state.multiclassLevelUpQueue = state.multiclassLevelUpQueue.flatMap((entry, index) => {
    if (index !== 0) {
      return [entry];
    }

    const nextRemainingChoices = Math.max(0, entry.remainingChoices - 1);

    if (nextRemainingChoices <= 0) {
      return [];
    }

    return [{
      ...entry,
      remainingChoices: nextRemainingChoices
    }];
  });

  syncLinkedCombatantsHitDice(normalizedCharacterId);
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
    name: "Nueva maestria",
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

function toggleCharacterMulticlass(isChecked) {
  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    return normalizeStoredCharacter({
      ...character,
      isMulticlass: isChecked,
      classEntries: ensureCharacterClassEntryCount(character.classEntries, isChecked ? 2 : 1)
    });
  });
}

function addCharacterClassRow() {
  const row = createDefaultCharacterClassEntry({ level: 0 });

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      isMulticlass: true,
      classEntries: [...ensureCharacterClassEntryCount(character.classEntries, 2), row]
    })
    : character);

  return row.id;
}

function updateCharacterClassEntry(rowId, key, rawValue, normalize = true) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const classEntries = ensureCharacterClassEntryCount(character.classEntries, character.isMulticlass ? 2 : 1)
      .map((entry) => entry.id === normalizedRowId
        ? normalizeStoredCharacterClassEntry({
          ...entry,
          [key]: key === "level" && normalize
            ? normalizeStoredCharacterClassLevel(rawValue)
            : rawValue
        })
        : entry)
      .filter(Boolean);

    return normalizeStoredCharacter({
      ...character,
      classEntries
    });
  });
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

function toggleCharacterSpellbookSection() {
  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      spellsOpen: character.spellsOpen !== true
    })
    : character);
}

function addCharacterSpellSlotLevel() {
  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const nextVisibleLevels = Math.min(9, Math.max(1, toNumber(character.spellSlotLevelsVisible) || 1) + 1);
    return normalizeStoredCharacter({
      ...character,
      spellsOpen: true,
      spellSlotLevelsVisible: nextVisibleLevels,
      spellSlots: ensureCharacterSpellSlotLevels(character.spellSlots, nextVisibleLevels)
    });
  });
}

function updateCharacterSpellSlot(level, rawValue, normalize = true) {
  const normalizedLevel = Math.max(1, Math.min(9, Math.floor(toNumber(level) || 1)));

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const spellSlots = ensureCharacterSpellSlotLevels(character.spellSlots, Math.max(character.spellSlotLevelsVisible ?? 1, normalizedLevel))
      .map((entry) => entry.level === normalizedLevel
        ? normalizeStoredCharacterSpellSlotRow({
          ...entry,
          slots: normalize ? normalizeStoredNonNegativeNumber(rawValue) : rawValue
        })
        : entry);

    return normalizeStoredCharacter({
      ...character,
      spellSlots
    });
  });
}

function addCharacterSpellRow(overrides = {}) {
  const row = createBlankCharacterSpellRow(overrides);

  if (!row) {
    return "";
  }

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      spellsOpen: true,
      spells: [...character.spells, row]
    })
    : character);
  state.activeCharacterSpellRowId = row.id;
  state.showCharacterSpellSuggestions = false;
  return row.id;
}

function addCharacterSpellbookAbilityRow(overrides = {}) {
  const row = createBlankCharacterSpellbookAbilityRow(overrides);

  if (!row) {
    return "";
  }

  state.characters = state.characters.map((character) => character.id === state.activeCharacterId
    ? normalizeStoredCharacter({
      ...character,
      spellsOpen: true,
      spellbookAbilities: [...character.spellbookAbilities, row]
    })
    : character);
  return row.id;
}

function openCharacterSpellbookAbilityDescriptionDialog(rowId) {
  const normalizedRowId = cleanText(rowId);
  const character = getActiveCharacter();
  const row = character?.spellbookAbilities?.find((entry) => entry.id === normalizedRowId);

  if (!normalizedRowId || !row) {
    return;
  }

  state.characterSpellbookAbilityDescriptionDialogOpen = true;
  state.characterSpellbookAbilityDescriptionDialogRowId = normalizedRowId;
  state.characterSpellbookAbilityDescriptionDialogValue = cleanText(row.description);
}

function closeCharacterSpellbookAbilityDescriptionDialog() {
  state.characterSpellbookAbilityDescriptionDialogOpen = false;
  state.characterSpellbookAbilityDescriptionDialogRowId = "";
  state.characterSpellbookAbilityDescriptionDialogValue = "";
}

function saveCharacterSpellbookAbilityDescriptionDialog() {
  const rowId = cleanText(state.characterSpellbookAbilityDescriptionDialogRowId);

  if (!rowId) {
    closeCharacterSpellbookAbilityDescriptionDialog();
    return;
  }

  updateCharacterSpellbookAbilityRow(
    rowId,
    "description",
    state.characterSpellbookAbilityDescriptionDialogValue,
    true
  );
  closeCharacterSpellbookAbilityDescriptionDialog();
}

function removeCharacterSpellRow(rowId) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const remainingRows = character.spells.filter((row) => row.id !== normalizedRowId);

    return normalizeStoredCharacter({
      ...character,
      spells: remainingRows.length > 0 ? remainingRows : [createBlankCharacterSpellRow()]
    });
  });

  if (state.activeCharacterSpellRowId === normalizedRowId) {
    state.activeCharacterSpellRowId = "";
    state.showCharacterSpellSuggestions = false;
  }
}

function removeCharacterSpellbookAbilityRow(rowId) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const remainingRows = character.spellbookAbilities.filter((row) => row.id !== normalizedRowId);

    return normalizeStoredCharacter({
      ...character,
      spellbookAbilities: remainingRows.length > 0 ? remainingRows : [createBlankCharacterSpellbookAbilityRow()]
    });
  });
}

function updateCharacterSpellRow(rowId, key, rawValue, normalize = true) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const spells = character.spells.map((row) => {
      if (row.id !== normalizedRowId) {
        return row;
      }

      const nextRow = {
        ...row,
        [key]: key === "prepared"
          ? rawValue === true
          : rawValue
      };

      if (key === "name") {
        const matchedSpell = getArcanumEntryByName(rawValue);
        nextRow.spellId = matchedSpell?.id ?? "";
        nextRow.spellKey = matchedSpell ? getCompendiumEntryIdentityKey(matchedSpell) : "";
        nextRow.canonicalName = matchedSpell?.canonicalName ?? "";
        nextRow.localizedName = matchedSpell?.localizedName ?? "";
        nextRow.level = normalizeCharacterSpellLevelLabel(matchedSpell?.levelShort ?? cleanText(nextRow.level));
      }

      if (key === "level" && normalize) {
        nextRow.level = normalizeCharacterSpellLevelLabel(rawValue);
      }

      return normalizeStoredCharacterSpellRow(nextRow);
    });

    return normalizeStoredCharacter({
      ...character,
      spells
    });
  });
}

function updateCharacterSpellbookAbilityRow(rowId, key, rawValue, normalize = true) {
  const normalizedRowId = cleanText(rowId);

  if (!normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const spellbookAbilities = character.spellbookAbilities.map((row) => {
      if (row.id !== normalizedRowId) {
        return row;
      }

      const nextRow = {
        ...row,
        [key]: key === "uses" && normalize
          ? normalizeStoredNonNegativeNumber(rawValue)
          : rawValue
      };

      return normalizeStoredCharacterSpellbookAbilityRow(nextRow);
    });

    return normalizeStoredCharacter({
      ...character,
      spellbookAbilities
    });
  });
}

function selectCharacterSpellSuggestion(rowId, arcanumEntryId) {
  const normalizedRowId = cleanText(rowId);
  const spellEntry = state.arcanum.find((entry) => entry.id === cleanText(arcanumEntryId));

  if (!normalizedRowId || !spellEntry) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    return normalizeStoredCharacter({
      ...character,
      spells: character.spells.map((row) => row.id === normalizedRowId
        ? normalizeStoredCharacterSpellRow({
          ...row,
          spellId: spellEntry.id,
          spellKey: getCompendiumEntryIdentityKey(spellEntry),
          name: spellEntry.name,
          canonicalName: spellEntry.canonicalName || spellEntry.name,
          localizedName: spellEntry.localizedName || (spellEntry.canonicalName && spellEntry.canonicalName !== spellEntry.name ? spellEntry.name : ""),
          level: normalizeCharacterSpellLevelLabel(spellEntry.levelShort)
        })
        : row)
    });
  });

  state.activeCharacterSpellRowId = normalizedRowId;
  state.showCharacterSpellSuggestions = false;
}

function addCharacterInventoryRow(overrides = {}) {
  const row = createBlankCharacterInventoryRow({
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
  return [
    ...characterCurrencyRows.map((currency) => normalizeStoredCharacterInventoryRow({
      id: createStableId("character-item"),
      name: currency.name,
      quantity: 0
    })).filter(Boolean),
    createBlankCharacterInventoryRow()
  ].filter(Boolean);
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

  const matchedItem = getCharacterInventoryMatchedItemEntry(row);

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

  state.characters = state.characters.map((character) => {
    if (character.id !== state.activeCharacterId) {
      return character;
    }

    const remainingInventory = character.inventory.filter((row) => row.id !== normalizedRowId);
    const remainingNonCurrencyRows = remainingInventory.filter((row) => !isCharacterCurrencyRow(row.name));

    return normalizeStoredCharacter({
      ...character,
      inventory: remainingNonCurrencyRows.length > 0
        ? remainingInventory
        : [...remainingInventory, createBlankCharacterInventoryRow()]
    });
  });

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
        nextRow.itemKey = matchedItem ? getCompendiumEntryIdentityKey(matchedItem) : "";
        nextRow.canonicalName = matchedItem?.canonicalName ?? "";
        nextRow.localizedName = matchedItem?.localizedName ?? "";
        nextRow.size = matchedItem?.sizeLabel ?? inferItemSizeLabel(rawValue);
      }

      if (isCharacterCurrencyRow(nextRow.name)) {
        nextRow.itemId = "";
        nextRow.itemKey = "";
        nextRow.canonicalName = "";
        nextRow.localizedName = "";
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
          itemKey: getCompendiumEntryIdentityKey(itemEntry),
          name: itemEntry.name,
          canonicalName: itemEntry.canonicalName || itemEntry.name,
          localizedName: itemEntry.localizedName || (itemEntry.canonicalName && itemEntry.canonicalName !== itemEntry.name ? itemEntry.name : ""),
          size: itemEntry.sizeLabel
        })
        : row)
    });
  });

  state.activeCharacterInventoryRowId = normalizedRowId;
  state.showCharacterInventorySuggestions = false;
}

function reconcileCharactersWithCurrentCompendiumReferences(options = {}) {
  let changed = false;

  state.characters = state.characters.map((character) => {
    let characterChanged = false;
    const spells = character.spells.map((row) => {
      const spellEntry = getCharacterSpellMatchedEntry(row);

      if (!spellEntry) {
        return row;
      }

      const nextRow = normalizeStoredCharacterSpellRow({
        ...row,
        spellId: spellEntry.id,
        spellKey: getCompendiumEntryIdentityKey(spellEntry),
        name: spellEntry.name,
        canonicalName: spellEntry.canonicalName || spellEntry.name,
        localizedName: spellEntry.localizedName || (spellEntry.canonicalName && spellEntry.canonicalName !== spellEntry.name ? spellEntry.name : cleanText(row.localizedName)),
        level: normalizeCharacterSpellLevelLabel(spellEntry.levelShort)
      });

      if (JSON.stringify(nextRow) !== JSON.stringify(row)) {
        characterChanged = true;
      }

      return nextRow;
    });
    const inventory = character.inventory.map((row) => {
      if (isCharacterCurrencyRow(row.name)) {
        return row;
      }

      const itemEntry = getCharacterInventoryMatchedItemEntry(row);

      if (!itemEntry) {
        return row;
      }

      const nextRow = normalizeStoredCharacterInventoryRow({
        ...row,
        itemId: itemEntry.id,
        itemKey: getCompendiumEntryIdentityKey(itemEntry),
        name: itemEntry.name,
        canonicalName: itemEntry.canonicalName || itemEntry.name,
        localizedName: itemEntry.localizedName || (itemEntry.canonicalName && itemEntry.canonicalName !== itemEntry.name ? itemEntry.name : cleanText(row.localizedName)),
        size: itemEntry.sizeLabel
      });

      if (JSON.stringify(nextRow) !== JSON.stringify(row)) {
        characterChanged = true;
      }

      return nextRow;
    });

    if (!characterChanged) {
      return character;
    }

    changed = true;
    return normalizeStoredCharacter({
      ...character,
      spells,
      inventory
    });
  });

  if (changed && options.save !== false) {
    saveCharacters();
  }

  return changed;
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
  const characters = getSelectedCharactersForCombat();

  if (characters.length === 0) {
    return;
  }

  addCharactersToCombat(characters, {
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
  const existingCharacterIds = new Set(
    state.combatants.map((combatant) => cleanText(combatant.characterId)).filter(Boolean)
  );
  const seenCharacterIds = new Set();
  const validCharacters = characters
    .filter(Boolean)
    .filter((character) => {
      const characterId = cleanText(character.id);

      if (!characterId || existingCharacterIds.has(characterId) || seenCharacterIds.has(characterId)) {
        return false;
      }

      seenCharacterIds.add(characterId);
      return true;
    });

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

  validCharacters.forEach((character) => {
    pushNotification({
      title: "Personaje añadido",
      message: `${cleanText(character.name) || "Personaje"} se ha añadido a la tabla de combate.`,
      tone: "info",
      imageUrl: cleanText(character.tokenUrl)
    });
  });

  saveCombatTrackerState();
}

function openCombatantCharacter(characterId) {
  const normalizedCharacterId = cleanText(characterId);

  if (!normalizedCharacterId || !state.characters.some((character) => character.id === normalizedCharacterId)) {
    return;
  }

  selectCharacter(normalizedCharacterId);
  state.activeScreen = "initiative-board";
}

function getSelectedCharactersForCombat() {
  const selectedCharacters = state.characters.filter((character) => state.selectedCharacterIds.has(character.id));

  if (selectedCharacters.length > 0) {
    return selectedCharacters;
  }

  const activeCharacter = getActiveCharacter();
  return activeCharacter ? [activeCharacter] : [];
}

function isCharacterAlreadyInCombat(characterId) {
  const cleanCharacterId = cleanText(characterId);

  if (!cleanCharacterId) {
    return false;
  }

  return state.combatants.some((combatant) => cleanText(combatant.characterId) === cleanCharacterId);
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
    hitDice: Math.max(0, Math.floor(toNumber(character.level) || 0)),
    necrotic: 0,
    ca: character.armorClass,
    shieldEquipped: false,
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

function toggleExclusiveItemFilterValue(key, value) {
  const currentValues = Array.isArray(state.itemFilters[key]) ? state.itemFilters[key] : [];
  const nextValues = currentValues.length === 1 && currentValues[0] === value ? [] : [value];
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
    entryKey: entry.identityKey || entry.compositeKey || entry.id,
    name: entry.name,
    canonicalName: entry.canonicalName || entry.name,
    localizedName: entry.localizedName || (entry.canonicalName && entry.canonicalName !== entry.name ? entry.name : ""),
    source: entry.source,
    canonicalSource: entry.canonicalSource || entry.source,
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
  const matchingEntry = getEncounterSourceOptions(row)
    .find((entry) => cleanText(entry.source) === cleanText(source));

  if (!matchingEntry) {
    return {
      ...row,
      source
    };
  }

  return getEncounterRowWithBestiaryEntry(row, matchingEntry);
}

function getEncounterRowWithBestiaryEntry(row, entry) {
  return {
    ...row,
    entryId: entry.id,
    entryKey: entry.identityKey || entry.compositeKey || entry.id,
    name: entry.name,
    canonicalName: entry.canonicalName || entry.name,
    localizedName: entry.localizedName || (entry.canonicalName && entry.canonicalName !== entry.name ? entry.name : cleanText(row.localizedName)),
    source: entry.source,
    canonicalSource: entry.canonicalSource || entry.source,
    tokenUrl: entry.tokenUrl,
    hp: entry.hp,
    hpValue: entry.hpValue,
    ac: entry.ac,
    acValue: entry.acValue,
    crLabel: entry.crBaseLabel || entry.crLabel || row.crLabel,
    crValue: entry.crBaseValue
  };
}

function reconcileEncounterRowsWithCurrentBestiaryReferences(options = {}) {
  if (state.bestiaryStatus !== "ready" || !Array.isArray(state.bestiary) || state.bestiary.length === 0) {
    return false;
  }

  let changed = false;

  state.encounters = state.encounters.map((encounter) => {
    if (!Array.isArray(encounter.rows) || encounter.rows.length === 0) {
      return encounter;
    }

    let encounterChanged = false;
    const rows = encounter.rows.map((row) => {
      const entry = getEncounterRowBestiaryEntry(row);

      if (!entry) {
        return row;
      }

      const nextRow = getEncounterRowWithBestiaryEntry(row, entry);

      if (JSON.stringify(nextRow) !== JSON.stringify(row)) {
        encounterChanged = true;
        changed = true;
      }

      return nextRow;
    });

    return encounterChanged ? { ...encounter, rows } : encounter;
  });

  if (changed && options.save !== false) {
    saveEncounterInventory();
  }

  return changed;
}

function reconcileCombatantsWithCurrentBestiaryReferences(options = {}) {
  if (state.bestiaryStatus !== "ready" || !Array.isArray(state.bestiary) || state.bestiary.length === 0) {
    return false;
  }

  let changed = false;

  state.combatants = state.combatants.map((combatant) => {
    if (!isEnemyCombatant(combatant) || !cleanText(combatant.nombre)) {
      return combatant;
    }

    const entry = getCombatantBestiaryEntry(combatant);

    if (!entry) {
      return combatant;
    }

    const nextCombatant = {
      ...combatant,
      entryId: entry.id,
      entryKey: getCompendiumEntryIdentityKey(entry),
      nombre: entry.name,
      canonicalName: entry.canonicalName || entry.name,
      localizedName: entry.localizedName || (entry.canonicalName && entry.canonicalName !== entry.name ? entry.name : cleanText(combatant.localizedName)),
      canonicalSource: entry.canonicalSource || entry.source,
      source: entry.source,
      tokenUrl: cleanText(combatant.tokenUrl) || cleanText(entry.tokenUrl)
    };

    if (JSON.stringify(nextCombatant) !== JSON.stringify(combatant)) {
      changed = true;
    }

    return nextCombatant;
  });

  if (changed && options.save !== false) {
    saveCombatTrackerState();
  }

  return changed;
}

function getActiveEncounter() {
  const encounters = Array.isArray(state.encounters) ? state.encounters.filter((encounter) => isPlainObject(encounter)) : [];
  return encounters.find((encounter) => encounter.id === state.activeEncounterId) ?? null;
}

function getEncounterFolderGroups() {
  const encounterFolders = Array.isArray(state.encounterFolders) ? state.encounterFolders.filter((folder) => isPlainObject(folder)) : [];
  const groups = [
    {
      id: "",
      name: "Sin carpeta",
      isExpanded: state.systemEncounterFolderExpanded
    },
    ...encounterFolders
  ];

  return groups.filter((folder) => folder.id || getEncountersByFolder("").length > 0 || encounterFolders.length === 0);
}

function getEncountersByFolder(folderId) {
  const encounters = Array.isArray(state.encounters) ? state.encounters.filter((encounter) => isPlainObject(encounter)) : [];
  return encounters.filter((encounter) => (encounter.folderId ?? "") === folderId);
}

function getEncounterRowBestiaryEntry(row) {
  const rowSource = cleanText(row.source);
  const rowKeys = [row.entryKey, row.entryId]
    .map((value) => cleanText(value))
    .filter(Boolean);
  const keyMatch = rowKeys.length > 0
    ? state.bestiary.find((entry) => rowKeys.includes(getBestiaryEntryIdentityKey(entry)) && isSameBestiarySource(entry, rowSource))
    : null;

  if (keyMatch) {
    return keyMatch;
  }

  const sourceMatch = state.bestiary.find((entry) => (
    doesBestiaryEntryMatchEncounterRowName(entry, row)
    && isSameBestiarySource(entry, rowSource)
  ));

  if (rowSource) {
    return sourceMatch;
  }

  return sourceMatch
    ?? state.bestiary.find((entry) => doesBestiaryEntryMatchEncounterRowName(entry, row))
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
  const query = normalizeSearchText(state.encounterSearchQuery);

  if (!query || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => getBestiaryEntryNameAliases(entry).some((alias) => alias.includes(query)))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })
      || left.source.localeCompare(right.source, "es", { sensitivity: "base" }));
}

function getEncounterSourceOptions(row) {
  const rowNames = getEncounterRowNameCandidates(row);

  if (rowNames.length === 0 || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => doesBestiaryEntryMatchEncounterRowName(entry, row))
    .sort((left, right) => {
      const leftSource = getBestiarySourceFullName(left.source) || cleanText(left.source);
      const rightSource = getBestiarySourceFullName(right.source) || cleanText(right.source);
      return leftSource.localeCompare(rightSource, "es", { sensitivity: "base" });
    });
}

function getBestiaryEntryIdentityKey(entry) {
  return getCompendiumEntryIdentityKey(entry);
}

function getBestiaryEntryNameAliases(entry) {
  return getCompendiumEntryNameAliases(entry);
}

function getCompendiumEntryIdentityKey(entry) {
  return cleanText(entry?.identityKey) || cleanText(entry?.compositeKey) || cleanText(entry?.id);
}

function getCompendiumEntryNameAliases(entry) {
  const aliases = Array.isArray(entry?.nameAliasesLower) && entry.nameAliasesLower.length > 0
    ? entry.nameAliasesLower
    : [entry?.name, entry?.canonicalName, entry?.localizedName].map((value) => normalizeSearchText(value));

  return uniqueSortedStrings(aliases.filter(Boolean));
}

function findCompendiumEntryByReference(entries, reference = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const keys = [reference.entryKey, reference.key, reference.entryId, reference.id]
    .map((value) => cleanText(value))
    .filter(Boolean);
  const source = cleanText(reference.source);
  const keyMatch = keys.length > 0
    ? entries.find((entry) => keys.includes(getCompendiumEntryIdentityKey(entry)) && isSameCompendiumSource(entry, source))
    : null;

  if (keyMatch) {
    return keyMatch;
  }

  const names = [reference.name, reference.canonicalName, reference.localizedName]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);

  return entries.find((entry) => (
    names.some((name) => getCompendiumEntryNameAliases(entry).includes(name))
    && isSameCompendiumSource(entry, source)
  )) ?? null;
}

function getCurrentCompendiumEntries(kind) {
  try {
    if (kind === "items" && Array.isArray(state.items)) {
      return state.items;
    }

    if (kind === "arcanum" && Array.isArray(state.arcanum)) {
      return state.arcanum;
    }

    if (kind === "bestiary" && Array.isArray(state.bestiary)) {
      return state.bestiary;
    }
  } catch {
    return [];
  }

  return [];
}

function getEncounterRowNameCandidates(row) {
  return uniqueSortedStrings([
    row?.name,
    row?.canonicalName,
    row?.localizedName
  ].map((value) => normalizeSearchText(value)).filter(Boolean));
}

function doesBestiaryEntryMatchEncounterRowName(entry, row) {
  const entryAliases = getBestiaryEntryNameAliases(entry);
  const rowNames = getEncounterRowNameCandidates(row);

  return rowNames.some((rowName) => entryAliases.includes(rowName));
}

function isSameBestiarySource(entry, rowSource) {
  return isSameCompendiumSource(entry, rowSource);
}

function isSameCompendiumSource(entry, rowSource) {
  const normalizedSource = cleanText(rowSource);
  return !normalizedSource || cleanText(entry?.source) === normalizedSource || cleanText(entry?.canonicalSource) === normalizedSource;
}

function getEncounterSummary(encounter) {
  const rows = Array.isArray(encounter?.rows) ? encounter.rows : [];

  return rows.reduce((summary, row) => {
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
  const encounterFolders = Array.isArray(state.encounterFolders) ? state.encounterFolders.filter((folder) => isPlainObject(folder)) : [];
  const folderGroups = encounterFolders.map((folder) => ({
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
    return createCombatantFromBestiaryEntry({
      ...bestiaryEntry,
      name: bestiaryEntry.name
    }, {
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
    hp: row.hp,
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
  const pgMax = getEnemyHitPointValue(entry);
  const ca = entry.acValue || parseLeadingNumber(entry.ac) || "";
  const combatant = {
    id: existingCombatant.id,
    side: "enemies",
    entryId: entry.id ?? existingCombatant.entryId ?? "",
    entryKey: getCompendiumEntryIdentityKey(entry) || cleanText(existingCombatant.entryKey),
    canonicalName: entry.canonicalName || entry.name || cleanText(existingCombatant.canonicalName),
    localizedName: entry.localizedName || (entry.canonicalName && entry.canonicalName !== entry.name ? entry.name : cleanText(existingCombatant.localizedName)),
    canonicalSource: entry.canonicalSource || entry.source || cleanText(existingCombatant.canonicalSource),
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
    shieldEquipped: existingCombatant.shieldEquipped === true,
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

function fillCombatantFromCharacter(combatantId, characterId) {
  const character = state.characters.find((item) => item.id === characterId);

  if (!character) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => combatant.id === combatantId
    ? createCombatantFromCharacter(character, combatant.id)
    : combatant);
  state.activeCombatNameSearchId = "";
  state.activeCombatSourceId = "";
  state.inlineAdjustments[combatantId] = state.inlineAdjustments[combatantId] ?? { ...blankInlineAdjustments };
  pushNotification({
    title: "Personaje añadido",
    message: `${cleanText(character.name) || "Personaje"} se ha añadido a la tabla de combate.`,
    tone: "info",
    imageUrl: cleanText(character.tokenUrl)
  });
}

function fillCombatantFromBestiary(combatantId, entryId) {
  const entry = findCompendiumEntryByReference(state.bestiary, { entryId });

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

function selectCombatNameSuggestion(combatantId, entryId, entryKind = "") {
  if (cleanText(entryKind) === "character") {
    fillCombatantFromCharacter(combatantId, entryId);
    return;
  }

  fillCombatantFromBestiary(combatantId, entryId);
}

function openCombatantBestiary(entryId) {
  const entry = findCompendiumEntryByReference(state.bestiary, { entryId });

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

  const entry = getCombatantSourceOptions(combatant)
    .find((item) => cleanText(item.source) === cleanSource);

  if (!entry) {
    return;
  }

  state.combatants = state.combatants.map((item) => item.id === combatantId
    ? createCombatantFromBestiaryEntry({
      ...entry,
      name: cleanText(item.nombre) || entry.name
    }, item)
    : item);
  state.activeCombatSourceId = "";
}

function addBlankCombatant() {
  const id = `entity-${state.nextId}`;
  const nextStandNumber = formatStandNumber(getNextEnemyStandNumber());

  state.combatants = [
    {
      id,
      side: "enemies",
      source: "",
      ubicacion: "",
      iniactiva: "",
      nombre: "",
      numPeana: nextStandNumber,
      pgMax: "",
      pgAct: "",
      pgTemp: "",
      necrotic: "",
      ca: "",
      shieldEquipped: false,
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
    },
    ...state.combatants
  ];

  state.inlineAdjustments[id] = { ...blankInlineAdjustments };
  state.activeCombatNameSearchId = id;
  state.nextId += 1;
  return id;
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

function deleteCombatantRow(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  const hadCombatant = state.combatants.some((combatant) => combatant.id === normalizedCombatantId);

  if (!hadCombatant) {
    return;
  }

  state.combatants = state.combatants.filter((combatant) => combatant.id !== normalizedCombatantId);
  delete state.inlineAdjustments[normalizedCombatantId];
  state.selectedIds.delete(normalizedCombatantId);

  if (state.activeTurnCombatantId === normalizedCombatantId) {
    state.activeTurnCombatantId = "";
  }

  if (state.activeCombatSpellbookCombatantId === normalizedCombatantId) {
    state.activeCombatSpellbookCombatantId = "";
  }
}

function applyCombatLongRest() {
  const previousCombatantsById = new Map(state.combatants.map((combatant) => [combatant.id, combatant]));
  const linkedCharacterIds = new Set();
  const restNotifications = [];

  state.combatants = state.combatants.map((combatant) => {
    if (cleanText(combatant.tag).toUpperCase() !== "ALIADO") {
      return combatant;
    }

    const linkedCharacter = getLinkedCharacterForCombatant(combatant);

    if (linkedCharacter) {
      linkedCharacterIds.add(linkedCharacter.id);
    }

    const restoredMaxHp = linkedCharacter ? Math.max(0, toNumber(linkedCharacter.maxHp)) : Math.max(0, toNumber(combatant.pgMax));
    const restoredHitDice = linkedCharacter ? Math.max(0, Math.floor(toNumber(linkedCharacter.level) || 0)) : combatant.hitDice;
    const previousCombatant = previousCombatantsById.get(combatant.id) ?? combatant;
    const healedHitPoints = Math.max(0, restoredMaxHp - Math.max(0, toNumber(previousCombatant.pgAct)));
    const currentStatuses = getCombatantStatusNames(combatant);

    restNotifications.push({
      title: "Descanso largo",
      message: `${getCombatantNotificationLabel(combatant)} ha recuperado ${healedHitPoints} puntos de vida tras un merecido descanso largo.`,
      tone: "success",
      imageUrl: cleanText(getCombatantTokenUrl(combatant))
    });

    return normalizeCombatant({
      ...combatant,
      pgMax: restoredMaxHp,
      pgAct: restoredMaxHp,
      pgTemp: 0,
      hitDice: restoredHitDice,
      necrotic: 0,
      condiciones: "",
      iniactiva: "",
      initiativeRoll: null,
      initiativeNat20: false
    }, "pgMax");
  });

  if (linkedCharacterIds.size > 0) {
    state.characters = state.characters.map((character) => linkedCharacterIds.has(character.id)
      ? normalizeStoredCharacter({
        ...character,
        spellSlots: clearCharacterSpellSlotsSpent(character.spellSlots),
        spellbookAbilities: clearCharacterSpellbookAbilityUsesSpent(character.spellbookAbilities)
      })
      : character);
    saveCharacters();
  }

  restNotifications.forEach(pushNotification);

  endCombatTurns();
}

function toggleCombatSpellSlotSpent(combatantId, level, slotIndex) {
  const linkedCharacter = getLinkedCharacterForCombatant(
    state.combatants.find((combatant) => combatant.id === cleanText(combatantId)) ?? {}
  );
  const normalizedLevel = Math.max(1, Math.min(9, Math.floor(toNumber(level) || 1)));
  const normalizedSlotIndex = Math.max(0, Math.floor(toNumber(slotIndex) || 0));

  if (!linkedCharacter) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== linkedCharacter.id) {
      return character;
    }

    const spellSlots = ensureCharacterSpellSlotLevels(character.spellSlots, Math.max(character.spellSlotLevelsVisible ?? 1, normalizedLevel))
      .map((entry) => {
        if (entry.level !== normalizedLevel || normalizedSlotIndex >= entry.slots) {
          return entry;
        }

        const spent = normalizeStoredCharacterSpellSlotSpent(entry.spent, entry.slots);
        spent[normalizedSlotIndex] = !spent[normalizedSlotIndex];
        return normalizeStoredCharacterSpellSlotRow({
          ...entry,
          spent
        });
      });

    return normalizeStoredCharacter({
      ...character,
      spellSlots
    });
  });
}

function toggleCombatSpellbookAbilitySpent(combatantId, rowId, useIndex) {
  const linkedCharacter = getLinkedCharacterForCombatant(
    state.combatants.find((combatant) => combatant.id === cleanText(combatantId)) ?? {}
  );
  const normalizedRowId = cleanText(rowId);
  const normalizedUseIndex = Math.max(0, Math.floor(toNumber(useIndex) || 0));

  if (!linkedCharacter || !normalizedRowId) {
    return;
  }

  state.characters = state.characters.map((character) => {
    if (character.id !== linkedCharacter.id) {
      return character;
    }

    const spellbookAbilities = normalizeStoredCharacterSpellbookAbilities(character.spellbookAbilities).map((row) => {
      if (row.id !== normalizedRowId || normalizedUseIndex >= row.uses) {
        return row;
      }

      const spent = normalizeStoredCharacterSpellbookAbilitySpent(row.spent, row.uses);
      spent[normalizedUseIndex] = !spent[normalizedUseIndex];
      return normalizeStoredCharacterSpellbookAbilityRow({
        ...row,
        spent
      });
    });

    return normalizeStoredCharacter({
      ...character,
      spellbookAbilities
    });
  });
}

function isEnemyCombatant(combatant) {
  return combatant.tag === "ENEMIGO" || combatant.side === "enemies";
}

function startCombatTurns() {
  const turnOrder = getCombatTurnParticipants();

  state.isCombatActive = true;
  state.combatTimerPanelOpen = true;
  state.sort = { key: "iniactiva", direction: "desc" };
  state.activeTurnCombatantId = turnOrder[0]?.id ?? "";
  state.combatRound = 1;
  state.combatTurnRoundDraft = "1";
  state.combatTurnRoundEditorOpen = false;
  state.combatTurnJumpMenuOpen = false;
  resetBattleTimer();
  startBattleTimer();
  saveCombatTrackerState();
}

function endCombatTurns() {
  state.isCombatActive = false;
  state.activeTurnCombatantId = "";
  state.combatRound = 1;
  state.combatTurnRoundDraft = "";
  state.combatTurnRoundEditorOpen = false;
  state.combatTurnJumpMenuOpen = false;
  pauseBattleTimer();
  saveCombatTrackerState();
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

  saveCombatTrackerState();
}

function setCombatTurnRound(value) {
  const nextRound = Math.max(1, Math.floor(toNumber(value) || 1));
  state.combatRound = nextRound;
  state.combatTurnRoundDraft = String(nextRound);
  state.combatTurnRoundEditorOpen = false;
  saveCombatTrackerState();
}

function jumpCombatTurnTo(combatantId) {
  const turnOrder = getCombatTurnParticipants();
  const normalizedCombatantId = cleanText(combatantId);

  if (!turnOrder.some((combatant) => combatant.id === normalizedCombatantId)) {
    return;
  }

  state.activeTurnCombatantId = normalizedCombatantId;
  state.combatTurnJumpMenuOpen = false;
  saveCombatTrackerState();
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

function setCombatantTag(combatantId, tag) {
  const normalizedTag = combatTagOptions.includes(cleanText(tag)) ? cleanText(tag) : "NEUTRAL";

  state.combatants = state.combatants.map((combatant) => combatant.id === combatantId
    ? normalizeCombatant({
      ...combatant,
      tag: normalizedTag
    }, "tag")
    : combatant);
}

function toggleCombatantStatus(combatantId, statusName) {
  const normalizedStatus = cleanText(statusName);
  const canonicalTargetStatus = getCanonicalCombatStatusName(normalizedStatus);

  if (!normalizedStatus) {
    return;
  }

  let addedStatusName = "";
  let notificationCombatant = null;

  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== combatantId) {
      return combatant;
    }

    const currentStatuses = getCombatantStatusNames(combatant);
    const normalizedStatuses = currentStatuses.map((entry) => normalizeTranslationKey(getCanonicalCombatStatusName(entry).toLowerCase()));
    const targetKey = normalizeTranslationKey(canonicalTargetStatus.toLowerCase());
    const nextStatuses = normalizedStatuses.includes(targetKey)
      ? currentStatuses.filter((entry) => normalizeTranslationKey(getCanonicalCombatStatusName(entry).toLowerCase()) !== targetKey)
      : [...currentStatuses, translateCombatStatusNameForLanguage(canonicalTargetStatus, state.appLanguage)];

    if (!normalizedStatuses.includes(targetKey)) {
      addedStatusName = translateCombatStatusNameForLanguage(canonicalTargetStatus, state.appLanguage);
      notificationCombatant = combatant;
    }

    return normalizeCombatant({
      ...combatant,
      condiciones: nextStatuses.join(", ")
    });
  });

  if (addedStatusName) {
    pushNotification({
      title: "Estado aplicado",
      message: `${getCombatantNotificationLabel(notificationCombatant || {})} está ahora ${addedStatusName}.`,
      tone: "warning",
      imageUrl: cleanText(getCombatantTokenUrl(notificationCombatant || {}))
    });
  }

  clearCombatStatusDraft(combatantId);
}

function generateInitiative() {
  if (state.selectedIds.size === 0) {
    return;
  }

  playInitiativeRollSound();
  const initiativeNotifications = [];
  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
      return combatant;
    }

    const nextCombatant = getCombatantWithGeneratedInitiative(combatant);

    if (nextCombatant.initiativeRoll === 1) {
      initiativeNotifications.push({
        title: "Pifia de iniciativa",
        message: `${getCombatantNotificationLabel(nextCombatant)} ha sacado un 1 natural en iniciativa.`,
        tone: "danger",
        imageUrl: cleanText(getCombatantTokenUrl(nextCombatant))
      });
    } else if (nextCombatant.initiativeRoll === 20) {
      initiativeNotifications.push({
        title: "Crítico de iniciativa",
        message: `${getCombatantNotificationLabel(nextCombatant)} ha sacado un 20 natural en iniciativa.`,
        tone: "success",
        imageUrl: cleanText(getCombatantTokenUrl(nextCombatant))
      });
    }

    return nextCombatant;
  });

  state.sort = { key: "iniactiva", direction: "desc" };
  initiativeNotifications.forEach(pushNotification);
}

function getCombatantWithGeneratedInitiative(combatant) {
  const roll = randomD20();
  const linkedCharacter = getLinkedCharacterForCombatant(combatant);
  const initiativeBonus = linkedCharacter
    ? toNumber(linkedCharacter.initiativeBonus)
    : getDexModifier(combatant.stats);

  return {
    ...combatant,
    iniactiva: roll === 1 ? roll : roll + initiativeBonus,
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
  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    adjustedCombatants.push(combatant);

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

  syncDownedAllyUnconsciousStatus(previousCombatants);
  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  applyReviveExhaustion(previousCombatants);
  notifyCombatantDeaths(previousCombatants);
  adjustedCombatants.forEach((combatant) => queueCombatResourceNotification(combatant, mode === "heal" ? "heal" : "damage", amount));
  setInlineAdjustment(id, "pgAct", "");
}

function applyNecroticAdjustment(id) {
  const amount = Number(getInlineAdjustment(id).pgAct);

  if (!Number.isFinite(amount)) {
    return;
  }

  const previousCombatants = state.combatants;
  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    adjustedCombatants.push(combatant);

    return normalizeCombatant({
      ...combatant,
      pgAct: toNumber(combatant.pgAct) - amount,
      necrotic: toNumber(combatant.necrotic) + amount
    }, "necrotic");
  });

  syncDownedAllyUnconsciousStatus(previousCombatants);
  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  applyReviveExhaustion(previousCombatants);
  notifyCombatantDeaths(previousCombatants);
  adjustedCombatants.forEach((combatant) => queueCombatResourceNotification(combatant, "necrotic", amount));
  setInlineAdjustment(id, "pgAct", "");
}

function applyPgTempAdjustment(id) {
  const amount = Number(getInlineAdjustment(id).pgAct);

  if (!Number.isFinite(amount) || amount < 0) {
    return;
  }

  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== id) {
      return combatant;
    }

    const nextTempHp = getNextTempHpValue(combatant.pgTemp, amount);

    adjustedCombatants.push({
      combatant,
      gainedAmount: Math.max(0, nextTempHp - Math.max(0, toNumber(combatant.pgTemp)))
    });

    return normalizeCombatant({
      ...combatant,
      pgTemp: nextTempHp
    }, "pgTemp");
  });

  adjustedCombatants.forEach(({ combatant, gainedAmount }) => {
    if (gainedAmount > 0) {
      queueCombatResourceNotification(combatant, "temp", gainedAmount);
    }
  });
  setInlineAdjustment(id, "pgAct", "");
}

function getDefaultCombatAreaTargetPickerState() {
  return {
    mode: "",
    selectedIds: new Set(),
    halfDamageIds: new Set()
  };
}

function getSelectedDiaryExportBundle() {
  const selectedFolderIds = new Set(
    [...state.importExportDiaryFolderIds].filter((folderId) => state.diaryFolders.some((folder) => folder.id === folderId))
  );
  const selectedNoteIds = new Set(
    [...state.importExportDiaryNoteIds].filter((noteId) => state.diaryNotes.some((note) => note.id === noteId))
  );

  state.diaryNotes.forEach((note) => {
    if (selectedFolderIds.has(note.folderId ?? "")) {
      selectedNoteIds.add(note.id);
    }
  });

  state.diaryNotes.forEach((note) => {
    if (selectedNoteIds.has(note.id) && cleanText(note.folderId)) {
      selectedFolderIds.add(cleanText(note.folderId));
    }
  });

  return {
    folders: state.diaryFolders
      .filter((folder) => selectedFolderIds.has(folder.id))
      .map((folder) => normalizeStoredDiaryFolder(folder))
      .filter(Boolean),
    notes: state.diaryNotes
      .filter((note) => selectedNoteIds.has(note.id))
      .map((note) => normalizeStoredDiaryNote(note))
      .filter(Boolean),
    tagColors: normalizeStoredDiaryTagColors(state.diaryTagColors),
    harptosDayNotes: normalizeStoredDiaryHarptosDayNotes(state.diaryHarptosDayNotes)
  };
}

function closeCombatAreaTargetPicker() {
  state.combatAreaTargetPicker = getDefaultCombatAreaTargetPickerState();
}

function openCombatAreaTargetPicker(mode) {
  const normalizedMode = cleanText(mode);
  const amount = Number(state.areaDamage);
  const targetCombatants = getCombatAreaTargetList(normalizedMode, getVisibleCombatants());

  if (
    !normalizedMode
    || !Number.isFinite(amount)
    || amount < 0
    || (normalizedMode === "xp" && amount <= 0)
    || targetCombatants.length === 0
  ) {
    return;
  }

  state.combatAreaTargetPicker = {
    mode: normalizedMode,
    selectedIds: new Set(),
    halfDamageIds: new Set()
  };
}

function toggleCombatAreaTargetSelection(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  const nextSelectedIds = new Set(state.combatAreaTargetPicker.selectedIds ?? []);
  const nextHalfDamageIds = new Set(state.combatAreaTargetPicker.halfDamageIds ?? []);

  if (nextSelectedIds.has(normalizedCombatantId)) {
    nextSelectedIds.delete(normalizedCombatantId);
    nextHalfDamageIds.delete(normalizedCombatantId);
  } else {
    nextSelectedIds.add(normalizedCombatantId);
  }

  state.combatAreaTargetPicker = {
    ...state.combatAreaTargetPicker,
    selectedIds: nextSelectedIds,
    halfDamageIds: nextHalfDamageIds
  };
}

function toggleCombatAreaTargetHalfSelection(combatantId) {
  const normalizedCombatantId = cleanText(combatantId);
  const selectedIds = new Set(state.combatAreaTargetPicker.selectedIds ?? []);

  if (!normalizedCombatantId || !selectedIds.has(normalizedCombatantId)) {
    return;
  }

  const nextHalfDamageIds = new Set(state.combatAreaTargetPicker.halfDamageIds ?? []);

  if (nextHalfDamageIds.has(normalizedCombatantId)) {
    nextHalfDamageIds.delete(normalizedCombatantId);
  } else {
    nextHalfDamageIds.add(normalizedCombatantId);
  }

  state.combatAreaTargetPicker = {
    ...state.combatAreaTargetPicker,
    selectedIds,
    halfDamageIds: nextHalfDamageIds
  };
}

function getCombatAreaTargetConfigs() {
  const mode = cleanText(state.combatAreaTargetPicker.mode);
  const selectedIds = new Set(state.combatAreaTargetPicker.selectedIds ?? []);
  const halfDamageIds = new Set(state.combatAreaTargetPicker.halfDamageIds ?? []);

  return getCombatAreaTargetList(mode, getVisibleCombatants())
    .filter((combatant) => selectedIds.has(combatant.id))
    .map((combatant) => ({
      id: combatant.id,
      halfDamage: halfDamageIds.has(combatant.id)
    }));
}

function getCombatAreaAdjustedAmount(combatant, amount, useHalfDamage = false) {
  const normalizedAmount = Math.max(0, Number(amount) || 0);

  if (!useHalfDamage) {
    return normalizedAmount;
  }

  return isEnemyCombatant(combatant)
    ? Math.ceil(normalizedAmount / 2)
    : Math.floor(normalizedAmount / 2);
}

function applyCombatAreaTargetPicker() {
  const mode = cleanText(state.combatAreaTargetPicker.mode);
  const targetConfigs = getCombatAreaTargetConfigs();

  if (!mode || targetConfigs.length === 0) {
    return;
  }

  if (mode === "damage" || mode === "heal") {
    applyAreaPgActAdjustment(mode, targetConfigs);
    closeCombatAreaTargetPicker();
    return;
  }

  if (mode === "necrotic") {
    applyAreaNecroticAdjustment(targetConfigs);
    closeCombatAreaTargetPicker();
    return;
  }

  if (mode === "temp") {
    applyAreaPgTempAdjustment(targetConfigs);
    closeCombatAreaTargetPicker();
    return;
  }

  if (mode === "xp") {
    applyAreaExperienceAdjustment(targetConfigs);
    closeCombatAreaTargetPicker();
  }
}

function applyAreaPgActAdjustment(mode = "damage", targetConfigs = null) {
  const amount = Number(state.areaDamage);
  const targets = Array.isArray(targetConfigs) ? targetConfigs : [...state.selectedIds].map((id) => ({ id, halfDamage: false }));
  const targetConfigById = new Map(targets.map((entry) => [cleanText(entry.id), entry]));

  if (!Number.isFinite(amount) || amount < 0 || targetConfigById.size === 0) {
    return;
  }

  const previousCombatants = state.combatants;
  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    const targetConfig = targetConfigById.get(combatant.id);

    if (!targetConfig) {
      return combatant;
    }

    const appliedAmount = mode === "heal"
      ? amount
      : getCombatAreaAdjustedAmount(combatant, amount, targetConfig.halfDamage);

    adjustedCombatants.push({
      combatant,
      appliedAmount
    });

    if (mode === "heal") {
      return normalizeCombatant({
        ...combatant,
        pgAct: toNumber(combatant.pgAct) + appliedAmount
      }, "pgAct");
    }

    let remainingDamage = appliedAmount;
    const currentTemp = Math.max(0, toNumber(combatant.pgTemp));
    const tempAfterDamage = Math.max(0, currentTemp - remainingDamage);
    remainingDamage = Math.max(0, remainingDamage - currentTemp);

    return normalizeCombatant({
      ...combatant,
      pgTemp: tempAfterDamage,
      pgAct: toNumber(combatant.pgAct) - remainingDamage
    }, "pgAct");
  });

  syncDownedAllyUnconsciousStatus(previousCombatants);
  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  applyReviveExhaustion(previousCombatants);
  notifyCombatantDeaths(previousCombatants);
  adjustedCombatants.forEach(({ combatant, appliedAmount }) => {
    if (appliedAmount > 0) {
      queueCombatResourceNotification(combatant, mode === "heal" ? "heal" : "damage", appliedAmount);
    }
  });
  state.areaDamage = "";
  saveCombatTrackerState();
}

function applyAreaNecroticAdjustment(targetConfigs = null) {
  const amount = Number(state.areaDamage);
  const targets = Array.isArray(targetConfigs) ? targetConfigs : [...state.selectedIds].map((id) => ({ id, halfDamage: false }));
  const targetConfigById = new Map(targets.map((entry) => [cleanText(entry.id), entry]));

  if (!Number.isFinite(amount) || amount < 0 || targetConfigById.size === 0) {
    return;
  }

  const previousCombatants = state.combatants;
  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    const targetConfig = targetConfigById.get(combatant.id);

    if (!targetConfig) {
      return combatant;
    }

    const appliedAmount = getCombatAreaAdjustedAmount(combatant, amount, targetConfig.halfDamage);

    adjustedCombatants.push({
      combatant,
      appliedAmount
    });

    return normalizeCombatant({
      ...combatant,
      pgAct: toNumber(combatant.pgAct) - appliedAmount,
      necrotic: toNumber(combatant.necrotic) + appliedAmount
    }, "necrotic");
  });

  syncDownedAllyUnconsciousStatus(previousCombatants);
  distributeExperienceForNewlyDefeatedEnemies(previousCombatants);
  applyReviveExhaustion(previousCombatants);
  notifyCombatantDeaths(previousCombatants);
  adjustedCombatants.forEach(({ combatant, appliedAmount }) => {
    if (appliedAmount > 0) {
      queueCombatResourceNotification(combatant, "necrotic", appliedAmount);
    }
  });
  state.areaDamage = "";
  saveCombatTrackerState();
}

function applyAreaPgTempAdjustment(targetConfigs = null) {
  const amount = Number(state.areaDamage);
  const targetIds = new Set(Array.isArray(targetConfigs) ? targetConfigs.map((entry) => cleanText(entry.id)) : [...state.selectedIds]);

  if (!Number.isFinite(amount) || amount < 0 || targetIds.size === 0) {
    return;
  }

  const adjustedCombatants = [];
  state.combatants = state.combatants.map((combatant) => {
    if (!targetIds.has(combatant.id)) {
      return combatant;
    }

    const nextTempHp = getNextTempHpValue(combatant.pgTemp, amount);

    adjustedCombatants.push({
      combatant,
      gainedAmount: Math.max(0, nextTempHp - Math.max(0, toNumber(combatant.pgTemp)))
    });

    return normalizeCombatant({
      ...combatant,
      pgTemp: nextTempHp
    }, "pgTemp");
  });

  adjustedCombatants.forEach(({ combatant, gainedAmount }) => {
    if (gainedAmount > 0) {
      queueCombatResourceNotification(combatant, "temp", gainedAmount);
    }
  });
  state.areaDamage = "";
  saveCombatTrackerState();
}

function applyAreaExperienceAdjustment(targetConfigs = null) {
  const amount = Number(state.areaDamage);
  const targetIds = new Set(Array.isArray(targetConfigs) ? targetConfigs.map((entry) => cleanText(entry.id)) : [...state.selectedIds]);

  if (!Number.isFinite(amount) || amount <= 0 || targetIds.size === 0) {
    return;
  }

  const characterIds = state.combatants
    .filter((combatant) => targetIds.has(combatant.id))
    .map((combatant) => {
      if (cleanText(combatant.side).toLowerCase() !== "allies") {
        return "";
      }

      const linkedCharacter = getLinkedCharacterForCombatant(combatant);
      return linkedCharacter ? cleanText(linkedCharacter.id) : "";
    })
    .filter(Boolean);

  if (characterIds.length === 0) {
    state.areaDamage = "";
    return;
  }

  [...new Set(characterIds)].forEach((characterId) => {
    addExperienceToCharacters([characterId], Math.max(0, Math.floor(amount)));
  });
  state.areaDamage = "";
  saveCombatTrackerState();
}

function applyReviveExhaustion(previousCombatants = []) {
  const previousCombatantsById = new Map(previousCombatants.map((combatant) => [combatant.id, combatant]));

  state.combatants = state.combatants.map((combatant) => {
    const previousCombatant = previousCombatantsById.get(combatant.id);

    if (!previousCombatant) {
      return combatant;
    }

    if (cleanText(combatant.tag).toUpperCase() !== "ALIADO") {
      return combatant;
    }

    if (!isCombatantDead(previousCombatant) || isCombatantDead(combatant)) {
      return combatant;
    }

    const currentStatuses = getCombatantStatusNames(combatant);
    const nextExhaustionLevel = getExhaustionLevelFromStatusNames(currentStatuses) + 1;
    const nextStatuses = [
      ...removeExhaustionStatuses(currentStatuses),
      formatExhaustionStatus(nextExhaustionLevel)
    ];

    return normalizeCombatant({
      ...combatant,
      condiciones: nextStatuses.join(", ")
    });
  });
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

function syncDownedAllyUnconsciousStatus(previousCombatants = []) {
  const previousCombatantsById = new Map(previousCombatants.map((combatant) => [combatant.id, combatant]));

  state.combatants = state.combatants.map((combatant) => {
    const normalizedTag = cleanText(combatant.tag).toUpperCase();

    if (normalizedTag !== "ALIADO" && combatant.side !== "allies") {
      return combatant;
    }

    const previousCombatant = previousCombatantsById.get(combatant.id) ?? combatant;
    const currentStatuses = getCombatantStatusNames(combatant);
    const withoutUnconscious = currentStatuses.filter((statusName) => normalizeTranslationKey(statusName.toLowerCase()) !== "inconsciente");

    if (isCombatantDead(combatant)) {
      if (withoutUnconscious.length !== currentStatuses.length) {
        return combatant;
      }

      return normalizeCombatant({
        ...combatant,
        condiciones: [...withoutUnconscious, translateCombatStatusNameForLanguage("Inconsciente", state.appLanguage)].join(", ")
      });
    }

    if (isCombatantDead(previousCombatant) && withoutUnconscious.length !== currentStatuses.length) {
      return normalizeCombatant({
        ...combatant,
        condiciones: withoutUnconscious.join(", ")
      });
    }

    return combatant;
  });
}

function notifyCombatantDeaths(previousCombatants = []) {
  const previousCombatantsById = new Map(previousCombatants.map((combatant) => [combatant.id, combatant]));
  let deathNotificationCount = 0;

  state.combatants.forEach((combatant) => {
    const previousCombatant = previousCombatantsById.get(combatant.id);

    if (!previousCombatant) {
      return;
    }

    if (isCombatantDead(previousCombatant) || !isCombatantDead(combatant)) {
      return;
    }

    const normalizedTag = cleanText(combatant.tag).toUpperCase();
    const isAlly = normalizedTag === "ALIADO" || combatant.side === "allies";
    const isEnemy = normalizedTag === "ENEMIGO" || combatant.side === "enemies";

    pushNotification({
      title: isAlly ? "UN ALIADO HA CAIDO!" : isEnemy ? "UN ENEMIGO HA MUERTO" : "HA MUERTO",
      message: isAlly
        ? `${getCombatantNotificationLabel(combatant)} ha caido inconsciente.`
        : `${getCombatantNotificationLabel(combatant)} ha muerto.`,
      tone: "danger",
      imageUrl: cleanText(getCombatantTokenUrl(combatant))
    });
    deathNotificationCount += 1;
  });

  if (deathNotificationCount > 0) {
    playInterfaceSound(deathSoundUrl, 0.78, "death");
  }
}

function getCombatantNotificationLabel(combatant) {
  const baseName = cleanText(combatant?.nombre) || (isEnglishInterface() ? "Entity" : "Entidad");
  const standLabel = cleanText(combatant?.numPeana);
  const isEnemyLike = combatant?.side === "enemies" || cleanText(combatant?.tag).toUpperCase() === "ENEMIGO";

  if (isEnemyLike && standLabel) {
    return `${baseName} (${isEnglishInterface() ? "Stand" : "Peana"} ${standLabel})`;
  }

  return baseName;
}

function queueCombatResourceNotification(combatant, kind, amount) {
  const normalizedAmount = Math.abs(toNumber(amount));

  if (!combatant || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return;
  }

  const amountLabel = Number.isInteger(normalizedAmount) ? String(normalizedAmount) : String(normalizedAmount);
  const combatantLabel = getCombatantNotificationLabel(combatant);
  let title = "";
  let message = "";
  let tone = "info";

  if (kind === "damage") {
    title = "Daño aplicado";
    message = `${combatantLabel} ha recibido ${amountLabel} puntos de dano.`;
    tone = "danger";
  } else if (kind === "heal") {
    title = "Curacion aplicada";
    message = `${combatantLabel} ha recuperado ${amountLabel} puntos de vida.`;
    tone = "success";
  } else if (kind === "necrotic") {
    title = "Daño necrotico";
    message = `${combatantLabel} sufre ${amountLabel} puntos de dano necrotico.`;
    tone = "warning";
  } else if (kind === "temp") {
    title = "Vida temporal aplicada";
    message = `${combatantLabel} gana ${amountLabel} puntos de vida temporal.`;
    tone = "info";
  }

  if (!title || !message) {
    return;
  }

  pushNotification({
    title,
    message,
    tone,
    imageUrl: cleanText(getCombatantTokenUrl(combatant)),
    effectKind: kind
  });
}

function getEligibleCharacterIdsForCombatExperience() {
  const seenCharacterIds = new Set();

  return getCombatTurnOrder(state.combatants)
    .filter((combatant) => combatant.side === "allies" && combatant.iniactiva !== "")
    .map((combatant) => getLinkedCharacterForCombatant(combatant))
    .filter(Boolean)
    .filter((character) => state.includeNpcInCombatExperience || !isNpcCharacter(character))
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
  const hitDice = normalizeStoredNonNegativeNumber(combatant.hitDice);
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
    hitDice,
    necrotic,
    stats: changedKey === "stats" ? formatStatsWithModifiers(combatant.stats) : combatant.stats,
    side: changedKey === "tag" ? mapTagToSide(combatant.tag) : combatant.side
  };
}

function isCombatantDead(combatant) {
  if (combatant.pgMax === "" && combatant.pgAct === "") {
    return false;
  }

  return getEffectivePgMax(combatant) <= 0 || toNumber(combatant.pgAct) <= 0;
}

function getEffectivePgMax(combatant) {
  return Math.max(0, toNumber(combatant.pgMax) - toNumber(combatant.necrotic));
}

function getNextTempHpValue(currentTempHp, incomingTempHp) {
  const normalizedCurrent = Math.max(0, toNumber(currentTempHp));
  const normalizedIncoming = Math.max(0, toNumber(incomingTempHp));
  return normalizedCurrent >= normalizedIncoming ? normalizedCurrent : normalizedIncoming;
}

function openCombatTurnQuickMenu(combatantId, x, y) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  state.combatTurnQuickMenu = {
    combatantId: normalizedCombatantId,
    x: Math.round(toNumber(x)),
    y: Math.round(toNumber(y)),
    value: ""
  };
}

function closeCombatTurnQuickMenu() {
  state.combatTurnQuickMenu = {
    combatantId: "",
    x: 0,
    y: 0,
    value: ""
  };
}

function openCombatMaxHpRestoreMenu(combatantId, x, y) {
  const normalizedCombatantId = cleanText(combatantId);

  if (!normalizedCombatantId) {
    return;
  }

  state.combatMaxHpRestoreMenu = {
    combatantId: normalizedCombatantId,
    x: Math.round(toNumber(x)),
    y: Math.round(toNumber(y))
  };
}

function closeCombatMaxHpRestoreMenu() {
  state.combatMaxHpRestoreMenu = {
    combatantId: "",
    x: 0,
    y: 0
  };
}

function applyCombatTurnQuickMenuAdjustment(mode = "") {
  const combatantId = cleanText(state.combatTurnQuickMenu?.combatantId);
  const amount = Number(state.combatTurnQuickMenu?.value);

  if (!combatantId || !Number.isFinite(amount) || amount < 0) {
    return;
  }

  setInlineAdjustment(combatantId, "pgAct", String(amount));

  if (mode === "damage" || mode === "heal") {
    applyPgActAdjustment(combatantId, mode);
  } else if (mode === "necrotic") {
    applyNecroticAdjustment(combatantId);
  } else if (mode === "temp") {
    applyPgTempAdjustment(combatantId);
  }

  closeCombatTurnQuickMenu();
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

function shouldShowCombatHitDiceField(combatant, linkedCharacter = getLinkedCharacterForCombatant(combatant)) {
  return cleanText(combatant.tag).toUpperCase() === "ALIADO" && Boolean(linkedCharacter);
}

function getCombatantHitDiceValue(combatant, linkedCharacter = getLinkedCharacterForCombatant(combatant)) {
  if (!shouldShowCombatHitDiceField(combatant, linkedCharacter)) {
    return "";
  }

  if (combatant.hitDice === "") {
    return Math.max(0, Math.floor(toNumber(linkedCharacter?.level) || 0));
  }

  return Math.max(0, Math.floor(toNumber(combatant.hitDice) || 0));
}

function syncLinkedCombatantsHitDice(characterId) {
  const normalizedCharacterId = cleanText(characterId);
  const linkedCharacter = state.characters.find((character) => character.id === normalizedCharacterId);

  if (!linkedCharacter) {
    return;
  }

  const nextHitDice = Math.max(0, Math.floor(toNumber(linkedCharacter.level) || 0));
  state.combatants = state.combatants.map((combatant) => cleanText(combatant.characterId) === normalizedCharacterId
    ? normalizeCombatant({
      ...combatant,
      hitDice: nextHitDice
    }, "hitDice")
    : combatant);
}

function playInitiativeRollSound() {
  playInterfaceSound(diceRollSoundUrl, 0.72, "initiative");
}

function shouldPlayInterfaceSound(soundKey = "") {
  const settings = normalizeStoredSoundSettings(state.soundSettings);

  if (!settings.enabled) {
    return false;
  }

  if (!soundKey) {
    return true;
  }

  return settings[soundKey] !== false;
}

function playInterfaceSound(soundUrl, volume = 0.72, soundKey = "") {
  if (typeof window === "undefined" || typeof Audio === "undefined" || !cleanText(soundUrl)) {
    return;
  }

  if (!shouldPlayInterfaceSound(soundKey)) {
    return;
  }

  try {
    const audio = new Audio(soundUrl);
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0.72));
    audio.play().catch(() => {});
  } catch {
    // Ignore playback failures caused by browser policies or missing codecs.
  }
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

function normalizeCombatantArmorClassInput(rawValue, shieldEquipped = false, normalize = true) {
  const normalizedValue = getNormalizedValue({ key: "ca", type: "number" }, rawValue, normalize);

  if (normalizedValue === "") {
    return "";
  }

  return Math.max(0, toNumber(normalizedValue) - (shieldEquipped ? 2 : 0));
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

async function loadDataCsvFileOptions() {
  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.listAssetFiles !== "function") {
    state.dataCsvFiles = [...defaultDataCsvFiles];
    render();
    return;
  }

  try {
    const files = await desktopApi.listAssetFiles("data", ".csv");
    state.dataCsvFiles = [...new Set([...defaultDataCsvFiles, ...files.map(normalizeDataCsvRelativePath)])]
      .filter(Boolean)
      .filter((relativePath) => !/(\.es|_ES)\.csv$/i.test(relativePath))
      .sort((left, right) => getFileNameFromPath(left).localeCompare(getFileNameFromPath(right), "es", { sensitivity: "base" }));
    render();
  } catch {
    state.dataCsvFiles = [...defaultDataCsvFiles];
  }
}

function getRepositoryCsvUpload(repositoryKey) {
  return isPlainObject(state.repositoryCsvUploads) ? state.repositoryCsvUploads[repositoryKey] ?? null : null;
}

function getImportedRepositoryRelativePath(repositoryKey, fileName = "") {
  const normalizedRepositoryKey = cleanText(repositoryKey).toLowerCase();
  const baseName = cleanText(fileName).replace(/\\/g, "/").split("/").pop() || `${normalizedRepositoryKey}.csv`;
  const sanitizedBaseName = baseName
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `${normalizedRepositoryKey}.csv`;
  const fileNameWithExtension = /\.csv$/i.test(sanitizedBaseName) ? sanitizedBaseName : `${sanitizedBaseName}.csv`;

  return `data/imported/${normalizedRepositoryKey}/${fileNameWithExtension}`;
}

function isUploadedRepositoryCsvPath(value) {
  return cleanText(value).toLowerCase().startsWith("uploaded:");
}

function encodeUploadedRepositoryCsvPath(repositoryKey, fileName = "") {
  const normalizedRepositoryKey = cleanText(repositoryKey).toLowerCase();
  const baseName = cleanText(fileName).replace(/\\/g, "/").split("/").pop() || `${normalizedRepositoryKey}.csv`;
  const sanitizedBaseName = baseName
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `${normalizedRepositoryKey}.csv`;
  const fileNameWithExtension = /\.csv$/i.test(sanitizedBaseName) ? sanitizedBaseName : `${sanitizedBaseName}.csv`;

  return normalizedRepositoryKey ? `uploaded:${normalizedRepositoryKey}:${fileNameWithExtension}` : "";
}

function decodeUploadedRepositoryCsvPath(value) {
  const normalizedValue = cleanText(value);

  if (!isUploadedRepositoryCsvPath(normalizedValue)) {
    return null;
  }

  const [, repositoryKey = "", ...fileNameParts] = normalizedValue.split(":");
  return {
    repositoryKey: cleanText(repositoryKey).toLowerCase(),
    fileName: fileNameParts.join(":")
  };
}

function canUseRepositoryCsvUploadDatabase() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openRepositoryCsvUploadDatabase() {
  if (!canUseRepositoryCsvUploadDatabase()) {
    return Promise.resolve(null);
  }

  if (!repositoryCsvUploadDatabasePromise) {
    repositoryCsvUploadDatabasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(REPOSITORY_CSV_UPLOAD_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(REPOSITORY_CSV_UPLOAD_STORE_NAME)) {
          database.createObjectStore(REPOSITORY_CSV_UPLOAD_STORE_NAME, {
            keyPath: "path"
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Repository CSV upload database unavailable."));
    }).catch(() => null);
  }

  return repositoryCsvUploadDatabasePromise;
}

async function saveRepositoryCsvUploadRecord(record) {
  if (!canUseRepositoryCsvUploadDatabase() || !isPlainObject(record) || !cleanText(record.path) || !record.text) {
    return false;
  }

  const database = await openRepositoryCsvUploadDatabase();

  if (!database) {
    return false;
  }

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(REPOSITORY_CSV_UPLOAD_STORE_NAME, "readwrite");
    const store = transaction.objectStore(REPOSITORY_CSV_UPLOAD_STORE_NAME);
    const request = store.put({
      path: cleanText(record.path),
      repositoryKey: cleanText(record.repositoryKey).toLowerCase(),
      name: cleanText(record.name),
      text: String(record.text),
      savedAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Repository CSV upload save failed."));
  }).catch(() => {});

  return true;
}

async function loadRepositoryCsvUploadRecord(pathValue) {
  if (!canUseRepositoryCsvUploadDatabase() || !isUploadedRepositoryCsvPath(pathValue)) {
    return null;
  }

  const database = await openRepositoryCsvUploadDatabase();

  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(REPOSITORY_CSV_UPLOAD_STORE_NAME, "readonly");
    const store = transaction.objectStore(REPOSITORY_CSV_UPLOAD_STORE_NAME);
    const request = store.get(cleanText(pathValue));

    request.onsuccess = () => resolve(isPlainObject(request.result) ? request.result : null);
    request.onerror = () => resolve(null);
  });
}

function setRepositoryCsvUpload(repositoryKey, upload) {
  state.repositoryCsvUploads = {
    ...state.repositoryCsvUploads,
    [repositoryKey]: upload
  };
}

async function ensureRepositoryCsvUploadLoaded(repositoryKey, pathValue) {
  const normalizedPath = cleanText(pathValue);
  const activeUpload = getRepositoryCsvUpload(repositoryKey);

  if (activeUpload?.text && cleanText(activeUpload.path) === normalizedPath) {
    return activeUpload;
  }

  const storedUpload = await loadRepositoryCsvUploadRecord(normalizedPath);

  if (!storedUpload?.text) {
    return null;
  }

  const upload = {
    path: normalizedPath,
    name: cleanText(storedUpload.name) || decodeUploadedRepositoryCsvPath(normalizedPath)?.fileName || "CSV",
    text: String(storedUpload.text)
  };

  setRepositoryCsvUpload(repositoryKey, upload);
  return upload;
}

function getRepositoryCsvOverridesSaveData() {
  const overrides = {};

  Object.keys(defaultRepositoryCsvPaths).forEach((repositoryKey) => {
    const activePath = getRepositoryCsvPath(repositoryKey);

    if (activePath === defaultRepositoryCsvPaths[repositoryKey]) {
      return;
    }

    const upload = getRepositoryCsvUpload(repositoryKey);
    const override = {
      path: activePath,
      name: cleanText(upload?.name) || getFileNameFromPath(getRepositoryCsvDisplayPath(activePath))
    };

    if (isUploadedRepositoryCsvPath(activePath) && upload?.text) {
      override.text = String(upload.text);
    }

    overrides[repositoryKey] = override;
  });

  return overrides;
}

function normalizeStoredRepositoryCsvOverrides(value) {
  const source = isPlainObject(value) ? value : {};

  return Object.fromEntries(
    Object.keys(defaultRepositoryCsvPaths).flatMap((repositoryKey) => {
      const entry = isPlainObject(source[repositoryKey]) ? source[repositoryKey] : null;
      const normalizedPath = normalizeRepositoryCsvPath(entry?.path);

      if (!entry || !normalizedPath || normalizedPath === defaultRepositoryCsvPaths[repositoryKey]) {
        return [];
      }

      return [[repositoryKey, {
        path: normalizedPath,
        name: cleanText(entry.name) || getFileNameFromPath(getRepositoryCsvDisplayPath(normalizedPath)),
        text: isUploadedRepositoryCsvPath(normalizedPath) ? String(entry.text || "") : ""
      }]];
    })
  );
}

function getActiveRepositoryCsvDisplayPath(repositoryKey) {
  const upload = getRepositoryCsvUpload(repositoryKey);
  return cleanText(upload?.name) || getRepositoryCsvDisplayPath(getRepositoryCsvPath(repositoryKey));
}

function getActiveRepositoryCsvDisplayName(repositoryKey) {
  const displayPath = getActiveRepositoryCsvDisplayPath(repositoryKey);
  return getFileNameFromPath(displayPath) || displayPath || "CSV";
}

function triggerRepositoryCsvInputPicker(repositoryKey) {
  const input = app.querySelector(`[data-repository-csv-input="${repositoryKey}"]`);

  if (!input) {
    return;
  }

  input.click();
}

function isExternalRepositoryCsvPath(value) {
  return cleanText(value).toLowerCase().startsWith("external:");
}

function encodeExternalRepositoryCsvPath(filePath) {
  const normalizedPath = cleanText(filePath).replace(/\\/g, "/");
  return normalizedPath && /\.csv$/i.test(normalizedPath) ? `external:${normalizedPath}` : "";
}

function decodeExternalRepositoryCsvPath(value) {
  return isExternalRepositoryCsvPath(value)
    ? cleanText(value).slice("external:".length)
    : "";
}

function normalizeRepositoryCsvPath(value) {
  const uploadedPath = decodeUploadedRepositoryCsvPath(value);

  if (uploadedPath?.repositoryKey && uploadedPath.fileName) {
    return encodeUploadedRepositoryCsvPath(uploadedPath.repositoryKey, uploadedPath.fileName);
  }

  const externalPath = decodeExternalRepositoryCsvPath(value) || (looksLikeAbsoluteCsvPath(value) ? cleanText(value) : "");

  if (externalPath) {
    return encodeExternalRepositoryCsvPath(externalPath);
  }

  return normalizeDataCsvRelativePath(value);
}

function looksLikeAbsoluteCsvPath(value) {
  const normalizedPath = cleanText(value).replace(/\\/g, "/");
  return /^[a-z]:\//i.test(normalizedPath) && /\.csv$/i.test(normalizedPath);
}

function getRepositoryCsvDisplayPath(value) {
  if (isUploadedRepositoryCsvPath(value)) {
    return decodeUploadedRepositoryCsvPath(value)?.fileName || "CSV";
  }

  if (isExternalRepositoryCsvPath(value)) {
    return decodeExternalRepositoryCsvPath(value);
  }

  return normalizeDataCsvRelativePath(value);
}

function getRepositoryCsvPath(repositoryKey) {
  return normalizeRepositoryCsvPath(state.repositoryCsvPaths[repositoryKey])
    || defaultRepositoryCsvPaths[repositoryKey]
    || "";
}

function updateRepositoryCsvPath(repositoryKey, relativePath) {
  if (!defaultRepositoryCsvPaths[repositoryKey]) {
    return;
  }

  const normalizedPath = normalizeRepositoryCsvPath(relativePath);

  state.repositoryCsvPaths = {
    ...state.repositoryCsvPaths,
    [repositoryKey]: normalizedPath || defaultRepositoryCsvPaths[repositoryKey]
  };
  saveCampaignMeta();

  if (repositoryKey === "bestiary") {
    resetBestiaryVirtualScroll();
    state.bestiarySelectedId = "";
    loadBestiary();
    return;
  }

  if (repositoryKey === "items") {
    resetItemVirtualScroll();
    state.itemSelectedId = "";
    loadItems();
    return;
  }

  if (repositoryKey === "arcanum") {
    resetArcanumVirtualScroll();
    state.arcanumSelectedId = "";
    loadArcanum();
  }
}

async function handleRepositoryCsvFileSelection(input) {
  const repositoryKey = cleanText(input?.dataset?.repositoryCsvInput);
  const file = input?.files?.[0] ?? null;

  if (!defaultRepositoryCsvPaths[repositoryKey] || !file) {
    if (input) {
      input.value = "";
    }
    return;
  }

  try {
    const text = await file.text();
    const desktopApi = getDesktopCampaignApi();
    const importedRelativePath = getImportedRepositoryRelativePath(repositoryKey, file.name);
    const uploadedPath = encodeUploadedRepositoryCsvPath(repositoryKey, file.name);
    const uploadRecord = {
      repositoryKey,
      path: uploadedPath,
      name: cleanText(file.name) || "custom.csv",
      text
    };

    await saveRepositoryCsvUploadRecord(uploadRecord);

    if (typeof desktopApi?.writeAssetText === "function") {
      try {
        await desktopApi.writeAssetText(importedRelativePath, text);
        setRepositoryCsvUpload(repositoryKey, null);
        updateRepositoryCsvPath(repositoryKey, importedRelativePath);
        await loadDataCsvFileOptions();
        render();
        return;
      } catch {
        // Fall back to in-memory upload override when desktop import fails.
      }
    }

    setRepositoryCsvUpload(repositoryKey, uploadRecord);
    updateRepositoryCsvPath(repositoryKey, uploadedPath);
    render();
  } catch {
    // Ignore invalid file reads and keep current source.
  } finally {
    if (input) {
      input.value = "";
    }
  }
}

function normalizeCsvHeaderKey(value) {
  return cleanText(value)
    .replace(/\uFEFF/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

const BESTIARY_CSV_HEADER_ALIASES = Object.freeze({
  Name: ["name", "nombre"],
  Source: ["source", "fuente"],
  Page: ["page", "pagina"],
  Size: ["size", "talla"],
  Type: ["type", "tipo"],
  Alignment: ["alignment", "alineacion", "alineamiento"],
  AC: ["ac", "armourclass", "armorclass", "ca", "clasdearmadura"],
  HP: ["hp", "hitpoints", "puntosdevida", "pv", "pg"],
  Speed: ["speed", "velocidad"],
  Senses: ["senses", "sentidos"],
  Languages: ["languages", "idiomas"],
  CR: ["cr", "challengerating", "challenge", "vd"],
  Environment: ["environment", "entorno"],
  "Saving Throws": ["savingthrows", "salvaciones", "tiradassalvacion"],
  Skills: ["skills", "habilidades"],
  "Damage Vulnerabilities": ["damagevulnerabilities", "vulnerabilidadesaldano"],
  "Damage Resistances": ["damageresistances", "resistenciasaldano"],
  "Damage Immunities": ["damageimmunities", "inmunidadesaldano"],
  "Condition Immunities": ["conditionimmunities", "inmunidadesacondiciones", "inmunidadesaestados"],
  Traits: ["traits", "rasgos"],
  Actions: ["actions", "acciones"],
  "Bonus Actions": ["bonusactions", "accionesbonus", "accionesadicionales"],
  Reactions: ["reactions", "reacciones"],
  "Legendary Actions": ["legendaryactions", "accioneslegendarias"],
  "Mythic Actions": ["mythicactions", "accionesmiticas"],
  "Lair Actions": ["lairactions", "accionesdeguarida"],
  "Regional Effects": ["regionaleffects", "efectosregionales"],
  Treasure: ["treasure", "tesoro"],
  Strength: ["strength", "fuerza", "str"],
  Dexterity: ["dexterity", "destreza", "dex"],
  Constitution: ["constitution", "constitucion", "con"],
  Intelligence: ["intelligence", "inteligencia", "int"],
  Wisdom: ["wisdom", "sabiduria", "wis"],
  Charisma: ["charisma", "carisma", "cha"]
});

const BESTIARY_CSV_HEADER_LOOKUP = Object.freeze(
  Object.fromEntries(
    Object.entries(BESTIARY_CSV_HEADER_ALIASES)
      .flatMap(([canonicalKey, aliases]) => aliases.map((alias) => [alias, canonicalKey]))
  )
);

function normalizeBestiaryCsvRows(rows) {
  return rows.map((row) => {
    const normalizedRow = {};

    Object.entries(isPlainObject(row) ? row : {}).forEach(([rawKey, value]) => {
      const canonicalKey = BESTIARY_CSV_HEADER_LOOKUP[normalizeCsvHeaderKey(rawKey)] || rawKey;

      if (!(canonicalKey in normalizedRow) || cleanText(normalizedRow[canonicalKey]) === "") {
        normalizedRow[canonicalKey] = value;
      }
    });

    return normalizedRow;
  });
}

function buildBestiaryImageNameIndex(imageMap) {
  const nameIndex = new Map();

  Object.entries(isPlainObject(imageMap) ? imageMap : {}).forEach(([key, value]) => {
    const normalizedKey = cleanText(key).toLowerCase();
    let namePart = "";

    if (normalizedKey.includes("||")) {
      [namePart] = normalizedKey.split("||");
    } else if (normalizedKey.includes("|")) {
      [namePart] = normalizedKey.split("|");
    }

    if (!namePart) {
      return;
    }

    const entries = nameIndex.get(namePart) ?? [];
    entries.push(value);
    nameIndex.set(namePart, entries);
  });

  return nameIndex;
}

function buildItemImageNameIndex(imageMap) {
  return buildBestiaryImageNameIndex(imageMap);
}

function buildArcanumEntryNameIndex(entryMap) {
  const nameIndex = new Map();

  Object.entries(isPlainObject(entryMap) ? entryMap : {}).forEach(([key, value]) => {
    const normalizedKey = cleanText(key).toLowerCase();
    let namePart = "";

    if (normalizedKey.includes("||")) {
      [namePart] = normalizedKey.split("||");
    } else if (normalizedKey.includes("|")) {
      [namePart] = normalizedKey.split("|");
    }

    if (!namePart) {
      return;
    }

    const entries = nameIndex.get(namePart) ?? [];
    entries.push(value);
    nameIndex.set(namePart, entries);
  });

  return nameIndex;
}

function getImageMapDirectKey(name, source) {
  return `${cleanText(name)}||${cleanText(source)}`.toLowerCase();
}

function findCompendiumImageMapEntry(imageMap, name, source, buildCompositeKey) {
  const directKey = getImageMapDirectKey(name, source);
  const compositeKey = buildCompositeKey(name, source).toLowerCase();
  const slugKey = `${slugify(name)}--${slugify(source)}`.toLowerCase();

  return imageMap?.[directKey] ?? imageMap?.[compositeKey] ?? imageMap?.[slugKey] ?? null;
}

function isUsableCompendiumImageMapEntry(entry) {
  if (typeof entry === "string") {
    return cleanText(entry).length > 0;
  }

  return isPlainObject(entry) && (
    cleanText(entry.imageUrl).length > 0
    || cleanText(entry.tokenUrl).length > 0
  );
}

function buildReusableBestiaryImageMap(rows, baseImageMap, previousCustomMap = {}, imageSourceRows = []) {
  const nextCustomMap = isPlainObject(previousCustomMap) ? { ...previousCustomMap } : {};
  const nameIndex = buildBestiaryImageNameIndex(baseImageMap);

  rows.forEach((row, index) => {
    const name = cleanText(row.Name);
    const source = cleanText(row.Source);
    const directKey = getImageMapDirectKey(name, source);
    const compositeKey = buildBestiaryCompositeKey(name, source).toLowerCase();
    const slugKey = `${slugify(name)}--${slugify(source)}`.toLowerCase();

    if (!name) {
      return;
    }

    if (
      baseImageMap[directKey]
      || baseImageMap[compositeKey]
      || baseImageMap[slugKey]
      || isUsableCompendiumImageMapEntry(nextCustomMap[directKey])
    ) {
      return;
    }

    const sourceRow = Array.isArray(imageSourceRows) ? imageSourceRows[index] : null;
    const sourceName = cleanText(sourceRow?.Name) || cleanText(row.__mimicIdentityBaseName);
    const sourceSource = cleanText(sourceRow?.Source) || cleanText(row.__mimicIdentityBaseSource) || source;
    const sourceMatch = sourceName
      ? findCompendiumImageMapEntry(baseImageMap, sourceName, sourceSource, buildBestiaryCompositeKey)
      : null;

    if (sourceMatch) {
      nextCustomMap[directKey] = sourceMatch;
      return;
    }

    const nameMatches = nameIndex.get(name.toLowerCase()) ?? [];

    if (nameMatches.length === 1) {
      nextCustomMap[directKey] = nameMatches[0];
      return;
    }

    nextCustomMap[directKey] = nextCustomMap[directKey] ?? {};
  });

  return nextCustomMap;
}

function buildReusableItemImageMap(rows, baseImageMap, previousCustomMap = {}, imageSourceRows = []) {
  const nextCustomMap = isPlainObject(previousCustomMap) ? { ...previousCustomMap } : {};
  const nameIndex = buildItemImageNameIndex(baseImageMap);

  rows.forEach((row, index) => {
    const name = cleanText(row.Name);
    const source = cleanText(row.Source);
    const directKey = getImageMapDirectKey(name, source);
    const compositeKey = buildItemCompositeKey(name, source).toLowerCase();
    const slugKey = `${slugify(name)}--${slugify(source)}`.toLowerCase();

    if (!name) {
      return;
    }

    if (
      baseImageMap[directKey]
      || baseImageMap[compositeKey]
      || baseImageMap[slugKey]
      || isUsableCompendiumImageMapEntry(nextCustomMap[directKey])
    ) {
      return;
    }

    const sourceRow = Array.isArray(imageSourceRows) ? imageSourceRows[index] : null;
    const sourceName = cleanText(sourceRow?.Name) || cleanText(row.__mimicIdentityBaseName);
    const sourceSource = cleanText(sourceRow?.Source) || cleanText(row.__mimicIdentityBaseSource) || source;
    const sourceMatch = sourceName
      ? findCompendiumImageMapEntry(baseImageMap, sourceName, sourceSource, buildItemCompositeKey)
      : null;

    if (sourceMatch) {
      nextCustomMap[directKey] = sourceMatch;
      return;
    }

    const nameMatches = nameIndex.get(name.toLowerCase()) ?? [];

    if (nameMatches.length === 1) {
      nextCustomMap[directKey] = nameMatches[0];
      return;
    }

    nextCustomMap[directKey] = nextCustomMap[directKey] ?? {};
  });

  return nextCustomMap;
}

function buildReusableArcanumMap(rows, previousCustomMap = {}) {
  const nextCustomMap = isPlainObject(previousCustomMap) ? { ...previousCustomMap } : {};
  const nameIndex = buildArcanumEntryNameIndex(nextCustomMap);

  rows.forEach((row) => {
    const name = cleanText(row.Name);
    const source = cleanText(row.Source);
    const level = cleanText(row.Level);
    const directKey = `${name}||${source}||${level}`.toLowerCase();
    const compositeKey = buildArcanumCompositeKey(name, source, level).toLowerCase();
    const slugKey = `${slugify(name)}--${slugify(source)}--${slugify(level)}`.toLowerCase();

    if (!name) {
      return;
    }

    if (nextCustomMap[directKey] || nextCustomMap[compositeKey] || nextCustomMap[slugKey]) {
      return;
    }

    const nameMatches = nameIndex.get(name.toLowerCase()) ?? [];

    if (nameMatches.length === 1) {
      nextCustomMap[directKey] = nameMatches[0];
      return;
    }

    nextCustomMap[directKey] = nextCustomMap[directKey] ?? {};
  });

  return nextCustomMap;
}

function loadStoredCompendiumCustomMap(storageKey) {
  if (typeof window === "undefined" || usesDesktopFileOnlyPersistence()) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return isPlainObject(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

function saveStoredCompendiumCustomMap(storageKey, value) {
  try {
    if (typeof window !== "undefined" && !usesDesktopFileOnlyPersistence()) {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    }
  } catch {
    // Ignore local persistence errors.
  }
}

function loadBestiaryCustomImageMap() {
  return loadStoredCompendiumCustomMap(BESTIARY_CUSTOM_IMAGE_MAP_STORAGE_KEY);
}

function saveBestiaryCustomImageMap(imageMap) {
  state.customBestiaryImageMap = isPlainObject(imageMap) ? { ...imageMap } : {};
  saveStoredCompendiumCustomMap(BESTIARY_CUSTOM_IMAGE_MAP_STORAGE_KEY, state.customBestiaryImageMap);

  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.writeAssetText === "function") {
    desktopApi.writeAssetText("data/BestiaryImages.custom.json", `${JSON.stringify(state.customBestiaryImageMap, null, 2)}\n`).catch(() => {});
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function loadItemCustomImageMap() {
  return loadStoredCompendiumCustomMap(ITEMS_CUSTOM_IMAGE_MAP_STORAGE_KEY);
}

function saveItemCustomImageMap(imageMap) {
  state.customItemImageMap = isPlainObject(imageMap) ? { ...imageMap } : {};
  saveStoredCompendiumCustomMap(ITEMS_CUSTOM_IMAGE_MAP_STORAGE_KEY, state.customItemImageMap);

  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.writeAssetText === "function") {
    desktopApi.writeAssetText("data/ItemsImages.custom.json", `${JSON.stringify(state.customItemImageMap, null, 2)}\n`).catch(() => {});
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function loadArcanumCustomMap() {
  return loadStoredCompendiumCustomMap(ARCANUM_CUSTOM_MAP_STORAGE_KEY);
}

function saveArcanumCustomMap(arcanumMap) {
  state.customArcanumMap = isPlainObject(arcanumMap) ? { ...arcanumMap } : {};
  saveStoredCompendiumCustomMap(ARCANUM_CUSTOM_MAP_STORAGE_KEY, state.customArcanumMap);

  const desktopApi = getDesktopCampaignApi();

  if (typeof desktopApi?.writeAssetText === "function") {
    desktopApi.writeAssetText("data/Spells.custom.json", `${JSON.stringify(state.customArcanumMap, null, 2)}\n`).catch(() => {});
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function reloadCompendiumContent() {
  resetBestiaryVirtualScroll();
  resetItemVirtualScroll();
  resetArcanumVirtualScroll();
  resetBestiaryRenderCache();
  const requiredKinds = new Set(getRequiredCompendiumsForScreen(state.activeScreen));
  const shouldReloadItems = state.itemStatus !== "idle" || requiredKinds.has("items");
  const shouldReloadArcanum = state.arcanumStatus !== "idle" || requiredKinds.has("arcanum");

  loadBestiary();

  if (shouldReloadItems) {
    window.setTimeout(() => loadItems(), 80);
  }

  if (shouldReloadArcanum) {
    window.setTimeout(() => loadArcanum(), 160);
  }
}

function unloadCompendiumContent() {
  compendiumLoadGeneration += 1;
  queuedCompendiumLoads.clear();
  compendiumLoadTokens.bestiary += 1;
  compendiumLoadTokens.items += 1;
  compendiumLoadTokens.arcanum += 1;
  compendiumLoadPromises.bestiary = null;
  compendiumLoadPromises.items = null;
  compendiumLoadPromises.arcanum = null;
  state.bestiary = [];
  state.bestiaryImageMap = {};
  state.bestiarySelectedId = "";
  state.bestiaryStatus = "idle";
  state.bestiaryMessage = "";
  state.bestiaryDebugInfo = null;
  state.items = [];
  state.itemImageMap = {};
  state.itemSelectedId = "";
  state.itemStatus = "idle";
  state.itemMessage = "";
  state.itemDebugInfo = null;
  state.arcanum = [];
  state.arcanumSelectedId = "";
  state.arcanumStatus = "idle";
  state.arcanumMessage = "";
  state.arcanumDebugInfo = null;
  state.contentSourceMeta = {
    bestiary: { ...blankContentSourceMeta },
    items: { ...blankContentSourceMeta },
    arcanum: { ...blankContentSourceMeta }
  };
  arcanumSpellLinkCache = {
    signature: "",
    pattern: null,
    namesByLower: new Map()
  };
  resetBestiaryVirtualScroll();
  resetItemVirtualScroll();
  resetArcanumVirtualScroll();
  resetBestiaryRenderCache();
}

async function getLocalizedCompendiumRows(kind, csvText, relativePath) {
  const baseRows = parseCsv(csvText);
  const detectedLanguage = detectCsvContentLanguage(baseRows, kind);
  const targetLanguage = normalizeStoredContentLanguage(state.contentLanguage);
  const isUploadedCsv = cleanText(relativePath).toLowerCase().startsWith("uploaded:");
  const isDefaultRepositoryCsv = Object.values(defaultRepositoryCsvPaths)
    .some((defaultPath) => normalizeDataCsvRelativePath(defaultPath) === normalizeDataCsvRelativePath(relativePath));
  const canUseBundledSpanishSidecar = !isExternalRepositoryCsvPath(relativePath)
    && !isUploadedCsv
    && isDefaultRepositoryCsv
    && targetLanguage === CONTENT_LANGUAGE_ES
    && detectedLanguage === CONTENT_LANGUAGE_EN;
  const canUseBundledSpanishIdentitySidecar = !isExternalRepositoryCsvPath(relativePath)
    && !isUploadedCsv
    && isDefaultRepositoryCsv
    && detectedLanguage === CONTENT_LANGUAGE_EN;

  if (detectedLanguage === targetLanguage) {
    return {
      rows: canUseBundledSpanishIdentitySidecar
        ? await attachBundledSpanishIdentityRows(kind, baseRows, relativePath)
        : baseRows,
      imageSourceRows: [],
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_ORIGINAL,
        sidecarPath: "",
        message: ""
      }
    };
  }

  if (!canUseBundledSpanishSidecar) {
    return {
      rows: translateCompendiumRows(baseRows, kind, targetLanguage),
      imageSourceRows: detectedLanguage === CONTENT_LANGUAGE_EN && targetLanguage === CONTENT_LANGUAGE_ES ? baseRows : [],
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_GLOSSARY,
        sidecarPath: "",
        message: "Compendium source language differs from current data language; local glossary applied."
      }
    };
  }

  const sidecarPath = getLocalizedCsvRelativePath(relativePath, CONTENT_LANGUAGE_ES);

  try {
    const sidecarText = await loadTextAsset(getDataAssetUrl(sidecarPath), sidecarPath);
    const sidecarRows = parseCsv(sidecarText);

    if (!isCompendiumTranslationSidecarUsable(baseRows, sidecarRows, kind)) {
      throw new Error("Spanish sidecar CSV is incompatible with base CSV.");
    }

    return {
      rows: mergeCompendiumTranslationRows(baseRows, sidecarRows, kind),
      imageSourceRows: baseRows,
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_SIDECAR,
        sidecarPath,
        message: ""
      }
    };
  } catch {
    return {
      rows: translateCompendiumRows(baseRows, kind, targetLanguage),
      imageSourceRows: detectedLanguage === CONTENT_LANGUAGE_EN && targetLanguage === CONTENT_LANGUAGE_ES ? baseRows : [],
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_GLOSSARY,
        sidecarPath: "",
        message: "Spanish sidecar CSV missing or incompatible; local glossary applied."
      }
    };
  }
}

async function attachBundledSpanishIdentityRows(kind, baseRows, relativePath) {
  const sidecarPath = getLocalizedCsvRelativePath(relativePath, CONTENT_LANGUAGE_ES);

  if (!sidecarPath) {
    return baseRows;
  }

  try {
    const sidecarText = await loadTextAsset(getDataAssetUrl(sidecarPath), sidecarPath);
    const sidecarRows = parseCsv(sidecarText);

    if (!isCompendiumTranslationSidecarUsable(baseRows, sidecarRows, kind)) {
      return baseRows;
    }

    return attachCompendiumTranslationIdentityRows(baseRows, sidecarRows, kind);
  } catch {
    return baseRows;
  }
}

function getLocalizedCsvRelativePath(relativePath, language) {
  if (isExternalRepositoryCsvPath(relativePath) || cleanText(relativePath).toLowerCase().startsWith("uploaded:")) {
    return "";
  }

  const normalizedPath = normalizeDataCsvRelativePath(relativePath);
  return language === CONTENT_LANGUAGE_ES
    ? normalizedPath.replace(/\.csv$/i, "_ES.csv")
    : normalizedPath.replace(/_ES\.csv$/i, ".csv");
}

function getDataAssetUrl(relativePath) {
  if (isExternalRepositoryCsvPath(relativePath)) {
    return "";
  }

  const normalizedPath = normalizeDataCsvRelativePath(relativePath);

  if (!normalizedPath) {
    return "";
  }

  return DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/${normalizedPath}` : normalizedPath;
}

function normalizeDataCsvRelativePath(value) {
  const normalizedPath = cleanText(value)
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^\/+/, "");

  if (!normalizedPath) {
    return "";
  }

  const withDataPrefix = normalizedPath.toLowerCase().startsWith("data/")
    ? normalizedPath
    : `data/${normalizedPath}`;

  return /\.csv$/i.test(withDataPrefix) ? withDataPrefix : "";
}

async function loadRepositoryCsvText(pathValue, repositoryKey = "") {
  const upload = repositoryKey ? getRepositoryCsvUpload(repositoryKey) : null;

  if (upload?.text && (!pathValue || cleanText(upload.path) === cleanText(pathValue) || isUploadedRepositoryCsvPath(pathValue))) {
    return upload.text;
  }

  if (repositoryKey && isUploadedRepositoryCsvPath(pathValue)) {
    const restoredUpload = await ensureRepositoryCsvUploadLoaded(repositoryKey, pathValue);

    if (restoredUpload?.text) {
      return restoredUpload.text;
    }
  }

  if (isExternalRepositoryCsvPath(pathValue)) {
    const desktopApi = getDesktopCampaignApi();
    const externalPath = decodeExternalRepositoryCsvPath(pathValue);

    if (typeof desktopApi?.readRepositoryCsvText !== "function" || !externalPath) {
      throw new Error("Desktop CSV reader not available.");
    }

    return desktopApi.readRepositoryCsvText(externalPath);
  }

  return loadTextAsset(getDataAssetUrl(pathValue), pathValue);
}

function canUseVersionedCompendiumBundle(repositoryKey, pathValue) {
  const normalizedRepositoryKey = cleanText(repositoryKey).toLowerCase();
  const defaultPath = defaultRepositoryCsvPaths[normalizedRepositoryKey];
  const upload = getRepositoryCsvUpload(normalizedRepositoryKey);

  if (
    !defaultPath
    || DESKTOP_ASSET_BASE_URL
    || HAS_DESKTOP_EXTERNAL_ASSETS
    || IS_FILE_PROTOCOL_RUNTIME
    || upload?.text
    || isExternalRepositoryCsvPath(pathValue)
    || isUploadedRepositoryCsvPath(pathValue)
  ) {
    return false;
  }

  return normalizeDataCsvRelativePath(pathValue) === normalizeDataCsvRelativePath(defaultPath);
}

async function loadLocalizedRepositoryRows(repositoryKey, kind, csvRelativePath) {
  if (canUseVersionedCompendiumBundle(repositoryKey, csvRelativePath)) {
    try {
      const bundle = await loadVersionedCompendiumBundle(
        repositoryKey,
        normalizeStoredContentLanguage(state.contentLanguage)
      );

      if (bundle) {
        return {
          rows: bundle.rows,
          imageSourceRows: [],
          meta: bundle.meta,
          loaderMode: "versioned JSON bundle"
        };
      }
    } catch {
      // Keep editable CSV path as resilient fallback.
    }
  }

  const text = await loadRepositoryCsvText(csvRelativePath, repositoryKey);
  const localizedRows = await getLocalizedCompendiumRows(kind, text, csvRelativePath);

  return {
    ...localizedRows,
    loaderMode: isExternalRepositoryCsvPath(csvRelativePath)
      ? "desktopApi.readRepositoryCsvText"
      : "desktopApi.readAssetText -> fetch"
  };
}

function addCompendiumEntryOrigin(repositoryKey, row, entry, baseRowKeys) {
  const identityRow = {
    ...row,
    Name: cleanText(row?.__mimicIdentityBaseName) || cleanText(row?.Name),
    Source: cleanText(row?.__mimicIdentityBaseSource) || cleanText(row?.Source),
    Level: cleanText(row?.__mimicIdentityBaseLevel) || cleanText(row?.Level)
  };
  const repositoryRowKey = getCloudCatalogCompendiumRowKey(repositoryKey, identityRow);
  return {
    ...entry,
    repositoryKey,
    repositoryRowKey,
    isCustom: baseRowKeys instanceof Set ? !baseRowKeys.has(repositoryRowKey) : false
  };
}

async function loadBestiary() {
  const loadToken = ++compendiumLoadTokens.bestiary;
  state.bestiaryStatus = "loading";
  state.bestiaryMessage = "";
  state.bestiaryDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("bestiary");
    const [localizedData, imageMap, persistedCustomMap, baseRowKeys] = await Promise.all([
      loadLocalizedRepositoryRows("bestiary", "bestiary", csvRelativePath),
      loadBestiaryImages(),
      loadBestiaryPersistedCustomImageMap(),
      canUseVersionedCompendiumBundle("bestiary", csvRelativePath)
        ? Promise.resolve(null)
        : getCloudCatalogBaseRowKeys("bestiary")
    ]);
    const { rows, imageSourceRows, meta } = localizedData;

    if (loadToken !== compendiumLoadTokens.bestiary) {
      return;
    }

    const normalizedRows = normalizeBestiaryCsvRows(rows);
    const normalizedImageSourceRows = normalizeBestiaryCsvRows(imageSourceRows);
    const reusableCustomMap = buildReusableBestiaryImageMap(normalizedRows, imageMap, persistedCustomMap, normalizedImageSourceRows);
    const mergedImageMap = {
      ...imageMap,
      ...reusableCustomMap
    };

    saveBestiaryCustomImageMap(reusableCustomMap);

    state.bestiaryImageMap = mergedImageMap;
    state.contentSourceMeta.bestiary = meta;
    state.bestiary = normalizedRows.map((row, index) => addCompendiumEntryOrigin(
      "bestiary",
      row,
      normalizeBestiaryEntry(row, index, mergedImageMap, {
        isPackagedDesktopApp: isPackagedDesktopApp()
      }),
      baseRowKeys
    ));
    hydrateBestiaryStaticOptions();
    resetBestiaryRenderCache();
    state.bestiaryStatus = "ready";
    state.bestiaryDebugInfo = null;
    state.bestiarySelectedId = state.bestiary[0]?.id ?? "";
    reconcileEncounterRowsWithCurrentBestiaryReferences();
    reconcileCombatantsWithCurrentBestiaryReferences();
    render();
  } catch (error) {
    if (loadToken !== compendiumLoadTokens.bestiary) {
      return;
    }

    const csvRelativePath = getRepositoryCsvPath("bestiary");
    state.bestiaryStatus = "error";
    state.bestiaryMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.bestiaryDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Bestiario",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: getRepositoryCsvDisplayPath(csvRelativePath),
      loaderMode: isExternalRepositoryCsvPath(csvRelativePath) ? "desktopApi.readRepositoryCsvText" : "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadItems() {
  const loadToken = ++compendiumLoadTokens.items;
  state.itemStatus = "loading";
  state.itemMessage = "";
  state.itemDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("items");
    const [localizedData, imageMap, persistedCustomMap, baseRowKeys] = await Promise.all([
      loadLocalizedRepositoryRows("items", "items", csvRelativePath),
      loadItemImages(),
      loadItemPersistedCustomImageMap(),
      canUseVersionedCompendiumBundle("items", csvRelativePath)
        ? Promise.resolve(null)
        : getCloudCatalogBaseRowKeys("items")
    ]);
    const { rows, imageSourceRows, meta } = localizedData;

    if (loadToken !== compendiumLoadTokens.items) {
      return;
    }

    const reusableCustomMap = buildReusableItemImageMap(rows, imageMap, persistedCustomMap, imageSourceRows);
    const mergedImageMap = {
      ...imageMap,
      ...reusableCustomMap
    };

    saveItemCustomImageMap(reusableCustomMap);

    state.itemImageMap = mergedImageMap;
    state.contentSourceMeta.items = meta;
    state.items = rows.map((row, index) => addCompendiumEntryOrigin(
      "items",
      row,
      normalizeItemEntry(row, index, mergedImageMap, {
        contentLanguage: state.contentLanguage
      }),
      baseRowKeys
    ));
    resetItemVirtualScroll();
    state.itemStatus = "ready";
    state.itemDebugInfo = null;
    state.itemSelectedId = state.items[0]?.id ?? "";
    reconcileCharactersWithCurrentCompendiumReferences();
    render();
  } catch (error) {
    if (loadToken !== compendiumLoadTokens.items) {
      return;
    }

    const csvRelativePath = getRepositoryCsvPath("items");
    state.itemStatus = "error";
    state.itemMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.itemDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Items",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: getRepositoryCsvDisplayPath(csvRelativePath),
      loaderMode: isExternalRepositoryCsvPath(csvRelativePath) ? "desktopApi.readRepositoryCsvText" : "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadArcanum() {
  const loadToken = ++compendiumLoadTokens.arcanum;
  state.arcanumStatus = "loading";
  state.arcanumMessage = "";
  state.arcanumDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("arcanum");
    const [localizedData, persistedCustomMap, baseRowKeys] = await Promise.all([
      loadLocalizedRepositoryRows("arcanum", "arcanum", csvRelativePath),
      loadArcanumPersistedCustomMap(),
      canUseVersionedCompendiumBundle("arcanum", csvRelativePath)
        ? Promise.resolve(null)
        : getCloudCatalogBaseRowKeys("arcanum")
    ]);
    const { rows, meta } = localizedData;

    if (loadToken !== compendiumLoadTokens.arcanum) {
      return;
    }

    const reusableCustomMap = buildReusableArcanumMap(rows, persistedCustomMap);

    saveArcanumCustomMap(reusableCustomMap);

    state.contentSourceMeta.arcanum = meta;
    state.arcanum = rows.map((row, index) => addCompendiumEntryOrigin(
      "arcanum",
      row,
      normalizeSpellEntry(row, index),
      baseRowKeys
    ));
    resetBestiaryRenderCache();
    state.arcanumStatus = "ready";
    state.arcanumDebugInfo = null;
    state.arcanumSelectedId = state.arcanum[0]?.id ?? "";
    reconcileCharactersWithCurrentCompendiumReferences();
    render();
  } catch (error) {
    if (loadToken !== compendiumLoadTokens.arcanum) {
      return;
    }

    const csvRelativePath = getRepositoryCsvPath("arcanum");
    state.arcanumStatus = "error";
    state.arcanumMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.arcanumDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Arcanum",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: getRepositoryCsvDisplayPath(csvRelativePath),
      loaderMode: isExternalRepositoryCsvPath(csvRelativePath) ? "desktopApi.readRepositoryCsvText" : "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadBestiaryImages() {
  return loadJsonAsset(BESTIARY_IMAGES_PATH, "data/BestiaryImages.json");
}

async function loadBestiaryPersistedCustomImageMap() {
  const customImageMap = await loadJsonAsset(getDataAssetUrl("data/BestiaryImages.custom.json"), "data/BestiaryImages.custom.json");

  return {
    ...customImageMap,
    ...state.customBestiaryImageMap
  };
}

async function loadItemImages() {
  return loadJsonAsset(ITEMS_IMAGES_PATH, "data/ItemsImages.json");
}

async function loadItemPersistedCustomImageMap() {
  const customImageMap = await loadJsonAsset(getDataAssetUrl("data/ItemsImages.custom.json"), "data/ItemsImages.custom.json");

  return {
    ...customImageMap,
    ...state.customItemImageMap
  };
}

async function loadArcanumPersistedCustomMap() {
  const customMap = await loadJsonAsset(getDataAssetUrl("data/Spells.custom.json"), "data/Spells.custom.json");

  return {
    ...customMap,
    ...state.customArcanumMap
  };
}

function getItemEntryByName(name) {
  const normalizedName = normalizeSearchText(name);

  if (!normalizedName) {
    return null;
  }

  const items = getCurrentCompendiumEntries("items");

  if (items.length === 0) {
    return null;
  }

  return items.find((entry) => getCompendiumEntryNameAliases(entry).includes(normalizedName)) ?? null;
}

function getArcanumEntryByName(name) {
  const normalizedName = normalizeSearchText(name);

  if (!normalizedName) {
    return null;
  }

  const arcanum = getCurrentCompendiumEntries("arcanum");

  if (arcanum.length === 0) {
    return null;
  }

  return arcanum.find((entry) => getCompendiumEntryNameAliases(entry).includes(normalizedName)) ?? null;
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
                  ${escapeHtml(t("filter_clear_short"))}
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
      <span>${escapeHtml(t("bestiary_search_label"))}</span>
      <div class="bestiary-filter__controls bestiary-query__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.bestiaryFilters.query)}"
          placeholder="${escapeHtml(t("bestiary_search_placeholder"))}"
          data-bestiary-query
        />
        ${renderBestiarySortButton("name", "Ordenar por nombre")}
        <button
          class="toolbar-button bestiary-create-button"
          type="button"
          data-action="open-create-compendium-entity"
          data-repository-key="bestiary"
        >
          ${escapeHtml(t("create_creature"))}
        </button>
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
                  ${escapeHtml(t("filter_clear_short"))}
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
      title="Filtrar por objetos con o sin sintonizacion"
    >
      ${label}
    </button>
  `;
}

function renderItemQueryField() {
  const suggestions = getItemNameSuggestions();

  return `
    <div class="toolbar-field toolbar-field--search bestiary-query" data-item-query-menu>
      <span>${escapeHtml(t("items_search_label"))}</span>
      <div class="bestiary-filter__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.itemFilters.query)}"
          placeholder="${escapeHtml(t("items_search_placeholder"))}"
          data-item-query
        />
        ${renderItemSortButton("name", "Ordenar por nombre")}
      </div>
      ${
        state.showItemQuerySuggestions && suggestions.length > 0
          ? `
            <div class="bestiary-query__popover" role="listbox" aria-label="Sugerencias de objeto">
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
                  ${escapeHtml(t("filter_clear_short"))}
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
      <span>${escapeHtml(t("arcanum_search_label"))}</span>
      <div class="bestiary-filter__controls arcanum-query__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.arcanumFilters.query)}"
          placeholder="${escapeHtml(t("arcanum_search_placeholder"))}"
          data-arcanum-query
        />
        ${renderArcanumSortButton("name", "Ordenar por nombre")}
        <button class="toolbar-button bestiary-toolbar__clear" type="button" data-action="clear-arcanum-filters">${escapeHtml(t("bestiary_clear_filters"))}</button>
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
        return entry.environmentTokens.map((value) => getBestiaryEnvironmentFilterValue(value));
      }

      if (key === "crBase") {
        return [entry.crBaseLabel];
      }

      if (key === "type") {
        return [getBestiaryTypeFilterValue(entry.type)].filter(Boolean);
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
  const search = normalizeSearchText(state.bestiaryFilterSearch[key]);
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

    return normalizeSearchText(value).includes(search) || normalizeSearchText(displayValue).includes(search);
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
  const query = normalizeSearchText(state.bestiaryFilters.query);

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
      .filter((entry) => getBestiaryEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .map((entry) => entry.name)
    : bestiaryRenderCache.staticOptions.names.filter((name) => normalizeSearchText(name).includes(query));

  const suggestions = [...new Set(suggestionSource)];

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
    normalizeSearchText(filters.query),
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
    getItemEntriesForFilterOptions(key).map((entry) => key === "rarity" ? normalizeItemRarityFilterValue(entry.rarityLabel) : entry[key]).filter(Boolean)
  )].sort((left, right) => compareItemFilterValues(key, left, right));
}

function getItemEntriesForFilterOptions(key) {
  return state.items.filter((entry) => matchesItemFilters(entry, { [key]: [] }));
}

function getVisibleItemFilterOptions(key) {
  const search = normalizeSearchText(state.itemFilterSearch[key]);

  return getItemFilterOptions(key).filter((value) => {
    const displayValue = getItemFilterDisplayValue(key, value).toLowerCase();

    if (!search) {
      return true;
    }

    return normalizeSearchText(value).includes(search) || normalizeSearchText(displayValue).includes(search);
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
  const query = normalizeSearchText(state.itemFilters.query);

  if (!query) {
    return [];
  }

  const suggestionSource = hasItemConstraintsBesides("query")
    ? state.items
      .filter((entry) => matchesItemFilters(entry, { query: "" }))
      .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .map((entry) => entry.name)
    : state.items
      .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .map((entry) => entry.name);

  return [...new Set(suggestionSource)];
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
    state.bestiary.map((entry) => getBestiaryTypeFilterValue(entry.type)).filter(Boolean)
  )].sort((left, right) => compareBestiaryFilterValues("type", left, right));

  bestiaryRenderCache.staticOptions.environment = [...new Set(
    state.bestiary.flatMap((entry) => entry.environmentTokens.map((value) => getBestiaryEnvironmentFilterValue(value))).filter(Boolean)
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
        return [entry.castingTime];
      }

      return [entry[key]];
    }).filter(Boolean)
  )]
    .filter((value) => key !== "level" || !excludedArcanumLevelFilterValues.has(value))
    .sort((left, right) => compareArcanumFilterValues(key, left, right));
}

function getArcanumEntriesForFilterOptions(key) {
  return state.arcanum.filter((entry) => matchesArcanumFilters(entry, { [key]: [] }));
}

function getVisibleArcanumFilterOptions(key) {
  const search = normalizeSearchText(state.arcanumFilterSearch[key]);

  return getArcanumFilterOptions(key).filter((value) => {
    const displayValue = getArcanumFilterDisplayValue(key, value).toLowerCase();

    if (!search) {
      return true;
    }

    return normalizeSearchText(value).includes(search) || normalizeSearchText(displayValue).includes(search);
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
  const query = normalizeSearchText(state.arcanumFilters.query);

  if (!query) {
    return [];
  }

  const suggestionSource = hasArcanumConstraintsBesides("query")
    ? state.arcanum
      .filter((entry) => matchesArcanumFilters(entry, { query: "" }))
      .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .map((entry) => entry.name)
    : state.arcanum
      .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(query)))
      .map((entry) => entry.name);

  return [...new Set(suggestionSource)];
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

function getEnemyHitPointValue(entry) {
  const fixedValue = Math.max(1, toNumber(entry?.hpValue) || parseLeadingNumber(entry?.hp) || 1);

  if (state.enemyHpMode !== ENEMY_HP_MODE_VARIABLE) {
    return fixedValue;
  }

  const rolledValue = rollHitPointDiceFormula(parseHitPointDiceFormula(entry?.hp));
  return Math.max(1, rolledValue || fixedValue);
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

function getBestiaryTypeFilterValue(value) {
  const baseType = cleanText(value).replace(/\s*\([^)]*\)\s*$/u, "").trim();
  const normalizedType = normalizeSearchText(baseType);

  if (!baseType || normalizedType === "rezumar") {
    return "";
  }

  if (normalizedType.startsWith("enjambre")) {
    return "Enjambre";
  }

  if (normalizedType.startsWith("celestial")) {
    return "Celestial";
  }

  if (normalizedType === "no muertos" || normalizedType === "no-muertos") {
    return "No-muerto";
  }

  return baseType;
}

function getBestiaryEnvironmentFilterValue(value) {
  const baseEnvironment = cleanText(value).replace(/\s*\([^)]*\)\s*$/u, "").trim();
  const normalizedEnvironment = normalizeSearchText(baseEnvironment);

  if (["urbano", "urbana", "urbanos"].includes(normalizedEnvironment)) {
    return "URBANO";
  }

  return baseEnvironment;
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
  if (key === "rarity") {
    return normalizeItemRarityFilterValue(value);
  }

  if (key === "type") {
    if (isItemTypeTokenFilterValue(value)) {
      return decodeItemTypeTokenFilterValue(value);
    }

    const group = ITEM_TYPE_GROUPS.find((item) => item.value === value);

    if (group) {
      return getItemTypeGroupLabel(group);
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

function normalizeItemRarityFilterValue(value) {
  const rarity = cleanText(value);
  const normalizedRarity = normalizeSearchText(rarity);

  if (["variable", "extrano", "ninguno"].includes(normalizedRarity)) {
    return "DESCONOCIDA";
  }

  return rarity;
}

function getItemTypeGroupLabel(group) {
  return normalizeStoredContentLanguage(state.contentLanguage) === CONTENT_LANGUAGE_ES
    ? cleanText(group.labelEs) || group.label
    : group.label;
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

function getItemTypeFilterValueFromToken(token) {
  const normalizedToken = cleanText(token);

  if (!normalizedToken) {
    return "";
  }

  const group = ITEM_TYPE_GROUPS.find((item) => getItemTypeGroupLabel(item).localeCompare(normalizedToken, "es", { sensitivity: "base" }) === 0
    || item.label.localeCompare(normalizedToken, "es", { sensitivity: "base" }) === 0);

  if (group) {
    return group.value;
  }

  return `${ITEM_TYPE_TOKEN_FILTER_PREFIX}${normalizedToken}`;
}

function isItemTypeTokenFilterActive(token) {
  const filterValue = getItemTypeFilterValueFromToken(token);
  return Boolean(filterValue) && (state.itemFilters.type ?? []).includes(filterValue);
}

function isItemTypeTokenFilterValue(value) {
  return cleanText(value).startsWith(ITEM_TYPE_TOKEN_FILTER_PREFIX);
}

function decodeItemTypeTokenFilterValue(value) {
  return cleanText(value).replace(ITEM_TYPE_TOKEN_FILTER_PREFIX, "");
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
  if (isItemTypeTokenFilterValue(value)) {
    const token = decodeItemTypeTokenFilterValue(value).toLowerCase();
    return splitItemTypeFilterTokens(entry.type).some((part) => part.toLowerCase() === token);
  }

  const group = ITEM_TYPE_GROUPS.find((item) => item.value === value);

  if (group) {
    return group.matches(entry.type);
  }

  return entry.type === value;
}

function splitItemTypeFilterTokens(value) {
  const rawValue = cleanText(value);

  if (!rawValue) {
    return [];
  }

  const tokens = [];
  let currentToken = "";
  let parenthesisDepth = 0;

  for (const char of rawValue) {
    if (char === "(") {
      parenthesisDepth += 1;
      currentToken += char;
      continue;
    }

    if (char === ")") {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      currentToken += char;
      continue;
    }

    if ((char === "," || char === "|") && parenthesisDepth === 0) {
      const nextToken = cleanText(currentToken);

      if (nextToken) {
        tokens.push(nextToken);
      }

      currentToken = "";
      continue;
    }

    currentToken += char;
  }

  const lastToken = cleanText(currentToken);

  if (lastToken) {
    tokens.push(lastToken);
  }

  return [...new Set(tokens)];
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
    return compareSpellCastingSpeed(getSpellCastingSpeed(left), getSpellCastingSpeed(right))
      || left.localeCompare(right, "es", { numeric: true, sensitivity: "base" });
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

function getCloudErrorMessage(error) {
  const messages = {
    invalid_asset_type: "La imagen seleccionada no es compatible.",
    invalid_profile_image: "No se pudo usar esa imagen de perfil.",
    invalid_profile_name: "El nombre debe tener entre 2 y 80 caracteres.",
    asset_not_found: "La imagen cloud no esta disponible.",
    invalid_registration_code: "Código de registro incorrecto.",
    unauthorized: "La sesión ha caducado. Inicia sesión de nuevo.",
    revision_conflict: "Esta campaña cambió en otra sesión. Recárgala antes de guardar.",
    campaign_limit: "Has alcanzado el límite de campañas cloud.",
    campaign_too_large: "La campaña supera el límite cloud de 24 MB después de separar las imágenes.",
    payload_too_large: "Los datos enviados superan el límite cloud permitido.",
    library_entry_too_large: "El contenido supera el límite cloud de 16 MB.",
    library_entry_limit: "Has alcanzado el límite de publicaciones cloud.",
    library_revision_conflict: "La publicación cambió en otra sesión. Actualiza antes de modificarla.",
    storage_quota: "Has alcanzado tu cuota de almacenamiento cloud.",
    asset_too_large: "Una imagen supera el límite cloud de 5 MB después de convertirla.",
    asset_storage_unavailable: "El almacenamiento de imágenes cloud no está disponible.",
    server_not_configured: "Servicio cloud pendiente de configuración.",
    auth_unavailable: "Servicio de acceso no disponible.",
    cloud_unavailable: "Cuentas cloud solo disponibles en versión web."
  };

  if (error instanceof CloudApiError) {
    return messages[error.code] || cleanText(error.message) || "Error de servicio cloud.";
  }

  return cleanText(error?.message) || "Error de servicio cloud.";
}

function isEmbeddedImageDataUrl(value) {
  return typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

async function decodeCloudImage(blob) {
  if (typeof window.createImageBitmap === "function") {
    const bitmap = await window.createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close()
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl)
  };
}

async function convertEmbeddedImageToWebp(dataUrl) {
  const sourceBlob = await fetch(dataUrl).then((response) => response.blob());
  const decoded = await decodeCloudImage(sourceBlob);
  const maxDimension = 1024;
  const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height, 1));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    decoded.close();
    throw new Error("No se pudo convertir una imagen para la nube.");
  }

  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.close();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("El navegador no pudo generar WebP.")),
      "image/webp",
      0.82
    );
  });
  return { blob, width, height };
}

async function uploadEmbeddedImageToCloud(dataUrl) {
  if (!cloudImageUploadCache.has(dataUrl)) {
    const upload = (async () => {
      const converted = await convertEmbeddedImageToWebp(dataUrl);
      const result = await uploadCloudImage(converted.blob, converted);
      return cleanText(result?.asset?.url);
    })();
    cloudImageUploadCache.set(dataUrl, upload);
    upload.catch(() => cloudImageUploadCache.delete(dataUrl));
  }

  return cloudImageUploadCache.get(dataUrl);
}

async function preparePayloadImagesForCloud(value, seen = new WeakMap()) {
  if (isEmbeddedImageDataUrl(value)) {
    return uploadEmbeddedImageToCloud(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const output = [];
    seen.set(value, output);

    for (const entry of value) {
      output.push(await preparePayloadImagesForCloud(entry, seen));
    }

    return output;
  }

  const output = {};
  seen.set(value, output);

  for (const [key, entry] of Object.entries(value)) {
    output[key] = await preparePayloadImagesForCloud(entry, seen);
  }

  return output;
}

function getCloudCatalogCompendiumType(repositoryKey) {
  return {
    bestiary: "monster",
    items: "item",
    arcanum: "spell"
  }[repositoryKey] || "";
}

function getCloudCatalogCompendiumRowKey(repositoryKey, row) {
  const parts = [cleanText(row?.Name), cleanText(row?.Source)];

  if (repositoryKey === "arcanum") {
    parts.push(cleanText(row?.Level));
  }

  return parts.map((part) => normalizeSearchText(part)).join("||");
}

async function getCloudCatalogBaseRowKeys(repositoryKey) {
  if (!cloudCatalogBaseKeysPromiseByRepository.has(repositoryKey)) {
    const relativePath = defaultRepositoryCsvPaths[repositoryKey];
    const localizedPath = getLocalizedCsvRelativePath(relativePath, CONTENT_LANGUAGE_ES);
    const paths = [...new Set([relativePath, localizedPath].filter(Boolean))];
    const promise = Promise.all(paths.map((path) => (
      loadTextAsset(getDataAssetUrl(path), path)
        .then((text) => parseCsv(text))
        .catch(() => [])
    ))).then((rowGroups) => {
      const keys = new Set(rowGroups
        .flat()
        .map((row) => getCloudCatalogCompendiumRowKey(repositoryKey, row))
        .filter(Boolean));
      cloudCatalogBaseKeysByRepository.set(repositoryKey, keys);
      return keys;
    });
    cloudCatalogBaseKeysPromiseByRepository.set(repositoryKey, promise);
  }

  return cloudCatalogBaseKeysPromiseByRepository.get(repositoryKey);
}

function getCloudCatalogRepositoryKeyForType(type) {
  return {
    monster: "bestiary",
    item: "items",
    spell: "arcanum"
  }[cleanText(type).toLowerCase()] || "";
}

function isBundledBaseCloudCatalogDescriptor(entry) {
  const type = cleanText(entry?.type).toLowerCase();
  const repositoryKey = getCloudCatalogRepositoryKeyForType(type);
  const prefix = `compendium:${type}:`;
  const sourceEntityKey = cleanText(entry?.sourceEntityKey || entry?.key);

  return Boolean(
    repositoryKey
    && sourceEntityKey.startsWith(prefix)
    && cloudCatalogBaseKeysByRepository.get(repositoryKey)?.has(sourceEntityKey.slice(prefix.length))
  );
}

async function filterBundledBaseCloudCatalogEntries(entries) {
  const source = Array.isArray(entries) ? entries : [];
  const repositoryKeys = [...new Set(source
    .filter((entry) => entry?.entryKind === "campaign" && cleanText(entry?.sourceEntityKey).startsWith("compendium:"))
    .map((entry) => getCloudCatalogRepositoryKeyForType(entry?.type))
    .filter(Boolean))];
  await Promise.all(repositoryKeys.map((repositoryKey) => getCloudCatalogBaseRowKeys(repositoryKey)));

  return source.filter((entry) => {
    if (entry?.entryKind !== "campaign") {
      return true;
    }

    return !isBundledBaseCloudCatalogDescriptor(entry);
  });
}

function getCloudCatalogCompendiumAssets(payload, repositoryKey, row) {
  const customMaps = isPlainObject(payload?.compendiumCustomMaps) ? payload.compendiumCustomMaps : {};
  const map = isPlainObject(customMaps[repositoryKey]) ? customMaps[repositoryKey] : {};
  const mapKey = getCloudCatalogCompendiumRowKey(repositoryKey, row);
  const legacyMapKey = [cleanText(row?.Name), cleanText(row?.Source), repositoryKey === "arcanum" ? cleanText(row?.Level) : ""]
    .filter((part, index) => index < 2 || part)
    .join("||")
    .toLowerCase();
  const direct = isPlainObject(map[mapKey])
    ? map[mapKey]
    : isPlainObject(map[legacyMapKey])
      ? map[legacyMapKey]
      : {};

  if (repositoryKey === "bestiary") {
    return {
      imageUrl: cleanText(direct.imageUrl),
      tokenUrl: cleanText(direct.tokenUrl)
    };
  }

  if (repositoryKey === "items") {
    return { imageUrl: cleanText(direct.imageUrl) };
  }

  return {};
}

function getCloudCatalogCharacterDescription(character) {
  const classes = Array.isArray(character?.classEntries)
    ? character.classEntries
      .map((entry) => {
        const name = cleanText(entry?.name);
        const level = Math.max(1, Math.floor(toNumber(entry?.level) || 1));
        return name ? `${name} ${level}` : "";
      })
      .filter(Boolean)
    : [];
  return [cleanText(character?.race), classes.join(" / ")].filter(Boolean).join(" · ") || "Personaje de campaña";
}

async function attachCloudCatalogToCampaignPayload(payload) {
  const entries = [];
  const characters = Array.isArray(payload?.characters) ? payload.characters : [];
  const inventory = isPlainObject(payload?.encounterInventory) ? payload.encounterInventory : {};
  const encounterFolders = Array.isArray(inventory.folders) ? inventory.folders : [];
  const encounters = Array.isArray(inventory.encounters) ? inventory.encounters : [];
  const diary = isPlainObject(payload?.diary) ? payload.diary : {};
  const diaryFolders = Array.isArray(diary.folders) ? diary.folders : [];
  const diaryNotes = Array.isArray(diary.notes) ? diary.notes : [];
  const tablesState = isPlainObject(payload?.tables) ? payload.tables : {};
  const tableFolders = Array.isArray(tablesState.folders) ? tablesState.folders : [];
  const customTables = (Array.isArray(tablesState.tables) ? tablesState.tables : [])
    .filter((table) => !getSystemTableKind(table));

  characters.forEach((character) => {
    const entityId = cleanText(character?.id);
    const name = cleanText(character?.name);

    if (entityId && name) {
      entries.push({
        key: `character:${entityId}`,
        type: "character",
        name,
        description: getCloudCatalogCharacterDescription(character),
        groupName: "",
        imageUrl: cleanText(character?.tokenUrl),
        entityKind: "character",
        entityId
      });
    }
  });

  encounters.forEach((encounter) => {
    const entityId = cleanText(encounter?.id);

    if (entityId) {
      const folder = encounterFolders.find((entry) => cleanText(entry?.id) === cleanText(encounter?.folderId));
      entries.push({
        key: `encounter:${entityId}`,
        type: "encounter",
        name: cleanText(encounter?.name) || "Encuentro sin nombre",
        description: `${Array.isArray(encounter?.rows) ? encounter.rows.length : 0} entidades`,
        groupName: cleanText(folder?.name) || "Sin carpeta",
        imageUrl: cleanText(encounter?.rows?.[0]?.tokenUrl),
        entityKind: "encounter",
        entityId
      });
    }
  });

  diaryNotes.forEach((note) => {
    const entityId = cleanText(note?.id);
    const folder = diaryFolders.find((entry) => cleanText(entry?.id) === cleanText(note?.folderId));

    if (entityId) {
      entries.push({
        key: `diary-note:${entityId}`,
        type: "diary",
        name: cleanText(note?.title) || "Nota sin título",
        description: cleanText(folder?.name) || "Nota sin carpeta",
        groupName: cleanText(folder?.name) || "Sin carpeta",
        imageUrl: "",
        entityKind: "diary-note",
        entityId
      });
    }
  });

  customTables.forEach((table) => {
    const entityId = cleanText(table?.id);
    const folder = tableFolders.find((entry) => cleanText(entry?.id) === cleanText(table?.folderId));

    if (entityId) {
      entries.push({
        key: `table:${entityId}`,
        type: "table",
        name: cleanText(table?.name) || "Tabla sin nombre",
        description: `${Array.isArray(table?.rows) ? table.rows.length : 0} filas`,
        groupName: cleanText(folder?.name) || "Sin carpeta",
        imageUrl: "",
        entityKind: "table",
        entityId
      });
    }
  });

  for (const repositoryKey of Object.keys(defaultRepositoryCsvPaths)) {
    const override = isPlainObject(payload?.repositoryCsvOverrides?.[repositoryKey])
      ? payload.repositoryCsvOverrides[repositoryKey]
      : null;

    if (!override?.text) {
      continue;
    }

    const baseRowKeys = await getCloudCatalogBaseRowKeys(repositoryKey);
    const type = getCloudCatalogCompendiumType(repositoryKey);

    parseCsv(String(override.text)).forEach((row) => {
      const rowKey = getCloudCatalogCompendiumRowKey(repositoryKey, row);

      if (!rowKey || baseRowKeys.has(rowKey)) {
        return;
      }

      const name = cleanText(row.Name);

      if (!name || !type) {
        return;
      }

      const assets = getCloudCatalogCompendiumAssets(payload, repositoryKey, row);
      entries.push({
        key: `compendium:${type}:${rowKey}`.slice(0, 220),
        type,
        name,
        description: [cleanText(row.Source), type === "spell" ? cleanText(row.Level) : cleanText(row.CR || row.Rarity)]
          .filter(Boolean)
          .join(" · "),
        groupName: "",
        imageUrl: cleanText(assets.imageUrl || row.Image || row.ImageUrl),
        entityKind: "compendium",
        entityId: rowKey.slice(0, 120),
        payload: {
          schema: "mimic-dice:compendium-entry",
          version: 1,
          repositoryKey,
          row,
          assets
        }
      });
    });
  }

  const uniqueEntries = [...new Map(entries.map((entry) => [entry.key, entry])).values()].slice(0, 1000);
  return {
    ...payload,
    cloudCatalog: {
      version: 1,
      entries: uniqueEntries
    }
  };
}

function buildCloudCatalogDescriptorPayload(payload, descriptor) {
  if (isPlainObject(descriptor?.payload)) {
    return descriptor.payload;
  }

  const entityId = cleanText(descriptor?.entityId);

  if (descriptor?.entityKind === "character") {
    const character = (Array.isArray(payload?.characters) ? payload.characters : [])
      .find((entry) => cleanText(entry?.id) === entityId);
    return character ? {
      ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_CHARACTERS),
      characterSkills: payload.characterSkills || { definitions: state.characterSkillDefinitions },
      characters: [character]
    } : null;
  }

  if (descriptor?.entityKind === "encounter") {
    const inventory = isPlainObject(payload?.encounterInventory) ? payload.encounterInventory : {};
    const encounter = (Array.isArray(inventory.encounters) ? inventory.encounters : [])
      .find((entry) => cleanText(entry?.id) === entityId);
    const folder = (Array.isArray(inventory.folders) ? inventory.folders : [])
      .find((entry) => cleanText(entry?.id) === cleanText(encounter?.folderId));
    return encounter ? {
      ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_ENCOUNTERS),
      encounterInventory: { folders: folder ? [folder] : [], systemFolderExpanded: true, encounters: [encounter] }
    } : null;
  }

  if (descriptor?.entityKind === "diary-note") {
    const diary = isPlainObject(payload?.diary) ? payload.diary : {};
    const note = (Array.isArray(diary.notes) ? diary.notes : [])
      .find((entry) => cleanText(entry?.id) === entityId);
    const folder = (Array.isArray(diary.folders) ? diary.folders : [])
      .find((entry) => cleanText(entry?.id) === cleanText(note?.folderId));
    return note ? {
      schema: CAMPAIGN_FILE_SCHEMA,
      version: CAMPAIGN_FILE_VERSION,
      diary: { version: diary.version || 1, folders: folder ? [folder] : [], notes: [note], harptosDayNotes: {} }
    } : null;
  }

  if (descriptor?.entityKind === "diary-calendar") {
    const diary = isPlainObject(payload?.diary) ? payload.diary : {};
    return {
      schema: CAMPAIGN_FILE_SCHEMA,
      version: CAMPAIGN_FILE_VERSION,
      diary: { version: diary.version || 1, folders: [], notes: [], harptosDayNotes: diary.harptosDayNotes || {} }
    };
  }

  if (descriptor?.entityKind === "table") {
    const tablesState = isPlainObject(payload?.tables) ? payload.tables : {};
    const table = (Array.isArray(tablesState.tables) ? tablesState.tables : [])
      .find((entry) => cleanText(entry?.id) === entityId);
    const folder = (Array.isArray(tablesState.folders) ? tablesState.folders : [])
      .find((entry) => cleanText(entry?.id) === cleanText(table?.folderId));
    return table ? {
      schema: CAMPAIGN_FILE_SCHEMA,
      version: CAMPAIGN_FILE_VERSION,
      tables: { version: tablesState.version || 1, folders: folder ? [folder] : [], tables: [table] }
    } : null;
  }

  return null;
}

async function getCurrentCampaignCloudCatalogItems() {
  const campaignPayload = await attachCloudCatalogToCampaignPayload(createCampaignSavePayload());
  const descriptors = Array.isArray(campaignPayload?.cloudCatalog?.entries) ? campaignPayload.cloudCatalog.entries : [];
  const ownerName = getAccountDisplayName();
  const updatedAt = cleanText(state.cloudCampaignUpdatedAt || state.campaignSavedAt) || new Date().toISOString();
  const sourceCampaignName = cleanText(state.campaignName) || "Campaña sin nombre";

  return descriptors.map((descriptor) => ({
    id: descriptor.key,
    catalogKind: "local",
    entryKind: "campaign",
    type: descriptor.type,
    name: descriptor.name,
    description: descriptor.description || "",
    groupName: descriptor.groupName || "",
    imageUrl: descriptor.imageUrl || "",
    sourceEntityKey: descriptor.key,
    sourceCampaignId: cleanText(state.cloudCampaignId),
    sourceCampaignName,
    ownerId: cleanText(state.accountSession?.user?.id),
    ownerName,
    isOwner: true,
    isPublic: false,
    revision: 0,
    updatedAt,
    payload: buildCloudCatalogDescriptorPayload(campaignPayload, descriptor)
  })).filter((entry) => entry.payload);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo copiar una imagen pública."));
    reader.readAsDataURL(blob);
  });
}

async function materializePublicCloudAssetsForGuest(value, seen = new WeakMap()) {
  if (typeof value === "string" && /^\/api\/assets\/[0-9a-f-]{36}(?:[?#].*)?$/i.test(value)) {
    const response = await fetch(value, { credentials: "same-origin" });

    if (!response.ok) {
      throw new Error("No se pudo copiar una imagen pública.");
    }

    return blobToDataUrl(await response.blob());
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  const output = Array.isArray(value) ? [] : {};
  seen.set(value, output);

  for (const [key, entry] of Object.entries(value)) {
    output[key] = await materializePublicCloudAssetsForGuest(entry, seen);
  }

  return output;
}

function readStoredCloudCampaignMeta(userId) {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(CLOUD_CAMPAIGN_META_STORAGE_KEY) || "null");
    return isPlainObject(value) && cleanText(value.userId) === cleanText(userId) && cleanText(value.campaignId)
      ? value
      : null;
  } catch {
    return null;
  }
}

function saveActiveCloudCampaignMeta() {
  if (typeof window === "undefined") {
    return;
  }

  const userId = cleanText(state.accountSession?.user?.id);
  const campaignId = cleanText(state.cloudCampaignId);

  try {
    if (!userId || !campaignId) {
      window.localStorage.removeItem(CLOUD_CAMPAIGN_META_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CLOUD_CAMPAIGN_META_STORAGE_KEY, JSON.stringify({
      userId,
      campaignId,
      revision: state.cloudCampaignRevision,
      updatedAt: state.cloudCampaignUpdatedAt
    }));
  } catch {
    // Cloud metadata is convenience only; campaign remains in D1.
  }
}

function cleanCloudAuthQuery() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const hadCloudQuery = url.searchParams.has("cloud") || url.searchParams.has("error");
  url.searchParams.delete("cloud");
  url.searchParams.delete("error");

  if (hadCloudQuery) {
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

async function updateAccountProfileImage(file) {
  if (!state.accountSession?.user?.id) {
    return;
  }

  if (!file || !cleanText(file.type).toLowerCase().startsWith("image/")) {
    state.accountError = "Selecciona un archivo de imagen valido.";
    render();
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    state.accountError = "La imagen original no puede superar 25 MB.";
    render();
    return;
  }

  const operationTarget = "profile:image";
  beginCloudOperation("saving", operationTarget);

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const converted = await convertEmbeddedImageToWebp(dataUrl);
    const uploadResult = await uploadCloudImage(converted.blob, converted);
    const imageUrl = cleanText(uploadResult?.asset?.url);

    if (!imageUrl) {
      throw new Error("La imagen no pudo guardarse en la nube.");
    }

    const profileResult = await updateCloudProfileImage(imageUrl);
    state.accountSession = {
      ...state.accountSession,
      user: {
        ...state.accountSession.user,
        ...(profileResult?.user || {}),
        image: cleanText(profileResult?.user?.image) || imageUrl
      }
    };
    state.accountError = "";
    pushNotification({
      title: "Imagen de perfil guardada",
      message: "Tu nueva imagen ya aparece en la cuenta y en la barra superior."
    });
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  endCloudOperation("saving", operationTarget);
  render();
}

async function saveAccountProfileName() {
  if (!state.accountSession?.user?.id) {
    return;
  }

  const name = cleanText(state.accountProfileNameDraft, 80);

  if (name.length < 2) {
    state.accountError = "El nombre debe tener entre 2 y 80 caracteres.";
    render({ focusSelector: "[data-account-profile-name]" });
    return;
  }

  const operationTarget = "profile:name";
  beginCloudOperation("saving", operationTarget);

  try {
    const profileResult = await updateCloudProfileName(name);
    const nextUser = {
      ...state.accountSession.user,
      ...(profileResult?.user || {}),
      name: cleanText(profileResult?.user?.name) || name
    };
    const nextName = nextUser.name;
    const updateOwnedNames = (items) => (Array.isArray(items) ? items : []).map((item) => (
      item?.isOwner === true ? { ...item, ownerName: nextName } : item
    ));

    state.accountSession = { ...state.accountSession, user: nextUser };
    state.accountProfileNameDraft = nextName;
    state.accountProfileNameEditing = false;
    state.cloudCampaigns = updateOwnedNames(state.cloudCampaigns);
    state.cloudLibraryEntries = updateOwnedNames(state.cloudLibraryEntries);
    state.publicCloudCampaigns = updateOwnedNames(state.publicCloudCampaigns);
    state.publicCloudLibraryEntries = updateOwnedNames(state.publicCloudLibraryEntries);
    state.cloudLocalCatalogItems = updateOwnedNames(state.cloudLocalCatalogItems);
    state.accountError = "";
    pushNotification({
      title: "Nombre actualizado",
      message: "Tu nuevo nombre ya aparece en el catálogo y en la barra superior."
    });
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  endCloudOperation("saving", operationTarget);
  render();
}

async function initializeCloudAccount() {
  if (!canUseCloudAccounts()) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const shouldChooseCampaign = currentUrl.searchParams.get("cloud") === "choose";
  const authError = cleanText(currentUrl.searchParams.get("error"));

  try {
    const session = await fetchAuthSession();
    state.accountSession = session;
    state.accountProfileNameDraft = cleanText(session?.user?.name);
    state.accountProfileNameEditing = false;
    state.accountStatus = "ready";

    if (session?.user?.id) {
      startCloudCampaignAutosave();
      await refreshCloudCampaigns({ renderAfter: false });
      let storedMeta = null;

      if (shouldChooseCampaign) {
        state.accountDialogOpen = true;
        state.accountDialogView = "account";
      } else {
        storedMeta = readStoredCloudCampaignMeta(session.user.id);

        if (storedMeta?.campaignId) {
          const loaded = await loadCloudCampaignById(storedMeta.campaignId, { silent: true });

          if (loaded) {
            cleanCloudAuthQuery();
            return;
          }
        }
      }

      detachActiveCloudCampaign({ preserveStoredMeta: Boolean(storedMeta?.campaignId) });
      resetUnloadedCampaignWorkspace();
    } else {
      stopCloudCampaignAutosave();
      detachActiveCloudCampaign();
      clearPrivateCloudAccountState();
      resetUnloadedCampaignWorkspace();
    }

    if (authError) {
      state.accountDialogOpen = true;
      state.accountDialogView = "account";
      state.accountError = authError === "AccessDenied"
        ? "Registro cerrado o cuenta no autorizada. Usa el código de invitación para crear una cuenta nueva."
        : "Google no pudo completar el acceso.";
    }
  } catch (error) {
    state.accountStatus = "error";
    state.accountError = getCloudErrorMessage(error);
  }

  cleanCloudAuthQuery();
  render();
}

async function openAccountDialog() {
  state.accountDialogOpen = true;
  state.accountDialogView = "account";
  state.accountError = "";
  state.accountCampaignName = cleanText(state.campaignName) || "Campaña sin nombre";
  state.accountProfileNameDraft = cleanText(state.accountSession?.user?.name);
  state.accountProfileNameEditing = false;
  render();

  if (state.accountSession?.user?.id) {
    await refreshCloudCampaigns();
  }
}

async function refreshCloudCampaigns(options = {}) {
  if (!state.accountSession?.user?.id) {
    state.cloudCampaigns = [];
    return;
  }

  try {
    const result = await listCloudCampaigns();
    state.cloudCampaigns = Array.isArray(result.campaigns) ? result.campaigns : [];
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  if (options.renderAfter !== false) {
    render();
  }
}

async function refreshPublicCloudCampaigns() {
  try {
    const result = await listPublicCloudCampaigns();
    state.publicCloudCampaigns = Array.isArray(result.campaigns) ? result.campaigns : [];
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }
  render();
}

async function refreshCloudLibrary() {
  state.cloudLibraryBusy = true;
  render();

  try {
    const [ownedResult, publicResult] = await Promise.all([
      state.accountSession?.user?.id ? listCloudLibraryEntries() : Promise.resolve({ entries: [] }),
      listPublicCloudLibraryEntries()
    ]);
    state.cloudLibraryEntries = Array.isArray(ownedResult.entries) ? ownedResult.entries : [];
    state.publicCloudLibraryEntries = Array.isArray(publicResult.entries) ? publicResult.entries : [];
    updateCloudImportCandidatesFromEntries([
      ...state.cloudLibraryEntries,
      ...state.publicCloudLibraryEntries
    ]);
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  state.cloudLibraryBusy = false;
  render();
}

async function refreshCommunityCatalog() {
  const operationTarget = "catalog:refresh";
  state.cloudLibraryBusy = true;
  beginCloudOperation("loading", operationTarget);

  try {
    const isAuthenticated = Boolean(state.accountSession?.user?.id);
    const [ownedCampaigns, publicCampaigns, ownedEntries, publicEntries, localEntries] = await Promise.all([
      isAuthenticated ? listCloudCampaigns() : Promise.resolve({ campaigns: [] }),
      listPublicCloudCampaigns(),
      isAuthenticated ? listCloudLibraryEntries() : Promise.resolve({ entries: [] }),
      listPublicCloudLibraryEntries(),
      getCurrentCampaignCloudCatalogItems()
    ]);
    state.cloudCampaigns = Array.isArray(ownedCampaigns.campaigns) ? ownedCampaigns.campaigns : [];
    state.publicCloudCampaigns = Array.isArray(publicCampaigns.campaigns) ? publicCampaigns.campaigns : [];
    const [filteredOwnedEntries, filteredPublicEntries] = await Promise.all([
      filterBundledBaseCloudCatalogEntries(ownedEntries.entries),
      filterBundledBaseCloudCatalogEntries(publicEntries.entries)
    ]);
    state.cloudLibraryEntries = filteredOwnedEntries;
    state.publicCloudLibraryEntries = filteredPublicEntries;
    state.cloudLocalCatalogItems = Array.isArray(localEntries) ? localEntries : [];
    updateCloudImportCandidatesFromEntries([
      ...state.cloudLibraryEntries,
      ...state.publicCloudLibraryEntries
    ]);
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  state.cloudLibraryBusy = false;
  endCloudOperation("loading", operationTarget);
  render();
}

function findCloudCatalogItem(kind, itemId) {
  const normalizedKind = cleanText(kind).toLowerCase();
  const normalizedId = cleanText(itemId);

  if (normalizedKind === "campaign") {
    const campaign = [...state.cloudCampaigns, ...state.publicCloudCampaigns]
      .find((entry) => entry.id === normalizedId);
    return campaign ? normalizeCloudCatalogItem(campaign, "campaign") : null;
  }

  if (normalizedKind === "local") {
    return state.cloudLocalCatalogItems.find((candidate) => candidate.id === normalizedId) || null;
  }

  const entry = [...state.cloudLibraryEntries, ...state.publicCloudLibraryEntries]
    .find((candidate) => candidate.id === normalizedId);
  return entry ? normalizeCloudCatalogItem(entry, "entry") : null;
}

async function previewCloudCatalogItem(kind, itemId) {
  const item = findCloudCatalogItem(kind, itemId);

  if (!item) {
    return;
  }

  state.cloudCatalogPreview = { kind: item.catalogKind, item, payload: item.payload || null };
  state.cloudCatalogPreviewBusy = !item.payload;
  render();

  if (item.payload) {
    return;
  }

  try {
    const result = item.catalogKind === "campaign"
      ? await getCloudCampaign(item.id)
      : await getCloudLibraryEntry(item.id);
    state.cloudCatalogPreview = {
      kind: item.catalogKind,
      item,
      payload: result.payload
    };
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
    state.cloudCatalogPreview = null;
  }

  state.cloudCatalogPreviewBusy = false;
  render();
}

function compendiumEntryToCsvRow(repositoryKey, entry) {
  const propertyByHeader = {
    Name: "name",
    Source: "source",
    Page: "page",
    Size: "size",
    Type: "type",
    Alignment: "alignment",
    AC: "ac",
    HP: "hp",
    Speed: "speed",
    "Saving Throws": "savingThrows",
    Skills: "skills",
    "Damage Vulnerabilities": "damageVulnerabilities",
    "Damage Resistances": "damageResistances",
    "Damage Immunities": "damageImmunities",
    "Condition Immunities": "conditionImmunities",
    Senses: "senses",
    Languages: "languages",
    CR: "cr",
    Environment: "environment",
    Treasure: "treasure",
    Traits: "traits",
    Actions: "actions",
    "Bonus Actions": "bonusActions",
    Reactions: "reactions",
    "Legendary Actions": "legendaryActions",
    "Mythic Actions": "mythicActions",
    "Lair Actions": "lairActions",
    "Regional Effects": "regionalEffects",
    Rarity: "rarity",
    Attunement: "attunement",
    Damage: "damage",
    Properties: "properties",
    Mastery: "mastery",
    Weight: "weight",
    Value: "value",
    Text: "text",
    Level: "level",
    "Casting Time": "castingTime",
    Duration: "duration",
    School: "school",
    Range: "range",
    Components: "components",
    Classes: "classes",
    "Optional/Variant Classes": "optionalClasses",
    Subclasses: "subclasses",
    "At Higher Levels": "atHigherLevels"
  };
  const abilityByHeader = {
    Strength: "STR",
    Dexterity: "DEX",
    Constitution: "CON",
    Intelligence: "INT",
    Wisdom: "WIS",
    Charisma: "CHA"
  };

  return Object.fromEntries(getCompendiumCsvHeaders(repositoryKey).map((header) => {
    const value = abilityByHeader[header]
      ? entry?.abilities?.[abilityByHeader[header]]
      : entry?.[propertyByHeader[header]];
    return [header, String(value ?? "")];
  }));
}

function getCurrentCloudLibraryDraft(type) {
  const normalizedType = cleanText(type).toLowerCase();

  if (normalizedType === "character") {
    const character = getCharactersSaveData().find((entry) => entry.id === state.activeCharacterId);
    return character ? {
      type: normalizedType,
      name: cleanText(character.name) || "Personaje sin nombre",
      imageUrl: cleanText(character.tokenUrl),
      sourceEntityKey: `character:${cleanText(character.id)}`,
      sourceCampaignName: cleanText(state.campaignName),
      payload: {
        ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_CHARACTERS),
        characterSkills: { definitions: state.characterSkillDefinitions },
        characters: [character]
      }
    } : null;
  }

  if (normalizedType === "encounter") {
    const encounter = normalizeStoredEncounter(getActiveEncounter());

    if (!encounter) {
      return null;
    }

    const folder = state.encounterFolders.find((entry) => entry.id === encounter.folderId);
    return {
      type: normalizedType,
      name: cleanText(encounter.name) || "Encuentro sin nombre",
      groupName: cleanText(folder?.name) || "Sin carpeta",
      imageUrl: cleanText(encounter.rows?.[0]?.tokenUrl),
      sourceEntityKey: `encounter:${cleanText(encounter.id)}`,
      sourceCampaignName: cleanText(state.campaignName),
      payload: {
        ...createSelectionExportBasePayload(DATA_EXCHANGE_CATEGORY_ENCOUNTERS),
        encounterInventory: {
          folders: folder ? [normalizeStoredEncounterFolder(folder)].filter(Boolean) : [],
          systemFolderExpanded: true,
          encounters: [encounter]
        }
      }
    };
  }

  const repositoryKey = normalizedType === "monster"
    ? "bestiary"
    : normalizedType === "item"
      ? "items"
      : normalizedType === "spell"
        ? "arcanum"
        : "";
  const entry = repositoryKey === "bestiary"
    ? getSelectedBestiaryEntry()
    : repositoryKey === "items"
      ? getSelectedItemEntry()
      : repositoryKey === "arcanum"
        ? getSelectedArcanumEntry()
        : null;

  if (!repositoryKey || !entry) {
    return null;
  }

  return {
    type: normalizedType,
    name: cleanText(entry.name) || getCloudLibraryTypeLabel(normalizedType),
    imageUrl: cleanText(entry.imageUrl || entry.tokenUrl),
    sourceEntityKey: `compendium:${normalizedType}:${getCloudCatalogCompendiumRowKey(repositoryKey, compendiumEntryToCsvRow(repositoryKey, entry))}`.slice(0, 220),
    sourceCampaignName: cleanText(state.campaignName),
    payload: {
      schema: "mimic-dice:compendium-entry",
      version: 1,
      repositoryKey,
      row: compendiumEntryToCsvRow(repositoryKey, entry),
      assets: {
        imageUrl: cleanText(entry.imageUrl),
        tokenUrl: cleanText(entry.tokenUrl)
      }
    }
  };
}

async function publishCurrentCloudLibraryEntry(type) {
  if (!state.accountSession?.user?.id) {
    state.accountDialogOpen = true;
    state.accountDialogView = "account";
    state.accountError = "Inicia sesión para publicar contenido en la nube.";
    render();
    return;
  }

  const draft = getCurrentCloudLibraryDraft(type);

  if (!draft) {
    pushNotification({ title: "Nada que publicar", message: "Selecciona primero una entidad válida.", tone: "danger" });
    render();
    return;
  }

  if (!window.confirm(`Publicar “${draft.name}” para que otros usuarios puedan añadir una copia a sus campañas?`)) {
    return;
  }

  const operationTarget = `publish:${draft.type}`;
  state.cloudLibraryBusy = true;
  beginCloudOperation("publishing", operationTarget);

  try {
    const payload = await preparePayloadImagesForCloud(draft.payload);
    const imageUrl = draft.type === "character"
      ? cleanText(payload.characters?.[0]?.tokenUrl)
      : draft.type === "encounter"
        ? cleanText(payload.encounterInventory?.encounters?.[0]?.rows?.[0]?.tokenUrl)
        : cleanText(payload.assets?.imageUrl || payload.assets?.tokenUrl);
    await createCloudLibraryEntry({ ...draft, imageUrl, payload, isPublic: true });
    await refreshCloudLibrary();
    pushNotification({
      title: `${getCloudLibraryTypeLabel(draft.type)} publicado`,
      message: `${draft.name} ya está disponible en la biblioteca de la comunidad.`
    });
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
    pushNotification({ title: "No se pudo publicar", message: state.accountError, tone: "danger" });
  }

  state.cloudLibraryBusy = false;
  endCloudOperation("publishing", operationTarget);
  render();
}

async function importCloudCompendiumEntry(payload) {
  const repositoryKey = cleanText(payload?.repositoryKey).toLowerCase();
  const row = isPlainObject(payload?.row) ? payload.row : null;

  if (!COMPENDIUM_CREATION_FIELDS[repositoryKey] || !row || !cleanText(row.Name)) {
    throw new Error("La publicación no contiene una entidad de compendio válida.");
  }

  const currentText = await loadRepositoryCsvRawText(repositoryKey);
  const parsedRows = parseCsv(currentText);
  const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
  const headers = extractCsvHeaders(currentText, getCompendiumCsvHeaders(repositoryKey));
  const normalizedRows = parsedRows.map((entry) => Object.fromEntries(headers.map((header) => [header, String(entry?.[header] ?? "")])));
  const importedRow = Object.fromEntries(headers.map((header) => [header, String(row[header] ?? "")]));
  await writeRepositoryCsvRawText(repositoryKey, serializeCsvRows(headers, [...normalizedRows, importedRow], lineBreak));

  const mapKey = repositoryKey === "arcanum"
    ? `${cleanText(row.Name)}||${cleanText(row.Source)}||${cleanText(row.Level)}`.toLowerCase()
    : `${cleanText(row.Name)}||${cleanText(row.Source)}`.toLowerCase();
  const assets = isPlainObject(payload.assets) ? payload.assets : {};

  if (repositoryKey === "bestiary" && (assets.imageUrl || assets.tokenUrl)) {
    saveBestiaryCustomImageMap({ ...state.customBestiaryImageMap, [mapKey]: assets });
  } else if (repositoryKey === "items" && assets.imageUrl) {
    saveItemCustomImageMap({ ...state.customItemImageMap, [mapKey]: { imageUrl: assets.imageUrl } });
  }

  await reloadCompendiumRepository(repositoryKey);
  selectCompendiumEntryAfterCreate(repositoryKey, row);
  return {
    repositoryKey,
    rowKey: getCloudCatalogCompendiumRowKey(repositoryKey, row),
    mapKey
  };
}

function importCloudTableEntry(payload, options = {}) {
  const source = isPlainObject(payload?.tables) ? payload.tables : {};
  const folders = Array.isArray(source.folders)
    ? source.folders.map((folder) => normalizeStoredTableFolder(folder)).filter(Boolean)
    : [];
  const tables = Array.isArray(source.tables)
    ? source.tables.map((table, index) => normalizeStoredTable(table, index)).filter(Boolean)
    : [];
  const folderIdMap = new Map();
  const importedFolders = folders.map((folder) => {
    const nextId = createStableId("table-folder");
    folderIdMap.set(folder.id, nextId);
    return { ...folder, id: nextId, isExpanded: true };
  });
  const importedTables = tables.map((table) => {
    const columnIdMap = new Map();
    const columns = table.columns.map((column) => {
      const nextId = createStableId("table-col");
      columnIdMap.set(column.id, nextId);
      return { ...column, id: nextId };
    });
    const rows = table.rows.map((row) => ({
      ...row,
      id: createStableId("table-row"),
      cells: Object.fromEntries(columns.map((column) => {
        const previousColumnId = [...columnIdMap.entries()].find(([, nextId]) => nextId === column.id)?.[0];
        return [column.id, cleanText(row?.cells?.[previousColumnId])];
      }))
    }));
    return {
      ...table,
      id: createStableId("table"),
      folderId: folderIdMap.get(table.folderId) || "",
      columns,
      rows,
      collapsed: false
    };
  });

  if (importedFolders.length === 0 && importedTables.length === 0) {
    throw new Error("No tables in payload.");
  }

  state.tableFolders = [...state.tableFolders, ...importedFolders];
  state.tables = [...state.tables, ...importedTables];
  state.activeTableFolderId = importedTables[0]?.folderId || importedFolders[0]?.id || state.activeTableFolderId;
  state.activeTableId = importedTables[0]?.id || state.activeTableId;
  saveTablesState();

  if (options.notify !== false) {
    pushNotification({
      title: "Importación completada",
      message: `${importedTables.length} tablas añadidas.`
    });
  }
  return {
    entityIds: importedTables.map((table) => table.id),
    folderIds: importedFolders.map((folder) => folder.id)
  };
}

function normalizeCloudImportedEntries(value) {
  const entries = Array.isArray(value?.entries) ? value.entries : Array.isArray(value) ? value : [];
  return entries.map((record) => {
    if (!isPlainObject(record) || !cleanText(record.sourceEntryId)) {
      return null;
    }

    const refs = isPlainObject(record.localRefs) ? record.localRefs : {};
    return {
      id: cleanText(record.id) || createStableId("cloud-import"),
      sourceEntryId: cleanText(record.sourceEntryId),
      sourceRevision: Math.max(0, Math.floor(toNumber(record.sourceRevision))),
      sourceContentHash: cleanText(record.sourceContentHash),
      sourceUpdatedAt: cleanText(record.sourceUpdatedAt),
      sourceName: cleanText(record.sourceName) || "Contenido de la comunidad",
      sourceType: cleanText(record.sourceType).toLowerCase(),
      sourceOwnerName: cleanText(record.sourceOwnerName) || "Usuario de Mimic Dice",
      sourceCampaignName: cleanText(record.sourceCampaignName),
      importedAt: cleanText(record.importedAt),
      isAlternative: record.isAlternative === true,
      localRefs: {
        entityIds: Array.isArray(refs.entityIds) ? refs.entityIds.map((value) => cleanText(value)).filter(Boolean) : [],
        folderIds: Array.isArray(refs.folderIds) ? refs.folderIds.map((value) => cleanText(value)).filter(Boolean) : [],
        dayNotes: isPlainObject(refs.dayNotes) ? refs.dayNotes : {},
        repositoryKey: cleanText(refs.repositoryKey).toLowerCase(),
        rowKey: cleanText(refs.rowKey),
        mapKey: cleanText(refs.mapKey)
      }
    };
  }).filter(Boolean);
}

function createCloudImportedEntryRecord(result, localRefs, recordId = "") {
  const entry = result?.entry || {};
  return normalizeCloudImportedEntries({ entries: [{
    id: recordId || createStableId("cloud-import"),
    sourceEntryId: entry.id,
    sourceRevision: entry.revision,
    sourceContentHash: entry.contentHash,
    sourceUpdatedAt: entry.updatedAt,
    sourceName: entry.name,
    sourceType: entry.type,
    sourceOwnerName: entry.ownerName,
    sourceCampaignName: entry.sourceCampaignName,
    importedAt: new Date().toISOString(),
    localRefs
  }] })[0];
}

function recordCloudLibraryImport(result, localRefs) {
  const record = createCloudImportedEntryRecord(result, localRefs);

  if (!record) {
    return null;
  }

  state.cloudImportedEntries = [...state.cloudImportedEntries, record];
  scheduleDesktopCampaignDirtyStateSync(60);
  return record;
}

function hasCloudImportedEntryChanged(record, latest) {
  if (record?.isAlternative === true) {
    return false;
  }

  const previousHash = cleanText(record.sourceContentHash);
  const latestHash = cleanText(latest?.contentHash);

  if (previousHash && latestHash) {
    return previousHash !== latestHash;
  }

  if (cleanText(latest?.entryKind).toLowerCase() === "manual" && !latestHash) {
    return false;
  }

  return Math.max(0, Math.floor(toNumber(latest?.revision))) > record.sourceRevision;
}

function updateCloudImportCandidatesFromEntries(entries, options = {}) {
  const latestById = new Map((Array.isArray(entries) ? entries : [])
    .filter((entry) => cleanText(entry?.id))
    .map((entry) => [cleanText(entry.id), entry]));
  const candidates = state.cloudImportedEntries.map((record) => {
    const latest = latestById.get(record.sourceEntryId);
    return latest && hasCloudImportedEntryChanged(record, latest) ? { record, latest } : null;
  }).filter(Boolean);
  state.cloudImportUpdateCandidates = candidates;

  if (options.showDialog === true && candidates.length > 0) {
    state.cloudImportUpdateSelectedIds = new Set(candidates.map((candidate) => candidate.record.id));
    state.cloudImportUpdateDialogOpen = true;
  } else {
    const candidateIds = new Set(candidates.map((candidate) => candidate.record.id));
    state.cloudImportUpdateSelectedIds = new Set(
      [...state.cloudImportUpdateSelectedIds].filter((id) => candidateIds.has(id))
    );
  }
}

async function checkCloudImportedEntryUpdates(options = {}) {
  if (state.cloudImportedEntries.length === 0 || !canUseCloudAccounts()) {
    state.cloudImportUpdateCandidates = [];
    return;
  }

  try {
    const [ownedResult, publicResult] = await Promise.all([
      state.accountSession?.user?.id ? listCloudLibraryEntries() : Promise.resolve({ entries: [] }),
      listPublicCloudLibraryEntries()
    ]);
    const [ownedEntries, publicEntries] = await Promise.all([
      filterBundledBaseCloudCatalogEntries(ownedResult.entries),
      filterBundledBaseCloudCatalogEntries(publicResult.entries)
    ]);
    const latestById = new Map([...ownedEntries, ...publicEntries].map((entry) => [entry.id, entry]));
    updateCloudImportCandidatesFromEntries([...latestById.values()], options);
  } catch {
    // Imported copies stay usable offline or when their source is no longer public.
  }

  render();
}

function queueCloudImportedEntryUpdateCheck() {
  if (typeof window === "undefined" || state.cloudImportedEntries.length === 0) {
    return;
  }

  if (cloudImportUpdateCheckTimer) {
    window.clearTimeout(cloudImportUpdateCheckTimer);
  }

  cloudImportUpdateCheckTimer = window.setTimeout(() => {
    cloudImportUpdateCheckTimer = 0;
    void checkCloudImportedEntryUpdates({ showDialog: true });
  }, 250);
}

async function removeCloudImportedMaterial(record) {
  const refs = record.localRefs || {};
  const entityIds = new Set(refs.entityIds || []);
  const folderIds = new Set(refs.folderIds || []);

  if (record.sourceType === "character") {
    state.characters = state.characters.filter((entry) => !entityIds.has(entry.id));
    state.activeCharacterId = state.characters.some((entry) => entry.id === state.activeCharacterId)
      ? state.activeCharacterId
      : state.characters[0]?.id || "";
    state.selectedCharacterIds = new Set([...state.selectedCharacterIds].filter((id) => !entityIds.has(id)));
    saveCharacters();
    return;
  }

  if (record.sourceType === "encounter") {
    state.encounters = state.encounters.filter((entry) => !entityIds.has(entry.id));
    const usedFolderIds = new Set(state.encounters.map((entry) => entry.folderId).filter(Boolean));
    state.encounterFolders = state.encounterFolders.filter((folder) => !folderIds.has(folder.id) || usedFolderIds.has(folder.id));
    state.activeEncounterId = state.encounters.some((entry) => entry.id === state.activeEncounterId)
      ? state.activeEncounterId
      : state.encounters[0]?.id || "";
    state.activeEncounterFolderId = state.encounters.find((entry) => entry.id === state.activeEncounterId)?.folderId || "";
    saveEncounterInventory();
    return;
  }

  if (record.sourceType === "diary") {
    state.diaryNotes = state.diaryNotes.filter((entry) => !entityIds.has(entry.id));
    const usedFolderIds = new Set(state.diaryNotes.map((entry) => entry.folderId).filter(Boolean));
    state.diaryFolders = state.diaryFolders.filter((folder) => !folderIds.has(folder.id) || usedFolderIds.has(folder.id));
    const nextDayNotes = { ...state.diaryHarptosDayNotes };
    Object.entries(refs.dayNotes || {}).forEach(([key, value]) => {
      if (JSON.stringify(nextDayNotes[key]) === JSON.stringify(value)) {
        delete nextDayNotes[key];
      }
    });
    state.diaryHarptosDayNotes = nextDayNotes;
    reconcileDiaryUiState();
    saveDiaryState();
    return;
  }

  if (record.sourceType === "table") {
    state.tables = state.tables.filter((entry) => !entityIds.has(entry.id));
    const usedFolderIds = new Set(state.tables.map((entry) => entry.folderId).filter(Boolean));
    state.tableFolders = state.tableFolders.filter((folder) => !folderIds.has(folder.id) || usedFolderIds.has(folder.id));
    reconcileTablesUiState();
    saveTablesState();
    return;
  }

  if (["spell", "item", "monster"].includes(record.sourceType) && refs.repositoryKey && refs.rowKey) {
    const currentText = await loadRepositoryCsvRawText(refs.repositoryKey);
    const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
    const headers = extractCsvHeaders(currentText, getCompendiumCsvHeaders(refs.repositoryKey));
    const rows = parseCsv(currentText)
      .filter((row) => getCloudCatalogCompendiumRowKey(refs.repositoryKey, row) !== refs.rowKey)
      .map((row) => Object.fromEntries(headers.map((header) => [header, String(row?.[header] ?? "")])));
    await writeRepositoryCsvRawText(refs.repositoryKey, serializeCsvRows(headers, rows, lineBreak));

    if (refs.repositoryKey === "bestiary" && refs.mapKey) {
      const nextMap = { ...state.customBestiaryImageMap };
      delete nextMap[refs.mapKey];
      saveBestiaryCustomImageMap(nextMap);
    } else if (refs.repositoryKey === "items" && refs.mapKey) {
      const nextMap = { ...state.customItemImageMap };
      delete nextMap[refs.mapKey];
      saveItemCustomImageMap(nextMap);
    }

    await reloadCompendiumRepository(refs.repositoryKey);
  }
}

function removeCloudCatalogSelectionKeys(selectionKeys) {
  cloudCatalogImportQueue = cloudCatalogImportQueue.then(
    () => performCloudCatalogSelectionRemoval(selectionKeys),
    () => performCloudCatalogSelectionRemoval(selectionKeys)
  );
  return cloudCatalogImportQueue;
}

async function performCloudCatalogSelectionRemoval(selectionKeys) {
  const keys = [...new Set((Array.isArray(selectionKeys) ? selectionKeys : [])
    .map((value) => cleanText(value))
    .filter(Boolean))];
  const recordById = new Map();

  keys.forEach((key) => {
    getCloudImportedRecordsForSelectionKey(key).forEach((record) => {
      recordById.set(record.id, record);
    });
  });

  const records = [...recordById.values()];
  const nextSelection = new Set(state.cloudCatalogSelectedIds);
  keys.forEach((key) => nextSelection.delete(key));
  state.cloudCatalogSelectedIds = nextSelection;

  if (records.length === 0) {
    render();
    return;
  }

  const operationTarget = "catalog:remove";
  const backup = normalizeCampaignSave(createCampaignSavePayload());
  beginCloudOperation("loading", operationTarget);
  render();

  try {
    for (const record of records) {
      await removeCloudImportedMaterial(record);
    }

    const removedRecordIds = new Set(records.map((record) => record.id));
    state.cloudImportedEntries = state.cloudImportedEntries.filter((record) => !removedRecordIds.has(record.id));
    state.cloudImportUpdateCandidates = state.cloudImportUpdateCandidates.filter((candidate) => (
      !removedRecordIds.has(candidate.record?.id)
    ));
    state.cloudImportUpdateSelectedIds = new Set([...state.cloudImportUpdateSelectedIds]
      .filter((recordId) => !removedRecordIds.has(recordId)));
    state.cloudImportUpdateDialogOpen = state.cloudImportUpdateCandidates.length > 0;

    state.cloudLocalCatalogItems = await getCurrentCampaignCloudCatalogItems();

    scheduleDesktopCampaignDirtyStateSync(60);
    state.accountError = "";
    pushNotification({
      title: "Contenido retirado",
      message: `${records.length} ${records.length === 1 ? "publicación retirada" : "publicaciones retiradas"} de tu campaña.`
    });
  } catch (error) {
    applyCampaignSave(backup);
    state.accountError = getCloudErrorMessage(error);
    pushNotification({
      title: "No se pudo retirar el contenido",
      message: state.accountError,
      tone: "danger"
    });
  } finally {
    endCloudOperation("loading", operationTarget);
    render();
  }
}

async function refreshCloudImportedRecord(recordId) {
  const record = state.cloudImportedEntries.find((entry) => entry.id === recordId);

  if (!record) {
    return false;
  }

  const result = await getCloudLibraryEntry(record.sourceEntryId);

  if (cleanText(result?.entry?.type).toLowerCase() !== record.sourceType) {
    throw new Error("La publicación cambió de tipo y no se puede actualizar con seguridad.");
  }

  const backup = normalizeCampaignSave(createCampaignSavePayload());

  try {
    await removeCloudImportedMaterial(record);
    const localRefs = await applyCloudLibraryEntryResult(result, { notify: false });
    const updatedRecord = createCloudImportedEntryRecord(result, localRefs, record.id);

    if (!updatedRecord) {
      throw new Error("No se pudo vincular la nueva versión.");
    }

    state.cloudImportedEntries = state.cloudImportedEntries.map((entry) => (
      entry.id === record.id ? updatedRecord : entry
    ));
    return true;
  } catch (error) {
    applyCampaignSave(backup);
    throw error;
  }
}

function refreshCloudImportedRecords(recordIds, options = {}) {
  cloudCatalogImportQueue = cloudCatalogImportQueue.then(
    () => performCloudImportedRecordsRefresh(recordIds, options),
    () => performCloudImportedRecordsRefresh(recordIds, options)
  );
  return cloudCatalogImportQueue;
}

async function performCloudImportedRecordsRefresh(recordIds, options = {}) {
  const ids = [...new Set(recordIds.map((value) => cleanText(value)).filter(Boolean))];

  if (ids.length === 0) {
    return;
  }

  const operationTarget = options.operationTarget || "import-refresh:selection";
  beginCloudOperation("loading", operationTarget);
  let refreshed = 0;
  const failures = [];

  for (const recordId of ids) {
    try {
      refreshed += await refreshCloudImportedRecord(recordId) ? 1 : 0;
    } catch (error) {
      failures.push(getCloudErrorMessage(error));
    }
  }

  if (refreshed > 0) {
    scheduleDesktopCampaignDirtyStateSync(60);
    state.cloudLocalCatalogItems = await getCurrentCampaignCloudCatalogItems();
    pushNotification({
      title: "Contenido actualizado",
      message: `${refreshed} ${refreshed === 1 ? "entidad actualizada" : "entidades actualizadas"} a la última versión.`
    });
  }

  if (failures.length > 0) {
    state.accountError = `${failures.length} actualizaciones fallaron. ${failures[0]}`;
  }

  updateCloudImportCandidatesFromEntries([
    ...state.cloudLibraryEntries,
    ...state.publicCloudLibraryEntries
  ]);
  state.cloudImportUpdateDialogOpen = state.cloudImportUpdateCandidates.length > 0;
  endCloudOperation("loading", operationTarget);
  render();
}

async function refreshCloudImportedEntryCopies(entryId) {
  const candidates = getCloudImportCandidatesForEntry(entryId);
  await refreshCloudImportedRecords(
    candidates.map((candidate) => candidate.record.id),
    { operationTarget: `import-refresh:${entryId}` }
  );
}

async function applyCloudLibraryEntryResult(result, options = {}) {
  const type = cleanText(result?.entry?.type).toLowerCase();
  const payload = state.accountSession?.user?.id
    ? result.payload
    : await materializePublicCloudAssetsForGuest(result.payload);

  if (type === "character") {
    return importCharactersFromPayload(payload, options);
  } else if (type === "encounter") {
    return importEncountersFromPayload(payload, options);
  } else if (type === "diary") {
    return importDiaryFromPayload(payload, options);
  } else if (type === "table") {
    return importCloudTableEntry(payload, options);
  } else if (["spell", "item", "monster"].includes(type)) {
    return importCloudCompendiumEntry(payload);
  } else {
    throw new Error("Tipo de publicación desconocido.");
  }
}

async function importCloudLibraryEntry(entryId) {
  const operationTarget = `library:${entryId}`;
  state.cloudLibraryBusy = true;
  beginCloudOperation("loading", operationTarget);

  try {
    const result = await getCloudLibraryEntry(entryId);
    const localRefs = await applyCloudLibraryEntryResult(result);
    recordCloudLibraryImport(result, localRefs);

    pushNotification({
      title: "Contenido añadido",
      message: `${result.entry.name} se ha copiado a tu campaña.`
    });
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  state.cloudLibraryBusy = false;
  endCloudOperation("loading", operationTarget);
  render();
}

function importCloudCatalogSelectionKeys(selectionKeys) {
  cloudCatalogImportQueue = cloudCatalogImportQueue.then(
    () => performCloudCatalogSelectionImport(selectionKeys),
    () => performCloudCatalogSelectionImport(selectionKeys)
  );
  return cloudCatalogImportQueue;
}

async function performCloudCatalogSelectionImport(selectionKeys) {
  const keys = [...new Set((Array.isArray(selectionKeys) ? selectionKeys : []).map((value) => cleanText(value)).filter(Boolean))];

  if (keys.length === 0) {
    return;
  }

  const campaignKey = keys.find((key) => key.startsWith("campaign:"));

  if (campaignKey) {
    const campaignId = campaignKey.slice("campaign:".length);

    if (state.accountSession?.user?.id) {
      await clonePublicCampaign(campaignId);
    } else {
      await loadPublicCampaignLocally(campaignId);
    }
    return;
  }

  const operationTarget = "catalog:import";
  beginCloudOperation("loading", operationTarget);
  let importedCount = 0;
  let alreadyLoadedCount = 0;
  const failures = [];
  const selectedIds = keys
    .filter((key) => key.startsWith("entry:"))
    .map((key) => key.slice("entry:".length))
    .filter(Boolean);

  for (const entryId of selectedIds) {
    if (state.cloudImportedEntries.some((record) => record.sourceEntryId === entryId)) {
      alreadyLoadedCount += 1;
      continue;
    }

    try {
      const result = await getCloudLibraryEntry(entryId);
      const localRefs = await applyCloudLibraryEntryResult(result, { notify: false });
      recordCloudLibraryImport(result, localRefs);
      importedCount += 1;
    } catch (error) {
      failures.push(getCloudErrorMessage(error));
    }
  }

  const nextSelection = new Set(state.cloudCatalogSelectedIds);
  keys.forEach((key) => nextSelection.delete(key));
  state.cloudCatalogSelectedIds = nextSelection;

  try {
    state.cloudLocalCatalogItems = await getCurrentCampaignCloudCatalogItems();
  } catch (error) {
    failures.push(getCloudErrorMessage(error));
  }

  endCloudOperation("loading", operationTarget);

  if (importedCount > 0) {
    pushNotification({
      title: "Contenido añadido",
      message: `${importedCount} publicaciones copiadas a tu campaña.`
    });
  }

  if (alreadyLoadedCount > 0 && importedCount === 0) {
    pushNotification({
      title: "Contenido ya cargado",
      message: "Esta publicación ya tiene una copia vinculada en la campaña actual."
    });
  }

  if (failures.length > 0) {
    state.accountError = `${failures.length} publicaciones no pudieron cargarse. ${failures[0]}`;
  } else {
    state.accountError = "";
  }

  render();
}

async function toggleCloudLibraryEntryPublic(entryId) {
  const entry = state.cloudLibraryEntries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  const operationTarget = `library-visibility:${entryId}`;
  beginCloudOperation("saving", operationTarget);

  try {
    await setCloudLibraryEntryVisibility(entryId, {
      isPublic: !entry.isPublic,
      baseRevision: entry.revision
    });
    await refreshCloudLibrary();
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  endCloudOperation("saving", operationTarget);
  render();
}

function normalizeCloudAlternativeContent(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeCloudAlternativeContent);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const ignoredKeys = new Set(["id", "folderId", "createdAt", "updatedAt", "collapsed", "isExpanded"]);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !ignoredKeys.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, normalizeCloudAlternativeContent(entry)]));
}

function getCloudAlternativeComparableEntity(type, payload) {
  const normalizedType = cleanText(type).toLowerCase();

  if (normalizedType === "character") {
    const character = isPlainObject(payload?.characters?.[0]) ? payload.characters[0] : {};
    return normalizeCloudAlternativeContent({ ...character, name: "" });
  }

  if (normalizedType === "encounter") {
    const encounter = isPlainObject(payload?.encounterInventory?.encounters?.[0])
      ? payload.encounterInventory.encounters[0]
      : {};
    return normalizeCloudAlternativeContent({ ...encounter, name: "" });
  }

  if (normalizedType === "diary") {
    const note = isPlainObject(payload?.diary?.notes?.[0]) ? payload.diary.notes[0] : {};
    return normalizeCloudAlternativeContent({ ...note, title: "" });
  }

  if (normalizedType === "table") {
    const table = isPlainObject(payload?.tables?.tables?.[0]) ? payload.tables.tables[0] : {};
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const rows = (Array.isArray(table.rows) ? table.rows : []).map((row) => ({
      ...row,
      id: "",
      cells: columns.map((column) => cleanText(row?.cells?.[column?.id]))
    }));
    return normalizeCloudAlternativeContent({
      ...table,
      id: "",
      folderId: "",
      name: "",
      columns: columns.map((column) => ({ ...column, id: "" })),
      rows
    });
  }

  if (["monster", "item", "spell"].includes(normalizedType)) {
    const row = isPlainObject(payload?.row) ? payload.row : {};
    return normalizeCloudAlternativeContent({
      row: { ...row, Name: "" },
      assets: isPlainObject(payload?.assets) ? payload.assets : {}
    });
  }

  return normalizeCloudAlternativeContent(payload);
}

function hasCloudImportedAlternativeChanges(type, localPayload, sourcePayload) {
  return JSON.stringify(getCloudAlternativeComparableEntity(type, localPayload))
    !== JSON.stringify(getCloudAlternativeComparableEntity(type, sourcePayload));
}

function updateCloudImportedRecordLocalRefs(recordId, updates) {
  state.cloudImportedEntries = state.cloudImportedEntries.map((record) => (
    record.id === recordId
      ? { ...record, localRefs: { ...record.localRefs, ...updates } }
      : record
  ));
}

async function renameCloudImportedCatalogEntity(record, nextName) {
  const refs = isPlainObject(record?.localRefs) ? record.localRefs : {};
  const entityId = cleanText(refs.entityIds?.[0]);
  const type = cleanText(record?.sourceType).toLowerCase();

  if (type === "character") {
    state.characters = state.characters.map((entry) => entry.id === entityId ? { ...entry, name: nextName } : entry);
    saveCharacters();
    return;
  }

  if (type === "encounter") {
    state.encounters = state.encounters.map((entry) => entry.id === entityId ? { ...entry, name: nextName } : entry);
    saveEncounterInventory();
    return;
  }

  if (type === "diary") {
    state.diaryNotes = state.diaryNotes.map((entry) => entry.id === entityId ? { ...entry, title: nextName } : entry);
    saveDiaryState();
    return;
  }

  if (type === "table") {
    state.tables = state.tables.map((entry) => entry.id === entityId ? { ...entry, name: nextName } : entry);
    saveTablesState();
    return;
  }

  if (!["monster", "item", "spell"].includes(type) || !cleanText(refs.repositoryKey) || !cleanText(refs.rowKey)) {
    throw new Error("No se pudo identificar la copia importada que quieres publicar.");
  }

  const repositoryKey = cleanText(refs.repositoryKey);
  const currentText = await loadRepositoryCsvRawText(repositoryKey);
  const parsedRows = parseCsv(currentText);
  const sourceRow = parsedRows.find((row) => getCloudCatalogCompendiumRowKey(repositoryKey, row) === refs.rowKey);

  if (!sourceRow) {
    throw new Error("No se encontró la entidad importada en el CSV activo.");
  }

  const renamedRow = { ...sourceRow, Name: nextName };
  const nextRowKey = getCloudCatalogCompendiumRowKey(repositoryKey, renamedRow);
  const collision = parsedRows.some((row) => (
    getCloudCatalogCompendiumRowKey(repositoryKey, row) === nextRowKey
    && getCloudCatalogCompendiumRowKey(repositoryKey, row) !== refs.rowKey
  ));

  if (collision) {
    throw new Error("Ya existe una entidad con ese nombre y fuente en el CSV activo.");
  }

  const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
  const headers = extractCsvHeaders(currentText, getCompendiumCsvHeaders(repositoryKey));
  const rows = parsedRows.map((row) => {
    const selected = getCloudCatalogCompendiumRowKey(repositoryKey, row) === refs.rowKey ? renamedRow : row;
    return Object.fromEntries(headers.map((header) => [header, String(selected?.[header] ?? "")]));
  });
  await writeRepositoryCsvRawText(repositoryKey, serializeCsvRows(headers, rows, lineBreak));

  const nextMapKey = repositoryKey === "arcanum"
    ? `${cleanText(renamedRow.Name)}||${cleanText(renamedRow.Source)}||${cleanText(renamedRow.Level)}`.toLowerCase()
    : `${cleanText(renamedRow.Name)}||${cleanText(renamedRow.Source)}`.toLowerCase();

  if (repositoryKey === "bestiary" && refs.mapKey && state.customBestiaryImageMap[refs.mapKey]) {
    const nextMap = { ...state.customBestiaryImageMap, [nextMapKey]: state.customBestiaryImageMap[refs.mapKey] };
    delete nextMap[refs.mapKey];
    saveBestiaryCustomImageMap(nextMap);
  } else if (repositoryKey === "items" && refs.mapKey && state.customItemImageMap[refs.mapKey]) {
    const nextMap = { ...state.customItemImageMap, [nextMapKey]: state.customItemImageMap[refs.mapKey] };
    delete nextMap[refs.mapKey];
    saveItemCustomImageMap(nextMap);
  }

  updateCloudImportedRecordLocalRefs(record.id, { rowKey: nextRowKey, mapKey: nextMapKey });
  await reloadCompendiumRepository(repositoryKey);
  scheduleDesktopCampaignDirtyStateSync(60);
}

async function publishLocalCloudCatalogItem(sourceEntityKey) {
  let localEntry = state.cloudLocalCatalogItems.find((entry) => entry.id === cleanText(sourceEntityKey));

  if (!localEntry || !state.accountSession?.user?.id) {
    return;
  }

  let operationTarget = `local-visibility:${localEntry.id}`;
  beginCloudOperation("saving", operationTarget);

  try {
    const importRecord = findCloudImportedRecordForLocalEntry(localEntry);

    if (importRecord) {
      const sourceResult = await getCloudLibraryEntry(importRecord.sourceEntryId);

      if (!hasCloudImportedAlternativeChanges(localEntry.type, localEntry.payload, sourceResult.payload)) {
        throw new Error("Para publicar una versión alternativa debes cambiar su contenido, no solo el nombre.");
      }

      const requestedName = window.prompt(
        "Esta copia procede de otra publicación. Confirma su nombre para publicarla en esta campaña:",
        localEntry.name
      );

      if (requestedName === null) {
        state.accountError = "";
        endCloudOperation("saving", operationTarget);
        render();
        return;
      }

      const nextName = cleanText(requestedName);

      if (!nextName) {
        throw new Error("La versión alternativa necesita un nombre.");
      }

      const duplicateName = state.cloudLocalCatalogItems.some((entry) => (
        entry.id !== localEntry.id
        && cleanText(entry.type).toLowerCase() === cleanText(localEntry.type).toLowerCase()
        && normalizeSearchText(entry.name) === normalizeSearchText(nextName)
      ));

      if (duplicateName) {
        throw new Error("Ya existe contenido con ese nombre para este usuario y campaña en esta categoría.");
      }

      if (normalizeSearchText(nextName) !== normalizeSearchText(localEntry.name)) {
        await renameCloudImportedCatalogEntity(importRecord, nextName);
        state.cloudLocalCatalogItems = await getCurrentCampaignCloudCatalogItems();
        localEntry = state.cloudLocalCatalogItems.find((entry) => findCloudImportedRecordForLocalEntry(entry)?.id === importRecord.id);
      }

      if (!localEntry) {
        throw new Error("No se pudo preparar la versión alternativa después de renombrarla.");
      }

      operationTarget = `local-visibility:${localEntry.id}`;
      state.cloudOperationTarget = operationTarget;
      render();
    }

    if (!state.cloudCampaignId) {
      state.accountCampaignName = cleanText(state.accountCampaignName || state.campaignName) || "Campaña sin nombre";
      await saveCurrentCampaignToCloud();

      if (!state.cloudCampaignId) {
        throw new Error(state.accountError || "No se pudo crear la campaña cloud.");
      }
    } else {
      const saved = await autosaveCloudCampaign({ force: true });

      if (saved === false) {
        throw new Error(state.cloudAutosaveMessage || "No se pudo guardar la campaña cloud.");
      }
    }

    const ownedResult = await listCloudLibraryEntries();
    state.cloudLibraryEntries = Array.isArray(ownedResult.entries) ? ownedResult.entries : [];
    const cloudEntry = state.cloudLibraryEntries.find((entry) => (
      cleanText(entry.sourceCampaignId) === cleanText(state.cloudCampaignId)
      && cleanText(entry.sourceEntityKey) === localEntry.id
    ));

    if (!cloudEntry) {
      throw new Error("El contenido no pudo prepararse para publicar.");
    }

    await setCloudLibraryEntryVisibility(cloudEntry.id, {
      isPublic: true,
      baseRevision: cloudEntry.revision
    });

    if (importRecord) {
      state.cloudImportedEntries = state.cloudImportedEntries.map((record) => (
        record.id === importRecord.id ? { ...record, isAlternative: true } : record
      ));
      scheduleDesktopCampaignDirtyStateSync(60);
    }

    await refreshCommunityCatalog();
    pushNotification({
      title: `${getCloudLibraryTypeLabel(localEntry.type)} publicado`,
      message: `${localEntry.name} ya está disponible en la comunidad.`
    });
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  endCloudOperation("saving", operationTarget);
  render();
}

async function removeCloudLibraryEntry(entryId) {
  const entry = state.cloudLibraryEntries.find((item) => item.id === entryId);

  if (!entry || !window.confirm(`Eliminar “${entry.name}” de la nube?`)) {
    return;
  }

  try {
    await deleteCloudLibraryEntry(entryId);
    await refreshCloudLibrary();
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
    render();
  }
}

async function startGoogleAccountFlow(register) {
  if (register && !cleanText(state.accountRegistrationCode)) {
    state.accountError = "Escribe el código de registro.";
    render({ focusSelector: "[data-account-registration-code]" });
    return;
  }

  state.accountError = "";
  const operationTarget = `auth:${register ? "register" : "login"}`;
  beginCloudOperation("loading", operationTarget);

  try {
    await beginGoogleAuth({
      register,
      registrationCode: state.accountRegistrationCode
    });
  } catch (error) {
    endCloudOperation("loading", operationTarget);
    state.accountError = getCloudErrorMessage(error);
    render();
  }
}

function stopCloudCampaignAutosave() {
  if (typeof window !== "undefined" && cloudCampaignAutosaveTimer) {
    window.clearTimeout(cloudCampaignAutosaveTimer);
  }

  if (typeof window !== "undefined" && cloudCampaignAutosaveInterval) {
    window.clearInterval(cloudCampaignAutosaveInterval);
  }

  cloudCampaignAutosaveTimer = 0;
  cloudCampaignAutosaveInterval = 0;
}

function detachActiveCloudCampaign(options = {}) {
  if (cloudCampaignAutosaveTimer) {
    window.clearTimeout(cloudCampaignAutosaveTimer);
  }

  cloudCampaignAutosaveTimer = 0;
  state.cloudCampaignId = "";
  state.cloudCampaignRevision = 0;
  state.cloudCampaignIsPublic = false;
  state.cloudCampaignUpdatedAt = "";
  state.cloudAutosaveStatus = "idle";
  state.cloudAutosaveMessage = "";
  lastCloudCampaignSnapshot = "";
  cloudCampaignChangeRevision = 0;
  lastCloudCampaignSavedChangeRevision = 0;

  if (options.keepLocalLabel === true) {
    state.campaignLoadedFromPublic = true;
  } else {
    state.campaignLoadedFromPublic = false;
  }

  if (options.preserveStoredMeta !== true) {
    saveActiveCloudCampaignMeta();
  }
}

function clearPrivateCloudAccountState() {
  state.cloudCampaigns = [];
  state.cloudLibraryEntries = [];
  state.cloudLocalCatalogItems = [];
  state.cloudCatalogSelectedIds = new Set();
  state.cloudCatalogPreview = null;
  state.cloudCatalogPreviewBusy = false;
  state.accountProfileNameDraft = "";
  state.accountProfileNameEditing = false;
}

async function handleAccountSignOut() {
  try {
    const saved = await autosaveCloudCampaign();

    if (saved === false) {
      state.accountError = state.cloudAutosaveMessage || "No se pudo guardar la campaña cloud. No se ha cerrado la sesión.";
      render();
      return;
    }

    const result = await signOutAccount();
    stopCloudCampaignAutosave();
    detachActiveCloudCampaign();
    state.accountSession = null;
    clearPrivateCloudAccountState();
    state.accountDialogOpen = false;
    state.accountStatus = "ready";
    resetUnloadedCampaignWorkspace();

    if (result?.url) {
      window.location.assign(result.url);
      return;
    }
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }
  render();
}

function activateCloudCampaign(campaign, payload, options = {}) {
  state.cloudCampaignId = cleanText(campaign?.id);
  state.cloudCampaignRevision = Math.max(0, Number(campaign?.revision) || 0);
  state.cloudCampaignIsPublic = campaign?.isPublic === true;
  state.cloudCampaignUpdatedAt = cleanText(campaign?.updatedAt);
  state.cloudAutosaveStatus = "saved";
  state.cloudAutosaveMessage = "";
  state.campaignLoadedFromPublic = false;
  state.campaignName = cleanText(campaign?.name) || cleanText(payload?.campaign?.name) || state.campaignName;
  state.accountCampaignName = state.campaignName;
  lastCloudCampaignSnapshot = getComparableCampaignSnapshot(payload);

  if (Number.isFinite(options.savedChangeRevision)) {
    lastCloudCampaignSavedChangeRevision = options.savedChangeRevision;
  } else {
    cloudCampaignChangeRevision = 0;
    lastCloudCampaignSavedChangeRevision = 0;
  }

  saveActiveCloudCampaignMeta();
}

async function saveCurrentCampaignToCloud() {
  if (!state.accountSession?.user?.id) {
    state.accountError = "Inicia sesión para guardar en la nube.";
    render();
    return;
  }

  const campaignName = cleanText(state.accountCampaignName) || cleanText(state.campaignName) || "Campaña sin nombre";
  const operationTarget = "campaign:create";
  state.campaignName = campaignName;
  state.cloudAutosaveStatus = "saving";
  beginCloudOperation("saving", operationTarget);

  try {
    const catalogPayload = await attachCloudCatalogToCampaignPayload(createCampaignSavePayload());
    const payload = await preparePayloadImagesForCloud(catalogPayload);
    const result = await createCloudCampaign({ name: campaignName, payload });
    activateCloudCampaign(result.campaign, payload);
    state.accountError = "";
    await refreshCloudCampaigns({ renderAfter: false });
    pushNotification({
      title: "Campaña cloud creada",
      message: "Autoguardado activado para esta campaña."
    });
  } catch (error) {
    state.cloudAutosaveStatus = "error";
    state.accountError = getCloudErrorMessage(error);
  }
  endCloudOperation("saving", operationTarget);
  render();
}

async function prepareToReplaceActiveCloudCampaign({ allowConflict = false } = {}) {
  if (!state.cloudCampaignId) {
    return true;
  }

  if (state.cloudAutosaveStatus === "conflict") {
    if (allowConflict) {
      return true;
    }

    state.accountError = "Recarga la campaña cloud activa antes de cambiar de campaña.";
    return false;
  }

  const saved = await autosaveCloudCampaign();

  if (saved !== false) {
    return true;
  }

  state.accountError = state.cloudAutosaveMessage || "No se pudo guardar la campaña cloud activa.";
  return false;
}

async function loadCloudCampaignById(campaignId, options = {}) {
  const normalizedId = cleanText(campaignId);

  if (!normalizedId) {
    return false;
  }

  const operationTarget = cleanText(options.operationTarget) || `campaign:${normalizedId}`;

  if (options.silent !== true && options.operationAlreadyStarted !== true) {
    beginCloudOperation("loading", operationTarget);
  }

  const canReplace = await prepareToReplaceActiveCloudCampaign({
    allowConflict: normalizedId === state.cloudCampaignId
  });

  if (!canReplace) {
    endCloudOperation("loading", operationTarget);
    if (options.silent !== true) {
      render();
    }
    return false;
  }

  cloudCampaignSaveSuspended = true;

  try {
    const result = await getCloudCampaign(normalizedId);
    const campaign = normalizeCampaignSave(result.payload);
    state.campaignFileName = "";
    state.campaignFilePath = "";
    applyCampaignSave(campaign);
    activateCloudCampaign(result.campaign, result.payload);
    state.accountDialogOpen = options.silent === true ? state.accountDialogOpen : false;
    state.campaignMessage = `Campaña cloud cargada: ${campaign.name}`;
    state.accountError = "";
    cloudCampaignSaveSuspended = false;
    endCloudOperation("loading", operationTarget);
    render();
    return true;
  } catch (error) {
    cloudCampaignSaveSuspended = false;
    state.accountError = getCloudErrorMessage(error);

    if (error instanceof CloudApiError && error.status === 404) {
      detachActiveCloudCampaign();
    }

    endCloudOperation("loading", operationTarget);
    if (options.silent !== true) {
      render();
    }
    return false;
  }
}

function updateCloudCampaignSummary(campaign) {
  state.cloudCampaigns = state.cloudCampaigns.map((entry) => entry.id === campaign.id ? campaign : entry);
  state.publicCloudCampaigns = state.publicCloudCampaigns
    .filter((entry) => entry.id !== campaign.id || campaign.isPublic)
    .map((entry) => entry.id === campaign.id ? campaign : entry);
}

async function autosaveCloudCampaign(options = {}) {
  if (
    cloudCampaignSaveSuspended
    || !state.accountSession?.user?.id
    || !state.cloudCampaignId
    || state.cloudAutosaveStatus === "conflict"
  ) {
    return true;
  }

  if (cloudCampaignSaveInProgress) {
    const activeSave = cloudCampaignSaveInProgress;

    if (options.isPublic !== undefined) {
      const saved = await activeSave;

      if (state.cloudAutosaveStatus !== "conflict") {
        return autosaveCloudCampaign(options);
      }

      return saved;
    }

    return activeSave;
  }

  const isPublic = options.isPublic ?? state.cloudCampaignIsPublic;
  const saveChangeRevision = cloudCampaignChangeRevision;

  if (
    options.force !== true
    && saveChangeRevision === lastCloudCampaignSavedChangeRevision
    && isPublic === state.cloudCampaignIsPublic
  ) {
    return true;
  }

  const catalogPayload = await attachCloudCatalogToCampaignPayload(createCampaignSavePayload());
  const payload = await preparePayloadImagesForCloud(catalogPayload);
  const comparableSnapshot = getComparableCampaignSnapshot(payload);

  if (options.force !== true && comparableSnapshot === lastCloudCampaignSnapshot && isPublic === state.cloudCampaignIsPublic) {
    lastCloudCampaignSavedChangeRevision = saveChangeRevision;
    return true;
  }

  state.cloudAutosaveStatus = "saving";
  state.cloudAutosaveMessage = "";
  syncCloudAccountUi();

  cloudCampaignSaveInProgress = updateCloudCampaign(state.cloudCampaignId, {
    name: cleanText(state.campaignName) || "Campaña sin nombre",
    isPublic,
    baseRevision: state.cloudCampaignRevision,
    payload
  })
    .then((result) => {
      activateCloudCampaign(result.campaign, payload, { savedChangeRevision: saveChangeRevision });
      updateCloudCampaignSummary(result.campaign);
      syncCloudAccountUi();
      return true;
    })
    .catch((error) => {
      state.cloudAutosaveStatus = error instanceof CloudApiError && error.code === "revision_conflict"
        ? "conflict"
        : "error";
      state.cloudAutosaveMessage = getCloudErrorMessage(error);
      state.accountError = state.cloudAutosaveMessage;
      pushNotification({
        title: state.cloudAutosaveStatus === "conflict" ? "Conflicto de campaña" : "Error de autoguardado",
        message: state.cloudAutosaveMessage,
        tone: "danger",
        durationMs: 8000
      });
      syncNotificationUi();
      syncCloudAccountUi();
      return false;
    })
    .finally(() => {
      cloudCampaignSaveInProgress = null;

      if (
        state.cloudAutosaveStatus === "saved"
        && cloudCampaignChangeRevision !== lastCloudCampaignSavedChangeRevision
      ) {
        scheduleCloudCampaignAutosave(1500);
      }
    });

  return cloudCampaignSaveInProgress;
}

function scheduleCloudCampaignAutosave(delay = 4000) {
  if (
    typeof window === "undefined"
    || cloudCampaignSaveSuspended
    || !state.accountSession?.user?.id
    || !state.cloudCampaignId
    || state.cloudAutosaveStatus === "conflict"
  ) {
    return;
  }

  if (cloudCampaignAutosaveTimer) {
    window.clearTimeout(cloudCampaignAutosaveTimer);
  }

  state.cloudAutosaveStatus = "pending";
  syncCloudAccountUi();
  cloudCampaignAutosaveTimer = window.setTimeout(() => {
    cloudCampaignAutosaveTimer = 0;
    autosaveCloudCampaign();
  }, Math.max(1500, Number(delay) || 4000));
}

function startCloudCampaignAutosave() {
  if (typeof window === "undefined") {
    return;
  }

  if (!cloudCampaignAutosaveInterval) {
    cloudCampaignAutosaveInterval = window.setInterval(() => {
      autosaveCloudCampaign();
    }, 60_000);
  }

  if (!cloudCampaignVisibilityHandlerRegistered) {
    cloudCampaignVisibilityHandlerRegistered = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        autosaveCloudCampaign();
      }
    });
  }
}

function syncCloudAccountUi() {
  if (!app) {
    return;
  }

  const currentChip = app.querySelector("[data-account-chip-root]");
  const nextChip = createTranslatedMarkupElement(renderAccountChip());

  if (currentChip && nextChip) {
    currentChip.replaceWith(nextChip);
  }

  const saveStatus = app.querySelector("[data-cloud-save-status]");

  if (saveStatus) {
    saveStatus.className = `account-autosave-status account-autosave-status--${state.cloudAutosaveStatus}`;
    saveStatus.innerHTML = `
      <strong>${escapeHtml(getCloudAutosaveLabel())}</strong>
      ${state.cloudAutosaveMessage ? `<small>${escapeHtml(state.cloudAutosaveMessage)}</small>` : ""}
    `;
    applyInterfaceTranslations(saveStatus);
  }
}

async function toggleCloudCampaignPublic(campaignId) {
  const summary = state.cloudCampaigns.find((campaign) => campaign.id === campaignId);

  if (!summary) {
    return;
  }

  const nextPublic = !summary.isPublic;

  if (
    nextPublic
    && !window.confirm("Hacer pública esta campaña permite que cualquiera copie todo su contenido, incluido diario y contenido personalizado. ¿Continuar?")
  ) {
    return;
  }

  const isActiveCampaign = campaignId === state.cloudCampaignId;
  const operationTarget = `campaign-visibility:${campaignId}`;
  beginCloudOperation("saving", operationTarget);

  if (isActiveCampaign) {
    state.cloudAutosaveStatus = "saving";
    syncCloudAccountUi();
  }

  try {
    if (isActiveCampaign) {
      await autosaveCloudCampaign({ force: true, isPublic: nextPublic });
    } else {
      const result = await setCloudCampaignVisibility(campaignId, {
        isPublic: nextPublic,
        baseRevision: summary.revision
      });
      updateCloudCampaignSummary(result.campaign);
    }

    await refreshCloudCampaigns({ renderAfter: false });
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }
  endCloudOperation("saving", operationTarget);
  render();
}

async function removeCloudCampaign(campaignId) {
  const summary = state.cloudCampaigns.find((campaign) => campaign.id === campaignId);

  if (!summary || !window.confirm(`Eliminar “${summary.name}” de la nube? Esta acción no se puede deshacer.`)) {
    return;
  }

  const deletingActiveCampaign = campaignId === state.cloudCampaignId;

  if (deletingActiveCampaign) {
    cloudCampaignSaveSuspended = true;

    if (cloudCampaignSaveInProgress) {
      await cloudCampaignSaveInProgress;
    }
  }

  try {
    await deleteCloudCampaign(campaignId);
    const removedCatalogEntryIds = new Set([
      ...state.cloudLibraryEntries,
      ...state.publicCloudLibraryEntries
    ]
      .filter((entry) => cleanText(entry?.sourceCampaignId) === campaignId)
      .map((entry) => cleanText(entry?.id))
      .filter(Boolean));
    state.cloudCampaigns = state.cloudCampaigns.filter((campaign) => cleanText(campaign?.id) !== campaignId);
    state.publicCloudCampaigns = state.publicCloudCampaigns.filter((campaign) => cleanText(campaign?.id) !== campaignId);
    state.cloudLibraryEntries = state.cloudLibraryEntries.filter((entry) => cleanText(entry?.sourceCampaignId) !== campaignId);
    state.publicCloudLibraryEntries = state.publicCloudLibraryEntries.filter((entry) => cleanText(entry?.sourceCampaignId) !== campaignId);
    state.cloudCatalogSelectedIds = new Set([...state.cloudCatalogSelectedIds].filter((selectionKey) => (
      !removedCatalogEntryIds.has(cleanText(selectionKey).replace(/^entry:/, ""))
    )));
    state.cloudImportUpdateCandidates = state.cloudImportUpdateCandidates.filter((candidate) => (
      !removedCatalogEntryIds.has(cleanText(candidate?.latest?.id))
    ));

    if (deletingActiveCampaign) {
      detachActiveCloudCampaign();
      resetUnloadedCampaignWorkspace();
      state.campaignMessage = "Campaña cloud eliminada. No hay ninguna campaña cargada.";
    }

    await refreshCloudCampaigns({ renderAfter: false });
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }
  cloudCampaignSaveSuspended = false;
  render();
}

async function clonePublicCampaign(campaignId) {
  const operationTarget = `public-campaign:${campaignId}`;
  beginCloudOperation("loading", operationTarget);

  try {
    const result = await cloneCloudCampaign(campaignId);
    await refreshCloudCampaigns({ renderAfter: false });
    await loadCloudCampaignById(result.campaign.id, {
      operationTarget,
      operationAlreadyStarted: true
    });
  } catch (error) {
    endCloudOperation("loading", operationTarget);
    state.accountError = getCloudErrorMessage(error);
    render();
  }
}

async function loadPublicCampaignLocally(campaignId) {
  const operationTarget = `public-campaign:${campaignId}`;
  beginCloudOperation("loading", operationTarget);

  if (!await prepareToReplaceActiveCloudCampaign()) {
    endCloudOperation("loading", operationTarget);
    render();
    return;
  }

  cloudCampaignSaveSuspended = true;

  try {
    const result = await getCloudCampaign(campaignId);
    const campaign = normalizeCampaignSave(result.payload);
    detachActiveCloudCampaign();
    state.campaignFileName = "";
    state.campaignFilePath = "";
    applyCampaignSave(campaign);
    state.campaignLoadedFromPublic = true;
    state.campaignName = campaign.name;
    state.campaignMessage = `Copia pública cargada localmente: ${campaign.name}`;
    state.accountDialogOpen = false;
    state.accountError = "";
  } catch (error) {
    state.accountError = getCloudErrorMessage(error);
  }

  cloudCampaignSaveSuspended = false;
  endCloudOperation("loading", operationTarget);
  render();
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
  state.campaignSavedAt = "";
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
    state.campaignSavedAt = payload.savedAt;
    state.campaignMessage = `Archivo creado: ${fileName}`;
    saveCampaignMeta();
    render();
  } catch {
    state.campaignMessage = "No se pudo guardar la campaña.";
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
    state.campaignSavedAt = payload.savedAt;
    state.campaignMessage = `Archivo creado: ${fileName}`;
    saveCampaignMeta();
    render();
  } catch {
    state.campaignMessage = "No se pudo guardar la campaña.";
    render();
  }
}

async function createNewCampaign() {
  const blankPayload = createBlankCampaignSavePayload();

  try {
    if (!await prepareToReplaceActiveCloudCampaign()) {
      render();
      return;
    }

    detachActiveCloudCampaign();
    state.campaignLoadedFromPublic = false;
    clearPersistedCampaignState();
    clearActiveCampaignFileSelection();
    resetCampaignStateFromPayload(blankPayload);
    state.campaignName = cleanText(blankPayload.campaign?.name) || "Campaña sin nombre";
    state.campaignMessage = "Nueva campaña sin guardar.";
    render();
  } catch {
    state.campaignMessage = "No se pudo crear la campaña.";
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

function resetUnloadedCampaignWorkspace() {
  const campaign = normalizeCampaignSave(createBlankCampaignSavePayload());

  state.campaignFileName = "";
  state.campaignFilePath = "";
  applyCampaignSave(campaign, null, {
    isUnloaded: true,
    unloadCompendiums: true
  });
  state.accountCampaignName = "Campaña sin nombre";
  state.cloudLocalCatalogItems = [];
  state.campaignMessage = "";
}

function applyCampaignFileResult(result) {
  const filePath = cleanText(result?.filePath);
  const fileName = cleanText(result?.fileName) || getFileNameFromPath(filePath);

  if (!fileName && !filePath) {
    return;
  }

  state.campaignFileName = fileName || state.campaignFileName;
  state.campaignFilePath = filePath || state.campaignFilePath;
  state.campaignSavedAt = cleanText(result?.payload?.savedAt) || state.campaignSavedAt;
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
    || "Campaña";
}

function createBlankCampaignSavePayload(name = "Campaña sin nombre") {
  return {
    schema: CAMPAIGN_FILE_SCHEMA,
    version: CAMPAIGN_FILE_VERSION,
    app: "Mimic Dice",
    savedAt: new Date().toISOString(),
    campaign: {
      name: cleanText(name) || "Campaña sin nombre"
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
    diary: getDefaultDiaryState(),
    tables: getDefaultTablesState(),
    combatTracker: {
      combatants: [],
      filters: { ...blankFilters },
      sort: getDefaultCombatSort(),
      combatSearchQuery: "",
      sortDefaultVersion: COMBAT_TRACKER_SORT_DEFAULT_VERSION,
      newEntitySide: "allies",
      nextId: 1,
      inlineAdjustments: {},
      areaDamage: "",
      isCombatActive: false,
      activeTurnCombatantId: "",
      combatRound: 1,
      enemyHpMode: ENEMY_HP_MODE_FIXED,
      battleTimer: {
        elapsedMs: 0,
        isRunning: false
      }
    },
    compendiumCustomMaps: {
      bestiary: {},
      items: {},
      arcanum: {}
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
  const shouldSaveAs = options.saveAs === true || !hasExistingCampaignFile;

  if (!hasExistingCampaignFile && options.silent && !options.saveAs) {
    return null;
  }

  const saveAction = shouldSaveAs ? desktopApi.saveCampaignAs : desktopApi.saveCampaign;

  if (typeof saveAction !== "function") {
    return null;
  }

  campaignSaveInProgress = (
    shouldSaveAs
      ? saveAction(payload, fileName, { deriveNameFromFile: true, filePath })
      : saveAction(payload, fileName, filePath, { silent: options.silent === true })
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

    if (!await prepareToReplaceActiveCloudCampaign()) {
      render();
      return;
    }

    detachActiveCloudCampaign();
    state.campaignLoadedFromPublic = false;
    applyCampaignSave(campaign, result);
    state.campaignMessage = `Campaña cargada: ${campaign.name}`;
    render();
  } catch {
    state.campaignMessage = "No se pudo cargar el archivo de campaña.";
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

    if (!await prepareToReplaceActiveCloudCampaign()) {
      render();
      return;
    }

    detachActiveCloudCampaign();
    state.campaignLoadedFromPublic = false;
    applyCampaignSave(campaign, {
      fileName: file.name,
      name: campaign.name,
      payload: parsedValue
    });
    state.campaignMessage = `Campaña cargada: ${campaign.name}`;
    render();
  } catch {
    state.campaignMessage = "No se pudo cargar el archivo de campaña.";
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
      cache: "default"
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
      cache: "default"
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

  if (
    !cloudCampaignSaveSuspended
    && state.accountSession?.user?.id
    && state.cloudCampaignId
  ) {
    cloudCampaignChangeRevision += 1;
  }

  scheduleCloudCampaignAutosave(4000);

  if (campaignDirtyStateSyncTimer) {
    window.clearTimeout(campaignDirtyStateSyncTimer);
  }

  campaignDirtyStateSyncTimer = window.setTimeout(() => {
    campaignDirtyStateSyncTimer = 0;
    syncDesktopCampaignDirtyState();
  }, Math.max(0, delay));
}

function createCampaignSavePayload(options = {}) {
  const name = cleanText(state.campaignName) || "Campaña sin nombre";
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
    diary: getDiarySaveData(),
    tables: getTablesSaveData(),
    combatTracker: getCombatTrackerSaveData({
      includeBattleTimer: true
    }),
    repositoryCsvOverrides: getRepositoryCsvOverridesSaveData(),
    compendiumCustomMaps: {
      bestiary: isPlainObject(state.customBestiaryImageMap) ? state.customBestiaryImageMap : {},
      items: isPlainObject(state.customItemImageMap) ? state.customItemImageMap : {},
      arcanum: isPlainObject(state.customArcanumMap) ? state.customArcanumMap : {}
    },
    cloudImports: {
      version: 1,
      entries: normalizeCloudImportedEntries(state.cloudImportedEntries)
    },
    ui: {
      activeScreen: state.activeScreen,
      activeEncounterId: state.activeEncounterId,
      activeEncounterFolderId: state.activeEncounterFolderId,
      contentLanguage: normalizeStoredContentLanguage(state.contentLanguage),
      includeNpcInCombatExperience: state.includeNpcInCombatExperience === true,
      soundSettings: normalizeStoredSoundSettings(state.soundSettings),
      repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(state.repositoryCsvPaths)
    }
  };
}

function getComparableCampaignSnapshot(payload = createCampaignSavePayload({ savedAt: "" })) {
  const { cloudCatalog: _cloudCatalog, ...campaignPayload } = payload;
  return JSON.stringify({
    ...campaignPayload,
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
  const diary = normalizeStoredDiaryState(value.diary);
  const tables = normalizeStoredTablesState(value.tables);
  const characters = normalizeStoredCharacters(value.characters, characterSkillDefinitions);
  const combatTracker = normalizeStoredCombatTrackerState(value.combatTracker);
  const battleTimer = normalizeStoredBattleTimer(value.combatTracker?.battleTimer);
  const savedAt = cleanText(value.savedAt);
  const ui = isPlainObject(value.ui) ? value.ui : {};
  const campaign = isPlainObject(value.campaign) ? value.campaign : {};
  const compendiumCustomMaps = isPlainObject(value.compendiumCustomMaps) ? value.compendiumCustomMaps : {};
  const cloudImportedEntries = normalizeCloudImportedEntries(value.cloudImports);
  const name = cleanText(campaign.name) || cleanText(value.name) || "Campaña sin nombre";

  return {
    name,
    savedAt,
    characterSkillDefinitions,
    characters,
    encounterInventory,
    diary,
    tables,
    combatTracker,
    battleTimer,
    activeScreen: normalizeStoredActiveScreen(ui.activeScreen),
    activeEncounterId: cleanText(ui.activeEncounterId),
    activeEncounterFolderId: cleanText(ui.activeEncounterFolderId),
    contentLanguage: normalizeStoredContentLanguage(ui.contentLanguage),
    includeNpcInCombatExperience: normalizeStoredNpcExperienceSetting(ui.includeNpcInCombatExperience),
    soundSettings: normalizeStoredSoundSettings(ui.soundSettings),
    repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(ui.repositoryCsvPaths),
    repositoryCsvOverrides: normalizeStoredRepositoryCsvOverrides(value.repositoryCsvOverrides),
    cloudImportedEntries,
    compendiumCustomMaps: {
      bestiary: isPlainObject(compendiumCustomMaps.bestiary) ? compendiumCustomMaps.bestiary : {},
      items: isPlainObject(compendiumCustomMaps.items) ? compendiumCustomMaps.items : {},
      arcanum: isPlainObject(compendiumCustomMaps.arcanum) ? compendiumCustomMaps.arcanum : {}
    }
  };
}

function resetTransientCampaignUiState() {
  stopActiveTableRoll();
  state.menuHubOpen = false;
  state.fileMenuOpen = false;
  state.optionsMenuOpen = false;
  closeCampaignSaveNameDialog();
  state.characterSkillConfigOpen = false;
  state.characterSkillsExpanded = false;
  state.activeCharacterInventoryRowId = "";
  state.showCharacterInventorySuggestions = false;
  state.activeCharacterSpellRowId = "";
  state.showCharacterSpellSuggestions = false;
  state.encounterInventoryOpen = false;
  state.selectedIds = new Set();
  state.activeFilterKey = "";
  state.combatSearchQuery = "";
  state.activeCombatNameSearchId = "";
  state.activeCombatSourceId = "";
  state.combatEncounterPickerOpen = false;
  state.combatAddPickerMode = "";
  state.characterXpAwardDrafts = {};
  state.activeTableFolderId = "";
  state.activeEncounterRowId = "";
  state.activeEncounterSourceRowId = "";
  state.selectedEncounterIds = new Set();
  state.selectedEncounterFolderIds = new Set();
  state.encounterSearchQuery = "";
  state.showEncounterSearchSuggestions = false;
  state.draggedEncounterId = "";
  state.draggedEncounterFolderId = "";
  state.draggedFolderId = "";
  state.selectedCharacterIds = new Set();
  state.activeDiaryFolderId = "";
  state.activeCombatStatusMenuId = "";
  state.combatStatusDrafts = {};
  state.combatTurnRoundEditorOpen = false;
  state.combatTurnRoundDraft = "";
  state.combatTurnJumpMenuOpen = false;
  closeCombatAreaTargetPicker();
  closeCombatTurnQuickMenu();
  hideDiaryMentionSuggestions();
}

function applyCampaignSave(campaign, fileResult = null, options = {}) {
  stopBattleTimerInterval();

  state.campaignName = options.isUnloaded === true ? "" : campaign.name;
  state.campaignSavedAt = options.isUnloaded === true ? "" : cleanText(campaign.savedAt);
  state.campaignFileName = options.isUnloaded === true ? "" : cleanText(fileResult?.fileName) || state.campaignFileName;
  state.campaignFilePath = options.isUnloaded === true ? "" : cleanText(fileResult?.filePath) || state.campaignFilePath;
  state.activeScreen = campaign.activeScreen;
  state.contentLanguage = campaign.contentLanguage;
  state.includeNpcInCombatExperience = campaign.includeNpcInCombatExperience;
  state.soundSettings = campaign.soundSettings;
  state.repositoryCsvPaths = campaign.repositoryCsvPaths;
  state.cloudImportedEntries = normalizeCloudImportedEntries(campaign.cloudImportedEntries);
  state.cloudCatalogSelectedIds = new Set();
  state.cloudImportUpdateCandidates = [];
  state.cloudImportUpdateDialogOpen = false;
  state.cloudImportUpdateSelectedIds = new Set();
  state.repositoryCsvUploads = { ...blankRepositoryCsvUploads };
  saveBestiaryCustomImageMap(campaign.compendiumCustomMaps?.bestiary ?? {});
  saveItemCustomImageMap(campaign.compendiumCustomMaps?.items ?? {});
  saveArcanumCustomMap(campaign.compendiumCustomMaps?.arcanum ?? {});
  Object.entries(campaign.repositoryCsvOverrides ?? {}).forEach(([repositoryKey, override]) => {
    if (!defaultRepositoryCsvPaths[repositoryKey] || !isPlainObject(override)) {
      return;
    }

    if (isUploadedRepositoryCsvPath(override.path) && override.text) {
      const uploadRecord = {
        repositoryKey,
        path: override.path,
        name: cleanText(override.name) || decodeUploadedRepositoryCsvPath(override.path)?.fileName || "custom.csv",
        text: String(override.text)
      };

      setRepositoryCsvUpload(repositoryKey, uploadRecord);
      saveRepositoryCsvUploadRecord(uploadRecord).catch(() => {});
    }
  });
  resetTransientCampaignUiState();
  state.combatants = campaign.combatTracker.combatants;
  state.filters = campaign.combatTracker.filters;
  state.sort = campaign.combatTracker.sort;
  state.combatSearchQuery = campaign.combatTracker.combatSearchQuery;
  state.newEntitySide = campaign.combatTracker.newEntitySide;
  state.nextId = campaign.combatTracker.nextId;
  state.inlineAdjustments = campaign.combatTracker.inlineAdjustments;
  state.areaDamage = campaign.combatTracker.areaDamage;
  state.isCombatActive = campaign.combatTracker.isCombatActive;
  state.activeTurnCombatantId = campaign.combatTracker.activeTurnCombatantId;
  state.combatRound = campaign.combatTracker.combatRound;
  state.enemyHpMode = campaign.combatTracker.enemyHpMode;
  state.battleTimer = campaign.battleTimer;
  state.characterSkillDefinitions = campaign.characterSkillDefinitions;
  state.characters = campaign.characters;
  state.activeCharacterId = state.characters[0]?.id ?? "";
  state.selectedCharacterIds = new Set(state.activeCharacterId ? [state.activeCharacterId] : []);

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
  state.diaryFolders = campaign.diary.folders;
  state.systemDiaryFolderExpanded = campaign.diary.systemFolderExpanded;
  state.diaryTagColors = campaign.diary.tagColors;
  state.diaryHarptosDayNotes = campaign.diary.harptosDayNotes;
  state.diaryNotes = campaign.diary.notes.map((note) => ({
    ...note,
    contentHtml: normalizeDiaryContentHtml(note.contentHtml)
  }));
  state.activeDiaryFolderId = campaign.diary.activeDiaryFolderId;
  state.activeDiaryNoteId = campaign.diary.activeNoteId;
  state.tableFolders = campaign.tables.folders;
  state.systemTableFolderExpanded = campaign.tables.systemFolderExpanded;
  state.tables = campaign.tables.tables;
  state.activeTableFolderId = campaign.tables.activeTableFolderId;
  state.activeTableId = campaign.tables.activeTableId;
  state.openTableIds = campaign.tables.openTableIds;
  state.rolledTableRowId = "";
  synchronizeLanguageSpecificSystemData({ syncCombatants: true });
  reconcileDiaryUiState();
  reconcileTablesUiState();

  saveCombatTrackerState();
  saveCharacterSkillDefinitions();
  saveCharacters();
  saveEncounterInventory();
  saveDiaryState();
  saveTablesState();

  if (options.unloadCompendiums === true) {
    unloadCompendiumContent();
  } else {
    reloadCompendiumContent();
  }

  if (fileResult) {
    applyCampaignFileResult(fileResult);
  }

  saveCampaignMeta();
  lastSavedCampaignSnapshot = getComparableCampaignSnapshot();
  scheduleDesktopCampaignDirtyStateSync();
  queueCloudImportedEntryUpdateCheck();
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
    return { name: "", fileName: "", filePath: "", savedAt: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, includeNpcInCombatExperience: false, soundSettings: { ...defaultSoundSettings }, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
  }

  if (usesDesktopFileOnlyPersistence()) {
    return { name: "", fileName: "", filePath: "", savedAt: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, includeNpcInCombatExperience: false, soundSettings: { ...defaultSoundSettings }, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(CAMPAIGN_META_STORAGE_KEY) || "{}");
    const filePath = cleanText(parsedValue.filePath);
    const fileName = cleanText(parsedValue.fileName) || getFileNameFromPath(filePath);

    return {
      name: fileName ? cleanText(parsedValue.name) || getCampaignNameFromFileName(fileName) : "",
      fileName,
      filePath,
      savedAt: cleanText(parsedValue.savedAt),
      language: normalizeStoredAppLanguage(parsedValue.language),
      contentLanguage: normalizeStoredContentLanguage(parsedValue.contentLanguage),
      includeNpcInCombatExperience: normalizeStoredNpcExperienceSetting(parsedValue.includeNpcInCombatExperience),
      soundSettings: normalizeStoredSoundSettings(parsedValue.soundSettings),
      repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(parsedValue.repositoryCsvPaths)
    };
  } catch {
    return { name: "", fileName: "", filePath: "", savedAt: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, includeNpcInCombatExperience: false, soundSettings: { ...defaultSoundSettings }, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
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
        filePath: cleanText(state.campaignFilePath),
        savedAt: cleanText(state.campaignSavedAt),
        language: normalizeStoredAppLanguage(state.appLanguage),
        contentLanguage: normalizeStoredContentLanguage(state.contentLanguage),
        includeNpcInCombatExperience: state.includeNpcInCombatExperience === true,
        soundSettings: normalizeStoredSoundSettings(state.soundSettings),
        repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(state.repositoryCsvPaths)
      }));
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function formatCampaignSavedAt(value) {
  const normalizedValue = cleanText(value);

  if (!normalizedValue) {
    return "";
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(parsedDate);
  } catch {
    return parsedDate.toLocaleString();
  }
}

function scheduleActiveCombatSpellbookPopoverSync() {
  if (typeof window === "undefined") {
    return;
  }

  if (!state.activeCombatSpellbookCombatantId) {
    activeCombatSpellbookPopoverSyncFrame = 0;
    return;
  }

  if (activeCombatSpellbookPopoverSyncFrame) {
    return;
  }

  const schedule = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);

  activeCombatSpellbookPopoverSyncFrame = schedule(() => {
    activeCombatSpellbookPopoverSyncFrame = 0;
    syncActiveCombatSpellbookPopoverPosition();
  });
}

function syncActiveCombatSpellbookPopoverPosition() {
  if (typeof window === "undefined" || !state.activeCombatSpellbookCombatantId) {
    return;
  }

  const anchorButton = [...app.querySelectorAll("[data-action=\"toggle-combat-spellbook-popup\"][data-combatant-id]")]
    .find((button) => button.dataset.combatantId === state.activeCombatSpellbookCombatantId);
  const popover = app.querySelector("[data-combat-spellbook-popover]");

  if (!anchorButton || !popover) {
    return;
  }

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const padding = 14;
  const gap = 12;
  const anchorRect = anchorButton.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const popoverWidth = popoverRect.width || popover.offsetWidth || 0;
  const popoverHeight = popoverRect.height || popover.offsetHeight || 0;
  const maxHeight = Math.max(220, viewportHeight - (padding * 2));
  let left = anchorRect.left - gap - popoverWidth;

  if (left < padding) {
    left = anchorRect.right + gap;
  }

  if (left + popoverWidth > viewportWidth - padding) {
    left = Math.max(padding, viewportWidth - popoverWidth - padding);
  }

  const centeredTop = anchorRect.top + (anchorRect.height / 2) - (popoverHeight / 2);
  const top = Math.min(
    Math.max(padding, centeredTop),
    Math.max(padding, viewportHeight - Math.min(popoverHeight, maxHeight) - padding)
  );

  popover.style.setProperty("--combat-spellbook-popover-left", `${Math.round(left)}px`);
  popover.style.setProperty("--combat-spellbook-popover-top", `${Math.round(top)}px`);
  popover.style.setProperty("--combat-spellbook-popover-max-height", `${Math.round(maxHeight)}px`);
}

function scheduleActiveCombatSpellPreviewSync() {
  const schedule = window.requestAnimationFrame?.bind(window) ?? ((callback) => window.setTimeout(callback, 16));

  if (!state.activeCombatPreviewKey || !state.activeCombatPreviewKind) {
    activeCombatSpellPreviewSyncFrame = 0;
    return;
  }

  if (activeCombatSpellPreviewSyncFrame) {
    return;
  }

  activeCombatSpellPreviewSyncFrame = schedule(() => {
    activeCombatSpellPreviewSyncFrame = 0;
    syncActiveCombatSpellPreviewPosition();
  });
}

function syncActiveCombatSpellPreviewPosition() {
  if (typeof window === "undefined" || !state.activeCombatPreviewKey || !state.activeCombatPreviewKind) {
    return;
  }

  const trigger = [...app.querySelectorAll("[data-combat-preview-key][data-combat-preview-kind]")]
    .find((element) => element.dataset.combatPreviewKey === state.activeCombatPreviewKey && element.dataset.combatPreviewKind === state.activeCombatPreviewKind);
  const preview = app.querySelector("[data-combat-spell-preview-overlay]");

  if (!trigger || !preview) {
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const gap = 14;
  const padding = 12;

  let left = triggerRect.left - previewRect.width - gap;
  if (left < padding) {
    left = Math.min(viewportWidth - previewRect.width - padding, triggerRect.right + gap);
  }

  const top = Math.max(
    padding,
    Math.min(triggerRect.top + (triggerRect.height / 2) - (previewRect.height / 2), viewportHeight - previewRect.height - padding)
  );

  preview.style.setProperty("--combat-spell-preview-left", `${Math.round(left)}px`);
  preview.style.setProperty("--combat-spell-preview-top", `${Math.round(top)}px`);
}

function showCharacterOverviewHeaderTooltip(trigger) {
  if (!trigger) {
    return;
  }

  activeCharacterOverviewHeaderTooltipElement = trigger;
  const overlay = app.querySelector("[data-character-overview-floating-tooltip]");

  if (!overlay) {
    return;
  }

  overlay.textContent = cleanText(trigger.dataset.characterOverviewTooltip);
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  syncCharacterOverviewHeaderTooltipPosition();
}

function hideCharacterOverviewHeaderTooltip() {
  activeCharacterOverviewHeaderTooltipElement = null;
  const overlay = app.querySelector("[data-character-overview-floating-tooltip]");

  if (!overlay) {
    return;
  }

  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.textContent = "";
  overlay.style.removeProperty("--character-overview-tooltip-left");
  overlay.style.removeProperty("--character-overview-tooltip-top");
}

function syncCharacterOverviewHeaderTooltipPosition() {
  if (typeof window === "undefined" || !activeCharacterOverviewHeaderTooltipElement) {
    return;
  }

  const overlay = app.querySelector("[data-character-overview-floating-tooltip]");

  if (!overlay || overlay.hidden) {
    return;
  }

  const triggerRect = activeCharacterOverviewHeaderTooltipElement.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const padding = 12;
  let left = triggerRect.left + (triggerRect.width / 2) - (overlayRect.width / 2);
  let top = triggerRect.top - overlayRect.height - 8;

  left = Math.max(padding, Math.min(left, viewportWidth - overlayRect.width - padding));

  if (top < padding) {
    top = Math.min(viewportHeight - overlayRect.height - padding, triggerRect.bottom + 8);
  }

  overlay.style.setProperty("--character-overview-tooltip-left", `${Math.round(left)}px`);
  overlay.style.setProperty("--character-overview-tooltip-top", `${Math.round(top)}px`);
}

function pushNotification({ title = "Notificación", message = "", tone = "info", durationMs = 5200, imageUrl = "" } = {}) {
  const normalizedTitle = cleanText(title) || "Notificación";
  const normalizedMessage = cleanText(message);
  const normalizedEffectKind = cleanText(arguments[0]?.effectKind);
  const localizedTitle = isEnglishInterface() ? translateUiString(normalizedTitle) : normalizedTitle;
  const localizedMessage = isEnglishInterface() ? translateUiString(normalizedMessage) : normalizedMessage;
  const id = createStableId("notification");
  const notification = {
    id,
    title: localizedTitle,
    message: localizedMessage,
    tone,
    imageUrl: cleanText(imageUrl),
    effectKind: normalizedEffectKind
  };

  state.notifications = [...state.notifications.slice(-5), notification];

  if (typeof window !== "undefined" && durationMs > 0) {
    const timeoutId = window.setTimeout(() => {
      dismissNotification(id);
      syncNotificationUi();
    }, durationMs);
    notificationTimeouts.set(id, timeoutId);
  }

  return id;
}

function dismissNotification(notificationId) {
  const normalizedNotificationId = cleanText(notificationId);

  if (!normalizedNotificationId) {
    return;
  }

  const timeoutId = notificationTimeouts.get(normalizedNotificationId);

  if (timeoutId && typeof window !== "undefined") {
    window.clearTimeout(timeoutId);
  }

  notificationTimeouts.delete(normalizedNotificationId);
  state.notifications = state.notifications.filter((notification) => notification.id !== normalizedNotificationId);
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

function loadDiaryState() {
  const defaultState = getDefaultDiaryState();

  if (typeof window === "undefined") {
    return defaultState;
  }

  if (usesDesktopFileOnlyPersistence()) {
    return defaultState;
  }

  try {
    const rawValue = window.localStorage.getItem(DIARY_STORAGE_KEY);
    return rawValue ? normalizeStoredDiaryState(JSON.parse(rawValue || "{}")) : defaultState;
  } catch {
    return defaultState;
  }
}

function saveDiaryState() {
  if (typeof window === "undefined") {
    return;
  }

  if (!usesDesktopFileOnlyPersistence()) {
    try {
      window.localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(getDiarySaveData()));
    } catch {
      // Storage can be unavailable in private contexts; campaign files still work.
    }
  }

  scheduleDesktopCampaignDirtyStateSync(60);
}

function getDefaultDiaryState() {
  return normalizeStoredDiaryState({
    folders: [],
    systemFolderExpanded: true,
    notes: [createDiaryNote({ title: "Nota 1" })],
    tagColors: {},
    harptosDayNotes: {},
    activeDiaryFolderId: "",
    activeNoteId: ""
  });
}

function getDiarySaveData() {
  const folders = state.diaryFolders
    .map((folder) => normalizeStoredDiaryFolder(folder))
    .filter(Boolean);
  const notes = state.diaryNotes
    .map((note) => normalizeStoredDiaryNote(note))
    .filter(Boolean);
  const folderIds = new Set(folders.map((folder) => folder.id));
  const activeDiaryFolderId = cleanText(state.activeDiaryFolderId);
  const activeNoteId = notes.some((note) => note.id === state.activeDiaryNoteId)
    ? state.activeDiaryNoteId
    : notes[0]?.id ?? "";

  return {
    folders,
    systemFolderExpanded: state.systemDiaryFolderExpanded !== false,
    notes,
    tagColors: normalizeStoredDiaryTagColors(state.diaryTagColors),
    harptosDayNotes: normalizeStoredDiaryHarptosDayNotes(state.diaryHarptosDayNotes),
    activeDiaryFolderId: folderIds.has(activeDiaryFolderId) ? activeDiaryFolderId : "",
    activeNoteId
  };
}

function normalizeStoredDiaryState(value) {
  const source = isPlainObject(value) ? value : {};
  const folders = Array.isArray(source.folders)
    ? source.folders.map((folder) => normalizeStoredDiaryFolder(folder)).filter(Boolean)
    : [];
  const notes = Array.isArray(source.notes)
    ? source.notes.map((note) => normalizeStoredDiaryNote(note)).filter(Boolean)
    : [];
  const folderIds = new Set(folders.map((folder) => folder.id));
  const normalizedNotes = notes.map((note) => folderIds.has(note.folderId)
    ? note
    : {
      ...note,
      folderId: ""
    });
  const fallbackNotes = normalizedNotes.length > 0 ? normalizedNotes : [createDiaryNote({ title: "Nota 1" })];
  const activeDiaryFolderId = folderIds.has(cleanText(source.activeDiaryFolderId))
    ? cleanText(source.activeDiaryFolderId)
    : fallbackNotes[0]?.folderId ?? "";
  const activeNoteId = fallbackNotes.some((note) => note.id === cleanText(source.activeNoteId))
    ? cleanText(source.activeNoteId)
    : fallbackNotes[0]?.id ?? "";

  return {
    folders,
    systemFolderExpanded: source.systemFolderExpanded !== false,
    notes: fallbackNotes,
    tagColors: normalizeStoredDiaryTagColors(source.tagColors),
    harptosDayNotes: normalizeStoredDiaryHarptosDayNotes(source.harptosDayNotes),
    activeDiaryFolderId,
    activeNoteId
  };
}

function normalizeStoredDiaryHarptosDayNotes(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, note]) => [normalizeDiaryHarptosDayNoteKey(key), normalizeDiaryHarptosQuickNote(note)])
      .filter(([key, note]) => key && note?.label)
  );
}

function normalizeStoredDiaryTagColors(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, color]) => [normalizeDiaryTagKey(key), normalizeDiaryTagColorValue(color)])
      .filter(([key, color]) => key && color)
  );
}

function normalizeStoredDiaryFolder(folder) {
  if (!isPlainObject(folder)) {
    return null;
  }

  return {
    id: cleanText(folder.id) || createStableId("diary-folder"),
    name: cleanText(folder.name) || "Carpeta",
    isExpanded: folder.isExpanded !== false
  };
}

function normalizeStoredDiaryNote(note) {
  if (!isPlainObject(note)) {
    return null;
  }

  const title = cleanText(note.title) || "Nueva nota";
  const createdAt = normalizeDiaryTimestamp(note.createdAt);
  const updatedAt = normalizeDiaryTimestamp(note.updatedAt) || createdAt;
  const realDateMode = normalizeDiaryDateMode(note.realDateMode);
  const realDateStart = normalizeDiaryIsoDate(note.realDateStart);
  const realDateEnd = normalizeDiaryIsoDate(note.realDateEnd) || realDateStart;
  const harptosDateMode = normalizeDiaryDateMode(note.harptosDateMode);
  const harptosStart = normalizeStoredHarptosDate(note.harptosStart);
  const harptosEnd = normalizeStoredHarptosDate(note.harptosEnd, harptosStart);

  return {
    id: cleanText(note.id) || createStableId("diary-note"),
    folderId: cleanText(note.folderId),
    title,
    contentHtml: normalizeDiaryContentHtml(note.contentHtml),
    createdAt,
    updatedAt,
    realDateMode,
    realDateStart,
    realDateEnd: realDateMode === "range" ? realDateEnd : realDateStart,
    harptosDateMode,
    harptosStart,
    harptosEnd: harptosDateMode === "range" ? harptosEnd : { ...harptosStart }
  };
}

function normalizeDiaryContentHtml(value) {
  const html = String(value ?? "").trim();
  return decorateDiaryContentHtml(html || "<p></p>");
}

function normalizeDiaryDateMode(value) {
  return cleanText(value) === "range" ? "range" : "single";
}

function normalizeDiaryIsoDate(value) {
  const normalizedValue = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
}

function normalizeStoredHarptosDate(value, fallbackValue = null) {
  const source = isPlainObject(value) ? value : {};
  const fallbackPeriodId = fallbackValue?.periodId && HARPTOS_PERIODS_BY_ID.has(fallbackValue.periodId)
    ? fallbackValue.periodId
    : HARPTOS_CALENDAR_PERIODS[0].id;
  const periodId = HARPTOS_PERIODS_BY_ID.has(cleanText(source.periodId))
    ? cleanText(source.periodId)
    : fallbackPeriodId;
  const period = HARPTOS_PERIODS_BY_ID.get(periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const defaultYear = Math.max(1, Math.floor(toNumber(fallbackValue?.year) || HARPTOS_DEFAULT_YEAR));
  const year = Math.max(1, Math.floor(toNumber(source.year) || defaultYear));
  const defaultDay = Math.max(1, Math.min(period.days, Math.floor(toNumber(fallbackValue?.day) || 1)));
  const day = Math.max(1, Math.min(period.days, Math.floor(toNumber(source.day) || defaultDay)));

  return {
    year,
    periodId,
    day
  };
}

function normalizeDiaryTimestamp(value) {
  const normalizedValue = cleanText(value);
  return normalizedValue || new Date().toISOString();
}

function createDiaryNote(overrides = {}) {
  const baseHarptosDate = normalizeStoredHarptosDate(overrides.harptosStart);
  const now = new Date();
  const defaultIsoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return normalizeStoredDiaryNote({
    id: createStableId("diary-note"),
    folderId: cleanText(overrides.folderId),
    title: cleanText(overrides.title) || "Nueva nota",
    contentHtml: "<p></p>",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    realDateMode: "single",
    realDateStart: defaultIsoDate,
    realDateEnd: defaultIsoDate,
    harptosDateMode: "single",
    harptosStart: baseHarptosDate,
    harptosEnd: baseHarptosDate,
    ...overrides
  });
}

function getActiveDiaryNote() {
  return state.diaryNotes.find((note) => note.id === state.activeDiaryNoteId) ?? state.diaryNotes[0] ?? null;
}

function createDiaryNoteAndSelect(options = {}) {
  const note = createDiaryNote({
    folderId: cleanText(options.folderId) || state.activeDiaryFolderId || "",
    title: cleanText(options.title) || getNextDiaryNoteTitle()
  });
  state.diaryNotes = [note, ...state.diaryNotes];
  state.activeDiaryNoteId = note.id;
  state.activeDiaryFolderId = note.folderId ?? "";
  expandDiaryFolder(note.folderId ?? "");
  saveDiaryState();
  return note.id;
}

function selectDiaryNote(noteId) {
  const normalizedNoteId = cleanText(noteId);
  const note = state.diaryNotes.find((entry) => entry.id === normalizedNoteId);

  if (!note) {
    return;
  }

  state.activeDiaryNoteId = normalizedNoteId;
  state.activeDiaryFolderId = note.folderId ?? "";
  expandDiaryFolder(note.folderId ?? "");
}

function deleteActiveDiaryNote() {
  const normalizedNoteId = cleanText(state.activeDiaryNoteId);

  if (!normalizedNoteId) {
    return;
  }

  const currentIndex = state.diaryNotes.findIndex((note) => note.id === normalizedNoteId);

  if (currentIndex < 0) {
    return;
  }

  state.diaryNotes = state.diaryNotes.filter((note) => note.id !== normalizedNoteId);

  if (state.diaryNotes.length === 0) {
    const note = createDiaryNote({ title: "Nota 1" });
    state.diaryNotes = [note];
    state.activeDiaryNoteId = note.id;
    state.activeDiaryFolderId = note.folderId ?? "";
  } else {
    const nextNote = state.diaryNotes[currentIndex]
      ?? state.diaryNotes[currentIndex - 1]
      ?? state.diaryNotes[0]
      ?? null;
    state.activeDiaryNoteId = nextNote?.id ?? "";
    state.activeDiaryFolderId = nextNote?.folderId ?? "";
  }

  reconcileDiaryUiState();
  saveDiaryState();
}

function updateDiaryNoteTitle(noteId, value) {
  const normalizedNoteId = cleanText(noteId);
  const nextUpdatedAt = new Date().toISOString();

  state.diaryNotes = state.diaryNotes.map((note) => note.id === normalizedNoteId
    ? {
      ...note,
      title: value,
      updatedAt: nextUpdatedAt
    }
    : note);
  saveDiaryState();
}

function updateActiveDiaryNoteContentHtml(contentHtml) {
  const normalizedNoteId = cleanText(state.activeDiaryNoteId);

  if (!normalizedNoteId) {
    return;
  }

  const nextUpdatedAt = new Date().toISOString();

  state.diaryNotes = state.diaryNotes.map((note) => note.id === normalizedNoteId
    ? {
      ...note,
      contentHtml: normalizeDiaryContentHtml(contentHtml),
      updatedAt: nextUpdatedAt
    }
    : note);
  saveDiaryState();
}

function updateDiaryRealDateMode(noteId, value) {
  const normalizedNoteId = cleanText(noteId);
  const nextMode = normalizeDiaryDateMode(value);

  state.diaryNotes = state.diaryNotes.map((note) => note.id === normalizedNoteId
    ? {
      ...note,
      realDateMode: nextMode,
      realDateEnd: nextMode === "range" ? (note.realDateEnd || note.realDateStart) : note.realDateStart,
      updatedAt: new Date().toISOString()
    }
    : note);
  saveDiaryState();
}

function updateDiaryRealDateValue(noteId, key, value) {
  const normalizedNoteId = cleanText(noteId);
  const normalizedValue = normalizeDiaryIsoDate(value);

  state.diaryNotes = state.diaryNotes.map((note) => {
    if (note.id !== normalizedNoteId) {
      return note;
    }

    const nextNote = {
      ...note,
      [key]: normalizedValue,
      updatedAt: new Date().toISOString()
    };

    if (key === "realDateStart" && note.realDateMode !== "range") {
      nextNote.realDateEnd = normalizedValue;
    }

    return nextNote;
  });
  saveDiaryState();
}

function updateDiaryHarptosDateMode(noteId, value) {
  const normalizedNoteId = cleanText(noteId);
  const nextMode = normalizeDiaryDateMode(value);

  state.diaryNotes = state.diaryNotes.map((note) => note.id === normalizedNoteId
    ? {
      ...note,
      harptosDateMode: nextMode,
      harptosEnd: nextMode === "range" ? normalizeStoredHarptosDate(note.harptosEnd, note.harptosStart) : { ...note.harptosStart },
      updatedAt: new Date().toISOString()
    }
    : note);
  saveDiaryState();
}

function updateDiaryHarptosDatePart(noteId, side, key, value) {
  updateDiaryHarptosDate(noteId, side, { [key]: value });
}

function updateDiaryHarptosDate(noteId, side, updates = {}) {
  const normalizedNoteId = cleanText(noteId);
  const normalizedSide = cleanText(side) === "end" ? "harptosEnd" : "harptosStart";

  state.diaryNotes = state.diaryNotes.map((note) => {
    if (note.id !== normalizedNoteId) {
      return note;
    }

    const currentDate = note[normalizedSide];
    const nextDate = normalizeStoredHarptosDate({
      ...currentDate,
      ...updates
    }, currentDate);
    const nextNote = {
      ...note,
      [normalizedSide]: nextDate,
      updatedAt: new Date().toISOString()
    };

    if (normalizedSide === "harptosStart" && note.harptosDateMode !== "range") {
      nextNote.harptosEnd = { ...nextDate };
    }

    return nextNote;
  });
  saveDiaryState();
}

function toggleDiaryCalendarSection(section) {
  const key = cleanText(section) === "harptos" ? "harptos" : "real";
  state.diaryCalendarSectionCollapsed = {
    ...state.diaryCalendarSectionCollapsed,
    [key]: !state.diaryCalendarSectionCollapsed[key]
  };
}

function getDiaryFolderGroups() {
  const hasActiveSearch = cleanText(state.diarySearchQuery).length > 0;

  return [
    { id: "", name: t("diary_uncategorized_folder"), isExpanded: state.systemDiaryFolderExpanded !== false },
    ...state.diaryFolders
  ].filter((folder) => folder.id || getDiaryNotesByFolder("").length > 0 || (state.diaryFolders.length === 0 && !hasActiveSearch));
}

function getDiaryNotesByFolder(folderId = "") {
  const normalizedFolderId = cleanText(folderId);
  const normalizedSearch = normalizeSearchText(state.diarySearchQuery);

  return state.diaryNotes.filter((note) => cleanText(note.folderId) === normalizedFolderId
    && doesDiaryNoteMatchSearch(note, normalizedSearch));
}

function getDiarySearchMatches() {
  const normalizedSearch = normalizeSearchText(state.diarySearchQuery);

  if (!normalizedSearch) {
    return [];
  }

  return state.diaryNotes.filter((note) => doesDiaryNoteMatchSearch(note, normalizedSearch));
}

function doesDiaryNoteMatchSearch(note, normalizedSearch = normalizeSearchText(state.diarySearchQuery)) {
  if (!normalizedSearch) {
    return true;
  }

  return getDiaryNoteSearchableText(note).includes(normalizedSearch);
}

function getDiaryNoteSearchableText(note) {
  return normalizeSearchText(`${cleanText(note?.title)} ${getDiaryNotePlainText(note)}`);
}

function getDiaryNotePlainText(note) {
  return decodeDiaryHtmlEntities(
    String(note?.contentHtml ?? "")
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/(p|div|li|blockquote|h[1-6])>/giu, "\n")
      .replace(/<[^>]+>/gu, " ")
  ).replace(/\s+/gu, " ").trim();
}

function decodeDiaryHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;/giu, "'");
}

function getDiaryNoteSearchPreview(note) {
  const bodyText = cleanText(getDiaryNotePlainText(note));

  if (!bodyText) {
    return "";
  }

  return bodyText.length > 120 ? `${bodyText.slice(0, 117)}...` : bodyText;
}

function reconcileDiaryUiState() {
  const noteIds = new Set(state.diaryNotes.map((note) => note.id));
  const folderIds = new Set(state.diaryFolders.map((folder) => folder.id));

  state.diaryNotes = state.diaryNotes.map((note) => folderIds.has(note.folderId)
    ? note
    : {
      ...note,
      folderId: ""
    });

  if (!noteIds.has(state.activeDiaryNoteId)) {
    state.activeDiaryNoteId = state.diaryNotes[0]?.id ?? "";
  }

  if (state.activeDiaryFolderId !== "" && !folderIds.has(state.activeDiaryFolderId)) {
    state.activeDiaryFolderId = state.diaryNotes.find((note) => note.id === state.activeDiaryNoteId)?.folderId ?? "";
  }
}

function getNextDiaryNoteTitle() {
  return t("diary_default_note_title", { count: state.diaryNotes.length + 1 });
}

function getNextDiaryFolderName() {
  return t("diary_default_folder_name", { count: state.diaryFolders.length + 1 });
}

function createDiaryFolder() {
  const folder = normalizeStoredDiaryFolder({
    id: createStableId("diary-folder"),
    name: getNextDiaryFolderName(),
    isExpanded: true
  });

  state.diaryFolders = [...state.diaryFolders, folder];
  state.activeDiaryFolderId = folder.id;
  return folder.id;
}

function toggleDiaryFolder(folderId) {
  state.activeDiaryFolderId = cleanText(folderId);

  if (!folderId) {
    state.systemDiaryFolderExpanded = !state.systemDiaryFolderExpanded;
    return;
  }

  state.diaryFolders = state.diaryFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      isExpanded: !folder.isExpanded
    }
    : folder);
}

function expandDiaryFolder(folderId) {
  const normalizedFolderId = cleanText(folderId);

  if (!normalizedFolderId) {
    state.systemDiaryFolderExpanded = true;
    return;
  }

  state.diaryFolders = state.diaryFolders.map((folder) => folder.id === normalizedFolderId
    ? {
      ...folder,
      isExpanded: true
    }
    : folder);
}

function updateDiaryFolderName(folderId, name) {
  state.diaryFolders = state.diaryFolders.map((folder) => folder.id === folderId
    ? {
      ...folder,
      name
    }
    : folder);
}

function deleteDiaryFolder(folderId) {
  const normalizedFolderId = cleanText(folderId);

  state.diaryFolders = state.diaryFolders.filter((folder) => folder.id !== normalizedFolderId);
  state.diaryNotes = state.diaryNotes.map((note) => note.folderId === normalizedFolderId
    ? {
      ...note,
      folderId: ""
    }
    : note);

  if (state.activeDiaryFolderId === normalizedFolderId) {
    state.activeDiaryFolderId = "";
  }

  reconcileDiaryUiState();
}

function formatDiaryRealDateSummary(note) {
  if (!note.realDateStart) {
    return "";
  }

  if (note.realDateMode === "range" && note.realDateEnd && note.realDateEnd !== note.realDateStart) {
    return `${note.realDateStart} -> ${note.realDateEnd}`;
  }

  return note.realDateStart;
}

function formatDiaryHarptosDateSummary(note) {
  const startLabel = formatHarptosDateLabel(note.harptosStart);
  const endLabel = formatHarptosDateLabel(note.harptosEnd);

  if (note.harptosDateMode === "range" && endLabel && endLabel !== startLabel) {
    return `${startLabel} -> ${endLabel}`;
  }

  return startLabel;
}

function formatHarptosDateLabel(value) {
  const dateValue = normalizeStoredHarptosDate(value);
  const period = HARPTOS_PERIODS_BY_ID.get(dateValue.periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  return `${dateValue.year} DR · ${period.name} ${dateValue.day}`;
}

function getDiaryNoteUpdatedLabel(value) {
  const date = new Date(value);
  const locale = state.appLanguage === APP_LANGUAGE_EN ? "en-US" : "es-ES";

  if (Number.isNaN(date.getTime())) {
    return t("diary_no_changes");
  }

  return `${t("diary_updated_prefix")} ${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function applyDiaryEditorCommand(command, value = "") {
  const editor = app.querySelector("[data-diary-editor]");

  if (!editor) {
    return;
  }

  editor.focus();

  if (command === "createLink") {
    const linkUrl = typeof window !== "undefined"
      ? cleanText(window.prompt("URL del enlace", "https://") || "")
      : "";

    if (!linkUrl) {
      return;
    }

    document.execCommand("createLink", false, linkUrl);
    updateActiveDiaryNoteContentHtml(editor.innerHTML);
    return;
  }

  if (command === "formatBlock") {
    document.execCommand("formatBlock", false, value || "<p>");
    updateActiveDiaryNoteContentHtml(editor.innerHTML);
    return;
  }

  document.execCommand(command, false, value || null);
  updateActiveDiaryNoteContentHtml(editor.innerHTML);
}

function insertHtmlAtCursor(html) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;

  range.insertNode(fragment);

  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }
}

function insertDiaryEditorToken(token) {
  const editor = app.querySelector("[data-diary-editor]");

  if (!editor || typeof document === "undefined") {
    return;
  }

  editor.focus();
  insertHtmlAtCursor(escapeHtml(token));
  updateActiveDiaryNoteContentHtml(editor.innerHTML);

  if (token === "@") {
    refreshDiaryMentionSuggestions(editor);
  } else {
    hideDiaryMentionSuggestions();
  }
}

function handleDiaryEditorInput(editor) {
  if (tryConvertDiaryExactMention(editor)) {
    return;
  }

  if (tryConvertDiaryWrappedTag(editor)) {
    return;
  }

  updateActiveDiaryNoteContentHtml(editor.innerHTML);
  refreshDiaryMentionSuggestions(editor);
}

function tryConvertDiaryWrappedTag(editor) {
  const tokenContext = getDiaryEditorWrappedTokenContext(editor, "#");

  if (!tokenContext || tokenContext.query.length === 0) {
    return false;
  }

  replaceSelectionRangeWithHtml(
    tokenContext.range,
    `${renderDiaryTagChipHtml(tokenContext.query)}&nbsp;`
  );
  updateActiveDiaryNoteContentHtml(editor.innerHTML);
  hideDiaryMentionSuggestions();
  return true;
}

function tryConvertDiaryExactMention(editor) {
  const tokenContext = getDiaryEditorCompletedMentionContext(editor);

  if (!tokenContext || tokenContext.query.length === 0) {
    return false;
  }

  const match = findDiaryMentionMatch(tokenContext.query);

  if (!match) {
    return false;
  }

  activeDiaryMentionContext = tokenContext;
  insertDiaryMention(match.kind, match.id, match.name);
  return true;
}

function renderDiaryTagChipHtml(tagText) {
  const normalizedTag = cleanText(tagText).replace(/^#+/u, "").trim();

  if (!normalizedTag) {
    return escapeHtml(`#${tagText}`);
  }

  const style = getDiaryTagChipStyle(normalizedTag);
  const tagKey = normalizeDiaryTagKey(normalizedTag);

  return `<span class="diary-tag-chip" contenteditable="false" tabindex="0" data-diary-tag-filter="${escapeHtml(`#${normalizedTag}`)}" data-diary-tag-key="${escapeHtml(tagKey)}" style="${style}">${escapeHtml(`#${normalizedTag}`)}</span>`;
}

function renderDiaryTagSummaryChipHtml(tagText) {
  const normalizedTag = cleanText(tagText).replace(/^#+/u, "").trim();

  if (!normalizedTag) {
    return "";
  }

  const style = getDiaryTagChipStyle(normalizedTag);
  const tagKey = normalizeDiaryTagKey(normalizedTag);
  return `<span class="diary-tag-chip diary-tag-chip--summary" data-diary-tag-filter="${escapeHtml(`#${normalizedTag}`)}" data-diary-tag-key="${escapeHtml(tagKey)}" style="${style}">${escapeHtml(`#${normalizedTag}`)}</span>`;
}

function getDiaryNoteTags(note) {
  if (typeof document === "undefined") {
    return [];
  }

  const template = document.createElement("template");
  template.innerHTML = normalizeDiaryContentHtml(note?.contentHtml);
  const tags = new Map();

  template.content.querySelectorAll(".diary-tag-chip").forEach((chip) => {
    const label = cleanText(chip.textContent ?? "").replace(/^#+/u, "").trim();
    const key = normalizeDiaryTagKey(label);

    if (key && label) {
      tags.set(key, label);
    }
  });

  return [...tags.values()];
}

function getDiaryTagChipStyle(tagText) {
  const tagKey = normalizeDiaryTagKey(tagText);
  const customColor = normalizeDiaryTagColorValue(state.diaryTagColors?.[tagKey]);

  if (customColor) {
    return `--diary-tag-bg:${customColor};--diary-tag-border:${customColor}88;`;
  }

  const hash = [...cleanText(tagText)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `--diary-tag-bg:hsla(${hue}, 58%, 40%, 0.92);--diary-tag-border:hsla(${hue}, 72%, 68%, 0.52);`;
}

function refreshDiaryMentionSuggestions(editor) {
  const tokenContext = getDiaryEditorTokenContext(editor, "@");

  if (!tokenContext || tokenContext.query.length === 0) {
    hideDiaryMentionSuggestions();
    return;
  }

  const suggestions = getDiaryMentionSuggestions(tokenContext.query);

  if (suggestions.length === 0) {
    hideDiaryMentionSuggestions();
    return;
  }

  activeDiaryMentionContext = tokenContext;
  renderDiaryMentionSuggestions(editor, suggestions, tokenContext.range);
}

function getDiaryEditorTokenContext(editor, trigger) {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const currentRange = selection.getRangeAt(0);

  if (!editor.contains(currentRange.startContainer)) {
    return null;
  }

  const tokenState = getDiaryEditorTextTokenState(currentRange, trigger, false);

  if (!tokenState) {
    return null;
  }

  return {
    query: tokenState.query,
    range: tokenState.range,
    noteId: cleanText(editor.dataset.diaryEditor),
    trigger
  };
}

function getDiaryEditorWrappedTokenContext(editor, trigger) {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const currentRange = selection.getRangeAt(0);

  if (!editor.contains(currentRange.startContainer)) {
    return null;
  }

  const tokenState = getDiaryEditorTextTokenState(currentRange, trigger, true);

  if (!tokenState || !tokenState.query) {
    return null;
  }

  return {
    query: tokenState.query,
    range: tokenState.range,
    noteId: cleanText(editor.dataset.diaryEditor),
    trigger
  };
}

function getDiaryEditorCompletedMentionContext(editor) {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const currentRange = selection.getRangeAt(0);

  if (!editor.contains(currentRange.startContainer)) {
    return null;
  }

  const tokenState = getDiaryEditorTextTokenState(currentRange, "@", false, { requireCompletedDelimiter: true });

  if (!tokenState || !tokenState.query) {
    return null;
  }

  return {
    query: tokenState.query,
    range: tokenState.range,
    noteId: cleanText(editor.dataset.diaryEditor),
    trigger: "@"
  };
}

function getDiaryEditorTextTokenState(range, trigger, requireClosingTrigger = false, options = {}) {
  if (typeof document === "undefined") {
    return null;
  }

  const startContainer = range.startContainer;

  if (!(startContainer instanceof Text)) {
    return null;
  }

  const beforeText = startContainer.textContent?.slice(0, range.startOffset) ?? "";
  const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = requireClosingTrigger
    ? new RegExp(`(^|\\s)${escapedTrigger}([^${escapedTrigger}]+)${escapedTrigger}$`, "u")
    : options.requireCompletedDelimiter
      ? new RegExp(`(^|\\s)${escapedTrigger}(.+?)(\\s)$`, "u")
      : new RegExp(`(^|\\s)${escapedTrigger}([^${escapedTrigger}]*)$`, "u");
  const tokenMatch = beforeText.match(pattern);

  if (!tokenMatch) {
    return null;
  }

  const rawQuery = requireClosingTrigger ? tokenMatch[2] ?? "" : tokenMatch[2] ?? "";
  const tokenQuery = cleanText(rawQuery);

  if (!tokenQuery) {
    return null;
  }

  const tokenLength = requireClosingTrigger
    ? tokenQuery.length + 2
    : options.requireCompletedDelimiter
      ? tokenQuery.length + 2
      : tokenQuery.length + 1;
  const trailingLength = options.requireCompletedDelimiter ? 1 : 0;
  const startOffset = range.startOffset - tokenLength;
  const endOffset = range.startOffset - trailingLength;

  if (startOffset < 0 || endOffset < startOffset) {
    return null;
  }

  const tokenRange = document.createRange();
  tokenRange.setStart(startContainer, startOffset);
  tokenRange.setEnd(startContainer, endOffset);

  return {
    query: tokenQuery,
    range: tokenRange
  };
}

function replaceSelectionRangeWithHtml(range, html) {
  if (!range || typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;

  range.insertNode(fragment);

  if (lastNode) {
    const selection = window.getSelection();
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
  }
}

function getDiaryMentionSuggestions(query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const characterSuggestions = state.characters
    .filter((character) => normalizeSearchText(character.name).includes(normalizedQuery))
    .map((character) => ({
      kind: "character",
      id: character.id,
      name: cleanText(character.name),
      subtitle: cleanText(character.className || character.species || "Personaje"),
      imageUrl: cleanText(character.tokenUrl)
    }));

  const itemSuggestions = state.items
    .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(normalizedQuery)))
    .slice(0, 24)
    .map((entry) => ({
      kind: "item",
      id: getCompendiumEntryIdentityKey(entry),
      name: cleanText(entry.name),
      aliases: getCompendiumEntryNameAliases(entry),
      subtitle: cleanText(entry.source || "Objeto"),
      imageUrl: ""
    }));

  const bestiarySuggestions = state.bestiary
    .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(normalizedQuery)))
    .slice(0, 24)
    .map((entry) => ({
      kind: "bestiary",
      id: getCompendiumEntryIdentityKey(entry),
      name: cleanText(entry.name),
      aliases: getCompendiumEntryNameAliases(entry),
      subtitle: cleanText(getBestiarySourceFullName(entry.source) || entry.source || "Criatura"),
      imageUrl: cleanText(entry.tokenUrl)
    }));

  const spellSuggestions = state.arcanum
    .filter((entry) => getCompendiumEntryNameAliases(entry).some((alias) => alias.includes(normalizedQuery)))
    .slice(0, 24)
    .map((entry) => ({
      kind: "arcanum",
      id: getCompendiumEntryIdentityKey(entry),
      name: cleanText(entry.name),
      aliases: getCompendiumEntryNameAliases(entry),
      subtitle: cleanText(entry.levelLabel || entry.level || "Hechizo"),
      imageUrl: ""
    }));

  return [...characterSuggestions, ...itemSuggestions, ...bestiarySuggestions, ...spellSuggestions]
    .filter((entry) => entry.name)
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }) || left.kind.localeCompare(right.kind));
}

function findDiaryMentionMatch(query) {
  const normalizedQuery = normalizeSearchText(query);
  return getDiaryMentionSuggestions(query).find((entry) => (
    normalizeSearchText(entry.name) === normalizedQuery
    || (Array.isArray(entry.aliases) && entry.aliases.includes(normalizedQuery))
  )) ?? null;
}

function renderDiaryMentionSuggestions(editor, suggestions, range) {
  const popover = editor.parentElement?.querySelector("[data-diary-mention-popover]");

  if (!popover || typeof window === "undefined") {
    return;
  }

  const editorRect = editor.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();
  const top = Math.max(0, rangeRect.bottom - editorRect.top + editor.scrollTop + 8);
  const left = Math.max(0, Math.min(editor.clientWidth - 260, rangeRect.left - editorRect.left + editor.scrollLeft));

  popover.innerHTML = suggestions.map((entry) => `
    <button
      class="diary-mention-suggestion"
      type="button"
      data-action="insert-diary-mention"
      data-diary-mention-kind="${escapeHtml(entry.kind)}"
      data-diary-mention-id="${escapeHtml(entry.id)}"
      data-diary-mention-name="${escapeHtml(entry.name)}"
    >
      <span class="diary-mention-suggestion__media" aria-hidden="true">
        ${entry.imageUrl
          ? `<img src="${escapeHtml(entry.imageUrl)}" alt="" loading="lazy" decoding="async" />`
          : `<span class="diary-mention-suggestion__placeholder">${escapeHtml((entry.name[0] ?? "?").toUpperCase())}</span>`}
      </span>
      <span class="diary-mention-suggestion__copy">
        <strong>@${escapeHtml(entry.name)}</strong>
        <small>${escapeHtml(entry.kind)} | ${escapeHtml(entry.subtitle)}</small>
      </span>
    </button>
  `).join("");
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.display = "grid";
  popover.hidden = false;
}

function hideDiaryMentionSuggestions() {
  activeDiaryMentionContext = null;
  const popover = app?.querySelector?.("[data-diary-mention-popover]");

  if (!popover) {
    return;
  }

  popover.hidden = true;
  popover.style.display = "none";
  popover.innerHTML = "";
}

function normalizeDiaryTagKey(tagText) {
  return normalizeSearchText(cleanText(tagText).replace(/^#+/u, ""));
}

function normalizeDiaryTagColorValue(value) {
  const normalizedValue = cleanText(value);
  return /^#[0-9a-f]{6}$/iu.test(normalizedValue) ? normalizedValue.toLowerCase() : "";
}

function openDiaryTagColorPicker(triggerElement, tagText) {
  const normalizedTagText = cleanText(tagText).replace(/^#+/u, "");
  const tagKey = normalizeDiaryTagKey(normalizedTagText);

  if (!tagKey || typeof document === "undefined" || !triggerElement?.getBoundingClientRect) {
    return;
  }

  activeDiaryTagColorPicker?.remove();
  const rect = triggerElement.getBoundingClientRect();
  const input = document.createElement("input");
  const closePicker = () => {
    if (activeDiaryTagColorPicker === input) {
      activeDiaryTagColorPicker = null;
    }

    input.remove();
  };

  input.type = "color";
  input.className = "diary-tag-color-picker";
  input.value = normalizeDiaryTagColorValue(state.diaryTagColors?.[tagKey]) || "#8f6236";
  input.style.position = "fixed";
  input.style.left = `${Math.max(8, Math.min(window.innerWidth - 44, rect.right + 8))}px`;
  input.style.top = `${Math.max(8, Math.min(window.innerHeight - 32, rect.top + (rect.height - 28) / 2))}px`;
  input.addEventListener("input", () => {
    applyDiaryTagColor(tagKey, input.value);
  });
  input.addEventListener("change", () => {
    applyDiaryTagColor(tagKey, input.value);
    closePicker();
  });
  input.addEventListener("blur", closePicker, { once: true });
  document.body.appendChild(input);
  activeDiaryTagColorPicker = input;
  input.focus();
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  } catch {
    input.click();
  }
}

function applyDiaryTagColor(tagKey, colorValue) {
  const normalizedTagKey = normalizeDiaryTagKey(tagKey);
  const normalizedColor = normalizeDiaryTagColorValue(colorValue);

  if (!normalizedTagKey || !normalizedColor) {
    return;
  }

  state.diaryTagColors = {
    ...state.diaryTagColors,
    [normalizedTagKey]: normalizedColor
  };
  state.diaryNotes = state.diaryNotes.map((note) => ({
    ...note,
    contentHtml: updateDiaryTagStylesInHtml(note.contentHtml)
  }));
  saveDiaryState();
  render();
}

function updateDiaryTagStylesInHtml(contentHtml) {
  if (typeof document === "undefined") {
    return String(contentHtml ?? "");
  }

  const template = document.createElement("template");
  template.innerHTML = String(contentHtml ?? "");
  decorateDiaryContentFragment(template.content);
  return template.innerHTML;
}

function insertDiaryMention(kind, id, name) {
  const editor = app.querySelector("[data-diary-editor]");

  if (!editor || !activeDiaryMentionContext?.range) {
    hideDiaryMentionSuggestions();
    return;
  }

  const normalizedKind = cleanText(kind);
  const normalizedId = cleanText(id);
  const normalizedName = cleanText(name);

  replaceSelectionRangeWithHtml(
    activeDiaryMentionContext.range,
    `${renderDiaryMentionHtml(normalizedKind, normalizedId, normalizedName)}&nbsp;`
  );
  updateActiveDiaryNoteContentHtml(editor.innerHTML);
  hideDiaryMentionSuggestions();
  editor.focus();
}

function renderDiaryMentionHtml(kind, id, name) {
  const normalizedKind = cleanText(kind);
  const normalizedId = cleanText(id);
  const normalizedName = cleanText(name);

  return `<span class="diary-mention-link diary-mention-link--${escapeHtml(normalizedKind)}" data-diary-mention-link data-diary-mention-kind="${escapeHtml(normalizedKind)}" data-diary-mention-id="${escapeHtml(normalizedId)}" data-diary-mention-name="${escapeHtml(normalizedName)}">@${escapeHtml(normalizedName)}</span>`;
}

function decorateDiaryContentHtml(contentHtml) {
  if (typeof document === "undefined") {
    return String(contentHtml ?? "").trim() || "<p></p>";
  }

  const template = document.createElement("template");
  template.innerHTML = String(contentHtml ?? "").trim() || "<p></p>";
  decorateDiaryContentFragment(template.content);
  return template.innerHTML.trim() || "<p></p>";
}

function decorateDiaryContentFragment(fragment) {
  normalizeDiaryMentionLinksInFragment(fragment);
  replaceDiaryWrappedTokensInFragment(fragment);
  normalizeDiaryTagChipsInFragment(fragment);
}

function normalizeDiaryMentionLinksInFragment(fragment) {
  fragment.querySelectorAll("[data-diary-mention-link], .diary-mention-link").forEach((link) => {
    const label = cleanText(link.textContent ?? "").replace(/^@+/u, "").trim();
    const match = resolveDiaryMentionReference(
      link.getAttribute("data-diary-mention-kind"),
      link.getAttribute("data-diary-mention-id"),
      link.getAttribute("data-diary-mention-name") || label
    ) ?? (label ? findDiaryMentionMatch(label) : null);

    if (!match) {
      link.replaceWith(document.createTextNode(cleanText(link.textContent)));
      return;
    }

    link.className = `diary-mention-link diary-mention-link--${match.kind}`;
    link.removeAttribute("contenteditable");
    link.removeAttribute("href");
    link.setAttribute("data-diary-mention-link", "");
    link.setAttribute("data-diary-mention-kind", cleanText(match.kind));
    link.setAttribute("data-diary-mention-id", cleanText(match.id));
    link.setAttribute("data-diary-mention-name", cleanText(match.name));
    link.textContent = `@${cleanText(match.name)}`;
  });
}

function resolveDiaryMentionReference(kind, id, name = "") {
  const normalizedKind = cleanText(kind);
  const normalizedId = cleanText(id);
  const normalizedName = cleanText(name);

  if (normalizedKind === "character") {
    const character = state.characters.find((entry) => entry.id === normalizedId)
      ?? state.characters.find((entry) => normalizeSearchText(entry.name) === normalizeSearchText(normalizedName));

    return character ? {
      kind: "character",
      id: character.id,
      name: cleanText(character.name)
    } : null;
  }

  if (normalizedKind === "item") {
    const entry = findCompendiumEntryByReference(state.items, { entryId: normalizedId, name: normalizedName });
    return entry ? { kind: "item", id: getCompendiumEntryIdentityKey(entry), name: cleanText(entry.name) } : null;
  }

  if (normalizedKind === "bestiary") {
    const entry = findCompendiumEntryByReference(state.bestiary, { entryId: normalizedId, name: normalizedName });
    return entry ? { kind: "bestiary", id: getCompendiumEntryIdentityKey(entry), name: cleanText(entry.name) } : null;
  }

  if (normalizedKind === "arcanum") {
    const entry = findCompendiumEntryByReference(state.arcanum, { entryId: normalizedId, name: normalizedName });
    return entry ? { kind: "arcanum", id: getCompendiumEntryIdentityKey(entry), name: cleanText(entry.name) } : null;
  }

  return null;
}

function replaceDiaryWrappedTokensInFragment(fragment) {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    if (!textNode.parentElement) {
      return;
    }

    if (textNode.parentElement.closest(".diary-tag-chip, [data-diary-mention-link]")) {
      return;
    }

    const sourceText = textNode.textContent ?? "";

    if (!/[#@]/u.test(sourceText)) {
      return;
    }

    const replacementHtml = buildDiaryWrappedTokenHtml(sourceText);

    if (!replacementHtml) {
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = replacementHtml;
    textNode.replaceWith(template.content.cloneNode(true));
  });
}

function buildDiaryWrappedTokenHtml(sourceText) {
  const tokenPattern = /#([^#\n]+)#|@([^@\n]+)@/gu;
  let lastIndex = 0;
  let didReplace = false;
  let html = "";

  for (const match of sourceText.matchAll(tokenPattern)) {
    const matchText = cleanText(match[0]);
    const matchIndex = match.index ?? -1;

    if (matchIndex < 0) {
      continue;
    }

    html += escapeHtml(sourceText.slice(lastIndex, matchIndex));

    if (matchText.startsWith("#")) {
      html += renderDiaryTagChipHtml(match[1] ?? "");
      didReplace = true;
    } else {
      const mentionMatch = findDiaryMentionMatch(match[2] ?? "");
      html += mentionMatch
        ? renderDiaryMentionHtml(mentionMatch.kind, mentionMatch.id, mentionMatch.name)
        : escapeHtml(matchText);
      didReplace = didReplace || Boolean(mentionMatch);
    }

    lastIndex = matchIndex + matchText.length;
  }

  if (!didReplace) {
    return "";
  }

  html += escapeHtml(sourceText.slice(lastIndex));
  return html;
}

function normalizeDiaryTagChipsInFragment(fragment) {
  fragment.querySelectorAll(".diary-tag-chip").forEach((chip) => {
    const tagKey = normalizeDiaryTagKey(chip.textContent ?? "");
    const label = cleanText(chip.textContent ?? "").replace(/^#+/u, "");

    chip.setAttribute("data-diary-tag-key", tagKey);
    chip.setAttribute("data-diary-tag-filter", `#${label}`);
    chip.setAttribute("style", getDiaryTagChipStyle(label));

    if (!chip.classList.contains("diary-tag-chip--summary")) {
      chip.setAttribute("contenteditable", "false");
      chip.setAttribute("tabindex", "0");
    }
  });
}

function openDiaryMentionTarget(kind, id, name) {
  const normalizedKind = cleanText(kind);
  const normalizedId = cleanText(id);
  const normalizedName = cleanText(name);

  if (normalizedKind === "character") {
    state.activeScreen = "initiative-board";
    state.activeCharacterId = normalizedId;
    state.selectedCharacterIds = new Set(normalizedId ? [normalizedId] : []);
    render();
    return;
  }

  if (normalizedKind === "item") {
    const entry = findCompendiumEntryByReference(state.items, {
      entryId: normalizedId,
      name: normalizedName
    });
    resetItemVirtualScroll();
    state.activeScreen = "items";
    state.itemFilters = {
      ...blankItemFilters,
      query: entry?.name || normalizedName
    };
    state.itemSelectedId = entry?.id || normalizedId;
    state.showItemQuerySuggestions = false;
    render({
      focusSelector: "[data-item-query]"
    });
    return;
  }

  if (normalizedKind === "bestiary") {
    const entry = findCompendiumEntryByReference(state.bestiary, {
      entryId: normalizedId,
      name: normalizedName
    });
    resetBestiaryVirtualScroll();
    state.activeScreen = "bestiary";
    state.bestiaryFilters = {
      ...blankBestiaryFilters,
      query: entry?.name || normalizedName
    };
    state.bestiarySelectedId = entry?.id || normalizedId;
    state.showBestiaryQuerySuggestions = false;
    render({
      focusSelector: "[data-bestiary-query]"
    });
    return;
  }

  if (normalizedKind === "arcanum") {
    const entry = findCompendiumEntryByReference(state.arcanum, {
      entryId: normalizedId,
      name: normalizedName
    });
    resetArcanumVirtualScroll();
    state.activeScreen = "arcanum";
    state.arcanumFilters = {
      ...blankArcanumFilters,
      query: entry?.name || normalizedName
    };
    state.arcanumSelectedId = entry?.id || normalizedId;
    state.showArcanumQuerySuggestions = false;
    render({
      focusSelector: "[data-arcanum-query]"
    });
  }
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
    entryKey: cleanText(row.entryKey),
    name,
    canonicalName: cleanText(row.canonicalName),
    localizedName: cleanText(row.localizedName),
    source: cleanText(row.source),
    canonicalSource: cleanText(row.canonicalSource),
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



