import { getCharacterClassKey, translateCharacterClassName } from "./characterClasses.js";
import { isCharacterSubclassNameMatch, translateCharacterSubclassName } from "./characterSubclassTranslations.js";
import generatedClassCatalog from "./generated/classCatalog.generated.js";
import generatedSpanishClassTranslations from "./generated/classTranslationsEs.generated.js";

const newestClassSources = Object.freeze(["EFA", "XPHB", "TCE", "PHB"]);

export async function loadCharacterClassCatalog(language = "en", assetBaseUrl = "") {
  return getBundledCharacterClassCatalog(language);
}

export function getBundledCharacterClassCatalog(language = "en") {
  const normalizedLanguage = language === "es" ? "es" : "en";
  const catalog = generatedClassCatalog;
  const translationOverlay = normalizedLanguage === "es" ? generatedSpanishClassTranslations : null;

  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.classes)) {
    throw new Error("Class catalog is invalid.");
  }

  return {
    version: catalog.sourceVersion,
    sourceVersion: catalog.sourceVersion,
    language: normalizedLanguage,
    classes: catalog.classes,
    translations: translationOverlay?.translations ?? {},
    translatedFeatureCount: Number(translationOverlay?.translatedFeatureCount) || 0,
    featureCount: Number(translationOverlay?.totalFeatureCount) || countFeatures(catalog.classes),
    subclassCount: catalog.classes.reduce(
      (total, classEntity) => total + (Array.isArray(classEntity.subclasses) ? classEntity.subclasses.length : 0),
      0
    )
  };
}

function countFeatures(classes) {
  return classes.reduce((total, classEntity) => {
    const classFeatures = (classEntity.levels ?? []).reduce(
      (sum, level) => sum + (Array.isArray(level.features) ? level.features.length : 0),
      0
    );
    const subclassFeatures = (classEntity.subclasses ?? []).reduce(
      (subclassTotal, subclass) => subclassTotal + (subclass.levels ?? []).reduce(
        (sum, level) => sum + (Array.isArray(level.features) ? level.features.length : 0),
        0
      ),
      0
    );
    return total + classFeatures + subclassFeatures;
  }, 0);
}

export function findCharacterClassRecord(catalog, entryOrName, explicitSource = "") {
  const classes = Array.isArray(catalog?.classes) ? catalog.classes : [];
  const entry = typeof entryOrName === "object" && entryOrName
    ? entryOrName
    : { name: entryOrName, source: explicitSource };
  const parsedInput = parseSourceSuffix(entry.name);
  const requestedSource = clean(parsedInput.source || explicitSource || entry.source).toUpperCase();
  const requestedClassKey = clean(entry.classKey)
    || getCharacterClassKey(parsedInput.name)
    || normalizeKey(parsedInput.name);
  const candidates = classes.filter((classEntity) => (
    normalizeKey(classEntity.key || classEntity.name) === requestedClassKey
    || normalizeKey(classEntity.name) === normalizeKey(parsedInput.name)
  ));

  if (requestedSource) {
    const sourceMatch = candidates.find((classEntity) => clean(classEntity.source).toUpperCase() === requestedSource);

    if (sourceMatch) {
      return sourceMatch;
    }
  }

  return [...candidates].sort((left, right) => (
    getEditionPriority(left) - getEditionPriority(right)
    || getSourcePriority(left.source, newestClassSources) - getSourcePriority(right.source, newestClassSources)
    || clean(right.source).localeCompare(clean(left.source), "en", { sensitivity: "base" })
  ))[0] ?? null;
}

export function findCharacterSubclassRecord(classEntity, entryOrName, explicitSource = "") {
  const subclasses = Array.isArray(classEntity?.subclasses) ? classEntity.subclasses : [];
  const entry = typeof entryOrName === "object" && entryOrName
    ? entryOrName
    : { subclassName: entryOrName, subclassSource: explicitSource };
  const parsedInput = parseSourceSuffix(entry.subclassName);
  const requestedSource = clean(parsedInput.source || explicitSource || entry.subclassSource).toUpperCase();
  const requestedId = clean(entry.subclassId);
  const normalizedName = normalizeKey(parsedInput.name);

  if (requestedId) {
    const idMatch = subclasses.find((subclass) => subclass.id === requestedId);

    if (
      idMatch
      && (!normalizedName || isCharacterSubclassNameMatch(idMatch, parsedInput.name))
      && (!requestedSource || clean(idMatch.source).toUpperCase() === requestedSource)
    ) {
      return idMatch;
    }
  }

  const candidates = subclasses.filter((subclass) => (
    isCharacterSubclassNameMatch(subclass, parsedInput.name)
  ));

  if (requestedSource) {
    const sourceMatch = candidates.find((subclass) => clean(subclass.source).toUpperCase() === requestedSource);

    if (sourceMatch) {
      return sourceMatch;
    }
  }

  return [...candidates].sort((left, right) => (
    getEditionPriority(left) - getEditionPriority(right)
    || getSourcePriority(left.source, newestClassSources) - getSourcePriority(right.source, newestClassSources)
    || clean(right.source).localeCompare(clean(left.source), "en", { sensitivity: "base" })
    || clean(left.name).localeCompare(clean(right.name), "en", { sensitivity: "base" })
  ))[0] ?? null;
}

