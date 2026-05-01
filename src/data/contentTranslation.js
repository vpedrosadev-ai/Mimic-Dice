import { cleanText, slugify } from "../shared/text.js";

export const CONTENT_TRANSLATION_MODE_ORIGINAL = "original";
export const CONTENT_TRANSLATION_MODE_SIDECAR = "sidecar";
export const CONTENT_TRANSLATION_MODE_GLOSSARY = "glossary";

const ENGLISH_MARKERS = [
  " the ",
  " and ",
  " with ",
  " creature",
  " target",
  " spell",
  " action",
  " saving throw",
  " damage",
  " hit points",
  " range",
  " duration",
  " concentration",
  " natural armor",
  " passive perception"
];

const SPANISH_MARKERS = [
  " el ",
  " la ",
  " los ",
  " las ",
  " con ",
  " criatura",
  " objetivo",
  " conjuro",
  " accion",
  " tirada de salvacion",
  " dano",
  " puntos de golpe",
  " alcance",
  " duracion",
  " concentracion",
  " armadura natural",
  " percepcion pasiva"
];

const EXACT_TRANSLATIONS = new Map([
  ["medium", "Mediano"],
  ["small", "Pequeno"],
  ["tiny", "Diminuto"],
  ["large", "Grande"],
  ["huge", "Enorme"],
  ["gargantuan", "Gargantuesco"],
  ["humanoid", "Humanoide"],
  ["aberration", "Aberracion"],
  ["beast", "Bestia"],
  ["celestial", "Celestial"],
  ["construct", "Constructo"],
  ["dragon", "Dragon"],
  ["elemental", "Elemental"],
  ["fey", "Feerico"],
  ["fiend", "Infernal"],
  ["giant", "Gigante"],
  ["monstrosity", "Monstruosidad"],
  ["ooze", "Cieno"],
  ["plant", "Planta"],
  ["undead", "No muerto"],
  ["any alignment", "cualquier alineamiento"],
  ["unaligned", "sin alineamiento"],
  ["neutral", "neutral"],
  ["neutral good", "neutral bueno"],
  ["neutral evil", "neutral maligno"],
  ["chaotic good", "caotico bueno"],
  ["chaotic neutral", "caotico neutral"],
  ["chaotic evil", "caotico maligno"],
  ["lawful good", "legal bueno"],
  ["lawful neutral", "legal neutral"],
  ["lawful evil", "legal maligno"],
  ["common", "comun"],
  ["uncommon", "poco comun"],
  ["rare", "raro"],
  ["very rare", "muy raro"],
  ["legendary", "legendario"],
  ["artifact", "artefacto"],
  ["none", "ninguno"],
  ["unknown", "desconocido"],
  ["varies", "variable"],
  ["action", "accion"],
  ["bonus action", "accion adicional"],
  ["reaction", "reaccion"],
  ["instantaneous", "instantaneo"],
  ["concentration", "concentracion"],
  ["self", "personal"],
  ["touch", "toque"],
  ["cantrip", "truco"],
  ["abjuration", "abjuracion"],
  ["conjuration", "conjuracion"],
  ["divination", "adivinacion"],
  ["enchantment", "encantamiento"],
  ["evocation", "evocacion"],
  ["illusion", "ilusion"],
  ["necromancy", "necromancia"],
  ["transmutation", "transmutacion"]
]);

