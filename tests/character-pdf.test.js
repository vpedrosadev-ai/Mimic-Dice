import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  fillCharacterPdfTemplate,
  getCharacterPdfAbilities,
  getCharacterPdfSummons,
  getCharacterSpellCardEffectFontSize,
  getCharacterSpellCardEffectRuns,
  getCharacterSpellCardEffectText,
  getCharacterSpellCardTitle
} from "../src/screens/characters/characterPdf.js";

const templateBytes = await readFile(new URL(
  "../src/assets/templates/character-sheet-alternative-form-fillable.pdf",
  import.meta.url
));
const spellCardTemplateBytes = await readFile(new URL(
  "../src/assets/templates/456029-Optional_Sheet_SPELL_SHEET-A_FILLABLE.pdf",
  import.meta.url
));
const resultBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Personaje de prueba",
  className: "Mago",
  level: 1,
  abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 12, cha: 8 },
  proficiencies: [],
  expertise: [],
  inventory: [],
  features: [],
  spells: [],
  spellSlots: [],
  classEntries: [{ name: "Mago", level: 1 }]
});
const resultDocument = await PDFDocument.load(resultBytes);
const characterNameField = resultDocument.getForm().getTextField("CharacterName");
const characterNameWidgets = characterNameField.acroField.getWidgets();

assert.ok(resultDocument.getPageCount() > 0);
assert.ok(resultDocument.getForm().getFields().length > 0);
assert.equal(characterNameField.getText(), "Personaje de prueba");
assert.ok(characterNameWidgets.length > 0);
assert.ok(characterNameWidgets.every((widget) => widget.getAppearances()?.normal));
assert.equal(new TextDecoder().decode(resultBytes.slice(0, 5)), "%PDF-");

assert.equal(
  getCharacterSpellCardTitle({ name: "Imagen reflejada", source: "PHB'24" }),
  "Imagen reflejada (PHB'24)"
);
assert.equal(
  getCharacterSpellCardEffectText({ text: "Texto base.", atHigherLevels: "*" }),
  "Texto base."
);
assert.equal(
  getCharacterSpellCardEffectText({ text: "Texto base.", atHigherLevels: "En niveles superiores. *" }),
  "Texto base."
);
assert.equal(
  getCharacterSpellCardEffectText({ text: "Texto base.", atHigherLevels: "A niveles superiores: ---" }),
  "Texto base."
);
assert.equal(
  getCharacterSpellCardEffectText({ text: "Base.", atHigherLevels: "Using a Higher-Level Spell Slot. \"\"" }, "en"),
  "Base."
);
assert.equal(
  getCharacterSpellCardEffectText({
    text: "Texto base.",
    atHigherLevels: "Actualización de Cantrip. El daño aumenta en 1d8.\""
  }),
  "Texto base.\n\nA niveles superiores: El daño aumenta en 1d8."
);
assert.equal(
  getCharacterSpellCardEffectText({
    text: "Base.",
    atHigherLevels: "At Higher Levels. The damage increases by 1d6."
  }, "en"),
  "Base.\n\nAt Higher Levels: The damage increases by 1d6."
);

const effectRuns = getCharacterSpellCardEffectRuns({
  text: "Una luz aparece. El objetivo realiza una tirada de salvación de Destreza. Sufre 3d6 de daño de fuego.",
  atHigherLevels: "-"
});
assert.deepEqual(
  effectRuns.filter((run) => run.bold).map((run) => run.text.trim()),
  [
    "tirada de salvación de Destreza",
    "3d6",
    "daño de fuego"
  ]
);
assert.deepEqual(
  getCharacterSpellCardEffectRuns({
    text: "El objetivo realiza una salvación por Fuerza. Si falla, recibe 7d6+40 de daño eléctrico."
  }).filter((run) => run.bold).map((run) => run.text.trim()),
  ["salvación por Fuerza", "7d6+40", "daño eléctrico"]
);
assert.ok(getCharacterSpellCardEffectRuns({
  text: "Texto base.",
  atHigherLevels: "En niveles superiores. El daño aumenta por cada espacio de 2.º nivel por encima del 1.º.\""
}).some((run) => run.text.includes("2.º nivel por encima del 1.º.")));

const fontTestDocument = await PDFDocument.create();
const fontTestFonts = {
  regular: await fontTestDocument.embedFont(StandardFonts.Helvetica),
  bold: await fontTestDocument.embedFont(StandardFonts.HelveticaBold)
};
const fontTestRectangle = { x: 0, y: 0, width: 126, height: 105 };
const shortEffectFontSize = getCharacterSpellCardEffectFontSize({ text: "Una criatura recibe 1d6 de daño." }, fontTestFonts, fontTestRectangle);
const longEffectFontSize = getCharacterSpellCardEffectFontSize({
  text: Array.from({ length: 24 }, () => "La criatura realiza una tirada de salvación y recibe 4d8 de daño si falla.").join(" ")
}, fontTestFonts, fontTestRectangle);
assert.ok(shortEffectFontSize > longEffectFontSize);

const spellCardResultBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Frank",
  className: "Mago",
  level: 3,
  spellAttackModifier: 6,
  spellSaveDc: 14,
  abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
  proficiencies: [],
  expertise: [],
  inventory: [],
  features: [],
  spells: [{
    name: "Imagen reflejada",
    source: "PHB'24",
    level: "2",
    school: "Espejismo",
    range: "Ser",
    castingTime: "Acción",
    duration: "1 minuto",
    components: "V, S",
    text: "Tres duplicados ilusorios aparecen. Cada vez que una criatura te impacte, tira un d6. Los duplicados ignoran cualquier otro daño y efecto.",
    atHigherLevels: "*"
  }],
  spellSlots: [],
  classEntries: [{ name: "Mago", level: 3 }]
}, null, {
  spellCardTemplateBytes
});
const spellCardResultDocument = await PDFDocument.load(spellCardResultBytes);
assert.ok(spellCardResultDocument.getPageCount() > resultDocument.getPageCount());
const spellCardHeaderValues = {
  "SpellCards.1.SpellAttackBonus": "+6",
  "SpellCards.1.SpellSaveDC": "14",
  "SpellCards.1.CantripsKnown": "0",
  "SpellCards.1.SpellsPrepared": "1"
};

Object.entries(spellCardHeaderValues).forEach(([name, value]) => {
  const field = spellCardResultDocument.getForm().getTextField(name);
  assert.equal(field.getText(), value);
  assert.ok(field.acroField.getWidgets().every((widget) => widget.getAppearances()?.normal));
});

const summonEntries = getCharacterPdfSummons({
  summons: [
    { bestiaryEntry: { name: "Wolf", source: "MM", typeLine: "Medium beast", hp: "11", actions: "Bite." } },
    { bestiaryEntry: { name: "Bear", source: "MM", typeLine: "Large beast", hp: "34", actions: "Claws." } }
  ]
});
assert.deepEqual(summonEntries.map((entry) => entry.name), ["Bear", "Wolf"]);

const summonResultBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Druida de prueba",
  className: "Druida",
  level: 2,
  abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 8 },
  proficiencies: [],
  expertise: [],
  inventory: [],
  spells: [],
  summons: [{
    bestiaryEntry: {
      name: "Lobo",
      source: "MM",
      sourceFullName: "Monster Manual",
      typeLine: "Bestia mediana, sin alineamiento",
      ac: "13",
      hp: "11 (2d8 + 2)",
      speed: "40 ft",
      crLabel: "1/4",
      abilities: { STR: 12, DEX: 15, CON: 12, INT: 3, WIS: 12, CHA: 6 },
      skills: "Percepcion +3, Sigilo +4",
      senses: "Percepcion pasiva 13",
      languages: "-",
      traits: "Olfato y oido agudos.",
      actions: "Mordisco. Ataque cuerpo a cuerpo con arma."
    }
  }],
  spellSlots: [],
  classEntries: [{ name: "Druida", level: 2 }]
});
const summonResultDocument = await PDFDocument.load(summonResultBytes);
assert.ok(summonResultDocument.getPageCount() > resultDocument.getPageCount());

const sharedSummonPageBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Druida compacto",
  className: "Druida",
  level: 2,
  abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 8 },
  proficiencies: [],
  expertise: [],
  inventory: [],
  spells: [],
  summons: [
    { bestiaryEntry: { name: "Lobo", source: "MM", typeLine: "Bestia mediana", ac: "13", hp: "11", actions: "Mordisco." } },
    { bestiaryEntry: { name: "Oso", source: "MM", typeLine: "Bestia grande", ac: "11", hp: "34", actions: "Garras." } }
  ],
  spellbookAbilities: [],
  spellSlots: [],
  classEntries: [{ name: "Druida", level: 2 }]
});
const sharedSummonPageDocument = await PDFDocument.load(sharedSummonPageBytes);
assert.equal(sharedSummonPageDocument.getPageCount(), resultDocument.getPageCount() + 1);

const pdfAbilities = getCharacterPdfAbilities({
  spellbookAbilities: [
    { name: "Segundo aliento", description: "Recuperas puntos de golpe.", featureLevel: 2, uses: 1 },
    { name: "Accion impetuosa", description: "Realizas una accion adicional.", featureLevel: 2, uses: 1 },
    { name: "", description: "", uses: 0 }
  ]
});
assert.deepEqual(pdfAbilities.map((ability) => ability.name), ["Segundo aliento", "Accion impetuosa"]);

const sortedPdfAbilities = getCharacterPdfAbilities({
  spellbookAbilities: [
    { name: "Habilidad extensa", description: "Una descripción muy larga que ocupará varias líneas en la tarjeta del PDF. ".repeat(8) },
    { name: "Habilidad breve", description: "Breve." }
  ]
});
assert.deepEqual(sortedPdfAbilities.map((ability) => ability.name), ["Habilidad breve", "Habilidad extensa"]);

const abilityCardResultBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Guerrero de prueba",
  className: "Guerrero",
  level: 2,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  proficiencies: [],
  expertise: [],
  inventory: [],
  spells: [],
  spellbookAbilities: pdfAbilities,
  spellSlots: [],
  classEntries: [{ name: "Guerrero", level: 2 }]
});
const abilityCardResultDocument = await PDFDocument.load(abilityCardResultBytes);
assert.equal(abilityCardResultDocument.getPageCount(), resultDocument.getPageCount() + 1);

console.log("Character PDF tests passed.");
