export function createDiaryRenderers({
  state,
  t,
  escapeHtml,
  cleanText,
  renderScreenHeadingIdentity,
  getScreenIconUrl,
  getDiarySearchMatches,
  getDiaryFolderGroups,
  getActiveDiaryNote,
  getDiaryNoteSearchPreview,
  getDiaryNoteUpdatedLabel,
  getDiaryNotesByFolder,
  formatDiaryRealDateSummary,
  formatDiaryHarptosDateSummary,
  getDiaryNoteTags,
  renderDiaryTagSummaryChipHtml,
  normalizeDiaryContentHtml,
  HARPTOS_MONTH_PERIODS,
  HARPTOS_CALENDAR_PERIODS,
  HARPTOS_PERIODS_BY_ID,
  getDiaryHarptosOverviewValidPeriodId,
  normalizeDiaryHarptosOverviewYear,
  getDiaryHarptosMonthToneClass,
  getDiaryHarptosSeasonKey,
  getDiaryHarptosReferencedNotesForDay,
  getDiaryHarptosDayNoteStorageKey,
  normalizeDiaryHarptosQuickNote,
  formatDiaryHarptosDayLabel,
  getDiaryHarptosMoonPhase,
  getDiaryHarptosTransitionClass,
  getDiaryHarptosQuickNoteChipStyle
}) {
function renderDiaryScreen() {
  reconcileDiaryUiState();
  const activeNote = getActiveDiaryNote();
  const folderCount = state.diaryFolders.length;
  const diaryFolderGroups = getDiaryFolderGroups();
  const showDiarySearchPopover = state.showDiarySearchSuggestions && cleanText(state.diarySearchQuery).length > 0;
  const diarySearchMatches = showDiarySearchPopover ? getDiarySearchMatches() : [];

  return `
    <section class="panel panel--table diary-screen">
      <div class="section-heading">
        ${renderScreenHeadingIdentity("diary", t("diary_eyebrow"), t("diary_title"))}
        <div class="section-meta">
          <span>${escapeHtml(t("diary_notes_count", { count: state.diaryNotes.length }))}</span>
          <span>${escapeHtml(t("diary_folders_count", { count: folderCount }))}</span>
          <span>${escapeHtml(activeNote ? t("diary_open_note") : t("diary_no_selection"))}</span>
        </div>
      </div>

      <div class="characters-toolbar diary-screen__toolbar">
        <div class="toolbar-field toolbar-field--search bestiary-query diary-search" data-diary-search-menu>
          <span>${escapeHtml(t("diary_search_label"))}</span>
          <input
            class="filter-input filter-input--wide"
            type="search"
            value="${escapeHtml(state.diarySearchQuery)}"
            placeholder="${escapeHtml(t("diary_search_placeholder"))}"
            data-diary-search
          />
          ${
            showDiarySearchPopover
              ? `
                <div class="bestiary-query__popover diary-search__popover" role="listbox" aria-label="${escapeHtml(t("diary_search_results_aria"))}">
                  ${
                    diarySearchMatches.length > 0
                      ? diarySearchMatches.map((note) => renderDiarySearchSuggestion(note)).join("")
                      : `<p class="bestiary-filter__empty">${escapeHtml(t("diary_search_no_matches"))}</p>`
                  }
                </div>
              `
              : ""
          }
        </div>
        <div class="diary-screen__toolbar-actions">
          <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-diary-note">
            ${escapeHtml(t("diary_new_note"))}
          </button>
          <button class="toolbar-button" type="button" data-action="create-diary-folder">
            ${escapeHtml(t("diary_new_folder"))}
          </button>
          <button class="toolbar-button toolbar-button--danger" type="button" data-action="delete-diary-note" ${activeNote ? "" : "disabled"}>
            ${escapeHtml(t("diary_delete_note"))}
          </button>
          <button class="toolbar-button" type="button" data-action="open-diary-import-export">
            ${escapeHtml(t("import_export_button"))}
          </button>
          <button
            class="toolbar-button ${state.diaryHarptosOverviewOpen ? "is-active" : ""}"
            type="button"
            data-action="toggle-diary-harptos-overview"
            aria-expanded="${state.diaryHarptosOverviewOpen}"
          >
            <span class="button-icon" aria-hidden="true"><img src="${escapeHtml(getScreenIconUrl("tables"))}" alt="" decoding="async" /></span>
            ${escapeHtml(t("diary_harptos_overview_button"))}
          </button>
        </div>
      </div>

      ${state.diaryHarptosOverviewOpen ? renderDiaryHarptosOverviewSection() : ""}

      <div class="diary-layout">
        <aside class="diary-sidebar panel panel--inner" aria-label="${escapeHtml(t("diary_sidebar_aria"))}">
          <div class="diary-sidebar__header">
            <div>
              <p class="eyebrow">${escapeHtml(t("diary_list_eyebrow"))}</p>
              <h3>${escapeHtml(t("diary_entries_title"))}</h3>
            </div>
          </div>
          <div class="diary-sidebar__list">
            ${
              state.diaryNotes.length > 0 || state.diaryFolders.length > 0
                ? diaryFolderGroups.length > 0
                  ? diaryFolderGroups.map((folder) => renderDiaryFolderGroup(folder)).join("")
                  : `
                      <div class="empty-state empty-state--compact">
                        ${escapeHtml(t("diary_search_no_matches"))}
                      </div>
                    `
                : `
                  <div class="empty-state empty-state--compact">
                    ${escapeHtml(t("diary_empty_list"))}
                  </div>
                `
            }
          </div>
        </aside>

        <section class="diary-workspace panel panel--inner">
          ${
            activeNote
              ? renderDiaryEditor(activeNote)
              : `
                <div class="empty-state empty-state--panel diary-workspace__empty">
                  <div>
                    <p>${escapeHtml(t("diary_empty_workspace"))}</p>
                    <button class="toolbar-button toolbar-button--accent" type="button" data-action="create-diary-note">
                      ${escapeHtml(t("diary_create_first_note"))}
                    </button>
                  </div>
                </div>
              `
          }
        </section>
      </div>
    </section>
  `;
}

function renderDiarySearchSuggestion(note) {
  const preview = getDiaryNoteSearchPreview(note);

  return `
    <button
      class="bestiary-query__option diary-search__option"
      type="button"
      data-action="select-diary-search-suggestion"
      data-diary-note-id="${escapeHtml(note.id)}"
    >
      <strong>${escapeHtml(note.title || t("diary_note_untitled"))}</strong>
      <small>${escapeHtml(preview || getDiaryNoteUpdatedLabel(note.updatedAt))}</small>
    </button>
  `;
}

function renderDiaryFolderGroup(folder) {
  const folderNotes = getDiaryNotesByFolder(folder.id);
  const isActive = state.activeDiaryFolderId === folder.id;
  const isSystemFolder = folder.id === "";

  if (folderNotes.length === 0 && isSystemFolder && state.diaryFolders.length > 0) {
    return "";
  }

  return `
    <section class="encounter-folder ${isActive ? "is-active" : ""}">
      <div class="encounter-folder__header">
        <div class="encounter-folder__summary">
          <button
            class="encounter-folder__toggle"
            type="button"
            data-action="toggle-diary-folder"
            data-diary-folder-id="${escapeHtml(folder.id)}"
            aria-expanded="${folder.isExpanded}"
          >
            <span aria-hidden="true">${folder.isExpanded ? "v" : ">"}</span>
            <small>${folderNotes.length}</small>
          </button>
          ${
            isSystemFolder
              ? `<strong class="encounter-folder__static-name">${escapeHtml(folder.name)}</strong>`
              : `
                <input
                  class="encounter-folder__name"
                  type="text"
                  value="${escapeHtml(folder.name)}"
                  data-diary-folder-name="${escapeHtml(folder.id)}"
                  aria-label="${escapeHtml(t("diary_folder_name_aria", { name: folder.name }))}"
                />
              `
          }
        </div>
        <div class="tables-folder__actions">
          <button
            class="filter-clear"
            type="button"
            data-action="create-diary-note"
            ${folder.id ? `data-diary-folder-id="${escapeHtml(folder.id)}"` : ""}
          >
            ${escapeHtml(t("diary_folder_new_short"))}
          </button>
          ${
            !isSystemFolder
              ? `
                <button
                  class="filter-clear encounter-folder__delete"
                  type="button"
                  data-action="delete-diary-folder"
                  data-diary-folder-id="${escapeHtml(folder.id)}"
                  aria-label="${escapeHtml(t("diary_delete_folder_aria", { name: folder.name }))}"
                >
                  ${escapeHtml(t("diary_delete_folder_short"))}
                </button>
              `
              : ""
          }
        </div>
      </div>
      ${
        folder.isExpanded
          ? `
            <div class="encounter-folder__items">
              ${
                folderNotes.length > 0
                  ? folderNotes.map((note) => renderDiaryNoteListItem(note)).join("")
                  : `<div class="empty-state empty-state--compact">${escapeHtml(t("diary_empty_folder"))}</div>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderDiaryNoteListItem(note) {
  const isActive = note.id === state.activeDiaryNoteId;
  const realSummary = formatDiaryRealDateSummary(note) || t("diary_real_date_empty");
  const harptosSummary = formatDiaryHarptosDateSummary(note) || t("diary_harptos_date_empty");
  const tags = getDiaryNoteTags(note);

  return `
    <button
      class="diary-note-card ${isActive ? "is-active" : ""}"
      type="button"
      data-action="select-diary-note"
      data-diary-note-id="${escapeHtml(note.id)}"
      aria-pressed="${isActive}"
    >
      <strong>${escapeHtml(note.title || t("diary_note_untitled"))}</strong>
      <small class="diary-note-card__meta-row">${escapeHtml(t("diary_real_date_label"))}: ${escapeHtml(realSummary)}</small>
      <small class="diary-note-card__meta-row">${escapeHtml(t("diary_harptos_date_label"))}: ${escapeHtml(harptosSummary)}</small>
      ${tags.length > 0 ? `<span class="diary-note-card__tags">${tags.map((tag) => renderDiaryTagSummaryChipHtml(tag)).join("")}</span>` : ""}
      <span>${escapeHtml(getDiaryNoteUpdatedLabel(note.updatedAt))}</span>
    </button>
  `;
}

function renderDiaryEditor(note) {
  const contentHtml = normalizeDiaryContentHtml(note.contentHtml);

  return `
    <div class="diary-editor">
      <div class="diary-editor__header">
        <div class="diary-editor__identity">
          <label class="toolbar-field diary-editor__title">
            <span>${escapeHtml(t("diary_title_field"))}</span>
            <input
              class="filter-input"
              type="text"
              value="${escapeHtml(note.title)}"
              placeholder="${escapeHtml(t("diary_title_placeholder"))}"
              data-diary-title="${escapeHtml(note.id)}"
            />
          </label>
        </div>
        <div class="section-meta">
          <span>${escapeHtml(getDiaryNoteUpdatedLabel(note.updatedAt))}</span>
        </div>
      </div>

      <div class="diary-editor__meta-grid">
        ${renderDiaryRealDateCard(note)}
        ${renderDiaryHarptosDateCard(note)}
      </div>

      <div class="diary-editor__toolbar" aria-label="${escapeHtml(t("diary_toolbar_aria"))}">
        ${renderDiaryCommandButton("bold", t("diary_cmd_bold"))}
        ${renderDiaryCommandButton("italic", t("diary_cmd_italic"))}
        ${renderDiaryCommandButton("underline", t("diary_cmd_underline"))}
        ${renderDiaryCommandButton("strikeThrough", t("diary_cmd_strike"))}
        ${renderDiaryCommandButton("formatBlock", "H3", "<h3>")}
        ${renderDiaryCommandButton("formatBlock", t("diary_cmd_quote"), "<blockquote>")}
        ${renderDiaryCommandButton("insertUnorderedList", t("diary_cmd_list"))}
        ${renderDiaryCommandButton("insertOrderedList", t("diary_cmd_numbered"))}
        ${renderDiaryCommandButton("createLink", t("diary_cmd_link"))}
        ${renderDiaryCommandButton("unlink", t("diary_cmd_unlink"))}
        ${renderDiaryCommandButton("insertHorizontalRule", t("diary_cmd_separator"))}
        ${renderDiaryCommandButton("removeFormat", t("diary_cmd_clear"))}
        ${renderDiaryTokenButton("#", "insert-diary-tag-token", t("diary_tag_button_tooltip"))}
        ${renderDiaryTokenButton("@", "insert-diary-mention-token", t("diary_mention_button_tooltip"))}
      </div>

      <div class="diary-rich-editor-shell" data-diary-mention-root>
        <div
          class="diary-rich-editor"
          contenteditable="true"
          spellcheck="true"
          data-diary-editor="${escapeHtml(note.id)}"
        >${contentHtml}</div>
        <div class="diary-mention-popover" data-diary-mention-popover hidden></div>
      </div>
    </div>
  `;
}

function renderDiaryCommandButton(command, label, value = "") {
  return `
    <button
      class="toolbar-button toolbar-button--subtle diary-editor__command"
      type="button"
      data-action="apply-diary-command"
      data-diary-command="${escapeHtml(command)}"
      ${value ? `data-diary-command-value="${escapeHtml(value)}"` : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderDiaryTokenButton(label, action, tooltip) {
  return `
    <button
      class="toolbar-button toolbar-button--subtle diary-editor__command diary-editor__command--token"
      type="button"
      data-action="${escapeHtml(action)}"
      data-tooltip="${escapeHtml(tooltip)}"
      aria-label="${escapeHtml(tooltip)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderDiaryRealDateCard(note) {
  const isRange = note.realDateMode === "range";
  const summary = formatDiaryRealDateSummary(note) || t("diary_no_date_assigned");
  const isCollapsed = state.diaryCalendarSectionCollapsed.real === true;

  return `
    <section class="detail-section diary-date-card">
      <div class="diary-date-card__header">
        <button
          class="diary-date-card__title-button"
          type="button"
          data-action="toggle-diary-calendar-section"
          data-diary-calendar-section="real"
          aria-expanded="${isCollapsed ? "false" : "true"}"
        >
          <p class="eyebrow">${escapeHtml(t("diary_real_eyebrow"))}</p>
          <h4>${escapeHtml(t("diary_real_calendar_title"))}</h4>
        </button>
        <div class="diary-date-card__summary">${escapeHtml(summary)}</div>
      </div>
      ${
        isCollapsed
          ? ""
          : `
      <div class="diary-date-card__grid">
        <label class="toolbar-field diary-date-card__mode-field">
          <span>${escapeHtml(t("diary_mode_label"))}</span>
          <select data-diary-real-date-mode="${escapeHtml(note.id)}">
            <option value="single" ${isRange ? "" : "selected"}>${escapeHtml(t("diary_mode_day"))}</option>
            <option value="range" ${isRange ? "selected" : ""}>${escapeHtml(t("diary_mode_range"))}</option>
          </select>
        </label>
        <label class="toolbar-field">
          <span>${escapeHtml(isRange ? t("diary_start_label") : t("diary_day_label"))}</span>
          <input
            class="filter-input"
            type="date"
            value="${escapeHtml(note.realDateStart)}"
            data-diary-real-date-start="${escapeHtml(note.id)}"
          />
        </label>
        ${
          isRange
            ? `
              <label class="toolbar-field">
                <span>${escapeHtml(t("diary_end_label"))}</span>
                <input
                  class="filter-input"
                  type="date"
                  value="${escapeHtml(note.realDateEnd)}"
                  data-diary-real-date-end="${escapeHtml(note.id)}"
                />
              </label>
            `
            : ""
        }
      </div>
          `
      }
    </section>
  `;
}

function renderDiaryHarptosDateCard(note) {
  const isRange = note.harptosDateMode === "range";
  const summary = formatDiaryHarptosDateSummary(note) || t("diary_no_date_assigned");
  const isCollapsed = state.diaryCalendarSectionCollapsed.harptos === true;

  return `
    <section class="detail-section diary-date-card">
      <div class="diary-date-card__header">
        <button
          class="diary-date-card__title-button"
          type="button"
          data-action="toggle-diary-calendar-section"
          data-diary-calendar-section="harptos"
          aria-expanded="${isCollapsed ? "false" : "true"}"
        >
          <p class="eyebrow">${escapeHtml(t("diary_harptos_eyebrow"))}</p>
          <h4>${escapeHtml(t("diary_harptos_calendar_title"))}</h4>
        </button>
        <div class="diary-date-card__summary">${escapeHtml(summary)}</div>
      </div>
      ${
        isCollapsed
          ? ""
          : `
      <div class="diary-date-card__grid">
        <label class="toolbar-field diary-date-card__mode-field">
          <span>${escapeHtml(t("diary_mode_label"))}</span>
          <select data-diary-harptos-date-mode="${escapeHtml(note.id)}">
            <option value="single" ${isRange ? "" : "selected"}>${escapeHtml(t("diary_mode_day"))}</option>
            <option value="range" ${isRange ? "selected" : ""}>${escapeHtml(t("diary_mode_range"))}</option>
          </select>
        </label>
      </div>
      <div class="diary-date-card__range-grid">
        ${renderDiaryHarptosDateFields(note.id, "start", note.harptosStart, isRange ? t("diary_start_label") : t("diary_day_label"))}
        ${isRange ? renderDiaryHarptosDateFields(note.id, "end", note.harptosEnd, t("diary_end_label")) : ""}
      </div>
          `
      }
    </section>
  `;
}

function renderDiaryHarptosDateFields(noteId, side, dateValue, label) {
  const period = HARPTOS_PERIODS_BY_ID.get(dateValue.periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const isFestival = period.kind === "festival";
  const monthSelectValue = isFestival ? "" : dateValue.periodId;
  const subtitle = isFestival
    ? t("diary_harptos_festival_meta")
    : t("diary_harptos_month_meta", { count: period.days });

  return `
    <div class="diary-date-card__harptos-block">
      <div class="diary-date-card__block-header">
        <p class="eyebrow">${escapeHtml(label)}</p>
        <span class="diary-date-card__block-meta">${escapeHtml(subtitle)}</span>
      </div>
      <div class="diary-date-card__harptos-fields">
        <label class="toolbar-field">
          <span>${escapeHtml(t("diary_harptos_year_label"))}</span>
          <input
            class="filter-input"
            type="number"
            value="${escapeHtml(String(dateValue.year))}"
            min="1"
            step="1"
            data-diary-harptos-year="${escapeHtml(noteId)}"
            data-diary-harptos-side="${escapeHtml(side)}"
          />
        </label>
      </div>
      ${renderDiaryHarptosVisualCalendar(noteId, side, dateValue, monthSelectValue)}
    </div>
  `;
}

function formatHarptosPeriodSelectLabel(periodEntry) {
  return `${String(getHarptosMonthNumber(periodEntry.id)).padStart(2, "0")} ${periodEntry.name}`;
}

function renderDiaryHarptosVisualCalendar(noteId, side, dateValue, monthSelectValue = "") {
  const period = HARPTOS_PERIODS_BY_ID.get(dateValue.periodId) ?? HARPTOS_CALENDAR_PERIODS[0];
  const isFestival = period.kind === "festival";
  const visibleMonthId = getHarptosVisibleMonthPeriodId(dateValue);
  const visibleMonth = HARPTOS_PERIODS_BY_ID.get(visibleMonthId) ?? HARPTOS_MONTH_PERIODS[0];
  const monthToneClass = getDiaryHarptosMonthToneClass(visibleMonth.id);

  return `
    <div class="diary-harptos-visual">
      <div class="diary-harptos-visual__section">
        ${
          isFestival
            ? `
              <div class="diary-harptos-visual__festival-selected">
                ${escapeHtml(t("diary_harptos_festival_hidden_copy", { name: period.name, month: visibleMonth.name }))}
              </div>
            `
            : ""
        }
        <div class="toolbar-field diary-harptos-visual__month-field">
          <span>${escapeHtml(t("diary_harptos_month_label"))}</span>
          <details class="diary-harptos-visual__month-picker">
            <summary class="diary-harptos-visual__month-trigger ${escapeHtml(monthToneClass)}">
              ${escapeHtml(formatHarptosPeriodSelectLabel(visibleMonth))}
            </summary>
            <div class="diary-harptos-visual__month-options">
              ${HARPTOS_MONTH_PERIODS.map((periodEntry) => `
                <button
                  class="diary-harptos-visual__chip ${escapeHtml(getDiaryHarptosMonthToneClass(periodEntry.id))} ${periodEntry.id === visibleMonthId ? "is-active" : ""}"
                  type="button"
                  data-action="set-diary-harptos-period"
                  data-diary-harptos-period="${escapeHtml(noteId)}"
                  data-diary-harptos-side="${escapeHtml(side)}"
                  data-harptos-period-id="${escapeHtml(periodEntry.id)}"
                >
                  ${escapeHtml(formatHarptosPeriodSelectLabel(periodEntry))}
                </button>
              `).join("")}
            </div>
          </details>
        </div>
        <div class="diary-harptos-visual__days">
          ${Array.from({ length: visibleMonth.days }, (_, index) => index + 1).map((day) => {
            const moonPhase = getDiaryHarptosMoonPhase(visibleMonth.id, day);
            return `
              <button
                class="diary-harptos-visual__day diary-harptos-visual__day--${escapeHtml(getDiaryHarptosSeasonKey(visibleMonth.id, day))} ${visibleMonth.id === monthSelectValue && day === dateValue.day ? "is-active" : ""}"
                type="button"
                data-action="set-diary-harptos-day"
                data-diary-harptos-day="${escapeHtml(noteId)}"
                data-diary-harptos-side="${escapeHtml(side)}"
                data-harptos-day="${day}"
                title="${escapeHtml(formatDiaryHarptosDayLabel(visibleMonth.id, day, dateValue.year))}"
              >
                <span>${day}</span>
                ${moonPhase ? `<img class="diary-harptos-visual__moon-icon" src="${escapeHtml(moonPhase.iconUrl)}" alt="${escapeHtml(moonPhase.label)}" decoding="async" />` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function getHarptosMonthNumber(periodId) {
  return HARPTOS_MONTH_PERIODS.findIndex((entry) => entry.id === periodId) + 1;
}

function getHarptosVisibleMonthPeriodId(value) {
  const currentPeriodId = cleanText(value?.periodId);

  if (HARPTOS_MONTH_PERIODS.some((period) => period.id === currentPeriodId)) {
    return currentPeriodId;
  }

  const currentIndex = HARPTOS_CALENDAR_PERIODS.findIndex((period) => period.id === currentPeriodId);

  if (currentIndex >= 0) {
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (HARPTOS_CALENDAR_PERIODS[index]?.kind === "month") {
        return HARPTOS_CALENDAR_PERIODS[index].id;
      }
    }
  }

  return HARPTOS_MONTH_PERIODS[0]?.id ?? HARPTOS_CALENDAR_PERIODS[0]?.id ?? "";
}

function renderDiaryHarptosOverviewSection() {
  const periodId = getDiaryHarptosOverviewValidPeriodId(state.diaryHarptosOverviewPeriodId);
  const period = HARPTOS_PERIODS_BY_ID.get(periodId) ?? HARPTOS_MONTH_PERIODS[0];
  const overviewYear = normalizeDiaryHarptosOverviewYear(state.diaryHarptosOverviewYear);
  const monthToneClass = getDiaryHarptosMonthToneClass(period.id);

  return `
    <section class="panel panel--inner diary-harptos-overview">
      <div class="diary-harptos-overview__header">
        <div>
          <p class="eyebrow">${escapeHtml(t("diary_harptos_eyebrow"))}</p>
          <h3>${escapeHtml(t("diary_harptos_overview_title"))}</h3>
          <p class="diary-harptos-overview__copy">${escapeHtml(t("diary_harptos_overview_subtitle"))}</p>
        </div>
      </div>
      ${renderDiaryHarptosOverviewLegend()}
      <div class="diary-harptos-overview__controls">
        <label class="toolbar-field">
          <span>${escapeHtml(t("diary_harptos_overview_year"))}</span>
          <input
            class="filter-input"
            type="number"
            min="1"
            step="1"
            value="${escapeHtml(String(overviewYear))}"
            data-diary-harptos-overview-year
          />
        </label>
        <label class="toolbar-field diary-harptos-overview__month-field">
          <span>${escapeHtml(t("diary_harptos_month_label"))}</span>
          <details class="diary-harptos-overview__period-picker">
            <summary class="diary-harptos-overview__period-trigger ${escapeHtml(monthToneClass)}">
              ${escapeHtml(formatHarptosPeriodSelectLabel(period))}
            </summary>
            <div class="diary-harptos-overview__period-options">
              ${HARPTOS_MONTH_PERIODS.map((periodEntry) => `
                <button
                  class="diary-harptos-overview__period-chip ${escapeHtml(getDiaryHarptosMonthToneClass(periodEntry.id))} ${periodEntry.id === periodId ? "is-active" : ""}"
                  type="button"
                  data-action="set-diary-harptos-overview-period"
                  data-harptos-period-id="${escapeHtml(periodEntry.id)}"
                >
                  ${escapeHtml(formatHarptosPeriodSelectLabel(periodEntry))}
                </button>
              `).join("")}
            </div>
          </details>
        </label>
      </div>
      <div class="diary-harptos-overview__visual">
        <div class="diary-harptos-overview__days">
          ${Array.from({ length: period.days }, (_, index) => renderDiaryHarptosOverviewDayCard(period, overviewYear, index + 1)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderDiaryHarptosOverviewDayCard(period, year, day) {
  const seasonKey = getDiaryHarptosSeasonKey(period.id, day);
  const markerNotes = getDiaryHarptosReferencedNotesForDay(year, period.id, day);
  const quickNoteKey = getDiaryHarptosDayNoteStorageKey(year, period.id, day);
  const quickNote = normalizeDiaryHarptosQuickNote(state.diaryHarptosDayNotes?.[quickNoteKey]);
  const isSolstice = seasonKey === "transition";
  const dayLabel = formatDiaryHarptosDayLabel(period.id, day, year);
  const moonPhase = getDiaryHarptosMoonPhase(period.id, day);
  const transitionClass = isSolstice ? getDiaryHarptosTransitionClass(period.id, day) : "";
  const noteChips = markerNotes.map((note) => ({
    kind: "note",
    label: `${t("diary_harptos_overview_note_chip_prefix")}: ${note.title || t("diary_note_untitled")}`,
    noteId: note.id
  }));

  if (quickNote) {
    noteChips.push({
      kind: "quick",
      label: quickNote.label,
      color: quickNote.color
    });
  }

  return `
    <article
      class="diary-harptos-overview__day-card diary-harptos-overview__day-card--${escapeHtml(seasonKey)} ${escapeHtml(transitionClass)} ${markerNotes.length > 0 ? "has-diary-notes" : ""}"
      title="${escapeHtml([dayLabel, ...markerNotes.map((note) => note.title || t("diary_note_untitled"))].join(" | "))}"
    >
      <div class="diary-harptos-overview__day-top">
        <strong>
          <span class="diary-harptos-overview__day-number">${escapeHtml(String(day))}</span>
          <span class="diary-harptos-overview__day-month">${escapeHtml(period.name)}</span>
        </strong>
        <div class="diary-harptos-overview__day-badges">
          ${moonPhase ? `<img class="diary-harptos-overview__moon-icon" src="${escapeHtml(moonPhase.iconUrl)}" alt="${escapeHtml(moonPhase.label)}" title="${escapeHtml(moonPhase.label)}" decoding="async" />` : ""}
        </div>
      </div>
      ${
        noteChips.length > 0 || isSolstice
          ? `
            <div class="diary-harptos-overview__titles">
              ${noteChips.map((chip) => chip.kind === "note"
                ? `<button class="diary-harptos-overview__chip diary-harptos-overview__chip--note" type="button" data-action="open-harptos-note-from-calendar" data-diary-note-id="${escapeHtml(chip.noteId)}">${escapeHtml(chip.label)}</button>`
                : `<button class="diary-harptos-overview__chip diary-harptos-overview__chip--quick" type="button" data-action="edit-diary-harptos-day-note" data-harptos-year="${escapeHtml(String(year))}" data-harptos-period-id="${escapeHtml(period.id)}" data-harptos-day="${escapeHtml(String(day))}" style="${escapeHtml(getDiaryHarptosQuickNoteChipStyle(chip.color))}">${escapeHtml(chip.label)}</button>`).join("")}
            </div>
          `
          : ""
      }
      <button
        class="diary-harptos-overview__add-note"
        type="button"
        data-action="edit-diary-harptos-day-note"
        data-harptos-year="${escapeHtml(String(year))}"
        data-harptos-period-id="${escapeHtml(period.id)}"
        data-harptos-day="${escapeHtml(String(day))}"
        aria-label="${escapeHtml(t("diary_harptos_overview_quick_note"))}"
      >
        +
      </button>
    </article>
  `;
}

function renderDiaryHarptosOverviewLegend() {
  return `
    <section class="diary-harptos-overview__legend" aria-label="${escapeHtml(t("diary_harptos_overview_legend_title"))}">
      <strong>${escapeHtml(t("diary_harptos_overview_legend_title"))}</strong>
      <div class="diary-harptos-overview__legend-grid">
        ${renderDiaryHarptosLegendItem("winter", t("diary_harptos_overview_legend_winter"))}
        ${renderDiaryHarptosLegendItem("spring", t("diary_harptos_overview_legend_spring"))}
        ${renderDiaryHarptosLegendItem("summer", t("diary_harptos_overview_legend_summer"))}
        ${renderDiaryHarptosLegendItem("autumn", t("diary_harptos_overview_legend_autumn"))}
      </div>
    </section>
  `;
}

function renderDiaryHarptosLegendItem(seasonKey, label) {
  return `
    <span class="diary-harptos-overview__legend-item">
      <span class="diary-harptos-overview__legend-swatch diary-harptos-overview__legend-swatch--${escapeHtml(seasonKey)}" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

  return {
    renderDiaryScreen,
    getHarptosVisibleMonthPeriodId
  };
}