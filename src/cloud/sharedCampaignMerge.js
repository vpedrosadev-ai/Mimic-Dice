const MISSING = Symbol("missing");

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function equals(left, right) {
  if (left === MISSING || right === MISSING) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

function clone(value) {
  if (value === MISSING) return MISSING;
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
}

function getArrayIdentityKey(values) {
  const entries = values.filter((value) => value !== MISSING).flat().filter((value) => value != null);
  if (entries.length === 0 || entries.some((entry) => !isPlainObject(entry))) return "";
  if (entries.every((entry) => String(entry.id ?? "").trim())) return "id";
  if (entries.every((entry) => String(entry.key ?? "").trim())) return "key";
  return "";
}

function mergeArrays(base, local, remote) {
  const identityKey = getArrayIdentityKey([base, local, remote]);
  if (!identityKey) return clone(local);

  const baseById = new Map(base.map((entry) => [String(entry[identityKey]), entry]));
  const localById = new Map(local.map((entry) => [String(entry[identityKey]), entry]));
  const remoteById = new Map(remote.map((entry) => [String(entry[identityKey]), entry]));
  const orderedIds = [
    ...remote.map((entry) => String(entry[identityKey])),
    ...local.map((entry) => String(entry[identityKey]))
  ].filter((id, index, values) => values.indexOf(id) === index);

  return orderedIds.flatMap((id) => {
    const merged = mergeValue(
      baseById.has(id) ? baseById.get(id) : MISSING,
      localById.has(id) ? localById.get(id) : MISSING,
      remoteById.has(id) ? remoteById.get(id) : MISSING
    );
    return merged === MISSING ? [] : [merged];
  });
}

function mergeObjects(base, local, remote) {
  const result = {};
  const keys = new Set([
    ...Object.keys(isPlainObject(base) ? base : {}),
    ...Object.keys(local),
    ...Object.keys(remote)
  ]);

  for (const key of keys) {
    const merged = mergeValue(
      isPlainObject(base) && Object.prototype.hasOwnProperty.call(base, key) ? base[key] : MISSING,
      Object.prototype.hasOwnProperty.call(local, key) ? local[key] : MISSING,
      Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : MISSING
    );
    if (merged !== MISSING) result[key] = merged;
  }
  return result;
}

function mergeValue(base, local, remote) {
  if (equals(local, base)) return clone(remote);
  if (equals(remote, base) || equals(local, remote)) return clone(local);
  if (local === MISSING || remote === MISSING) return clone(local);
  if (Array.isArray(local) && Array.isArray(remote) && (Array.isArray(base) || base === MISSING)) {
    return mergeArrays(Array.isArray(base) ? base : [], local, remote);
  }
  if (isPlainObject(local) && isPlainObject(remote) && (isPlainObject(base) || base === MISSING)) {
    return mergeObjects(isPlainObject(base) ? base : {}, local, remote);
  }
  return clone(local);
}

export function mergeSharedCampaignPayload(base, local, remote) {
  if (!isPlainObject(local) || !isPlainObject(remote)) return clone(local);
  return mergeValue(isPlainObject(base) ? base : {}, local, remote);
}

export function shouldApplyMergedSharedCampaign(mergedRemoteChanges, savedChangeRevision, currentChangeRevision) {
  return mergedRemoteChanges === true
    && Number(savedChangeRevision) === Number(currentChangeRevision);
}
