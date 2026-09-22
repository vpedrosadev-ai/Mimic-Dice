const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

const SKILL_INDEX_BY_ID = new Map([
  ["acrobatics", 0],
  ["animalHandling", 1],
  ["arcana", 2],
  ["athletics", 3],
  ["deception", 4],
  ["history", 5],
  ["insight", 6],
  ["intimidation", 7],
  ["investigation", 8],
  ["medicine", 9],
  ["nature", 10],
  ["perception", 11],
  ["performance", 12],
  ["persuasion", 13],
  ["religion", 14],
  ["sleightOfHand", 15],
  ["stealth", 16],
  ["survival", 17]
]);

const SPELL_SCHOOL_CODES = new Map([
  ["abjuration", 1],
  ["abjuracion", 1],
  ["conjuration", 2],
  ["conjuracion", 2],
  ["divination", 3],
  ["adivinacion", 3],
  ["enchantment", 4],
  ["encantamiento", 4],
  ["evocation", 5],
  ["evocacion", 5],
  ["illusion", 6],
  ["ilusion", 6],
  ["necromancy", 7],
  ["nigromancia", 7],
  ["transmutation", 8],
  ["transmutacion", 8]
]);

const SPELLCASTING_ABILITY_BY_CLASS = new Map([
  ["artificer", "int"],
  ["artificiero", "int"],
  ["bard", "cha"],
  ["bardo", "cha"],
  ["cleric", "wis"],
  ["clerigo", "wis"],
  ["druid", "wis"],
  ["druida", "wis"],
  ["paladin", "cha"],
  ["ranger", "wis"],
  ["explorador", "wis"],
  ["sorcerer", "cha"],
  ["hechicero", "cha"],
  ["warlock", "cha"],
  ["brujo", "cha"],
  ["wizard", "int"],
  ["mago", "int"]
]);

const CURRENCY_EXPORT_CONFIG = new Map([
  ["COBRE", { name: "Copper (cp)", value: 0.01 }],
  ["PLATA", { name: "Silver (sp)", value: 0.1 }],
  ["ELECTRO", { name: "Electrum (ep)", value: 0.5 }],
  ["ORO", { name: "Gold (gp)", value: 1 }],
  ["PLATINO", { name: "Platinum (pp)", value: 10 }]
]);

