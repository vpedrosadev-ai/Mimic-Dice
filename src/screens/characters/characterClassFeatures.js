import {
  findCharacterClassRecord,
  findCharacterSubclassRecord,
  getLocalizedCharacterClassFeature
} from "../../data/characterClassData.js";

const abilityLabels = Object.freeze({
  en: { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" },
  es: { str: "Fuerza", dex: "Destreza", con: "Constitucion", int: "Inteligencia", wis: "Sabiduria", cha: "Carisma" }
});

const proficiencyLabels = Object.freeze({
  en: {
    light: "Light armor",
    medium: "Medium armor",
    heavy: "Heavy armor",
    shield: "Shields",
    simple: "Simple weapons",
    martial: "Martial weapons"
  },
  es: {
    light: "Armaduras ligeras",
    medium: "Armaduras medias",
    heavy: "Armaduras pesadas",
    shield: "Escudos",
    simple: "Armas simples",
    martial: "Armas marciales"
  }
});

export function renderCharacterClassFeaturesSection({
  character,
  catalog,
  status = "idle",
  error = "",
  interfaceLanguage = "es",
  contentLanguage = "es"
}) {
  const isEnglish = interfaceLanguage === "en";
  const isOpen = character?.classFeaturesOpen !== false;
  const entries = (Array.isArray(character?.classEntries) ? character.classEntries : [])
    .filter((entry, index) => index === 0 || character?.isMulticlass)
    .map((entry) => getClassSelection(catalog, entry))
    .filter((selection) => selection.classEntity);
  const unlockedCount = entries.reduce((sum, selection) => (
    sum + getCombinedFeatures(selection).filter((feature) => feature.level <= selection.level).length
  ), 0);
  const totalCount = entries.reduce((sum, selection) => sum + getCombinedFeatures(selection).length, 0);
  const title = isEnglish ? "Class Features" : "Caracteristicas de clase";
  const toggleLabel = isEnglish
    ? (isOpen ? "Hide class features" : "Show class features")
    : (isOpen ? "Ocultar caracteristicas de clase" : "Mostrar caracteristicas de clase");

  return `
    <section class="detail-section character-class-features">
      <div class="character-section-toggle character-section-toggle--class-features">
        <div class="character-section-toggle__click" data-action="toggle-character-class-features">
          <div class="character-class-features__heading">
            <span>${escapeHtml(title)}</span>
            <div class="character-class-features__summary">
              <strong>${escapeHtml(String(unlockedCount))} ${escapeHtml(isEnglish ? "unlocked" : "desbloqueadas")}</strong>
              <small>${escapeHtml(String(totalCount))} ${escapeHtml(isEnglish ? "total" : "totales")}</small>
            </div>
          </div>
        </div>
        <button
          class="character-section-toggle__button"
          type="button"
          data-action="toggle-character-class-features"
          aria-expanded="${isOpen}"
          aria-label="${escapeHtml(toggleLabel)}"
        >
          <strong aria-hidden="true">${isOpen ? "-" : "+"}</strong>
        </button>
      </div>
      ${isOpen ? renderSectionBody({ entries, status, error, isEnglish, contentLanguage, catalog }) : ""}
    </section>
  `;
}

function renderSectionBody({ entries, status, error, isEnglish, contentLanguage, catalog }) {
  if (status === "loading" || status === "idle") {
    return `<div class="character-class-features__state">${escapeHtml(isEnglish ? "Loading class data..." : "Cargando datos de clases...")}</div>`;
  }

  if (status === "error") {
    return `<div class="character-class-features__state character-class-features__state--error">${escapeHtml(error || (isEnglish ? "Class data could not be loaded." : "No se pudieron cargar los datos de clases."))}</div>`;
  }

  if (entries.length === 0) {
    return `<div class="character-class-features__state">${escapeHtml(isEnglish
      ? "Enter a recognized class to see its progression and features."
      : "Introduce una clase reconocida para ver su progresion y caracteristicas.")}</div>`;
  }

  return `
    <div class="character-class-features__body">
      ${entries.map((selection) => renderClassBlock(selection, { isEnglish, contentLanguage, catalog })).join("")}
    </div>
  `;
}

function renderClassBlock(selection, { isEnglish, contentLanguage, catalog }) {
  const { entry, classEntity, subclass, level } = selection;
  const combinedFeatures = getCombinedFeatures(selection);
  const unlocked = combinedFeatures.filter((feature) => feature.level <= level);
  const upcoming = combinedFeatures.filter((feature) => feature.level > level);
  const localizedFeatures = combinedFeatures.map((feature) => ({
    ...feature,
    feature: getLocalizedCharacterClassFeature(feature.feature, catalog)
  }));
  const localizedById = new Map(localizedFeatures.map((feature) => [feature.feature.id, feature]));
  const localizedUnlocked = unlocked.map((feature) => localizedById.get(feature.feature.id) || feature);
  const localizedUpcoming = upcoming.map((feature) => localizedById.get(feature.feature.id) || feature);
  const classTitle = `${entry.name || classEntity.name} (${classEntity.source})`;
  const subclassTitle = subclass ? `${subclass.shortName || subclass.name} (${subclass.source})` : "";

  return `
    <article class="character-class-features__class">
      <header class="character-class-features__class-header">
        <div>
          <p class="eyebrow">${escapeHtml(isEnglish ? `Level ${level}` : `Nivel ${level}`)}</p>
          <h4>${escapeHtml(classTitle)}</h4>
        </div>
        ${subclassTitle ? `<span class="character-class-features__subclass">${escapeHtml(subclassTitle)}</span>` : ""}
      </header>
      ${renderProgressionTable(selection, localizedFeatures, isEnglish)}
      ${renderCoreTraits(classEntity, contentLanguage, isEnglish)}
      ${renderFeatureGroup(localizedUnlocked, {
        title: isEnglish ? "Unlocked features" : "Caracteristicas desbloqueadas",
        emptyText: isEnglish ? "No class features unlocked yet." : "Todavia no hay caracteristicas desbloqueadas.",
        stateClass: "unlocked",
        contentLanguage
      })}
      ${renderFeatureGroup(localizedUpcoming, {
        title: isEnglish ? "Upcoming features" : "Proximas caracteristicas",
        emptyText: isEnglish ? "No later features." : "No hay caracteristicas posteriores.",
        stateClass: "upcoming",
        contentLanguage
      })}
    </article>
  `;
}

function renderProgressionTable(selection, features, isEnglish) {
  const { classEntity, level } = selection;
  const columns = getClassTableColumns(classEntity);
  const featuresByLevel = new Map();

  for (const feature of features) {
    const levelFeatures = featuresByLevel.get(feature.level) ?? [];
    levelFeatures.push(feature);
    featuresByLevel.set(feature.level, levelFeatures);
  }

  return `
    <div class="character-class-progression" role="region" aria-label="${escapeHtml(isEnglish ? "Class progression" : "Progresion de clase")}">
      <table class="character-class-progression__table">
        <thead>
          <tr>
            <th>${escapeHtml(isEnglish ? "Level" : "Nivel")}</th>
            <th>${escapeHtml(isEnglish ? "Proficiency" : "Competencia")}</th>
            <th>${escapeHtml(isEnglish ? "Features" : "Caracteristicas")}</th>
            ${columns.map((column) => `<th title="${escapeHtml(column.fullLabel)}">${escapeHtml(column.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 20 }, (_, index) => {
            const rowLevel = index + 1;
            const rowFeatures = featuresByLevel.get(rowLevel) ?? [];
            return `
              <tr class="${rowLevel <= level ? "is-unlocked" : "is-upcoming"}">
                <th scope="row">${rowLevel}</th>
                <td>+${Math.ceil(rowLevel / 4) + 1}</td>
                <td class="character-class-progression__features">
                  ${rowFeatures.length > 0
                    ? rowFeatures.map((feature) => `<a href="#${escapeHtml(feature.anchorId)}">${escapeHtml(feature.feature.name)}</a>`).join(", ")
                    : "—"}
                </td>
                ${columns.map((column) => `<td>${escapeHtml(formatTableCell(column.rows[index]))}</td>`).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getClassTableColumns(classEntity) {
  const columns = [];

  for (const group of Array.isArray(classEntity?.classTableGroups) ? classEntity.classTableGroups : []) {
    const labels = Array.isArray(group.colLabels) ? group.colLabels : [];
    const rows = Array.isArray(group.rowsSpellProgression) ? group.rowsSpellProgression : group.rows;

    if (!Array.isArray(rows)) {
      continue;
    }

    labels.forEach((rawLabel, columnIndex) => {
      const fullLabel = strip5eToolsTags(rawLabel) || `Column ${columnIndex + 1}`;
      columns.push({
        fullLabel,
        label: shortenColumnLabel(fullLabel),
        rows: rows.map((row) => Array.isArray(row) ? row[columnIndex] : "")
      });
    });
  }

  return columns;
}

function renderCoreTraits(classEntity, language, isEnglish) {
  const normalizedLanguage = language === "es" ? "es" : "en";
  const core = getCoreTraits(classEntity, normalizedLanguage);
  const title = isEnglish ? "Core traits" : "Rasgos principales";

  return `
    <section class="character-class-core">
      <h5>${escapeHtml(title)}</h5>
      <dl class="character-class-core__grid">
        ${core.map((trait) => `
          <div class="character-class-core__trait">
            <dt>${escapeHtml(trait.label)}</dt>
            <dd>${escapeHtml(trait.value || "—")}</dd>
          </div>
        `).join("")}
      </dl>
    </section>
  `;
}

function getCoreTraits(classEntity, language) {
  const isSpanish = language === "es";
  const starting = classEntity?.startingProficiencies ?? {};
  const hitDie = classEntity?.hd?.faces ? `1d${classEntity.hd.faces}` : "—";
  const savingThrows = formatAbilityList(classEntity?.proficiency, language);
  const armor = formatProficiencyCollection(starting.armorProficiencies ?? starting.armor, language);
  const weapons = formatProficiencyCollection(starting.weapons, language);
  const skills = formatSkillChoices(starting.skills, language);
  const primaryAbility = formatPrimaryAbility(classEntity, language);

  return [
    { label: isSpanish ? "Dado de golpe" : "Hit Die", value: hitDie },
    { label: isSpanish ? "Caracteristica principal" : "Primary Ability", value: primaryAbility },
    { label: isSpanish ? "Tiradas de salvacion" : "Saving Throws", value: savingThrows },
    { label: isSpanish ? "Armaduras" : "Armor", value: armor },
    { label: isSpanish ? "Armas" : "Weapons", value: weapons },
    { label: isSpanish ? "Habilidades" : "Skills", value: skills }
  ];
}

function renderFeatureGroup(features, { title, emptyText, stateClass, contentLanguage }) {
  return `
    <section class="character-class-feature-group character-class-feature-group--${stateClass}">
      <h5>${escapeHtml(title)}</h5>
      ${features.length > 0
        ? `<div class="character-class-feature-group__list">${features.map((entry) => renderFeature(entry, contentLanguage)).join("")}</div>`
        : `<p class="character-class-feature-group__empty">${escapeHtml(emptyText)}</p>`}
    </section>
  `;
}

function renderFeature(entry, contentLanguage) {
  const feature = entry.feature;
  const fallbackLabel = contentLanguage === "es" && feature.translationAvailable === false
    ? `<span class="character-class-feature__fallback" title="Traduccion no disponible">EN</span>`
    : "";

  return `
    <article class="character-class-feature ${entry.kind === "subclass" ? "character-class-feature--subclass" : ""}" id="${escapeHtml(entry.anchorId)}">
      <header class="character-class-feature__header">
        <div>
          <p class="eyebrow">${escapeHtml(entry.kind === "subclass" ? "SUBCLASS" : "CLASS")} · ${escapeHtml(`LVL ${entry.level}`)}</p>
          <h6>${escapeHtml(feature.name)} <span>(${escapeHtml(feature.source || "—")})</span></h6>
        </div>
        ${feature.optional ? `<span class="character-class-feature__optional">OPTIONAL</span>` : fallbackLabel}
      </header>
      <div class="character-class-feature__content">
        ${render5eToolsEntries(feature.entries)}
      </div>
    </article>
  `;
}

function getClassSelection(catalog, entry) {
  const classEntity = findCharacterClassRecord(catalog, entry);
  const subclass = classEntity ? findCharacterSubclassRecord(classEntity, entry) : null;
  const level = Math.max(0, Math.min(20, Math.floor(Number(entry?.level) || 0)));
  return { entry, classEntity, subclass, level };
}

function getCombinedFeatures(selection) {
  const classFeatures = flattenLevels(selection.classEntity?.levels, "class", selection.entry?.id);
  const subclassFeatures = flattenLevels(selection.subclass?.levels, "subclass", selection.entry?.id);
  return [...classFeatures, ...subclassFeatures].sort((left, right) => (
    left.level - right.level
    || left.kind.localeCompare(right.kind)
    || String(left.feature.name || "").localeCompare(String(right.feature.name || ""), "en", { sensitivity: "base" })
  ));
}

function flattenLevels(levels, kind, rowId) {
  return (Array.isArray(levels) ? levels : []).flatMap((levelEntry) => (
    (Array.isArray(levelEntry.features) ? levelEntry.features : []).map((feature) => ({
      kind,
      level: Number(levelEntry.level) || Number(feature.level) || 0,
      feature,
      anchorId: `class-feature-${safeId(rowId)}-${safeId(feature.id)}`
    }))
  ));
}

function render5eToolsEntries(entries) {
  if (entries === null || entries === undefined || entries === "") {
    return `<p class="character-class-feature__empty">—</p>`;
  }

  if (typeof entries === "string" || typeof entries === "number") {
    return `<p>${render5eToolsInline(String(entries))}</p>`;
  }

  if (Array.isArray(entries)) {
    return entries.map((entry) => render5eToolsEntries(entry)).join("");
  }

  if (typeof entries !== "object") {
    return "";
  }

  if (entries.type === "list") {
    return `<ul>${(entries.items ?? []).map((item) => `<li>${render5eToolsEntryBody(item)}</li>`).join("")}</ul>`;
  }

  if (entries.type === "table") {
    const labels = Array.isArray(entries.colLabels) ? entries.colLabels : [];
    return `
      <div class="character-class-feature__table-wrap">
        <table>
          ${labels.length > 0 ? `<thead><tr>${labels.map((label) => `<th>${render5eToolsInline(String(label))}</th>`).join("")}</tr></thead>` : ""}
          <tbody>${(entries.rows ?? []).map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${render5eToolsEntryBody(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }

  if (entries.type === "quote") {
    return `<blockquote>${render5eToolsEntries(entries.entries)}${entries.by ? `<cite>${escapeHtml(entries.by)}</cite>` : ""}</blockquote>`;
  }

  if (entries.type === "refClassFeature" || entries.type === "refSubclassFeature") {
    return "";
  }

  const title = entries.name ? `<h6>${render5eToolsInline(String(entries.name))}</h6>` : "";
  const body = entries.entries !== undefined
    ? render5eToolsEntries(entries.entries)
    : entries.entry !== undefined
      ? render5eToolsEntries(entries.entry)
      : entries.items !== undefined
        ? render5eToolsEntries(entries.items)
        : "";
  return `${title}${body}`;
}

function render5eToolsEntryBody(value) {
  if (typeof value === "string" || typeof value === "number") {
    return render5eToolsInline(String(value));
  }

  return render5eToolsEntries(value);
}

function render5eToolsInline(value) {
  const source = String(value ?? "");
  const pattern = /\{@([a-zA-Z0-9]+)\s+([^{}]*)\}/g;
  let result = "";
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source))) {
    result += escapeHtml(source.slice(cursor, match.index));
    result += render5eToolsTag(match[1].toLowerCase(), match[2]);
    cursor = pattern.lastIndex;
  }

  result += escapeHtml(source.slice(cursor));
  return result;
}

function render5eToolsTag(tag, body) {
  const parts = String(body ?? "").split("|");
  const primary = parts[0] ?? "";
  const diceDisplay = parts[2] || parts[1] || primary;
  const display = parts[2] || primary;
  const firstDisplayTags = new Set([
    "book", "filter", "link", "variantrule", "class", "subclass", "condition", "status", "sense",
    "skill", "action", "quickref", "optfeature", "feat", "race", "background", "creature"
  ]);
  const rendered = render5eToolsInline(
    tag === "damage" || tag === "dice" || tag === "scaledice" || tag === "scaledamage"
      ? diceDisplay
      : firstDisplayTags.has(tag)
        ? primary
        : display
  );

  if (tag === "b" || tag === "bold") {
    return `<strong>${render5eToolsInline(primary)}</strong>`;
  }

  if (tag === "i" || tag === "italic") {
    return `<em>${render5eToolsInline(primary)}</em>`;
  }

  if (tag === "damage" || tag === "dice" || tag === "scaledice" || tag === "scaledamage") {
    return `<strong class="character-class-feature__dice">${rendered}</strong>`;
  }

  if (tag === "dc") {
    return `<strong>DC ${escapeHtml(primary)}</strong>`;
  }

  if (tag === "hit") {
    const normalized = /^[-+]/.test(primary) ? primary : `+${primary}`;
    return `<strong>${escapeHtml(normalized)}</strong>`;
  }

  if (tag === "note") {
    return `<em>${render5eToolsInline(primary)}</em>`;
  }

  return rendered;
}

function formatAbilityList(value, language) {
  const labels = abilityLabels[language] ?? abilityLabels.en;
  const values = Array.isArray(value) ? value : [];
  return values.map((entry) => labels[String(entry).toLowerCase()] || String(entry)).join(", ") || "—";
}

function formatPrimaryAbility(classEntity, language) {
  const labels = abilityLabels[language] ?? abilityLabels.en;
  const primary = Array.isArray(classEntity?.primaryAbility)
    ? classEntity.primaryAbility.flatMap((entry) => Object.keys(entry ?? {}).filter((key) => entry[key]))
    : [];
  const keys = primary.length > 0
    ? primary
    : classEntity?.spellcastingAbility
      ? [classEntity.spellcastingAbility]
      : [];
  return keys.map((key) => labels[String(key).toLowerCase()] || String(key)).join(", ") || "—";
}

function formatProficiencyCollection(value, language) {
  const labels = proficiencyLabels[language] ?? proficiencyLabels.en;
  const flattened = flattenProficiencyValues(value);
  return [...new Set(flattened.map((entry) => labels[String(entry).toLowerCase()] || strip5eToolsTags(entry)).filter(Boolean))].join(", ") || "—";
}

function flattenProficiencyValues(value) {
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenProficiencyValues(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
}

function formatSkillChoices(value, language) {
  const labels = abilityLabels[language] ?? abilityLabels.en;
  const rows = Array.isArray(value) ? value : [];
  const parts = [];

  for (const row of rows) {
    const choose = row?.choose;

    if (!choose) {
      continue;
    }

    const from = Array.isArray(choose.from)
      ? choose.from
      : String(choose.from || "").split(/\s+/).filter(Boolean);
    const names = from.map((entry) => labels[String(entry).toLowerCase()] || titleCase(String(entry)));
    const count = Number(choose.count) || 1;
    parts.push(language === "es"
      ? `Elige ${count}: ${names.join(", ")}`
      : `Choose ${count}: ${names.join(", ")}`);
  }

  return parts.join("; ") || "—";
}

function strip5eToolsTags(value) {
  return String(value ?? "")
    .replace(/\{@[a-zA-Z0-9]+\s+([^{}]*)\}/g, (_match, body) => {
      const parts = String(body).split("|");
      return parts[2] || parts[0] || "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function formatTableCell(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatTableCell(entry)).join(" / ");
  }

  if (typeof value === "object") {
    return strip5eToolsTags(value.value ?? value.name ?? value.entry ?? "—");
  }

  return strip5eToolsTags(String(value));
}

function shortenColumnLabel(value) {
  return String(value)
    .replace(/Cantrips Known/i, "Cantrips")
    .replace(/Prepared Spells/i, "Prepared")
    .replace(/Spell Slots?/i, "Slots")
    .replace(/Puntos de hechiceria/i, "Puntos")
    .slice(0, 18);
}

function titleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function safeId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "entry";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
