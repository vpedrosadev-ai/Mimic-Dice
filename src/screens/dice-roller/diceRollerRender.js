import { escapeHtml } from "../../shared/text.js";

export function renderDiceRollerDock({
  open = false,
  draft = "",
  error = "",
  history = [],
  rect = null,
  appIconUrl = "",
  language = "es",
  isPopout = false,
  helpOpen = false,
  rollMode = "",
  modifier = "+0",
  diceTrayOpen = false
} = {}) {
  const isEnglish = language === "en";

  if (!open && !isPopout) {
    return `
      <button
        class="dice-roller-launcher"
        type="button"
        data-action="open-dice-roller"
        aria-label="${escapeHtml(isEnglish ? "Open dice roller" : "Abrir lanzador de dados")}"
        title="${escapeHtml(isEnglish ? "Dice roller" : "Lanzador de dados")}"
      >
        <img src="${escapeHtml(appIconUrl)}" alt="" aria-hidden="true" />
      </button>
    `;
  }

  const rectStyle = !isPopout && rect
    ? `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;right:auto;bottom:auto;`
    : "";
  const popoutLabel = isEnglish ? "Open in new window" : "Abrir en otra ventana";
  const closeLabel = isEnglish ? "Close dice roller" : "Cerrar lanzador de dados";

  return `
    <section
      class="dice-roller-panel${isPopout ? " dice-roller-panel--popout" : ""}"
      style="${escapeHtml(rectStyle)}"
      data-dice-roller-panel
      data-no-dice-links
      aria-label="${escapeHtml(isEnglish ? "Dice roller" : "Lanzador de dados")}"
    >
      <header class="dice-roller-panel__header" data-dice-roller-popout-trigger>
        <div class="dice-roller-panel__identity">
          <img src="${escapeHtml(appIconUrl)}" alt="" aria-hidden="true" />
          <div>
            <small>MIMIC DICE</small>
            <strong>${escapeHtml(isEnglish ? "Dice log" : "Registro de dados")}</strong>
          </div>
        </div>
        <div class="dice-roller-panel__actions">
          <button
            class="dice-roller-panel__icon-button"
            type="button"
            data-action="clear-dice-roller-history"
            aria-label="${escapeHtml(isEnglish ? "Clear roll results" : "Limpiar resultados")}"
            title="${escapeHtml(isEnglish ? "Clear results" : "Limpiar resultados")}"
            ${history.length > 0 ? "" : "disabled"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg>
          </button>
          <button
            class="dice-roller-panel__icon-button${helpOpen ? " is-active" : ""}"
            type="button"
            data-action="toggle-dice-roller-help"
            aria-expanded="${helpOpen}"
            aria-label="${escapeHtml(isEnglish ? "Formula syntax help" : "Ayuda de sintaxis de formulas")}"
            title="${escapeHtml(isEnglish ? "Formula syntax" : "Sintaxis de formulas")}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v7h-2v-7Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" /></svg>
          </button>
          ${!isPopout ? `
            <button class="dice-roller-panel__icon-button" type="button" data-action="popout-dice-roller" aria-label="${escapeHtml(popoutLabel)}" title="${escapeHtml(popoutLabel)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h6v2H6v12h12v-5h2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8 0h7v7h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H13V4Z" /></svg>
            </button>
          ` : ""}
          <button class="dice-roller-panel__icon-button" type="button" data-action="close-dice-roller" aria-label="${escapeHtml(closeLabel)}" title="${escapeHtml(closeLabel)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
          </button>
        </div>
      </header>
      ${helpOpen ? renderDiceFormulaHelp(isEnglish) : ""}
      <div class="dice-roller-log" data-dice-roller-log aria-live="polite">
        ${history.length > 0
          ? history.map((entry) => renderDiceRollEntry(entry, language)).join("")
          : `<div class="dice-roller-log__empty"><strong>${escapeHtml(isEnglish ? "Ready to roll" : "Listo para lanzar")}</strong><p>${escapeHtml(isEnglish ? "Try 2d20+5 or (6d6+2d4*2+6)." : "Prueba 2d20+5 o (6d6+2d4*2+6).")}</p></div>`}
      </div>
      <form class="dice-roller-form" data-dice-roller-form>
        ${diceTrayOpen ? renderDiceTray(isEnglish) : ""}
        <div class="dice-roller-form__controls">
          <button
            class="dice-roller-control dice-roller-control--icon${diceTrayOpen ? " is-active" : ""}"
            type="button"
            data-action="toggle-dice-roller-tray"
            aria-expanded="${diceTrayOpen}"
            aria-label="${escapeHtml(isEnglish ? "Choose a die" : "Elegir un dado")}"
            title="${escapeHtml(isEnglish ? "Quick dice" : "Dados rápidos")}"
          >
            ${renderDieIcon(20)}
          </button>
          ${renderRollModeButton("advantage", rollMode, isEnglish)}
          ${renderRollModeButton("disadvantage", rollMode, isEnglish)}
          <button
            class="dice-roller-control dice-roller-control--icon"
            type="button"
            data-action="reroll-last-dice-formula"
            aria-label="${escapeHtml(isEnglish ? "Reroll last formula" : "Repetir última fórmula")}"
            title="${escapeHtml(isEnglish ? "Reroll last formula" : "Repetir última fórmula")}"
            ${history.length > 0 ? "" : "disabled"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h8V3l-3.3 3.3Z" /></svg>
          </button>
          <label class="dice-roller-modifier" title="${escapeHtml(isEnglish ? "Roll modifier" : "Modificador de tirada")}">
            <span class="sr-only">${escapeHtml(isEnglish ? "Modifier" : "Modificador")}</span>
            <input
              type="text"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              value="${escapeHtml(modifier)}"
              data-dice-roller-modifier
              aria-label="${escapeHtml(isEnglish ? "Modifier" : "Modificador")}"
            />
          </label>
        </div>
        <div class="dice-roller-form__formula-row">
          <label class="sr-only" for="dice-roller-formula${isPopout ? "-popout" : ""}">${escapeHtml(isEnglish ? "Dice formula" : "Formula de dados")}</label>
          <input
            id="dice-roller-formula${isPopout ? "-popout" : ""}"
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            value="${escapeHtml(draft)}"
            placeholder="2d20+5"
            data-dice-roller-input
          />
          <button type="submit" data-action="submit-dice-formula" aria-label="${escapeHtml(isEnglish ? "Roll dice" : "Lanzar dados")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2 20.3 3c.8-.4 1.6.4 1.2 1.2L13.3 21c-.4.8-1.6.6-1.7-.3l-.7-6.5-6.5-.7c-.9-.1-1.1-1.3-.3-1.7l6.1-3.1 1.1 1.1-4.1 2 5.1.6.6 5.1 5.8-11.8-11.8 5.8L3 11.2Z" /></svg>
          </button>
        </div>
      </form>
      ${error ? `<p class="dice-roller-form__error" role="alert">${escapeHtml(error)}</p>` : ""}
      ${!isPopout ? renderResizeHandles() : ""}
    </section>
  `;
}

