import { getCharacterClassKey, translateCharacterClassName } from "./characterClasses.js";

const CLASS_MANIFEST_PATH = "data/classes/manifest.json";
const catalogPromises = new Map();

const preferredClassSources = Object.freeze({
  artificer: ["TCE", "EFA"],
  barbarian: ["PHB", "XPHB"],
  bard: ["PHB", "XPHB"],
  cleric: ["PHB", "XPHB"],
  druid: ["PHB", "XPHB"],
  fighter: ["PHB", "XPHB"],
  monk: ["PHB", "XPHB"],
  paladin: ["PHB", "XPHB"],
  ranger: ["PHB", "XPHB"],
  rogue: ["PHB", "XPHB"],
  sorcerer: ["PHB", "XPHB"],
  warlock: ["PHB", "XPHB"],
  wizard: ["PHB", "XPHB"]
});

export async function loadCharacterClassCatalog(language = "en", assetBaseUrl = "") {
  const normalizedLanguage = language === "es" ? "es" : "en";
  const normalizedBaseUrl = String(assetBaseUrl || "").replace(/\/+$/, "");
  const cacheKey = `${normalizedBaseUrl}|${normalizedLanguage}`;

  if (!catalogPromises.has(cacheKey)) {
    catalogPromises.set(cacheKey, loadCatalog(normalizedLanguage, normalizedBaseUrl).catch((error) => {
      catalogPromises.delete(cacheKey);
      throw error;
    }));
  }

  return catalogPromises.get(cacheKey);
}

async function loadCatalog(language, assetBaseUrl) {
  const manifest = await loadJson(buildAssetUrl(assetBaseUrl, CLASS_MANIFEST_PATH));

  if (manifest?.schemaVersion !== 1 || !manifest?.catalog?.path) {
    throw new Error("Class data manifest is invalid.");
  }

  const [catalog, translationOverlay] = await Promise.all([
    loadJson(buildAssetUrl(assetBaseUrl, manifest.catalog.path)),
    language === "es" && manifest.translations?.es?.path
      ? loadJson(buildAssetUrl(assetBaseUrl, manifest.translations.es.path))
      : Promise.resolve(null)
  ]);

  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.classes)) {
    throw new Error("Class catalog is invalid.");
  }

  return {
    version: manifest.version,
    sourceVersion: manifest.sourceVersion,
    language,
    classes: catalog.classes,
    translations: translationOverlay?.translations ?? {},
    translatedFeatureCount: Number(translationOverlay?.translatedFeatureCount) || 0,
    featureCount: Number(manifest.featureCount) || 0,
    subclassCount: Number(manifest.subclassCount) || 0
  };
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error(`Class data request failed (${response.status}).`);
  }

  return response.json();
}

function buildAssetUrl(assetBaseUrl, relativePath) {
  const cleanPath = String(relativePath || "").replace(/^\/+/, "");
  return assetBaseUrl ? `${assetBaseUrl}/${cleanPath}` : cleanPath;
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

  const sourceOrder = preferredClassSources[requestedClassKey] ?? [];
  return [...candidates].sort((left, right) => (
    getSourcePriority(left.source, sourceOrder) - getSourcePriority(right.source, sourceOrder)
    || clean(left.source).localeCompare(clean(right.source), "en", { sensitivity: "base" })
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

    if (idMatch) {
      return idMatch;
    }
  }

  const candidates = subclasses.filter((subclass) => (
    normalizeKey(subclass.name) === normalizedName
    || normalizeKey(subclass.shortName) === normalizedName
  ));

  if (requestedSource) {
    const sourceMatch = candidates.find((subclass) => clean(subclass.source).toUpperCase() === requestedSource);

    if (sourceMatch) {
      return sourceMatch;
    }
  }

  return [...candidates].sort((left, right) => (
    clean(left.source).localeCompare(clean(right.source), "en", { sensitivity: "base" })
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
    const preferred = findCharacterClassRecord(catalog, entries[0].name);
    const localizedName = translateCharacterClassName(preferred?.name || entries[0].name, language);
    options.push({ value: localizedName, label: preferred?.source || "" });

    for (const entry of entries) {
      if (entry.id === preferred?.id) {
        continue;
      }

      options.push({ value: `${localizedName} (${entry.source})`, label: entry.source || "" });
    }
  }

  return options.sort((left, right) => left.value.localeCompare(right.value, language, { sensitivity: "base" }));
}

export function getCharacterSubclassInputOptions(classEntity) {
  const subclasses = Array.isArray(classEntity?.subclasses) ? classEntity.subclasses : [];
  return subclasses
    .map((subclass) => ({
      value: `${subclass.shortName || subclass.name}${subclass.source ? ` (${subclass.source})` : ""}`,
      label: subclass.name || subclass.shortName || ""
    }))
    .sort((left, right) => left.value.localeCompare(right.value, "en", { sensitivity: "base" }));
}

export function getLocalizedCharacterClassFeature(feature, catalog) {
  const translation = catalog?.language === "es" ? catalog?.translations?.[feature?.id] : null;
  return translation?.entries
    ? { ...feature, entries: translation.entries, translationAvailable: true }
    : { ...feature, translationAvailable: catalog?.language !== "es" };
}

export function parseCharacterClassInput(value) {
  return parseSourceSuffix(value);
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
