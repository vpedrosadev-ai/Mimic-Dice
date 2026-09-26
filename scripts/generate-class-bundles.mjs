import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const VENDOR_ROOT = path.join(PROJECT_ROOT, "data", "vendor", "5etools", "classes");
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "public", "data", "classes");
const GENERATED_MODULE_ROOT = path.join(PROJECT_ROOT, "src", "data", "generated");
const ENGLISH_VERSION = "v2.36.1";
const SPANISH_SNAPSHOT = "translated-mirror-2023-12-18";
const BUNDLE_SCHEMA_VERSION = 1;

const englishDirectory = path.join(VENDOR_ROOT, ENGLISH_VERSION, "en");
const spanishDirectory = path.join(VENDOR_ROOT, SPANISH_SNAPSHOT, "es");
const englishClassIndex = await readJson(path.join(englishDirectory, "index.json"));
const englishFluffIndex = await readJson(path.join(englishDirectory, "fluff-index.json"));
const spanishClassIndex = await readJson(path.join(spanishDirectory, "index.json"));

const englishFiles = await readIndexedFiles(englishDirectory, englishClassIndex);
const englishFluffFiles = await readIndexedFiles(englishDirectory, englishFluffIndex);
const spanishFiles = await readIndexedFiles(spanishDirectory, spanishClassIndex);
const catalog = buildCatalog(englishFiles);
const spanishOverlay = buildSpanishOverlay(catalog, spanishFiles);
const lore = buildLoreBundle(englishFluffFiles);

await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
await fs.mkdir(OUTPUT_ROOT, { recursive: true });
await fs.mkdir(GENERATED_MODULE_ROOT, { recursive: true });

const catalogPayload = {
  schemaVersion: BUNDLE_SCHEMA_VERSION,
  kind: "classes",
  language: "en",
  sourceVersion: ENGLISH_VERSION,
  classes: catalog.classes,
  unresolvedReferences: catalog.unresolvedReferences
};
const spanishPayload = {
  schemaVersion: BUNDLE_SCHEMA_VERSION,
  kind: "class-translations",
  language: "es",
  sourceVersion: SPANISH_SNAPSHOT,
  translations: spanishOverlay.translations,
  translatedFeatureCount: spanishOverlay.translatedFeatureCount,
  totalFeatureCount: spanishOverlay.totalFeatureCount
};
const catalogEntry = await writeHashedBundle("catalog.en", catalogPayload);
const spanishEntry = await writeHashedBundle("translations.es", spanishPayload);
await writeGeneratedModule("classCatalog.generated.js", catalogPayload);
await writeGeneratedModule("classTranslationsEs.generated.js", spanishPayload);
const loreEntry = await writeHashedBundle("lore.en", {
  schemaVersion: BUNDLE_SCHEMA_VERSION,
  kind: "class-lore",
  language: "en",
  sourceVersion: ENGLISH_VERSION,
  classFluff: lore.classFluff,
  subclassFluff: lore.subclassFluff
});

const manifest = {
  schemaVersion: BUNDLE_SCHEMA_VERSION,
  sourceVersion: ENGLISH_VERSION,
  spanishSourceVersion: SPANISH_SNAPSHOT,
  catalog: catalogEntry,
  translations: {
    es: spanishEntry
  },
  lore: {
    en: loreEntry
  },
  classCount: catalog.classes.length,
  subclassCount: catalog.classes.reduce((sum, entry) => sum + entry.subclasses.length, 0),
  featureCount: spanishOverlay.totalFeatureCount
};

manifest.version = createContentHash(JSON.stringify(manifest));
await fs.writeFile(
  path.join(OUTPUT_ROOT, "manifest.json"),
  `${JSON.stringify(manifest)}\n`,
  "utf8"
);
console.log(`Generated class manifest ${manifest.version}.`);

function buildCatalog(files) {
  const classes = [];
  const unresolvedReferences = [];

  for (const [fileKey, data] of Object.entries(files)) {
    const classFeatures = Array.isArray(data.classFeature) ? data.classFeature : [];
    const subclassFeatures = Array.isArray(data.subclassFeature) ? data.subclassFeature : [];
    const subclasses = Array.isArray(data.subclass) ? data.subclass : [];

    for (const classEntity of Array.isArray(data.class) ? data.class : []) {
      const classId = createEntityId("class", classEntity.name, classEntity.source);
      const normalizedClass = {
        ...copyWithout(classEntity, ["classFeatures"]),
        id: classId,
        key: normalizeKey(classEntity.name || fileKey),
        levels: buildClassLevels(classEntity, classFeatures, unresolvedReferences),
        subclasses: subclasses
          .filter((subclass) => isSubclassForClass(subclass, classEntity))
          .map((subclass) => ({
            ...copyWithout(subclass, ["subclassFeatures"]),
            id: createEntityId(
              "subclass",
              subclass.className,
              subclass.classSource,
              subclass.name,
              subclass.source
            ),
            levels: buildSubclassLevels(subclass, subclassFeatures, unresolvedReferences)
          }))
      };

      classes.push(normalizedClass);
    }
  }

  classes.sort((left, right) => (
    left.name.localeCompare(right.name, "en", { sensitivity: "base" })
    || left.source.localeCompare(right.source, "en", { sensitivity: "base" })
  ));

  return { classes, unresolvedReferences };
}

