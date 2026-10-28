import { cleanText } from "../shared/text.js";

export function getMonstersLeagueLiveCombatant(combatState, combatant) {
  const teamId = cleanText(combatant?.teamId);
  const monsterId = cleanText(combatant?.multiplayerMonsterId);
  if (!teamId || !monsterId) return null;
  return combatState?.[teamId]?.[monsterId] || null;
}

export function mergeMonstersLeagueProjectedCombatantLiveState(combatant, combatState) {
  const live = getMonstersLeagueLiveCombatant(combatState, combatant);
  if (!live) return { ...combatant };
  return {
    ...combatant,
    pgMax: nonNegative(live.maxHp),
    pgAct: nonNegative(live.currentHp),
    pgTemp: nonNegative(live.tempHp),
    necrotic: nonNegative(live.necrotic),
    condiciones: Array.isArray(live.conditions) ? live.conditions.map(cleanText).filter(Boolean).join(", ") : "",
    iniactiva: cleanText(live.initiative),
    hiddenFromInitiative: live.hiddenFromInitiative === true,
    numPeana: cleanText(live.standNumber) || cleanText(combatant?.numPeana),
    isFlying: live.isFlying === true,
    flyingHeight: nonNegative(live.flyingHeight),
    mapTokenSize: cleanText(live.mapTokenSize)
  };
}

export function applyMonstersLeagueCombatDamage(combatState, command = {}) {
  const teamId = cleanText(command.teamId);
  const monsterId = cleanText(command.monsterId);
  const damage = nonNegative(command.amount);
  const current = combatState?.[teamId]?.[monsterId];
  if (!teamId || !monsterId || !current) return null;

  const nextState = structuredClone(combatState || {});
  const live = nextState[teamId][monsterId];
  const maxHp = nonNegative(live.maxHp);
  if (command.necroticDamage === true) {
    live.necrotic = Math.min(maxHp, nonNegative(live.necrotic) + damage);
  }
  let remaining = damage;
  const tempHp = nonNegative(live.tempHp);
  live.tempHp = Math.max(0, tempHp - remaining);
  remaining = Math.max(0, remaining - tempHp);
  live.currentHp = Math.max(0, Math.min(maxHp - nonNegative(live.necrotic), nonNegative(live.currentHp) - remaining));
  return nextState;
}

export function applyMonstersLeagueCombatantPatch(combatState, command = {}) {
  const teamId = cleanText(command.teamId);
  const monsterId = cleanText(command.monsterId);
  const current = combatState?.[teamId]?.[monsterId];
  if (!teamId || !monsterId || !current) return null;

  const nextState = structuredClone(combatState || {});
  const live = nextState[teamId][monsterId];
  const patch = command.patch && typeof command.patch === "object" ? command.patch : {};
  if (Object.prototype.hasOwnProperty.call(patch, "currentHp")) live.currentHp = nonNegative(patch.currentHp);
  if (Object.prototype.hasOwnProperty.call(patch, "tempHp")) live.tempHp = nonNegative(patch.tempHp);
  if (Object.prototype.hasOwnProperty.call(patch, "necrotic")) live.necrotic = nonNegative(patch.necrotic);
  if (Object.prototype.hasOwnProperty.call(patch, "initiative")) live.initiative = cleanText(patch.initiative).slice(0, 20);
  if (Object.prototype.hasOwnProperty.call(patch, "standNumber")) live.standNumber = cleanText(patch.standNumber).slice(0, 40);
  if (Object.prototype.hasOwnProperty.call(patch, "isFlying")) live.isFlying = patch.isFlying === true;
  if (Object.prototype.hasOwnProperty.call(patch, "flyingHeight")) live.flyingHeight = nonNegative(patch.flyingHeight);
  if (Object.prototype.hasOwnProperty.call(patch, "mapTokenSize")) live.mapTokenSize = cleanText(patch.mapTokenSize).slice(0, 40);
  if (Object.prototype.hasOwnProperty.call(patch, "hiddenFromInitiative")) live.hiddenFromInitiative = patch.hiddenFromInitiative === true;
  if (Object.prototype.hasOwnProperty.call(patch, "conditions")) {
    live.conditions = [...new Set((Array.isArray(patch.conditions) ? patch.conditions : [])
      .map(cleanText).filter(Boolean).map((value) => value.slice(0, 80)))].slice(0, 40);
  }
  const effectiveMax = Math.max(0, nonNegative(live.maxHp) - nonNegative(live.necrotic));
  live.currentHp = Math.min(nonNegative(live.currentHp), effectiveMax);
  return nextState;
}

export function advanceMonstersLeagueCombatTurn(combatState, combatMeta, direction = 1) {
  const participants = [];
  for (const [teamId, monsters] of Object.entries(combatState || {})) {
    for (const [monsterId, live] of Object.entries(monsters || {})) {
      if (cleanText(live?.initiative) === "" || nonNegative(live?.currentHp) <= 0 || live?.hiddenFromInitiative === true) continue;
      participants.push({
        key: `${cleanText(teamId)}:${cleanText(monsterId)}`,
        initiative: Number(live.initiative) || 0,
        stand: Number.parseFloat(cleanText(live.standNumber).replace(",", "."))
      });
    }
  }
  participants.sort((left, right) => right.initiative - left.initiative
    || (Number.isFinite(left.stand) ? left.stand : Number.MAX_SAFE_INTEGER) - (Number.isFinite(right.stand) ? right.stand : Number.MAX_SAFE_INTEGER)
    || left.key.localeCompare(right.key));
  if (!participants.length) return { active: true, round: Math.max(1, Math.floor(Number(combatMeta?.round) || 1)), activeMonsterKey: "" };

  const step = Number(direction) < 0 ? -1 : 1;
  const currentIndex = participants.findIndex((entry) => entry.key === cleanText(combatMeta?.activeMonsterKey));
  const baseIndex = currentIndex < 0 ? (step > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (baseIndex + step + participants.length) % participants.length;
  let round = Math.max(1, Math.floor(Number(combatMeta?.round) || 1));
  if (currentIndex >= 0 && step > 0 && nextIndex <= currentIndex) round += 1;
  if (currentIndex >= 0 && step < 0 && nextIndex >= currentIndex) round = Math.max(1, round - 1);
  return { active: true, round, activeMonsterKey: participants[nextIndex].key };
}

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
