import { columns, initialCombatants } from "../../data/combatTrackerData.js";
import { COMBAT_TRACKER_SORT_DEFAULT_VERSION } from "../../config/appConstants.js";
import {
  ENEMY_HP_MODE_FIXED,
  ENEMY_HP_MODE_VARIABLE,
  LEGACY_COMBAT_PLACEHOLDER_NAMES,
  combatTagOptions
} from "../../data/gameConstants.js";
import { formatStatsWithModifiers } from "../../shared/dndRules.js";
import { isPlainObject, toNumber } from "../../shared/numberUtils.js";
import { cleanText } from "../../shared/text.js";

const blankFilters = Object.fromEntries(columns.map((column) => [column.key, []]));

export function createCombatTrackerStateController({
  state,
  COMBAT_TRACKER_STORAGE_KEY,
  usesDesktopFileOnlyPersistence,
  scheduleDesktopCampaignDirtyStateSync,
  createStableId,
  getBattleTimerElapsedMs,
  mapTagToSide,
  mapSideToTag
}) {
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
    combatSearchQuery: cleanText(value.combatSearchQuery),
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
    combatSearchQuery: state.combatSearchQuery,
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
    combatSearchQuery: "",
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
    entryId: cleanText(combatant.entryId),
    entryKey: cleanText(combatant.entryKey),
    canonicalName: cleanText(combatant.canonicalName),
    localizedName: cleanText(combatant.localizedName),
    canonicalSource: cleanText(combatant.canonicalSource),
    source: cleanText(combatant.source),
    tokenUrl: cleanText(combatant.tokenUrl),
    ubicacion: cleanText(combatant.ubicacion),
    iniactiva: normalizeStoredNumber(combatant.iniactiva),
    nombre: cleanText(combatant.nombre),
    numPeana: normalizeStoredStandLabel(combatant.numPeana),
    pgMax,
    pgAct,
    pgTemp,
    hitDice: normalizeStoredNonNegativeNumber(combatant.hitDice),
    necrotic,
    ca: normalizeStoredNumber(combatant.ca),
    shieldEquipped: combatant.shieldEquipped === true,
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
    if (Array.isArray(filters[key])) {
      normalizedFilters[key] = filters[key].map((value) => cleanText(value)).filter(Boolean);
      continue;
    }

    const legacyValue = cleanText(filters[key]);
    normalizedFilters[key] = legacyValue ? [legacyValue] : [];
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

  return {
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
  };
}
