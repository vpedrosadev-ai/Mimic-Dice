import assert from "node:assert/strict";
import { parseCsv } from "../src/shared/csv.js";

const wrappedSpreadsheetCsv = [
  '"Name,""Source"",""Page"",""Level"",""Text"",""At Higher Levels""";;;;',
  '"Prueba,""PHB"",""1"",""1"",""Primera linea.";;;;',
  ';;;;',
  '"Segunda; parte."",""""";;;;',
  '"Otra,""XGE"",""2"",""2"",""Texto completo."",""En niveles superiores. Mas texto.""";;;;'
].join("\n");

const rows = parseCsv(wrappedSpreadsheetCsv);

assert.equal(rows.length, 2);
assert.equal(rows[0].Name, "Prueba");
assert.equal(rows[0].Text, "Primera linea.\n\nSegunda; parte.");
assert.equal(rows[0]["At Higher Levels"], "");
assert.equal(rows[1].Name, "Otra");
assert.equal(rows[1]["At Higher Levels"], "En niveles superiores. Mas texto.");

console.log("CSV tests passed.");
