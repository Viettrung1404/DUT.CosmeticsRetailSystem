const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { id } = require('../catalog/normalize.cjs');
const { buildSlotPlan } = require('./flash-sale-plan.cjs');
const db = new PrismaClient();
const root = path.resolve(__dirname, '../../..');
const directory = path.join(root, 'docs/3-planning/flash-sale');
const startDate = new Date('2026-11-26T00:00:00+07:00');
const endDate = new Date('2031-01-01T00:00:00+07:00');
const campaignId = (slot) => id(`flash-recurring-v1:${slot}`);

async function main() {
  const products = await db.product.findMany({ where: { isActive: true },
    select: { id: true, name: true, variants: { where: { isActive: true }, orderBy: { id: 'asc' },
      select: { id: true, sku: true, price: true, option1Value: true, option2Value: true } } },
    orderBy: { id: 'asc' } });
  const references = new Map();
  const sourcePath = path.join(root, 'backend/.catalog-data/flash-price-references.json');
  if (!fs.existsSync(sourcePath)) throw new Error('Run research-flash-prices.cjs first');
  const sources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  for (const source of Object.values(sources)) {
    for (const [sku, reference] of Object.entries(source.variants)) {
      references.set(sku, { ...reference, url: reference.url ?? source.url,
        fetchedAt: reference.fetchedAt ?? source.fetchedAt,
        status: reference.status ?? source.status });
    }
  }
  const plans = Array.from({ length: 12 }, (_, slot) => buildSlotPlan(products, references, slot));
  fs.mkdirSync(directory, { recursive: true });
  const columns = ['productId', 'name', 'variantId', 'sku', 'option', 'slotStartHour', 'originalPrice',
    'salePrice', 'discountPercent', 'featuredSalePrice', 'featuredDiscountPercent', 'productRank',
    'roundingPolicy', 'referenceOriginalPrice', 'referencePrice', 'referenceProductPrice', 'referenceProductDiscount', 'referenceStatus', 'referenceFetchedAt', 'referenceUrl'];
  const cell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const report = plans.flat().map((row) => ({ ...row,
    referenceOriginalPrice: row.reference?.originalPrice, referencePrice: row.reference?.price,
    referenceProductPrice: row.reference?.productCurrentPrice, referenceProductDiscount: row.reference?.productDiscountPercent,
    referenceStatus: row.reference?.status ?? 'no-match', referenceFetchedAt: row.reference?.fetchedAt,
    referenceUrl: row.reference?.url }));
  fs.writeFileSync(path.join(directory, 'variant-prices.csv'), '\ufeff' +
    [columns.join(','), ...report.map((row) => columns.map((key) => cell(row[key])).join(','))].join('\r\n'));
  fs.writeFileSync(path.join(directory, 'plan.json'), JSON.stringify({ startDate, endDate,
    timezone: 'Asia/Ho_Chi_Minh', slotHours: 2, featuredProducts: 20,
    productOrder: products.map((product) => ({ id: product.id, name: product.name })), plans }, null, 2));
  require('./summarize-flash-plan.cjs');
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ preview: true, products: products.length, rows: report.length }));
    return;
  }
  await db.$transaction(async (tx) => {
    // Retire the previous demo flash schedules while preserving all allocation history.
    await tx.promotion.updateMany({ where: { isFlashSale: true,
      OR: [{ name: { startsWith: '⚡ Flash Sale [' } }, { name: { startsWith: '🔥 Giờ Vàng [' } },
        { name: { startsWith: 'GlowUp Demo — Flash sale' } }] }, data: { isActive: false } });
    for (let slot = 0; slot < 12; slot++) {
      const data = { name: `GlowUp — Sale ${String(slot * 2).padStart(2, '0')}:00–${String((slot + 1) * 2).padStart(2, '0')}:00`,
        description: 'Giá riêng từng biến thể; 20 sản phẩm giảm sâu luân phiên theo ngày và khung giờ.',
        type: 'PERCENTAGE', value: 0, minOrderAmount: 0, maxDiscountAmount: null,
        startDate, endDate, isActive: true, isFlashSale: true, usageLimit: null,
        applicableProducts: [], applicableCategories: [], slotStartHour: slot * 2,
        rotationProductCount: products.length, featuredProductCount: Math.min(20, products.length) };
      await tx.promotion.upsert({ where: { id: campaignId(slot) }, create: { id: campaignId(slot), ...data }, update: data });
      for (let offset = 0; offset < plans[slot].length; offset += 300) {
        const rows = plans[slot].slice(offset, offset + 300);
        await tx.$executeRaw`
          INSERT INTO promotion_variant_quotas (id,promotion_id,product_variant_id,quota,reserved_quantity,consumed_quantity,sale_price,featured_sale_price,product_rank)
          SELECT u.id::uuid,${campaignId(slot)}::uuid,u.variant::uuid,100000000,0,0,u.regular,u.featured,u.rank
          FROM UNNEST(${rows.map((r) => id(`flash-quota-v1:${slot}:${r.variantId}`))}::text[],
            ${rows.map((r) => r.variantId)}::text[],${rows.map((r) => r.salePrice)}::numeric[],
            ${rows.map((r) => r.featuredSalePrice)}::numeric[],${rows.map((r) => r.productRank)}::int[])
          AS u(id,variant,regular,featured,rank)
          ON CONFLICT(promotion_id,product_variant_id) DO UPDATE SET
            sale_price=EXCLUDED.sale_price,featured_sale_price=EXCLUDED.featured_sale_price,product_rank=EXCLUDED.product_rank
        `;
      }
    }
    await tx.$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT id,1,0,now(),now() FROM products WHERE is_active=true
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,next_attempt_at=now(),updated_at=now()`;
  }, { timeout: 120000, maxWait: 15000 });
  console.log(JSON.stringify({ applied: true, products: products.length, variants: report.length / 12, slots: 12,
    prices: report.length, references: references.size, endDate }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
