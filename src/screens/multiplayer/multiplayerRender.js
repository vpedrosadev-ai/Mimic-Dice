import "./multiplayer.css";

import { escapeHtml } from "../../shared/text.js";

export function renderMultiplayerScreen({ authenticated = false, accountLoading = false, userName = "", language = "es" } = {}) {
  const english = language === "en";
  const title = english ? "Multiplayer" : "Multijugador";
  const description = english
    ? "Shared game modes built around your bestiary and combat tools."
    : "Modos compartidos construidos sobre tu bestiario y las herramientas de combate.";

  return `
    <section class="multiplayer-hub">
      <header class="multiplayer-hub__header">
        <div>
          <p class="eyebrow">MIMIC DICE ONLINE</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
        </div>
        <span class="multiplayer-hub__status ${authenticated ? "is-online" : ""}">
          <i></i>${accountLoading ? "Comprobando cuenta" : authenticated ? escapeHtml(userName || "Cuenta conectada") : "Modo local"}
        </span>
      </header>

      <div class="multiplayer-game-grid">
        <article class="multiplayer-game-card multiplayer-game-card--monsters">
          <div class="multiplayer-game-card__art" aria-hidden="true">
            <span class="multiplayer-game-card__moon"></span>
            <span class="multiplayer-game-card__crest">ML</span>
            <i class="multiplayer-game-card__silhouette multiplayer-game-card__silhouette--one"></i>
            <i class="multiplayer-game-card__silhouette multiplayer-game-card__silhouette--two"></i>
            <i class="multiplayer-game-card__silhouette multiplayer-game-card__silhouette--three"></i>
          </div>
          <div class="multiplayer-game-card__body">
            <div class="multiplayer-game-card__title-row">
              <div><p>AUCTION DRAFT</p><h3>Monsters League</h3></div>
              <span>Disponible</span>
            </div>
            <p>100 monedas. Un bestiario completo. Puja por criaturas, forma tu equipo y llévalo directamente a la tabla de combate.</p>
            <ul>
              <li>Lobby por enlace</li>
              <li>Subasta en tiempo real</li>
              <li>Equipos convertidos en encuentros</li>
              <li>Panel de criaturas en vivo</li>
            </ul>
            <div class="multiplayer-game-card__actions">
              <button class="summary-button" type="button" data-action="open-monsters-league" ${authenticated ? "" : "disabled"}>Crear lobby</button>
              <button class="summary-button summary-button--ghost" type="button" data-action="open-monsters-league-test">Probar con bots</button>
            </div>
            ${authenticated ? "" : `<small class="multiplayer-game-card__login-note">Inicia sesión para crear una sala online. El modo de prueba funciona localmente sin otros jugadores.</small>`}
          </div>
        </article>

        <article class="multiplayer-game-card multiplayer-game-card--coming">
          <div><span>PRÓXIMAMENTE</span><h3>Nuevos modos</h3><p>La arquitectura de lobby queda preparada para ampliar la colección multijugador.</p></div>
        </article>
      </div>
    </section>
  `;
}
