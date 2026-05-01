export const IS_FILE_PROTOCOL_RUNTIME = typeof window !== "undefined"
  ? /^file:$/i.test(String(window.location?.protocol || ""))
  : false;
export const HAS_DESKTOP_EXTERNAL_ASSETS = typeof window !== "undefined"
  ? Boolean(window.mimicDice?.hasExternalAssetDirectory)
  : false;
export const DESKTOP_ASSET_BASE_URL = typeof window !== "undefined"
  ? String(window.mimicDice?.assetBaseUrl || (IS_FILE_PROTOCOL_RUNTIME ? "mimic-assets://local" : "")).replace(/\/+$/, "")
  : "";
export const BESTIARY_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Bestiary.csv` : "data/Bestiary.csv";
export const BESTIARY_IMAGES_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/BestiaryImages.json` : "data/BestiaryImages.json";
export const ITEMS_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Items.csv` : "data/Items.csv";
export const ITEMS_IMAGES_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/ItemsImages.json` : "data/ItemsImages.json";
export const SPELLS_CSV_PATH = DESKTOP_ASSET_BASE_URL ? `${DESKTOP_ASSET_BASE_URL}/data/Spells.csv` : "data/Spells.csv";
export const CAMPAIGN_META_STORAGE_KEY = "mimic-dice:campaign-meta:v1";
export const CHARACTERS_STORAGE_KEY = "mimic-dice:characters:v1";
export const CHARACTER_SKILL_DEFINITIONS_STORAGE_KEY = "mimic-dice:character-skills:v1";
export const ENCOUNTER_INVENTORY_STORAGE_KEY = "mimic-dice:encounter-inventory:v1";
export const COMBAT_TRACKER_STORAGE_KEY = "mimic-dice:combat-tracker:v1";
export const TABLES_STORAGE_KEY = "mimic-dice:tables:v1";
export const MANAGED_STORAGE_KEY_PREFIX = "mimic-dice:";
export const DESKTOP_STORAGE_RESET_VERSION_KEY = "mimic-dice:desktop-storage-reset:v1";
export const DESKTOP_BUILD_SIGNATURE_STORAGE_KEY = "mimic-dice:desktop-build-signature:v1";
export const DESKTOP_STORAGE_RESET_VERSION = "2026-04-24-d";
export const CAMPAIGN_FILE_SCHEMA = "mimic-dice:campaign";
export const CAMPAIGN_FILE_VERSION = 1;
export const CAMPAIGN_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
export const COMBAT_TRACKER_SORT_DEFAULT_VERSION = 2;
export const BESTIARY_RENDER_DEBOUNCE_MS = 160;
export const BESTIARY_VIRTUAL_ROW_HEIGHT = 158;
export const BESTIARY_VIRTUAL_OVERSCAN = 6;
export const BESTIARY_VIRTUAL_DEFAULT_VIEWPORT = 760;
export const ITEM_VIRTUAL_ROW_HEIGHT = 132;
export const ITEM_VIRTUAL_OVERSCAN = 8;
export const APP_LANGUAGE_ES = "es";
export const APP_LANGUAGE_EN = "en";

