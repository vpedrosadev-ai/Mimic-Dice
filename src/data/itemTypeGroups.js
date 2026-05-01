function normalizeItemTypeText(value) {
  return String(value ?? '').trim();
}
export const ITEM_TYPE_GROUPS = [
  {
    value: "__item-type-weapon__",
    label: "Weapon",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("weapon")
  },
  {
    value: "__item-type-melee-weapon__",
    label: "Melee weapon",
    level: 1,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("melee weapon")
  },
  {
    value: "__item-type-ranged-weapon__",
    label: "Ranged weapon",
    level: 1,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("ranged weapon")
  },
  {
    value: "__item-type-simple-weapon__",
    label: "Simple weapon",
    level: 2,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("simple weapon")
  },
  {
    value: "__item-type-martial-weapon__",
    label: "Martial weapon",
    level: 2,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("martial weapon")
  },
  {
    value: "__item-type-armor__",
    label: "Armor",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("armor")
  },
  {
    value: "__item-type-heavy-armor__",
    label: "Heavy armor",
    level: 1,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("heavy armor")
  },
  {
    value: "__item-type-light-armor__",
    label: "Light armor",
    level: 1,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("light armor")
  },
  {
    value: "__item-type-medium-armor__",
    label: "Medium armor",
    level: 1,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("medium armor")
  },
  {
    value: "__item-type-ammunition__",
    label: "Ammunition",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("ammunition")
  },
  {
    value: "__item-type-shield__",
    label: "Shield",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("shield")
  },
  {
    value: "__item-type-adventuring-gear__",
    label: "Adventuring gear",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().startsWith("adventuring gear")
  },
  {
    value: "__item-type-vehicle__",
    label: "Vehicle",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("vehicle")
  },
  {
    value: "__item-type-instrument__",
    label: "Instrument",
    level: 0,
    matches: (type) => normalizeItemTypeText(type).toLowerCase().includes("instrument")
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

