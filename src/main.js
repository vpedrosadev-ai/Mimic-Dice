import { columns, initialCombatants } from "./data/combatTrackerData.js";
import {
  compareSpellCastingSpeed,
  formatSpellLevel,
  getBestiaryInitials,
  getBestiarySourceFullName,
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
  detectCsvContentLanguage,
  getContentTranslationModeLabel,
  isCompendiumTranslationSidecarUsable,
  mergeCompendiumTranslationRows,
  translateCompendiumRows
} from "./data/contentTranslation.js";
import { initialTableDefinitions } from "./data/tablesSeedData.js";
import { screens } from "./navigation/screens.js";
import { getCharacterClassIcon } from "./assets/characterClassIcons.js";
import { syncCompendiumLayoutHeights } from "./shared/compendiumLayout.js";
import { parseCsv } from "./shared/csv.js";
import { createCompendiumDetailRenderers } from "./screens/compendiums/detailRender.js";
import { createCompendiumListRenderers } from "./screens/compendiums/listRender.js";
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
  parseLeadingNumber,
  shortenLabel,
  slugify,
  splitList,
  uniqueSortedStrings
} from "./shared/text.js";
import { getVirtualStartIndex, getVirtualWindow } from "./shared/virtualList.js";
import * as XLSX from "xlsx";
import appIconUrl from "../build-resources/icon.png";
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
const arcanumFilterLabels = {
  source: "fuentes",
  level: "niveles",
  school: "escuelas",
  class: "clases",
  castingTime: "velocidades"
};
const defaultRepositoryCsvPaths = {
  bestiary: DEFAULT_BESTIARY_CSV_RELATIVE_PATH,
  items: DEFAULT_ITEMS_CSV_RELATIVE_PATH,
  arcanum: DEFAULT_SPELLS_CSV_RELATIVE_PATH
};
const defaultDataCsvFiles = Object.values(defaultRepositoryCsvPaths);
const blankContentSourceMeta = {
  detectedLanguage: CONTENT_LANGUAGE_EN,
  translationMode: CONTENT_TRANSLATION_MODE_ORIGINAL,
  sidecarPath: "",
  message: ""
};

const app = document.querySelector("#app");
let battleTimerInterval = null;
let campaignAutosaveTimer = 0;
let campaignSaveInProgress = null;
let lastSavedCampaignSnapshot = "";
let initialDataLoadQueued = false;
let campaignDirtyStateSyncTimer = 0;
let lastDesktopCampaignDirtyValue = null;
let activeTableColumnResize = null;
let activeTableRollTimer = 0;
let tableRollAudioContext = null;
resetDesktopLocalStorageIfNeeded();
const initialCampaignMeta = loadCampaignMeta();
const initialCharacterSkillDefinitions = loadCharacterSkillDefinitions();
const initialCharacters = loadCharacters(initialCharacterSkillDefinitions);
const initialEncounterInventory = loadEncounterInventory();
const initialCombatTrackerState = loadCombatTrackerState();
const initialTablesState = loadTablesState();
const initialDiaryState = loadDiaryState();
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
  appLanguage: normalizeStoredAppLanguage(initialCampaignMeta.language),
  contentLanguage: normalizeStoredContentLanguage(initialCampaignMeta.contentLanguage),
  repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(initialCampaignMeta.repositoryCsvPaths),
  dataCsvFiles: [...defaultDataCsvFiles],
  contentSourceMeta: {
    bestiary: { ...blankContentSourceMeta },
    items: { ...blankContentSourceMeta },
    arcanum: { ...blankContentSourceMeta }
  },
  campaignMessage: "",
  fileMenuOpen: false,
  optionsMenuOpen: false,
  campaignSaveNameDialogOpen: false,
  campaignSaveNameDialogMode: "",
  campaignSaveNameDialogValue: "",
  campaignSaveNameDialogError: "",
  characterSkillConfigOpen: false,
  characterSkillsExpanded: false,
  characterSkillDefinitions: initialCharacterSkillDefinitions,
  characters: initialCharacters,
  activeCharacterId: initialCharacters[0]?.id ?? "",
  selectedCharacterIds: new Set(initialCharacters[0]?.id ? [initialCharacters[0].id] : []),
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
  enemyHpMode: initialCombatTrackerState.enemyHpMode,
  battleTimer: {
    elapsedMs: 0,
    startedAt: 0,
    isRunning: false
  },
  combatTimerPanelOpen: false,
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
  tableFolders: initialTablesState.folders,
  systemTableFolderExpanded: initialTablesState.systemFolderExpanded,
  tables: initialTablesState.tables,
  activeTableId: initialTablesState.activeTableId,
  activeTableFolderId: initialTablesState.activeTableFolderId,
  openTableIds: initialTablesState.openTableIds,
  diaryFolders: initialDiaryState.folders,
  systemDiaryFolderExpanded: initialDiaryState.systemFolderExpanded,
  diaryNotes: initialDiaryState.notes,
  activeDiaryFolderId: initialDiaryState.activeDiaryFolderId,
  activeDiaryNoteId: initialDiaryState.activeNoteId,
  diaryCalendarSectionCollapsed: {
    real: false,
    harptos: false
  },
  rollingTableId: "",
  rollingTableRowId: "",
  rolledTableId: "",
  rolledTableRowId: "",
  activeCombatNameSearchId: "",
  activeCombatSourceId: "",
  activeCombatStatusMenuId: "",
  combatStatusDrafts: {}
};

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
  getItemMostSpecificTypeLabel,
  getItemRarityClass,
  getItemVirtualWindow
});

app.addEventListener("click", handleClick);
app.addEventListener("change", handleChange);
app.addEventListener("input", handleInput);
app.addEventListener("keydown", handleKeydown);
app.addEventListener("paste", handlePaste);
app.addEventListener("pointerdown", handlePointerDown);
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

startCampaignAutosave();
registerCampaignCloseAutosave();
render();
queueInitialDataLoad();

