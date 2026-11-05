// Runs existing suites with credentials isolated from the developer's .env.
const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { parse } = require('dotenv');
const { isolatedEnv, testDatabaseUrl } = require('./readiness-env.cjs');

const stage = process.argv[2];
const testPattern = process.argv[3] === '--testNamePattern' ? process.argv[4] : undefined;
if (!['unit', 'integration', 'e2e', 'benchmark'].includes(stage) ||
    !(process.argv.length === 3 || (process.argv.length === 5 && testPattern))) {
  console.error('Usage: node test/run-readiness.cjs unit|integration|e2e|benchmark [--testNamePattern pattern]');
  process.exit(2);
}
const root = resolve(__dirname, '..');
const output = resolve(root, '../.tmp/development-readiness');
mkdirSync(output, { recursive: true });
const keys = new Set();
for (const name of ['.env.example', '.env']) {
  const file = resolve(root, name);
  if (existsSync(file)) for (const key of Object.keys(parse(readFileSync(file)))) keys.add(key);
}
const env = isolatedEnv(process.env, keys);
const runId = randomUUID().replaceAll('-', '');
const connection = (schema) => testDatabaseUrl(
  `postgresql://glowup_test:local_readiness_only@127.0.0.1:55434/glowup_readiness_test?schema=${schema}&connection_limit=10`,
);
env.DATABASE_URL = connection(`readiness_${runId}`);
const stages = [];
const run = (label, args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  const code = result.status ?? 1;
  stages.push({ label, exitCode: code });
  if (code !== 0) finish(code);
};
function finish(exitCode) {
  writeFileSync(resolve(output, `${stage}-execution.json`), JSON.stringify({
    stage, runId, testPattern: testPattern ?? null, node: process.version, completedAt: new Date().toISOString(),
    environment: 'isolated local PostgreSQL, providers disabled/stubbed', stages, exitCode,
  }, null, 2) + '\n');
  process.exit(exitCode);
}
const jest = ['node_modules/jest/bin/jest.js', '--runInBand', '--json', `--outputFile=${resolve(output, `${stage}-results.json`)}`];
if (testPattern) jest.push(`--testNamePattern=${testPattern}`);
if (stage === 'unit') {
  run('unit and coverage (DB suites intentionally skipped)', [...jest, '--coverage']);
} else if (stage === 'integration') {
  env.TEST_DATABASE_URL = env.DATABASE_URL;
  // These suites construct workers/adapters explicitly and do not start the scheduler.
  // Readiness requires the worker switch even when the gateway is a test adapter.
  env.PAYMENT_WORKER_ENABLED = 'true';
  run('migration', ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  run('PostgreSQL integration (optional load suite excluded)', [...jest, '--testPathPattern=integration', '--testPathIgnorePatterns=payments.load.integration', '--coverage', `--coverageDirectory=${resolve(output, 'coverage-integration')}`]);
} else if (stage === 'benchmark') {
  if (testPattern) throw new Error('A benchmark does not accept a Jest test filter');
  env.SPRINT6_TEST_DATABASE_URL = connection(`sprint6_benchmark_readiness_${runId}`);
  env.DATABASE_URL = env.SPRINT6_TEST_DATABASE_URL;
  env.READINESS_BENCHMARK_OUTPUT = resolve(output, 'catalog-benchmark.json');
  env.READINESS_MAX_P95_MS = '500';
  run('10,000-SKU PostgreSQL catalog benchmark (DB-only)', ['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'scripts/sprint6-benchmark.ts']);
} else {
  for (const sprint of [4, 5, 6]) env[`SPRINT${sprint}_TEST_DATABASE_URL`] = connection(`sprint${sprint}_readiness_${runId}`);
  run('HTTP/PostgreSQL E2E', [...jest, '--config=test/jest-e2e.json', '--coverage', '--collectCoverageFrom=src/**/*.ts', '--collectCoverageFrom=!src/**/*.spec.ts', `--coverageDirectory=${resolve(output, 'coverage-e2e')}`]);
}
finish(0);
