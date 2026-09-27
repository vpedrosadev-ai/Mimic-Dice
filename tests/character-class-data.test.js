import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findCharacterClassRecord,
  findCharacterSubclassRecord,
  getCharacterClassDisplayValue,
  getCharacterClassInputOptions,
  getCharacterSubclassDisplayValue,
  getCharacterSubclassInputOptions,
  getCharacterSpellSlotsForClassEntries,
  getLocalizedCharacterClassFeature,
  loadCharacterClassCatalog
} from "../src/data/characterClassData.js";
import { renderCharacterClassFeaturesSection } from "../src/screens/characters/characterClassFeatures.js";
import { getCharacterClassKey, translateCharacterClassName } from "../src/data/characterClasses.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const manifest = readJson(path.join(projectRoot, "public", "data", "classes", "manifest.json"));
const catalogPayload = readJson(path.join(projectRoot, "public", manifest.catalog.path));
const spanishPayload = readJson(path.join(projectRoot, "public", manifest.translations.es.path));
const catalog = {
  language: "es",
  classes: catalogPayload.classes,
  translations: spanishPayload.translations
};

const dynamicallyLoadedCatalog = await loadCharacterClassCatalog("es");
assert.equal(dynamicallyLoadedCatalog.classes.length, 30);
assert.equal(dynamicallyLoadedCatalog.subclassCount, 330);
assert.equal(dynamicallyLoadedCatalog.featureCount, 1760);
assert.equal(dynamicallyLoadedCatalog.translatedFeatureCount, 1098);
assert.equal(translateCharacterClassName("Artificer", "es"), "Artífice");
assert.equal(getCharacterClassKey("Compañero guerrero"), "warrior sidekick");

const newestWizard = findCharacterClassRecord(catalog, { name: "Mago" });
assert.equal(newestWizard?.name, "Wizard");
assert.equal(newestWizard?.source, "XPHB");

const classicWizard = findCharacterClassRecord(catalog, { name: "Mago (PHB)" });
assert.equal(classicWizard?.source, "PHB");

const modernWizard = findCharacterClassRecord(catalog, { name: "Mago (XPHB)", source: "PHB" });
assert.equal(modernWizard?.source, "XPHB");

const evocation = findCharacterSubclassRecord(classicWizard, { subclassName: "Evocation (PHB)" });
assert.equal(evocation?.shortName, "Evocation");
assert.equal(evocation?.source, "PHB");
assert.equal(findCharacterSubclassRecord(classicWizard, { subclassName: "Evocación (PHB)" })?.shortName, "Evocation");
assert.equal(getCharacterSubclassDisplayValue(evocation, "es"), "Evocación (PHB)");
assert.ok(getCharacterSubclassInputOptions(classicWizard, "es").some((entry) => entry.value === "Evocación (PHB)"));

assert.equal(findCharacterSubclassRecord(classicWizard, { subclassName: "Custom school" }), null);
const abjuration = findCharacterSubclassRecord(classicWizard, { subclassName: "Abjuration (PHB)" });
assert.equal(findCharacterSubclassRecord(classicWizard, {
  subclassName: "Evocation (PHB)",
  subclassId: abjuration.id,
  subclassSource: "PHB"
})?.shortName, "Evocation");

assert.equal(getCharacterClassDisplayValue(newestWizard, "es"), "Mago (XPHB)");
const wizardOptions = getCharacterClassInputOptions(catalog, "es").filter((entry) => entry.value.startsWith("Mago "));
assert.deepEqual(wizardOptions.map((entry) => entry.value).sort(), ["Mago (PHB)", "Mago (XPHB)"]);

assert.deepEqual(getCharacterSpellSlotsForClassEntries(catalog, [{ name: "Mago (XPHB)", level: 5 }]), [
  { level: 1, slots: 4 },
  { level: 2, slots: 3 },
  { level: 3, slots: 2 }
]);
assert.deepEqual(getCharacterSpellSlotsForClassEntries(catalog, [{ name: "Brujo (XPHB)", level: 5 }]), [
  { level: 3, slots: 2 }
]);
assert.deepEqual(getCharacterSpellSlotsForClassEntries(catalog, [
  { name: "Mago (XPHB)", level: 3 },
  { name: "Paladin (XPHB)", level: 2 }
], true), [
  { level: 1, slots: 4 },
  { level: 2, slots: 3 }
]);

const arcaneRecovery = classicWizard.levels
  .flatMap((entry) => entry.features)
  .find((feature) => feature.name === "Arcane Recovery");
const localizedArcaneRecovery = getLocalizedCharacterClassFeature(arcaneRecovery, catalog);
assert.match(JSON.stringify(localizedArcaneRecovery.entries), /energía mágica/i);

const rendered = renderCharacterClassFeaturesSection({
  character: {
    classFeaturesOpen: true,
    isMulticlass: false,
    classEntries: [{
      id: "wizard-row",
      name: "Mago",
      classKey: "wizard",
      source: "PHB",
      subclassName: "Evocation",
      subclassSource: "PHB",
      level: 5
    }]
  },
  catalog,
  status: "ready",
  interfaceLanguage: "es",
  contentLanguage: "es"
});

assert.match(rendered, /Caracteristicas de clase/);
assert.match(rendered, /Mago \(PHB\)/);
assert.match(rendered, /Evocación \(PHB\)/);
assert.match(rendered, />1st<\/th>/);
assert.match(rendered, />Trucos<\/th>/);
assert.doesNotMatch(rendered, />LEVEL=0<\/th>/i);
assert.match(rendered, /Rasgos principales/);
assert.match(rendered, /Caracteristicas desbloqueadas/);
assert.match(rendered, /Proximas caracteristicas/);
assert.match(rendered, /energía mágica/i);
assert.match(rendered, /class-feature-wizard-row-/);
assert.equal((rendered.match(/<tr class="is-(?:unlocked|upcoming)">/g) ?? []).length, 20);

console.log("Character class data tests passed.");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
