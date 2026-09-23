export const CANONICAL_ORIGIN = "https://themimicdice.com";

const CANONICAL_HOST = new URL(CANONICAL_ORIGIN).hostname;
const CANONICAL_ALIASES = new Set([
  "www.themimicdice.com",
  "mimic-dice.pages.dev"
]);

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

function withSecurityHeaders(response, secure) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  if (secure) {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const hostname = requestUrl.hostname.toLowerCase();

  if (CANONICAL_ALIASES.has(hostname)) {
    requestUrl.protocol = "https:";
    requestUrl.hostname = CANONICAL_HOST;
    requestUrl.port = "";
    return withSecurityHeaders(Response.redirect(requestUrl.toString(), 308), true);
  }

  return withSecurityHeaders(
    await context.next(),
    requestUrl.protocol === "https:"
  );
}
