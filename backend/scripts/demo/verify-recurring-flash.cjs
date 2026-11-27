require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { CommercePricingService } = require('../../src/modules/customer-experience/application/commerce-pricing.service');
const { isFeaturedProduct, isPromotionInSlot } = require('../../src/core/utils/flash-sale.util');
const db = new PrismaClient();

async function main() {
  const now = new Date();
  const planPath = path.resolve(__dirname, '../../../docs/3-planning/flash-sale');
  const plan = JSON.parse(fs.readFileSync(path.join(planPath, 'plan.json'), 'utf8'));
  const slot = plan.plans.find((rows) => isPromotionInSlot(rows[0].slotStartHour, now));
  const rows = await db.$queryRaw`
    SELECT q.product_variant_id::text AS id, v.price::float8 AS original,
      sprint5_variant_price(v.id,0)::float8 AS actual,
      glowup_quota_price(q.sale_price,q.featured_sale_price,q.product_rank,p.rotation_product_count,p.featured_product_count,p.slot_start_hour)::float8 AS planned
    FROM promotion_variant_quotas q JOIN promotions p ON p.id=q.promotion_id
    JOIN product_variants v ON v.id=q.product_variant_id
    WHERE p.is_active AND p.slot_start_hour IS NOT NULL AND glowup_slot_active(p.slot_start_hour)
  `;
  const errors = [];
  for (const row of rows) {
    if (!(row.actual > 0 && row.actual < row.original) || row.actual !== row.planned) errors.push(row);
    const expected = slot.find((item) => item.variantId === row.id);
    const featured = isFeaturedProduct(expected.productRank, plan.productOrder.length, 20, expected.slotStartHour, now);
    if (row.planned !== (featured ? expected.featuredSalePrice : expected.salePrice)) errors.push({ id: row.id, error: 'REPORT_PRICE_MISMATCH' });
  }
  const pricing = new CommercePricingService(db);
  for (let offset = 0; offset < rows.length; offset += 100) {
    const items = rows.slice(offset, offset + 100);
    const quote = await pricing.quote({ items: items.map((row) => ({ variantId: row.id, quantity: 3 })) });
    for (const item of quote.items) {
      const source = items.find((row) => row.id === item.variantId);
      if (item.effectivePrice !== source.actual) errors.push({ id: item.variantId, error: 'CHECKOUT_PRICE_MISMATCH', sql: source.actual, checkout: item.effectivePrice });
    }
  }
  const boundary = await db.$queryRaw`
    WITH slots AS (SELECT (TIMESTAMPTZ '2026-11-25 17:00:00+00' + (n * INTERVAL '2 hours')) AS at_time FROM generate_series(0,83) n)
    SELECT MIN(variants)::int AS min_variants,MAX(variants)::int AS max_variants,
      MIN(featured)::int AS min_featured,MAX(featured)::int AS max_featured FROM (
      SELECT slots.at_time,COUNT(DISTINCT q.product_variant_id) AS variants,
        COUNT(DISTINCT q.product_rank) FILTER(WHERE glowup_featured(q.product_rank,p.rotation_product_count,p.featured_product_count,p.slot_start_hour,slots.at_time)) AS featured
      FROM slots JOIN promotions p ON p.is_active AND p.slot_start_hour IS NOT NULL AND glowup_slot_active(p.slot_start_hour,slots.at_time)
      JOIN promotion_variant_quotas q ON q.promotion_id=p.id GROUP BY slots.at_time
    ) checked
  `;
  const summary = { checkedAt: now.toISOString(), variants: rows.length, checkoutQuantity: 3,
    boundary: boundary[0], errors };
  fs.writeFileSync(path.join(planPath, 'verification.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (errors.length || rows.length !== 1039 || boundary[0].min_featured !== 20 || boundary[0].max_featured !== 20) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
