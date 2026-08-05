import { translateCharacterClassName } from "../../data/characterClasses.js";

let pdfLibraryPromise = null;

function loadPdfLibrary() {
  pdfLibraryPromise ??= import("pdf-lib");
  return pdfLibraryPromise;
}

const ABILITY_META = Object.freeze({
  str: { label: "Strength", short: "Str", scoreFields: ["STR", "STRscore"], modifierFields: ["STRmod", "STRbonus"], frontScoreField: "Front_Str Mod", frontModifierField: "Front_Str Score" },
  dex: { label: "Dexterity", short: "Dex", scoreFields: ["DEX", "DEXscore"], modifierFields: ["DEXmod ", "DEXbonus"], frontScoreField: "Front_Dex Mod", frontModifierField: "Front_Dex Score" },
  con: { label: "Constitution", short: "Con", scoreFields: ["CON", "CONscore"], modifierFields: ["CONmod", "CONbonus"], frontScoreField: "Front_Con Mod", frontModifierField: "Front_Con Score" },
  int: { label: "Intelligence", short: "Int", scoreFields: ["INT", "INTscore"], modifierFields: ["INTmod", "INTbonus"], frontScoreField: "Front_Int Mod", frontModifierField: "Front_Int Score" },
  wis: { label: "Wisdom", short: "Wis", scoreFields: ["WIS", "WISscore"], modifierFields: ["WISmod", "WISbonus"], frontScoreField: "Front_Wis Mod", frontModifierField: "Front_Wis Score" },
  cha: { label: "Charisma", short: "Cha", scoreFields: ["CHA", "CHAscore"], modifierFields: ["CHamod", "CHAbonus"], frontScoreField: "Front_Cha Mod", frontModifierField: "Front_Cha Score" }
});

const SKILL_META = Object.freeze({
  athletics: { label: "Athletics", ability: "str", valueFields: ["Athletics", "Front_Skill Athletics"], checkboxFields: ["ChBx Athletics", "Front_Proficiency Athletics", "athPROF"] },
  acrobatics: { label: "Acrobatics", ability: "dex", valueFields: ["Acrobatics", "Front_Skill Acrobatics"], checkboxFields: ["ChBx Acrobatics", "Front_Proficiency Acrobatics", "acroPROF"] },
  sleightOfHand: { label: "Sleight of Hand", ability: "dex", valueFields: ["SleightofHand", "Front_Skill Sleight of Hand"], checkboxFields: ["ChBx Sleight", "Front_Proficiency Sleight of Hand", "sohPROF"] },
  stealth: { label: "Stealth", ability: "dex", valueFields: ["Stealth", "Front_Skill Stealth"], checkboxFields: ["ChBx Stealth", "Front_Proficiency Stealth", "stealthPROF"] },
  arcana: { label: "Arcana", ability: "int", valueFields: ["Arcana", "Front_Skill Arcana"], checkboxFields: ["ChBx Arcana", "Front_Proficiency Arcana", "arcanaPROF"] },
  history: { label: "History", ability: "int", valueFields: ["History", "Front_Skill History"], checkboxFields: ["ChBx History", "Front_Proficiency History", "histPROF"] },
  investigation: { label: "Investigation", ability: "int", valueFields: ["Investigation", "Front_Skill Investigation"], checkboxFields: ["ChBx Investigation", "Front_Proficiency Investigation", "investPROF"] },
  nature: { label: "Nature", ability: "int", valueFields: ["Nature", "Front_Skill Nature"], checkboxFields: ["ChBx Nature", "Front_Proficiency Nature", "naturePROF"] },
  religion: { label: "Religion", ability: "int", valueFields: ["Religion", "Front_Skill Religion"], checkboxFields: ["ChBx Religion", "Front_Proficiency Religion", "religPROF"] },
  animalHandling: { label: "Animal Handling", ability: "wis", valueFields: ["Animal Handling", "AnHan", "Front_Skill Animal Handling"], checkboxFields: ["ChBx Animal", "Front_Proficiency Animal Handling", "anhanPROF"] },
  insight: { label: "Insight", ability: "wis", valueFields: ["Insight", "Front_Skill Insight"], checkboxFields: ["ChBx Insight", "Front_Proficiency Insight", "insightPROF"] },
  medicine: { label: "Medicine", ability: "wis", valueFields: ["Medicine", "Front_Skill Medicine"], checkboxFields: ["ChBx Medicine", "Front_Proficiency Medicine", "medPROF"] },
  perception: { label: "Perception", ability: "wis", valueFields: ["Perception", "Front_Skill Perception"], checkboxFields: ["ChBx Perception", "Front_Proficiency Perception", "perPROF"] },
  survival: { label: "Survival", ability: "wis", valueFields: ["Survival", "Front_Skill Survival"], checkboxFields: ["ChBx Survival", "Front_Proficiency Survival", "survPROF"] },
  deception: { label: "Deception", ability: "cha", valueFields: ["Deception", "Front_Skill Deception"], checkboxFields: ["ChBx Deception", "Front_Proficiency Deception", "decepPROF"] },
  intimidation: { label: "Intimidation", ability: "cha", valueFields: ["Intimidation", "Front_Skill Intimidation"], checkboxFields: ["ChBx Intimidation", "Front_Proficiency Intimidation", "intimPROF"] },
  performance: { label: "Performance", ability: "cha", valueFields: ["Performance", "Front_Skill Performance"], checkboxFields: ["ChBx Performance", "Front_Proficiency Performance", "perfPROF"] },
  persuasion: { label: "Persuasion", ability: "cha", valueFields: ["Persuasion", "Front_Skill Persuasion"], checkboxFields: ["ChBx Persuasion", "Front_Proficiency Persuasion", "persPROF"] }
});

const ALTERNATIVE_SPELL_LEVEL_FIELDS = Object.freeze({
  0: Array.from({ length: 8 }, (_, index) => `Spells${index + 1}`),
  1: Array.from({ length: 12 }, (_, index) => `Spells${index + 9}`),
  2: Array.from({ length: 13 }, (_, index) => `Spells${index + 21}`),
  3: Array.from({ length: 13 }, (_, index) => `Spells${index + 34}`),
  4: Array.from({ length: 13 }, (_, index) => `Spells${index + 47}`),
  5: Array.from({ length: 9 }, (_, index) => `Spells${index + 60}`),
  6: Array.from({ length: 9 }, (_, index) => `Spells${index + 69}`),
  7: Array.from({ length: 9 }, (_, index) => `Spells${index + 78}`),
  8: Array.from({ length: 7 }, (_, index) => `Spells${index + 87}`),
  9: Array.from({ length: 7 }, (_, index) => `Spells${index + 94}`)
});

