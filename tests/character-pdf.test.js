import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import {
  fillCharacterPdfTemplate,
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
  effectRuns.filter((run) => run.text.trim()).map((run) => ({ text: run.text.trim(), bold: run.bold })),
  [
    { text: "Una luz aparece.", bold: false },
    { text: "El objetivo realiza una tirada de salvación de Destreza.", bold: true },
    { text: "Sufre 3d6 de daño de fuego.", bold: true }
  ]
);
assert.ok(getCharacterSpellCardEffectRuns({
  text: "Texto base.",
  atHigherLevels: "En niveles superiores. El daño aumenta por cada espacio de 2.º nivel por encima del 1.º.\""
}).some((run) => run.text.includes("2.º nivel por encima del 1.º.")));

const spellCardResultBytes = await fillCharacterPdfTemplate(templateBytes, {
  name: "Frank",
  className: "Mago",
  level: 3,
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

console.log("Character PDF tests passed.");