function buildClassLevels(classEntity, featureEntities, unresolvedReferences) {
  const levels = new Map();

  for (const rawReference of Array.isArray(classEntity.classFeatures) ? classEntity.classFeatures : []) {
    const reference = typeof rawReference === "string" ? rawReference : rawReference?.classFeature;
    const parsed = parseClassFeatureReference(reference, classEntity);

    if (!parsed) {
      continue;
    }

    const feature = findClassFeature(featureEntities, parsed);
    const normalizedFeature = feature
      ? {
          ...feature,
          id: createEntityId(
            "class-feature",
            feature.className,
            feature.classSource,
            feature.name,
            feature.level,
            feature.source
          ),
          optional: feature.isClassFeatureVariant === true
        }
      : {
          id: createEntityId(
            "class-feature",
            parsed.className,
            parsed.classSource,
            parsed.name,
            parsed.level,
            parsed.source
          ),
          name: parsed.name,
          source: parsed.source,
          className: parsed.className,
          classSource: parsed.classSource,
          level: parsed.level,
          entries: [],
          optional: false,
          unresolved: true
        };

    if (!feature) {
      unresolvedReferences.push({ kind: "classFeature", reference, class: classEntity.name, source: classEntity.source });
    }

    addFeatureToLevel(levels, parsed.level, normalizedFeature);
  }

  return finalizeLevels(levels);
}

function buildSubclassLevels(subclass, featureEntities, unresolvedReferences) {
  const levels = new Map();

  for (const rawReference of Array.isArray(subclass.subclassFeatures) ? subclass.subclassFeatures : []) {
    const reference = typeof rawReference === "string" ? rawReference : rawReference?.subclassFeature;
    const parsed = parseSubclassFeatureReference(reference, subclass);

    if (!parsed) {
      continue;
    }

    const feature = findSubclassFeature(featureEntities, parsed);
    const normalizedFeature = feature
      ? {
          ...feature,
          id: createEntityId(
            "subclass-feature",
            feature.className,
            feature.classSource,
            feature.subclassShortName,
            feature.subclassSource,
            feature.name,
            feature.level,
            feature.source
          )
        }
      : {
          id: createEntityId(
            "subclass-feature",
            parsed.className,
            parsed.classSource,
            parsed.subclassShortName,
            parsed.subclassSource,
            parsed.name,
            parsed.level,
            parsed.source
          ),
          name: parsed.name,
          source: parsed.source,
          className: parsed.className,
          classSource: parsed.classSource,
          subclassShortName: parsed.subclassShortName,
          subclassSource: parsed.subclassSource,
          level: parsed.level,
          entries: [],
          unresolved: true
        };

    if (!feature) {
      unresolvedReferences.push({
        kind: "subclassFeature",
        reference,
        class: subclass.className,
        subclass: subclass.name,
        source: subclass.source
      });
    }

    addFeatureToLevel(levels, parsed.level, normalizedFeature);
  }

  return finalizeLevels(levels);
}

function buildSpanishOverlay(catalog, files) {
  const spanishFeatureMaps = buildSpanishFeatureMaps(files);
  const translations = {};
  let translatedFeatureCount = 0;
  let totalFeatureCount = 0;

  for (const classEntity of catalog.classes) {
    for (const level of classEntity.levels) {
      for (const feature of level.features) {
        totalFeatureCount += 1;
        const translated = spanishFeatureMaps.classFeature.get(getClassFeatureIdentity(feature));

        if (translated?.entries) {
          translations[feature.id] = { entries: translated.entries };
          translatedFeatureCount += 1;
        }
      }
    }

    for (const subclass of classEntity.subclasses) {
      for (const level of subclass.levels) {
        for (const feature of level.features) {
          totalFeatureCount += 1;
          const translated = spanishFeatureMaps.subclassFeature.get(getSubclassFeatureIdentity(feature));

          if (translated?.entries) {
            translations[feature.id] = { entries: translated.entries };
            translatedFeatureCount += 1;
          }
        }
      }
    }
  }

  return { translations, translatedFeatureCount, totalFeatureCount };
}

function buildSpanishFeatureMaps(files) {
  const classFeature = new Map();
  const subclassFeature = new Map();

  for (const data of Object.values(files)) {
    for (const feature of Array.isArray(data.classFeature) ? data.classFeature : []) {
      classFeature.set(getClassFeatureIdentity(feature), feature);
    }

    for (const feature of Array.isArray(data.subclassFeature) ? data.subclassFeature : []) {
      subclassFeature.set(getSubclassFeatureIdentity(feature), feature);
    }
  }

  return { classFeature, subclassFeature };
}

