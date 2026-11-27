const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSlotPlan } = require('./flash-sale-plan.cjs');

test('each slot has distinct sibling prices, lower featured prices and matching discounts', () => {
  const products = [{ id: 'product', name: 'Lipstick', variants: Array.from({ length: 8 }, (_, i) => ({
    id: String(i), sku: String(i), price: 339000,
  })) }];
  for (let slot = 0; slot < 12; slot++) {
    const rows = buildSlotPlan(products, new Map(), slot);
    assert.equal(new Set(rows.map((row) => row.salePrice)).size, 8);
    assert.equal(new Set(rows.map((row) => row.featuredSalePrice)).size, 8);
    for (const row of rows) {
      assert.ok(row.featuredSalePrice > 0 && row.featuredSalePrice < row.salePrice && row.salePrice < row.originalPrice);
      assert.ok([5000, 9000].includes(row.salePrice % 10000));
      assert.ok([5000, 9000].includes(row.featuredSalePrice % 10000));
    }
  }
});

test('low-price products with many variants retain distinct prices using the documented exception', () => {
  const products = [{ id: 'masks', name: 'Masks', variants: Array.from({ length: 7 }, (_, i) => ({
    id: String(i), sku: String(i), price: i < 2 ? 24000 : 29000,
  })) }];
  const rows = buildSlotPlan(products, new Map(), 0);
  assert.equal(new Set(rows.map((row) => row.salePrice)).size, 7);
  assert.equal(new Set(rows.map((row) => row.featuredSalePrice)).size, 7);
  assert.ok(rows.every((row) => row.featuredSalePrice > 0 && row.featuredSalePrice < row.salePrice));
});
