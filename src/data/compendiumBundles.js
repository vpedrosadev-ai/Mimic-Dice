const COMPENDIUM_MANIFEST_PATH = "data/compendium-manifest.json";
const COMPENDIUM_CACHE_DB_NAME = "mimic-dice:compendium-cache";
const COMPENDIUM_CACHE_STORE_NAME = "bundles";
const COMPENDIUM_CACHE_DB_VERSION = 1;
const COMPENDIUM_MANIFEST_SCHEMA_VERSION = 1;
const COMPENDIUM_BUNDLE_SCHEMA_VERSION = 1;
const supportedKinds = new Set(["bestiary", "items", "arcanum"]);
const supportedLanguages = new Set(["en", "es"]);
const bundleLoadPromises = new Map();

let manifestPromise = null;
let cacheDatabasePromise = null;
let cachePruneScheduled = false;

export async function loadVersionedCompendiumBundle(kind, language) {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  const normalizedLanguage = String(language || "").trim().toLowerCase();

  if (!supportedKinds.has(normalizedKind) || !supportedLanguages.has(normalizedLanguage)) {
    return null;
  }

  const manifest = await loadCompendiumManifest();
  const bundleEntry = manifest?.datasets?.[normalizedKind]?.[normalizedLanguage];

  if (!isValidManifestBundleEntry(bundleEntry)) {
    return null;
  }

  const cacheKey = createBundleCacheKey(normalizedKind, normalizedLanguage, bundleEntry.version);

  if (bundleLoadPromises.has(cacheKey)) {
    return bundleLoadPromises.get(cacheKey);
  }

  const loadPromise = loadBundleEntry(bundleEntry, {
    cacheKey,
    kind: normalizedKind,
    language: normalizedLanguage
  }).finally(() => {
    bundleLoadPromises.delete(cacheKey);
  });

  bundleLoadPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

async function loadCompendiumManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(COMPENDIUM_MANIFEST_PATH, {
      cache: "no-cache"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Compendium manifest request failed (${response.status}).`);
        }

        const manifest = await response.json();

        if (!isValidManifest(manifest)) {
          throw new Error("Compendium manifest is invalid.");
        }

        scheduleStaleBundlePrune(manifest);
        return manifest;
      })
      .catch(() => null);
  }

  return manifestPromise;
}

async function loadBundleEntry(bundleEntry, { cacheKey, kind, language }) {
  const cachedPayload = await readCachedBundle(cacheKey);

  if (isValidBundlePayload(cachedPayload, bundleEntry, kind, language)) {
    return cachedPayload;
  }

  const response = await fetch(bundleEntry.path, {
    cache: "force-cache"
  });

  if (!response.ok) {
    throw new Error(`Compendium bundle request failed (${response.status}).`);
  }

  const payload = await response.json();

  if (!isValidBundlePayload(payload, bundleEntry, kind, language)) {
    throw new Error(`Compendium bundle ${kind}/${language} is invalid.`);
  }

  saveCachedBundle(cacheKey, payload).catch(() => {});
  return payload;
}

function isValidManifest(manifest) {
  return manifest
    && manifest.schemaVersion === COMPENDIUM_MANIFEST_SCHEMA_VERSION
    && manifest.datasets
    && typeof manifest.datasets === "object";
}

function isValidManifestBundleEntry(entry) {
  return entry
    && typeof entry.path === "string"
    && entry.path.startsWith("data/bundles/")
    && typeof entry.version === "string"
    && entry.version.length > 0
    && Number.isFinite(entry.rowCount)
    && entry.rowCount > 0;
}

function isValidBundlePayload(payload, bundleEntry, kind, language) {
  return payload
    && payload.schemaVersion === COMPENDIUM_BUNDLE_SCHEMA_VERSION
    && payload.version === bundleEntry.version
    && payload.kind === kind
    && payload.language === language
    && Array.isArray(payload.rows)
    && payload.rows.length === bundleEntry.rowCount
    && payload.meta
    && typeof payload.meta === "object";
}

function createBundleCacheKey(kind, language, version) {
  return `${kind}:${language}:${version}`;
}

function canUseBundleCache() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openBundleCacheDatabase() {
  if (!canUseBundleCache()) {
    return Promise.resolve(null);
  }

  if (!cacheDatabasePromise) {
    cacheDatabasePromise = new Promise((resolve) => {
      const request = window.indexedDB.open(COMPENDIUM_CACHE_DB_NAME, COMPENDIUM_CACHE_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(COMPENDIUM_CACHE_STORE_NAME)) {
          database.createObjectStore(COMPENDIUM_CACHE_STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  return cacheDatabasePromise;
}

async function readCachedBundle(key) {
  const database = await openBundleCacheDatabase();

  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(COMPENDIUM_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(COMPENDIUM_CACHE_STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result?.payload ?? null);
    request.onerror = () => resolve(null);
  });
}

async function saveCachedBundle(key, payload) {
  const database = await openBundleCacheDatabase();

  if (!database) {
    return;
  }

  await new Promise((resolve) => {
    const transaction = database.transaction(COMPENDIUM_CACHE_STORE_NAME, "readwrite");

    transaction.objectStore(COMPENDIUM_CACHE_STORE_NAME).put({
      key,
      payload,
      storedAt: Date.now()
    });
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
    transaction.onabort = resolve;
  });
}

function scheduleStaleBundlePrune(manifest) {
  if (cachePruneScheduled || !canUseBundleCache()) {
    return;
  }

  cachePruneScheduled = true;
  const validKeys = new Set();

  for (const [kind, languages] of Object.entries(manifest.datasets ?? {})) {
    for (const [language, entry] of Object.entries(languages ?? {})) {
      if (isValidManifestBundleEntry(entry)) {
        validKeys.add(createBundleCacheKey(kind, language, entry.version));
      }
    }
  }

  window.setTimeout(() => {
    pruneStaleBundles(validKeys).catch(() => {});
  }, 0);
}

async function pruneStaleBundles(validKeys) {
  const database = await openBundleCacheDatabase();

  if (!database) {
    return;
  }

  await new Promise((resolve) => {
    const transaction = database.transaction(COMPENDIUM_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(COMPENDIUM_CACHE_STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        return;
      }

      if (!validKeys.has(String(cursor.key))) {
        cursor.delete();
      }

      cursor.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
    transaction.onabort = resolve;
  });
}
