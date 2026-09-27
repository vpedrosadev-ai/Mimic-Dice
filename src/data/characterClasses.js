const CHARACTER_CLASS_DEFINITIONS = Object.freeze([
  { key: "artificer", english: "Artificer", spanish: "Artífice", aliases: ["artificer", "artifice", "artificiero"] },
  { key: "barbarian", english: "Barbarian", spanish: "Bárbaro", aliases: ["barbarian", "barbaro"] },
  { key: "bard", english: "Bard", spanish: "Bardo", aliases: ["bard", "bardo"] },
  { key: "cleric", english: "Cleric", spanish: "Clérigo", aliases: ["cleric", "clerigo"] },
  { key: "druid", english: "Druid", spanish: "Druida", aliases: ["druid", "druida"] },
  { key: "fighter", english: "Fighter", spanish: "Guerrero", aliases: ["fighter", "guerrero"] },
  { key: "monk", english: "Monk", spanish: "Monje", aliases: ["monk", "monje"] },
  { key: "paladin", english: "Paladin", spanish: "Paladín", aliases: ["paladin"] },
  { key: "ranger", english: "Ranger", spanish: "Explorador", aliases: ["ranger", "explorador"] },
  { key: "rogue", english: "Rogue", spanish: "Pícaro", aliases: ["rogue", "picaro"] },
  { key: "sorcerer", english: "Sorcerer", spanish: "Hechicero", aliases: ["sorcerer", "hechicero", "hechizero"] },
  { key: "warlock", english: "Warlock", spanish: "Brujo", aliases: ["warlock", "brujo"] },
  { key: "wizard", english: "Wizard", spanish: "Mago", aliases: ["wizard", "mago"] },
  { key: "expert sidekick", english: "Expert Sidekick", spanish: "Compañero experto", aliases: ["expert sidekick", "companero experto"] },
  { key: "mystic", english: "Mystic", spanish: "Místico", aliases: ["mystic", "mistico"] },
  { key: "spellcaster sidekick", english: "Spellcaster Sidekick", spanish: "Compañero lanzador de conjuros", aliases: ["spellcaster sidekick", "companero lanzador de conjuros"] },
  { key: "warrior sidekick", english: "Warrior Sidekick", spanish: "Compañero guerrero", aliases: ["warrior sidekick", "companero guerrero"] }
]);

export function getCharacterClassDefinitions() {
  return CHARACTER_CLASS_DEFINITIONS.map((entry) => ({
    ...entry,
    aliases: [...entry.aliases]
  }));
}

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

  const exactMatch = CHARACTER_CLASS_DEFINITIONS.find((entry) => (
    entry.aliases.some((alias) => normalizedValue === normalizeCharacterClassName(alias))
  ));

  if (exactMatch) {
    return exactMatch;
  }

  return CHARACTER_CLASS_DEFINITIONS
    .flatMap((entry) => entry.aliases.map((alias) => ({
      entry,
      alias: normalizeCharacterClassName(alias)
    })))
    .filter(({ alias }) => alias && normalizedValue.includes(alias))
    .sort((left, right) => right.alias.length - left.alias.length)[0]?.entry ?? null;
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

