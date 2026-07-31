export const REGISTRATION_COOKIE_NAME = "mimic_registration";
const REGISTRATION_TOKEN_MAX_AGE_MS = 10 * 60 * 1000;

function encodeBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createRegistrationToken(secret) {
  const payload = `${Date.now()}.${crypto.randomUUID()}`;
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyRegistrationToken(token, secret) {
  const [timestampValue, nonce, signatureValue] = String(token || "").split(".");
  const timestamp = Number(timestampValue);

  if (!timestamp || !nonce || !signatureValue || Date.now() - timestamp > REGISTRATION_TOKEN_MAX_AGE_MS || timestamp > Date.now() + 30_000) {
    return false;
  }

  try {
    const payload = `${timestampValue}.${nonce}`;
    const key = await getHmacKey(secret);
    return crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signatureValue),
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

export async function secureTextEquals(left, right) {
  const leftDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(left || "")));
  const rightDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(right || "")));
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return difference === 0;
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function getRegistrationCookie(token, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${REGISTRATION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=600${secure}`;
}

export function getClearedRegistrationCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${REGISTRATION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=0${secure}`;
}
