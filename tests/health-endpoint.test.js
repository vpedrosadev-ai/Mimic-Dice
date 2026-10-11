import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/health.js";

const response = await onRequestGet();
const payload = await response.json();

assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
assert.equal(payload.ok, true);
assert.equal(payload.service, "mimic-dice");
assert.equal(Number.isFinite(Date.parse(payload.checkedAt)), true);

console.log("HEALTH_ENDPOINT_OK");
