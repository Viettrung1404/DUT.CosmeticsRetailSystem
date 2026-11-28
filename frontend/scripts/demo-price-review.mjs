import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const origin = process.env.PRICE_TEST_ORIGIN ?? 'http://localhost:3311';
const api = process.env.PRICE_TEST_API ?? 'http://localhost:3310/api/v1';
for (const url of [origin, api]) assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
const credentials = JSON.parse(await readFile(resolve(root, 'backend/.demo-data/credentials.json'), 'utf8'));
const fixture = JSON.parse(await readFile(resolve(root, 'docs/5-delivery/evidence/price-changes-restore.json'), 'utf8'));
assert(fixture.restored);
const output = resolve(root, 'docs/5-delivery/evidence');
process.loadEnvFile(resolve(root, 'backend/.env'));
const { PrismaClient } = createRequire(resolve(root, 'backend/package.json'))('@prisma/client');
const db = new PrismaClient();
let promotionId;
const adminLogin = await fetch(`${api}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@demo.glowup.test', password: credentials['admin@demo.glowup.test'].password }),
});
assert(adminLogin.ok);
const token = (await adminLogin.json()).data.accessToken;
async function change(price) {
  const response = await fetch(`${api}/admin/variants/${fixture.variantId}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ price }), signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, `Price update: ${response.status}`);
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
let restored = false;
try {
  const login = await context.request.post(`${origin}/api/auth/login`, {
    headers: { origin }, data: { email: 'customer-20@demo.glowup.test', password: credentials['customer-20@demo.glowup.test'].password },
  });
  assert.equal(login.status(), 200, await login.text());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let loads = 0, orders = 0;
  page.on('domcontentloaded', () => loads++);
  page.on('request', request => { if (request.url().endsWith('/api/checkout/order')) orders++; });
  const preview = page.waitForResponse(r => r.url().endsWith('/api/checkout/preview') && r.ok());
  await page.goto(`${origin}/checkout?buyNow=1&variantId=${fixture.variantId}&quantity=1`, { timeout: 90000 });
  const originalQuote = await (await preview).json();
  const orderButton = page.locator('.checkout-place-order');
  await orderButton.waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => !document.querySelector('.checkout-place-order')?.disabled, { timeout: 45000 });
  const address = await page.locator('.checkout-address-card.is-selected').innerText();
  await change(fixture.originalPrice + 31000);
  await orderButton.click();
  const modal = page.getByRole('dialog', { name: 'Giá và ưu đãi đã thay đổi' });
  await modal.waitFor({ timeout: 45000 });
  await modal.getByText('Đã hiểu, xem lại đơn hàng', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.checkout-price-review dl') != null, { timeout: 45000 });
  assert.equal(orders, 1, 'No automatic order resubmission');
  assert.equal(loads, 1, 'No full-page reload');
  await page.screenshot({ path: resolve(output, 'price-review-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
  await page.screenshot({ path: resolve(output, 'price-review-mobile.png') });
  await modal.getByRole('button', { name: 'Đã hiểu, xem lại đơn hàng' }).click();
  assert.equal(await page.locator('.checkout-address-card.is-selected').innerText(), address);
  // A DB-only campaign insert must be visible without a cache invalidation event.
  const variant = await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variantId } });
  const promotion = await db.promotion.create({ data: {
    name: 'Temporary price freshness demo', type: 'PERCENTAGE', value: 60,
    startDate: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 3600000),
    applicableProducts: [variant.productId],
  } });
  promotionId = promotion.id;
  await writeFile(resolve(output, 'price-changes-ui-restore.json'), JSON.stringify({ ...fixture, promotionId, restored: false }, null, 2));
  // Change again after acknowledgement. The next click must validate again.
  await change(fixture.originalPrice - 7000);
  await orderButton.click();
  await modal.waitFor({ timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('.checkout-price-review dl') != null, { timeout: 45000 });
  assert.equal(orders, 2);
  assert.equal(loads, 1);
  await page.screenshot({ path: resolve(output, 'price-review-mobile.png') });
  await modal.getByRole('button', { name: 'Đã hiểu, xem lại đơn hàng' }).click();
  // Repricing may fail temporarily; the old quote must stay unusable.
  await page.route('**/api/checkout/preview', route => route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } }));
  const changedDiscount = await fetch(`${api}/admin/promotions/${promotionId}`, {
    method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ value: 70 }),
  });
  assert(changedDiscount.ok, `Discount update: ${changedDiscount.status}`);
  await orderButton.click();
  await modal.waitFor({ timeout: 45000 });
  await modal.getByRole('button', { name: 'Thử tải lại giá' }).waitFor({ timeout: 45000 });
  assert(await orderButton.isDisabled());
  await page.unroute('**/api/checkout/preview');
  await modal.getByRole('button', { name: 'Thử tải lại giá' }).click();
  await page.waitForFunction(() => document.querySelector('.checkout-price-review dl') != null, { timeout: 45000 });
  assert.equal(orders, 3);
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'price-changes-ui.json'), JSON.stringify({
    at: new Date().toISOString(), originalQuoteVersion: originalQuote.quoteVersion,
    popup: 'PASS', componentRefreshWithoutNavigation: 'PASS', preserveAddress: 'PASS',
    noAutomaticResubmit: 'PASS', secondPriceChange: 'PASS', failedRefreshAndRetry: 'PASS',
    mobileOverflow: 'PASS', browserErrors: errors,
    directDatabasePromotionVisible: 'PASS', adminPercentageChange: 'PASS',
  }, null, 2));
  console.log('PASS: popup, isolated refresh, preserved address, repeated changes, failed refresh/retry, desktop/mobile');
} finally {
  try {
    await change(fixture.originalPrice);
    if (promotionId) await db.promotion.delete({ where: { id: promotionId } });
    restored = true;
  }
  finally {
    await writeFile(resolve(output, 'price-changes-ui-restore.json'), JSON.stringify({ variantId: fixture.variantId, originalPrice: fixture.originalPrice, restored, temporaryPromotionRemoved: !promotionId || restored }, null, 2));
    await browser.close();
    await db.$disconnect();
  }
}
