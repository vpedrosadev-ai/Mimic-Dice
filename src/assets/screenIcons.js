import arcanumIconUrl from "./menu-icons/Arcanum.png";
import bestiaryIconUrl from "./menu-icons/Bestiario.png";
import combatIconUrl from "./menu-icons/Combate.png";
import diaryIconUrl from "./menu-icons/Diario.png";
import itemsIconUrl from "./menu-icons/Items.png";
import charactersIconUrl from "./menu-icons/Personajes.png";
import tablesIconUrl from "./menu-icons/Tablas.png";

export const SCREEN_ICON_URLS = Object.freeze({
  "combat-tracker": combatIconUrl,
  bestiary: bestiaryIconUrl,
  items: itemsIconUrl,
  arcanum: arcanumIconUrl,
  "initiative-board": charactersIconUrl,
  diary: diaryIconUrl,
  tables: tablesIconUrl
});

export function getScreenIconUrl(screenId) {
  return SCREEN_ICON_URLS[screenId] ?? "";
}
