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
  const requestedClassKey = getCharacterClassKey(parsedInput.name)
    || clean(entry.classKey)
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

export function getCharacterSpellcastingLimitsForClassEntries(catalog, classEntries, isMulticlass = false, character = {}) {
  return (Array.isArray(classEntries) ? classEntries : [])
    .filter((entry, index) => index === 0 || isMulticlass)
    .map((entry) => {
      const classEntity = findCharacterClassRecord(catalog, entry);
      const subclass = classEntity ? findCharacterSubclassRecord(classEntity, entry) : null;
      const level = Math.max(0, Math.min(20, Math.floor(Number(entry?.level) || 0)));

      if (!classEntity || level <= 0) {
        return null;
      }

      const limits = extractSpellcastingLimits(classEntity, level);
      const subclassLimits = extractSpellcastingLimits(subclass, level);
      const merged = {
        cantripsKnown: limits.cantripsKnown ?? subclassLimits.cantripsKnown ?? null,
        spellsKnown: limits.spellsKnown ?? subclassLimits.spellsKnown ?? null,
        preparedSpells: limits.preparedSpells ?? subclassLimits.preparedSpells ?? null
      };
      if (merged.spellsKnown === null && merged.preparedSpells === null) {
        merged.preparedSpells = inferPreparedSpellCount(classEntity, level, character.abilities);
      }

      return Object.values(merged).some((value) => value !== null)
        ? { classEntity, subclass, level, ...merged }
        : null;
    })
    .filter(Boolean);
}

export function getCharacterActiveClassAbilities(catalog, classEntries, isMulticlass = false, character = {}) {
  const proficiencyBonus = Math.max(0, Math.floor(Number(character.proficiencyBonus) || 0));
  const abilityScores = character.abilities && typeof character.abilities === "object" ? character.abilities : {};

  return (Array.isArray(classEntries) ? classEntries : [])
    .filter((entry, index) => index === 0 || isMulticlass)
    .flatMap((entry) => {
      const classEntity = findCharacterClassRecord(catalog, entry);
      const subclass = classEntity ? findCharacterSubclassRecord(classEntity, entry) : null;
      const level = Math.max(0, Math.min(20, Math.floor(Number(entry?.level) || 0)));

      if (!classEntity || level <= 0) {
        return [];
      }

      const unlockedFeatures = [
        ...collectUnlockedActiveFeatures(classEntity?.levels, "class", classEntity, level),
        ...collectUnlockedActiveFeatures(subclass?.levels, "subclass", classEntity, level)
      ];
      const seenFeatureNames = new Set();

      return unlockedFeatures.filter(({ feature }) => {
        const key = normalizeActiveFeatureName(feature?.name);
        if (!key || seenFeatureNames.has(key)) return false;
        seenFeatureNames.add(key);
        return true;
      }).map(({ feature, kind }) => {
        const localized = getLocalizedCharacterClassFeature(feature, catalog);
        const description = formatClassFeatureEntriesAsText(localized.entries);
        const uses = inferClassFeatureUses(feature, classEntity, level, description, abilityScores, proficiencyBonus);
        return {
          id: `class-ability-${feature.id}`,
          featureId: feature.id,
          classId: classEntity.id,
          classEntryId: clean(entry?.id),
          kind,
          level: Number(feature.level) || level,
          name: localized.name || feature.name || "",
          description,
          uses,
          source: feature.source || classEntity.source || ""
        };
      });
    });
}

