export function getNavigationFitMetrics({ availableWidth, buttonCount, naturalButtonWidth, minimumButtonWidth = 42 }) {
  const count = Math.max(1, Math.floor(Number(buttonCount) || 1));
  const available = Math.max(0, Number(availableWidth) || 0);
  const natural = Math.max(minimumButtonWidth, Number(naturalButtonWidth) || minimumButtonWidth);
  const buttonWidth = Math.max(minimumButtonWidth, Math.floor(available / count));
  const scale = Math.max(0.46, Math.min(1, buttonWidth / natural));
  return { buttonWidth, scale };
}
