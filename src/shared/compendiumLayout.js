export function syncCompendiumLayoutHeights(root = document) {
  root.querySelectorAll(".bestiary-layout").forEach((layout) => {
    const panel = layout.closest(".compendium-panel");
    let chromeHeight = 0;
    let panelPaddingBlock = 0;

    if (panel) {
      Array.from(panel.children).forEach((child) => {
        if (child !== layout) {
          chromeHeight += child.getBoundingClientRect().height;
        }
      });

      const panelStyles = window.getComputedStyle(panel);
      panelPaddingBlock =
        (Number.parseFloat(panelStyles.paddingTop) || 0)
        + (Number.parseFloat(panelStyles.paddingBottom) || 0);
    }

    const basePanelHeight = Math.max(1040, Math.floor(window.innerHeight * 1.5));
    const viewportHeight = Math.max(
      560,
      basePanelHeight - Math.ceil(chromeHeight) - Math.ceil(panelPaddingBlock) - 8
    );

    layout.style.height = `${viewportHeight}px`;
    layout.style.minHeight = `${viewportHeight}px`;
    layout.style.setProperty("--compendium-viewport-height", `${viewportHeight}px`);

    layout.querySelectorAll(".bestiary-list, .bestiary-detail").forEach((element) => {
      element.style.height = `${viewportHeight}px`;
      element.style.maxHeight = `${viewportHeight}px`;
    });

    if (panel) {
      panel.style.height = `${basePanelHeight}px`;
      panel.style.minHeight = `${basePanelHeight}px`;
      panel.style.overflow = "hidden";
      panel.style.setProperty("--compendium-panel-height", `${basePanelHeight}px`);
      panel.style.setProperty("--compendium-viewport-height", `${viewportHeight}px`);
      panel.style.setProperty("--compendium-chrome-height", `${Math.ceil(chromeHeight)}px`);
    }
  });
}