export function getCharacterClassInputOptions(catalog, language = "es") {
  const classes = Array.isArray(catalog?.classes) ? catalog.classes : [];
  const groups = new Map();

  for (const classEntity of classes) {
    const key = normalizeKey(classEntity.key || classEntity.name);
    const entries = groups.get(key) ?? [];
    entries.push(classEntity);
    groups.set(key, entries);
  }

  const options = [];

  for (const entries of groups.values()) {
    const localizedName = translateCharacterClassName(entries[0].name, language);

    for (const entry of entries) {
      options.push({
        id: entry.id,
        source: entry.source || "",
        value: `${localizedName} (${entry.source})`,
        label: `${localizedName} (${entry.source})`
      });
    }
  }

  return options.sort((left, right) => left.value.localeCompare(right.value, language, { sensitivity: "base" }));
}

export function getCharacterSubclassInputOptions(classEntity, language = "es") {
  const subclasses = Array.isArray(classEntity?.subclasses) ? classEntity.subclasses : [];
  return subclasses
    .map((subclass) => ({
      id: subclass.id,
      source: subclass.source || "",
      value: `${translateCharacterSubclassName(subclass.shortName || subclass.name, language)}${subclass.source ? ` (${subclass.source})` : ""}`,
      label: `${translateCharacterSubclassName(subclass.shortName || subclass.name, language)}${subclass.source ? ` (${subclass.source})` : ""}`
    }))
    .sort((left, right) => left.value.localeCompare(right.value, language, { sensitivity: "base" }));
}

export function getLocalizedCharacterClassFeature(feature, catalog) {
  const translation = catalog?.language === "es" ? catalog?.translations?.[feature?.id] : null;
  return translation?.entries
    ? {
      ...feature,
      name: translation.name || feature.name,
      entries: translation.entries,
      translationAvailable: true
    }
    : { ...feature, translationAvailable: catalog?.language !== "es" };
}

export function parseCharacterClassInput(value) {
  return parseSourceSuffix(value);
}

export function getCharacterClassDisplayValue(classEntity, language = "es", fallback = "") {
  if (!classEntity) {
    return clean(fallback);
  }

  const name = translateCharacterClassName(classEntity.name, language);
  return `${name}${classEntity.source ? ` (${classEntity.source})` : ""}`;
}

export function getCharacterSubclassDisplayValue(subclass, language = "es", fallback = "") {
  if (!subclass) {
    return clean(fallback);
  }

  const name = translateCharacterSubclassName(subclass.shortName || subclass.name, language);
  return `${name}${subclass.source ? ` (${subclass.source})` : ""}`;
}

export function getCharacterSpellSlotsForClassEntries(catalog, classEntries, isMulticlass = false) {
  const entries = (Array.isArray(classEntries) ? classEntries : [])
    .filter((entry, index) => index === 0 || isMulticlass)
    .map((entry) => {
      const classEntity = findCharacterClassRecord(catalog, entry);
      const subclass = classEntity ? findCharacterSubclassRecord(classEntity, entry) : null;
      return {
        classEntity,
        subclass,
        level: Math.max(0, Math.min(20, Math.floor(Number(entry?.level) || 0)))
      };
    })
    .filter((entry) => entry.classEntity && entry.level > 0);

  if (entries.length === 0) {
    return [];
  }

  if (entries.length === 1) {
    return getCasterProgression(entries[0].classEntity, entries[0].subclass) === "pact"
      ? extractPactSpellSlotRow(entries[0].classEntity, entries[0].level)
      : extractSpellSlotRow(entries[0].classEntity, entries[0].level);
  }

  const standardEntries = entries.filter(({ classEntity, subclass }) => (
    getCasterProgression(classEntity, subclass) !== "pact"
  ));
  const pactEntries = entries.filter(({ classEntity, subclass }) => (
    getCasterProgression(classEntity, subclass) === "pact"
  ));
  const effectiveCasterLevel = standardEntries.reduce((total, { classEntity, subclass, level }) => (
    total + getEffectiveCasterLevel(level, getCasterProgression(classEntity, subclass))
  ), 0);
  const fullCaster = findCharacterClassRecord(catalog, { name: "Wizard" });
  const combined = effectiveCasterLevel > 0 && fullCaster
    ? extractSpellSlotRow(fullCaster, Math.min(20, effectiveCasterLevel))
    : [];
  const byLevel = new Map(combined.map((entry) => [entry.level, entry.slots]));

  for (const { classEntity, level } of pactEntries) {
    for (const entry of extractPactSpellSlotRow(classEntity, level)) {
      byLevel.set(entry.level, (byLevel.get(entry.level) || 0) + entry.slots);
    }
  }

  return [...byLevel.entries()]
    .map(([level, slots]) => ({ level, slots }))
    .filter((entry) => entry.slots > 0)
    .sort((left, right) => left.level - right.level);
}

