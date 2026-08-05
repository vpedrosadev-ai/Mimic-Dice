const CHARACTER_CLASS_DEFINITIONS = Object.freeze([
  { key: "artificer", english: "Artificer", spanish: "Artificiero", aliases: ["artificer", "artificiero"] },
  { key: "barbarian", english: "Barbarian", spanish: "Barbaro", aliases: ["barbarian", "barbaro"] },
  { key: "bard", english: "Bard", spanish: "Bardo", aliases: ["bard", "bardo"] },
  { key: "cleric", english: "Cleric", spanish: "Clerigo", aliases: ["cleric", "clerigo"] },
  { key: "druid", english: "Druid", spanish: "Druida", aliases: ["druid", "druida"] },
  { key: "fighter", english: "Fighter", spanish: "Guerrero", aliases: ["fighter", "guerrero"] },
  { key: "monk", english: "Monk", spanish: "Monje", aliases: ["monk", "monje"] },
  { key: "paladin", english: "Paladin", spanish: "Paladin", aliases: ["paladin"] },
  { key: "ranger", english: "Ranger", spanish: "Explorador", aliases: ["ranger", "explorador"] },
  { key: "rogue", english: "Rogue", spanish: "Picaro", aliases: ["rogue", "picaro"] },
  { key: "sorcerer", english: "Sorcerer", spanish: "Hechicero", aliases: ["sorcerer", "hechicero", "hechizero"] },
  { key: "warlock", english: "Warlock", spanish: "Brujo", aliases: ["warlock", "brujo"] },
  { key: "wizard", english: "Wizard", spanish: "Mago", aliases: ["wizard", "mago"] }
]);

export function normalizeCharacterClassName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCharacterClassDefinition(value) {
  const normalizedValue = normalizeCharacterClassName(value);

  if (!normalizedValue) {
    return null;
  }

  return CHARACTER_CLASS_DEFINITIONS.find((entry) => (
    entry.aliases.some((alias) => normalizedValue === alias || normalizedValue.includes(alias))
  )) ?? null;
}

export function getCharacterClassKey(value) {
  return getCharacterClassDefinition(value)?.key ?? "";
}

export function translateCharacterClassName(value, language = "es") {
  const definition = getCharacterClassDefinition(value);

  if (!definition) {
    return String(value ?? "").trim();
  }

  return language === "en" ? definition.english : definition.spanish;
}

