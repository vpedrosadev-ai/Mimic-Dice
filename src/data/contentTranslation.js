import { cleanText } from "../shared/text.js";

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
