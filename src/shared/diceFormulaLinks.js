import { findDiceFormulaMatches } from "./diceFormula.js";

const SKIP_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "script",
  "style",
  "code",
  "pre",
  "[contenteditable]",
  "[data-no-dice-links]",
  ".dice-formula-link"
].join(",");

export function enhanceDiceFormulaLinks(root) {
  if (!root?.ownerDocument) return 0;

  const documentRef = root.ownerDocument;
  const walker = documentRef.createTreeWalker(root, 4);
  const nodes = [];
  let node = walker.nextNode();

  while (node) {
    if (node.parentElement && !node.parentElement.closest(SKIP_SELECTOR) && /\d*d\d+/i.test(node.nodeValue || "")) {
      nodes.push(node);
    }
    node = walker.nextNode();
  }

  let linkedCount = 0;
  for (const textNode of nodes) {
    const text = textNode.nodeValue || "";
    const matches = findDiceFormulaMatches(text);
    if (matches.length === 0) continue;

    const fragment = documentRef.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) fragment.append(documentRef.createTextNode(text.slice(cursor, match.start)));
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "dice-formula-link";
      button.dataset.action = "roll-dice-formula";
      button.dataset.diceFormula = match.formula;
      button.textContent = match.formula;
      fragment.append(button);
      cursor = match.end;
      linkedCount += 1;
    }
    if (cursor < text.length) fragment.append(documentRef.createTextNode(text.slice(cursor)));
    textNode.replaceWith(fragment);
  }

  return linkedCount;
}