function normalizeLookupText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function stripIllegalXmlCharacters(value) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function escapeXml(value) {
  return stripIllegalXmlCharacters(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toInteger(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : fallback;
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function getStableNumericId(value) {
  const source = String(value || "mimic-dice-character");
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) || 1;
}

function getSpellLevel(spell) {
  const directValue = Number(spell?.levelValue);

  if (Number.isFinite(directValue)) {
    return Math.max(0, Math.min(9, Math.round(directValue)));
  }

  const normalizedLevel = normalizeLookupText(spell?.level);

  if (["", "cantrip", "truco", "level 0", "nivel 0", "0"].includes(normalizedLevel)) {
    return 0;
  }

  const match = normalizedLevel.match(/\d+/);
  return match ? Math.max(0, Math.min(9, Number(match[0]))) : 0;
}

function getSpellSchoolCode(spell) {
  const normalizedSchool = normalizeLookupText(spell?.school).replace(/\s+school$/, "");
  return SPELL_SCHOOL_CODES.get(normalizedSchool) || 0;
}

function getItemTypeCode(item) {
  const type = normalizeLookupText(item?.type);
  const name = normalizeLookupText(item?.name);

  if (/armor|armadura|shield|escudo/.test(`${type} ${name}`)) {
    return 1;
  }

  if (/weapon|arma/.test(type) || item?.damage) {
    return 5;
  }

  if (/consumable|consumible|potion|pocion|scroll|pergamino/.test(type)) {
    return 12;
  }

  return 0;
}

function getSpellcastingAbilityIndex(className) {
  const normalizedClassName = normalizeLookupText(className);
  const ability = [...SPELLCASTING_ABILITY_BY_CLASS.entries()]
    .find(([key]) => normalizedClassName === key || normalizedClassName.includes(key))?.[1];
  return ability ? ABILITY_ORDER.indexOf(ability) : -1;
}

function getClassEntries(character) {
  const entries = Array.isArray(character?.classEntries)
    ? character.classEntries.filter((entry) => entry && (entry.name || entry.level))
    : [];

  if (entries.length > 0) {
    return entries;
  }

  return [{
    name: character?.className || "Adventurer",
    subclassName: character?.subclassName || "",
    level: character?.level || 1
  }];
}

function getSpellSlotCsv(character, current = false) {
  const slotRows = Array.isArray(character?.spellSlots) ? character.spellSlots : [];
  const byLevel = new Map(slotRows.map((row) => {
    const maximum = Math.max(0, toInteger(row?.slots));
    const spent = Array.isArray(row?.spent) ? row.spent.filter(Boolean).length : 0;
    return [toInteger(row?.level), current ? Math.max(0, maximum - spent) : maximum];
  }));
  return Array.from({ length: 10 }, (_, level) => level === 0 ? 0 : (byLevel.get(level) || 0)).join(",") + ",";
}

function getProficiencyCodes(character) {
  const codes = new Set();

  for (const key of Array.isArray(character?.proficiencies) ? character.proficiencies : []) {
    const [kind, id] = String(key).split(":");

    if (kind === "save") {
      const abilityIndex = ABILITY_ORDER.indexOf(id);

      if (abilityIndex >= 0) {
        codes.add(abilityIndex);
      }
    } else if (kind === "skill" && SKILL_INDEX_BY_ID.has(id)) {
      codes.add(100 + SKILL_INDEX_BY_ID.get(id));
    }
  }

  return [...codes].sort((left, right) => left - right);
}

function getDamageDice(value) {
  return String(value || "").match(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/i)?.[0]?.replace(/\s+/g, "") || "";
}

function getTextDescription(entry) {
  return String(entry?.text || entry?.description || "").trim();
}

function getCurrencyRows(character) {
  return (Array.isArray(character?.inventory) ? character.inventory : [])
    .map((item) => ({ item, config: CURRENCY_EXPORT_CONFIG.get(String(item?.name || "").trim().toUpperCase()) }))
    .filter(({ config }) => Boolean(config));
}

function isCurrencyRow(item) {
  return CURRENCY_EXPORT_CONFIG.has(String(item?.name || "").trim().toUpperCase());
}

class XmlDocumentBuilder {
  constructor() {
    this.lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  }

  open(tag, attributes = {}, depth = 0) {
    const serializedAttributes = Object.entries(attributes)
      .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
      .join("");
    this.lines.push(`${"  ".repeat(depth)}<${tag}${serializedAttributes}>`);
  }

  close(tag, depth = 0) {
    this.lines.push(`${"  ".repeat(depth)}</${tag}>`);
  }

  element(tag, value, depth = 0) {
    this.lines.push(`${"  ".repeat(depth)}<${tag}>${escapeXml(value)}</${tag}>`);
  }

  toString() {
    return `${this.lines.join("\n")}\n`;
  }
}

function appendFeature(xml, parentDepth, feature) {
  const name = String(feature?.name || "").trim();

  if (!name) {
    return;
  }

  xml.open("feat", {}, parentDepth);
  xml.element("name", name, parentDepth + 1);

  const description = getTextDescription(feature);

  if (description) {
    xml.element("text", description.slice(0, 1500), parentDepth + 1);
  }

  xml.element("expanded", 0, parentDepth + 1);
  xml.close("feat", parentDepth);
}

function appendSpell(xml, spell, depth) {
  const name = String(spell?.name || "").trim();

  if (!name) {
    return;
  }

  xml.open("spell", {}, depth);
  xml.element("name", name, depth + 1);

  const schoolCode = getSpellSchoolCode(spell);

  if (schoolCode) {
    xml.element("school", schoolCode, depth + 1);
  }

  const level = getSpellLevel(spell);
  xml.element("level", level, depth + 1);

  if (level > 0 && spell?.prepared === true) {
    xml.element("prepared", 1, depth + 1);
  }

  const optionalFields = [
    ["time", spell?.castingTime],
    ["range", spell?.range],
    ["components", spell?.components],
    ["duration", spell?.duration],
    ["text", getTextDescription(spell)]
  ];

  for (const [tag, value] of optionalFields) {
    if (String(value || "").trim()) {
      xml.element(tag, value, depth + 1);
    }
  }

  xml.close("spell", depth);
}

function appendInventoryItem(xml, item, depth) {
  const name = String(item?.name || "").trim();
  const quantity = Math.max(0, toInteger(item?.quantity, 1));

  if (!name || quantity === 0 || isCurrencyRow(item)) {
    return;
  }

  xml.open("item", {}, depth);
  xml.element("name", name, depth + 1);

  if (item?.rarity || item?.rarityLabel) {
    xml.element("detail", item.rarity || item.rarityLabel, depth + 1);
  }

  const description = getTextDescription(item);

  if (description) {
    xml.element("text", description, depth + 1);
  }

  const typeCode = getItemTypeCode(item);

  if (typeCode) {
    xml.element("type", typeCode, depth + 1);
  }

  xml.element("quantity", quantity, depth + 1);

  const value = toNumber(item?.valueNumber, Number.NaN);

  if (Number.isFinite(value) && value > 0) {
    xml.element("value", value, depth + 1);
  }

  const weight = toNumber(item?.weightNumber, Number.NaN);

  if (Number.isFinite(weight) && weight > 0) {
    xml.element("weight", weight, depth + 1);
  }

  const damageDice = getDamageDice(item?.damage);

  if (damageDice) {
    xml.element("damage1H", damageDice, depth + 1);
  }

  xml.close("item", depth);
}

function appendCurrencyContainer(xml, character, depth) {
  const rows = getCurrencyRows(character);

  if (rows.length === 0) {
    return;
  }

  xml.open("container", {}, depth);
  xml.element("name", "Coin Pouch", depth + 1);
  xml.element("ignore", 1, depth + 1);
  xml.element("carried", 1, depth + 1);

  for (const { item, config } of rows) {
    xml.open("item", {}, depth + 1);
    xml.element("name", config.name, depth + 2);
    xml.element("type", 15, depth + 2);
    xml.element("quantity", Math.max(0, toInteger(item?.quantity)), depth + 2);
    xml.element("value", config.value, depth + 2);
    xml.element("weight", 0.02, depth + 2);
    xml.close("item", depth + 1);
  }

  xml.close("container", depth);
}

export function createFightClubCharacterXml(character) {
  if (!character || typeof character !== "object") {
    throw new TypeError("Se necesita un personaje para generar el XML de Fight Club.");
  }

  const xml = new XmlDocumentBuilder();
  const classEntries = getClassEntries(character);
  const primaryClass = classEntries[0] || {};
  const abilities = character.abilities || {};
  const slots = getSpellSlotCsv(character, false);
  const currentSlots = getSpellSlotCsv(character, true);
  const spellbookAbilities = (Array.isArray(character.spellbookAbilities) ? character.spellbookAbilities : [])
    .filter((ability) => String(ability?.name || "").trim());

  xml.open("pc", { version: 5 }, 0);
  xml.open("character", {}, 1);
  xml.element("version", 1, 2);
  xml.element("uid", getStableNumericId(character.id || character.name), 2);
  xml.element("name", String(character.name || "Character").trim() || "Character", 2);
  xml.element("abilities", `${ABILITY_ORDER.map((key) => Math.max(1, toInteger(abilities[key], 10))).join(",")},`, 2);
  xml.element("hpMax", Math.max(0, toInteger(character.maxHp)), 2);
  xml.element("hpCurrent", Math.max(0, toInteger(character.currentHp, toInteger(character.maxHp))), 2);
  xml.element("xp", Math.max(0, toInteger(character.totalExperiencePoints, toInteger(character.experiencePoints))), 2);
  xml.element("unarmed", 1, 2);
  xml.element("slots", slots, 2);
  xml.element("slotsCurrent", currentSlots, 2);

  xml.open("race", {}, 2);
  xml.element("name", String(character.species || "Unknown").trim() || "Unknown", 3);
  xml.close("race", 2);

  const background = String(character.background || "").trim();

  if (background) {
    xml.open("background", {}, 2);
    xml.element("name", background, 3);
    xml.close("background", 2);
  }

  xml.open("class", {}, 2);
  xml.element("name", String(primaryClass.name || character.className || "Adventurer").trim() || "Adventurer", 3);
  xml.element("level", Math.max(1, toInteger(primaryClass.level, character.level || 1)), 3);
  xml.element("hd", Math.max(1, toInteger(primaryClass.level, character.level || 1)), 3);
  xml.element("hdCurrent", Math.max(1, toInteger(primaryClass.level, character.level || 1)), 3);

  const subclassName = String(primaryClass.subclassName || character.subclassName || "").trim();

  if (subclassName) {
    xml.element("subclass", subclassName, 3);
  }

  const spellcastingAbilityIndex = getSpellcastingAbilityIndex(primaryClass.name || character.className);

  if (spellcastingAbilityIndex >= 0) {
    xml.element("spellAbility", spellcastingAbilityIndex, 3);
  }

  xml.element("slots", slots, 3);
  xml.element("slotsCurrent", currentSlots, 3);

  for (const code of getProficiencyCodes(character)) {
    xml.element("proficiency", code, 3);
  }

  for (const ability of spellbookAbilities) {
    appendFeature(xml, 3, ability);
    const maximum = Math.max(0, toInteger(ability.uses));

    if (maximum > 0) {
      const spent = Array.isArray(ability.spent) ? ability.spent.filter(Boolean).length : 0;
      xml.open("tracker", {}, 3);
      xml.element("label", ability.name, 4);
      xml.element("resetType", 2, 4);
      xml.element("value", Math.max(0, maximum - spent), 4);
      xml.element("formula", maximum, 4);
      xml.close("tracker", 3);
    }
  }

  for (const spell of Array.isArray(character.spells) ? character.spells : []) {
    appendSpell(xml, spell, 3);
  }

  xml.close("class", 2);

  for (const extraClass of classEntries.slice(1)) {
    appendFeature(xml, 2, {
      name: `Multiclass: ${extraClass.name || "Adventurer"} ${Math.max(1, toInteger(extraClass.level, 1))}`,
      text: extraClass.subclassName ? `Subclass: ${extraClass.subclassName}` : ""
    });
  }

  for (const item of Array.isArray(character.inventory) ? character.inventory : []) {
    appendInventoryItem(xml, item, 2);
  }

  appendCurrencyContainer(xml, character, 2);

  const notes = String(character.notes || "").trim();

  if (notes) {
    xml.open("note", {}, 2);
    xml.element("name", "Notes", 3);
    xml.element("text", notes, 3);
    xml.element("expanded", 0, 3);
    xml.close("note", 2);
  }

  xml.close("character", 1);
  xml.close("pc", 0);
  return xml.toString();
}

export function getFightClubCharacterXmlFileName(character) {
  const safeName = String(character?.name || "Character")
    .replace(/\.xml$/i, "")
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  return `${safeName || "Character"}.xml`;
}
