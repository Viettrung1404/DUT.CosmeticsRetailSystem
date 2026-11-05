const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, createWriteStream, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { connect } = require('node:net');
const { performance } = require('node:perf_hooks');
const { parse } = require('dotenv');
const { testDatabaseUrl, isolatedEnv } = require('./readiness-env.cjs');

const root = resolve(__dirname, '..');
const output = resolve(root, '../.tmp/development-readiness');
const origin = 'http://127.0.0.1:3300/api/v1';
const compose = resolve(__dirname, 'compose.readiness.yml');
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
let child;
let stoppedDatabase = false;
let log;
function docker(...args) {
  const result = spawnSync('docker', ['compose', '-f', compose, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`Readiness database command failed: ${result.stderr || result.error?.message}`);
}
async function ready() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Readiness API exited; inspect api-benchmark-server.log');
    try {
      if ((await fetch(`${origin}/health/ready`, { signal: AbortSignal.timeout(2000) })).status === 200) return;
    } catch { /* wait for a new process or restored database */ }
    await wait(500);
  }
  throw new Error('Readiness API did not become ready');
}
async function stop() {
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([new Promise((done) => child.once('exit', done)), wait(5000)]);
  }
}
async function main() {
  const occupied = await new Promise((done) => {
    const socket = connect(3300, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); done(true); });
    socket.once('error', () => done(false));
  });
  assert.equal(occupied, false, 'Port 3300 is occupied; refusing to reuse an unknown server');
  const benchmark = JSON.parse(readFileSync(resolve(output, 'benchmark-execution.json'), 'utf8'));
  assert.equal(benchmark.exitCode, 0, 'Run the isolated catalog benchmark first');
  assert.match(benchmark.runId, /^[a-f0-9]{32}$/);
  const keys = new Set();
  for (const name of ['.env.example', '.env']) {
    const file = resolve(root, name);
    if (existsSync(file)) for (const key of Object.keys(parse(readFileSync(file)))) keys.add(key);
  }
  const env = isolatedEnv(process.env, keys);
  env.DATABASE_URL = testDatabaseUrl(`postgresql://glowup_test:local_readiness_only@127.0.0.1:55434/glowup_readiness_test?schema=sprint6_benchmark_readiness_${benchmark.runId}&connection_limit=10`);
  env.READINESS_NO_SEED = 'true';
  log = createWriteStream(resolve(output, 'api-benchmark-server.log'));
  const start = () => {
    child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'test/readiness-server.ts'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
  };
  start();
  await ready();
  const scenarios = [
    { name: 'catalog price order', count: 20, path: (i) => `/customer/products?sortBy=price_asc&page=${i % 5 + 1}&limit=20`, check: (body) => { assert.equal(body.data.meta.itemCount, 10000); assert.equal(body.data.data.length, 20); } },
    { name: 'uncached product detail', count: 20, path: (i) => `/customer/products/s6-bench-product-${i + 100}`, check: (body, i) => assert.equal(body.data.effectivePrice, 100100 + i) },
    { name: 'database search fallback', count: 20, path: (i) => `/customer/products/search?q=Benchmark%20product&page=${i % 5 + 1}&limit=20`, check: (body) => { assert.equal(body.data.meta.itemCount, 10000); assert.equal(body.data.data.length, 20); } },
  ];
  const results = [];
  for (const scenario of scenarios) {
    const warm = await fetch(`${origin}${scenario.path(1000)}`);
    assert.equal(warm.status, 200, `Warm-up ${scenario.name}`);
    await warm.arrayBuffer();
    const samples = [];
    const errors = [];
    let index = 0;
    const started = performance.now();
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (index < scenario.count) {
        const current = index++;
        const now = performance.now();
        try {
          const response = await fetch(`${origin}${scenario.path(current)}`, { signal: AbortSignal.timeout(5000) });
          assert.equal(response.status, 200);
          scenario.check(await response.json(), current);
        } catch (error) { errors.push({ request: current, message: error.message }); }
        samples.push(performance.now() - now);
      }
    }));
    const elapsedMs = performance.now() - started;
    samples.sort((a, b) => a - b);
    const percentile = (p) => samples[Math.ceil(samples.length * p) - 1];
    results.push({ name: scenario.name, requests: samples.length, concurrency: 4, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: samples.at(-1), elapsedMs, requestsPerSecond: samples.length * 1000 / elapsedMs, errors });
  }
  // Failure rehearsal is deliberately after timing so it cannot contaminate latency samples.
  docker('stop', 'postgres');
  stoppedDatabase = true;
  assert.equal((await fetch(`${origin}/health/live`, { signal: AbortSignal.timeout(2000) })).status, 200);
  const unavailable = await fetch(`${origin}/health/ready`, { signal: AbortSignal.timeout(7000) });
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes('local_readiness_only'));
  docker('up', '-d', '--wait', 'postgres');
  stoppedDatabase = false;
  await ready();
  const recovered = await fetch(`${origin}/customer/products?limit=1`);
  assert.equal((await recovered.json()).data.meta.itemCount, 10000);
  await stop();
  start();
  await ready();
  const restarted = await fetch(`${origin}/customer/products?limit=1`);
  assert.equal((await restarted.json()).data.meta.itemCount, 10000);
  const passed = results.every((result) => result.errors.length === 0 && result.p95Ms < 500);
  const report = {
    status: passed ? 'passed' : 'failed', checkedAt: new Date().toISOString(),
    scope: 'Real local HTTP API + PostgreSQL, 10,000 SKU guest catalog; no BFF/TLS/provider traffic',
    environment: 'Nest test bootstrap, external adapters disabled, in-memory rate limiter; PostgreSQL 17, 1 CPU, 512 MiB',
    results, dependencyRehearsal: { databaseDownLiveness: 200, databaseDownReadiness: 503, databaseRecovery: true, processRestartPreservesCatalog: true },
    limitation: '20 samples per route, 4 workers, closed-loop; not 1,000 users, production capacity, payment recovery or full availability acceptance',
  };
  writeFileSync(resolve(output, 'api-benchmark.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!passed) process.exitCode = 1;
}
main().catch((error) => {
  writeFileSync(resolve(output, 'api-benchmark.json'), JSON.stringify({ status: 'failed', checkedAt: new Date().toISOString(), error: error.message }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (stoppedDatabase) {
    try { docker('up', '-d', '--wait', 'postgres'); } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  await stop();
  log?.end();
});
