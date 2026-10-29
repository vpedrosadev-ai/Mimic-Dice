import { cleanText } from "../shared/text.js";

export function shouldHideMonstersLeagueRivalStats(combatant, viewerUserId) {
  const belongsToOnlineLeague = combatant?.multiplayerOnline === true || Boolean(
    cleanText(combatant?.teamId)
    && cleanText(combatant?.teamOwnerUserId)
    && cleanText(combatant?.multiplayerMonsterId)
  );
  if (!belongsToOnlineLeague) return false;
  const ownerUserId = cleanText(combatant.teamOwnerUserId);
  const viewerId = cleanText(viewerUserId);
  return !ownerUserId || !viewerId || ownerUserId !== viewerId;
}

export function projectMonstersLeagueCombatantForPlayer(combatant, viewerUserId, viewerPlayerId = "") {
  const ownsCombatant = cleanText(combatant?.teamId) === cleanText(viewerPlayerId)
    || !shouldHideMonstersLeagueRivalStats(combatant, viewerUserId);
  if (ownsCombatant) return { ...combatant, hideHealth: false, hideConditions: false };
  return {
    ...combatant,
    condiciones: "",
    hideHealth: true,
    hideConditions: true
  };
}
