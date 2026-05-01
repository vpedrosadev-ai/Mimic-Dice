import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { translateCompendiumRows } from "../src/data/contentTranslation.js";
import { parseCsv, serializeCsv } from "../src/shared/csv.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIRECTORY = path.join(PROJECT_ROOT, "public", "data");

const DATASETS = [
  { fileName: "Bestiary.csv", kind: "bestiary" },
  { fileName: "Items.csv", kind: "items" },
  { fileName: "Spells.csv", kind: "arcanum" }
];

for (const dataset of DATASETS) {
  await generateSidecar(dataset);
}

async function generateSidecar({ fileName, kind }) {
  const sourcePath = path.join(DATA_DIRECTORY, fileName);
  const sidecarPath = sourcePath.replace(/\.csv$/i, ".es.csv");
  const sourceText = await fs.readFile(sourcePath, "utf8");
  const rows = parseCsv(sourceText);
  const translatedRows = translateCompendiumRows(rows, kind, "es");
  const headers = Object.keys(rows[0] ?? {});
  const csvText = serializeCsv(translatedRows, headers);

  await fs.writeFile(sidecarPath, csvText, "utf8");
  console.log(`Generated ${path.basename(sidecarPath)} with ${translatedRows.length} rows.`);
}
