function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEvent(actor, teamId, monsterId, detail, now, idFactory) {
  return {
    id: clean(idFactory()).slice(0, 160),
    actorUserId: clean(actor?.userId).slice(0, 160),
    teamId: clean(teamId).slice(0, 160),
    monsterId: clean(monsterId).slice(0, 160),
    kind: clean(detail.kind).slice(0, 40),
    text: clean(detail.text).slice(0, 80),
    statusName: clean(detail.statusName).slice(0, 80),
    createdAt: Math.max(0, Number(now) || Date.now())
  };
}

function getResourceChange(previous, next) {
  const maxDelta = number(next.maxHp) - number(previous.maxHp);
  if (maxDelta) return { kind: maxDelta > 0 ? "heal" : "damage", text: `MAX ${maxDelta > 0 ? "+" : "−"}${Math.abs(maxDelta)}` };

  const necroticDelta = number(next.necrotic) - number(previous.necrotic);
  if (necroticDelta) return { kind: "necrotic", text: `${necroticDelta > 0 ? "+" : "−"}${Math.abs(necroticDelta)}` };

  const tempDelta = number(next.tempHp) - number(previous.tempHp);
  if (tempDelta) return { kind: "temp", text: `${tempDelta > 0 ? "+" : "−"}${Math.abs(tempDelta)}` };

  const hpDelta = number(next.currentHp) - number(previous.currentHp);
  if (hpDelta) return { kind: hpDelta > 0 ? "heal" : "damage", text: `${hpDelta > 0 ? "+" : "−"}${Math.abs(hpDelta)}` };
  return null;
}

export function createMonstersLeagueCombatFeedback(previousState, nextState, actor, options = {}) {
  const previous = previousState && typeof previousState === "object" ? previousState : {};
  const next = nextState && typeof nextState === "object" ? nextState : {};
  const now = Number(options.now) || Date.now();
  const idFactory = typeof options.idFactory === "function"
    ? options.idFactory
    : () => globalThis.crypto?.randomUUID?.() || `${now}-${Math.random()}`;
  const events = [];

  for (const [teamId, monsters] of Object.entries(next)) {
    for (const [monsterId, nextLive] of Object.entries(monsters && typeof monsters === "object" ? monsters : {})) {
      const previousLive = previous?.[teamId]?.[monsterId];
      if (!previousLive) continue;

      const resourceChange = getResourceChange(previousLive, nextLive);
      if (resourceChange) events.push(createEvent(actor, teamId, monsterId, resourceChange, now, idFactory));

      const previousConditions = new Set((Array.isArray(previousLive.conditions) ? previousLive.conditions : []).map(clean).filter(Boolean));
      const nextConditions = new Set((Array.isArray(nextLive.conditions) ? nextLive.conditions : []).map(clean).filter(Boolean));
      for (const statusName of nextConditions) {
        if (!previousConditions.has(statusName)) {
          events.push(createEvent(actor, teamId, monsterId, { kind: "status-add", text: `+ ${statusName}`, statusName }, now, idFactory));
        }
      }
      for (const statusName of previousConditions) {
        if (!nextConditions.has(statusName)) {
          events.push(createEvent(actor, teamId, monsterId, { kind: "status-remove", text: `− ${statusName}`, statusName }, now, idFactory));
        }
      }
    }
  }

  return events.slice(-50);
}