function extractSpellSlotRow(classEntity, level) {
  for (const group of Array.isArray(classEntity?.classTableGroups) ? classEntity.classTableGroups : []) {
    const labels = Array.isArray(group.colLabels) ? group.colLabels : [];
    const rows = Array.isArray(group.rowsSpellProgression) ? group.rowsSpellProgression : null;

    if (!rows || !Array.isArray(rows[level - 1])) {
      continue;
    }

    const slots = labels.map((label, index) => ({
      level: parseSpellLevelLabel(label),
      slots: Math.max(0, Math.floor(Number(rows[level - 1][index]) || 0))
    })).filter((entry) => entry.level > 0 && entry.slots > 0);

    if (slots.length > 0) {
      return slots;
    }
  }

  return [];
}

function extractPactSpellSlotRow(classEntity, level) {
  for (const group of Array.isArray(classEntity?.classTableGroups) ? classEntity.classTableGroups : []) {
    const labels = Array.isArray(group.colLabels) ? group.colLabels : [];
    const rows = Array.isArray(group.rows) ? group.rows : null;
    const slotCountIndex = labels.findIndex((label) => /spell slots?/i.test(stripTags(label)));
    const slotLevelIndex = labels.findIndex((label) => /slot level/i.test(stripTags(label)));

    if (!rows || slotCountIndex < 0 || slotLevelIndex < 0 || !Array.isArray(rows[level - 1])) {
      continue;
    }

    const slots = Math.max(0, Math.floor(Number(rows[level - 1][slotCountIndex]) || 0));
    const slotLevel = Math.max(0, Math.min(9, Math.floor(Number(String(rows[level - 1][slotLevelIndex]).match(/\d+/)?.[0]) || 0)));
    return slots > 0 && slotLevel > 0 ? [{ level: slotLevel, slots }] : [];
  }

  return [];
}

function getCasterProgression(classEntity, subclass) {
  const progression = clean(subclass?.casterProgression || classEntity?.casterProgression).toLowerCase();

  if (progression) {
    return progression;
  }

  const subclassName = normalizeKey(subclass?.shortName || subclass?.name);
  return ["eldritch-knight", "arcane-trickster", "mystic-arts"].includes(subclassName) ? "1/3" : "";
}

function getEffectiveCasterLevel(level, progression) {
  if (progression === "full") return level;
  if (progression === "artificer") return Math.ceil(level / 2);
  if (progression === "1/2") return Math.floor(level / 2);
  if (progression === "1/3") return Math.floor(level / 3);
  return 0;
}

function parseSpellLevelLabel(value) {
  const label = String(value ?? "");
  const filterLevel = label.match(/(?:^|[|;])level=(\d)(?:[|;}]|$)/i)?.[1];
  const ordinal = stripTags(label).match(/\b([1-9])(?:st|nd|rd|th)\b/i)?.[1];
  return Math.max(0, Math.min(9, Number(filterLevel || ordinal) || 0));
}

function stripTags(value) {
  return String(value ?? "")
    .replace(/\{@[a-zA-Z0-9]+\s+([^{}]*)\}/g, (_match, body) => String(body).split("|")[0] || "")
    .trim();
}

function parseSourceSuffix(value) {
  const normalizedValue = clean(value);
  const match = normalizedValue.match(/^(.*?)\s*\(([A-Za-z0-9:+-]+)\)\s*$/);
  return match
    ? { name: clean(match[1]), source: clean(match[2]).toUpperCase() }
    : { name: normalizedValue, source: "" };
}

function getSourcePriority(source, order) {
  const index = order.indexOf(clean(source).toUpperCase());
  return index === -1 ? order.length + 1 : index;
}

function getEditionPriority(entity) {
  return clean(entity?.edition).toLowerCase() === "one" ? 0 : 1;
}

function normalizeKey(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(value) {
  return String(value ?? "").trim();
}
