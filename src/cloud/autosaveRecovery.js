const CLOUD_AUTOSAVE_RETRY_DELAYS_MS = Object.freeze([
  5_000,
  15_000,
  30_000,
  60_000
]);

export function isRetryableCloudAutosaveError(error) {
  const status = Math.max(0, Math.floor(Number(error?.status) || 0));
  const code = String(error?.code || "").trim().toLowerCase();

  if (code === "revision_conflict") {
    return false;
  }

  return status === 0
    || status === 408
    || status === 425
    || status === 429
    || (status >= 500 && status <= 599);
}

export function getCloudAutosaveRetryDelayMs(attempt) {
  const normalizedAttempt = Math.max(1, Math.floor(Number(attempt) || 1));
  return CLOUD_AUTOSAVE_RETRY_DELAYS_MS[
    Math.min(normalizedAttempt - 1, CLOUD_AUTOSAVE_RETRY_DELAYS_MS.length - 1)
  ];
}
