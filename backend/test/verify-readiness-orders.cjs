const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { testDatabaseUrl } = require('./readiness-env.cjs');

async function main() {
  const output = resolve(__dirname, '../../.tmp/development-readiness');
  const fixture = JSON.parse(readFileSync(resolve(output, 'fullstack-fixture.json'), 'utf8'));
  assert.match(fixture.databaseSchema, /^readiness_web_[a-f0-9]{32}$/);
  const url = testDatabaseUrl(`postgresql://glowup_test:local_readiness_only@127.0.0.1:55434/glowup_readiness_test?schema=${fixture.databaseSchema}&connection_limit=2`);
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const orders = await db.order.findMany({ include: { items: true, payments: true } });
    assert.equal(orders.length, 4, 'desktop/mobile × customer/guest each create one order');
    assert.equal(orders.filter((order) => order.customerId && order.status === 'CANCELLED').length, 2);
    assert.equal(orders.filter((order) => !order.customerId && order.status === 'PENDING').length, 2);
    for (const order of orders) {
      assert.equal(Number(order.totalAmount), 130000);
      assert.equal(order.items.length, 1);
      assert.equal(order.items[0].quantity, 1);
      assert.equal(order.items[0].productVariantId, fixture.variantId);
      assert.equal(order.payments.length, 1);
      assert.equal(Number(order.payments[0].amount), 130000);
      assert.equal(order.payments[0].paymentMethod, 'COD');
      assert.notEqual(order.payments[0].status, 'COMPLETED', 'COD money is not received merely because an order exists');
    }
    const inventory = await db.inventory.findUniqueOrThrow({ where: {
      storeId_productVariantId: { storeId: fixture.storeId, productVariantId: fixture.variantId },
    } });
    assert.equal(inventory.quantity, 100);
    assert.equal(inventory.reservedQuantity, 2, 'customer cancellation releases once; the two guest orders remain reserved');
    assert.equal(inventory.availableQuantity, 98);
    writeFileSync(resolve(output, 'fullstack-database-verification.json'), JSON.stringify({
      checkedAt: new Date().toISOString(), status: 'passed', orders: orders.length,
      cancelledCustomerOrders: 2, pendingGuestOrders: 2, quantity: 100, reserved: 2, available: 98,
      totalAmountPerOrder: 130000, completedPayments: 0,
    }, null, 2) + '\n');
    console.log('Full-stack database invariants passed: 4 orders, exact COD totals, 2 released/2 retained reservations.');
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
