const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, copyFileSync, mkdirSync, mkdtempSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

test('exports the supplied test specification into its isolated output directory', () => {
  const root = resolve(__dirname, '..');
  const parent = resolve(root, '.tmp');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, 'api-export-test-'));
  const canonical = ['openapi.json', 'end-user.postman_collection.json', 'local.postman_environment.json', 'staging.postman_environment.json']
    .map((name) => resolve(root, 'docs/api', name));
  const before = canonical.map((file) => readFileSync(file));
  copyFileSync(canonical[0], join(directory, 'openapi.json'));
  try {
    const result = spawnSync(process.execPath, ['scripts/sprint6-export-collection.cjs'], {
      cwd: root, env: { ...process.env, API_EXPORT_DIR: directory }, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(directory, 'end-user.postman_collection.json')), 'The requested output directory must be used');
    const environment = JSON.parse(readFileSync(join(directory, 'local.postman_environment.json'), 'utf8'));
    assert.equal(environment.values.find((field) => field.key === 'password').value, '');
    for (let index = 0; index < canonical.length; index++) assert.deepEqual(readFileSync(canonical[index]), before[index], 'A test export must not alter canonical API artifacts');
  } finally {
    // Also keep the worktree intact while demonstrating the old exporter's failure.
    canonical.forEach((file, index) => writeFileSync(file, before[index]));
  }
});
