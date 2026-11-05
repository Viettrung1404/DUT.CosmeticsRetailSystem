const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { PrismaClient } = require('@prisma/client');
const { testDatabaseUrl } = require('./readiness-env.cjs');

const output = resolve(__dirname, '../../.tmp/development-readiness/restore-result.json');
const compose = resolve(__dirname, 'compose.readiness.yml');
const run = (...command) => {
  const result = spawnSync('docker', ['compose', '-f', compose, 'exec', '-T', 'postgres', ...command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`Readiness PostgreSQL command ${command[0]} failed: ${result.stderr || result.error?.message || 'unknown error'}`);
};
async function snapshot(db) {
  return {
    users: await db.user.findMany({ select: { id: true, roleId: true, emailVerified: true }, orderBy: { id: 'asc' } }),
    orders: await db.order.findMany({ select: { id: true, customerId: true, status: true, totalAmount: true }, orderBy: { id: 'asc' } }),
    items: await db.orderItem.findMany({ select: { id: true, orderId: true, productVariantId: true, quantity: true, totalPrice: true }, orderBy: { id: 'asc' } }),
    payments: await db.payment.findMany({ select: { id: true, orderId: true, status: true, amount: true }, orderBy: { id: 'asc' } }),
    inventory: await db.inventory.findMany({ select: { id: true, quantity: true, reservedQuantity: true, availableQuantity: true }, orderBy: { id: 'asc' } }),
    receipts: await db.commandReceipt.findMany({ select: { id: true, userId: true, operation: true, idempotencyKey: true, requestHash: true }, orderBy: { id: 'asc' } }),
  };
}
async function main() {
  writeFileSync(output, JSON.stringify({ status: 'running', startedAt: new Date().toISOString() }));
  const fixture = JSON.parse(readFileSync(resolve(__dirname, '../../.tmp/development-readiness/fullstack-fixture.json'), 'utf8'));
  assert.match(fixture.databaseSchema, /^readiness_web_[a-f0-9]{32}$/);
  const sourceUrl = testDatabaseUrl(`postgresql://glowup_test:local_readiness_only@127.0.0.1:55434/glowup_readiness_test?schema=${fixture.databaseSchema}&connection_limit=2`);
  const nonce = randomUUID().replaceAll('-', '');
  const restoredDatabase = `glowup_readiness_restore_${nonce}_test`;
  assert.match(restoredDatabase, /^glowup_readiness_restore_[a-f0-9]{32}_test$/);
  const destination = new URL(sourceUrl);
  destination.pathname = `/${restoredDatabase}`;
  const source = new PrismaClient({ datasourceUrl: sourceUrl });
  const restored = new PrismaClient({ datasourceUrl: destination.toString() });
  try {
    const before = await snapshot(source);
    assert.equal(before.orders.length, 4, 'Run the four full-stack checkout cases first');
    const beforeKey = `readiness_restore_before_${nonce}`;
    const afterKey = `readiness_restore_after_${nonce}`;
    await source.setting.create({ data: { key: beforeKey, value: { nonce } } });
    const backupStartedAt = new Date().toISOString();
    const backupStart = performance.now();
    const dump = `/tmp/readiness_restore_${nonce}.dump`;
    run('pg_dump', '-U', 'glowup_test', '-d', 'glowup_readiness_test', '--schema', fixture.databaseSchema, '--format=custom', '--file', dump);
    const backupDurationMs = performance.now() - backupStart;
    await source.setting.create({ data: { key: afterKey, value: { nonce } } });
    const restoreStart = performance.now();
    run('createdb', '-U', 'glowup_test', restoredDatabase);
    run('pg_restore', '-U', 'glowup_test', '--dbname', restoredDatabase, '--no-owner', dump);
    const after = await snapshot(restored);
    assert.deepEqual(JSON.parse(JSON.stringify(after)), JSON.parse(JSON.stringify(before)));
    assert.ok(await restored.setting.findUnique({ where: { key: beforeKey } }));
    assert.equal(await restored.setting.findUnique({ where: { key: afterKey } }), null, 'A snapshot does not recover writes made after it');
    await assert.rejects(restored.inventory.update({ where: { id: after.inventory[0].id }, data: { reservedQuantity: 101 } }), /constraint|23514/i);
    const restoreAndVerifyMs = performance.now() - restoreStart;
    const report = {
      status: 'passed', checkedAt: new Date().toISOString(), backupStartedAt, backupDurationMs, restoreAndVerifyMs,
      environment: 'Dedicated local PostgreSQL 17 Docker project; restore into a new database, original orders untouched',
      scope: '4-order fixture: schema, monetary totals, order items, payments, inventory, idempotency receipts and inventory constraint',
      snapshotSha256: createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      counts: Object.fromEntries(Object.entries(before).map(([key, value]) => [key, value.length])),
      beforeBackupMarkerRecovered: true, afterBackupMarkerRecovered: false,
      limitation: 'One small local snapshot rehearsal; does not establish production RPO/PITR, RTO, object-storage recovery or bank reconciliation',
    };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Restore passed; backup ${backupDurationMs.toFixed(0)} ms; restore and verification ${restoreAndVerifyMs.toFixed(0)} ms.`);
  } finally { await Promise.allSettled([source.$disconnect(), restored.$disconnect()]); }
}
main().catch((error) => {
  writeFileSync(output, JSON.stringify({ status: 'failed', checkedAt: new Date().toISOString(), error: error.message }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
});
