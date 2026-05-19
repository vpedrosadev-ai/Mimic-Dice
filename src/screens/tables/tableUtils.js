import { cleanText } from "../../shared/text.js";

export function getTableColumnKind(column, index) {
  const label = cleanText(column?.label).toLowerCase();

  if (
    index === 0
    && (
      label.includes("num")
      || label.includes("numero")
      || label === "#"
      || label === "id"
    )
  ) {
    return "number";
  }

  if (
    index === 0
    && (
      label.includes("estado")
      || label.includes("nombre")
      || label.includes("tipo")
      || label.includes("tag")
    )
  ) {
    return "short";
  }

  return "wide";
}

export function getTableTextareaRows(columnCount, columnKind) {
  if (columnKind === "number") {
    return 1;
  }

  if (columnKind === "short") {
    return 2;
  }

  return columnCount <= 2 ? 2 : 3;
}
