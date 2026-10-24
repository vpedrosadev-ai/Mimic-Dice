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

test("dice log labels natural d20 outcomes instead of numeric totals", () => {
  const criticalHtml = renderDiceRollerDock({
    open: true,
    history: [{ id: "roll-20", formula: "d20+8", total: 20, criticalOutcome: "critical", groups: [], rolledAt: 1 }],
    language: "es"
  });
  const fumbleHtml = renderDiceRollerDock({
    open: true,
    history: [{ id: "roll-1", formula: "d20-3", total: 1, criticalOutcome: "fumble", groups: [], rolledAt: 1 }],
    language: "es"
  });

  assert.match(criticalHtml, /dice-roll-entry__total--critical">CRITICO<\/strong>/);
  assert.match(fumbleHtml, /dice-roll-entry__total--fumble">PIFIA<\/strong>/);
});
