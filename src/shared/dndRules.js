import { cleanText } from "./text.js";
import { toNumber } from "./numberUtils.js";

const abilityKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export function formatStatsWithModifiers(stats) {
  return formatStatsFromObject(parseStats(stats));
}

export function parseStats(stats) {
  const values = Object.fromEntries(abilityKeys.map((ability) => [ability, 10]));
  const matches = String(stats).matchAll(/\b(STR|DEX|CON|INT|WIS|CHA)\s+(-?\d+)\b/gi);

  for (const match of matches) {
    values[match[1].toUpperCase()] = Number(match[2]);
  }

  return values;
}

export function formatStatsFromObject(values) {
  return abilityKeys
    .map((ability) => `${ability} ${values[ability]} (${formatModifier(getAbilityModifier(values[ability]))})`)
    .join(" ");
}

export function getAbilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function formatModifier(modifier) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export function parseHitPointDiceFormula(value) {
  const text = cleanText(value);
  const formulaMatch = text.match(/\((\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?\)/i);

  if (!formulaMatch) {
    return null;
  }

  const diceCount = Number(formulaMatch[1]);
  const diceSides = Number(formulaMatch[2]);
  const modifier = formulaMatch[4]
    ? (formulaMatch[3] === "-" ? -1 : 1) * Number(formulaMatch[4])
    : 0;

  if (!Number.isFinite(diceCount) || !Number.isFinite(diceSides) || diceCount < 1 || diceSides < 1) {
    return null;
  }

  return {
    diceCount,
    diceSides,
    modifier
  };
}

export function rollHitPointDiceFormula(formula) {
  if (!formula) {
    return 0;
  }

  let total = formula.modifier;

  for (let index = 0; index < formula.diceCount; index += 1) {
    total += 1 + Math.floor(Math.random() * formula.diceSides);
  }

  return total;
}

export function parseItemWeight(value) {
  const text = cleanText(value);

  if (!text) {
    return 0;
  }

  const fractionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);

  if (fractionMatch) {
    return Number(fractionMatch[1].replace(",", ".")) / Number(fractionMatch[2].replace(",", "."));
  }

  const numberMatch = text.match(/\d[\d.,]*/);

  if (!numberMatch) {
    return 0;
  }

  let normalized = numberMatch[0].replace(/(?<=\d)[.,](?=\d{3}(?:[.,]|$))/g, "");
  normalized = normalized.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCrValue(value) {
  const match = String(value).match(/^\s*(\d+)\s*\/\s*(\d+)|^\s*(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  if (match[1] && match[2]) {
    return Number(match[1]) / Number(match[2]);
  }

  return Number(match[3]);
}

export function extractCrBaseLabel(value) {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return "";
  }

  return cleanValue.split("(")[0].trim();
}

export function formatCrNumber(value) {
  const numericValue = toNumber(value);

  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return String(Number(numericValue.toFixed(3)));
}

export function formatCombatCrDisplay(value) {
  const cleanValue = cleanText(value).replace(/^CR\s*/i, "").trim();

  if (!cleanValue) {
    return "";
  }

  const fractionMatch = cleanValue.match(/^(\d+)\s*\/\s*(\d+)/);

  if (fractionMatch && Number(fractionMatch[2]) <= 8) {
    return `${fractionMatch[1]}/${fractionMatch[2]}`;
  }

  const numberMatch = cleanValue.match(/^(\d+(?:\.\d+)?)/);
  return numberMatch ? numberMatch[1] : "";
}