function renderRollModeButton(mode, activeMode, isEnglish) {
  const active = mode === activeMode;
  const label = mode === "advantage"
    ? (isEnglish ? "Advantage" : "Ventaja")
    : (isEnglish ? "Disadvantage" : "Desventaja");

  return `
    <button
      class="dice-roller-control dice-roller-roll-mode${active ? " is-active" : ""}"
      type="button"
      data-action="toggle-dice-roller-roll-mode"
      data-dice-roll-mode="${mode}"
      aria-pressed="${active}"
      title="${escapeHtml(isEnglish ? `${label}: roll twice and keep one` : `${label}: lanza dos veces y conserva uno`)}"
    ><span class="dice-roller-control__label">${escapeHtml(label)}</span></button>
  `;
}

function renderDiceTray(isEnglish) {
  return `
    <div class="dice-roller-tray" role="group" aria-label="${escapeHtml(isEnglish ? "Quick dice" : "Dados rápidos")}">
      ${[4, 6, 8, 10, 12, 20, 100].map((sides) => `
        <button
          type="button"
          data-action="roll-dice-formula"
          data-dice-formula="d${sides}"
          aria-label="${escapeHtml(isEnglish ? `Roll d${sides}` : `Lanzar d${sides}`)}"
          title="d${sides}"
        >${renderDieIcon(sides)}<span class="dice-roller-die-label">d${sides}</span></button>
      `).join("")}
    </div>
  `;
}

function renderDieIcon(sides) {
  const shape = getDieShape(sides);
  return `
    <svg class="dice-roller-die-icon dice-result--d${escapeHtml(String(shape.classSides))}" viewBox="0 0 48 48" aria-hidden="true">
      <polygon points="${shape.points}" />
      ${shape.lines}
    </svg>
  `;
}

