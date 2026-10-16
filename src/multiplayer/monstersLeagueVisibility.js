import { cleanText } from "../shared/text.js";

export function shouldHideMonstersLeagueRivalStats(combatant, viewerUserId) {
  if (combatant?.multiplayerOnline !== true) return false;
  const ownerUserId = cleanText(combatant.teamOwnerUserId);
  const viewerId = cleanText(viewerUserId);
  return !ownerUserId || !viewerId || ownerUserId !== viewerId;
}
