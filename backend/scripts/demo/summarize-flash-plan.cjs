const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../../../docs/3-planning/flash-sale');
const plan = JSON.parse(fs.readFileSync(path.join(directory, 'plan.json'), 'utf8'));
const rows = plan.plans.flat();
const format = (value) => value.toLocaleString('vi-VN') + 'đ';
const range = (values) => `${format(Math.min(...values))}–${format(Math.max(...values))}`;
const references = plan.plans[0].reduce((counts, row) => {
  const status = row.reference?.status ?? 'no-match';
  counts[status] = (counts[status] ?? 0) + 1;
  return counts;
}, {});
const charm = rows.filter((row) => [5000, 9000].includes(row.salePrice % 10000) &&
  [5000, 9000].includes(row.featuredSalePrice % 10000)).length;
const summary = { products: plan.productOrder.length, variants: plan.plans[0].length,
  slots: plan.plans.length, rows: rows.length, references,
  bothPricesHavePreferredEnding: charm,
  preferredEndingPercent: Number((charm / rows.length * 100).toFixed(2)),
  normalDiscount: [Math.min(...rows.map((r) => r.discountPercent)), Math.max(...rows.map((r) => r.discountPercent))],
  featuredDiscount: [Math.min(...rows.map((r) => r.featuredDiscountPercent)), Math.max(...rows.map((r) => r.featuredDiscountPercent))] };
fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
const lines = ['# Bảng tổng hợp 350 sản phẩm', '',
  `Có ${rows.length} dòng giá theo 12 khung giờ. Tham chiếu biến thể: ${JSON.stringify(references)}.`, '',
  'Cột giá thể hiện phạm vi trên toàn bộ biến thể và 12 khung. Giá cụ thể nằm trong [variant-prices.csv](variant-prices.csv). Nhóm nổi bật luân phiên theo công thức trong [README](README.md).', '',
  '| Sản phẩm | Biến thể | Giá gốc | Sale thường | Sale nổi bật | Nguồn Beauty Box |',
  '| --- | ---: | ---: | ---: | ---: | --- |'];
for (const product of plan.productOrder) {
  const productRows = rows.filter((row) => row.productId === product.id);
  const source = productRows.find((row) => row.reference)?.reference;
  lines.push(`| ${product.name.replace(/\|/g, '/')} | ${new Set(productRows.map((r) => r.variantId)).size} | ${range(productRows.map((r) => r.originalPrice))} | ${range(productRows.map((r) => r.salePrice))} | ${range(productRows.map((r) => r.featuredSalePrice))} | ${source ? `[Đối chiếu](${source.url})` : 'Chưa tìm được'} |`);
}
fs.writeFileSync(path.join(directory, 'product-summary.md'), lines.join('\n') + '\n');
console.log(JSON.stringify(summary));
