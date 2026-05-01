import { escapeHtml } from "../../shared/text.js";

export function createCompendiumListRenderers({
  t,
  translateUiString,
  getArcanumVirtualWindow,
  getBestiaryVirtualWindow,
  getCachedBestiaryRowHtml,
  getItemMostSpecificTypeLabel,
  getItemRarityClass,
  getItemVirtualWindow
}) {
  function renderItemRow(entry, isSelected) {
    const attunementChip = entry.requiresAttunement
      ? `<span class="pill item-row__attunement-pill">${escapeHtml(translateUiString("Sintonizacion"))}</span>`
      : "";
    const itemStats = [
      entry.value ? `${t("list_price")}: ${entry.valueLabel}` : "",
      entry.weight ? `${t("list_weight")}: ${entry.weightLabel} | ${t("list_size")}: ${entry.sizeLabel}` : `${t("list_size")}: ${entry.sizeLabel}`
    ].filter(Boolean).join(" | ");
    const rarityClass = getItemRarityClass(entry.rarityLabel);
    const typeSummary = getItemMostSpecificTypeLabel(entry.type);

    return `
      <button
        class="bestiary-row ${isSelected ? "is-selected" : ""}"
        type="button"
        role="listitem"
        data-action="select-item-entry"
        data-entry-id="${entry.id}"
        data-item-row-id="${entry.id}"
      >
        <div class="bestiary-row__main item-row__main">
          <div class="item-row__heading">
            <div class="item-row__title-stack">
              <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
              <span class="pill bestiary-row__source-pill">${escapeHtml(`${t("source_short")}: ${entry.source || "?"}`)}</span>
            </div>
            <p class="item-row__type-summary">${escapeHtml(typeSummary)}</p>
          </div>
          <div class="bestiary-row__chips">
            <span class="pill item-row__rarity-pill ${rarityClass}">${escapeHtml(entry.rarityLabel)}</span>
          </div>
        </div>
        ${itemStats || attunementChip ? `
          <div class="bestiary-row__stats item-row__stats">
            ${itemStats ? `<span>${escapeHtml(itemStats)}</span>` : "<span></span>"}
            ${attunementChip}
          </div>
        ` : ""}
      </button>
    `;
  }

  function renderItemList(filteredEntries, selectedId) {
    if (filteredEntries.length === 0) {
      return `
        <div class="empty-state empty-state--panel">
          ${escapeHtml(t("no_item_results"))}
        </div>
      `;
    }

    const virtualWindow = getItemVirtualWindow(filteredEntries.length);
    const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
    const listHtml = visibleEntries
      .map((entry) => renderItemRow(entry, entry.id === selectedId))
      .join("");

    return `
      <div
        class="bestiary-list__virtual"
        style="height: ${virtualWindow.totalHeight}px;"
        data-item-virtual-start="${virtualWindow.startIndex}"
        data-item-virtual-end="${virtualWindow.endIndex}"
        data-item-virtual-total="${filteredEntries.length}"
      >
        <div
          class="bestiary-list__virtual-window"
          style="transform: translateY(${virtualWindow.topPadding}px);"
        >
          ${listHtml}
        </div>
      </div>
    `;
  }

  function renderArcanumRow(entry, isSelected) {
    const detailItems = [
      [t("list_school"), entry.school || "-"],
      [t("list_casting"), entry.castingTime || t("list_no_casting")],
      [t("list_range"), entry.range || t("list_no_range")],
      [t("list_duration"), entry.duration || t("list_no_duration")]
    ];
    const concentrationChip = entry.hasConcentration
      ? `
        <div class="arcanum-row__status">
          <span class="pill arcanum-row__status-pill">${escapeHtml(translateUiString("Concentracion"))}</span>
        </div>
      `
      : "";

    return `
      <div
        class="bestiary-row ${isSelected ? "is-selected" : ""}"
        role="listitem"
        tabindex="0"
        data-action="select-arcanum-entry"
        data-entry-id="${entry.id}"
        data-arcanum-row-id="${entry.id}"
      >
        <div class="bestiary-row__layout">
          <div class="bestiary-row__content">
            <div class="bestiary-row__header">
              <div class="arcanum-row__title-stack">
                <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
                <button
                  class="pill bestiary-row__source-pill bestiary-row__filter-pill"
                  type="button"
                  data-action="filter-arcanum-by-source"
                  data-arcanum-source-value="${escapeHtml(entry.source)}"
                  aria-label="Filtrar por fuente ${escapeHtml(entry.sourceFullName || entry.source || "Sin fuente")}"
                >
                  ${escapeHtml(`${t("source_short")}: ${entry.source || "?"}`)}
                </button>
              </div>
              <button
                class="pill bestiary-row__filter-pill arcanum-row__level-pill"
                  type="button"
                  data-action="filter-arcanum-by-level"
                  data-arcanum-level-value="${escapeHtml(entry.level)}"
                  aria-label="Filtrar por nivel ${escapeHtml(entry.levelLabel || t("list_no_level"))}"
                >
                  ${escapeHtml(`${t("list_level")}: ${entry.levelLabel || t("list_no_level")}`)}
                </button>
            </div>
            <div class="arcanum-row__body">
              <div class="bestiary-row__facts">
                ${detailItems.map(([label, value]) => `
                  <p class="bestiary-row__fact">
                    <span class="bestiary-row__fact-label">${escapeHtml(label)}:</span>
                    <span class="bestiary-row__fact-value">${escapeHtml(value)}</span>
                  </p>
                `).join("")}
              </div>
              ${concentrationChip}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderArcanumList(filteredEntries, selectedId) {
    if (filteredEntries.length === 0) {
      return `
        <div class="empty-state empty-state--panel">
          ${escapeHtml(t("no_arcanum_results"))}
        </div>
      `;
    }

    const virtualWindow = getArcanumVirtualWindow(filteredEntries.length);
    const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
    const listHtml = visibleEntries
      .map((entry) => renderArcanumRow(entry, entry.id === selectedId))
      .join("");

    return `
      <div
        class="bestiary-list__virtual"
        style="height: ${virtualWindow.totalHeight}px;"
        data-arcanum-virtual-start="${virtualWindow.startIndex}"
        data-arcanum-virtual-end="${virtualWindow.endIndex}"
        data-arcanum-virtual-total="${filteredEntries.length}"
      >
        <div
          class="bestiary-list__virtual-window"
          style="transform: translateY(${virtualWindow.topPadding}px);"
        >
          ${listHtml}
        </div>
      </div>
    `;
  }

  function renderBestiaryRow(entry, isSelected) {
    const tokenBadge = entry.tokenUrl
      ? `
        <div class="bestiary-row__token" aria-hidden="true">
          <img
            class="bestiary-row__token-image"
            src="${escapeHtml(entry.tokenUrl)}"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      `
      : "";
    const detailItems = [
      [t("list_type"), entry.type || "-"],
      [t("list_environment"), entry.environment || t("list_no_environment")]
    ];

    return `
      <div
        class="bestiary-row ${isSelected ? "is-selected" : ""}"
        role="listitem"
        tabindex="0"
        data-action="select-bestiary-entry"
        data-entry-id="${entry.id}"
        data-bestiary-row-id="${entry.id}"
      >
        <div class="bestiary-row__layout">
          <div class="bestiary-row__content">
            <div class="bestiary-row__header">
              <p class="bestiary-row__title">${escapeHtml(entry.name)}</p>
              <button
                class="pill bestiary-row__source-pill bestiary-row__filter-pill"
                type="button"
                data-action="filter-bestiary-by-source"
                data-bestiary-source-value="${escapeHtml(entry.source)}"
                aria-label="Filtrar por fuente ${escapeHtml(entry.source)}"
              >
                ${escapeHtml(`${t("source_short")}: ${entry.source || "?"}`)}
              </button>
            </div>
            <div class="bestiary-row__facts">
              ${detailItems.map(([label, value]) => `
                <p class="bestiary-row__fact">
                  <span class="bestiary-row__fact-label">${escapeHtml(label)}:</span>
                  <span class="bestiary-row__fact-value">${escapeHtml(value)}</span>
                </p>
              `).join("")}
            </div>
            <div class="bestiary-row__footer">
              <div class="bestiary-row__cr">
                <button
                  class="pill bestiary-row__filter-pill"
                type="button"
                data-action="filter-bestiary-by-cr"
                data-bestiary-cr-value="${escapeHtml(entry.crBaseLabel || "")}"
                aria-label="Filtrar por CR ${escapeHtml(entry.crBaseLabel || "Sin CR")}"
              >
                ${escapeHtml(`${t("cr_short")}: ${entry.crBaseLabel || "Sin CR"}`)}
              </button>
              </div>
            </div>
          </div>
          ${tokenBadge ? `<div class="bestiary-row__token-wrap">${tokenBadge}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderBestiaryList(filteredEntries, selectedId) {
    if (filteredEntries.length === 0) {
      return `
        <div class="empty-state empty-state--panel">
          ${escapeHtml(t("no_bestiary_results"))}
        </div>
      `;
    }

    const virtualWindow = getBestiaryVirtualWindow(filteredEntries.length);
    const visibleEntries = filteredEntries.slice(virtualWindow.startIndex, virtualWindow.endIndex);
    const listHtml = visibleEntries
      .map((entry) => getCachedBestiaryRowHtml(entry, entry.id === selectedId))
      .join("");

    return `
      <div
        class="bestiary-list__virtual"
        style="height: ${virtualWindow.totalHeight}px;"
        data-bestiary-virtual-start="${virtualWindow.startIndex}"
        data-bestiary-virtual-end="${virtualWindow.endIndex}"
        data-bestiary-virtual-total="${filteredEntries.length}"
      >
        <div
          class="bestiary-list__virtual-window"
          style="transform: translateY(${virtualWindow.topPadding}px);"
        >
          ${listHtml}
        </div>
      </div>
    `;
  }

  return {
    renderArcanumList,
    renderBestiaryList,
    renderBestiaryRow,
    renderItemList
  };
}
