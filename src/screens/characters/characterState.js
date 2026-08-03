import { inferItemSizeLabel, parseSpellLevel } from "../../data/compendiumEntries.js";
import {
  characterAbilityKeys,
  characterCurrencyRows,
  characterSkillLevelProgression,
  characterStatBlocks,
  itemSizeThresholds
} from "../../data/gameConstants.js";
import { formatModifier } from "../../shared/dndRules.js";
import { isPlainObject, toNumber } from "../../shared/numberUtils.js";
import { cleanText } from "../../shared/text.js";

export function createCharacterStateController({
  state,
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
}) {
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
  const classEntries = normalizeStoredCharacterClassEntries(character.classEntries, character);
  const hasStoredMulticlassFlag = typeof character.isMulticlass === "boolean";
  const inferredMulticlass = classEntries.slice(1).some((entry) => hasMeaningfulCharacterClassEntry(entry));
  const isMulticlass = hasStoredMulticlassFlag ? character.isMulticlass === true : inferredMulticlass;
  const normalizedClassEntries = ensureCharacterClassEntryCount(classEntries, isMulticlass ? 2 : 1);
  const primaryClassEntry = normalizedClassEntries[0] ?? createDefaultCharacterClassEntry({ level: 1 });

  const maxHp = normalizeStoredNonNegativeNumber(character.maxHp);
  const hasCurrentHp = character.currentHp !== undefined && character.currentHp !== null;
  let currentHp = hasCurrentHp ? normalizeStoredNonNegativeNumber(character.currentHp) : maxHp;
  const level = getCharacterTotalLevelFromClassEntries(normalizedClassEntries, isMulticlass);
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
    isNpc: character.isNpc === true,
    className: primaryClassEntry.name,
    subclassName: primaryClassEntry.subclassName,
    isMulticlass,
    classEntries: normalizedClassEntries,
    level,
    experiencePoints: levelExperiencePoints,
    totalExperiencePoints: levelStartExperiencePoints + levelExperiencePoints,
    species: cleanText(character.species),
    background: cleanText(character.background),
    size: cleanText(character.size) || "Mediano",
    proficiencyBonus: getDefaultCharacterProficiencyBonus(level),
    proficiencyBonusOverride: character.proficiencyBonusOverride === ""
      || character.proficiencyBonusOverride === undefined
      || character.proficiencyBonusOverride === null
      ? ""
      : Math.max(0, Math.min(20, Math.floor(toNumber(normalizeStoredNumber(character.proficiencyBonusOverride)) || 0))),
    proficiencies: normalizeStoredCharacterProficiencies(character.proficiencies),
    tokenUrl: cleanText(character.tokenUrl),
    sheetPdfUrl: cleanText(character.sheetPdfUrl),
    sheetPdfName: cleanText(character.sheetPdfName),
    sheetPdfBytes: normalizeStoredNonNegativeNumber(character.sheetPdfBytes),
    sheetPdfUploadedAt: cleanText(character.sheetPdfUploadedAt),
    armorClass: Math.max(0, Math.floor(toNumber(normalizeStoredNumber(character.armorClass)) || 10)),
    maxHp,
    currentHp,
    tempHp: normalizeStoredNonNegativeNumber(character.tempHp),
    speed: cleanText(character.speed) || "30 ft",
    initiativeBonus: normalizeStoredNumber(character.initiativeBonus),
    trapPerception: Math.max(0, Math.floor(toNumber(normalizeStoredNumber(character.trapPerception)) || 0)),
    conditions: cleanText(character.conditions),
    stand: normalizeStoredStandLabel(character.stand),
    notes: cleanText(character.notes),
    skillProgress: normalizeStoredCharacterSkillProgress(
      character.skillProgress,
      resolvedSkillDefinitions,
      character.skillTracks
    ),
    spellsOpen: character.spellsOpen === true,
    spells: normalizeStoredCharacterSpells(character.spells),
    spellAttackModifier: normalizeStoredNumber(character.spellAttackModifier),
    spellSaveDc: normalizeStoredNumber(character.spellSaveDc),
    spellSlotLevelsVisible: normalizeStoredCharacterSpellSlotVisibleLevels(character.spellSlotLevelsVisible, character.spellSlots),
    spellSlots: normalizeStoredCharacterSpellSlots(character.spellSlots),
    spellbookAbilities: normalizeStoredCharacterSpellbookAbilities(character.spellbookAbilities),
    inventoryOpen: character.inventoryOpen !== false,
    inventory: normalizeStoredCharacterInventory(character.inventory),
    abilities: normalizeStoredCharacterAbilities(character.abilities)
  };
}

