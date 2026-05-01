export const statKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const characterAbilityKeys = ["str", "dex", "con", "int", "wis", "cha"];
export const characterStatBlocks = {
  str: { label: "Fuerza", skills: [{ id: "athletics", label: "Atletismo" }] },
  dex: { label: "Destreza", skills: [
    { id: "acrobatics", label: "Acrobacias" },
    { id: "sleightOfHand", label: "Juego de manos" },
    { id: "stealth", label: "Sigilo" }
  ] },
  con: { label: "Constitucion", skills: [] },
  int: { label: "Inteligencia", skills: [
    { id: "arcana", label: "Arcano" },
    { id: "history", label: "Historia" },
    { id: "investigation", label: "Investigacion" },
    { id: "nature", label: "Naturaleza" },
    { id: "religion", label: "Religion" }
  ] },
  wis: { label: "Sabiduria", skills: [
    { id: "animalHandling", label: "Trato animal" },
    { id: "insight", label: "Perspicacia" },
    { id: "medicine", label: "Medicina" },
    { id: "perception", label: "Percepcion" },
    { id: "survival", label: "Supervivencia" }
  ] },
  cha: { label: "Carisma", skills: [
    { id: "deception", label: "Engano" },
    { id: "intimidation", label: "Intimidacion" },
    { id: "performance", label: "Interpretacion" },
    { id: "persuasion", label: "Persuasion" }
  ] }
};
export const characterLevelProgression = [
  { level: 1, experiencePoints: 0, proficiencyBonus: 2 },
  { level: 2, experiencePoints: 300, proficiencyBonus: 2 },
  { level: 3, experiencePoints: 900, proficiencyBonus: 2 },
  { level: 4, experiencePoints: 2700, proficiencyBonus: 2 },
  { level: 5, experiencePoints: 6500, proficiencyBonus: 3 },
  { level: 6, experiencePoints: 14000, proficiencyBonus: 3 },
  { level: 7, experiencePoints: 23000, proficiencyBonus: 3 },
  { level: 8, experiencePoints: 34000, proficiencyBonus: 3 },
  { level: 9, experiencePoints: 48000, proficiencyBonus: 4 },
  { level: 10, experiencePoints: 64000, proficiencyBonus: 4 },
  { level: 11, experiencePoints: 85000, proficiencyBonus: 4 },
  { level: 12, experiencePoints: 100000, proficiencyBonus: 4 },
  { level: 13, experiencePoints: 120000, proficiencyBonus: 5 },
  { level: 14, experiencePoints: 140000, proficiencyBonus: 5 },
  { level: 15, experiencePoints: 165000, proficiencyBonus: 5 },
  { level: 16, experiencePoints: 195000, proficiencyBonus: 5 },
  { level: 17, experiencePoints: 225000, proficiencyBonus: 6 },
  { level: 18, experiencePoints: 265000, proficiencyBonus: 6 },
  { level: 19, experiencePoints: 305000, proficiencyBonus: 6 },
  { level: 20, experiencePoints: 355000, proficiencyBonus: 6 }
];
export const characterSkillLevelProgression = [
  { level: 1, label: "Suertudo", bonus: 1, experiencePoints: 4 },
  { level: 2, label: "Novato", bonus: 2, experiencePoints: 6 },
  { level: 3, label: "Junior", bonus: 3, experiencePoints: 8 },
  { level: 4, label: "Instructor", bonus: 4, experiencePoints: 10 },
  { level: 5, label: "Senior", bonus: 5, experiencePoints: 12 },
  { level: 6, label: "Experto", bonus: 6, experiencePoints: 14 },
  { level: 7, label: "Veterano", bonus: 7, experiencePoints: 16 },
  { level: 8, label: "Honorable", bonus: 8, experiencePoints: 18 },
  { level: 9, label: "Elite", bonus: 9, experiencePoints: 20 },
  { level: 10, label: "Leyenda", bonus: 10, experiencePoints: 25 }
];
export const characterSkillColorPalette = [
  "#d88d5a",
  "#5d9cec",
  "#78b96d",
  "#f0c879",
  "#b987f2",
  "#e06d78",
  "#49b8c8",
  "#c7a45b",
  "#7dd18c",
  "#d97fd0",
  "#6bb0ff",
  "#ff9f6e"
];
export const defaultCharacterSkillTemplates = [
  { id: "skill-despiece", name: "Despiece", color: "#d88d5a", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-pesca", name: "Pesca", color: "#5d9cec", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-forrajeo", name: "Forrajeo", color: "#78b96d", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-cocina", name: "Cocina", color: "#f0c879", successGains: [3], intermediateGains: [2], failureGains: [1] },
  { id: "skill-cerraduras", name: "Cerraduras", color: "#b987f2", successGains: [2], intermediateGains: [], failureGains: [1] },
  { id: "skill-trampas-puertas-secretas", name: "Trampas y puertas secretas", color: "#e06d78", successGains: [3], intermediateGains: [], failureGains: [0] }
];
export const itemSizeThresholds = [
  { label: "XS", minWeight: 0 },
  { label: "S", minWeight: 1 },
  { label: "M", minWeight: 5 },
  { label: "L", minWeight: 15 },
  { label: "XL", minWeight: 30 },
  { label: "XXL", minWeight: 60 }
];
export const characterCurrencyRows = [
  { name: "COBRE", shortLabel: "CO", icon: "copper" },
  { name: "PLATA", shortLabel: "PL", icon: "silver" },
  { name: "ORO", shortLabel: "OR", icon: "gold" },
  { name: "ELECTRO", shortLabel: "EL", icon: "electrum" },
  { name: "PLATINO", shortLabel: "PT", icon: "platinum" }
];
export const challengeRatingExperienceByCr = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
};
export const experienceFormatter = new Intl.NumberFormat("es-ES");
export const combatTagOptions = ["ALIADO", "NEUTRAL", "ENEMIGO"];
export const LEGACY_COMBAT_PLACEHOLDER_NAMES = new Set([
  "seraphina vale",
  "thoren ashbrand",
  "ghoul packleader",
  "cult adept"
]);

export const ENEMY_HP_MODE_FIXED = "fixed";
export const ENEMY_HP_MODE_VARIABLE = "variable";
export const TOPBAR_NAV_ROWS = [
  {
    id: "game",
    screenIds: ["combat-tracker", "initiative-board", "diary", "tables"]
  },
  {
    id: "reference",
    screenIds: ["bestiary", "items", "arcanum"]
  }
];

