export const COMBAT_DICE_TARGET_ATTACK = "attack";
export const COMBAT_DICE_TARGET_DAMAGE = "damage";

export function getCombatDiceTargetKind(label, formula) {
  const normalizedLabel = String(label ?? "").trim();
  const normalizedFormula = String(formula ?? "").replace(/\s+/g, "").toLowerCase();

  if (/^[+-]\d+$/.test(normalizedLabel) && normalizedFormula === `d20${normalizedLabel}`) {
    return COMBAT_DICE_TARGET_ATTACK;
  }

  return COMBAT_DICE_TARGET_DAMAGE;
}

export function getCombatDiceTargetOutcome(kind, total, armorClass) {
  const normalizedTotal = Number(total);

  if (!Number.isFinite(normalizedTotal)) {
    throw new TypeError("Combat dice target total must be finite.");
  }

  if (kind === COMBAT_DICE_TARGET_ATTACK) {
    const normalizedArmorClass = armorClass === "" || armorClass === null || armorClass === undefined
      ? null
      : Number(armorClass);
    const hasArmorClass = Number.isFinite(normalizedArmorClass);

    return {
      kind,
      armorClass: hasArmorClass ? normalizedArmorClass : null,
      hit: hasArmorClass ? normalizedTotal >= normalizedArmorClass : null,
      appliedDamage: null
    };
  }

  return {
    kind: COMBAT_DICE_TARGET_DAMAGE,
    armorClass: null,
    hit: null,
    appliedDamage: Math.max(0, normalizedTotal)
  };
}
