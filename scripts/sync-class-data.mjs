import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const VENDOR_ROOT = path.join(PROJECT_ROOT, "data", "vendor", "5etools", "classes");
const ENGLISH_VERSION = "v2.36.1";
const ENGLISH_BASE_URL = `https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/${ENGLISH_VERSION}`;
const SPANISH_SNAPSHOT = "translated-mirror-2023-12-18";
const SPANISH_BASE_URL = "https://5etools-translated.github.io";

const englishDirectory = path.join(VENDOR_ROOT, ENGLISH_VERSION, "en");
const spanishDirectory = path.join(VENDOR_ROOT, SPANISH_SNAPSHOT, "es");

await Promise.all([
  fs.mkdir(englishDirectory, { recursive: true }),
  fs.mkdir(spanishDirectory, { recursive: true })
]);

const englishClassIndex = await downloadJson(
  `${ENGLISH_BASE_URL}/data/class/index.json`,
  path.join(englishDirectory, "index.json")
);
const englishFluffIndex = await downloadJson(
  `${ENGLISH_BASE_URL}/data/class/fluff-index.json`,
  path.join(englishDirectory, "fluff-index.json")
);
const spanishClassIndex = await downloadJson(
  `${SPANISH_BASE_URL}/data.es/class/index.json`,
  path.join(spanishDirectory, "index.json")
);

await downloadMany([
  {
    url: `${ENGLISH_BASE_URL}/data/optionalfeatures.json`,
    outputPath: path.join(englishDirectory, "optionalfeatures.json")
  },
  {
    url: `${ENGLISH_BASE_URL}/data/feats.json`,
    outputPath: path.join(englishDirectory, "feats.json")
  },
  {
    url: `${SPANISH_BASE_URL}/data.es/optionalfeatures.json`,
    outputPath: path.join(spanishDirectory, "optionalfeatures.json")
  },
  {
    url: `${SPANISH_BASE_URL}/data.es/feats.json`,
    outputPath: path.join(spanishDirectory, "feats.json")
  },
  ...Object.values(englishClassIndex).map((fileName) => ({
    url: `${ENGLISH_BASE_URL}/data/class/${fileName}`,
    outputPath: path.join(englishDirectory, fileName)
  })),
  ...Object.values(englishFluffIndex).map((fileName) => ({
    url: `${ENGLISH_BASE_URL}/data/class/${fileName}`,
    outputPath: path.join(englishDirectory, fileName)
  })),
  ...Object.values(spanishClassIndex).map((fileName) => ({
    url: `${SPANISH_BASE_URL}/data.es/class/${fileName}`,
    outputPath: path.join(spanishDirectory, fileName)
  }))
]);

await downloadText(
  `${ENGLISH_BASE_URL}/LICENSE.md`,
  path.join(VENDOR_ROOT, ENGLISH_VERSION, "LICENSE.5etools.md")
);

const sourceManifest = {
  schemaVersion: 1,
  english: {
    version: ENGLISH_VERSION,
    baseUrl: ENGLISH_BASE_URL,
    classFiles: Object.values(englishClassIndex),
    fluffFiles: Object.values(englishFluffIndex),
    referenceFiles: ["optionalfeatures.json", "feats.json"]
  },
  spanish: {
    snapshot: SPANISH_SNAPSHOT,
    baseUrl: `${SPANISH_BASE_URL}/data.es/class/`,
    classFiles: Object.values(spanishClassIndex),
    referenceFiles: ["optionalfeatures.json", "feats.json"],
    note: "Machine-translated mirror snapshot. Newer English entities fall back to English."
  }
};

await fs.writeFile(
  path.join(VENDOR_ROOT, "sources.json"),
  `${JSON.stringify(sourceManifest, null, 2)}\n`,
  "utf8"
);

await runNodeScript(path.join(__dirname, "generate-class-bundles.mjs"));

async function downloadMany(entries, concurrency = 4) {
  const queue = [...entries];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      await downloadText(entry.url, entry.outputPath);
    }
  });

  await Promise.all(workers);
}

async function downloadJson(url, outputPath) {
  const text = await downloadText(url, outputPath);
  return JSON.parse(text);
}

async function downloadText(url, outputPath) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mimic-Dice class-data sync"
    }
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const text = await response.text();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, text, "utf8");
  console.log(`Downloaded ${path.relative(PROJECT_ROOT, outputPath)}`);
  return text;
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: PROJECT_ROOT,
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Generator exited with code ${code}.`));
      }
    });
    child.on("error", reject);
  });
}
