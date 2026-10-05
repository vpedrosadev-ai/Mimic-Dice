import test from "node:test";
import assert from "node:assert/strict";

import { isAdministrator } from "../functions/_shared/auth.js";

test("configured administrator email is matched case-insensitively", () => {
  assert.equal(isAdministrator({ email: "vpedrosadev@gmail.com" }), true);
  assert.equal(isAdministrator({ email: " VPEDROSADEV@GMAIL.COM " }), true);
  assert.equal(isAdministrator({ email: "player@example.com" }), false);
  assert.equal(isAdministrator(null), false);
});
