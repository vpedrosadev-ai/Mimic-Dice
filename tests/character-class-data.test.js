import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findCharacterClassRecord,
  findCharacterSubclassRecord,
  getCharacterActiveClassAbilities,
  getCharacterClassDisplayValue,
  getCharacterClassInputOptions,
  getCharacterSubclassDisplayValue,
  getCharacterSubclassInputOptions,
  getCharacterSpellSlotsForClassEntries,
  getCharacterSpellcastingLimitsForClassEntries,
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
assert.equal(dynamicallyLoadedCatalog.translatedFeatureCount, 1760);
assert.equal(catalogPayload.unresolvedReferences.length, 0);
assert.doesNotMatch(JSON.stringify(catalogPayload), /"type":"ref(?:ClassFeature|SubclassFeature|Optionalfeature|Feat)"/);
const resolvedSupplementalEntries = collectResolvedSupplementalEntries(catalogPayload.classes);
assert.ok(resolvedSupplementalEntries.length >= 149);
assert.equal(resolvedSupplementalEntries.filter((entry) => !Array.isArray(entry.entries) || entry.entries.length === 0).length, 0);
const translatedSupplementalEntries = new Map(
  collectResolvedSupplementalEntries(spanishPayload.translations).map((entry) => [entry.id, entry])
);
assert.equal(translatedSupplementalEntries.size, 149);
assert.match(
  JSON.stringify(translatedSupplementalEntries.get("optional-feature-3bc962b4fc1b8e0c")?.entries),
  /tirada de salvaci[oó]n/i
);
assert.doesNotMatch(
  JSON.stringify(translatedSupplementalEntries.get("optional-feature-3bc962b4fc1b8e0c")?.entries),
  /saving throw/i
);
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

const sorcererSpellcastingLimits = getCharacterSpellcastingLimitsForClassEntries(
  catalog,
  [{ name: "Hechicero (XPHB)", level: 3 }]
);
assert.equal(sorcererSpellcastingLimits[0]?.cantripsKnown, 4);
assert.equal(sorcererSpellcastingLimits[0]?.preparedSpells, 6);
assert.equal(sorcererSpellcastingLimits[0]?.spellsKnown, null);
assert.equal(getCharacterSpellcastingLimitsForClassEntries(
  catalog,
  [{ name: "Clerigo (PHB)", level: 5 }],
  false,
  { abilities: { wis: 16 } }
)[0]?.preparedSpells, 8);

const fighterActiveAbilities = getCharacterActiveClassAbilities(
  catalog,
  [{ id: "fighter-row", name: "Guerrero (XPHB)", level: 3 }],
  false,
  { abilities: { con: 14 }, proficiencyBonus: 2 }
);
assert.equal(fighterActiveAbilities.find((entry) => entry.name === "Segundo viento")?.uses, 2);
assert.ok(fighterActiveAbilities.some((entry) => /Action Surge|Oleada de acci/i.test(entry.name)));
assert.ok(!fighterActiveAbilities.some((entry) => /Mastery|Maestr/i.test(entry.name)));

const bardActiveAbilities = getCharacterActiveClassAbilities(
  catalog,
  [{ id: "bard-row", name: "Bardo (XPHB)", level: 3 }],
  false,
  { abilities: { cha: 16 }, proficiencyBonus: 2 }
);
assert.equal(bardActiveAbilities.find((entry) => /Inspiraci/i.test(entry.name))?.uses, 3);

const arcaneRecovery = classicWizard.levels
  .flatMap((entry) => entry.features)
  .find((feature) => feature.name === "Arcane Recovery");
const localizedArcaneRecovery = getLocalizedCharacterClassFeature(arcaneRecovery, catalog);
assert.match(JSON.stringify(localizedArcaneRecovery.entries), /energía mágica/i);

const modernArcaneRecovery = newestWizard.levels
  .flatMap((entry) => entry.features)
  .find((feature) => feature.name === "Arcane Recovery");
const localizedModernArcaneRecovery = getLocalizedCharacterClassFeature(modernArcaneRecovery, catalog);
assert.notEqual(localizedModernArcaneRecovery.name, modernArcaneRecovery.name);
assert.match(JSON.stringify(localizedModernArcaneRecovery.entries), /Puedes recuperar/i);
assert.doesNotMatch(JSON.stringify(localizedModernArcaneRecovery.entries), /You can regain/i);

const translatedFeature = getLocalizedCharacterClassFeature({
  id: "translated-name-test",
  name: "Arcane Recovery",
  entries: ["English body"]
}, {
  language: "es",
  translations: {
    "translated-name-test": {
      name: "Recuperación arcana",
      entries: ["Contenido español"]
    }
  }
});
assert.equal(translatedFeature.name, "Recuperación arcana");
assert.deepEqual(translatedFeature.entries, ["Contenido español"]);

const spellfireSorcerer = findCharacterClassRecord(catalog, { name: "Sorcerer (XPHB)" });
const spellfireSubclass = findCharacterSubclassRecord(spellfireSorcerer, {
  subclassName: "Spellfire Sorcery (FRHoF)"
});
const spellfireFeature = spellfireSubclass.levels
  .flatMap((entry) => entry.features)
  .find((feature) => feature.name === "Spellfire Sorcery");