const PHRASE_TRANSLATIONS = [
  ["passive Perception", "Percepcion pasiva"],
  ["natural armor", "armadura natural"],
  ["mage armor", "armadura de mago"],
  ["hit points", "puntos de golpe"],
  ["Hit Points", "Puntos de golpe"],
  ["saving throw", "tirada de salvacion"],
  ["Saving Throws", "Tiradas de salvacion"],
  ["spell save DC", "CD de salvacion de conjuros"],
  ["spell attacks", "ataques de conjuro"],
  ["melee weapon attack", "ataque de arma cuerpo a cuerpo"],
  ["ranged weapon attack", "ataque de arma a distancia"],
  ["Melee Weapon Attack", "Ataque de arma cuerpo a cuerpo"],
  ["Ranged Weapon Attack", "Ataque de arma a distancia"],
  ["one target", "un objetivo"],
  ["one creature", "una criatura"],
  ["each creature", "cada criatura"],
  ["the target", "el objetivo"],
  ["takes", "recibe"],
  ["damage", "dano"],
  ["fire damage", "dano de fuego"],
  ["cold damage", "dano de frio"],
  ["acid damage", "dano de acido"],
  ["poison damage", "dano de veneno"],
  ["psychic damage", "dano psiquico"],
  ["necrotic damage", "dano necrotico"],
  ["radiant damage", "dano radiante"],
  ["force damage", "dano de fuerza"],
  ["lightning damage", "dano de relampago"],
  ["thunder damage", "dano de trueno"],
  ["bludgeoning damage", "dano contundente"],
  ["piercing damage", "dano perforante"],
  ["slashing damage", "dano cortante"],
  ["must succeed on", "debe superar"],
  ["or be", "o quedar"],
  ["until the end of", "hasta el final de"],
  ["start of its turn", "inicio de su turno"],
  ["end of its turn", "final de su turno"],
  ["short or long rest", "descanso corto o largo"],
  ["long rest", "descanso largo"],
  ["short rest", "descanso corto"],
  ["feet", "pies"],
  ["ft.", "pies"],
  ["Fly", "Volar"],
  ["Swim", "Nadar"],
  ["Climb", "Trepar"],
  ["Burrow", "Excavar"],
  ["Darkvision", "Vision en la oscuridad"],
  ["Blindsight", "Vista ciega"],
  ["Tremorsense", "Sentido sismico"],
  ["Truesight", "Vision verdadera"],
  ["Common", "Comun"],
  ["Deep Speech", "Habla profunda"],
  ["Draconic", "Draconico"],
  ["Elvish", "Elfico"],
  ["Dwarvish", "Enano"],
  ["Giant", "Gigante"],
  ["Infernal", "Infernal"],
  ["Celestial", "Celestial"],
  ["Abyssal", "Abisal"],
  ["Sylvan", "Silvano"],
  ["Undercommon", "Infracomun"],
  ["any language", "cualquier idioma"],
  ["any languages", "cualquier idioma"],
  ["any one language", "un idioma cualquiera"],
  ["any two languages", "dos idiomas cualquiera"],
  ["any three languages", "tres idiomas cualquiera"],
  ["any four languages", "cuatro idiomas cualquiera"],
  ["No action required", "No requiere accion"],
  ["Components", "Componentes"],
  ["Range", "Alcance"],
  ["Duration", "Duracion"],
  ["Classes", "Clases"],
  ["At Higher Levels", "A niveles superiores"],
  ["requires attunement", "requiere sintonia"],
  ["Requires Attunement", "Requiere sintonia"],
  ["weapon", "arma"],
  ["armor", "armadura"],
  ["shield", "escudo"],
  ["wondrous item", "objeto maravilloso"],
  ["potion", "pocion"],
  ["ring", "anillo"],
  ["rod", "vara"],
  ["staff", "baston"],
  ["wand", "varita"],
  ["scroll", "pergamino"]
];
const TERM_TRANSLATIONS = [
  ["Medium", "Mediano"],
  ["Small", "Pequeno"],
  ["Tiny", "Diminuto"],
  ["Large", "Grande"],
  ["Huge", "Enorme"],
  ["Gargantuan", "Gargantuesco"],
  ["Humanoid", "Humanoide"],
  ["Aberration", "Aberracion"],
  ["Beast", "Bestia"],
  ["Construct", "Constructo"],
  ["Dragon", "Dragon"],
  ["Elemental", "Elemental"],
  ["Fey", "Feerico"],
  ["Fiend", "Infernal"],
  ["Monstrosity", "Monstruosidad"],
  ["Undead", "No muerto"],
  ["good", "bueno"],
  ["evil", "maligno"],
  ["lawful", "legal"],
  ["chaotic", "caotico"],
  ["any alignment", "cualquier alineamiento"],
  ["natural armor", "armadura natural"],
  ["passive Perception", "Percepcion pasiva"],
  ["blinded", "cegado"],
  ["charmed", "hechizado"],
  ["deafened", "ensordecido"],
  ["frightened", "asustado"],
  ["grappled", "agarrado"],
  ["incapacitated", "incapacitado"],
  ["invisible", "invisible"],
  ["paralyzed", "paralizado"],
  ["petrified", "petrificado"],
  ["poisoned", "envenenado"],
  ["prone", "derribado"],
  ["restrained", "apresado"],
  ["stunned", "aturdido"],
  ["unconscious", "inconsciente"]
];

