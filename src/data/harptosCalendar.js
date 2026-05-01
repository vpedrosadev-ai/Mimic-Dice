export const HARPTOS_DEFAULT_YEAR = 1492;

export const HARPTOS_CALENDAR_PERIODS = [
  { id: "hammer", name: "Hammer", days: 30, kind: "month" },
  { id: "midwinter", name: "Midwinter", days: 1, kind: "festival" },
  { id: "alturiak", name: "Alturiak", days: 30, kind: "month" },
  { id: "ches", name: "Ches", days: 30, kind: "month" },
  { id: "tarsakh", name: "Tarsakh", days: 30, kind: "month" },
  { id: "greengrass", name: "Greengrass", days: 1, kind: "festival" },
  { id: "mirtul", name: "Mirtul", days: 30, kind: "month" },
  { id: "kythorn", name: "Kythorn", days: 30, kind: "month" },
  { id: "flamerule", name: "Flamerule", days: 30, kind: "month" },
  { id: "midsummer", name: "Midsummer", days: 1, kind: "festival" },
  { id: "shieldmeet", name: "Shieldmeet", days: 1, kind: "festival" },
  { id: "eleasis", name: "Eleasis", days: 30, kind: "month" },
  { id: "eleint", name: "Eleint", days: 30, kind: "month" },
  { id: "highharvestide", name: "Highharvestide", days: 1, kind: "festival" },
  { id: "marpenoth", name: "Marpenoth", days: 30, kind: "month" },
  { id: "uktar", name: "Uktar", days: 30, kind: "month" },
  { id: "feast-of-the-moon", name: "Feast of the Moon", days: 1, kind: "festival" },
  { id: "nightal", name: "Nightal", days: 30, kind: "month" }
];

export const HARPTOS_PERIODS_BY_ID = new Map(
  HARPTOS_CALENDAR_PERIODS.map((period) => [period.id, period])
);
