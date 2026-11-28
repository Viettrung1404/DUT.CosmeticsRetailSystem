import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectProductionBuild } from "./production-build.mjs";

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "glowup-build-test-"));
  try { run(root); } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("glowup-build-test-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}
function build(root) {
  const directory = path.join(root, ".custom-build");
  fs.mkdirSync(path.join(directory, "server/app"), { recursive: true });
  fs.mkdirSync(path.join(directory, "server/chunks/ssr"), { recursive: true });
  fs.writeFileSync(path.join(directory, "BUILD_ID"), "build-id");
  fs.writeFileSync(path.join(directory, "server/app-paths-manifest.json"), "{}");
  return directory;
}

test("rejects missing builds before launching Next", () => fixture((root) => {
  assert.throws(() => inspectProductionBuild(root), /npm run build/);
}));
test("detects missing Turbopack chunks referenced by route entries", () => fixture((root) => {
  const directory = build(root);
  fs.writeFileSync(path.join(directory, "server/app/page.js"), 'R.c("server/chunks/ssr/missing.js")');
  assert.throws(() => inspectProductionBuild(root, ".custom-build"), /missing\.js/);
}));
test("checks lazy chunk references inside other chunks and accepts complete builds", () => fixture((root) => {
  const directory = build(root);
  fs.writeFileSync(path.join(directory, "server/app/page.js"), 'R.c("server/chunks/ssr/main.js")');
  fs.writeFileSync(path.join(directory, "server/chunks/ssr/main.js"), 'R.l("server/chunks/ssr/lazy.js")');
  assert.throws(() => inspectProductionBuild(root, ".custom-build"), /lazy\.js/);
  fs.writeFileSync(path.join(directory, "server/chunks/ssr/lazy.js"), "module.exports = {};");
  const result = inspectProductionBuild(root, ".custom-build");
  assert.equal(result.buildId, "build-id");
  assert.equal(result.directory, directory);
}));
