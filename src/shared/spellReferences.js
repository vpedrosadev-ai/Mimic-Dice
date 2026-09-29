import { cleanText, escapeRegExp, normalizeSearchText } from "./text.js";

export function createSpellReferenceMatcher(entries) {
  const entriesByNormalizedName = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const aliases = [entry?.name, entry?.canonicalName, entry?.localizedName, ...(entry?.nameAliases ?? [])];

    for (const alias of aliases) {
      const normalizedAlias = normalizeSearchText(alias);

      if (normalizedAlias.length >= 3 && !entriesByNormalizedName.has(normalizedAlias)) {
        entriesByNormalizedName.set(normalizedAlias, entry);
      }
    }
  }

  const aliases = [...entriesByNormalizedName.keys()]
    .sort((left, right) => right.length - left.length || left.localeCompare(right, "es", { sensitivity: "base" }));
  const pattern = aliases.length > 0
    ? new RegExp(`(^|[^\\p{L}\\p{N}])(${aliases.map(escapeRegExp).join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu")
    : null;

  return {
    pattern,
    entriesByNormalizedName
  };
}

export function findSpellReferenceMatches(content, matcher) {
  const text = cleanText(content);

  if (!text || !matcher?.pattern) {
    return [];
  }

  const normalizedText = normalizeSearchText(text);
  const matches = [];
  matcher.pattern.lastIndex = 0;

  for (const match of normalizedText.matchAll(matcher.pattern)) {
    const [fullMatch, prefix, normalizedName] = match;
    const fullStart = match.index ?? 0;
    const start = fullStart + prefix.length;
    const end = start + normalizedName.length;
    const entry = matcher.entriesByNormalizedName.get(normalizedName);

    if (!entry) {
      continue;
    }

    matches.push({
      start,
      end,
      text: text.slice(start, end),
      entry
    });

    matcher.pattern.lastIndex = fullStart + fullMatch.length;
  }

  return matches;
}