function buildLoreBundle(files) {
  const classFluff = [];
  const subclassFluff = [];

  for (const data of Object.values(files)) {
    classFluff.push(...(Array.isArray(data.classFluff) ? data.classFluff : []));
    subclassFluff.push(...(Array.isArray(data.subclassFluff) ? data.subclassFluff : []));
  }

  return { classFluff, subclassFluff };
}

function parseClassFeatureReference(value, classEntity) {
  const parts = String(value || "").split("|");
  const name = parts[0]?.trim();
  const className = parts[1]?.trim() || classEntity.name;
  const classSource = parts[2]?.trim() || classEntity.source;
  const level = Number(parts[3]);
  const source = parts[4]?.trim() || classSource;

  return name && Number.isFinite(level)
    ? { name, className, classSource, level, source }
    : null;
}

function parseSubclassFeatureReference(value, subclass) {
  const parts = String(value || "").split("|");
  const name = parts[0]?.trim();
  const className = parts[1]?.trim() || subclass.className;
  const classSource = parts[2]?.trim() || subclass.classSource;
  const subclassShortName = parts[3]?.trim() || subclass.shortName || subclass.name;
  const subclassSource = parts[4]?.trim() || subclass.source;
  const level = Number(parts[5]);
  const source = parts[6]?.trim() || subclassSource;

  return name && Number.isFinite(level)
    ? { name, className, classSource, subclassShortName, subclassSource, level, source }
    : null;
}

function findClassFeature(features, reference) {
  return features.find((feature) => (
    same(feature.name, reference.name)
    && same(feature.className, reference.className)
    && same(feature.classSource, reference.classSource)
    && Number(feature.level) === reference.level
    && same(feature.source, reference.source)
  )) ?? features.find((feature) => (
    same(feature.name, reference.name)
    && same(feature.className, reference.className)
    && same(feature.classSource, reference.classSource)
    && Number(feature.level) === reference.level
  ));
}

function findSubclassFeature(features, reference) {
  return features.find((feature) => (
    same(feature.name, reference.name)
    && same(feature.className, reference.className)
    && same(feature.classSource, reference.classSource)
    && same(feature.subclassShortName, reference.subclassShortName)
    && same(feature.subclassSource, reference.subclassSource)
    && Number(feature.level) === reference.level
    && same(feature.source, reference.source)
  )) ?? features.find((feature) => (
    same(feature.name, reference.name)
    && same(feature.className, reference.className)
    && same(feature.subclassShortName, reference.subclassShortName)
    && Number(feature.level) === reference.level
  ));
}

function isSubclassForClass(subclass, classEntity) {
  return same(subclass.className, classEntity.name)
    && same(subclass.classSource, classEntity.source);
}

function addFeatureToLevel(levels, level, feature) {
  if (!levels.has(level)) {
    levels.set(level, []);
  }

  levels.get(level).push(feature);
}

function finalizeLevels(levels) {
  return [...levels.entries()]
    .sort(([left], [right]) => left - right)
    .map(([level, features]) => ({ level, features }));
}

function getClassFeatureIdentity(feature) {
  return [
    feature.name,
    feature.source,
    feature.className,
    feature.classSource,
    feature.level
  ].map(normalizeIdentityPart).join("|");
}

function getSubclassFeatureIdentity(feature) {
  return [
    feature.name,
    feature.source,
    feature.className,
    feature.classSource,
    feature.subclassShortName,
    feature.subclassSource,
    feature.level
  ].map(normalizeIdentityPart).join("|");
}

function normalizeIdentityPart(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEntityId(kind, ...parts) {
  const identity = [kind, ...parts].map(normalizeIdentityPart).join("|");
  return `${kind}-${crypto.createHash("sha256").update(identity).digest("hex").slice(0, 16)}`;
}

function same(left, right) {
  return normalizeIdentityPart(left) === normalizeIdentityPart(right);
}

function copyWithout(value, keys) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([key]) => !keys.includes(key))
  );
}

async function readIndexedFiles(directory, index) {
  const entries = await Promise.all(Object.entries(index).map(async ([key, fileName]) => [
    key,
    await readJson(path.join(directory, fileName))
  ]));
  return Object.fromEntries(entries);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeHashedBundle(prefix, payload) {
  const json = JSON.stringify(payload);
  const version = createContentHash(json);
  const fileName = `${prefix}.${version}.json`;
  await fs.writeFile(path.join(OUTPUT_ROOT, fileName), json, "utf8");
  console.log(`Generated public/data/classes/${fileName} (${formatBytes(Buffer.byteLength(json))}).`);
  return {
    path: `data/classes/${fileName}`,
    version,
    bytes: Buffer.byteLength(json)
  };
}

async function writeGeneratedModule(fileName, payload) {
  const serialized = JSON.stringify(payload)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  await fs.writeFile(
    path.join(GENERATED_MODULE_ROOT, fileName),
    `// Generated by scripts/generate-class-bundles.mjs. Do not edit.\nexport default ${serialized};\n`,
    "utf8"
  );
  console.log(`Generated src/data/generated/${fileName} (${formatBytes(Buffer.byteLength(serialized))}).`);
}

function createContentHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