function renderDiceFormulaHelp(isEnglish) {
  const examples = ["1d20+5", "2d6+1d4*2", "(4d6+8)/2", "20+5*2"];

  return `
    <aside class="dice-roller-help" role="dialog" aria-label="${escapeHtml(isEnglish ? "Dice formula syntax" : "Sintaxis de formulas de dados")}">
      <strong>${escapeHtml(isEnglish ? "Formula syntax" : "Sintaxis de formulas")}</strong>
      <p>${escapeHtml(isEnglish
        ? "Combine dice and numbers, or enter a numeric calculation without dice. Spaces are optional."
        : "Combina dados y numeros, o introduce un calculo numerico sin dados. Los espacios son opcionales.")}</p>
      <ul>
        <li><code>2d6</code> — ${escapeHtml(isEnglish ? "two six-sided dice" : "dos dados de seis caras")}</li>
        <li><code>20+5*2</code> — ${escapeHtml(isEnglish ? "calculation without dice" : "calculo sin dados")}</li>
        <li><code>+ − * /</code> — ${escapeHtml(isEnglish ? "add, subtract, multiply, divide" : "sumar, restar, multiplicar, dividir")}</li>
        <li><code>( )</code> — ${escapeHtml(isEnglish ? "control operation order" : "controlar el orden de operaciones")}</li>
        <li><strong>${escapeHtml(isEnglish ? "Hit dice" : "Dados de vida")}</strong> — ${escapeHtml(isEnglish
          ? "each die has the fixed average as its minimum: d4 3, d6 4, d8 5, d10 6, d12 7"
          : "cada dado tiene como mínimo su media fija: d4 3, d6 4, d8 5, d10 6, d12 7")}</li>
      </ul>
      <div class="dice-roller-help__examples">
        ${examples.map((formula) => `<button type="button" data-action="roll-dice-formula" data-dice-formula="${escapeHtml(formula)}"><code>${escapeHtml(formula)}</code></button>`).join("")}
      </div>
    </aside>
  `;
}

function renderDiceRollEntry(entry, language) {
  const timeLabel = formatRollTime(entry.rolledAt, language);
  const outcomeLabel = entry.criticalOutcome === "doubleCritical"
    ? (language === "en" ? "DOUBLE CRITICAL!" : "DOBLE CRITICO!")
    : entry.criticalOutcome === "doubleFumble"
      ? (language === "en" ? "DOUBLE FUMBLE!" : "DOBLE PIFIA!")
      : entry.criticalOutcome === "critical"
        ? (language === "en" ? "CRITICAL!" : "CRITICO!")
        : entry.criticalOutcome === "fumble"
          ? (language === "en" ? "FUMBLE!" : "PIFIA!")
          : formatTotal(entry.total);
  const outcomeTone = entry.criticalOutcome === "doubleCritical" ? "critical" : entry.criticalOutcome === "doubleFumble" ? "fumble" : entry.criticalOutcome;
  const outcomeClass = outcomeTone ? ` dice-roll-entry__total--${outcomeTone}` : "";

  return `
    <article class="dice-roll-entry">
      <header>
        <div class="dice-roll-entry__title">
          ${timeLabel ? `<time datetime="${escapeHtml(new Date(entry.rolledAt).toISOString())}">${escapeHtml(timeLabel)}</time>` : ""}
          ${entry.userName ? `<span class="dice-roll-entry__user">${escapeHtml(entry.userName)}</span>` : ""}
          <code>${escapeHtml(entry.formula)}</code>
          ${entry.hitDiceMode ? `<span class="dice-roll-entry__mode">${escapeHtml(language === "en" ? "HIT DICE" : "DADOS DE VIDA")}</span>` : ""}
          ${entry.rollMode ? `<span class="dice-roll-entry__mode dice-roll-entry__mode--${escapeHtml(entry.rollMode)}">${escapeHtml(entry.rollMode === "advantage" ? (language === "en" ? "ADVANTAGE" : "VENTAJA") : (language === "en" ? "DISADVANTAGE" : "DESVENTAJA"))}</span>` : ""}
        </div>
        <strong class="dice-roll-entry__total${outcomeClass}">${escapeHtml(outcomeLabel)}</strong>
      </header>
      ${renderDiceTargetOutcome(entry, language)}
      <div class="dice-roll-entry__groups">
        ${(entry.groups || []).length > 0 ? (entry.groups || []).map((group) => `
          <section class="dice-roll-group">
            <span class="dice-roll-group__notation">${escapeHtml(group.notation)}</span>
            <div class="dice-roll-group__dice">
              ${(group.rolls || []).map((value, index) => renderDie(group.sides, value, group.rawRolls?.[index], {
                kept: group.keptRollIndex === index,
                discarded: group.keptRollIndex !== null && group.keptRollIndex !== undefined && group.keptRollIndex !== index,
                rollMode: group.rollMode || entry.rollMode,
                language
              })).join("")}
            </div>
            <strong class="dice-roll-group__subtotal">= ${escapeHtml(formatTotal(group.subtotal))}</strong>
          </section>
        `).join("") : `<p class="dice-roll-entry__calculation">${escapeHtml(language === "en" ? "Numeric calculation without dice" : "Cálculo numérico sin dados")}</p>`}
      </div>
    </article>
  `;
}