const TEMPLATE_SAVE_FIELDS = Object.freeze({
  str: { value: "SavingThrows", checkbox: "ST Strength" },
  dex: { value: "SavingThrows2", checkbox: "ST Dexterity" },
  con: { value: "SavingThrows3", checkbox: "ST Constitution" },
  int: { value: "SavingThrows4", checkbox: "ST Intelligence" },
  wis: { value: "SavingThrows5", checkbox: "ST Wisdom" },
  cha: { value: "SavingThrows6", checkbox: "ST Charisma" }
});

const TEMPLATE_SKILL_FIELDS = Object.freeze({
  athletics: { value: "Athletics", checkbox: "ChBx Athletics" },
  acrobatics: { value: "Acrobatics", checkbox: "ChBx Acrobatics" },
  sleightOfHand: { value: "SleightofHand", checkbox: "ChBx Sleight" },
  stealth: { value: "Stealth", checkbox: "ChBx Stealth" },
  arcana: { value: "Arcana", checkbox: "ChBx Arcana" },
  history: { value: "History", checkbox: "ChBx History" },
  investigation: { value: "Investigation", checkbox: "ChBx Investigation" },
  nature: { value: "Nature", checkbox: "ChBx Nature" },
  religion: { value: "Religion", checkbox: "ChBx Religion" },
  animalHandling: { value: "Animal Handling", checkbox: "ChBx Animal" },
  insight: { value: "Insight", checkbox: "ChBx Insight" },
  medicine: { value: "Medicine", checkbox: "ChBx Medicine" },
  perception: { value: "Perception", checkbox: "ChBx Perception" },
  survival: { value: "Survival", checkbox: "ChBx Survival" },
  deception: { value: "Deception", checkbox: "ChBx Deception" },
  intimidation: { value: "Intimidation", checkbox: "ChBx Intimidation" },
  performance: { value: "Performance", checkbox: "ChBx Performance" },
  persuasion: { value: "Persuasion", checkbox: "ChBx Persuasion" }
});

const SPELL_SHEET_LEVEL_FIELDS = Object.freeze({
  0: ["Spells 1014", "Spells 1016", "Spells 1017", "Spells 1018", "Spells 1019", "Spells 1020", "Spells 1021", "Spells 1022"],
  1: ["Spells 1015", "Spells 1023", "Spells 1024", "Spells 1025", "Spells 1026", "Spells 1027", "Spells 1028", "Spells 1029", "Spells 1030", "Spells 1031", "Spells 1032", "Spells 1033"],
  2: ["Spells 1046", "Spells 1034", "Spells 1035", "Spells 1036", "Spells 1037", "Spells 1038", "Spells 1039", "Spells 1040", "Spells 1041", "Spells 1042", "Spells 1043", "Spells 1044", "Spells 1045"],
  3: ["Spells 1048", "Spells 1047", "Spells 1049", "Spells 1050", "Spells 1051", "Spells 1052", "Spells 1053", "Spells 1054", "Spells 1055", "Spells 1056", "Spells 1057", "Spells 1058", "Spells 1059"],
  4: ["Spells 1061", "Spells 1060", "Spells 1062", "Spells 1063", "Spells 1064", "Spells 1065", "Spells 1066", "Spells 1067", "Spells 1068", "Spells 1069", "Spells 1070", "Spells 1071", "Spells 1072"],
  5: ["Spells 1074", "Spells 1073", "Spells 1075", "Spells 1076", "Spells 1077", "Spells 1078", "Spells 1079", "Spells 1080", "Spells 1081"],
  6: ["Spells 1083", "Spells 1082", "Spells 1084", "Spells 1085", "Spells 1086", "Spells 1087", "Spells 1088", "Spells 1089", "Spells 1090"],
  7: ["Spells 1092", "Spells 1091", "Spells 1093", "Spells 1094", "Spells 1095", "Spells 1096", "Spells 1097", "Spells 1098", "Spells 1099"],
  8: ["Spells 10101", "Spells 10100", "Spells 10102", "Spells 10103", "Spells 10104", "Spells 10105", "Spells 10106"],
  9: ["Spells 10108", "Spells 10107", "Spells 10109", "Spells 101010", "Spells 101011", "Spells 101012", "Spells 101013"]
});

const SPELL_SHEET_SLOT_FIELDS = Object.freeze(Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => {
    const level = index + 1;
    const fieldSuffix = index + 19;
    return [level, { total: `SlotsTotal ${fieldSuffix}`, remaining: `SlotsRemaining ${fieldSuffix}` }];
  })
));

function normalizeFieldName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanPdfText(value) {
  return String(value ?? "").replace(/\u0000/g, "").trim();
}

