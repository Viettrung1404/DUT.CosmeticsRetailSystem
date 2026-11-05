const { readFileSync, existsSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const { isolatedEnv, testDatabaseUrl } = require('./readiness-env.cjs');

const root = resolve(__dirname, '..');
const output = resolve(root, '../.tmp/development-readiness');
mkdirSync(output, { recursive: true });
const keys = new Set();
for (const name of ['.env.example', '.env']) {
  const file = resolve(root, name);
  if (existsSync(file)) for (const key of Object.keys(parse(readFileSync(file)))) keys.add(key);
}
const env = isolatedEnv(process.env, keys);
env.DATABASE_URL = testDatabaseUrl(`postgresql://glowup_test:local_readiness_only@127.0.0.1:55434/glowup_readiness_test?schema=readiness_web_${randomUUID().replaceAll('-', '')}&connection_limit=10`);
env.READINESS_FIXTURE_FILE = resolve(output, 'fullstack-fixture.json');
env.PUBLIC_WEB_URL = 'https://127.0.0.1:3301';
env.CORS_ALLOWED_ORIGINS = env.PUBLIC_WEB_URL;
const run = (args) => spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true }).status ?? 1;
const migrated = run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
if (migrated !== 0) process.exit(migrated);
process.exit(run(['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'test/readiness-server.ts']));
