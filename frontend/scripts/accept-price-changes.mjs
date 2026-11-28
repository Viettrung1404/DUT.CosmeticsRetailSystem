import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const base = process.env.PRICE_TEST_API ?? "http://localhost:3000/api/v1";
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('This reversible demo only runs against localhost');
const credentials = JSON.parse(await readFile(resolve(root, "backend/.demo-data/credentials.json"), "utf8"));
const evidence = [];
const directory = resolve(root, "docs/5-delivery/evidence");
await mkdir(directory, { recursive: true });
async function request(path, { method = 'GET', body, token, headers = {}, status = 200 } = {}) {
  const response = await fetch(base + path, {
    method, headers: { ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${response.status} ${result.code ?? JSON.stringify(result.message)}`);
  return status >= 400 ? result : result.data;
}
async function login(email) {
  return (await request('/auth/login', { method: 'POST', body: { email, password: credentials[email].password } })).accessToken;
}
const admin = await login('admin@demo.glowup.test');
const customer = await login('customer-20@demo.glowup.test');
const session = crypto.randomUUID();
const headers = { 'x-session-id': session };
const listing = await request('/customer/products?limit=30');
let product, variant, originalQuote;
for (const candidate of listing.data) {
  const detail = await request(`/customer/products/${candidate.slug}`);
  const v = detail.variants.find(v => Number(v.price) > 50000);
  if (!v) continue;
  const stock = await request(`/customer/products/${detail.id}/availability?variantId=${v.id}`);
  if (!stock.some(s => s.available > 2)) continue;
  const quote = await request('/orders/preview', { method: 'POST', token: customer, body: { items: [{ variantId: v.id, quantity: 1 }] } });

  product = detail; variant = v; originalQuote = quote; break;
}
assert(variant, 'Need an in-stock variant without a campaign to demonstrate base-price changes');
const originalPrice = Number(variant.price);
const items = [{ variantId: variant.id, quantity: 1 }];
const shippingAddress = { recipientName: 'Demo kiểm tra giá', phone: '0900000000', addressLine: '12 Nguyễn Văn Linh', city: 'Thành phố Đà Nẵng', district: 'Hải Châu' };
const payload = { items, shippingAddress, paymentMethod: 'COD', quoteVersion: originalQuote.quoteVersion };
let orderId, cartItemId;
const journal = { variantId: variant.id, originalPrice, productSlug: product.slug, restored: false };
const journalPath = resolve(directory, 'price-changes-restore.json');
await writeFile(journalPath, JSON.stringify(journal, null, 2));
async function change(price) {
  await request(`/admin/variants/${variant.id}`, { method: 'PATCH', token: admin, body: { price } });
}
try {
  await request('/cart/items', { method: 'POST', body: { productVariantId: variant.id, quantity: 1, sessionId: session }, headers, status: 201 });
  const cart = await request('/cart', { headers });
  cartItemId = cart.items.find(i => i.productVariantId === variant.id).id;
  for (const delta of [17000, -11000]) {
    await change(originalPrice + delta);
    const pdp = await request(`/customer/products/${product.slug}`);
    assert.equal(Number(pdp.variants.find(v => v.id === variant.id).price), originalPrice + delta);
    const latestCart = await request('/cart', { headers });
    const guestQuote = await request('/guest/orders/preview', { method: 'POST', headers, body: { items } });
    assert.equal(latestCart.items.find(i => i.id === cartItemId).currentPrice, guestQuote.items[0].effectivePrice);
    const rejected = await request('/orders', { method: 'POST', token: customer,
      headers: { 'idempotency-key': crypto.randomUUID() }, body: payload, status: 409 });
    assert.equal(rejected.code, 'ORDER_PRICE_CHANGED');
    const quote = await request('/orders/preview', { method: 'POST', token: customer, body: { items } });
    assert.notEqual(quote.quoteVersion, originalQuote.quoteVersion);
    assert.equal(quote.items[0].originalPrice, originalPrice + delta);
    const search = await request(`/customer/products/search?q=${encodeURIComponent(product.name)}&limit=30`);
    assert(search.data.some(p => p.id === product.id), 'Search must find the product after repricing');
    evidence.push({ case: delta > 0 ? 'price increase' : 'price decrease', oldPrice: originalPrice,
      newPrice: originalPrice + delta, pdp: 'PASS', cart: 'PASS', staleCheckout: '409 ORDER_PRICE_CHANGED', search: 'PASS' });
  }
  const quote = await request('/orders/preview', { method: 'POST', token: customer, body: { items } });
  const key = crypto.randomUUID();
  const body = { ...payload, quoteVersion: quote.quoteVersion };
  const order = await request('/orders', { method: 'POST', token: customer, headers: { 'idempotency-key': key }, body, status: 201 });
  orderId = order.id;
  journal.orderId = orderId;
  await writeFile(journalPath, JSON.stringify(journal, null, 2));
  const before = await request(`/orders/${orderId}`, { token: customer });
  await change(originalPrice + 23000);
  const after = await request(`/orders/${orderId}`, { token: customer });
  const totals = order => ({ totalAmount: order.totalAmount, subtotal: order.subtotal,
    items: order.items.map(i => ({ unitPrice: i.unitPrice, totalPrice: i.totalPrice, discountAmount: i.discountAmount })) });
  assert.deepEqual(totals(after), totals(before));
  const tracking = await request('/guest/orders/track', { method: 'POST', body: { orderNumber: order.orderNumber, phone: shippingAddress.phone } });
  assert.deepEqual(totals(tracking), totals(before));
  const retry = await request('/orders', { method: 'POST', token: customer, headers: { 'idempotency-key': key }, body, status: 201 });
  assert.equal(retry.id, orderId);
  evidence.push({ case: 'created order remains frozen after price changes', accountOrder: 'PASS', tracking: 'PASS', retrySameOrder: 'PASS', totalAmount: after.totalAmount, orderId });
} finally {
  const cleanup = [];
  try { await change(originalPrice); journal.restored = true; cleanup.push('original price restored'); }
  catch (error) { cleanup.push(`RESTORE FAILED: ${error.message}`); }
  if (orderId) {
    try { await request(`/orders/${orderId}/cancel`, { method: 'PUT', token: customer, body: { reason: 'Hoàn tất demo thay đổi giá; hủy đơn thử' } }); cleanup.push('test order cancelled'); }
    catch (error) { cleanup.push(`CANCEL FAILED: ${error.message}`); }
  }
  if (cartItemId) {
    try { await request(`/cart/items/${cartItemId}`, { method: 'DELETE', headers }); cleanup.push('guest test cart item removed'); }
    catch (error) { cleanup.push(`CART CLEANUP FAILED: ${error.message}`); }
  }
  journal.cleanup = cleanup;
  await writeFile(journalPath, JSON.stringify(journal, null, 2));
  await writeFile(resolve(directory, 'price-changes-api.json'), JSON.stringify({ at: new Date().toISOString(), variantId: variant.id, evidence, cleanup }, null, 2));
  console.log(JSON.stringify({ evidence, cleanup }, null, 2));
  assert(journal.restored, 'Restore failed; see price-changes-restore.json');
  assert(!cleanup.some(s => s.includes('FAILED')), 'Cleanup incomplete');
}