function toPdfText(value) {
  return Array.from(String(value ?? "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
  ).map((character) => character.codePointAt(0) <= 255 ? character : "?").join("");
}

function parsePdfNumber(value) {
  const match = cleanPdfText(value).replace(",", ".").match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function clampInteger(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(minimum, Math.min(maximum, Math.floor(numericValue)))
    : null;
}

function getAbilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function getDetectedAbilityScore(reader, meta) {
  const standardScore = parsePdfNumber(reader.getText(meta.scoreFields));

  if (standardScore !== null && standardScore >= 1 && standardScore <= 30) {
    return Math.floor(standardScore);
  }

  const visualScore = parsePdfNumber(reader.getText(meta.frontScoreField));
  const visualModifier = parsePdfNumber(reader.getText(meta.frontModifierField));
  const visualScoreValid = visualScore !== null && visualScore >= 1 && visualScore <= 30;
  const namedScoreValid = visualModifier !== null && visualModifier >= 1 && visualModifier <= 30;

  if (visualScoreValid && visualModifier === getAbilityModifier(visualScore)) {
    return Math.floor(visualScore);
  }

  if (namedScoreValid && visualScore === getAbilityModifier(visualModifier)) {
    return Math.floor(visualModifier);
  }

  if (visualScoreValid) {
    return Math.floor(visualScore);
  }

  return namedScoreValid ? Math.floor(visualModifier) : null;
}

function getLevelProficiencyBonus(level) {
  return Math.max(2, Math.min(6, Math.ceil(Math.max(1, Number(level) || 1) / 4) + 1));
}

function formatSigned(value) {
  const numericValue = Number(value) || 0;
  return numericValue >= 0 ? `+${numericValue}` : String(numericValue);
}

function createPdfFieldReader(form, pdfLibrary) {
  const { PDFCheckBox, PDFDropdown, PDFOptionList, PDFTextField } = pdfLibrary;
  const fields = new Map(form.getFields().map((field) => [normalizeFieldName(field.getName()), field]));

  return {
    getField(names) {
      const aliases = Array.isArray(names) ? names : [names];
      return aliases.map((name) => fields.get(normalizeFieldName(name))).find(Boolean) ?? null;
    },
    getText(names) {
      const aliases = Array.isArray(names) ? names : [names];

      for (const name of aliases) {
        const field = fields.get(normalizeFieldName(name));
        const value = field instanceof PDFTextField
          ? cleanPdfText(field.getText())
          : field instanceof PDFDropdown || field instanceof PDFOptionList
            ? cleanPdfText(field.getSelected()?.[0])
            : "";

        if (value) {
          return value;
        }
      }

      return "";
    },
    isChecked(names) {
      const aliases = Array.isArray(names) ? names : [names];
      return aliases.some((name) => {
        const field = fields.get(normalizeFieldName(name));
        return field instanceof PDFCheckBox && field.isChecked();
      });
    }
  };
}

function parseClassAndLevel(value) {
  const normalizedValue = cleanPdfText(value);

  if (!normalizedValue) {
    return {};
  }

  const match = normalizedValue.match(/^(.*?)(?:\s+|\s*\/\s*)(\d{1,2})$/);

  if (!match) {
    return { className: normalizedValue };
  }

  return {
    className: cleanPdfText(match[1]),
    level: clampInteger(match[2], 1, 20)
  };
}

function normalizeSpellLevel(value) {
  const normalizedValue = cleanPdfText(value);
  const compactValue = normalizeFieldName(normalizedValue);

  if (["c", "cantrip", "truco", "pot"].includes(compactValue)) {
    return "Truco";
  }

  const numericLevel = clampInteger(parsePdfNumber(normalizedValue), 0, 9);
  return numericLevel === 0 ? "Truco" : numericLevel ? String(numericLevel) : normalizedValue;
}

function addDetectedText(target, key, value) {
  const normalizedValue = cleanPdfText(value);

  if (normalizedValue) {
    target[key] = normalizedValue;
  }
}

function addDetectedNumber(target, key, value, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const numericValue = parsePdfNumber(value);

  if (numericValue !== null) {
    target[key] = Math.max(minimum, Math.min(maximum, numericValue));
  }
}

export async function extractCharacterDataFromPdf(source) {
  const { PDFDocument, ...pdfFieldTypes } = await loadPdfLibrary();
  const sourceBytes = source instanceof Uint8Array ? source : new Uint8Array(await source.arrayBuffer());
  const document = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const form = document.getForm();
  const reader = createPdfFieldReader(form, pdfFieldTypes);
  const data = {};
  const abilities = {};

  addDetectedText(data, "name", reader.getText(["CharacterName", "Character Name", "Front_Character Name"]));
  addDetectedText(data, "playerName", reader.getText(["PlayerName", "Player Name", "Front_Player Name"]));
  addDetectedText(data, "species", reader.getText(["Race", "Race ", "Species", "Front_Race"]));
  addDetectedText(data, "background", reader.getText(["Background", "Front_Background"]));

  const combinedClass = parseClassAndLevel(reader.getText(["ClassLevel", "Class & Level", "Class and Level"]));
  const explicitClassName = reader.getText(["Class", "Clase", "Character Class", "Front_Class", "Front_Class Name"]);
  const explicitSubclassName = reader.getText(["Subclass", "Sub-class", "Archetype", "Front_Archetype"]);
  const explicitLevel = parsePdfNumber(reader.getText(["Level", "Lvl", "Front_Level"]));
  addDetectedText(data, "className", explicitClassName || combinedClass.className);
  addDetectedText(data, "subclassName", explicitSubclassName);
  const detectedLevel = clampInteger(explicitLevel ?? combinedClass.level, 1, 20);

  if (detectedLevel !== null) {
    data.level = detectedLevel;
  }

  addDetectedNumber(data, "experiencePoints", reader.getText(["XP", "ExperiencePoints", "Experience Points", "Front_XP"]), 0);
  addDetectedNumber(data, "proficiencyBonus", reader.getText(["ProfBonus", "Proficiency Bonus", "Front_Proficiency"]), 0, 20);
  addDetectedNumber(data, "armorClass", reader.getText(["AC", "Armor Class", "Front_AC"]), 0, 99);
  addDetectedNumber(data, "initiativeBonus", reader.getText(["Initiative", "Init", "Front_Initiative"]), -99, 99);
  const detectedSpeed = reader.getText(["Speed", "Front_Speed"]);

  if (detectedSpeed) {
    data.speed = /^\d+(?:[.,]\d+)?$/.test(detectedSpeed) ? `${detectedSpeed} ft` : detectedSpeed;
  }
  addDetectedNumber(data, "maxHp", reader.getText(["HPMax", "Max HP", "Front_Max HP"]), 0);
  addDetectedNumber(data, "currentHp", reader.getText(["HPCurrent", "CurrentHP", "Current HP", "Front_Current HP"]), 0);
  addDetectedNumber(data, "tempHp", reader.getText(["HPTemp", "TempHP", "Temp HP", "Front_Temp HP"]), 0);
  addDetectedNumber(data, "spellAttackModifier", reader.getText(["Spell Atk", "Spell Attack", "SAB", "Front_Spell Atk"]), -99, 99);
  addDetectedNumber(data, "spellSaveDc", reader.getText(["Spell Save DC", "SpellSaveDC", "Spell DC", "Front_Spell DC"]), 0, 99);

  Object.entries(ABILITY_META).forEach(([abilityKey, meta]) => {
    const score = getDetectedAbilityScore(reader, meta);

    if (score !== null) {
      abilities[abilityKey] = score;
    }
  });

  if (Object.keys(abilities).length > 0) {
    data.abilities = abilities;
  }

  const proficiencyBonus = Number(data.proficiencyBonus) || getLevelProficiencyBonus(data.level);
  const proficiencies = [];

  Object.entries(ABILITY_META).forEach(([abilityKey, meta]) => {
    const abilityPrefix = abilityKey.toUpperCase();
    const saveAliases = [`ST ${meta.label}`, `${abilityPrefix}savePROF`, `Front_Save ${meta.short}`, `Front_Save ${meta.label}`];
    const saveValueAliases = [TEMPLATE_SAVE_FIELDS[abilityKey].value, `${abilityPrefix}save`, `Front_${meta.short} Save Throw`];
    const saveValue = parsePdfNumber(reader.getText(saveValueAliases));
    const abilityModifier = abilities[abilityKey] === undefined ? null : getAbilityModifier(abilities[abilityKey]);

    if (reader.isChecked(saveAliases) || (
      saveValue !== null
      && abilityModifier !== null
      && proficiencyBonus > 0
      && saveValue - abilityModifier >= proficiencyBonus
    )) {
      proficiencies.push(`save:${abilityKey}`);
    }
  });

  Object.entries(SKILL_META).forEach(([skillId, meta]) => {
    const skillValue = parsePdfNumber(reader.getText(meta.valueFields));
    const abilityModifier = abilities[meta.ability] === undefined ? null : getAbilityModifier(abilities[meta.ability]);

    if (reader.isChecked(meta.checkboxFields) || (
      skillValue !== null
      && abilityModifier !== null
      && proficiencyBonus > 0
      && skillValue - abilityModifier >= proficiencyBonus
    )) {
      proficiencies.push(`skill:${skillId}`);
    }
  });

  if (proficiencies.length > 0) {
    data.proficiencies = [...new Set(proficiencies)];
  }

  const spells = [];

  for (let index = 1; index <= 64; index += 1) {
    const name = reader.getText([`Front_Spell Name ${index}`, `Spell Name ${index}`, `SpellName${index}`]);

    if (!name) {
      continue;
    }

    spells.push({
      name,
      level: normalizeSpellLevel(reader.getText([`Front_Spell Level ${index}`, `Spell Level ${index}`, `SpellLevel${index}`])),
      prepared: false
    });
  }

  Object.entries(ALTERNATIVE_SPELL_LEVEL_FIELDS).forEach(([rawLevel, fieldNames]) => {
    const level = Number(rawLevel);

    fieldNames.forEach((fieldName) => {
      const name = reader.getText(fieldName);

      if (name && !spells.some((spell) => normalizeFieldName(spell.name) === normalizeFieldName(name))) {
        spells.push({
          name,
          level: level === 0 ? "Truco" : String(level),
          prepared: false
        });
      }
    });
  });

  if (spells.length > 0) {
    data.spells = spells;
  }

  const importedSpellSlots = [];
  const spellSlotLevel = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Level"])), 1, 9);
  const spellSlotTotal = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Total"])), 0, 99);
  const spellSlotUsed = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Used"])), 0, 99) ?? 0;

  if (spellSlotLevel !== null && spellSlotTotal !== null) {
    importedSpellSlots.push({
      level: spellSlotLevel,
      slots: spellSlotTotal,
      spent: Array.from({ length: spellSlotTotal }, (_, index) => index < Math.min(spellSlotUsed, spellSlotTotal))
    });
  }


  for (let level = 1; level <= 9; level += 1) {
    const total = clampInteger(parsePdfNumber(reader.getText([`SlotsTot${level}`, `SlotsTotal${level}`])), 0, 99);

    if (total === null) {
      continue;
    }

    const remaining = clampInteger(parsePdfNumber(reader.getText([`SlotsRemaining${level}`])), 0, total) ?? total;
    const spentCount = Math.max(0, total - remaining);
    const existingIndex = importedSpellSlots.findIndex((entry) => entry.level === level);
    const slotEntry = {
      level,
      slots: total,
      spent: Array.from({ length: total }, (_, index) => index < spentCount)
    };

    if (existingIndex >= 0) {
      importedSpellSlots[existingIndex] = slotEntry;
    } else {
      importedSpellSlots.push(slotEntry);
    }
  }

  if (importedSpellSlots.length > 0) {
    data.spellSlots = importedSpellSlots.sort((left, right) => left.level - right.level);
    data.spellSlotLevelsVisible = Math.max(...importedSpellSlots.map((entry) => entry.level));
  }

  const noteSections = [
    ["Rasgos", reader.getText(["Features and Traits", "FeaturesTraits", "Feat+Traits", "Front_Racial Traits"])],
    ["Personalidad", reader.getText(["PersonalityTraits", "PersonalityTraits "])],
    ["Ideales", reader.getText(["Ideals"])],
    ["Vinculos", reader.getText(["Bonds"])],
    ["Defectos", reader.getText(["Flaws"])],
    ["Competencias e idiomas", reader.getText(["ProficienciesLang", "ProfsLangs", "Front_Languages", "Front_Tools"])]
  ].filter(([, value]) => value);

  if (noteSections.length > 0) {
    data.notes = noteSections.map(([label, value]) => `${label}: ${value}`).join("\n\n");
  }

  return data;
}

function createPdfFieldWriter(form, pdfLibrary) {
  const { PDFCheckBox, PDFTextField } = pdfLibrary;
  const fields = new Map(form.getFields().map((field) => [normalizeFieldName(field.getName()), field]));

  return {
    hasText(names) {
      const aliases = Array.isArray(names) ? names : [names];
      return aliases.some((name) => fields.get(normalizeFieldName(name)) instanceof PDFTextField);
    },
    setText(names, value) {
      const aliases = Array.isArray(names) ? names : [names];

      if (value === undefined || value === null || value === "") {
        return false;
      }

      for (const name of aliases) {
        const field = fields.get(normalizeFieldName(name));

        if (field instanceof PDFTextField) {
          field.setText(toPdfText(value));
          return true;
        }
      }

      return false;
    },
    setChecked(names, checked) {
      const aliases = Array.isArray(names) ? names : [names];

      for (const name of aliases) {
        const field = fields.get(normalizeFieldName(name));

        if (field instanceof PDFCheckBox) {
          if (checked) {
            field.check();
          } else {
            field.uncheck();
          }

          return true;
        }
      }

      return false;
    }
  };
}

function getCharacterPdfClassEntries(character, contentLanguage = "es") {
  const sourceEntries = (Array.isArray(character?.classEntries) ? character.classEntries : [])
    .map((entry, index) => ({
      ...entry,
      _sourceIndex: index,
      name: cleanPdfText(entry?.name ?? entry?.className),
      subclassName: cleanPdfText(entry?.subclassName),
      level: clampInteger(entry?.level, 0, 20) ?? 0
    }))
    .filter((entry) => entry.name || entry.subclassName || entry.level > 0);
  const fallbackEntries = sourceEntries.length > 0
    ? sourceEntries
    : [{
      _sourceIndex: 0,
      name: cleanPdfText(character?.className),
      subclassName: cleanPdfText(character?.subclassName),
      level: clampInteger(character?.level, 1, 20) ?? 1
    }];
  const visibleEntries = character?.isMulticlass === true
    ? [...fallbackEntries]
      .sort((left, right) => right.level - left.level || left._sourceIndex - right._sourceIndex)
      .slice(0, 2)
    : fallbackEntries.slice(0, 1);

  return visibleEntries.map(({ _sourceIndex, ...entry }) => ({
    ...entry,
    name: translateCharacterClassName(entry.name, contentLanguage)
  }));
}

function getCharacterPdfExportView(character, options = {}) {
  const contentLanguage = options.contentLanguage === "en" ? "en" : "es";
  const classEntries = getCharacterPdfClassEntries(character, contentLanguage);
  const primaryClassEntry = classEntries[0] ?? {};

  return {
    ...character,
    className: primaryClassEntry.name || cleanPdfText(character?.className),
    subclassName: primaryClassEntry.subclassName || cleanPdfText(character?.subclassName),
    classEntries
  };
}

function getCharacterClassLevelLabel(character) {
  const entries = Array.isArray(character?.classEntries) ? character.classEntries : [];
  const visibleEntries = character?.isMulticlass === true ? entries : entries.slice(0, 1);
  const labels = visibleEntries.map((entry) => {
    const className = cleanPdfText(entry?.name ?? entry?.className);
    const subclassName = cleanPdfText(entry?.subclassName);
    const level = clampInteger(entry?.level, 0, 20);
    const name = [className, subclassName ? `(${subclassName})` : ""].filter(Boolean).join(" ");
    return [name, level ? String(level) : ""].filter(Boolean).join(" ");
  }).filter(Boolean);

  if (labels.length > 0) {
    return labels.join(" / ");
  }

  return [cleanPdfText(character?.className), clampInteger(character?.level, 1, 20)].filter(Boolean).join(" ");
}

function getCharacterProficiencyBonus(character) {
  const override = Number(character?.proficiencyBonusOverride);
  return Number.isFinite(override) && character?.proficiencyBonusOverride !== ""
    ? override
    : Number(character?.proficiencyBonus) || getLevelProficiencyBonus(character?.level);
}

function getCharacterInventoryText(character) {
  return (Array.isArray(character?.inventory) ? character.inventory : [])
    .filter((entry) => cleanPdfText(entry?.name) && Number(entry?.quantity) > 0)
    .map((entry) => `${Math.max(0, Math.floor(Number(entry.quantity) || 0))} x ${cleanPdfText(entry.name)}`)
    .join("\n");
}

function getCharacterFeaturesText(character) {
  const abilities = (Array.isArray(character?.spellbookAbilities) ? character.spellbookAbilities : [])
    .filter((entry) => cleanPdfText(entry?.name) || cleanPdfText(entry?.description))
    .map((entry) => [cleanPdfText(entry.name), cleanPdfText(entry.description)].filter(Boolean).join(": "));
  const notes = cleanPdfText(character?.notes);
  return [...abilities, notes].filter(Boolean).join("\n\n");
}

function getCharacterSpellsText(character) {
  return (Array.isArray(character?.spells) ? character.spells : [])
    .filter((entry) => cleanPdfText(entry?.name))
    .map((entry) => `${cleanPdfText(entry.level) || "N/D"}: ${cleanPdfText(entry.name)}${entry.prepared ? " *" : ""}`)
    .join("\n");
}

function getCharacterSpellcastingClassLabel(character) {
  const entries = Array.isArray(character?.classEntries) ? character.classEntries : [];
  const visibleEntries = character?.isMulticlass === true ? entries : entries.slice(0, 1);
  const classNames = visibleEntries
    .map((entry) => cleanPdfText(entry?.name ?? entry?.className))
    .filter(Boolean);
  return classNames.join(" / ") || cleanPdfText(character?.className);
}

function getCharacterSpellcastingAbility(character) {
  const explicitAbility = cleanPdfText(character?.spellcastingAbility).toUpperCase();

  if (explicitAbility) {
    return explicitAbility;
  }

  const normalizedClasses = getCharacterSpellcastingClassLabel(character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const inferredAbilities = [];
  const classAbilityGroups = [
    { ability: "INT", classes: ["artificer", "artificiero", "wizard", "mago"] },
    { ability: "WIS", classes: ["cleric", "clerigo", "druid", "druida", "ranger", "explorador", "monk", "monje"] },
    { ability: "CHA", classes: ["bard", "bardo", "paladin", "sorcerer", "hechicero", "warlock", "brujo"] }
  ];

  classAbilityGroups.forEach(({ ability, classes }) => {
    if (classes.some((className) => normalizedClasses.includes(className))) {
      inferredAbilities.push(ability);
    }
  });

  return [...new Set(inferredAbilities)].join(" / ");
}

function getCharacterSpellLevel(value) {
  const normalizedValue = cleanPdfText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["0", "c", "cantrip", "truco", "pot"].includes(normalizedValue)) {
    return 0;
  }

  const match = normalizedValue.match(/(?:^|\D)([1-9])(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function getCharacterPdfSpells(character) {
  return (Array.isArray(character?.spells) ? character.spells : [])
    .filter((spell) => cleanPdfText(spell?.name))
    .sort((left, right) => {
      const leftLevel = getCharacterSpellLevel(left?.level);
      const rightLevel = getCharacterSpellLevel(right?.level);
      return (leftLevel ?? 10) - (rightLevel ?? 10)
        || cleanPdfText(left?.name).localeCompare(cleanPdfText(right?.name), "en", { sensitivity: "base" });
    });
}

function getCharacterPdfSpellLevelLabel(spell, contentLanguage = "es") {
  const level = getCharacterSpellLevel(spell?.level);

  if (level === 0) {
    return contentLanguage === "en" ? "Cantrip" : "Truco";
  }

  return level === null ? cleanPdfText(spell?.level) : String(level);
}

function writeCharacterSpellsToPrimaryTemplate(writer, character, options = {}) {
  const spells = getCharacterPdfSpells(character);
  const availableIndexes = [];

  for (let index = 1; index <= 64; index += 1) {
    if (writer.hasText(`Front_Spell Name ${index}`)) {
      availableIndexes.push(index);
    }
  }

  const writtenCount = Math.min(spells.length, availableIndexes.length);

  for (let spellIndex = 0; spellIndex < writtenCount; spellIndex += 1) {
    const fieldIndex = availableIndexes[spellIndex];
    const spell = spells[spellIndex];
    writer.setText(`Front_Spell Name ${fieldIndex}`, spell.name);
    writer.setText(`Front_Spell Level ${fieldIndex}`, getCharacterPdfSpellLevelLabel(spell, options.contentLanguage));
    writer.setChecked(`Front_Spell Prepared ${fieldIndex}`, spell.prepared === true);
  }

  const cantripCount = spells.filter((spell) => getCharacterSpellLevel(spell.level) === 0).length;
  writer.setText("Front_Cantrips Known", cantripCount);
  writer.setText("Front_Spells Known", spells.length - cantripCount);

  return spells.slice(writtenCount);
}

function writeCharacterSpellSlotsToPrimaryTemplate(writer, character) {
  const levelSuffixes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  const spellSlots = Array.isArray(character?.spellSlots) ? character.spellSlots : [];

  spellSlots.forEach((slotEntry) => {
    const level = clampInteger(slotEntry?.level, 1, 9);

    if (level === null) {
      return;
    }

    const totalSlots = Math.max(0, Math.floor(Number(slotEntry?.slots) || 0));
    const spentSlots = Array.isArray(slotEntry?.spent) ? slotEntry.spent : [];

    for (let index = 0; index < totalSlots; index += 1) {
      writer.setChecked(`Front_Spell Slot ${levelSuffixes[level - 1]} ${index + 1}`, spentSlots[index] === true);
    }
  });
}

function getSpellCardSaveLabel(spell) {
  const text = cleanPdfText(spell?.text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const abilityLabels = [
    { key: "STR", names: ["strength", "fuerza"] },
    { key: "DEX", names: ["dexterity", "destreza"] },
    { key: "CON", names: ["constitution", "constitucion"] },
    { key: "INT", names: ["intelligence", "inteligencia"] },
    { key: "WIS", names: ["wisdom", "sabiduria"] },
    { key: "CHA", names: ["charisma", "carisma"] }
  ];

  return abilityLabels.find(({ names }) => names.some((name) => (
    text.includes(`${name} saving throw`)
    || text.includes(`tirada de salvacion de ${name}`)
  )))?.key ?? "";
}

function getSpellCardComponents(spell) {
  const components = cleanPdfText(spell?.components);
  const componentCodes = components
    .split("(")[0]
    .split(",")
    .map((entry) => entry.trim().toUpperCase());

  return {
    text: components,
    verbal: componentCodes.includes("V"),
    somatic: componentCodes.includes("S"),
    material: componentCodes.includes("M")
  };
}

function getSpellCardEffect(spell, contentLanguage = "es") {
  const text = cleanPdfText(spell?.text);
  const atHigherLevels = cleanPdfText(spell?.atHigherLevels);

  if (!atHigherLevels) {
    return text;
  }

  const label = contentLanguage === "en" ? "At Higher Levels" : "A niveles superiores";
  return [text, `${label}: ${atHigherLevels}`].filter(Boolean).join("\n\n");
}

function getSpellCardSchool(spell) {
  return cleanPdfText(spell?.school).replace(/\s*\(ritual\)\s*/i, "");
}

function writeCharacterSpellCardHeader(writer, character) {
  const spells = getCharacterPdfSpells(character);
  const cantripCount = spells.filter((spell) => getCharacterSpellLevel(spell.level) === 0).length;
  writer.setText("SpellSheet 1_Spell Atk", character?.spellAttackModifier === "" || character?.spellAttackModifier === null || character?.spellAttackModifier === undefined
    ? ""
    : formatSigned(character.spellAttackModifier));
  writer.setText("SpellSheet 1_Spell DC", character?.spellSaveDc);
  writer.setText("SpellSheet 1_Cantrips Known", cantripCount);
  writer.setText("SpellSheet 1_Spells Known", spells.length - cantripCount);

  const levelSuffixes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  const spellSlots = Array.isArray(character?.spellSlots) ? character.spellSlots : [];
  spellSlots.forEach((slotEntry) => {
    const level = clampInteger(slotEntry?.level, 1, 9);

    if (level === null) {
      return;
    }

    const totalSlots = Math.max(0, Math.floor(Number(slotEntry?.slots) || 0));
    const spentSlots = Array.isArray(slotEntry?.spent) ? slotEntry.spent : [];

    for (let index = 0; index < totalSlots; index += 1) {
      writer.setChecked(`SpellSheet1_Spell Slot ${levelSuffixes[level - 1]} ${index + 1}`, spentSlots[index] === true);
    }
  });
}

function writeCharacterSpellCard(writer, spell, cardIndex, options = {}) {
  const fieldIndex = String(cardIndex + 1).padStart(2, "0");
  const components = getSpellCardComponents(spell);
  const school = cleanPdfText(spell?.school);
  const duration = cleanPdfText(spell?.duration);
  writer.setText(`SpellSheet1_Spell Name ${fieldIndex}`, spell?.name);
  writer.setText(`SpellSheet 1_Spells Level ${fieldIndex}`, getCharacterPdfSpellLevelLabel(spell, options.contentLanguage));
  if (cardIndex > 1) {
    writer.setText(`SpellSheet1_Spell School ${fieldIndex}`, getSpellCardSchool(spell));
  }
  writer.setText(`SpellSheet1_Range ${fieldIndex}`, spell?.range);
  writer.setText(`SpellSheet1_Casting Time ${fieldIndex}`, spell?.castingTime);
  writer.setText(`SpellSheet1_Save ${fieldIndex}`, getSpellCardSaveLabel(spell));
  writer.setText(`SpellSheet1_Duration ${fieldIndex}`, duration);
  writer.setText([`SpellSheet1_Components ${fieldIndex}`, `SpellSheet1_Component ${fieldIndex}`], components.text);
  writer.setText(`SpellSheet1_Spell Effect ${fieldIndex}`, getSpellCardEffect(spell, options.contentLanguage));
  writer.setChecked(`SpellSheet1_Ritual ${fieldIndex}`, /\britual\b/i.test(school));
  writer.setChecked(`SpellSheet1_Concentration ${fieldIndex}`, spell?.hasConcentration === true || /concentr/i.test(duration));
  writer.setChecked(`SpellSheet1_Verbal ${fieldIndex}`, components.verbal);
  writer.setChecked(`SpellSheet1_Somatic ${fieldIndex}`, components.somatic);
  writer.setChecked(`SpellSheet1_Material ${fieldIndex}`, components.material);
  writer.setChecked(`SpellSheet1_Prepared ${fieldIndex}`, spell?.prepared === true);
}

async function appendCharacterSpellCardSheets(document, templateBytes, character, pdfLibrary, options = {}) {
  const spells = getCharacterPdfSpells(character);

  if (!templateBytes || spells.length === 0) {
    return;
  }

  const { PDFDocument, StandardFonts, ...pdfFieldTypes } = pdfLibrary;
  const sourceBytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);

  for (let offset = 0; offset < spells.length; offset += 12) {
    const cardDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const cardForm = cardDocument.getForm();
    const writer = createPdfFieldWriter(cardForm, pdfFieldTypes);
    const firstSchoolField = cardForm.getTextField("SpellSheet1_Spell School 01");
    const firstSchoolRectangles = firstSchoolField.acroField.getWidgets().map((widget) => widget.getRectangle());
    const pageSpells = spells.slice(offset, offset + 12);
    writeCharacterSpellCardHeader(writer, character);
    pageSpells.forEach((spell, index) => writeCharacterSpellCard(writer, spell, index, options));
    const font = await cardDocument.embedFont(StandardFonts.Helvetica);
    cardForm.updateFieldAppearances(font);
    cardForm.flatten({ updateFieldAppearances: false });
    firstSchoolRectangles.slice(0, 2).forEach((rectangle, index) => {
      const school = getSpellCardSchool(pageSpells[index]);

      if (school) {
        cardDocument.getPages()[0].drawText(toPdfText(school).slice(0, 22), {
          x: rectangle.x + 1,
          y: rectangle.y + 1.6,
          size: 6,
          font
        });
      }
    });
    const copiedPages = await document.copyPages(
      cardDocument,
      cardDocument.getPages().map((_, index) => index)
    );
    copiedPages.forEach((page) => document.addPage(page));
  }
}

const BACK_SHEET_CURRENCY_FIELDS = Object.freeze({
  CP: ["COBRE", "CP", "COPPER"],
  SP: ["PLATA", "SP", "SILVER"],
  EP: ["ELECTRO", "EP", "ELECTRUM"],
  GP: ["ORO", "GP", "GOLD"],
  PP: ["PLATINO", "PP", "PLATINUM"]
});

function isBackSheetCurrencyName(value) {
  const normalizedName = cleanPdfText(value).toUpperCase();
  return Object.values(BACK_SHEET_CURRENCY_FIELDS).some((aliases) => aliases.includes(normalizedName));
}

function getBackSheetCurrencyQuantity(character, aliases) {
  const row = (Array.isArray(character?.inventory) ? character.inventory : [])
    .find((entry) => aliases.includes(cleanPdfText(entry?.name).toUpperCase()));
  return Math.max(0, Math.floor(Number(row?.quantity) || 0));
}

function getBackSheetInventoryText(character) {
  return (Array.isArray(character?.inventory) ? character.inventory : [])
    .filter((entry) => !isBackSheetCurrencyName(entry?.name) && cleanPdfText(entry?.name) && Number(entry?.quantity) > 0)
    .map((entry) => {
      const name = cleanPdfText(entry.name);
      const size = cleanPdfText(entry.size);
      return size ? `${name} (${size})` : name;
    })
    .join("\n");
}

async function appendCharacterBackSheet(document, templateBytes, character, pdfLibrary) {
  if (!templateBytes) {
    return;
  }

  const { PDFDocument, StandardFonts, ...pdfFieldTypes } = pdfLibrary;
  const sourceBytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);
  const backDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const backForm = backDocument.getForm();
  const writer = createPdfFieldWriter(backForm, pdfFieldTypes);
  writer.setText("Back_Character Name", character?.name);
  Object.entries(BACK_SHEET_CURRENCY_FIELDS).forEach(([currency, aliases]) => {
    writer.setText(`Back_${currency}`, getBackSheetCurrencyQuantity(character, aliases));
  });
  writer.setText("Back_Backpack", getBackSheetInventoryText(character));
  const font = await backDocument.embedFont(StandardFonts.Helvetica);
  backForm.updateFieldAppearances(font);
  backForm.flatten({ updateFieldAppearances: false });
  const copiedPages = await document.copyPages(
    backDocument,
    backDocument.getPages().map((_, index) => index)
  );
  copiedPages.forEach((page) => document.addPage(page));
}

function createPreparedCheckboxResolver(form, pdfLibrary) {
  const { PDFCheckBox, PDFTextField } = pdfLibrary;
  const fields = form.getFields();
  const fieldsByName = new Map(fields.map((field) => [normalizeFieldName(field.getName()), field]));
  const checkboxes = fields.filter((field) => field instanceof PDFCheckBox);
  const getRectangle = (field) => field?.acroField?.getWidgets?.()[0]?.getRectangle?.() ?? null;

  return (textFieldName) => {
    const textField = fieldsByName.get(normalizeFieldName(textFieldName));
    const textRectangle = textField instanceof PDFTextField ? getRectangle(textField) : null;

    if (!textRectangle) {
      return "";
    }

    const nearestCheckbox = checkboxes
      .map((checkbox) => ({ checkbox, rectangle: getRectangle(checkbox) }))
      .filter(({ rectangle }) => rectangle
        && rectangle.x < textRectangle.x
        && textRectangle.x - rectangle.x <= 16
        && Math.abs(rectangle.y - textRectangle.y) <= 3)
      .sort((left, right) => {
        const leftDistance = Math.abs(left.rectangle.x - textRectangle.x) + Math.abs(left.rectangle.y - textRectangle.y);
        const rightDistance = Math.abs(right.rectangle.x - textRectangle.x) + Math.abs(right.rectangle.y - textRectangle.y);
        return leftDistance - rightDistance;
      })[0]?.checkbox ?? null;

    return nearestCheckbox?.getName?.() ?? "";
  };
}

async function appendCharacterSpellSheet(document, spellTemplateBytes, character, pdfLibrary, spells = getCharacterPdfSpells(character)) {
  if (!spellTemplateBytes || spells.length === 0) {
    return;
  }

  const { PDFDocument, StandardFonts } = pdfLibrary;
  const sourceBytes = spellTemplateBytes instanceof Uint8Array
    ? spellTemplateBytes
    : new Uint8Array(spellTemplateBytes);
  const spellDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const spellForm = spellDocument.getForm();
  const writer = createPdfFieldWriter(spellForm, pdfLibrary);
  const resolvePreparedCheckbox = createPreparedCheckboxResolver(spellForm, pdfLibrary);
  writer.setText("Spellcasting Class 2", getCharacterSpellcastingClassLabel(character));
  writer.setText("SpellcastingAbility 2", getCharacterSpellcastingAbility(character));
  writer.setText("SpellSaveDC  2", character?.spellSaveDc);

  if (character?.spellAttackModifier !== "" && character?.spellAttackModifier !== undefined && character?.spellAttackModifier !== null) {
    writer.setText("SpellAtkBonus 2", formatSigned(character.spellAttackModifier));
  }

  Object.entries(SPELL_SHEET_LEVEL_FIELDS).forEach(([rawLevel, fieldNames]) => {
    const level = Number(rawLevel);
    const levelSpells = spells.filter((spell) => getCharacterSpellLevel(spell.level) === level);

    fieldNames.forEach((fieldName, index) => {
      const spell = levelSpells[index];

      if (!spell) {
        return;
      }

      writer.setText(fieldName, spell.name);
      const preparedCheckboxName = resolvePreparedCheckbox(fieldName);

      if (preparedCheckboxName) {
        writer.setChecked(preparedCheckboxName, spell.prepared === true);
      }
    });
  });

  const spellSlots = Array.isArray(character?.spellSlots) ? character.spellSlots : [];

  Object.entries(SPELL_SHEET_SLOT_FIELDS).forEach(([rawLevel, fieldNames]) => {
    const level = Number(rawLevel);
    const slotEntry = spellSlots.find((entry) => Number(entry?.level) === level);

    if (!slotEntry) {
      return;
    }

    const totalSlots = Math.max(0, Math.floor(Number(slotEntry.slots) || 0));
    const spentSlots = (Array.isArray(slotEntry.spent) ? slotEntry.spent : [])
      .filter((spent) => spent === true)
      .length;
    writer.setText(fieldNames.total, totalSlots);
    writer.setText(fieldNames.remaining, Math.max(0, totalSlots - spentSlots));
  });

  const spellFont = await spellDocument.embedFont(StandardFonts.Helvetica);
  spellForm.updateFieldAppearances(spellFont);
  spellForm.flatten({ updateFieldAppearances: false });
  const copiedPages = await document.copyPages(
    spellDocument,
    spellDocument.getPages().map((_, index) => index)
  );
  copiedPages.forEach((page) => document.addPage(page));
}

export async function fillCharacterPdfTemplate(templateBytes, character, spellTemplateBytes = null, options = {}) {
  const pdfLibrary = await loadPdfLibrary();
  const { PDFDocument, StandardFonts, ...pdfFieldTypes } = pdfLibrary;
  const sourceBytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);
  const document = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const form = document.getForm();
  const writer = createPdfFieldWriter(form, pdfFieldTypes);
  const exportCharacter = getCharacterPdfExportView(character, options);
  const abilities = exportCharacter?.abilities ?? {};
  const proficiencyBonus = getCharacterProficiencyBonus(exportCharacter);
  const proficiencies = new Set(Array.isArray(exportCharacter?.proficiencies) ? exportCharacter.proficiencies : []);
  const classEntries = Array.isArray(exportCharacter.classEntries) ? exportCharacter.classEntries : [];
  const classNames = classEntries.map((entry) => cleanPdfText(entry.name)).filter(Boolean);
  const subclassNames = classEntries.map((entry) => cleanPdfText(entry.subclassName)).filter(Boolean);
  const passivePerception = 10 + getAbilityModifier(abilities.wis ?? 10) + (proficiencies.has("skill:perception") ? proficiencyBonus : 0);
  const passiveInsight = 10 + getAbilityModifier(abilities.wis ?? 10) + (proficiencies.has("skill:insight") ? proficiencyBonus : 0);

  writer.setText(["CharacterName", "Front_Character Name"], exportCharacter?.name);
  writer.setText(["PlayerName", "Front_Player Name"], exportCharacter?.playerName);
  writer.setText("ClassLevel", getCharacterClassLevelLabel(exportCharacter));
  writer.setText("Front_Class Name", classNames.join(" / "));
  writer.setText("Front_Level", classEntries[0]?.level || exportCharacter?.level);
  writer.setText("Front_Level 1", classEntries[0]?.level);
  writer.setText("Front_Level 2", classEntries[1]?.level);
  writer.setText(["Subclass", "Front_Archetype"], subclassNames.join(" / "));
  writer.setText(["Background", "Front_Background"], exportCharacter?.background);
  writer.setText(["Race ", "Front_Race"], exportCharacter?.species);
  writer.setText(["XP", "Front_XP"], exportCharacter?.totalExperiencePoints ?? exportCharacter?.experiencePoints);
  writer.setText(["ProfBonus", "Front_Proficiency"], formatSigned(proficiencyBonus));
  writer.setText(["AC", "Front_AC"], exportCharacter?.armorClass);
  writer.setText(["Initiative", "Front_Initiative"], formatSigned(exportCharacter?.initiativeBonus));
  writer.setText(["Speed", "Front_Speed"], exportCharacter?.speed);
  writer.setText(["HPMax", "Front_Max HP"], exportCharacter?.maxHp);
  writer.setText(["HPCurrent", "Front_Current HP"], exportCharacter?.currentHp);
  writer.setText(["HPTemp", "Front_Temp HP"], exportCharacter?.tempHp);
  writer.setText(["Passive", "Front_Passive Perception"], passivePerception);
  writer.setText("Front_Passive Insight", passiveInsight);
  writer.setText(["Equipment", "Front_Equipment"], getCharacterInventoryText(exportCharacter));
  writer.setText(["Features and Traits", "Front_Racial Traits"], getCharacterFeaturesText(exportCharacter));
  writer.setText("AttacksSpellcasting", getCharacterSpellsText(exportCharacter));
  writer.setText("Front_Total Hit Dice", exportCharacter?.level);
  writer.setText(
    "Front_Spell Atk",
    exportCharacter?.spellAttackModifier === "" || exportCharacter?.spellAttackModifier === null || exportCharacter?.spellAttackModifier === undefined
      ? ""
      : formatSigned(exportCharacter.spellAttackModifier)
  );
  writer.setText("Front_Spell DC", exportCharacter?.spellSaveDc);

  Object.entries(ABILITY_META).forEach(([abilityKey, meta]) => {
    const score = clampInteger(abilities[abilityKey], 1, 30) ?? 10;
    const modifier = getAbilityModifier(score);
    const saveProficient = proficiencies.has(`save:${abilityKey}`);
    const templateSave = TEMPLATE_SAVE_FIELDS[abilityKey];

    writer.setText(meta.scoreFields, score);
    writer.setText(meta.frontScoreField, score);
    writer.setText(meta.modifierFields, formatSigned(modifier));
    writer.setText(meta.frontModifierField, formatSigned(modifier));
    writer.setText([templateSave.value, `Front_${meta.short} Save Throw`], formatSigned(modifier + (saveProficient ? proficiencyBonus : 0)));
    writer.setChecked([templateSave.checkbox, `Front_Save ${meta.short}`], saveProficient);
  });

  Object.entries(SKILL_META).forEach(([skillId, meta]) => {
    const modifier = getAbilityModifier(abilities[meta.ability] ?? 10);
    const isProficient = proficiencies.has(`skill:${skillId}`);
    const templateSkill = TEMPLATE_SKILL_FIELDS[skillId];

    writer.setText([templateSkill.value, ...meta.valueFields], formatSigned(modifier + (isProficient ? proficiencyBonus : 0)));
    writer.setChecked([templateSkill.checkbox, ...meta.checkboxFields], isProficient);
  });

  const remainingSpells = writeCharacterSpellsToPrimaryTemplate(writer, exportCharacter, options);
  writeCharacterSpellSlotsToPrimaryTemplate(writer, exportCharacter);

  const font = await document.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  await appendCharacterSpellSheet(document, spellTemplateBytes, exportCharacter, pdfLibrary, remainingSpells);
  await appendCharacterSpellCardSheets(document, options.spellCardTemplateBytes, exportCharacter, pdfLibrary, options);
  await appendCharacterBackSheet(document, options.backTemplateBytes, exportCharacter, pdfLibrary);
  document.setTitle(toPdfText(exportCharacter?.name) || "Ficha de personaje");
  document.setAuthor("Mimic Dice");
  document.setCreator("Mimic Dice");
  document.setProducer("Mimic Dice");
  return document.save({ updateFieldAppearances: false });
}

export function getCharacterPdfImportLabels(data) {
  const labels = [];
  const groups = [
    [["name", "playerName"], "Identidad"],
    [["className", "subclassName", "level", "species", "background"], "Clase y origen"],
    [["abilities"], "Caracteristicas"],
    [["proficiencyBonus", "proficiencies"], "Competencias"],
    [["armorClass", "maxHp", "currentHp", "tempHp", "initiativeBonus", "speed"], "Combate"],
    [["spells", "spellAttackModifier", "spellSaveDc", "spellSlots"], "Hechizos"],
    [["notes"], "Notas"]
  ];

  groups.forEach(([keys, label]) => {
    if (keys.some((key) => data?.[key] !== undefined)) {
      labels.push(label);
    }
  });

  return labels;
}
