import test from "node:test";
import assert from "node:assert/strict";

import { getLocalizedSystemTableDefinitions } from "../src/data/tablesSeedData.js";

test("conditions table includes concentrating in Spanish and English", () => {
  const spanish = getLocalizedSystemTableDefinitions("es").find((table) => table.id === "table-system-status");
  const english = getLocalizedSystemTableDefinitions("en").find((table) => table.id === "table-system-status");

  assert.ok(spanish.rows.some(([name]) => name === "Concentrado"));
  assert.ok(english.rows.some(([name]) => name === "Concentrating"));
  assert.equal(spanish.rows.length, english.rows.length);
});
