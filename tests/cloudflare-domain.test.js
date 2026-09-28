import assert from "node:assert/strict";
import { CANONICAL_ORIGIN, onRequest } from "../functions/_middleware.js";

async function run(url, response = new Response("ok", { status: 200 })) {
  return onRequest({
    request: new Request(url),
    next: async () => response
  });
}

const aliasResponse = await run("https://www.themimicdice.com/api/auth/session?from=test");
assert.equal(aliasResponse.status, 308);
assert.equal(aliasResponse.headers.get("location"), `${CANONICAL_ORIGIN}/api/auth/session?from=test`);

const pagesResponse = await run("https://mimic-dice.pages.dev/api/auth/providers");
assert.equal(pagesResponse.status, 200);
assert.equal(await pagesResponse.text(), "ok");
assert.equal(pagesResponse.headers.get("strict-transport-security"), "max-age=31536000");

const canonicalResponse = await run(`${CANONICAL_ORIGIN}/api/auth/providers`);
assert.equal(canonicalResponse.status, 200);
assert.equal(await canonicalResponse.text(), "ok");
assert.equal(canonicalResponse.headers.get("strict-transport-security"), "max-age=31536000");
assert.equal(canonicalResponse.headers.get("x-frame-options"), "DENY");
assert.match(canonicalResponse.headers.get("content-security-policy"), /frame-ancestors 'none'/);

const localResponse = await run("http://127.0.0.1:8788/");
assert.equal(localResponse.status, 200);
assert.equal(localResponse.headers.has("strict-transport-security"), false);

console.log("CLOUDFLARE_DOMAIN_OK");
