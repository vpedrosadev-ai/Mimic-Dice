import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { fillCharacterPdfTemplate } from "../src/screens/characters/characterPdf.js";

const templateBytes = await readFile(new URL(
  "../src/assets/templates/character-sheet-alternative-form-fillable.pdf",
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

console.log("Character PDF tests passed.");
