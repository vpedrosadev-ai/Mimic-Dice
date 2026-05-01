import { getBestiaryInitials } from "../../data/compendiumEntries.js";
import { statKeys } from "../../data/gameConstants.js";
import { formatModifier, getAbilityModifier } from "../../shared/dndRules.js";
import { cleanText, escapeHtml } from "../../shared/text.js";

export function createCompendiumDetailRenderers({ t, getArcanumSpellLinkData, getItemSourceDescription }) {
  function renderItemDetail(entry) {
    const media = renderItemDetailMedia(entry);
    const kpis = renderItemKpis(entry);
    const detailBlocks = renderItemDetailBlocks(entry);
    const chips = [
      renderDetailChip(t("items_selected_type"), entry.typeLine),
      renderDetailChip(t("items_selected_properties"), entry.properties),
      renderDetailChip(t("items_selected_mastery"), entry.mastery)
    ].filter(Boolean).join("");

    return `
      <div class="bestiary-detail__header item-detail__header">
        <p class="eyebrow">${escapeHtml(t("item_selected"))}</p>
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="bestiary-detail__source">${escapeHtml(getItemSourceDescription(entry))}</p>
      </div>

      ${media ? `<div class="bestiary-detail__top">${media}</div>` : ""}

      ${kpis ? `<div class="bestiary-kpis">${kpis}</div>` : ""}

      ${detailBlocks ? `<div class="bestiary-detail__grid">${detailBlocks}</div>` : ""}

      ${chips ? `<div class="bestiary-resistances">${chips}</div>` : ""}

      <div class="bestiary-sections">
        ${renderBestiarySection(t("items_description"), entry.text || "Sin descripcion disponible.", { linkSpells: true })}
      </div>
    `;
  }

  function renderItemDetailEmpty() {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("item_empty_detail"))}
      </div>
    `;
  }

  function renderItemDetailMedia(entry) {
    if (entry.imageUrl) {
      return `
        <figure class="bestiary-portrait bestiary-portrait--item-image">
            <img
              class="bestiary-portrait__image bestiary-portrait__image--contain"
              src="${escapeHtml(entry.imageUrl)}"
              alt="Ilustracion de ${escapeHtml(entry.name)} (${escapeHtml(entry.sourceLabel)})"
              loading="lazy"
            />
            <figcaption class="bestiary-portrait__caption">${escapeHtml(entry.sourceLabel)}</figcaption>
        </figure>
      `;
    }

    return "";
  }

  function renderArcanumDetail(entry) {
    const textSection = renderBestiarySection(t("arcanum_text"), entry.text || "Sin texto disponible.");
    const extraSections = [
      { title: "At Higher Levels", content: entry.atHigherLevels }
    ].filter((section) => section.content);

    return `
      <div class="bestiary-detail__header arcanum-detail__header">
        <p class="eyebrow">${escapeHtml(t("spell_selected"))}</p>
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="bestiary-detail__source">${escapeHtml(entry.sourceLabel)}</p>
      </div>

      <div class="bestiary-detail__grid">
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("arcanum_casting_time"))}</span>
          <p>${escapeHtml(entry.castingTime || "No indicado")}</p>
        </div>
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("arcanum_duration"))}</span>
          <p>${escapeHtml(entry.duration || "No indicada")}</p>
        </div>
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("arcanum_range"))}</span>
          <p>${escapeHtml(entry.range || "No indicado")}</p>
        </div>
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("arcanum_components"))}</span>
          <p>${escapeHtml(entry.components || "No indicados")}</p>
        </div>
      </div>

      <div class="bestiary-sections">
        ${textSection}
        <div class="bestiary-resistances">
          ${renderDetailChip(t("arcanum_classes"), entry.classes || entry.optionalClasses)}
          ${renderDetailChip(t("arcanum_subclasses"), entry.subclasses)}
        </div>
        ${extraSections.map((section) => renderBestiarySection(section.title, section.content)).join("")}
      </div>
    `;
  }

  function renderArcanumDetailEmpty() {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("arcanum_empty_detail"))}
      </div>
    `;
  }

  function renderBestiaryDetail(entry) {
    const sections = [
      { title: t("section_traits"), content: entry.traits },
      { title: t("section_actions"), content: entry.actions },
      { title: t("section_bonus_actions"), content: entry.bonusActions },
      { title: t("section_reactions"), content: entry.reactions },
      { title: t("section_legendary_actions"), content: entry.legendaryActions },
      { title: t("section_mythic_actions"), content: entry.mythicActions },
      { title: t("section_lair_actions"), content: entry.lairActions },
      { title: t("section_regional_effects"), content: entry.regionalEffects }
    ].filter((section) => section.content);
    const metrics = [
      renderBestiaryMetric("HP", entry.hp || "-"),
      renderBestiaryMetric("CA", entry.ac || "-"),
      renderBestiaryMetric(t("metric_speed"), entry.speed || "-"),
      renderBestiaryMetric("CR", entry.crLabel)
    ].join("");
    const abilities = statKeys.map((ability) => renderBestiaryAbility(entry, ability)).join("");

    return `
      <div class="bestiary-detail__header">
        <p class="eyebrow">${escapeHtml(t("bestiary_selected_sheet"))}</p>
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="bestiary-detail__source">${escapeHtml(entry.sourceFullName || entry.source || "Sin fuente")}</p>
        <p class="lead">${escapeHtml(entry.typeLine)}</p>
      </div>

      <div class="bestiary-detail__summary">
        <div class="bestiary-detail__summary-stats">
          ${metrics}
        </div>
        ${renderBestiaryDetailMedia(entry)}
      </div>

      <div class="bestiary-detail__abilities bestiary-detail__abilities--summary">
        ${abilities}
      </div>

      <div class="bestiary-detail__grid">
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("metric_senses"))}</span>
          <p>${escapeHtml(entry.senses || "No indicado")}</p>
        </div>
        <div class="bestiary-detail__block">
          <span class="bestiary-detail__label">${escapeHtml(t("metric_languages"))}</span>
          <p>${escapeHtml(entry.languages || "No indicado")}</p>
        </div>
      </div>

      <div class="bestiary-resistances">
        ${renderDetailChip(t("chip_environment"), entry.environment)}
        ${renderDetailChip(t("chip_skills"), entry.skills)}
        ${renderDetailChip(t("chip_saving_throws"), entry.savingThrows)}
        ${renderDetailChip(t("chip_damage_vulnerabilities"), entry.damageVulnerabilities)}
        ${renderDetailChip(t("chip_damage_resistances"), entry.damageResistances)}
        ${renderDetailChip(t("chip_damage_immunities"), entry.damageImmunities)}
        ${renderDetailChip(t("chip_condition_immunities"), entry.conditionImmunities)}
      </div>

      <div class="bestiary-sections">
        ${sections.map((section) => renderBestiarySection(section.title, section.content, { linkSpells: true })).join("")}
      </div>
    `;
  }

  function renderBestiaryDetailEmpty() {
    return `
      <div class="empty-state empty-state--panel">
        ${escapeHtml(t("bestiary_empty_detail"))}
      </div>
    `;
  }

  function renderBestiaryDetailMedia(entry) {
    const mediaUrl = entry.imageUrl || entry.tokenUrl;

    if (mediaUrl) {
      return `
        <div class="bestiary-detail__media">
          <figure class="bestiary-portrait">
            <img
              class="bestiary-portrait__image"
              src="${escapeHtml(mediaUrl)}"
              alt="Ilustracion de ${escapeHtml(entry.name)} (${escapeHtml(entry.sourceLabel)})"
              loading="lazy"
            />
          </figure>
        </div>
      `;
    }

    return `
      <div class="bestiary-detail__media">
        <div class="bestiary-portrait bestiary-portrait--empty" aria-label="Ilustracion no disponible">
          <div class="bestiary-portrait__placeholder">${escapeHtml(getBestiaryInitials(entry.name))}</div>
          <p class="bestiary-portrait__hint">Sin ilustracion vinculada</p>
        </div>
      </div>
    `;
  }

  function renderBestiaryAbility(entry, ability) {
    const score = entry.abilities[ability] ?? 10;
    const modifier = formatModifier(getAbilityModifier(score));

    return `
      <article class="ability-card">
        <span>${ability}</span>
        <strong>${score}</strong>
        <small>${modifier}</small>
      </article>
    `;
  }

  function renderBestiaryMetric(label, value) {
    const metricValue = String(value ?? "");
    const sizeClass = getBestiaryMetricSizeClass(metricValue);

    return `
      <article class="bestiary-metric-card ${sizeClass}">
        <span>${escapeHtml(label)}</span>
        <strong title="${escapeHtml(metricValue)}">${escapeHtml(metricValue)}</strong>
      </article>
    `;
  }

  function getBestiaryMetricSizeClass(value) {
    const length = cleanText(value).length;

    if (length >= 28) {
      return "bestiary-metric-card--xs";
    }

    if (length >= 20) {
      return "bestiary-metric-card--sm";
    }

    return "";
  }

  function renderDetailChip(label, value) {
    if (!value) {
      return "";
    }

    return `
      <article class="detail-chip">
        <span>${label}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `;
  }

  function renderBestiarySection(title, content, options = {}) {
    const bodyHtml = options.linkSpells
      ? renderTextWithSpellLinks(content)
      : escapeHtml(content).replaceAll("\n", "<br />");

    return `
      <section class="detail-section">
        <h4>${title}</h4>
        <p>${bodyHtml}</p>
      </section>
    `;
  }

  function renderTextWithSpellLinks(content) {
    const text = cleanText(content);
    const spellLinkData = getArcanumSpellLinkData();

    if (!text || !spellLinkData.pattern) {
      return escapeHtml(content).replaceAll("\n", "<br />");
    }

    const chunks = [];
    let lastIndex = 0;
    spellLinkData.pattern.lastIndex = 0;

    for (const match of text.matchAll(spellLinkData.pattern)) {
      const [fullMatch, prefix, spellName] = match;
      const matchIndex = match.index ?? 0;
      const spellStartIndex = matchIndex + prefix.length;
      const canonicalName = spellLinkData.namesByLower.get(spellName.toLowerCase()) ?? spellName;

      chunks.push(escapeHtml(text.slice(lastIndex, spellStartIndex)));
      chunks.push(`<button class="spell-reference-link" type="button" data-action="filter-arcanum-by-spell-name" data-arcanum-spell-name="${escapeHtml(canonicalName)}">${escapeHtml(spellName)}</button>`);
      lastIndex = matchIndex + fullMatch.length;
    }

    chunks.push(escapeHtml(text.slice(lastIndex)));

    return chunks.join("").replaceAll("\n", "<br />");
  }

  function renderItemKpis(entry) {
    return [
      renderItemKpi("Rareza", entry.rarity && entry.rarity !== "none" ? entry.rarityShort : ""),
      renderItemKpi("Valor", entry.value ? entry.valueShort : ""),
      renderItemKpi("Peso", entry.weight ? entry.weightShort : ""),
      renderItemKpi("Talla", entry.sizeLabel),
      renderItemKpi("Attunement", entry.attunement ? entry.attunementShort : "")
    ].filter(Boolean).join("");
  }

  function renderItemKpi(label, value) {
    if (!value) {
      return "";
    }

    return `
      <article class="summary-card summary-card--compact">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function renderItemDetailBlocks(entry) {
    return [
      renderItemDetailBlock("Fuente", entry.sourceLabel),
      renderItemDetailBlock("Rareza", entry.rarity && entry.rarity !== "none" ? entry.rarityLabel : ""),
      renderItemDetailBlock("Tipo", entry.type),
      renderItemDetailBlock("Attunement", entry.attunement),
      renderItemDetailBlock("Damage", entry.damage),
      renderItemDetailBlock("Properties", entry.properties),
      renderItemDetailBlock("Mastery", entry.mastery),
      renderItemDetailBlock("Valor y peso", [
        entry.value ? entry.valueLabel : "",
        entry.weight ? entry.weightLabel : "",
        `Talla ${entry.sizeLabel}`
      ].filter(Boolean).join(" | "))
    ].filter(Boolean).join("");
  }

  function renderItemDetailBlock(label, value) {
    if (!value) {
      return "";
    }

    return `
      <div class="bestiary-detail__block">
        <span class="bestiary-detail__label">${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `;
  }

  return {
    renderArcanumDetail,
    renderArcanumDetailEmpty,
    renderBestiaryAbility,
    renderBestiaryDetail,
    renderBestiaryDetailEmpty,
    renderBestiaryMetric,
    renderBestiarySection,
    renderDetailChip,
    renderItemDetail,
    renderItemDetailEmpty
  };
}
