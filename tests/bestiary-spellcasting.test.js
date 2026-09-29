import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeBestiaryEntry, normalizeSpellEntry } from "../src/data/compendiumEntries.js";
import { mergeCompendiumTranslationRows } from "../src/data/contentTranslation.js";
import { parseBestiarySpellcasting } from "../src/shared/bestiarySpellcasting.js";
import { parseCsv } from "../src/shared/csv.js";
import { createSpellReferenceMatcher, findSpellReferenceMatches } from "../src/shared/spellReferences.js";

test("parses Spanish daily monster spellcasting groups and metadata", () => {
  const parsed = parseBestiarySpellcasting({
    actions: `Lanzamiento de hechizos. El archidruida lanza uno de los siguientes conjuros, utilizando Sabiduría como aptitud de lanzamiento de conjuros (salvación de conjuro CD 17):

A voluntad: Sentido de la Bestia, Enredar, Habla con animales.

3/día cada uno: Mensajero animal, Dominar Bestia, Fuego feerico, Paso de árbol

1/día cada uno: Comunión con la naturaleza (como acción), Curar heridas en masa.`
  });

  assert.equal(parsed.ability, "Sabiduría");
  assert.equal(parsed.saveDc, 17);
  assert.deepEqual(parsed.groups.map(({ kind, uses }) => [kind, uses]), [
    ["at-will", 0],
    ["daily", 3],
    ["daily", 1]
  ]);
  assert.equal(parsed.groups[2].spells[0].lookupName, "Comunión con la naturaleza");
});

test("parses legacy English spell slots", () => {
  const parsed = parseBestiarySpellcasting({
    traits: `Spellcasting. Its spellcasting ability is Wisdom (spell save DC 17, +9 to hit with spell attacks).
Cantrips (at will): druidcraft, mending
1st level (4 slots): cure wounds, entangle
2nd level (3 slots): animal messenger, beast sense`
  });

  assert.equal(parsed.ability, "Wisdom");
  assert.equal(parsed.saveDc, 17);
  assert.equal(parsed.attackModifier, 9);
  assert.deepEqual(parsed.groups.map(({ level, uses }) => [level, uses]), [[0, 0], [1, 4], [2, 3]]);
});

test("finds bilingual and accent-insensitive spell references without changing offsets", () => {
  const entry = {
    name: "Comunión con la naturaleza",
    canonicalName: "Commune with Nature",
    localizedName: "Comunión con la naturaleza"
  };
  const matcher = createSpellReferenceMatcher([entry]);
  const content = "1/día: Comunion con la naturaleza (como acción). Commune with Nature.";
  const matches = findSpellReferenceMatches(content, matcher);

  assert.deepEqual(matches.map((match) => match.text), ["Comunion con la naturaleza", "Commune with Nature"]);
  assert.ok(matches.every((match) => match.entry === entry));
});

test("recognizes every modern Archdruid spell in real English and Spanish catalogs", async () => {
  const [bestiaryText, bestiaryEsText, spellsText, spellsEsText] = await Promise.all([
    readFile(new URL("../public/data/Bestiary.csv", import.meta.url), "utf8"),
    readFile(new URL("../public/data/Bestiary_ES.csv", import.meta.url), "utf8"),
    readFile(new URL("../public/data/Spells.csv", import.meta.url), "utf8"),
    readFile(new URL("../public/data/Spells_ES.csv", import.meta.url), "utf8")
  ]);
  const bestiaryRows = parseCsv(bestiaryText);
  const spellRows = parseCsv(spellsText);
  const localizedBestiaryRows = mergeCompendiumTranslationRows(bestiaryRows, parseCsv(bestiaryEsText), "bestiary");
  const localizedSpellRows = mergeCompendiumTranslationRows(spellRows, parseCsv(spellsEsText), "arcanum");
  const englishEntry = bestiaryRows.map((row, index) => normalizeBestiaryEntry(row, index)).find((entry) => entry.name === "Archdruid" && entry.source === "MPMM");
  const spanishEntry = localizedBestiaryRows.map((row, index) => normalizeBestiaryEntry(row, index)).find((entry) => entry.name === "Archidruida" && entry.source === "MPMM");
  const englishMatcher = createSpellReferenceMatcher(spellRows.map((row, index) => normalizeSpellEntry(row, index)));
  const spanishMatcher = createSpellReferenceMatcher(localizedSpellRows.map((row, index) => normalizeSpellEntry(row, index)));

  assert.ok(englishEntry);
  assert.ok(spanishEntry);
  assert.equal(parseBestiarySpellcasting(englishEntry).groups.flatMap((group) => group.spells).length, 9);
  assert.equal(parseBestiarySpellcasting(spanishEntry).groups.flatMap((group) => group.spells).length, 9);
  assert.equal(findSpellReferenceMatches(englishEntry.actions, englishMatcher).length, 9);
  assert.equal(findSpellReferenceMatches(spanishEntry.actions, spanishMatcher).length, 9);
});
