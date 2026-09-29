import { cleanText, normalizeSearchText } from "./text.js";

const spellcastingFields = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "mythicActions"
];

export function parseBestiarySpellcasting(entry) {
  const text = spellcastingFields
    .map((field) => cleanText(entry?.[field]))
    .filter(Boolean)
    .join("\n\n");

  if (!text) {
    return null;
  }

  const groups = text
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean)
    .map(parseSpellcastingGroup)
    .filter(Boolean)
    .map((group, index) => ({
      ...group,
      id: `${group.kind}-${group.level || 0}-${group.uses}-${index + 1}`
    }));

  if (groups.length === 0) {
    return null;
  }

  return {
    ability: parseSpellcastingAbility(text),
    saveDc: parseSpellSaveDc(text),
    attackModifier: parseSpellAttackModifier(text),
    groups
  };
}

function parseSpellcastingGroup(line) {
  const atWillMatch = line.match(/^(at will|a voluntad|cantrips?\s*\(at will\)|trucos?\s*\(a voluntad\))\s*:\s*(.+)$/i);

  if (atWillMatch) {
    return buildGroup("at-will", atWillMatch[1], 0, 0, atWillMatch[2]);
  }

  const dailyMatch = line.match(/^(\d+)\s*\/\s*(?:day|d[ií]a)(?:\s+(?:each|cada uno))?\s*:\s*(.+)$/i);

  if (dailyMatch) {
    return buildGroup("daily", line.slice(0, line.indexOf(":")), Number(dailyMatch[1]), 0, dailyMatch[2]);
  }

  const englishSlotMatch = line.match(/^(\d+)(?:st|nd|rd|th)\s+level\s*\((\d+)\s+slots?\)\s*:\s*(.+)$/i);

  if (englishSlotMatch) {
    return buildGroup("slots", line.slice(0, line.indexOf(":")), Number(englishSlotMatch[2]), Number(englishSlotMatch[1]), englishSlotMatch[3]);
  }

  const spanishSlotMatch = line.match(/^(\d+)(?:er|do|ro|to|mo|vo|no|\.?[ºª])?\s+nivel\s*\((\d+)\s+espacios?\)\s*:\s*(.+)$/i);

  if (spanishSlotMatch) {
    return buildGroup("slots", line.slice(0, line.indexOf(":")), Number(spanishSlotMatch[2]), Number(spanishSlotMatch[1]), spanishSlotMatch[3]);
  }

  return null;
}

function buildGroup(kind, label, uses, level, spellList) {
  const spells = splitSpellList(spellList);

  if (spells.length === 0) {
    return null;
  }

  return {
    kind,
    label: cleanText(label),
    uses: Math.max(0, Math.floor(Number(uses) || 0)),
    level: Math.max(0, Math.floor(Number(level) || 0)),
    spells
  };
}

function splitSpellList(value) {
  return cleanText(value)
    .split(",")
    .map((spell) => cleanText(spell).replace(/[.;]+$/g, ""))
    .filter(Boolean)
    .map((displayName) => ({
      displayName,
      lookupName: cleanText(displayName)
        .replace(/\s*\([^)]*\)\s*$/g, "")
        .replace(/\*+$/g, "")
        .trim()
    }))
    .filter((spell) => spell.lookupName);
}

function parseSpellcastingAbility(text) {
  const patterns = [
    /(?:using|utilizando)\s+([\p{L}]+)\s+(?:as|como)\s+(?:the\s+)?(?:spellcasting ability|aptitud de lanzamiento de conjuros)/iu,
    /(?:spellcasting ability is|habilidad para lanzar hechizos es|aptitud de lanzamiento de conjuros es)\s+([\p{L}]+)/iu
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function parseSpellSaveDc(text) {
  const match = normalizeSearchText(text).match(/(?:spell save|salvacion de (?:conjuro|hechizos?))\s*(?:dc|cd)\s*(\d+)/i);
  return match ? Number(match[1]) : "";
}

function parseSpellAttackModifier(text) {
  const match = normalizeSearchText(text).match(/([+-]\d+)\s+(?:to hit with spell attacks|para (?:golpear|impactar) con ataques de hechizos)/i);
  return match ? Number(match[1]) : "";
}
