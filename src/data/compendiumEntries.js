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
  normalizeSearchText,
  parseLeadingNumber,
  shortenLabel,
  slugify,
  splitList,
  uniqueSortedStrings
} from "../shared/text.js";

const SPANISH_SPELL_LEVEL_WORDS = new Map([
  ["primer", 1],
  ["primero", 1],
  ["segundo", 2],
  ["tercer", 3],
  ["tercero", 3],
  ["cuarto", 4],
  ["quinto", 5],
  ["sexto", 6],
  ["septimo", 7],
  ["septimo", 7],
  ["octavo", 8],
  ["noveno", 9]
]);

const EXCLUDED_ARCANUM_CLASS_FILTER_TOKENS = new Set([
  "wizard",
  "sorcerer",
  "azafran y grasa; y se consume mediante el hechizo)",
  "espolvoreado sobre el duplicado y consumido por el hechizo)",
  "recortes de unas u otra pieza del cuerpo de esa criatura colocada dentro de la nieve o el hielo; y rubi en polvo por valor de 1.500 po",
  "vidrio o una varilla de cristal; y tres alfileres de plata)"
]);

const ITEM_RARITY_DEFINITIONS = [
  { key: "none", rank: 0, glyph: "IT", labels: { en: "None", es: "Sin rareza" }, aliases: ["none", "sin rareza"] },
  { key: "common", rank: 1, glyph: "CO", labels: { en: "Common", es: "Com\u00fan" }, aliases: ["common", "comun"] },
  { key: "uncommon", rank: 2, glyph: "UN", labels: { en: "Uncommon", es: "Poco com\u00fan" }, aliases: ["uncommon", "poco comun"] },
  { key: "rare", rank: 3, glyph: "RA", labels: { en: "Rare", es: "Raro" }, aliases: ["rare", "raro"] },
  { key: "very-rare", rank: 4, glyph: "VR", labels: { en: "Very Rare", es: "Muy raro" }, aliases: ["very rare", "very-rare", "muy raro"] },
  { key: "legendary", rank: 5, glyph: "LE", labels: { en: "Legendary", es: "Legendario" }, aliases: ["legendary", "legendario"] },
  { key: "artifact", rank: 6, glyph: "AR", labels: { en: "Artifact", es: "Artefacto" }, aliases: ["artifact", "artefacto"] },
  { key: "unknown", rank: 7, glyph: "UN", labels: { en: "Unknown", es: "Desconocida" }, aliases: ["unknown", "desconocida", "desconocido"] },
  { key: "unknown-magic", rank: 8, glyph: "UM", labels: { en: "Unknown (Magic)", es: "Desconocida (m\u00e1gica)" }, aliases: ["unknown magic", "unknown (magic)", "desconocida magica", "desconocido magico"] },
  { key: "varies", rank: 9, glyph: "VA", labels: { en: "Varies", es: "Variable" }, aliases: ["varies", "variable", "varia"] }
];
const ITEM_RARITY_BY_ALIAS = new Map(ITEM_RARITY_DEFINITIONS.flatMap((definition) => (
  definition.aliases.map((alias) => [normalizeSearchText(alias).replace(/[-_]+/g, " "), definition])
)));

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
  const searchText = normalizeSearchText([
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
  ].join(" "));

  return {
    id: compositeKey || `bestiary-${index + 1}`,
    compositeKey,
    name,
    nameLower: normalizeSearchText(name),
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

export function normalizeItemEntry(row, index, imageMap = {}, options = {}) {
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
  const rarityLabel = formatItemRarity(rarity, options);
  const requiresAttunement = Boolean(attunement);
  const typeLine = [type, requiresAttunement ? "Requiere attunement" : ""].filter(Boolean).join(" | ");
  const compositeKey = buildItemCompositeKey(name, source);
  const valueNumber = parseItemValue(value);
  const weightNumber = parseItemWeight(weight);
  const sizeLabel = getItemSizeLabel(weightNumber, name, type);
  const imageUrl = resolveItemImageAsset(name, source, imageMap);
  const searchText = normalizeSearchText([
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
  ].join(" "));

  return {
    id: compositeKey || `item-${index + 1}`,
    compositeKey,
    name,
    nameLower: normalizeSearchText(name),
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
  const classFilterTokens = uniqueSortedStrings(classTokens
    .map(getArcanumParentheticalBase)
    .filter(isValidArcanumClassFilterToken));
  const levelValue = parseSpellLevel(level);
  const levelLabel = formatSpellLevel(level);
  const levelShort = formatSpellLevelShort(level);
  const schoolFilterValue = getArcanumParentheticalBase(school);
  const castingSpeed = getSpellCastingSpeed(castingTime);
  const sourceFullName = getSourceFullName(source);
  const sourceLabel = page ? `${sourceFullName} p.${page}` : sourceFullName || "Sin fuente";
  const schoolLine = [levelLabel, school].filter(Boolean).join(" | ");
  const compositeKey = buildArcanumCompositeKey(name, source, level);
  const searchText = normalizeSearchText([
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
  ].join(" "));

  return {
    id: compositeKey || `arcanum-${index + 1}`,
    compositeKey,
    name,
    nameLower: normalizeSearchText(name),
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
  const normalizedSearchLevel = normalizeSearchText(normalizedLevel);

  if (!normalizedLevel) {
    return 99;
  }

  if (normalizedSearchLevel.includes("cantrip") || normalizedSearchLevel.includes("truco")) {
    return 0;
  }

  const match = normalizedLevel.match(/\d+/);
  if (match) {
    return Number(match[0]);
  }

  for (const [word, value] of SPANISH_SPELL_LEVEL_WORDS.entries()) {
    if (normalizedSearchLevel.includes(word)) {
      return value;
    }
  }

  return 99;
}

export function formatSpellLevel(level) {
  const normalizedLevel = cleanText(level);
  const normalizedLower = normalizedLevel.toLowerCase();

  if (!normalizedLevel) {
    return "Nivel no indicado";
  }

  if (normalizedLower.includes("cantrip") || normalizedLower.includes("truco")) {
    return "Truco";
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
  const normalizedCastingTime = normalizeSearchText(castingTime);

  if (normalizedCastingTime.includes("bonus") || normalizedCastingTime.includes("adicional")) {
    return "Bonus";
  }

  if (normalizedCastingTime.includes("reaction") || normalizedCastingTime.includes("reaccion")) {
    return "Reaction";
  }

  if (normalizedCastingTime.includes("action") || normalizedCastingTime.includes("accion")) {
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

function isValidArcanumClassFilterToken(value) {
  const normalizedValue = normalizeSearchText(value);

  return Boolean(normalizedValue) && !EXCLUDED_ARCANUM_CLASS_FILTER_TOKENS.has(normalizedValue);
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

export function formatItemRarity(rarity, options = {}) {
  const normalized = cleanText(rarity);
  const definition = getItemRarityDefinition(normalized);

  if (!normalized) {
    return "Sin rareza";
  }

  if (definition) {
    return definition.labels[options.contentLanguage === "es" ? "es" : "en"];
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function getItemRarityRank(rarity) {
  return getItemRarityDefinition(rarity)?.rank ?? 99;
}

export function getItemRarityGlyph(rarity) {
  const definition = getItemRarityDefinition(rarity);
  const normalized = cleanText(rarity).toLowerCase();

  if (definition) {
    return definition.glyph;
  }

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
  const normalized = getItemRarityDefinition(rarity)?.key ?? slugify(rarity);

  if (!normalized) {
    return "item-row__rarity-pill--unknown";
  }

  return `item-row__rarity-pill--${normalized}`;
}

function getItemRarityDefinition(rarity) {
  const normalized = normalizeSearchText(rarity).replace(/[-_]+/g, " ");
  return ITEM_RARITY_BY_ALIAS.get(normalized) ?? null;
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
