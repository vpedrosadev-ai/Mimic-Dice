import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBestiaryEntry } from "../src/data/compendiumEntries.js";

test("localized bestiary rows resolve portraits through canonical identity", () => {
  const entry = normalizeBestiaryEntry({
    Name: "Aboleth español",
    Source: "MM-14",
    __mimicIdentityBaseName: "Aboleth",
    __mimicIdentityBaseSource: "MM-14"
  }, 0, {
    "aboleth||mm-14": {
      imageUrl: "images/bestiary/portraits/mm-14/aboleth.webp",
      tokenUrl: "images/bestiary/tokens/mm-14/aboleth.webp"
    }
  });

  assert.equal(entry.imageUrl, "images/bestiary/portraits/mm-14/aboleth.webp");
  assert.equal(entry.tokenUrl, "images/bestiary/tokens/mm-14/aboleth.webp");
});
