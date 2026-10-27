const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

const backendDir = path.resolve(__dirname, '..');

function exportSchema() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o', default: 'prisma/schema.current.sql' },
      portable: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(`Usage: npm run db:schema:export -- [--output path.sql] [--portable]

Exports the live database schema, including functions, triggers and constraints.
Reads backend/.env; existing environment variables take precedence.
Uses DIRECT_URL when set, otherwise DATABASE_URL. Neon uses its direct endpoint.
Output paths are relative to backend/. Default: prisma/schema.current.sql.
--portable omits ownership and GRANT/REVOKE for restoring under another role.
Requires pg_dump on PATH (or PG_DUMP_PATH), or Docker running.
Docker image: PG_DUMP_DOCKER_IMAGE, default postgres:17.
Does not export table data, global roles or tablespace definitions.`);
    return;
  }

  const envFile = path.join(backendDir, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const connection = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connection) throw new Error('Set DATABASE_URL (or DIRECT_URL) in backend/.env.');
  let url;
  try {
    url = new URL(connection);
  } catch {
    throw new Error('DATABASE_URL/DIRECT_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error('Expected a PostgreSQL URL with a host and database name.');
  }

  const env = {
    ...process.env,
    PGHOST: url.hostname.endsWith('.neon.tech') ? url.hostname.replace('-pooler.', '.') : url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username) || process.env.PGUSER || 'postgres',
    PGPASSWORD: decodeURIComponent(url.password),
    PGCONNECT_TIMEOUT: '15',
    PGAPPNAME: 'glowup-schema-export',
  };
  for (const [parameter, variable] of Object.entries({
    sslmode: 'PGSSLMODE',
    sslcert: 'PGSSLCERT',
    sslkey: 'PGSSLKEY',
    sslrootcert: 'PGSSLROOTCERT',
    channel_binding: 'PGCHANNELBINDING',
    connect_timeout: 'PGCONNECT_TIMEOUT',
  })) {
    if (url.searchParams.has(parameter)) env[variable] = url.searchParams.get(parameter);
  }

  const redact = message => {
    let text = String(message).replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL]');
    for (const secret of [connection, env.PGPASSWORD, url.password]) {
      if (secret) text = text.replaceAll(secret, '[redacted]');
    }
    return text;
  };
  const dumpArgs = ['--schema-only', '--format=plain', '--encoding=UTF8', '--no-password', '--lock-wait-timeout=15s'];
  if (values.portable) dumpArgs.push('--no-owner', '--no-privileges');

  let command = process.env.PG_DUMP_PATH || 'pg_dump';
  let args = dumpArgs;
  const probe = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  if (probe.error?.code === 'ENOENT' && !process.env.PG_DUMP_PATH) {
    command = 'docker';
    if (['localhost', '127.0.0.1', '[::1]'].includes(env.PGHOST)) env.PGHOST = 'host.docker.internal';
    const pgVariables = Object.keys(env).filter(key => key.startsWith('PG') && key !== 'PG_DUMP_PATH' && key !== 'PG_DUMP_DOCKER_IMAGE');
    args = ['run', '--rm', ...pgVariables.flatMap(key => ['-e', key]), process.env.PG_DUMP_DOCKER_IMAGE || 'postgres:17', 'pg_dump', ...dumpArgs];
    console.log('Using pg_dump through Docker.');
  } else if (probe.error || probe.status !== 0) {
    throw new Error(redact(probe.stderr || probe.error?.message || 'Cannot run pg_dump. Check PG_DUMP_PATH.'));
  } else {
    console.log(probe.stdout.trim());
  }

  const output = path.resolve(backendDir, values.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    let result;
    try {
      result = spawnSync(command, args, {
        env,
        stdio: ['ignore', fd, 'pipe'],
        encoding: 'utf8',
        timeout: 180000,
        windowsHide: true,
      });
    } finally {
      fs.closeSync(fd);
    }
    if (result.error || result.status !== 0) {
      throw new Error(redact(result.stderr || result.error?.message || `pg_dump exited with code ${result.status}`));
    }
    if (fs.statSync(temporary).size === 0) throw new Error('pg_dump returned an empty schema.');
    fs.renameSync(temporary, output);
    console.log(`Schema exported: ${output} (${fs.statSync(output).size} bytes)`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

try {
  exportSchema();
} catch (error) {
  console.error(`Schema export failed: ${error.message}`);
  process.exitCode = 1;
}
