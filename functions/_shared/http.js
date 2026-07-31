export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(value, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(JSON.stringify(value), { status, headers });
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status);
  }

  console.error(error);
  return jsonResponse({ error: "internal_error", message: "Unexpected server error." }, 500);
}

export function methodNotAllowed(allowedMethods) {
  return jsonResponse(
    { error: "method_not_allowed", message: "Method not allowed." },
    405,
    { Allow: allowedMethods.join(", ") }
  );
}

export function assertSameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return;
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (origin !== requestUrl.origin) {
    throw new HttpError(403, "invalid_origin", "Cross-origin write rejected.");
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new HttpError(403, "invalid_origin", "Cross-origin write rejected.");
  }
}

export async function readJsonBody(request, maxBytes = 12 * 1024 * 1024) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", "Payload exceeds storage limit.");
  }

  const rawBody = await request.text();
  const bodyBytes = new TextEncoder().encode(rawBody).byteLength;

  if (bodyBytes > maxBytes) {
    throw new HttpError(413, "payload_too_large", "Payload exceeds storage limit.");
  }

  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export function cleanText(value, maxLength = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
