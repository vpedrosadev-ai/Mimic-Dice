import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPENDIUM_SOURCE_PUBLICATION_DATES } from "../src/data/compendiumSourceDates.js";
import {
  findCompendiumEntryByReference,
  getUnresolvedCharacterCompendiumReferences
} from "../src/shared/compendiumReferences.js";
import { parseCsv } from "../src/shared/csv.js";

const witchBolt2014 = {
  id: "arcanum-witch-bolt--phb-14--1st",
  identityKey: "arcanum-witch-bolt--phb-14--1st",
  name: "Witch Bolt",
  localizedName: "Rayo de hechicería",
  source: "PHB'14"
};
const witchBolt2024 = {
  id: "arcanum-witch-bolt--phb-24--1st",
  identityKey: "arcanum-witch-bolt--phb-24--1st",
  name: "Witch Bolt",
  localizedName: "Rayo de hechicería",
  source: "PHB'24"
};
const spells = [witchBolt2014, witchBolt2024];

assert.equal(
  findCompendiumEntryByReference(spells, { name: "Rayo de hechicería" }),
  witchBolt2024
);
assert.equal(
  findCompendiumEntryByReference([...spells].reverse(), { name: "Rayo de hechicería" }),
  witchBolt2024
);
assert.equal(
  findCompendiumEntryByReference(spells, {
    entryId: witchBolt2014.id,
    name: "Rayo de hechicería"
  }),
  witchBolt2024
);
assert.equal(
  findCompendiumEntryByReference(spells, {
    entryId: witchBolt2014.id,
    name: "Rayo de hechicería",
    source: "PHB'14"
  }),
  witchBolt2014
);

const items = [
  { id: "item-old", name: "Objeto compartido", source: "Fuente antigua" },
  { id: "item-new", name: "Objeto compartido", source: "Fuente nueva" }
];
assert.equal(findCompendiumEntryByReference(items, { name: "Objeto compartido" }), items[1]);

const unresolved = getUnresolvedCharacterCompendiumReferences([{
  spells: [
    { name: "Rayo de hechicería" },
    { name: "Hechizo inventado" },
    { name: "Hechizo inventado" }
  ],
  inventory: [
    { name: "Objeto compartido" },
    { name: "Objeto perdido" },
    { name: "ORO" }
  ]
}], {
  spellEntries: spells,
  itemEntries: items,
  isCurrencyName: (name) => name === "ORO"
});

assert.deepEqual(unresolved, {
  spells: ["Hechizo inventado"],
  items: ["Objeto perdido"]
});

const catalogSources = new Set();

for (const fileName of ["Bestiary.csv", "Items.csv", "Spells.csv"]) {
  const csvText = await readFile(new URL(`../public/data/${fileName}`, import.meta.url), "utf8");

  for (const row of parseCsv(csvText)) {
    if (row.Source) {
      catalogSources.add(row.Source.trim());
    }
  }
}

assert.deepEqual(
  [...catalogSources].filter((source) => !COMPENDIUM_SOURCE_PUBLICATION_DATES[source]),
  []
);

console.log("Compendium reference tests passed.");
