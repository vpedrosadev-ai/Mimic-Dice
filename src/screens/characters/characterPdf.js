let pdfLibraryPromise = null;

function loadPdfLibrary() {
  pdfLibraryPromise ??= import("pdf-lib");
  return pdfLibraryPromise;
}

const ABILITY_META = Object.freeze({
  str: { label: "Strength", short: "Str", scoreFields: ["STR", "Front_Str Score"], modifierFields: ["STRmod", "Front_Str Mod"] },
  dex: { label: "Dexterity", short: "Dex", scoreFields: ["DEX", "Front_Dex Score"], modifierFields: ["DEXmod ", "Front_Dex Mod"] },
  con: { label: "Constitution", short: "Con", scoreFields: ["CON", "Front_Con Score"], modifierFields: ["CONmod", "Front_Con Mod"] },
  int: { label: "Intelligence", short: "Int", scoreFields: ["INT", "Front_Int Score"], modifierFields: ["INTmod", "Front_Int Mod"] },
  wis: { label: "Wisdom", short: "Wis", scoreFields: ["WIS", "Front_Wis Score"], modifierFields: ["WISmod", "Front_Wis Mod"] },
  cha: { label: "Charisma", short: "Cha", scoreFields: ["CHA", "Front_Cha Score"], modifierFields: ["CHamod", "Front_Cha Mod"] }
});