function createDefaultCharacterClassEntry(overrides = {}) {
  return normalizeStoredCharacterClassEntry({
    id: createStableId("character-class"),
    level: 1,
    ...overrides
  });
}

function normalizeStoredCharacterClassEntries(entries, legacyCharacter = {}) {
  const normalizedEntries = Array.isArray(entries)
    ? entries.map((entry) => normalizeStoredCharacterClassEntry(entry)).filter(Boolean)
    : [];

  if (normalizedEntries.length > 0) {
    return normalizedEntries;
  }

  return [createDefaultCharacterClassEntry({
    name: legacyCharacter.className,
    subclassName: legacyCharacter.subclassName,
    level: legacyCharacter.level ?? 1
  })];
}

function normalizeStoredCharacterClassEntry(entry) {
  if (!isPlainObject(entry)) {
    return null;
  }

  return {
    id: cleanText(entry.id) || createStableId("character-class"),
    name: cleanText(entry.name ?? entry.className),
    subclassName: cleanText(entry.subclassName),
    level: normalizeStoredCharacterClassLevel(entry.level)
  };
}

function normalizeStoredCharacterClassLevel(value) {
  const numericValue = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(value)) || 0));
  return Math.min(numericValue, 20);
}

function ensureCharacterClassEntryCount(entries, minimumCount = 1) {
  const normalizedEntries = Array.isArray(entries)
    ? entries.map((entry) => normalizeStoredCharacterClassEntry(entry)).filter(Boolean)
    : [];
  const requiredCount = Math.max(1, Math.floor(toNumber(minimumCount) || 1));

  while (normalizedEntries.length < requiredCount) {
    normalizedEntries.push(createDefaultCharacterClassEntry({
      level: normalizedEntries.length === 0 ? 1 : 0
    }));
  }

  return normalizedEntries;
}

function hasMeaningfulCharacterClassEntry(entry) {
  return cleanText(entry?.name).length > 0
    || cleanText(entry?.subclassName).length > 0
    || normalizeStoredCharacterClassLevel(entry?.level) > 0;
}

function getCharacterVisibleClassEntries(character) {
  const entries = ensureCharacterClassEntryCount(character?.classEntries, character?.isMulticlass ? 2 : 1);
  return character?.isMulticlass ? entries : entries.slice(0, 1);
}

function getCharacterTotalLevelFromClassEntries(classEntries, isMulticlass) {
  const visibleEntries = isMulticlass ? classEntries : classEntries.slice(0, 1);
  const summedLevel = visibleEntries.reduce((sum, entry) => sum + normalizeStoredCharacterClassLevel(entry?.level), 0);
  return normalizeStoredCharacterLevel(summedLevel || 1);
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
    name: name || "Nueva maestria",
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

  const name = cleanText(definition.name) || "Nueva maestria";
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

function normalizeStoredCharacterSpells(spells) {
  const normalizedRows = Array.isArray(spells)
    ? spells.map((row) => normalizeStoredCharacterSpellRow(row)).filter(Boolean)
    : [];

  return normalizedRows.length > 0 ? normalizedRows : [createBlankCharacterSpellRow()];
}

function normalizeStoredCharacterSpellRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const name = cleanText(row.name);
  const matchedSpell = findCompendiumEntryByReference(getCurrentCompendiumEntries("arcanum"), {
    entryKey: row.spellKey,
    entryId: row.spellId,
    name,
    canonicalName: row.canonicalName,
    localizedName: row.localizedName
  });

  return {
    id: cleanText(row.id) || createStableId("character-spell"),
    spellId: cleanText(row.spellId) || matchedSpell?.id || "",
    spellKey: cleanText(row.spellKey) || (matchedSpell ? getCompendiumEntryIdentityKey(matchedSpell) : ""),
    name,
    canonicalName: cleanText(row.canonicalName) || matchedSpell?.canonicalName || "",
    localizedName: cleanText(row.localizedName) || matchedSpell?.localizedName || "",
    level: normalizeCharacterSpellLevelLabel(matchedSpell?.levelShort || cleanText(row.level) || ""),
    prepared: row.prepared === true
  };
}