function renderDiceTargetOutcome(entry, language) {
  if (entry.contextKind === "concentration") {
    const isEnglish = language === "en";
    const maintained = entry.concentrationOutcome === "maintains";
    const targetName = String(entry.targetName || "").trim();
    const stand = String(entry.targetStand || "").trim();
    const concentrationName = String(entry.concentrationName || "").trim();
    const targetLabel = `${targetName}${stand ? ` · ${isEnglish ? "Stand" : "Peana"} ${stand}` : ""}`;
    const concentrationLabel = concentrationName
      ? `${isEnglish ? "Concentration" : "Concentración"}: ${concentrationName}`
      : (isEnglish ? "Concentration" : "Concentración");
    return `
      <div class="dice-roll-entry__target dice-roll-entry__target--concentration ${maintained ? "is-maintained" : "is-lost"}">
        <strong>${escapeHtml(maintained ? (isEnglish ? "MAINTAINS" : "MANTIENE") : (isEnglish ? "LOSES" : "PIERDE"))}</strong>
        <span>${escapeHtml(targetLabel)}</span>
        <small>${escapeHtml(`${concentrationLabel} · ${isEnglish ? "DC" : "CD"} ${entry.concentrationDc}`)}</small>
      </div>
    `;
  }

  const targetKind = String(entry.targetKind || "");
  const targetName = String(entry.targetName || "").trim();

  if (!targetKind || !targetName) {
    return "";
  }

  const isEnglish = language === "en";
  const stand = String(entry.targetStand || "").trim();
  const targetLabel = `${targetName}${stand ? ` · ${isEnglish ? "Stand" : "Peana"} ${stand}` : ""}`;

  if (targetKind === "attack") {
    const armorClass = entry.targetArmorClass;
    const armorClassHidden = entry.targetArmorClassHidden === true;
    const hasArmorClass = Number.isFinite(Number(armorClass)) && armorClass !== null && armorClass !== "";
    const hit = entry.targetHit === true;
    const isCritical = entry.criticalOutcome === "critical" || entry.criticalOutcome === "doubleCritical";
    const isFumble = entry.criticalOutcome === "fumble" || entry.criticalOutcome === "doubleFumble";
    const resultLabel = isCritical
      ? (isEnglish ? "HIT" : "ACIERTO")
      : isFumble
        ? (isEnglish ? "MISS" : "FALLO")
        : armorClassHidden
          ? (hit ? (isEnglish ? "HIT" : "ACIERTO") : (isEnglish ? "MISS" : "FALLO"))
        : hasArmorClass
          ? (hit ? (isEnglish ? "HIT" : "ACIERTO") : (isEnglish ? "MISS" : "FALLO"))
          : (isEnglish ? "NO AC" : "SIN CA");
    const detail = isCritical
      ? (isEnglish ? "Critical: automatic hit." : "Critico: impacto automatico.")
      : isFumble
        ? (isEnglish ? "Fumble: automatic miss." : "Pifia: fallo automatico.")
        : armorClassHidden
          ? (isEnglish ? "Target Armor Class hidden." : "Clase de Armadura del objetivo oculta.")
        : hasArmorClass
          ? `${entry.total} ${isEnglish ? "vs" : "contra"} ${isEnglish ? "AC" : "CA"} ${armorClass}`
      : (isEnglish ? "Target has no Armor Class value." : "El objetivo no tiene Clase de Armadura.");

    return `
      <div class="dice-roll-entry__target dice-roll-entry__target--${hit ? "hit" : "miss"}">
        <strong>${escapeHtml(resultLabel)}</strong>
        <span>${escapeHtml(targetLabel)}</span>
        <small>${escapeHtml(detail)}</small>
      </div>
    `;
  }

  if (targetKind === "damage") {
    const amount = Number(entry.appliedDamage);
    const damage = Number.isFinite(amount) ? amount : Number(entry.total) || 0;
    const damageLabel = entry.targetNecroticDamage
      ? (isEnglish ? "NECROTIC DAMAGE" : "DANO NECROTICO")
      : entry.targetHalfDamage
        ? (isEnglish ? "HALF DAMAGE" : "MITAD DE DANO")
        : entry.targetCriticalDamage
          ? (isEnglish ? "CRITICAL DAMAGE" : "DANO CRITICO")
          : (isEnglish ? "DAMAGE APPLIED" : "DANO APLICADO");

    return `
      <div class="dice-roll-entry__target dice-roll-entry__target--damage">
        <strong>${escapeHtml(damageLabel)}</strong>
        <span>${escapeHtml(targetLabel)}</span>
        <small>${escapeHtml(`${damage} ${isEnglish ? "HP removed" : "PG restados"}`)}</small>
      </div>
    `;
  }

  return "";
}

