import {
  DESKTOP_ASSET_BASE_URL
} from "../config/appConstants.js";
import { SOURCE_NAMES } from "./bestiarySources.js";
import { itemSizeThresholds } from "./gameConstants.js";
import {
  extractCrBaseLabel,
  parseCrValue,
  parseItemWeight
} from "../shared/dndRules.js";
import { isPlainObject, toNumber } from "../shared/numberUtils.js";
import {
  cleanText,
  parseLeadingNumber,
  shortenLabel,
  slugify,
  splitList,
  uniqueSortedStrings
} from "../shared/text.js";

export function normalizeBestiaryEntry(row, index, imageMap = {}, options = {}) {
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
    imageUrl: resolveBestiaryImageAsset(name, source, imageMap, "imageUrl", options),
    tokenUrl: resolveBestiaryImageAsset(name, source, imageMap, "tokenUrl", options),
    crValue: parseCrValue(cr),
    crBaseValue: parseCrValue(crBaseLabel),
    acValue: parseLeadingNumber(ac),
    hpValue: parseLeadingNumber(hp),
    environmentShort: environmentTokens.slice(0, 2).join(", "),
    searchText
  };
}

export function normalizeItemEntry(row, index, imageMap = {}) {
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

export function normalizeSpellEntry(row, index) {
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

export function buildBestiaryCompositeKey(name, source) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);

  if (!normalizedName && !normalizedSource) {
    return "";
  }

  return `bestiary-${normalizedName || "unknown"}--${normalizedSource || "unknown"}`;
}

export function buildItemCompositeKey(name, source) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);

  if (!normalizedName && !normalizedSource) {
    return "";
  }

  return `item-${normalizedName || "unknown"}--${normalizedSource || "unknown"}`;
}

export function buildArcanumCompositeKey(name, source, level) {
  const normalizedName = slugify(name);
  const normalizedSource = slugify(source);
  const normalizedLevel = slugify(level);

  if (!normalizedName && !normalizedSource && !normalizedLevel) {
    return "";
  }

  return `arcanum-${normalizedName || "unknown"}--${normalizedSource || "unknown"}--${normalizedLevel || "unknown"}`;
}

export function parseSpellLevel(level) {
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

export function formatSpellLevel(level) {
  const normalizedLevel = cleanText(level);

  if (!normalizedLevel) {
    return "Nivel no indicado";
  }

  if (normalizedLevel.toLowerCase().includes("cantrip")) {
    return "Cantrip";
  }

  return normalizedLevel;
}

export function formatSpellLevelShort(level) {
  const value = parseSpellLevel(level);

  if (value === 0) {
    return "Cantrip";
  }

  if (value === 99) {
    return "N/D";
  }

  return `${value}`;
}

export function getSpellCastingSpeed(castingTime) {
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

export function compareSpellCastingSpeed(left, right) {
  const order = {
    Action: 1,
    Bonus: 2,
    Reaction: 3
  };

  return (order[left] ?? 99) - (order[right] ?? 99)
    || left.localeCompare(right, "es", { sensitivity: "base" });
}

export function getArcanumParentheticalBase(value) {
  return cleanText(value)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasConcentrationDuration(duration) {
  return slugify(duration).split("-").includes("concentration")
    || slugify(duration).split("-").includes("concentracion");
}

export function resolveItemImageAsset(name, source, imageMap) {
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

export function resolveRuntimeAssetUrl(assetUrl) {
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

export function findImageMapValue(imageMap, key) {
  const entry = imageMap?.[key];

  if (typeof entry === "string") {
    return resolveRuntimeAssetUrl(entry);
  }

  if (isPlainObject(entry) && typeof entry.imageUrl === "string") {
    return resolveRuntimeAssetUrl(entry.imageUrl);
  }

  return "";
}

export function formatItemRarity(rarity) {
  const normalized = cleanText(rarity);

  if (!normalized) {
    return "Sin rareza";
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function getItemRarityRank(rarity) {
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

export function getItemRarityGlyph(rarity) {
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

export function getItemRarityClass(rarity) {
  const normalized = slugify(rarity);

  if (!normalized) {
    return "item-row__rarity-pill--unknown";
  }

  return `item-row__rarity-pill--${normalized}`;
}

export function parseItemValue(value) {
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

export function getSourceFullName(source) {
  const normalizedSource = cleanText(source);
  return SOURCE_NAMES[normalizedSource] ?? normalizedSource;
}

export function getBestiarySourceFullName(source) {
  return getSourceFullName(source);
}

export function resolveBestiaryImageAsset(name, source, imageMap, assetKey, options = {}) {
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
      return shouldUseBestiaryAssetInCurrentRuntime(resolvedValue, options) ? resolvedValue : "";
    }

    if (isPlainObject(imageValue) && typeof imageValue[assetKey] === "string" && imageValue[assetKey].trim()) {
      const resolvedValue = resolveRuntimeAssetUrl(imageValue[assetKey].trim());
      return shouldUseBestiaryAssetInCurrentRuntime(resolvedValue, options) ? resolvedValue : "";
    }
  }

  return "";
}

export function shouldUseBestiaryAssetInCurrentRuntime(assetUrl, options = {}) {
  const normalizedAssetUrl = cleanText(assetUrl).trim();

  if (!normalizedAssetUrl) {
    return false;
  }

  if (!options.isPackagedDesktopApp) {
    return true;
  }

  if (/^file:/i.test(normalizedAssetUrl)) {
    return true;
  }

  return !/^\.?\/?images\/bestiary\//i.test(normalizedAssetUrl);
}

export function getBestiaryInitials(name) {
  const initials = cleanText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "??";
}

export function getItemSizeLabel(weightNumber, name = "", type = "") {
  if (Number.isFinite(weightNumber) && weightNumber > 0) {
    return getItemSizeLabelFromWeight(weightNumber);
  }

  return inferItemSizeLabel([type, name].filter(Boolean).join(" "));
}

export function getItemSizeLabelFromWeight(weightNumber) {
  let currentSize = itemSizeThresholds[0].label;

  for (const threshold of itemSizeThresholds) {
    if (weightNumber >= threshold.minWeight) {
      currentSize = threshold.label;
    }
  }

  return currentSize;
}

export function inferItemSizeLabel(value) {
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