function handleClick(event) {
  const screenButton = event.target.closest("[data-screen]");

  if (screenButton) {
    if (state.activeScreen === "tables" && screenButton.dataset.screen !== "tables") {
      stopActiveTableRoll();
      state.rolledTableId = "";
      state.rolledTableRowId = "";
    }

    state.activeScreen = screenButton.dataset.screen;
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
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
  const clickedCombatStatusMenu = event.target.closest("[data-combat-status-menu]");
  const clickedCombatInlineMenu = event.target.closest(".combat-inline-menu");
  const clickedFileMenu = event.target.closest("[data-file-menu]");
  const clickedOptionsMenu = event.target.closest("[data-options-menu]");
  const clickedCharacterSkillConfig = event.target.closest("[data-character-skill-config-menu]");

  if (!clickedCombatInlineMenu) {
    closeOpenCombatInlineMenus();
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

  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  if (state.optionsMenuOpen && clickedOptionsMenu && action !== "toggle-options-menu") {
    state.optionsMenuOpen = false;
  }

  if (action === "toggle-file-menu") {
    state.optionsMenuOpen = false;
    state.fileMenuOpen = !state.fileMenuOpen;
    render();
    return;
  }

  if (action === "toggle-options-menu") {
    state.fileMenuOpen = false;
    state.optionsMenuOpen = !state.optionsMenuOpen;
    render();
    return;
  }

  if (action === "close-options-menu") {
    state.optionsMenuOpen = false;
    render();
    return;
  }

  if (action === "set-app-language") {
    state.appLanguage = normalizeStoredAppLanguage(actionButton.dataset.appLanguage);
    saveCampaignMeta();
    render();
    return;
  }

  if (action === "set-content-language") {
    state.contentLanguage = normalizeStoredContentLanguage(actionButton.dataset.contentLanguage);
    saveCampaignMeta();
    reloadCompendiumContent();
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
    exportTableToExcel(actionButton.dataset.tableId);
    return;
  }

  if (action === "roll-table") {
    startTableRoll(actionButton.dataset.tableId);
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

  if (action === "delete-combatant-row") {
    deleteCombatantRow(actionButton.dataset.combatantId);
    render();
    return;
  }

  if (action === "add-blank-combatant") {
    const combatantId = addBlankCombatant();
    state.filters = { ...blankFilters };
    state.activeFilterKey = "";
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
    toggleCombatantStatus(actionButton.dataset.combatantId, actionButton.dataset.combatStatus);
    state.activeCombatStatusMenuId = "";
    saveCombatTrackerState();
    render();
    return;
  }

  if (action === "toggle-combat-status-menu") {
    event.preventDefault();
    const combatantId = cleanText(actionButton.dataset.combatantId);
    state.activeCombatStatusMenuId = state.activeCombatStatusMenuId === combatantId ? "" : combatantId;
    render({
      focusSelector: state.activeCombatStatusMenuId ? `[data-combat-status-draft="${combatantId}"]` : null
    });
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

  if (action === "open-combatant-character") {
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
    selectCombatTurnToken(actionButton.dataset.combatantId, {
      additive: event.ctrlKey || event.metaKey || event.getModifierState?.("Control") || event.getModifierState?.("Meta")
    });
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

  if (action === "adjust-area-pg-act") {
    applyAreaPgActAdjustment(actionButton.dataset.mode);
    render();
    return;
  }

  if (action === "adjust-area-necrotic") {
    applyAreaNecroticAdjustment();
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

function handleChange(event) {
  const target = event.target;

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

  if (target.matches("[data-enemy-hp-mode-switch]")) {
    state.enemyHpMode = target.checked ? ENEMY_HP_MODE_VARIABLE : ENEMY_HP_MODE_FIXED;
    saveCombatTrackerState();
    render();
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

  if (target.matches("[data-diary-editor]")) {
    updateActiveDiaryNoteContentHtml(target.innerHTML);
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

  if (event.key === "Escape" && (state.fileMenuOpen || state.optionsMenuOpen)) {
    event.preventDefault();
    state.fileMenuOpen = false;
    state.optionsMenuOpen = false;
    render();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
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
      <div class="shell-menu-bar" aria-label="Menus principales">
        ${renderFileMenu()}
        ${renderOptionsMenu()}
      </div>
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
        ${renderTopbarNavigation()}
      </header>
      <main class="workspace">
        ${renderScreen()}
      </main>
      ${renderBootOverlay()}
      ${renderOptionsDialog()}
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

  if (state.activeScreen === "tables") {
    syncRolledTableRowIntoView();
  }

  syncCompendiumLayoutHeights();
  applyInterfaceTranslations(app);
  syncTopbarNavigationMetrics();

  saveCombatTrackerState();
}

function renderTopbarNavigation() {
  return `
    <div class="topbar__nav-stack" aria-label="Barra principal">
      ${TOPBAR_NAV_ROWS.map((row) => renderTopbarNavRow(row)).join("")}
    </div>
  `;
}

function renderTopbarNavRow(row) {
  const rowScreens = row.screenIds
    .map((screenId) => screens.find((screen) => screen.id === screenId))
    .filter(Boolean);
  const rowLabel = row.id === "game" ? "Pantallas principales" : "Pantallas de consulta";

  return `
    <div class="nav-row nav-row--${row.id}">
      <nav class="nav nav--row" aria-label="${escapeHtml(rowLabel)}">
        ${rowScreens.map((screen) => renderScreenButton(screen)).join("")}
      </nav>
    </div>
  `;
}

function renderScreenButton(screen, extraClassName = "") {
  const buttonLabel = state.appLanguage === APP_LANGUAGE_EN ? screen.label : screen.shortLabel;

  return `
    <button
      class="nav__button ${extraClassName} ${screen.id === state.activeScreen ? "is-active" : ""}"
      type="button"
      data-screen="${screen.id}"
      aria-pressed="${screen.id === state.activeScreen}"
      title="${escapeHtml(screen.label)}"
    >
      <span class="nav__icon">${screen.icon}</span>
      <span class="nav__label">${escapeHtml(buttonLabel)}</span>
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
        <span class="nav__label">${escapeHtml(t("menu_file"))}</span>
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

function renderOptionsMenu() {
  return `
    <div class="file-menu options-menu" data-options-menu>
      <button
        class="nav__button file-menu__trigger options-menu__trigger ${state.optionsMenuOpen ? "is-active" : ""}"
        type="button"
        data-action="toggle-options-menu"
        aria-expanded="${state.optionsMenuOpen}"
        aria-haspopup="menu"
      >
        <span class="nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 7h14v2H5V7Zm3 4h11v2H8v-2Zm-3 4h14v2H5v-2Zm-2-4h3v2H3v-2Z" />
          </svg>
        </span>
        <span class="nav__label">${escapeHtml(t("menu_options"))}</span>
      </button>
    </div>
  `;
}

function renderOptionsDialog() {
  if (!state.optionsMenuOpen) {
    return "";
  }

  const usesVariableHp = state.enemyHpMode === ENEMY_HP_MODE_VARIABLE;

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
        aria-label="Opciones"
      >
        <div class="options-dialog__header">
          <button
            class="summary-button summary-button--ghost options-dialog__close"
            type="button"
            data-action="close-options-menu"
          >
            ${escapeHtml(t("options_close"))}
          </button>
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
    </div>
  `;
}

function syncTopbarNavigationMetrics() {
  const navStack = app.querySelector(".topbar__nav-stack");
  const combatButton = navStack?.querySelector(".nav-row--game [data-screen]");
  const navButtons = navStack ? [...navStack.querySelectorAll(".nav-row [data-screen]")] : [];

  if (!navStack || !combatButton || navButtons.length === 0) {
    return;
  }

  const combatButtonWidth = combatButton.getBoundingClientRect().width;
  const maxButtonWidth = navButtons.reduce((maxWidth, button) => {
    return Math.max(maxWidth, button.getBoundingClientRect().width);
  }, 0);

  navStack.style.setProperty("--nav-stagger", `${Math.max(0, combatButtonWidth / 4)}px`);
  navStack.style.setProperty("--nav-button-width", `${Math.ceil(maxButtonWidth)}px`);
}

function getCampaignDisplayName() {
  return state.campaignFileName ? cleanText(state.campaignName) || getCampaignNameFromFileName(state.campaignFileName) : "Sin campaña";
}

function normalizeStoredAppLanguage(value) {
  return cleanText(value) === APP_LANGUAGE_EN ? APP_LANGUAGE_EN : APP_LANGUAGE_ES;
}

function normalizeStoredContentLanguage(value) {
  return cleanText(value) === CONTENT_LANGUAGE_EN ? CONTENT_LANGUAGE_EN : CONTENT_LANGUAGE_ES;
}

function normalizeStoredRepositoryCsvPaths(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    bestiary: normalizeDataCsvRelativePath(source.bestiary) || defaultRepositoryCsvPaths.bestiary,
    items: normalizeDataCsvRelativePath(source.items) || defaultRepositoryCsvPaths.items,
    arcanum: normalizeDataCsvRelativePath(source.arcanum) || defaultRepositoryCsvPaths.arcanum
  };
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

    ["placeholder", "title", "aria-label"].forEach((attributeName) => {
      const attributeValue = element.getAttribute(attributeName);

      if (!attributeValue) {
        return;
      }

      let translatedValue =
        UI_ATTRIBUTE_TRANSLATIONS_EN.get(attributeValue)
        ?? UI_ATTRIBUTE_TRANSLATIONS_EN_NORMALIZED.get(normalizeTranslationKey(attributeValue))
        ?? attributeValue;

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

  return renderPlaceholderScreen(
    "Session Vault",
    "Esta pantalla puede agrupar criaturas guardadas, encuentros preparados, notas de sesion y presets de campana."
  );
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
  const visibleCombatants = Array.isArray(getVisibleCombatants()) ? getVisibleCombatants() : [];
  const turnOrder = Array.isArray(getCombatTurnOrder(visibleCombatants)) ? getCombatTurnOrder(visibleCombatants) : [];
  const turnParticipants = Array.isArray(getCombatTurnParticipants(turnOrder)) ? getCombatTurnParticipants(turnOrder) : [];
  const activeTurnCombatantId = state.isCombatActive ? getActiveTurnCombatantId(turnParticipants) : "";
  const allVisibleSelected =
    visibleCombatants.length > 0 &&
    visibleCombatants.every((combatant) => state.selectedIds.has(combatant.id));
  const battleTimerLabel = formatBattleTimer(getBattleTimerElapsedMs());

  return `
    <section class="panel panel--table combat-tracker-panel">
      <div class="section-heading">
        <div>
          <h3>${escapeHtml(t("combat_table_title"))}</h3>
        </div>
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
              placeholder="Cantidad"
              value="${escapeHtml(state.areaDamage)}"
              data-area-damage
              aria-label="Cantidad para ajustar filas seleccionadas"
            />
            <div class="mini-actions area-damage__actions">
              <button
                class="mini-action mini-action--damage"
                type="button"
                data-action="adjust-area-pg-act"
                data-mode="damage"
                ${state.selectedIds.size === 0 ? "disabled" : ""}
                aria-label="Aplicar danio a filas seleccionadas"
              >
                <span class="mini-action__icon" aria-hidden="true">DMG</span>
              </button>
              <button
                class="mini-action mini-action--heal"
                type="button"
                data-action="adjust-area-pg-act"
                data-mode="heal"
                ${state.selectedIds.size === 0 ? "disabled" : ""}
                aria-label="Aplicar curacion a filas seleccionadas"
              >
                <span class="mini-action__icon" aria-hidden="true">HEAL</span>
              </button>
              <button
                class="mini-action mini-action--necrotic"
                type="button"
                data-action="adjust-area-necrotic"
                ${state.selectedIds.size === 0 ? "disabled" : ""}
                aria-label="Aplicar necrotico a filas seleccionadas"
              >
                <span class="mini-action__icon" aria-hidden="true">NEC</span>
              </button>
            </div>
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

function renderCombatTimerToggleButton(isActive = false) {
  return `
    <button
      class="toolbar-button combat-overview-toggle ${isActive ? "is-active" : ""}"
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
            Pasar turno
          </button>
        </div>
        <div
          class="combat-turn-strip"
          style="--turn-token-scale:${turnTokenScale}"
          aria-label="Orden de iniciativa"
        >
          ${turnOrder.map((combatant) => renderCombatTurnToken(combatant, combatant.id === activeTurnCombatantId)).join("")}
        </div>
      </div>
    </section>
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

    <section class="panel panel--table compendium-panel bestiary-showcase bestiary-showcase--hearth">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(t("bestiary_eyebrow"))}</p>
          <h3>${escapeHtml(t("bestiary_title"))}</h3>
        </div>
        <div class="section-heading__side">
          <div class="section-meta">
            ${renderRepositoryCsvPicker("bestiary")}
            <span>${getBestiaryStatusLabel()}</span>
            <span>${escapeHtml(t("bestiary_visible", { count: filteredEntries.length }))}</span>
            <span>${escapeHtml(t("bestiary_total", { count: state.bestiary.length }))}</span>
          </div>
        </div>
      </div>

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
        <div>
          <p class="eyebrow">${escapeHtml(t("items_eyebrow"))}</p>
          <h3>${escapeHtml(t("items_title"))}</h3>
        </div>
        <div class="section-meta">
          ${renderRepositoryCsvPicker("items")}
          <span>${getItemStatusLabel()}</span>
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
        <div>
          <p class="eyebrow">${escapeHtml(t("arcanum_eyebrow"))}</p>
          <h3>${escapeHtml(t("arcanum_title"))}</h3>
        </div>
        <div class="section-meta">
          ${renderRepositoryCsvPicker("arcanum")}
          <span>${getArcanumStatusLabel()}</span>
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
  const options = getRepositoryCsvOptions(selectedPath);

  return `
    <label class="repository-csv-picker">
      <span>${escapeHtml(t("csv_loader_label"))}</span>
      <select data-repository-csv="${escapeHtml(repositoryKey)}" aria-label="${escapeHtml(t("csv_loader_label"))}">
        ${options.map((relativePath) => `
          <option value="${escapeHtml(relativePath)}" ${relativePath === selectedPath ? "selected" : ""}>
            ${escapeHtml(getFileNameFromPath(relativePath))}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function getRepositoryCsvOptions(selectedPath) {
  return [...new Set([
    selectedPath,
    ...state.dataCsvFiles,
    ...defaultDataCsvFiles
  ].filter(Boolean))]
    .filter((relativePath) => /\.csv$/i.test(relativePath) && !/\.es\.csv$/i.test(relativePath))
    .sort((left, right) => getFileNameFromPath(left).localeCompare(getFileNameFromPath(right), "es", { sensitivity: "base" }));
}

function renderItemsContent(filteredEntries, selectedEntry) {
  if (state.itemStatus === "loading") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("loading_items"))}
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
        ${escapeHtml(t("loading_arcanum"))}
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

function renderBestiaryContent(filteredEntries, selectedEntry) {
  if (state.bestiaryStatus === "loading") {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("loading_bestiary"))}
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
  detailRoot.innerHTML = selectedEntry ? getCachedBestiaryDetailHtml(selectedEntry) : renderBestiaryDetailEmpty();
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
  detailRoot.innerHTML = selectedEntry ? renderItemDetail(selectedEntry) : renderItemDetailEmpty();
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
  detailRoot.innerHTML = selectedEntry ? renderArcanumDetail(selectedEntry) : renderArcanumDetailEmpty();
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

function renderSummaryCard(item) {
  return `
    <article class="summary-card">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </article>
  `;
}

function renderHeaderCell(column) {
  const filterValue = cleanText(state.filters?.[column.key]);
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
            class="filter-button ${filterValue ? "is-active" : ""}"
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

  return `
    <tr
      class="row--${combatant.side} ${state.selectedIds.has(combatant.id) ? "row--selected" : ""} ${isDead ? "row--dead" : ""} ${isActiveTurn ? "row--active-turn" : ""}"
      data-combat-row-id="${escapeHtml(combatant.id)}"
      tabindex="-1"
    >
      <td class="cell-select">
        <div class="cell-select__stack">
          <input
            type="checkbox"
            data-select-row="${combatant.id}"
            aria-label="Seleccionar ${escapeHtml(combatant.nombre || combatant.id)}"
            ${state.selectedIds.has(combatant.id) ? "checked" : ""}
          />
          <button
            class="cell-row-delete"
            type="button"
            data-action="delete-combatant-row"
            data-combatant-id="${escapeHtml(combatant.id)}"
            aria-label="Eliminar ${escapeHtml(combatant.nombre || combatant.id)}"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
      </td>
      ${columns.map((column) => renderDataCell(combatant, column, isDead)).join("")}
    </tr>
  `;
}

function renderDataCell(combatant, column, isDead) {
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
    const suggestions = getCombatNameSuggestions(combatant);
    const sourceChip = renderCombatantSourceChip(combatant);
    const token = renderCombatantNameToken(combatant);
    const tagChip = renderCombatantTagChip(combatant);

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
          ${isDead || sourceChip || tagChip ? `
            <div class="name-cell__chips">
              ${isDead ? `<span class="death-badge">Muerto</span>` : ""}
              ${tagChip}
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
    const armorClass = combatant.ca ?? "";

    return `
      <td>
        <div class="resource-cell resource-cell--pgmax">
          <div class="resource-cell__top">
            <input
              class="cell-input"
              type="number"
              inputmode="${inputMode}"
              value="${escapeHtml(String(showEffectiveMax ? effectiveMax : value))}"
              data-edit-id="${combatant.id}"
              data-edit-key="${column.key}"
            />
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
              aria-label="Cantidad para ajustar recursos de ${escapeHtml(combatant.nombre)}"
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

function getCombatantColumnValue(combatant, key) {
  if (key === "pgMax") {
    return combatant.pgMax ?? "";
  }

  if (key === "estados") {
    return getCombatantStatusNames(combatant).join(", ");
  }

  return combatant[key] ?? "";
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

function renderCombatStatusCell(combatant) {
  const statusNames = getCombatantStatusNames(combatant);
  const statusDraft = getCombatStatusDraft(combatant.id);
  const statusEntries = getFilteredCombatStatusReferenceEntries(statusDraft);
  const hasExactDraftMatch = statusEntries.some((entry) => normalizeTranslationKey(entry.name.toLowerCase()) === normalizeTranslationKey(statusDraft.toLowerCase()));

  return `
    <div class="combat-status-cell">
      <details class="combat-inline-menu combat-inline-menu--status" data-combat-status-menu ${state.activeCombatStatusMenuId === combatant.id ? "open" : ""}>
        <summary class="combat-status-cell__add" data-action="toggle-combat-status-menu" data-combatant-id="${escapeHtml(combatant.id)}">
          + Estado
        </summary>
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
                  data-combat-status="${escapeHtml(statusDraft)}"
                >
                  <strong>Anadir estado personalizado</strong>
                  <span>${escapeHtml(statusDraft)}</span>
                </button>
              `
              : ""
          }
          ${
            statusEntries.length > 0
              ? statusEntries.map((entry) => `
                <button
                  class="combat-inline-menu__option ${statusNames.includes(entry.name) ? "is-active" : ""}"
                  type="button"
                  data-action="toggle-combat-status"
                  data-combatant-id="${escapeHtml(combatant.id)}"
                  data-combat-status="${escapeHtml(entry.name)}"
                >
                  <strong>${escapeHtml(entry.name)}</strong>
                  ${entry.description ? `<span>${escapeHtml(entry.description)}</span>` : ""}
                </button>
              `).join("")
              : `<div class="combat-inline-menu__empty">${statusDraft ? "No hay coincidencias en la tabla de estados." : "No hay tabla de estados disponible."}</div>`
          }
        </div>
      </details>
      <div class="combat-status-cell__chips">
        ${
          statusNames.length > 0
            ? statusNames.map((statusName) => renderCombatStatusChip(combatant.id, statusName)).join("")
            : `<span class="combat-status-cell__empty">Sin estados</span>`
        }
      </div>
    </div>
  `;
}

function renderCombatStatusChip(combatantId, statusName) {
  const description = getCombatStatusDescription(statusName);

  return `
    <div class="combat-status-chip-wrap">
      <button
        class="combat-status-chip"
        type="button"
        data-action="toggle-combat-status"
        data-combatant-id="${escapeHtml(combatantId)}"
        data-combat-status="${escapeHtml(statusName)}"
        aria-label="Quitar estado ${escapeHtml(statusName)}"
      >
        ${escapeHtml(statusName)}
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
  const normalizedName = normalizeTranslationKey(cleanText(statusName).toLowerCase());
  return getCombatStatusReferenceEntries()
    .find((entry) => normalizeTranslationKey(entry.name.toLowerCase()) === normalizedName)
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
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
}

function getCombatStatusReferenceTable() {
  const tables = Array.isArray(state.tables) ? state.tables.filter((table) => isPlainObject(table)) : [];

  return tables.find((table) => {
    const tableName = cleanText(table.name).toLowerCase();
    const firstColumnLabel = cleanText(Array.isArray(table.columns) ? table.columns[0]?.label : "").toLowerCase();

    return tableName.includes("estado") || firstColumnLabel.includes("estado");
  }) ?? null;
}

function isProtectedTable(table) {
  if (!isPlainObject(table)) {
    return false;
  }

  const tableName = cleanText(table.name).toLowerCase();
  const firstColumnLabel = cleanText(Array.isArray(table.columns) ? table.columns[0]?.label : "").toLowerCase();
  return tableName === "tabla estados" || (tableName.includes("estado") && firstColumnLabel.includes("estado"));
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
  const linkedCharacter = getLinkedCharacterForCombatant(combatant);
  const bestiaryEntry = getCombatantBestiaryEntry(combatant);
  const tokenUrl = getCombatantTokenUrl(combatant);
  const initials = linkedCharacter
    ? getCharacterInitials(linkedCharacter)
    : getCombatantInitials(combatant);

  if (!tokenUrl && !linkedCharacter) {
    return "";
  }

  if (!isEnemyCombatant(combatant)) {
    return `
      <span class="combat-name-token-wrap combat-name-token-wrap--ally">
        <span class="combat-name-token-static">
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
        </span>
        ${linkedCharacter ? renderCombatCharacterPreview(linkedCharacter) : ""}
      </span>
    `;
  }

  if (!bestiaryEntry || !tokenUrl) {
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

function renderCombatCharacterPreview(character) {
  const subtitleParts = [
    character.className,
    character.subclassName,
    character.species,
    character.level ? `Nivel ${character.level}` : ""
  ].filter(Boolean);

  return `
    <button
      class="combat-token-preview combat-token-preview--character"
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
        <h4>Skills</h4>
        <p>Sin skills de campana configuradas.</p>
      </section>
    `;
  }

  return `
    <section class="detail-section">
      <h4>Skills</h4>
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
  const selectedCombatCharacters = getSelectedCharactersForCombat().filter((character) => !isCharacterAlreadyInCombat(character.id));
  const availableCombatCharacters = visibleCharacters.filter((character) => !isCharacterAlreadyInCombat(character.id));

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

function renderDiaryScreen() {
  reconcileDiaryUiState();
  const activeNote = getActiveDiaryNote();
  const folderCount = state.diaryFolders.length;

  return `
    <section class="panel panel--table diary-screen">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(t("diary_eyebrow"))}</p>
          <h3>${escapeHtml(t("diary_title"))}</h3>
        </div>
        <div class="section-meta">
          <span>${escapeHtml(t("diary_notes_count", { count: state.diaryNotes.length }))}</span>
          <span>${escapeHtml(t("diary_folders_count", { count: folderCount }))}</span>
          <span>${escapeHtml(activeNote ? t("diary_open_note") : t("diary_no_selection"))}</span>
        </div>
      </div>

      <div class="characters-toolbar diary-screen__toolbar">
        <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-diary-note">
          ${escapeHtml(t("diary_new_note"))}
        </button>
        <button class="toolbar-button" type="button" data-action="create-diary-folder">
          ${escapeHtml(t("diary_new_folder"))}
        </button>
        <button class="toolbar-button toolbar-button--danger" type="button" data-action="delete-diary-note" ${activeNote ? "" : "disabled"}>
          ${escapeHtml(t("diary_delete_note"))}
        </button>
      </div>

      <div class="diary-layout">
        <aside class="diary-sidebar panel panel--inner" aria-label="${escapeHtml(t("diary_sidebar_aria"))}">
          <div class="diary-sidebar__header">
            <div>
              <p class="eyebrow">${escapeHtml(t("diary_list_eyebrow"))}</p>
              <h3>${escapeHtml(t("diary_entries_title"))}</h3>
            </div>
          </div>
          <div class="diary-sidebar__list">
            ${
              state.diaryNotes.length > 0 || state.diaryFolders.length > 0
                ? getDiaryFolderGroups().map((folder) => renderDiaryFolderGroup(folder)).join("")
                : `
                  <div class="empty-state empty-state--compact">
                    ${escapeHtml(t("diary_empty_list"))}
                  </div>
                `
            }
          </div>
        </aside>

        <section class="diary-workspace panel panel--inner">
          ${
            activeNote
              ? renderDiaryEditor(activeNote)
              : `
                <div class="empty-state empty-state--panel diary-workspace__empty">
                  <div>
                    <p>${escapeHtml(t("diary_empty_workspace"))}</p>
                    <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-diary-note">
                      ${escapeHtml(t("diary_create_first_note"))}
                    </button>
                  </div>
                </div>
              `
          }
        </section>
      </div>
    </section>
  `;
}

function renderDiaryFolderGroup(folder) {
  const folderNotes = getDiaryNotesByFolder(folder.id);
  const isActive = state.activeDiaryFolderId === folder.id;
  const isSystemFolder = folder.id === "";

  if (folderNotes.length === 0 && isSystemFolder && state.diaryFolders.length > 0) {
    return "";
  }

  return `
    <section class="encounter-folder ${isActive ? "is-active" : ""}">
      <div class="encounter-folder__header">
        <div class="encounter-folder__summary">
          <button
            class="encounter-folder__toggle"
            type="button"
            data-action="toggle-diary-folder"
            data-diary-folder-id="${escapeHtml(folder.id)}"
            aria-expanded="${folder.isExpanded}"
          >
            <span aria-hidden="true">${folder.isExpanded ? "v" : ">"}</span>
            <small>${folderNotes.length}</small>
          </button>
          ${
            isSystemFolder
              ? `<strong class="encounter-folder__static-name">${escapeHtml(folder.name)}</strong>`
              : `
                <input
                  class="encounter-folder__name"
                  type="text"
                  value="${escapeHtml(folder.name)}"
                  data-diary-folder-name="${escapeHtml(folder.id)}"
                  aria-label="${escapeHtml(t("diary_folder_name_aria", { name: folder.name }))}"
                />
              `
          }
        </div>
        <div class="tables-folder__actions">
          <button
            class="filter-clear"
            type="button"
            data-action="create-diary-note"
            ${folder.id ? `data-diary-folder-id="${escapeHtml(folder.id)}"` : ""}
          >
            ${escapeHtml(t("diary_folder_new_short"))}
          </button>
          ${
            !isSystemFolder
              ? `
                <button
                  class="filter-clear encounter-folder__delete"
                  type="button"
                  data-action="delete-diary-folder"
                  data-diary-folder-id="${escapeHtml(folder.id)}"
                  aria-label="${escapeHtml(t("diary_delete_folder_aria", { name: folder.name }))}"
                >
                  ${escapeHtml(t("diary_delete_folder_short"))}
                </button>
              `
              : ""
          }
        </div>
      </div>
      ${
        folder.isExpanded
          ? `
            <div class="encounter-folder__items">
              ${
                folderNotes.length > 0
                  ? folderNotes.map((note) => renderDiaryNoteListItem(note)).join("")
                  : `<div class="empty-state empty-state--compact">${escapeHtml(t("diary_empty_folder"))}</div>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderDiaryNoteListItem(note) {
  const isActive = note.id === state.activeDiaryNoteId;
  const realSummary = formatDiaryRealDateSummary(note) || t("diary_real_date_empty");
  const harptosSummary = formatDiaryHarptosDateSummary(note) || t("diary_harptos_date_empty");

  return `
    <button
      class="diary-note-card ${isActive ? "is-active" : ""}"
      type="button"
      data-action="select-diary-note"
      data-diary-note-id="${escapeHtml(note.id)}"
      aria-pressed="${isActive}"
    >
      <strong>${escapeHtml(note.title || t("diary_note_untitled"))}</strong>
      <small class="diary-note-card__meta-row">${escapeHtml(t("diary_real_date_label"))}: ${escapeHtml(realSummary)}</small>
      <small class="diary-note-card__meta-row">${escapeHtml(t("diary_harptos_date_label"))}: ${escapeHtml(harptosSummary)}</small>
      <span>${escapeHtml(getDiaryNoteUpdatedLabel(note.updatedAt))}</span>
    </button>
  `;
}

function renderDiaryEditor(note) {
  return `
    <div class="diary-editor">
      <div class="diary-editor__header">
        <div class="diary-editor__identity">
          <label class="toolbar-field diary-editor__title">
            <span>${escapeHtml(t("diary_title_field"))}</span>
            <input
              class="filter-input"
              type="text"
              value="${escapeHtml(note.title)}"
              placeholder="${escapeHtml(t("diary_title_placeholder"))}"
              data-diary-title="${escapeHtml(note.id)}"
            />
          </label>
        </div>
        <div class="section-meta">
          <span>${escapeHtml(getDiaryNoteUpdatedLabel(note.updatedAt))}</span>
        </div>
      </div>

      <div class="diary-editor__meta-grid">
        ${renderDiaryRealDateCard(note)}
        ${renderDiaryHarptosDateCard(note)}
      </div>

      <div class="diary-editor__toolbar" aria-label="${escapeHtml(t("diary_toolbar_aria"))}">
        ${renderDiaryCommandButton("bold", t("diary_cmd_bold"))}
        ${renderDiaryCommandButton("italic", t("diary_cmd_italic"))}
        ${renderDiaryCommandButton("underline", t("diary_cmd_underline"))}
        ${renderDiaryCommandButton("strikeThrough", t("diary_cmd_strike"))}
        ${renderDiaryCommandButton("formatBlock", "H3", "<h3>")}
        ${renderDiaryCommandButton("formatBlock", t("diary_cmd_quote"), "<blockquote>")}
        ${renderDiaryCommandButton("insertUnorderedList", t("diary_cmd_list"))}
        ${renderDiaryCommandButton("insertOrderedList", t("diary_cmd_numbered"))}
        ${renderDiaryCommandButton("createLink", t("diary_cmd_link"))}
        ${renderDiaryCommandButton("unlink", t("diary_cmd_unlink"))}
        ${renderDiaryCommandButton("insertHorizontalRule", t("diary_cmd_separator"))}
        ${renderDiaryCommandButton("removeFormat", t("diary_cmd_clear"))}
      </div>

      <div
        class="diary-rich-editor"
        contenteditable="true"
        spellcheck="true"
        data-diary-editor="${escapeHtml(note.id)}"
      >${note.contentHtml}</div>
    </div>
  `;
}

function renderDiaryCommandButton(command, label, value = "") {
  return `
    <button
      class="toolbar-button toolbar-button--subtle diary-editor__command"
      type="button"
      data-action="apply-diary-command"
      data-diary-command="${escapeHtml(command)}"
      ${value ? `data-diary-command-value="${escapeHtml(value)}"` : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderDiaryRealDateCard(note) {
  const isRange = note.realDateMode === "range";
  const summary = formatDiaryRealDateSummary(note) || t("diary_no_date_assigned");
  const isCollapsed = state.diaryCalendarSectionCollapsed.real === true;

  return `
    <section class="detail-section diary-date-card">
      <div class="diary-date-card__header">
        <button
          class="diary-date-card__title-button"
          type="button"
          data-action="toggle-diary-calendar-section"
          data-diary-calendar-section="real"
          aria-expanded="${isCollapsed ? "false" : "true"}"
        >
          <p class="eyebrow">${escapeHtml(t("diary_real_eyebrow"))}</p>
          <h4>${escapeHtml(t("diary_real_calendar_title"))}</h4>
        </button>
        <div class="diary-date-card__summary">${escapeHtml(summary)}</div>
      </div>
      ${
        isCollapsed
          ? ""
          : `
      <div class="diary-date-card__grid">
        <label class="toolbar-field diary-date-card__mode-field">
          <span>${escapeHtml(t("diary_mode_label"))}</span>
          <select data-diary-real-date-mode="${escapeHtml(note.id)}">
            <option value="single" ${isRange ? "" : "selected"}>${escapeHtml(t("diary_mode_day"))}</option>
            <option value="range" ${isRange ? "selected" : ""}>${escapeHtml(t("diary_mode_range"))}</option>
          </select>
        </label>
        <label class="toolbar-field">
          <span>${escapeHtml(isRange ? t("diary_start_label") : t("diary_day_label"))}</span>
          <input
            class="filter-input"
            type="date"
            value="${escapeHtml(note.realDateStart)}"
            data-diary-real-date-start="${escapeHtml(note.id)}"
          />
        </label>
        ${
          isRange
            ? `
              <label class="toolbar-field">
                <span>${escapeHtml(t("diary_end_label"))}</span>
                <input
                  class="filter-input"
                  type="date"
                  value="${escapeHtml(note.realDateEnd)}"
                  data-diary-real-date-end="${escapeHtml(note.id)}"
                />
              </label>
            `
            : ""
        }
      </div>
          `
      }
    </section>
  `;
}

function renderDiaryHarptosDateCard(note) {
  const isRange = note.harptosDateMode === "range";
  const summary = formatDiaryHarptosDateSummary(note) || t("diary_no_date_assigned");
  const isCollapsed = state.diaryCalendarSectionCollapsed.harptos === true;

  return `
    <section class="detail-section diary-date-card">
      <div class="diary-date-card__header">
        <button
          class="diary-date-card__title-button"
          type="button"
          data-action="toggle-diary-calendar-section"
          data-diary-calendar-section="harptos"
          aria-expanded="${isCollapsed ? "false" : "true"}"
        >
          <p class="eyebrow">${escapeHtml(t("diary_harptos_eyebrow"))}</p>
          <h4>${escapeHtml(t("diary_harptos_calendar_title"))}</h4>
        </button>
        <div class="diary-date-card__summary">${escapeHtml(summary)}</div>
      </div>
      ${
        isCollapsed
          ? ""
          : `
      <div class="diary-date-card__grid">
        <label class="toolbar-field diary-date-card__mode-field">
          <span>${escapeHtml(t("diary_mode_label"))}</span>
          <select data-diary-harptos-date-mode="${escapeHtml(note.id)}">
            <option value="single" ${isRange ? "" : "selected"}>${escapeHtml(t("diary_mode_day"))}</option>
            <option value="range" ${isRange ? "selected" : ""}>${escapeHtml(t("diary_mode_range"))}</option>
          </select>
        </label>
      </div>
      <div class="diary-date-card__range-grid">
        ${renderDiaryHarptosDateFields(note.id, "start", note.harptosStart, isRange ? t("diary_start_label") : t("diary_day_label"))}
        ${isRange ? renderDiaryHarptosDateFields(note.id, "end", note.harptosEnd, t("diary_end_label")) : ""}
      </div>
          `
      }
    </section>
  `;
}

function renderDiaryHarptosDateFields(noteId, side, dateValue, label) {
  const period = HARPTOS_PERIODS_BY_ID.get(dateValue.periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const isFestival = period.kind === "festival";
  const monthSelectValue = isFestival ? "" : dateValue.periodId;
  const subtitle = isFestival
    ? t("diary_harptos_festival_meta")
    : t("diary_harptos_month_meta", { count: period.days });

  return `
    <div class="diary-date-card__harptos-block">
      <div class="diary-date-card__block-header">
        <p class="eyebrow">${escapeHtml(label)}</p>
        <span class="diary-date-card__block-meta">${escapeHtml(subtitle)}</span>
      </div>
      <div class="diary-date-card__harptos-fields">
        <label class="toolbar-field">
          <span>${escapeHtml(t("diary_harptos_year_label"))}</span>
          <input
            class="filter-input"
            type="number"
            value="${escapeHtml(String(dateValue.year))}"
            min="1"
            step="1"
            data-diary-harptos-year="${escapeHtml(noteId)}"
            data-diary-harptos-side="${escapeHtml(side)}"
          />
        </label>
      </div>
      ${renderDiaryHarptosVisualCalendar(noteId, side, dateValue, monthSelectValue)}
    </div>
  `;
}

function formatHarptosPeriodSelectLabel(periodEntry) {
  return `${String(getHarptosMonthNumber(periodEntry.id)).padStart(2, "0")} ${periodEntry.name}`;
}

function renderDiaryHarptosVisualCalendar(noteId, side, dateValue, monthSelectValue = "") {
  const period = HARPTOS_PERIODS_BY_ID.get(dateValue.periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const isFestival = period.kind === "festival";
  const visibleMonthId = getHarptosVisibleMonthPeriodId(dateValue);
  const visibleMonth = HARPTOS_PERIODS_BY_ID.get(visibleMonthId) ?? HARPTOS_MONTH_PERIODS[0];

  return `
    <div class="diary-harptos-visual">
      <div class="diary-harptos-visual__section">
        ${
          isFestival
            ? `
              <div class="diary-harptos-visual__festival-selected">
                ${escapeHtml(t("diary_harptos_festival_hidden_copy", { name: period.name, month: visibleMonth.name }))}
              </div>
            `
            : ""
        }
        <details class="diary-harptos-visual__month-picker">
          <summary class="diary-harptos-visual__month-trigger">
            ${escapeHtml(formatHarptosPeriodSelectLabel(visibleMonth))}
          </summary>
          <div class="diary-harptos-visual__month-options">
            ${HARPTOS_MONTH_PERIODS.map((periodEntry) => `
              <button
                class="diary-harptos-visual__chip ${periodEntry.id === visibleMonthId ? "is-active" : ""}"
                type="button"
                data-action="set-diary-harptos-period"
                data-diary-harptos-period="${escapeHtml(noteId)}"
                data-diary-harptos-side="${escapeHtml(side)}"
                data-harptos-period-id="${escapeHtml(periodEntry.id)}"
              >
                ${escapeHtml(formatHarptosPeriodSelectLabel(periodEntry))}
              </button>
            `).join("")}
          </div>
        </details>
        <div class="diary-harptos-visual__days">
          ${Array.from({ length: visibleMonth.days }, (_, index) => index + 1).map((day) => `
            <button
              class="diary-harptos-visual__day ${visibleMonth.id === monthSelectValue && day === dateValue.day ? "is-active" : ""}"
              type="button"
              data-action="set-diary-harptos-day"
              data-diary-harptos-day="${escapeHtml(noteId)}"
              data-diary-harptos-side="${escapeHtml(side)}"
              data-harptos-day="${day}"
            >
              ${day}
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function getHarptosMonthNumber(periodId) {
  return HARPTOS_MONTH_PERIODS.findIndex((entry) => entry.id === periodId) + 1;
}

function getHarptosVisibleMonthPeriodId(value) {
  const currentPeriodId = cleanText(value?.periodId);

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

  return HARPTOS_MONTH_PERIODS[0]?.id ?? HARPTOS_CALENDAR_PERIODS[0]?.id ?? "";
}

function renderTablesScreen() {
  reconcileTablesUiState();
  const openTables = getOpenTables();
  const selectedFolder = state.tableFolders.find((folder) => folder.id === state.activeTableFolderId) ?? null;

  return `
    <section class="panel panel--table tables-screen">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Referencia editable</p>
          <h3>Tablas</h3>
        </div>
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
          </td>
        `;
      }).join("")}
    </tr>
  `;
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

function getTableColumnKind(column, index) {
  const label = cleanText(column?.label).toLowerCase();

  if (
    index === 0
    && (
      label.includes("num")
      || label.includes("numero")
      || label === "#"
      || label === "id"
    )
  ) {
    return "number";
  }

  if (
    index === 0
    && (
      label.includes("estado")
      || label.includes("nombre")
      || label.includes("tipo")
      || label.includes("tag")
    )
  ) {
    return "short";
  }

  return "wide";
}

function getTableTextareaRows(columnCount, columnKind) {
  if (columnKind === "number") {
    return 1;
  }

  if (columnKind === "short") {
    return 2;
  }

  return columnCount <= 2 ? 2 : 3;
}

function renderCharacterListItem(character) {
  const isActive = character.id === state.activeCharacterId;
  const isSelected = state.selectedCharacterIds.has(character.id);
  const subtitle = [
    character.className,
    character.level ? `Nivel ${character.level}` : "",
    character.playerName
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
        <small>${escapeHtml(subtitle || "ALIADO")}</small>
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
  const combatants = Array.isArray(state.combatants) ? state.combatants.filter(Boolean) : [];

  return [...combatants]
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
  return cleanText(getLinkedCharacterForCombatant(combatant)?.tokenUrl)
    || getCombatantBestiaryEntry(combatant)?.tokenUrl
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
  const name = cleanText(combatant.nombre).toLowerCase();

  if (!name || state.bestiaryStatus !== "ready") {
    return [];
  }

  return state.bestiary
    .filter((entry) => cleanText(entry.name).toLowerCase() === name)
    .sort((left, right) => {
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
    const filterValue = cleanText(state.filters?.[column.key]).toLowerCase();

    if (!filterValue) {
      return true;
    }

    const value = column.key === "pgMax"
      ? `${combatant.pgMax} ${getEffectivePgMax(combatant)}`
      : getCombatantColumnValue(combatant, column.key);

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
  state.selectedCharacterIds = new Set([character.id]);
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
    .sort((left, right) => {
      const leftSource = getBestiarySourceFullName(left.source) || cleanText(left.source);
      const rightSource = getBestiarySourceFullName(right.source) || cleanText(right.source);
      return leftSource.localeCompare(rightSource, "es", { sensitivity: "base" });
    });
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
  const nextStandNumber = formatStandNumber(getNextEnemyStandNumber());

  state.combatants = [
    {
      id,
      side: "enemies",
      source: "",
      ubicacion: "",
      iniactiva: "",
      nombre: "Nueva entidad enemiga",
      numPeana: nextStandNumber,
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
    },
    ...state.combatants
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

  if (!normalizedStatus) {
    return;
  }

  state.combatants = state.combatants.map((combatant) => {
    if (combatant.id !== combatantId) {
      return combatant;
    }

    const currentStatuses = getCombatantStatusNames(combatant);
    const normalizedStatuses = currentStatuses.map((entry) => normalizeTranslationKey(entry.toLowerCase()));
    const targetKey = normalizeTranslationKey(normalizedStatus.toLowerCase());
    const nextStatuses = normalizedStatuses.includes(targetKey)
      ? currentStatuses.filter((entry) => normalizeTranslationKey(entry.toLowerCase()) !== targetKey)
      : [...currentStatuses, normalizedStatus];

    return normalizeCombatant({
      ...combatant,
      condiciones: nextStatuses.join(", ")
    });
  });
  clearCombatStatusDraft(combatantId);
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
  const amount = Number(getInlineAdjustment(id).pgAct);

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
  setInlineAdjustment(id, "pgAct", "");
}

function applyAreaPgActAdjustment(mode = "damage") {
  const amount = Number(state.areaDamage);

  if (!Number.isFinite(amount) || amount < 0 || state.selectedIds.size === 0) {
    return;
  }

  const previousCombatants = state.combatants;
  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
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
  state.areaDamage = "";
}

function applyAreaNecroticAdjustment() {
  const amount = Number(state.areaDamage);

  if (!Number.isFinite(amount) || amount < 0 || state.selectedIds.size === 0) {
    return;
  }

  const previousCombatants = state.combatants;
  state.combatants = state.combatants.map((combatant) => {
    if (!state.selectedIds.has(combatant.id)) {
      return combatant;
    }

    return normalizeCombatant({
      ...combatant,
      necrotic: toNumber(combatant.necrotic) + amount
    }, "necrotic");
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
  if (combatant.pgMax === "" && combatant.pgAct === "") {
    return false;
  }

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
      .filter((relativePath) => !/\.es\.csv$/i.test(relativePath))
      .sort((left, right) => getFileNameFromPath(left).localeCompare(getFileNameFromPath(right), "es", { sensitivity: "base" }));
    render();
  } catch {
    state.dataCsvFiles = [...defaultDataCsvFiles];
  }
}

function getRepositoryCsvPath(repositoryKey) {
  return normalizeDataCsvRelativePath(state.repositoryCsvPaths[repositoryKey])
    || defaultRepositoryCsvPaths[repositoryKey]
    || "";
}

function updateRepositoryCsvPath(repositoryKey, relativePath) {
  if (!defaultRepositoryCsvPaths[repositoryKey]) {
    return;
  }

  state.repositoryCsvPaths = {
    ...state.repositoryCsvPaths,
    [repositoryKey]: normalizeDataCsvRelativePath(relativePath) || defaultRepositoryCsvPaths[repositoryKey]
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

function reloadCompendiumContent() {
  resetBestiaryVirtualScroll();
  resetItemVirtualScroll();
  resetArcanumVirtualScroll();
  resetBestiaryRenderCache();
  loadBestiary();
  window.setTimeout(() => loadItems(), 80);
  window.setTimeout(() => loadArcanum(), 160);
}

async function getLocalizedCompendiumRows(kind, csvText, relativePath) {
  const baseRows = parseCsv(csvText);
  const detectedLanguage = detectCsvContentLanguage(baseRows, kind);
  const targetLanguage = normalizeStoredContentLanguage(state.contentLanguage);

  if (targetLanguage !== CONTENT_LANGUAGE_ES || detectedLanguage === CONTENT_LANGUAGE_ES) {
    return {
      rows: baseRows,
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_ORIGINAL,
        sidecarPath: "",
        message: ""
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
      meta: {
        detectedLanguage,
        translationMode: CONTENT_TRANSLATION_MODE_GLOSSARY,
        sidecarPath: "",
        message: "Spanish sidecar CSV missing or incompatible; local glossary applied."
      }
    };
  }
}

function getLocalizedCsvRelativePath(relativePath, language) {
  const normalizedPath = normalizeDataCsvRelativePath(relativePath);
  return normalizedPath.replace(/\.csv$/i, `.${language}.csv`);
}

function getDataAssetUrl(relativePath) {
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

async function loadBestiary() {
  state.bestiaryStatus = "loading";
  state.bestiaryMessage = "";
  state.bestiaryDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("bestiary");
    const [text, imageMap] = await Promise.all([
      loadTextAsset(getDataAssetUrl(csvRelativePath), csvRelativePath),
      loadBestiaryImages()
    ]);
    const { rows, meta } = await getLocalizedCompendiumRows("bestiary", text, csvRelativePath);

    state.bestiaryImageMap = imageMap;
    state.contentSourceMeta.bestiary = meta;
    state.bestiary = rows.map((row, index) => normalizeBestiaryEntry(row, index, imageMap, {
      isPackagedDesktopApp: isPackagedDesktopApp()
    }));
    hydrateBestiaryStaticOptions();
    resetBestiaryRenderCache();
    state.bestiaryStatus = "ready";
    state.bestiaryDebugInfo = null;
    state.bestiarySelectedId = state.bestiary[0]?.id ?? "";
    render();
  } catch (error) {
    const csvRelativePath = getRepositoryCsvPath("bestiary");
    state.bestiaryStatus = "error";
    state.bestiaryMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.bestiaryDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Bestiario",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: csvRelativePath,
      loaderMode: "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadItems() {
  state.itemStatus = "loading";
  state.itemMessage = "";
  state.itemDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("items");
    const [text, imageMap] = await Promise.all([
      loadTextAsset(getDataAssetUrl(csvRelativePath), csvRelativePath),
      loadItemImages()
    ]);
    const { rows, meta } = await getLocalizedCompendiumRows("items", text, csvRelativePath);

    state.itemImageMap = imageMap;
    state.contentSourceMeta.items = meta;
    state.items = rows.map((row, index) => normalizeItemEntry(row, index, imageMap));
    resetItemVirtualScroll();
    state.itemStatus = "ready";
    state.itemDebugInfo = null;
    state.itemSelectedId = state.items[0]?.id ?? "";
    render();
  } catch (error) {
    const csvRelativePath = getRepositoryCsvPath("items");
    state.itemStatus = "error";
    state.itemMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.itemDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Items",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: csvRelativePath,
      loaderMode: "desktopApi.readAssetText -> fetch"
    });
    render();
  }
}

async function loadArcanum() {
  state.arcanumStatus = "loading";
  state.arcanumMessage = "";
  state.arcanumDebugInfo = null;

  try {
    render();
    const csvRelativePath = getRepositoryCsvPath("arcanum");
    const text = await loadTextAsset(getDataAssetUrl(csvRelativePath), csvRelativePath);
    const { rows, meta } = await getLocalizedCompendiumRows("arcanum", text, csvRelativePath);

    state.contentSourceMeta.arcanum = meta;
    state.arcanum = rows.map((row, index) => normalizeSpellEntry(row, index));
    resetBestiaryRenderCache();
    state.arcanumStatus = "ready";
    state.arcanumDebugInfo = null;
    state.arcanumSelectedId = state.arcanum[0]?.id ?? "";
    render();
  } catch (error) {
    const csvRelativePath = getRepositoryCsvPath("arcanum");
    state.arcanumStatus = "error";
    state.arcanumMessage = error instanceof Error ? error.message : `No se pudo cargar ${csvRelativePath}.`;
    state.arcanumDebugInfo = await resolveAssetLoadDebugInfo(error, {
      label: "Arcanum",
      assetUrl: getDataAssetUrl(csvRelativePath),
      desktopRelativePath: csvRelativePath,
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

function getItemEntryByName(name) {
  const normalizedName = cleanText(name).toLowerCase();

  if (!normalizedName) {
    return null;
  }

  return state.items.find((entry) => entry.nameLower === normalizedName) ?? null;
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
      <div class="bestiary-filter__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.bestiaryFilters.query)}"
          placeholder="${escapeHtml(t("bestiary_search_placeholder"))}"
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
      <span>${escapeHtml(t("items_search_label"))}</span>
      <div class="bestiary-filter__controls">
        <input
          class="filter-input filter-input--wide"
          type="search"
          value="${escapeHtml(state.itemFilters.query)}"
          placeholder="${escapeHtml(t("arcanum_search_placeholder"))}"
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
          placeholder="${escapeHtml(t("items_search_placeholder"))}"
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
    return t("loading_csv");
  }

  if (state.bestiaryStatus === "error") {
    return t("read_error");
  }

  return t("active_csv", { path: getRepositoryStatusPath("bestiary") });
}
function getItemStatusLabel() {
  if (state.itemStatus === "loading") {
    return t("loading_csv");
  }

  if (state.itemStatus === "error") {
    return t("read_error");
  }

  return t("active_csv", { path: getRepositoryStatusPath("items") });
}

function getArcanumStatusLabel() {
  if (state.arcanumStatus === "loading") {
    return t("loading_csv");
  }

  if (state.arcanumStatus === "error") {
    return t("read_error");
  }

  return t("active_csv", { path: getRepositoryStatusPath("arcanum") });
}

function getRepositoryStatusPath(repositoryKey) {
  const relativePath = getRepositoryCsvPath(repositoryKey);
  const meta = state.contentSourceMeta[repositoryKey] ?? blankContentSourceMeta;
  const modeLabel = getContentTranslationModeLabel(meta.translationMode, state.contentLanguage);

  return `${relativePath} · ${modeLabel}`;
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
    if (isItemTypeTokenFilterValue(value)) {
      return decodeItemTypeTokenFilterValue(value);
    }

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

function getItemTypeFilterValueFromToken(token) {
  const normalizedToken = cleanText(token);

  if (!normalizedToken) {
    return "";
  }

  const group = ITEM_TYPE_GROUPS.find((item) => item.label.localeCompare(normalizedToken, "es", { sensitivity: "base" }) === 0);

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
    ui: {
      activeScreen: state.activeScreen,
      activeEncounterId: state.activeEncounterId,
      activeEncounterFolderId: state.activeEncounterFolderId,
      contentLanguage: normalizeStoredContentLanguage(state.contentLanguage),
      repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(state.repositoryCsvPaths)
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
  const diary = normalizeStoredDiaryState(value.diary);
  const tables = normalizeStoredTablesState(value.tables);
  const characters = normalizeStoredCharacters(value.characters, characterSkillDefinitions);
  const combatTracker = normalizeStoredCombatTrackerState(value.combatTracker);
  const battleTimer = normalizeStoredBattleTimer(value.combatTracker?.battleTimer);
  const ui = isPlainObject(value.ui) ? value.ui : {};
  const campaign = isPlainObject(value.campaign) ? value.campaign : {};
  const name = cleanText(campaign.name) || cleanText(value.name) || "Campaña sin nombre";

  return {
    name,
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
    repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(ui.repositoryCsvPaths)
  };
}

function resetTransientCampaignUiState() {
  stopActiveTableRoll();
  state.fileMenuOpen = false;
  state.optionsMenuOpen = false;
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
}

function applyCampaignSave(campaign, fileResult = null) {
  stopBattleTimerInterval();

  state.campaignName = campaign.name;
  state.campaignFileName = cleanText(fileResult?.fileName) || state.campaignFileName;
  state.campaignFilePath = cleanText(fileResult?.filePath) || state.campaignFilePath;
  state.activeScreen = campaign.activeScreen;
  state.contentLanguage = campaign.contentLanguage;
  state.repositoryCsvPaths = campaign.repositoryCsvPaths;
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
  state.diaryNotes = campaign.diary.notes;
  state.activeDiaryFolderId = campaign.diary.activeDiaryFolderId;
  state.activeDiaryNoteId = campaign.diary.activeNoteId;
  state.tableFolders = campaign.tables.folders;
  state.systemTableFolderExpanded = campaign.tables.systemFolderExpanded;
  state.tables = campaign.tables.tables;
  state.activeTableFolderId = campaign.tables.activeTableFolderId;
  state.activeTableId = campaign.tables.activeTableId;
  state.openTableIds = campaign.tables.openTableIds;
  state.rolledTableRowId = "";
  reconcileDiaryUiState();
  reconcileTablesUiState();

  saveCombatTrackerState();
  saveCharacterSkillDefinitions();
  saveCharacters();
  saveEncounterInventory();
  saveDiaryState();
  saveTablesState();
  reloadCompendiumContent();

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
    return { name: "", fileName: "", filePath: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
  }

  if (usesDesktopFileOnlyPersistence()) {
    return { name: "", fileName: "", filePath: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(CAMPAIGN_META_STORAGE_KEY) || "{}");
    const filePath = cleanText(parsedValue.filePath);
    const fileName = cleanText(parsedValue.fileName) || getFileNameFromPath(filePath);

    return {
      name: fileName ? cleanText(parsedValue.name) || getCampaignNameFromFileName(fileName) : "",
      fileName,
      filePath,
      language: normalizeStoredAppLanguage(parsedValue.language),
      contentLanguage: normalizeStoredContentLanguage(parsedValue.contentLanguage),
      repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(parsedValue.repositoryCsvPaths)
    };
  } catch {
    return { name: "", fileName: "", filePath: "", language: APP_LANGUAGE_ES, contentLanguage: CONTENT_LANGUAGE_ES, repositoryCsvPaths: { ...defaultRepositoryCsvPaths } };
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
        language: normalizeStoredAppLanguage(state.appLanguage),
        contentLanguage: normalizeStoredContentLanguage(state.contentLanguage),
        repositoryCsvPaths: normalizeStoredRepositoryCsvPaths(state.repositoryCsvPaths)
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
    combatRound: normalizeStoredCombatRound(value.combatRound),
    enemyHpMode: normalizeStoredEnemyHpMode(value.enemyHpMode)
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
    combatRound: state.combatRound,
    enemyHpMode: state.enemyHpMode
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
    combatRound: 1,
    enemyHpMode: ENEMY_HP_MODE_FIXED
  };
}

function getDefaultCombatSort() {
  return { key: "numPeana", direction: "asc" };
}

function normalizeStoredEnemyHpMode(value) {
  return cleanText(value) === ENEMY_HP_MODE_VARIABLE ? ENEMY_HP_MODE_VARIABLE : ENEMY_HP_MODE_FIXED;
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
    folders: [],
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
  const folders = Array.isArray(source.folders)
    ? source.folders.map((folder) => normalizeStoredTableFolder(folder)).filter(Boolean)
    : [];
  const rawTables = Array.isArray(value)
    ? value
    : Array.isArray(source.tables)
      ? source.tables
      : initialTableDefinitions;
  let tables = rawTables
    .map((table, index) => normalizeStoredTable(table, index))
    .filter(Boolean);

  if (!hasExplicitTables && tables.length === 0) {
    tables = initialTableDefinitions
      .map((table, index) => normalizeStoredTable(table, index))
      .filter(Boolean);
  }

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
    activeDiaryFolderId,
    activeNoteId
  };
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
  return html || "<p></p>";
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
  return [
    { id: "", name: t("diary_uncategorized_folder"), isExpanded: state.systemDiaryFolderExpanded !== false },
    ...state.diaryFolders
  ].filter((folder) => folder.id || getDiaryNotesByFolder("").length > 0 || state.diaryFolders.length === 0);
}

function getDiaryNotesByFolder(folderId = "") {
  const normalizedFolderId = cleanText(folderId);
  return state.diaryNotes.filter((note) => cleanText(note.folderId) === normalizedFolderId);
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

function getDiaryNoteDateSummary(note) {
  const realSummary = formatDiaryRealDateSummary(note);
  const harptosSummary = formatDiaryHarptosDateSummary(note);
  return [realSummary, harptosSummary].filter(Boolean).join(" | ") || "Sin fechas";
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
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array"
    });
    const detectedTables = workbook.SheetNames.flatMap((sheetName, sheetIndex) =>
      extractTablesFromWorkbookSheet(workbook.Sheets[sheetName], sheetName, sheetIndex)
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

function extractTablesFromWorkbookSheet(sheet, sheetName, index = 0) {
  if (!sheet) {
    return [];
  }

  const rawGrid = XLSX.utils.sheet_to_json(sheet, {
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
      const cells = [];
      visited.add(key);

      while (queue.length > 0) {
        const [currentRow, currentColumn] = queue.shift();
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

function exportTableToExcel(tableId) {
  const table = state.tables.find((entry) => entry.id === cleanText(tableId));

  if (!table) {
    return;
  }

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
}

function getSafeExcelSheetName(name) {
  const safeName = cleanText(name).replace(/[\\/*?:\[\]]/g, " ").trim();
  return (safeName || "Tabla").slice(0, 31);
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


