import { getAbilityModifier, parseStats } from "../../shared/dndRules.js";
import { cleanText } from "../../shared/text.js";

export function splitConcentrationStatusName(value) {
  const text = cleanText(value);
  const match = text.match(/^(?:concentrado|concentrada|concentrating)(?:\s*:\s*(.*))?$/i);
  if (!match) return null;
  return {
    detail: cleanText(match[1]).replace(/[,;|]+/g, " ").replace(/\s+/g, " ").slice(0, 64)
  };
}

export function isConcentrationStatusName(value) {
  return splitConcentrationStatusName(value) !== null;
}

export function formatConcentrationStatusName(baseName, detail) {
  const base = cleanText(baseName) || "Concentrado";
  const safeDetail = cleanText(detail).replace(/[,;|]+/g, " ").replace(/\s+/g, " ").slice(0, 64);
  return safeDetail ? `${base}: ${safeDetail}` : base;
}

export function getConcentrationSaveDc(damage) {
  const normalizedDamage = Math.max(0, Number(damage) || 0);
  return Math.max(10, Math.floor(normalizedDamage / 2));
}

export function getConstitutionSaveModifier(savingThrows, stats) {
  const normalizedSavingThrows = cleanText(savingThrows)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const explicitMatch = normalizedSavingThrows.match(/(?:^|[,;])\s*(?:con|constitution|constitucion)\s*([+-]\s*\d+)/i);
  if (explicitMatch) return Number(explicitMatch[1].replace(/\s+/g, ""));
  return getAbilityModifier(parseStats(stats).CON ?? 10);
}

export function resolveConcentrationSave({ damage, modifier = 0, roll }) {
  const naturalRoll = Math.max(1, Math.min(20, Math.floor(Number(roll) || 1)));
  const saveModifier = Math.trunc(Number(modifier) || 0);
  const dc = getConcentrationSaveDc(damage);
  const total = naturalRoll + saveModifier;
  return { naturalRoll, modifier: saveModifier, total, dc, success: total >= dc };
}
