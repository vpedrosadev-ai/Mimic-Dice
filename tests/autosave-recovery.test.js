import assert from "node:assert/strict";
import test from "node:test";

import {
  getCloudAutosaveRetryDelayMs,
  isRetryableCloudAutosaveError
} from "../src/cloud/autosaveRecovery.js";

test("cloud autosave retries temporary server and connection errors", () => {
  for (const status of [0, 408, 425, 429, 500, 503, 599]) {
    assert.equal(isRetryableCloudAutosaveError({ status, code: "cloud_error" }), true);
  }
});

test("cloud autosave does not retry permanent or revision errors", () => {
  for (const status of [400, 401, 403, 404, 409, 413]) {
    assert.equal(isRetryableCloudAutosaveError({ status, code: "cloud_error" }), false);
  }

  assert.equal(isRetryableCloudAutosaveError({ status: 409, code: "revision_conflict" }), false);
});

test("cloud autosave retry backoff is bounded", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 20].map(getCloudAutosaveRetryDelayMs),
    [5_000, 15_000, 30_000, 60_000, 60_000, 60_000]
  );
});