function formatRollTime(value, language) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function renderDie(sides, value, rawValue = value, { kept = false, discarded = false, rollMode = "", language = "es" } = {}) {
  const shape = getDieShape(sides);
  const adjusted = Number(rawValue) !== Number(value);
  const selectionLabel = kept
    ? (language === "en" ? "kept" : "elegido")
    : discarded
      ? (language === "en" ? "discarded" : "descartado")
      : "";
  const valueLabel = adjusted ? `d${sides}: ${rawValue} → ${value}` : `d${sides}: ${value}`;
  const title = selectionLabel ? `${valueLabel} (${selectionLabel})` : valueLabel;
  return `
    <span class="dice-result dice-result--d${escapeHtml(String(shape.classSides))}${adjusted ? " is-adjusted" : ""}${kept ? " is-kept" : ""}${discarded ? " is-discarded" : ""}${rollMode === "disadvantage" ? " is-disadvantage" : ""}" title="${escapeHtml(title)}">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <polygon points="${shape.points}" />
        ${shape.lines}
        <text x="24" y="27" text-anchor="middle">${escapeHtml(String(value))}</text>
      </svg>
      ${adjusted ? `<small aria-hidden="true">${escapeHtml(String(rawValue))}→${escapeHtml(String(value))}</small>` : ""}
      ${kept ? `<em class="dice-result__kept">${escapeHtml(language === "en" ? "KEPT" : "ELEGIDO")}</em>` : ""}
      <span class="sr-only">${escapeHtml(title)}</span>
    </span>
  `;
}

function getDieShape(sides) {
  if (sides === 4) return { classSides: 4, points: "24,3 45,43 3,43", lines: '<path d="M24 3v40M3 43l21-15 21 15" />' };
  if (sides === 6) return { classSides: 6, points: "7,7 41,7 41,41 7,41", lines: '<path d="M7 7l8 8h26M15 15v26" />' };
  if (sides === 8) return { classSides: 8, points: "24,2 45,24 24,46 3,24", lines: '<path d="M24 2v44M3 24h42" />' };
  if (sides === 10 || sides === 100) return { classSides: sides, points: "24,2 43,14 39,37 24,46 9,37 5,14", lines: '<path d="M24 2v44M5 14l19 12 19-12M9 37l15-11 15 11" />' };
  if (sides === 12) return { classSides: 12, points: "15,3 33,3 46,17 41,38 24,46 7,38 2,17", lines: '<path d="M15 3l9 11 9-11M2 17l13 6-8 15M46 17l-13 6 8 15M7 38l17-12 17 12" />' };
  if (sides === 20) return { classSides: 20, points: "24,2 43,13 46,33 32,46 16,46 2,33 5,13", lines: '<path d="M24 2 16 18 5 13M24 2l8 16 11-5M2 33l14-15 16 0 14 15M2 33l22-7 22 7M16 46l8-20 8 20" />' };
  return { classSides: "other", points: "24,2 43,9 46,28 35,44 13,44 2,28 5,9", lines: '<path d="M24 2v44M5 9l19 17L43 9M2 28h44" />' };
}

function renderResizeHandles() {
  return ["n", "e", "s", "w", "ne", "nw", "se", "sw"]
    .map((edge) => `<span class="dice-roller-resize dice-roller-resize--${edge}" data-dice-roller-resize="${edge}" aria-hidden="true"></span>`)
    .join("");
}

function formatTotal(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
}
