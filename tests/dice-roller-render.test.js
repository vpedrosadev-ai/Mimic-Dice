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
  const doubleCriticalHtml = renderDiceRollerDock({
    open: true,
    history: [{ id: "roll-double-20", formula: "d20", total: 20, criticalOutcome: "doubleCritical", groups: [], rolledAt: 1 }],
    language: "es"
  });
  const doubleFumbleHtml = renderDiceRollerDock({
    open: true,
    history: [{ id: "roll-double-1", formula: "d20", total: 1, criticalOutcome: "doubleFumble", groups: [], rolledAt: 1 }],
    language: "es"
  });

  assert.match(criticalHtml, /dice-roll-entry__total--critical">CRITICO!<\/strong>/);
  assert.match(fumbleHtml, /dice-roll-entry__total--fumble">PIFIA!<\/strong>/);
  assert.match(doubleCriticalHtml, /dice-roll-entry__total--critical">DOBLE CRITICO!<\/strong>/);
  assert.match(doubleFumbleHtml, /dice-roll-entry__total--fumble">DOBLE PIFIA!<\/strong>/);
});

test("dice log shows targeted attack and applied damage outcomes", () => {
  const html = renderDiceRollerDock({
    open: true,
    history: [
      {
        id: "attack-roll",
        formula: "d20+7",
        total: 18,
        groups: [],
        rolledAt: 1,
        targetKind: "attack",
        targetName: "Goblin",
        targetStand: "3",
        targetArmorClass: 15,
        targetHit: true
      },
      {
        id: "damage-roll",
        formula: "2d6+3",
        total: 9,
        groups: [],
        rolledAt: 2,
        targetKind: "damage",
        targetName: "Goblin",
        targetStand: "3",
        appliedDamage: 9,
        targetCriticalDamage: true
      }
    ],
    language: "en"
  });

  assert.match(html, /HIT/);
  assert.match(html, /Goblin · Stand 3/);
  assert.match(html, /18 vs AC 15/);
  assert.match(html, /CRITICAL DAMAGE/);
  assert.match(html, /9 HP removed/);
});

test("dice log shows critical attacks as automatic hits and fumbles as automatic misses", () => {
  const html = renderDiceRollerDock({
    open: true,
    history: [
      {
        id: "critical",
        formula: "1d20+5",
        total: 20,
        criticalOutcome: "critical",
        targetKind: "attack",
        targetName: "Ancient Dragon",
        targetStand: "1",
        targetArmorClass: 30,
        targetHit: true,
        groups: []
      },
      {
        id: "fumble",
        formula: "1d20+20",
        total: 1,
        criticalOutcome: "fumble",
        targetKind: "attack",
        targetName: "Goblin",
        targetStand: "2",
        targetArmorClass: 5,
        targetHit: false,
        groups: []
      }
    ],
    language: "en"
  });

  assert.match(html, /Critical: automatic hit\./);
  assert.match(html, /Fumble: automatic miss\./);
});

test("dice log keeps a rival target Armor Class private", () => {
  const html = renderDiceRollerDock({
    open: true,
    history: [{
      id: "private-ac",
      formula: "1d20+6",
      total: 17,
      targetKind: "attack",
      targetName: "Rival creature",
      targetArmorClass: null,
      targetArmorClassHidden: true,
      targetHit: true,
      groups: []
    }],
    language: "en"
  });

  assert.match(html, /HIT/);
  assert.match(html, /Target Armor Class hidden\./);
  assert.doesNotMatch(html, /vs AC/);
});

test("dice log shows concentration outcome and named effect", () => {
  const html = renderDiceRollerDock({
    open: true,
    language: "es",
    history: [{
      id: "concentration-1",
      formula: "1d20+3",
      total: 15,
      groups: [],
      rolledAt: Date.now(),
      contextKind: "concentration",
      concentrationOutcome: "maintains",
      concentrationName: "Bendecir",
      concentrationDc: 10,
      targetName: "Cultista",
      targetStand: "4"
    }]
  });
  assert.match(html, /MANTIENE/);
  assert.match(html, /Concentración: Bendecir/);
  assert.match(html, /CD 10/);
});