export function formatClassFeatureEntriesAsText(entries) {
  const lines = [];

  const visit = (entry) => {
    if (entry === null || entry === undefined || entry === "") return;
    if (typeof entry === "string" || typeof entry === "number") {
      const value = stripTags(entry).replace(/\s+/g, " ").trim();
      if (value) lines.push(value);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (typeof entry !== "object") return;
    if (entry.name) lines.push(`${stripTags(entry.name)}:`);
    if (entry.type === "table") {
      const labels = Array.isArray(entry.colLabels) ? entry.colLabels.map(stripTags) : [];
      for (const row of Array.isArray(entry.rows) ? entry.rows : []) {
        if (!Array.isArray(row)) continue;
        lines.push(row.map((cell, index) => `${labels[index] ? `${labels[index]}: ` : ""}${formatTableValue(cell)}`).join("; "));
      }
      return;
    }
    if (entry.type === "list") {
      for (const item of Array.isArray(entry.items) ? entry.items : []) {
        const before = lines.length;
        visit(item);
        if (lines.length > before) lines[before] = `• ${lines[before]}`;
      }
      return;
    }
    visit(entry.entries ?? entry.entry ?? entry.items);
  };

  visit(entries);
  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
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

function extractSpellcastingLimits(entity, level) {
  const result = { cantripsKnown: null, spellsKnown: null, preparedSpells: null };

  for (const group of Array.isArray(entity?.classTableGroups) ? entity.classTableGroups : []) {
    const labels = Array.isArray(group.colLabels) ? group.colLabels : [];
    const rows = Array.isArray(group.rows) ? group.rows : group.rowsSpellProgression;
    const row = Array.isArray(rows?.[level - 1]) ? rows[level - 1] : null;
    if (!row) continue;

    labels.forEach((label, index) => {
      const normalized = normalizeKey(stripTags(label));
      const value = Number(row[index]);
      if (!Number.isFinite(value) || value < 0) return;
      if (/^cantrips?(?:-known)?$/.test(normalized)) result.cantripsKnown = Math.floor(value);
      if (/^spells?-known$/.test(normalized)) result.spellsKnown = Math.floor(value);
      if (/^prepared-spells?$/.test(normalized)) result.preparedSpells = Math.floor(value);
    });
  }

  return result;
}

function inferPreparedSpellCount(classEntity, level, abilityScores = {}) {
  const className = normalizeKey(classEntity?.name);
  if (!["artificer", "cleric", "druid", "paladin", "wizard"].includes(className)) return null;

  const progression = getCasterProgression(classEntity, null);
  if (progression === "1/2" && level < 2) return null;
  const abilityKey = clean(classEntity?.spellcastingAbility).toLowerCase();
  const score = Number(abilityScores?.[abilityKey]);
  const modifier = Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
  const levelContribution = progression === "1/2"
    ? Math.floor(level / 2)
    : progression === "artificer"
      ? Math.ceil(level / 2)
      : level;
  return Math.max(1, levelContribution + modifier);
}

function collectUnlockedActiveFeatures(levels, kind, classEntity, currentLevel) {
  return (Array.isArray(levels) ? levels : []).flatMap((levelEntry) => (
    Number(levelEntry?.level) <= currentLevel
      ? (Array.isArray(levelEntry.features) ? levelEntry.features : [])
        .filter((feature) => isActiveClassFeature(feature, classEntity))
        .map((feature) => ({ feature, kind }))
      : []
  ));
}

function isActiveClassFeature(feature, classEntity) {
  const name = normalizeKey(feature?.name);
  if (!name || feature?.optional === true) return false;
  if (/spellcasting|prepared-spells|cantrips|ability-score-improvement|subclass|expertise|proficienc|mastery|maestria/.test(name)) return false;

  const text = formatClassFeatureEntriesAsText(feature?.entries);
  const resourceUses = inferTableResourceUses(feature, classEntity, Number(feature?.level) || 1);
  return resourceUses > 0 || /\b(action|bonus action|reaction|accion|reaccion)\b/i.test(text)
    || /\b(can use|puedes usar|number of times|numero de veces|once you use|cuando usas)\b/i.test(text)
    || /\b(expended uses?|usos? gastados?)\b/i.test(text);
}

function inferClassFeatureUses(feature, classEntity, level, description, abilityScores, proficiencyBonus) {
  const tableUses = inferTableResourceUses(feature, classEntity, level);
  if (tableUses > 0) return tableUses;

  const text = `${feature?.name || ""} ${description || formatClassFeatureEntriesAsText(feature?.entries)}`;
  const abilityMatch = text.match(/(?:equal to|igual a) (?:your|tu|su) (?:(?:modifier|modificador) (?:de |of )?)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Fuerza|Destreza|Constituci[oó]n|Inteligencia|Sabidur[ií]a|Carisma)(?: modifier| modificador)?/i);
  if (abilityMatch) {
    const abilityKey = getAbilityKey(abilityMatch[1]);
    const score = Number(abilityScores?.[abilityKey]);
    if (Number.isFinite(score)) return Math.max(1, Math.floor((score - 10) / 2));
  }

  if (/(?:equal to|igual a) (?:your|tu) proficiency bonus/i.test(text) && proficiencyBonus > 0) {
    return proficiencyBonus;
  }

  const numericMatch = text.match(/(?:can use (?:this feature|it)|puedes usar (?:esta (?:caracteristica|habilidad)|esto)) (?:a )?(?:number of times equal to[^.]+|once|twice|thrice|one time|two times|three times|una vez|dos veces|tres veces|\d+ times?)/i);
  if (numericMatch) return parseWrittenUseCount(numericMatch[0]);

  if (/(?:once you (?:use|take)|can't do so again|must finish a short or long rest|una vez que|no puedes volver a hacerlo|debes terminar un descanso)/i.test(text)) {
    return 1;
  }

  return 0;
}

function inferTableResourceUses(feature, classEntity, level) {
  const targetNames = [feature?.consumes?.name, feature?.name]
    .filter(Boolean)
    .map((name) => normalizeResourceName(name));

  for (const group of Array.isArray(classEntity?.classTableGroups) ? classEntity.classTableGroups : []) {
    const labels = Array.isArray(group.colLabels) ? group.colLabels : [];
    const rows = Array.isArray(group.rows) ? group.rows : null;
    const row = Array.isArray(rows?.[level - 1]) ? rows[level - 1] : null;
    if (!row) continue;

    for (let index = 0; index < labels.length; index += 1) {
      const label = normalizeResourceName(stripTags(labels[index]));
      if (!targetNames.some((target) => target && (target === label || target.includes(label) || label.includes(target)))) continue;
      const value = Number(row[index]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
  }

  return 0;
}

function normalizeResourceName(value) {
  return normalizeKey(value).replace(/(?:-uses?|s)$/g, "");
}

function normalizeActiveFeatureName(value) {
  return normalizeKey(value)
    .replace(/-improvement$/, "")
    .replace(/-d\d+$/, "")
    .replace(/-\d+$/, "");
}

function getAbilityKey(value) {
  const normalized = normalizeKey(value);
  if (/^(strength|fuerza)$/.test(normalized)) return "str";
  if (/^(dexterity|destreza)$/.test(normalized)) return "dex";
  if (/^(constitution|constitucion)$/.test(normalized)) return "con";
  if (/^(intelligence|inteligencia)$/.test(normalized)) return "int";
  if (/^(wisdom|sabiduria)$/.test(normalized)) return "wis";
  return "cha";
}

function parseWrittenUseCount(value) {
  const normalized = normalizeKey(value);
  if (/\b(twice|two|dos)\b/.test(normalized.replaceAll("-", " "))) return 2;
  if (/\b(thrice|three|tres)\b/.test(normalized.replaceAll("-", " "))) return 3;
  const numeric = Number(String(value).match(/\d+/)?.[0]);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1;
}

function formatTableValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return stripTags(value);
  if (Array.isArray(value)) return value.map(formatTableValue).filter(Boolean).join(", ");
  if (typeof value === "object" && Array.isArray(value.toRoll)) {
    return value.toRoll.map((die) => `${die.number || 1}d${die.faces || "?"}`).join(" + ");
  }
  return stripTags(value.exact ?? value.value ?? "");
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
