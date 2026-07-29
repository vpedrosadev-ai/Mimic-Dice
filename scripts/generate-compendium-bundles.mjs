import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_TRANSLATION_MODE_GLOSSARY,
  CONTENT_TRANSLATION_MODE_ORIGINAL,
  CONTENT_TRANSLATION_MODE_SIDECAR,
  attachCompendiumTranslationIdentityRows,
  isCompendiumTranslationSidecarUsable,
  mergeCompendiumTranslationRows,
  translateCompendiumRows
} from "../src/data/contentTranslation.js";
import { parseCsv } from "../src/shared/csv.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIRECTORY = path.join(PROJECT_ROOT, "public", "data");
const BUNDLE_DIRECTORY = path.join(DATA_DIRECTORY, "bundles");
const MANIFEST_PATH = path.join(DATA_DIRECTORY, "compendium-manifest.json");
const MAX_PAGES_FILE_BYTES = 25 * 1024 * 1024;
const MANIFEST_SCHEMA_VERSION = 1;
const BUNDLE_SCHEMA_VERSION = 1;

const DATASETS = [
  { key: "bestiary", kind: "bestiary", fileName: "Bestiary.csv" },
  { key: "items", kind: "items", fileName: "Items.csv" },
  { key: "arcanum", kind: "arcanum", fileName: "Spells.csv" }
];

await fs.rm(BUNDLE_DIRECTORY, { recursive: true, force: true });
await fs.mkdir(BUNDLE_DIRECTORY, { recursive: true });

const manifest = {
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  datasets: {}
};

for (const dataset of DATASETS) {
  manifest.datasets[dataset.key] = await generateDatasetBundles(dataset);
}

manifest.version = createContentHash(
  Object.values(manifest.datasets)
    .flatMap((languages) => Object.values(languages))
    .map((entry) => entry.version)
    .join(":")
);

await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest)}\n`, "utf8");
console.log(`Generated compendium manifest ${manifest.version}.`);

async function generateDatasetBundles({ key, kind, fileName }) {
  const basePath = path.join(DATA_DIRECTORY, fileName);
  const sidecarFileName = fileName.replace(/\.csv$/i, "_ES.csv");
  const sidecarPath = path.join(DATA_DIRECTORY, sidecarFileName);
  const [baseText, sidecarText] = await Promise.all([
    fs.readFile(basePath, "utf8"),
    fs.readFile(sidecarPath, "utf8").catch(() => "")
  ]);
  const baseRows = parseCsv(baseText);
  const sidecarRows = sidecarText ? parseCsv(sidecarText) : [];
  const hasUsableSidecar = isCompendiumTranslationSidecarUsable(baseRows, sidecarRows, kind);
  const englishRows = hasUsableSidecar
    ? attachCompendiumTranslationIdentityRows(baseRows, sidecarRows, kind)
    : baseRows;
  const spanishRows = hasUsableSidecar
    ? mergeCompendiumTranslationRows(baseRows, sidecarRows, kind)
    : translateCompendiumRows(baseRows, kind, "es");

  return {
    en: await writeBundle({
      key,
      kind,
      language: "en",
      rows: englishRows,
      meta: {
        detectedLanguage: "en",
        translationMode: CONTENT_TRANSLATION_MODE_ORIGINAL,
        sidecarPath: "",
        message: ""
      }
    }),
    es: await writeBundle({
      key,
      kind,
      language: "es",
      rows: spanishRows,
      meta: {
        detectedLanguage: "en",
        translationMode: hasUsableSidecar
          ? CONTENT_TRANSLATION_MODE_SIDECAR
          : CONTENT_TRANSLATION_MODE_GLOSSARY,
        sidecarPath: hasUsableSidecar ? `data/${sidecarFileName}` : "",
        message: hasUsableSidecar
          ? ""
          : "Spanish sidecar CSV missing or incompatible; local glossary applied."
      }
    })
  };
}

async function writeBundle({ key, kind, language, rows, meta }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Cannot generate empty ${key}/${language} compendium bundle.`);
  }

  const versionSource = JSON.stringify({ kind, language, rows, meta });
  const version = createContentHash(versionSource);
  const payload = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    version,
    kind,
    language,
    rows,
    meta
  };
  const json = JSON.stringify(payload);
  const bytes = Buffer.byteLength(json);

  if (bytes > MAX_PAGES_FILE_BYTES) {
    throw new Error(
      `${key}/${language} bundle is ${(bytes / 1024 / 1024).toFixed(2)} MiB; Cloudflare Pages limit is 25 MiB.`
    );
  }

  const fileName = `${key}.${language}.${version}.json`;
  const relativePath = `data/bundles/${fileName}`;

  await fs.writeFile(path.join(BUNDLE_DIRECTORY, fileName), json, "utf8");
  console.log(`Generated ${relativePath}: ${rows.length} rows, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);

  return {
    path: relativePath,
    version,
    rowCount: rows.length,
    bytes
  };
}

function createContentHash(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}
