export function createMonstersLeagueServerClockSample(serverNow, receivedAt = Date.now()) {
  const serverTimestamp = Number(serverNow);
  const clientTimestamp = Number(receivedAt);

  if (!Number.isFinite(serverTimestamp) || serverTimestamp <= 0 || !Number.isFinite(clientTimestamp)) {
    return null;
  }

  return {
    serverNow: serverTimestamp,
    receivedAt: clientTimestamp
  };
}

export function getMonstersLeagueClockNow(sample, clientNow = Date.now()) {
  const now = Number(clientNow);

  if (
    !sample
    || !Number.isFinite(sample.serverNow)
    || !Number.isFinite(sample.receivedAt)
    || !Number.isFinite(now)
    || now < sample.receivedAt
  ) {
    return Number.isFinite(now) ? now : Date.now();
  }

  return sample.serverNow + (now - sample.receivedAt);
}

export function getMonstersLeagueRemainingSeconds(deadline, now) {
  return Math.max(0, Math.ceil((Number(deadline) - Number(now)) / 1000));
}
