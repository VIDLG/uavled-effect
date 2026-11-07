import test from "node:test";
import assert from "node:assert/strict";
import { checkRepositoryUpdate, compareUrl, shortCommit } from "../simulator/src/repositoryUpdate.js";

const remote = {
  sha: "abcdef0123456789",
  html_url: "https://github.com/VIDLG/uavled-effect/commit/abcdef0123456789",
  commit: { message: "feat: add a new effect\n\nDetails", author: { name: "VIDLG", date: "2026-11-07T00:00:00Z" } },
};

test("reports a remote commit when the clone is behind", async () => {
  const result = await checkRepositoryUpdate({ localCommit: "1234567890", fetchImpl: async () => ({ ok: true, json: async () => remote }) });
  assert.equal(result.status, "update-available");
  assert.equal(result.message, "feat: add a new effect");
  assert.match(result.compareUrl, /compare\/1234567890\.\.\.abcdef0123456789/);
});

test("reports current when the local and remote commits match", async () => {
  const result = await checkRepositoryUpdate({ localCommit: remote.sha, fetchImpl: async () => ({ ok: true, json: async () => remote }) });
  assert.equal(result.status, "current");
});

test("handles missing build metadata and short commit labels", async () => {
  assert.equal((await checkRepositoryUpdate({ localCommit: "unknown" })).status, "unavailable");
  assert.equal(shortCommit("123456789"), "1234567");
  assert.equal(compareUrl("unknown", remote.sha), "https://github.com/VIDLG/uavled-effect");
});

test("surfaces GitHub request failures to the caller", async () => {
  await assert.rejects(() => checkRepositoryUpdate({ localCommit: "123", fetchImpl: async () => ({ ok: false, status: 429 }) }), /429/);
});