function normalizeCharacterSpellLevelLabel(value) {
  const normalizedValue = cleanText(value);
  const compactValue = normalizedValue.toLowerCase().replace(/\s+/g, "");
  const parsedLevel = normalizedValue ? parseSpellLevel(normalizedValue) : 99;

  if (
    compactValue === "n/a"
    || compactValue === "na"
    || compactValue === "0"
    || compactValue === "cantrip"
    || compactValue === "truco"
    || compactValue === "level0"
    || compactValue === "nivel0"
    || compactValue === "lvl0"
    || parsedLevel === 0
  ) {
    return "Truco";
  }

  return normalizedValue;
}

function getCharacterSpellLevelLabel(value) {
  const normalizedValue = normalizeCharacterSpellLevelLabel(value);
  return normalizedValue || "N/D";
}

function isCharacterSpellCantripLabel(value) {
  return normalizeCharacterSpellLevelLabel(value).toLowerCase() === "truco";
}

function formatCompactSpellLevelLabel(levelValue) {
  if (levelValue === 0) {
    return "TRUCO";
  }

  return levelValue === 99 ? "LVL ?" : `LVL ${levelValue}`;
}

function formatCharacterSignedFieldValue(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return formatModifier(toNumber(value));
}

function createBlankCharacterSpellRow(overrides = {}) {
  return normalizeStoredCharacterSpellRow({
    id: createStableId("character-spell"),
    prepared: false,
    level: "",
    name: "",
    spellId: "",
    ...overrides
  });
}

function normalizeStoredCharacterSpellbookAbilities(rows) {
  const normalizedRows = Array.isArray(rows)
    ? rows.map((row) => normalizeStoredCharacterSpellbookAbilityRow(row)).filter(Boolean)
    : [];

  return normalizedRows.length > 0 ? normalizedRows : [createBlankCharacterSpellbookAbilityRow()];
}

function normalizeStoredCharacterSpellbookAbilityRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const uses = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(row.uses)) || 0));

  return {
    id: cleanText(row.id) || createStableId("character-spellbook-ability"),
    name: cleanText(row.name),
    description: cleanText(row.description),
    uses,
    spent: normalizeStoredCharacterSpellbookAbilitySpent(row.spent, uses)
  };
}

function normalizeStoredCharacterSpellbookAbilitySpent(spent, uses) {
  const normalizedUses = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(uses)) || 0));
  const source = Array.isArray(spent) ? spent : [];
  return Array.from({ length: normalizedUses }, (_, index) => source[index] === true);
}

function createBlankCharacterSpellbookAbilityRow(overrides = {}) {
  return normalizeStoredCharacterSpellbookAbilityRow({
    id: createStableId("character-spellbook-ability"),
    name: "",
    description: "",
    uses: 0,
    spent: [],
    ...overrides
  });
}

function getMeaningfulCharacterSpellbookAbilityRows(rows) {
  return normalizeStoredCharacterSpellbookAbilities(rows)
    .filter((row) => cleanText(row.name) || row.uses > 0);
}

function clearCharacterSpellbookAbilityUsesSpent(rows) {
  return normalizeStoredCharacterSpellbookAbilities(rows).map((row) => normalizeStoredCharacterSpellbookAbilityRow({
    ...row,
    spent: Array.from({ length: row.uses }, () => false)
  }));
}

function getDefaultCharacterSpellSlots() {
  return [normalizeStoredCharacterSpellSlotRow({ level: 1, slots: 0 })].filter(Boolean);
}

function normalizeStoredCharacterSpellSlots(spellSlots) {
  const normalizedRows = Array.isArray(spellSlots)
    ? spellSlots.map((row) => normalizeStoredCharacterSpellSlotRow(row)).filter(Boolean)
    : [];

  if (normalizedRows.length === 0) {
    return getDefaultCharacterSpellSlots();
  }

  const byLevel = new Map();
  normalizedRows.forEach((row) => {
    if (!byLevel.has(row.level)) {
      byLevel.set(row.level, row);
    }
  });

  return [...byLevel.values()].sort((left, right) => left.level - right.level);
}

function normalizeStoredCharacterSpellSlotRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const level = Math.max(1, Math.min(9, Math.floor(toNumber(row.level) || 1)));
  const slots = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(row.slots)) || 0));

  return {
    level,
    slots,
    spent: normalizeStoredCharacterSpellSlotSpent(row.spent, slots)
  };
}

function normalizeStoredCharacterSpellSlotSpent(spent, slots) {
  const normalizedSlots = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(slots)) || 0));
  const source = Array.isArray(spent) ? spent : [];
  return Array.from({ length: normalizedSlots }, (_, index) => source[index] === true);
}

function normalizeStoredCharacterSpellSlotVisibleLevels(value, spellSlots = []) {
  const highestStoredLevel = normalizeStoredCharacterSpellSlots(spellSlots).reduce((max, entry) => Math.max(max, entry.level), 1);
  const numericValue = Math.max(1, Math.floor(toNumber(value) || 1));
  return Math.min(9, Math.max(numericValue, highestStoredLevel));
}

function ensureCharacterSpellSlotLevels(spellSlots, visibleLevels = 1) {
  const normalizedSpellSlots = normalizeStoredCharacterSpellSlots(spellSlots);
  const requiredLevels = Math.max(1, Math.min(9, Math.floor(toNumber(visibleLevels) || 1)));
  const byLevel = new Map(normalizedSpellSlots.map((entry) => [entry.level, entry]));

  for (let level = 1; level <= requiredLevels; level += 1) {
    if (!byLevel.has(level)) {
      byLevel.set(level, normalizeStoredCharacterSpellSlotRow({ level, slots: 0 }));
    }
  }

  return [...byLevel.values()].sort((left, right) => left.level - right.level);
}

function clearCharacterSpellSlotsSpent(spellSlots) {
  return normalizeStoredCharacterSpellSlots(spellSlots).map((entry) => normalizeStoredCharacterSpellSlotRow({
    ...entry,
    spent: Array.from({ length: entry.slots }, () => false)
  }));
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

  return [...currencyRows, ...(nonCurrencyRows.length > 0 ? nonCurrencyRows : [createBlankCharacterInventoryRow()])];
}

function normalizeStoredCharacterInventoryRow(row) {
  if (!isPlainObject(row)) {
    return null;
  }

  const name = cleanText(row.name);
  const matchedItem = findCompendiumEntryByReference(getCurrentCompendiumEntries("items"), {
    entryKey: row.itemKey,
    entryId: row.itemId,
    name,
    canonicalName: row.canonicalName,
    localizedName: row.localizedName
  });
  const quantity = Math.max(0, Math.floor(toNumber(normalizeStoredNonNegativeNumber(row.quantity)) || 0));
  const size = isCharacterCurrencyRow(name)
    ? getCurrencyInventorySizeLabel(quantity)
    : normalizeItemSizeLabel(row.size) || matchedItem?.sizeLabel || inferItemSizeLabel(name);

  return {
    id: cleanText(row.id) || createStableId("character-item"),
    itemId: isCharacterCurrencyRow(name) ? "" : cleanText(row.itemId) || matchedItem?.id || "",
    itemKey: isCharacterCurrencyRow(name) ? "" : cleanText(row.itemKey) || (matchedItem ? getCompendiumEntryIdentityKey(matchedItem) : ""),
    name,
    canonicalName: isCharacterCurrencyRow(name) ? "" : cleanText(row.canonicalName) || matchedItem?.canonicalName || "",
    localizedName: isCharacterCurrencyRow(name) ? "" : cleanText(row.localizedName) || matchedItem?.localizedName || "",
    size,
    quantity
  };
}

function createBlankCharacterInventoryRow(overrides = {}) {
  return normalizeStoredCharacterInventoryRow({
    id: createStableId("character-item"),
    name: "",
    size: "XS",
    quantity: 1,
    itemId: "",
    ...overrides
  });
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

  return {
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
  };
}
