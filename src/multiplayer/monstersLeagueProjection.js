import { cleanText } from "../shared/text.js";

export function rewriteMonstersLeagueAssetUrl(value, roomId, baseOrigin = globalThis.location?.origin || "") {
  const url = cleanText(value);
  const normalizedRoomId = cleanText(roomId);
  if (!url || /^(?:data|blob|mimic-assets|javascript):/i.test(url)) return "";

  let parsed;
  try {
    parsed = new URL(url, `${cleanText(baseOrigin).replace(/\/$/, "") || "https://mimic-dice.invalid"}/`);
  } catch {
    return "";
  }

  const base = cleanText(baseOrigin);
  const sameOrigin = !base || parsed.origin === base;
  const privateAssetMatch = sameOrigin ? parsed.pathname.match(/^\/api\/assets\/([^/]+)$/i) : null;
  if (privateAssetMatch && normalizedRoomId) {
    return `/api/multiplayer/rooms/${encodeURIComponent(normalizedRoomId)}/assets/${encodeURIComponent(privateAssetMatch[1])}`;
  }

  if (/^https?:\/\//i.test(url)) return parsed.toString();
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