const spellfireContent = JSON.stringify(spellfireFeature.entries);
assert.match(spellfireContent, /"name":"Spellfire Burst"/);
assert.match(spellfireContent, /"name":"Bolstering Flames"/);
assert.match(spellfireContent, /"name":"Radiant Fire"/);
assert.match(spellfireContent, /"name":"Spellfire Spells"/);

const metamagicOptions = spellfireSorcerer.levels
  .flatMap((entry) => entry.features)
  .find((feature) => feature.name === "Metamagic Options");
const metamagicContent = JSON.stringify(metamagicOptions.entries);
assert.match(metamagicContent, /"name":"Careful Spell"/);
assert.match(metamagicContent, /protect some of those creatures/i);
assert.match(metamagicContent, /"name":"Twinned Spell"/);
assert.match(metamagicContent, /Charm Person/);

const cureWounds = {
  id: "arcanum-cure-wounds--xphb--1st",
  identityKey: "arcanum-cure-wounds--xphb--1st",
  name: "Cure Wounds",
  canonicalName: "Cure Wounds",
  source: "XPHB"
};
const renderedSpellfire = renderCharacterClassFeaturesSection({
  character: {
    classFeaturesOpen: true,
    isMulticlass: false,
    classEntries: [{
      id: "spellfire-row",
      name: "Sorcerer",
      source: "XPHB",
      subclassName: "Spellfire Sorcery",
      subclassSource: "FRHoF",
      level: 3
    }]
  },
  catalog: { ...catalog, language: "en", translations: {} },
  spellEntries: [cureWounds],
  status: "ready",
  interfaceLanguage: "en",
  contentLanguage: "en",
  renderSpellPreview: (entry) => `<div class="character-spellbook__preview" role="tooltip">Preview: ${entry.name}</div>`
});
assert.match(renderedSpellfire, /<h6>Spellfire Burst<\/h6>/);
assert.match(renderedSpellfire, /<h6>Bolstering Flames<\/h6>/);
assert.match(renderedSpellfire, /<h6>Radiant Fire<\/h6>/);
assert.match(renderedSpellfire, /<h6>Spellfire Spells<\/h6>/);
assert.match(renderedSpellfire, /<h6>Careful Spell<\/h6>/);
assert.match(renderedSpellfire, /protect some of those creatures/i);
assert.match(renderedSpellfire, /<h6>Twinned Spell<\/h6>/);
assert.match(renderedSpellfire, /data-arcanum-entry-id="arcanum-cure-wounds--xphb--1st"/);
assert.match(renderedSpellfire, />Cure Wounds<\/button>/);
assert.match(renderedSpellfire, /character-class-feature__spell-reference/);
assert.match(renderedSpellfire, /role="tooltip">Preview: Cure Wounds/);
assert.doesNotMatch(renderedSpellfire, /data-arcanum-spell-name="Guiding Bolt"/);

const defaultCollapsed = renderCharacterClassFeaturesSection({
  character: {
    isMulticlass: false,
    classEntries: [{ id: "collapsed-wizard", name: "Wizard", source: "PHB", level: 5 }]
  },
  catalog,
  status: "ready"
});
assert.match(defaultCollapsed, /data-action="toggle-character-class-features"/);
assert.match(defaultCollapsed, /aria-expanded="false"/);
assert.doesNotMatch(defaultCollapsed, /character-class-features__body/);

const collapsedMulticlass = renderCharacterClassFeaturesSection({
  character: {
    classFeaturesOpen: true,
    isMulticlass: true,
    classEntries: [
      { id: "multiclass-wizard", name: "Wizard", source: "PHB", level: 5 },
      { id: "multiclass-fighter", name: "Fighter", source: "PHB", level: 3 }
    ]
  },
  catalog,
  status: "ready"
});
assert.equal((collapsedMulticlass.match(/data-action="toggle-character-class-feature-entry"/g) ?? []).length, 2);
assert.doesNotMatch(collapsedMulticlass, /character-class-progression__table/);

const partiallyExpandedMulticlass = renderCharacterClassFeaturesSection({
  character: {
    classFeaturesOpen: true,
    isMulticlass: true,
    classEntries: [
      { id: "multiclass-wizard", name: "Wizard", source: "PHB", level: 5, featuresOpen: true },
      { id: "multiclass-fighter", name: "Fighter", source: "PHB", level: 3 }
    ]
  },
  catalog,
  status: "ready"
});
assert.equal((partiallyExpandedMulticlass.match(/character-class-progression__table/g) ?? []).length, 1);
assert.match(partiallyExpandedMulticlass, /data-character-class-row="multiclass-wizard"[\s\S]*?aria-expanded="true"/);
assert.match(partiallyExpandedMulticlass, /data-character-class-row="multiclass-fighter"[\s\S]*?aria-expanded="false"/);

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

function collectResolvedSupplementalEntries(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectResolvedSupplementalEntries(entry, result));
    return result;
  }

  if (!value || typeof value !== "object") {
    return result;
  }

  if (/^(?:optional-feature|feat)-/.test(String(value.id || ""))) {
    result.push(value);
  }

  Object.values(value).forEach((entry) => collectResolvedSupplementalEntries(entry, result));
  return result;
}