const SKILL_META = Object.freeze({
  athletics: { label: "Athletics", ability: "str", valueFields: ["Athletics", "Front_Skill Athletics"], checkboxFields: ["ChBx Athletics", "Front_Proficiency Athletics"] },
  acrobatics: { label: "Acrobatics", ability: "dex", valueFields: ["Acrobatics", "Front_Skill Acrobatics"], checkboxFields: ["ChBx Acrobatics", "Front_Proficiency Acrobatics"] },
  sleightOfHand: { label: "Sleight of Hand", ability: "dex", valueFields: ["SleightofHand", "Front_Skill Sleight of Hand"], checkboxFields: ["ChBx Sleight", "Front_Proficiency Sleight of Hand"] },
  stealth: { label: "Stealth", ability: "dex", valueFields: ["Stealth", "Front_Skill Stealth"], checkboxFields: ["ChBx Stealth", "Front_Proficiency Stealth"] },
  arcana: { label: "Arcana", ability: "int", valueFields: ["Arcana", "Front_Skill Arcana"], checkboxFields: ["ChBx Arcana", "Front_Proficiency Arcana"] },
  history: { label: "History", ability: "int", valueFields: ["History", "Front_Skill History"], checkboxFields: ["ChBx History", "Front_Proficiency History"] },
  investigation: { label: "Investigation", ability: "int", valueFields: ["Investigation", "Front_Skill Investigation"], checkboxFields: ["ChBx Investigation", "Front_Proficiency Investigation"] },
  nature: { label: "Nature", ability: "int", valueFields: ["Nature", "Front_Skill Nature"], checkboxFields: ["ChBx Nature", "Front_Proficiency Nature"] },
  religion: { label: "Religion", ability: "int", valueFields: ["Religion", "Front_Skill Religion"], checkboxFields: ["ChBx Religion", "Front_Proficiency Religion"] },
  animalHandling: { label: "Animal Handling", ability: "wis", valueFields: ["Animal Handling", "Front_Skill Animal Handling"], checkboxFields: ["ChBx Animal", "Front_Proficiency Animal Handling"] },
  insight: { label: "Insight", ability: "wis", valueFields: ["Insight", "Front_Skill Insight"], checkboxFields: ["ChBx Insight", "Front_Proficiency Insight"] },
  medicine: { label: "Medicine", ability: "wis", valueFields: ["Medicine", "Front_Skill Medicine"], checkboxFields: ["ChBx Medicine", "Front_Proficiency Medicine"] },
  perception: { label: "Perception", ability: "wis", valueFields: ["Perception", "Front_Skill Perception"], checkboxFields: ["ChBx Perception", "Front_Proficiency Perception"] },
  survival: { label: "Survival", ability: "wis", valueFields: ["Survival", "Front_Skill Survival"], checkboxFields: ["ChBx Survival", "Front_Proficiency Survival"] },
  deception: { label: "Deception", ability: "cha", valueFields: ["Deception", "Front_Skill Deception"], checkboxFields: ["ChBx Deception", "Front_Proficiency Deception"] },
  intimidation: { label: "Intimidation", ability: "cha", valueFields: ["Intimidation", "Front_Skill Intimidation"], checkboxFields: ["ChBx Intimidation", "Front_Proficiency Intimidation"] },
  performance: { label: "Performance", ability: "cha", valueFields: ["Performance", "Front_Skill Performance"], checkboxFields: ["ChBx Performance", "Front_Proficiency Performance"] },
  persuasion: { label: "Persuasion", ability: "cha", valueFields: ["Persuasion", "Front_Skill Persuasion"], checkboxFields: ["ChBx Persuasion", "Front_Proficiency Persuasion"] }
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

function getLevelProficiencyBonus(level) {
  return Math.max(2, Math.min(6, Math.ceil(Math.max(1, Number(level) || 1) / 4) + 1));
}

function formatSigned(value) {
  const numericValue = Number(value) || 0;
  return numericValue >= 0 ? `+${numericValue}` : String(numericValue);
}

function createPdfFieldReader(form, pdfLibrary) {
  const { PDFCheckBox, PDFTextField } = pdfLibrary;
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
        const value = field instanceof PDFTextField ? cleanPdfText(field.getText()) : "";

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
  const explicitClassName = reader.getText(["Class", "Character Class", "Front_Class", "Front_Class Name"]);
  const explicitSubclassName = reader.getText(["Subclass", "Sub-class", "Archetype", "Front_Archetype"]);
  const explicitLevel = parsePdfNumber(reader.getText(["Level", "Front_Level"]));
  addDetectedText(data, "className", explicitClassName || combinedClass.className);
  addDetectedText(data, "subclassName", explicitSubclassName);
  const detectedLevel = clampInteger(explicitLevel ?? combinedClass.level, 1, 20);

  if (detectedLevel !== null) {
    data.level = detectedLevel;
  }

  addDetectedNumber(data, "experiencePoints", reader.getText(["XP", "Experience Points", "Front_XP"]), 0);
  addDetectedNumber(data, "proficiencyBonus", reader.getText(["ProfBonus", "Proficiency Bonus", "Front_Proficiency"]), 0, 20);
  addDetectedNumber(data, "armorClass", reader.getText(["AC", "Armor Class", "Front_AC"]), 0, 99);
  addDetectedNumber(data, "initiativeBonus", reader.getText(["Initiative", "Front_Initiative"]), -99, 99);
  const detectedSpeed = reader.getText(["Speed", "Front_Speed"]);

  if (detectedSpeed) {
    data.speed = /^\d+(?:[.,]\d+)?$/.test(detectedSpeed) ? `${detectedSpeed} ft` : detectedSpeed;
  }
  addDetectedNumber(data, "maxHp", reader.getText(["HPMax", "Max HP", "Front_Max HP"]), 0);
  addDetectedNumber(data, "currentHp", reader.getText(["HPCurrent", "Current HP", "Front_Current HP"]), 0);
  addDetectedNumber(data, "tempHp", reader.getText(["HPTemp", "Temp HP", "Front_Temp HP"]), 0);
  addDetectedNumber(data, "spellAttackModifier", reader.getText(["Spell Atk", "Spell Attack", "Front_Spell Atk"]), -99, 99);
  addDetectedNumber(data, "spellSaveDc", reader.getText(["Spell Save DC", "Spell DC", "Front_Spell DC"]), 0, 99);

  Object.entries(ABILITY_META).forEach(([abilityKey, meta]) => {
    const score = clampInteger(parsePdfNumber(reader.getText(meta.scoreFields)), 1, 30);

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
    const saveAliases = [`ST ${meta.label}`, `Front_Save ${meta.short}`, `Front_Save ${meta.label}`];
    const saveValueAliases = [TEMPLATE_SAVE_FIELDS[abilityKey].value, `Front_${meta.short} Save Throw`];
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

  if (spells.length > 0) {
    data.spells = spells;
  }

  const spellSlotLevel = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Level"])), 1, 9);
  const spellSlotTotal = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Total"])), 0, 99);
  const spellSlotUsed = clampInteger(parsePdfNumber(reader.getText(["Front_Spell Slots Used"])), 0, 99) ?? 0;

  if (spellSlotLevel !== null && spellSlotTotal !== null) {
    data.spellSlots = [{
      level: spellSlotLevel,
      slots: spellSlotTotal,
      spent: Array.from({ length: spellSlotTotal }, (_, index) => index < Math.min(spellSlotUsed, spellSlotTotal))
    }];
    data.spellSlotLevelsVisible = spellSlotLevel;
  }

  const noteSections = [
    ["Rasgos", reader.getText(["Features and Traits", "Front_Racial Traits"])],
    ["Personalidad", reader.getText(["PersonalityTraits", "PersonalityTraits "])],
    ["Ideales", reader.getText(["Ideals"])],
    ["Vinculos", reader.getText(["Bonds"])],
    ["Defectos", reader.getText(["Flaws"])],
    ["Competencias e idiomas", reader.getText(["ProficienciesLang", "Front_Languages", "Front_Tools"])]
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
    setText(name, value) {
      const field = fields.get(normalizeFieldName(name));

      if (field instanceof PDFTextField && value !== undefined && value !== null && value !== "") {
        field.setText(toPdfText(value));
      }
    },
    setChecked(name, checked) {
      const field = fields.get(normalizeFieldName(name));

      if (field instanceof PDFCheckBox) {
        if (checked) {
          field.check();
        } else {
          field.uncheck();
        }
      }
    }
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

async function appendCharacterSpellSheet(document, spellTemplateBytes, character, pdfLibrary) {
  if (!spellTemplateBytes) {
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
  const spells = (Array.isArray(character?.spells) ? character.spells : [])
    .filter((spell) => cleanPdfText(spell?.name));

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

export async function fillCharacterPdfTemplate(templateBytes, character, spellTemplateBytes = null) {
  const pdfLibrary = await loadPdfLibrary();
  const { PDFDocument, StandardFonts, ...pdfFieldTypes } = pdfLibrary;
  const sourceBytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);
  const document = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const form = document.getForm();
  const writer = createPdfFieldWriter(form, pdfFieldTypes);
  const abilities = character?.abilities ?? {};
  const proficiencyBonus = getCharacterProficiencyBonus(character);
  const proficiencies = new Set(Array.isArray(character?.proficiencies) ? character.proficiencies : []);

  writer.setText("CharacterName", character?.name);
  writer.setText("PlayerName", character?.playerName);
  writer.setText("ClassLevel", getCharacterClassLevelLabel(character));
  writer.setText("Background", character?.background);
  writer.setText("Race ", character?.species);
  writer.setText("XP", character?.totalExperiencePoints ?? character?.experiencePoints);
  writer.setText("ProfBonus", formatSigned(proficiencyBonus));
  writer.setText("AC", character?.armorClass);
  writer.setText("Initiative", formatSigned(character?.initiativeBonus));
  writer.setText("Speed", character?.speed);
  writer.setText("HPMax", character?.maxHp);
  writer.setText("HPCurrent", character?.currentHp);
  writer.setText("HPTemp", character?.tempHp);
  writer.setText("Passive", 10 + getAbilityModifier(abilities.wis ?? 10) + (proficiencies.has("skill:perception") ? proficiencyBonus : 0));
  writer.setText("Equipment", getCharacterInventoryText(character));
  writer.setText("Features and Traits", getCharacterFeaturesText(character));
  writer.setText("AttacksSpellcasting", getCharacterSpellsText(character));

  Object.entries(ABILITY_META).forEach(([abilityKey, meta]) => {
    const score = clampInteger(abilities[abilityKey], 1, 30) ?? 10;
    const modifier = getAbilityModifier(score);
    const saveProficient = proficiencies.has(`save:${abilityKey}`);
    const templateSave = TEMPLATE_SAVE_FIELDS[abilityKey];

    writer.setText(meta.scoreFields[0], score);
    writer.setText(meta.modifierFields[0], formatSigned(modifier));
    writer.setText(templateSave.value, formatSigned(modifier + (saveProficient ? proficiencyBonus : 0)));
    writer.setChecked(templateSave.checkbox, saveProficient);
  });

  Object.entries(SKILL_META).forEach(([skillId, meta]) => {
    const modifier = getAbilityModifier(abilities[meta.ability] ?? 10);
    const isProficient = proficiencies.has(`skill:${skillId}`);
    const templateSkill = TEMPLATE_SKILL_FIELDS[skillId];

    writer.setText(templateSkill.value, formatSigned(modifier + (isProficient ? proficiencyBonus : 0)));
    writer.setChecked(templateSkill.checkbox, isProficient);
  });

  const font = await document.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  await appendCharacterSpellSheet(document, spellTemplateBytes, character, pdfLibrary);
  document.setTitle(toPdfText(character?.name) || "Ficha de personaje");
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
