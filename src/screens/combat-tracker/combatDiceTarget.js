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

export function getCombatDiceTargetOutcome(kind, total, armorClass, options = {}) {
  const normalizedTotal = Number(total);

  if (!Number.isFinite(normalizedTotal)) {
    throw new TypeError("Combat dice target total must be finite.");
  }

  if (kind === COMBAT_DICE_TARGET_ATTACK) {
    const normalizedArmorClass = armorClass === "" || armorClass === null || armorClass === undefined
      ? null
      : Number(armorClass);
    const hasArmorClass = Number.isFinite(normalizedArmorClass);

    const criticalOutcome = String(options.criticalOutcome || "");
    const isCritical = criticalOutcome === "critical" || criticalOutcome === "doubleCritical";
    const isFumble = criticalOutcome === "fumble" || criticalOutcome === "doubleFumble";

    return {
      kind,
      armorClass: hasArmorClass ? normalizedArmorClass : null,
      hit: isCritical ? true : isFumble ? false : hasArmorClass ? normalizedTotal >= normalizedArmorClass : null,
      appliedDamage: null
    };
  }

  return {
    kind: COMBAT_DICE_TARGET_DAMAGE,
    armorClass: null,
    hit: null,
    appliedDamage: getCombatDiceTargetAppliedDamage(normalizedTotal, options)
  };
}

export function getCombatDiceTargetAppliedDamage(total, options = {}) {
  const normalizedTotal = Math.max(0, Number(total));

  if (!Number.isFinite(normalizedTotal)) {
    throw new TypeError("Combat dice target damage must be finite.");
  }

  if (options.halfDamage !== true) {
    return normalizedTotal;
  }

  return options.isAlly === true
    ? Math.floor(normalizedTotal / 2)
    : Math.ceil(normalizedTotal / 2);
}

export function doubleDiceInFormula(formula) {
  return String(formula ?? "").replace(/(\d*)d(\d+)/gi, (_match, count, sides) => {
    const normalizedCount = count ? Number(count) : 1;
    return `${normalizedCount * 2}d${sides}`;
  });
}
