export function getVirtualStartIndex(scrollTop, rowHeight, overscan) {
  return Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
}

export function getVirtualWindow({
  totalEntries,
  viewportHeight,
  scrollTop,
  rowHeight,
  overscan
}) {
  const maxScrollTop = Math.max(0, totalEntries * rowHeight - viewportHeight);
  const clampedScrollTop = Math.min(scrollTop, maxScrollTop);
  const startIndex = getVirtualStartIndex(clampedScrollTop, rowHeight, overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(totalEntries, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * rowHeight,
    totalHeight: totalEntries * rowHeight
  };
}
