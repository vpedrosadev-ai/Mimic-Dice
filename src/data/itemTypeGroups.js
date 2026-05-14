function normalizeItemTypeText(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasItemTypeTerm(type, terms) {
  const normalizedType = ` ${normalizeItemTypeText(type).replace(/[^a-z0-9]+/g, " ")} `;
  return terms.some((term) => normalizedType.includes(` ${normalizeItemTypeText(term)} `));
}

export const ITEM_TYPE_GROUPS = [
  {
    value: "__item-type-weapon__",
    label: "Weapon",
    labelEs: "Arma",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["weapon", "arma"])
  },
  {
    value: "__item-type-melee-weapon__",
    label: "Melee weapon",
    labelEs: "Arma cuerpo a cuerpo",
    level: 1,
    matches: (type) => hasItemTypeTerm(type, ["melee weapon", "arma cuerpo a cuerpo"])
  },
  {
    value: "__item-type-ranged-weapon__",
    label: "Ranged weapon",
    labelEs: "Arma a distancia",
    level: 1,
    matches: (type) => hasItemTypeTerm(type, ["ranged weapon", "arma a distancia"])
  },
  {
    value: "__item-type-simple-weapon__",
    label: "Simple weapon",
    labelEs: "Arma simple",
    level: 2,
    matches: (type) => hasItemTypeTerm(type, ["simple weapon", "arma simple"])
  },
  {
    value: "__item-type-martial-weapon__",
    label: "Martial weapon",
    labelEs: "Arma marcial",
    level: 2,
    matches: (type) => hasItemTypeTerm(type, ["martial weapon", "arma marcial"])
  },
  {
    value: "__item-type-armor__",
    label: "Armor",
    labelEs: "Armadura",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["armor", "armadura"])
  },
  {
    value: "__item-type-heavy-armor__",
    label: "Heavy armor",
    labelEs: "Armadura pesada",
    level: 1,
    matches: (type) => hasItemTypeTerm(type, ["heavy armor", "armadura pesada"])
  },
  {
    value: "__item-type-light-armor__",
    label: "Light armor",
    labelEs: "Armadura ligera",
    level: 1,
    matches: (type) => hasItemTypeTerm(type, ["light armor", "armadura ligera"])
  },
  {
    value: "__item-type-medium-armor__",
    label: "Medium armor",
    labelEs: "Armadura media",
    level: 1,
    matches: (type) => hasItemTypeTerm(type, ["medium armor", "armadura media"])
  },
  {
    value: "__item-type-ammunition__",
    label: "Ammunition",
    labelEs: "Municion",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["ammunition", "municion", "municiones"])
  },
  {
    value: "__item-type-shield__",
    label: "Shield",
    labelEs: "Escudo",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["shield", "escudo"])
  },
  {
    value: "__item-type-adventuring-gear__",
    label: "Adventuring gear",
    labelEs: "Equipo de aventuras",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).startsWith("adventuring gear")
      || normalizeItemTypeText(type).startsWith("equipo de aventuras")
  },
  {
    value: "__item-type-vehicle__",
    label: "Vehicle",
    labelEs: "Vehiculo",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["vehicle", "vehiculo"])
  },
  {
    value: "__item-type-instrument__",
    label: "Instrument",
    labelEs: "Instrumento",
    level: 0,
    matches: (type) => hasItemTypeTerm(type, ["instrument", "instrumento"])
  }
];
export const ITEM_TYPE_GROUP_CHILDREN = {
  "__item-type-weapon__": [
    "__item-type-melee-weapon__",
    "__item-type-ranged-weapon__",
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-melee-weapon__": [
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-ranged-weapon__": [
    "__item-type-simple-weapon__",
    "__item-type-martial-weapon__"
  ],
  "__item-type-armor__": [
    "__item-type-heavy-armor__",
    "__item-type-light-armor__",
    "__item-type-medium-armor__"
  ]
};