const FIELD_TRANSLATION_BY_KIND = {
  bestiary: [
    "Name",
    "Size",
    "Type",
    "Alignment",
    "AC",
    "Speed",
    "Saving Throws",
    "Skills",
    "Damage Vulnerabilities",
    "Damage Resistances",
    "Damage Immunities",
    "Condition Immunities",
    "Senses",
    "Languages",
    "Traits",
    "Actions",
    "Bonus Actions",
    "Reactions",
    "Legendary Actions",
    "Mythic Actions",
    "Lair Actions",
    "Regional Effects",
    "Treasure",
    "Environment"
  ],
  items: [
    "Name",
    "Rarity",
    "Type",
    "Attunement",
    "Damage",
    "Properties",
    "Mastery",
    "Weight",
    "Value",
    "Text"
  ],
  arcanum: [
    "Name",
    "Level",
    "Casting Time",
    "Duration",
    "School",
    "Range",
    "Components",
    "Classes",
    "Optional/Variant Classes",
    "Subclasses",
    "Text",
    "At Higher Levels"
  ]
};

const DETECTION_FIELDS_BY_KIND = {
  bestiary: ["Type", "Alignment", "AC", "Speed", "Senses", "Languages", "Traits", "Actions", "Environment"],
  items: ["Rarity", "Type", "Attunement", "Properties", "Text"],
  arcanum: ["Level", "Casting Time", "Duration", "School", "Range", "Text", "At Higher Levels"]
};

const REQUIRED_FIELDS_BY_KIND = {
  bestiary: ["Name", "Type", "AC"],
  items: ["Name", "Type", "Rarity"],
  arcanum: ["Name", "Level", "School"]
};

