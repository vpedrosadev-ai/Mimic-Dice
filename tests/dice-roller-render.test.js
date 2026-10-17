import assert from "node:assert/strict";
import test from "node:test";

import { renderDiceRollerDock } from "../src/screens/dice-roller/diceRollerRender.js";

test("dice log emphasizes total without equals and places clear before help", () => {
  const html = renderDiceRollerDock({
    open: true,
    history: [{ id: "roll-1", formula: "d20+4", total: 17, groups: [], rolledAt: 1 }],
    language: "en"
  });

  assert.match(html, /class="dice-roll-entry__total">17<\/strong>/);
  assert.doesNotMatch(html, /class="dice-roll-entry__total">=/);
  assert.ok(html.indexOf('data-action="clear-dice-roller-history"') < html.indexOf('data-action="toggle-dice-roller-help"'));
});
