import { cleanText, normalizeSearchText, uniqueSortedStrings } from "./text.js";
import { COMPENDIUM_SOURCE_PUBLICATION_DATES } from "../data/compendiumSourceDates.js";

export function getCompendiumEntryIdentityKey(entry) {
  return cleanText(entry?.identityKey) || cleanText(entry?.compositeKey) || cleanText(entry?.id);
}

export function getCompendiumEntryNameAliases(entry) {
  const aliases = Array.isArray(entry?.nameAliasesLower) && entry.nameAliasesLower.length > 0
    ? entry.nameAliasesLower
    : [entry?.name, entry?.canonicalName, entry?.localizedName].map((value) => normalizeSearchText(value));

  return uniqueSortedStrings(aliases.filter(Boolean));
}

export function isSameCompendiumSource(entry, rowSource) {
  const normalizedSource = cleanText(rowSource);
  return !normalizedSource || cleanText(entry?.source) === normalizedSource || cleanText(entry?.canonicalSource) === normalizedSource;
}

function getCompendiumEntrySourceYear(entry) {
  const sourceText = [entry?.source, entry?.canonicalSource, entry?.sourceFullName, entry?.sourceLabel]
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(" ");
  const fullYearMatches = [...sourceText.matchAll(/\b(19\d{2}|20\d{2})\b/g)];

  if (fullYearMatches.length > 0) {
    return Math.max(...fullYearMatches.map((match) => Number(match[1])));
  }

  const shortYearMatches = [...sourceText.matchAll(/['\u2019](\d{2})\b/g)];
  return shortYearMatches.length > 0
    ? Math.max(...shortYearMatches.map((match) => 2000 + Number(match[1])))
    : null;
}

function getCompendiumEntryPublicationTime(entry) {
  const sourceCodes = [entry?.source, entry?.canonicalSource]
    .map((value) => cleanText(value))
    .filter(Boolean);

  for (const sourceCode of sourceCodes) {
    const publicationDate = COMPENDIUM_SOURCE_PUBLICATION_DATES[sourceCode];

    if (publicationDate) {
      return Date.parse(`${publicationDate}T00:00:00Z`);
    }
  }

  const sourceYear = getCompendiumEntrySourceYear(entry);
  return sourceYear === null ? null : Date.UTC(sourceYear, 0, 1);
}

function findLatestCompendiumNameMatch(entries, names, source) {
  const matches = entries.filter((entry) => (
    names.some((name) => getCompendiumEntryNameAliases(entry).includes(name))
    && isSameCompendiumSource(entry, source)
  ));

  if (matches.length < 2) {
    return matches[0] ?? null;
  }

  const datedMatches = matches.map((entry, index) => ({
    entry,
    index,
    publicationTime: getCompendiumEntryPublicationTime(entry)
  }));

  // Known catalog sources use researched publication dates. Custom sources can
  // still fall back to their embedded year or, finally, catalog order.
  if (datedMatches.every((candidate) => candidate.publicationTime !== null)) {
    return datedMatches
      .sort((left, right) => left.publicationTime - right.publicationTime || left.index - right.index)
      .at(-1)?.entry ?? null;
  }

  return matches.at(-1) ?? null;
}

export function findCompendiumEntryByReference(entries, reference = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const keys = [reference.entryKey, reference.key, reference.entryId, reference.id]
    .map((value) => cleanText(value))
    .filter(Boolean);
  const source = cleanText(reference.source);
  const names = [reference.name, reference.canonicalName, reference.localizedName]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
  const keyMatch = keys.length > 0
    ? entries.find((entry) => keys.includes(getCompendiumEntryIdentityKey(entry)) && isSameCompendiumSource(entry, source))
    : null;

  // A source makes a version choice explicit. Without one, a linked name is a
  // generic reference and should resolve to the newest available duplicate.
  if (keyMatch && (source || names.length === 0)) {
    return keyMatch;
  }

  return findLatestCompendiumNameMatch(entries, names, source) ?? keyMatch;
}

export function getUnresolvedCharacterCompendiumReferences(characters, options = {}) {
  const spellEntries = Array.isArray(options.spellEntries) ? options.spellEntries : [];
  const itemEntries = Array.isArray(options.itemEntries) ? options.itemEntries : [];
  const isCurrencyName = typeof options.isCurrencyName === "function" ? options.isCurrencyName : () => false;
  const unresolvedSpells = new Map();
  const unresolvedItems = new Map();

  for (const character of Array.isArray(characters) ? characters : []) {
    for (const spell of Array.isArray(character?.spells) ? character.spells : []) {
      const name = cleanText(spell?.name);

      if (!name || findCompendiumEntryByReference(spellEntries, {
        name,
        canonicalName: spell?.canonicalName,
        localizedName: spell?.localizedName,
        source: spell?.source
      })) {
        continue;
      }

      unresolvedSpells.set(normalizeSearchText(name), name);
    }

    for (const item of Array.isArray(character?.inventory) ? character.inventory : []) {
      const name = cleanText(item?.name);

      if (!name || isCurrencyName(name) || findCompendiumEntryByReference(itemEntries, {
        name,
        canonicalName: item?.canonicalName,
        localizedName: item?.localizedName,
        source: item?.source
      })) {
        continue;
      }

      unresolvedItems.set(normalizeSearchText(name), name);
    }
  }

  return {
    spells: [...unresolvedSpells.values()],
    items: [...unresolvedItems.values()]
  };
}