const HEADER_ALIASES_BY_KIND = {
  bestiary: {
    Name: ["Name", "Nombre"],
    Source: ["Source", "Fuente"],
    Page: ["Page", "Pagina", "Página"],
    Size: ["Size", "Tamano", "Tamaño"],
    Type: ["Type", "Tipo"],
    Alignment: ["Alignment", "Alineamiento"],
    AC: ["AC", "CA"],
    HP: ["HP", "PG", "Puntos de golpe"],
    Speed: ["Speed", "Velocidad"],
    Strength: ["Strength", "Fuerza"],
    Dexterity: ["Dexterity", "Destreza"],
    Constitution: ["Constitution", "Constitucion", "Constitución"],
    Intelligence: ["Intelligence", "Inteligencia"],
    Wisdom: ["Wisdom", "Sabiduria", "Sabiduría"],
    Charisma: ["Charisma", "Carisma"],
    "Saving Throws": ["Saving Throws", "Salvaciones", "Tiradas de salvacion", "Tiradas de salvación"],
    Skills: ["Skills", "Habilidades"],
    "Damage Vulnerabilities": ["Damage Vulnerabilities", "Vulnerabilidades al dano", "Vulnerabilidades al daño"],
    "Damage Resistances": ["Damage Resistances", "Resistencias al dano", "Resistencias al daño"],
    "Damage Immunities": ["Damage Immunities", "Inmunidades al dano", "Inmunidades al daño"],
    "Condition Immunities": ["Condition Immunities", "Inmunidades a condiciones"],
    Senses: ["Senses", "Sentidos"],
    Languages: ["Languages", "Idiomas"],
    CR: ["CR", "VD", "Desafio", "Desafío"],
    Traits: ["Traits", "Rasgos"],
    Actions: ["Actions", "Acciones"],
    "Bonus Actions": ["Bonus Actions", "Acciones adicionales"],
    Reactions: ["Reactions", "Reacciones"],
    "Legendary Actions": ["Legendary Actions", "Acciones legendarias"],
    "Mythic Actions": ["Mythic Actions", "Acciones miticas", "Acciones míticas"],
    "Lair Actions": ["Lair Actions", "Acciones de guarida"],
    "Regional Effects": ["Regional Effects", "Efectos regionales"],
    Environment: ["Environment", "Entorno", "Ambiente"],
    Treasure: ["Treasure", "Tesoro"]
  },
  items: {
    Name: ["Name", "Nombre"],
    Source: ["Source", "Fuente"],
    Page: ["Page", "Pagina", "Página"],
    Rarity: ["Rarity", "Rareza"],
    Type: ["Type", "Tipo"],
    Attunement: ["Attunement", "Sintonia", "Sintonia", "Sintonización", "Sintonizacion"],
    Damage: ["Damage", "Dano", "Daño"],
    Properties: ["Properties", "Propiedades"],
    Mastery: ["Mastery", "Maestria", "Maestría"],
    Weight: ["Weight", "Peso"],
    Value: ["Value", "Valor"],
    Text: ["Text", "Texto", "Descripcion", "Descripción"]
  },
  arcanum: {
    Name: ["Name", "Nombre"],
    Source: ["Source", "Fuente"],
    Page: ["Page", "Pagina", "Página"],
    Level: ["Level", "Nivel"],
    School: ["School", "Escuela"],
    "Casting Time": ["Casting Time", "Tiempo de lanzamiento", "Tiempo de casteo"],
    Duration: ["Duration", "Duracion", "Duración"],
    Range: ["Range", "Alcance"],
    Components: ["Components", "Componentes"],
    Classes: ["Classes", "Clases"],
    "Optional/Variant Classes": ["Optional/Variant Classes", "Clases opcionales", "Clases variantes", "Clases opcionales/variantes"],
    Subclasses: ["Subclasses", "Subclases"],
    Text: ["Text", "Texto", "Descripcion", "Descripción"],
    "At Higher Levels": ["At Higher Levels", "A Higher Levels", "A niveles superiores"]
  }
};

export function detectCsvContentLanguage(rows, kind) {
  const fields = DETECTION_FIELDS_BY_KIND[kind] ?? [];
  const sampleText = rows
    .slice(0, 80)
    .map((row) => fields.map((field) => cleanText(row[field])).join(" "))
    .join(" ")
    .toLowerCase();

  if (!sampleText) {
    return "en";
  }

  const englishScore = ENGLISH_MARKERS.reduce((score, marker) => score + countOccurrences(sampleText, marker), 0);
  const spanishScore = SPANISH_MARKERS.reduce((score, marker) => score + countOccurrences(sampleText, marker), 0);

  return spanishScore > englishScore ? "es" : "en";
}

export function translateCompendiumRows(rows, kind, targetLanguage) {
  if (targetLanguage !== "es") {
    return rows;
  }

  const fields = FIELD_TRANSLATION_BY_KIND[kind] ?? [];
  return rows.map((row) => {
    const nextRow = { ...row };

    for (const field of fields) {
      if (typeof nextRow[field] === "string") {
        nextRow[field] = translateDndTextToSpanish(nextRow[field]);
      }
    }

    return nextRow;
  });
}

export function normalizeLocalizedCompendiumRows(rows, kind) {
  const headerAliases = HEADER_ALIASES_BY_KIND[kind] ?? {};
  const aliasToCanonical = new Map();

  Object.entries(headerAliases).forEach(([canonicalHeader, aliases]) => {
    aliases.forEach((alias) => {
      aliasToCanonical.set(normalizeHeaderAlias(alias), canonicalHeader);
    });
  });

  return rows.map((row) => {
    const nextRow = {};

    Object.entries(row ?? {}).forEach(([header, value]) => {
      const canonicalHeader = aliasToCanonical.get(normalizeHeaderAlias(header)) ?? header;
      nextRow[canonicalHeader] = value;
    });

    return nextRow;
  });
}

export function mergeCompendiumTranslationRows(baseRows, localizedRows, kind) {
  const normalizedLocalizedRows = normalizeLocalizedCompendiumRows(localizedRows, kind);

  return baseRows.map((baseRow, index) => mergeLocalizedRow(baseRow, normalizedLocalizedRows[index]));
}

export function isCompendiumTranslationSidecarUsable(baseRows, localizedRows, kind) {
  if (!Array.isArray(localizedRows) || localizedRows.length === 0) {
    return false;
  }

  if (!Array.isArray(baseRows) || baseRows.length === 0) {
    return localizedRows.length > 0;
  }

  if (localizedRows.length < Math.max(1, Math.floor(baseRows.length * 0.5))) {
    return false;
  }

  const normalizedLocalizedRows = normalizeLocalizedCompendiumRows(localizedRows, kind);
  const requiredFields = REQUIRED_FIELDS_BY_KIND[kind] ?? ["Name"];
  const sampleRows = normalizedLocalizedRows.slice(0, Math.min(12, normalizedLocalizedRows.length));

  if (sampleRows.length === 0) {
    return false;
  }

  const rowsWithRequiredContent = sampleRows.filter((row) => requiredFields.some((field) => cleanText(row?.[field]).length > 0));
  return rowsWithRequiredContent.length >= Math.max(1, Math.ceil(sampleRows.length * 0.4));
}

export function translateDndTextToSpanish(value) {
  const text = cleanText(value);

  if (!text) {
    return text;
  }

  const exact = EXACT_TRANSLATIONS.get(text.toLowerCase());

  if (exact) {
    return exact;
  }

  let translated = text;

  for (const [source, target] of [...PHRASE_TRANSLATIONS, ...TERM_TRANSLATIONS]) {
    translated = translated.replace(getTranslationPattern(source), target);
  }

  return translated;
}

export function getContentTranslationModeLabel(mode, language) {
  if (language !== "es") {
    return "EN";
  }

  if (mode === CONTENT_TRANSLATION_MODE_SIDECAR) {
    return "ES";
  }

  if (mode === CONTENT_TRANSLATION_MODE_GLOSSARY) {
    return "ES glosario";
  }

  return "ES";
}

function countOccurrences(value, token) {
  const escapedToken = escapeRegExp(token.trim());
  const matches = value.match(new RegExp(`\\b${escapedToken}\\b`, "gi"));
  return matches?.length ?? 0;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTranslationPattern(source) {
  const escapedSource = escapeRegExp(source);
  const startsWithWord = /^\w/.test(source);
  const endsWithWord = /\w$/.test(source);
  return new RegExp(`${startsWithWord ? "\\b" : ""}${escapedSource}${endsWithWord ? "\\b" : ""}`, "gi");
}

function normalizeHeaderAlias(value) {
  return slugify(value).replace(/-/g, "");
}

function mergeLocalizedRow(baseRow, localizedRow = {}) {
  const nextRow = { ...(baseRow ?? {}) };

  Object.entries(localizedRow ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string" && cleanText(value) === "") {
      return;
    }

    nextRow[key] = value;
  });

  return nextRow;
}
