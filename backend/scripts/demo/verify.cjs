const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const {demoId}=require('./fixtures.cjs');
const ROOT=path.resolve(__dirname,'../../.demo-data');
const db=new PrismaClient();
const encode=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x);
async function main(){
  const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'protected-before.json'),'utf8'));
  const protectedModels={};
  for(const [model,before] of Object.entries(baseline)){
    const key=model==='permission'?'bitPosition':'id';
    const rows=await db[model].findMany({where:{[key]:{in:before.keys}},orderBy:{[key]:'asc'}});
    protectedModels[model]=crypto.createHash('sha256').update(encode(rows)).digest('hex')===before.sha256;
    if(!protectedModels[model])throw new Error('Existing '+model+' records changed');
  }
  const checks={};
  const check=async(name,query)=>{const rows=await query;checks[name]=Number(rows[0].count);if(checks[name]!==0)throw new Error(`${name}: ${checks[name]} inconsistent records`);};
  await check('inventoryVsBatches',db.$queryRaw`SELECT COUNT(*)::int AS count FROM inventory i WHERE i.quantity <> COALESCE((SELECT SUM(b.quantity) FROM batches b WHERE b.store_id=i.store_id AND b.product_variant_id=i.product_variant_id),0)`);
  await check('inventoryVsLedger',db.$queryRaw`SELECT COUNT(*)::int AS count FROM inventory i WHERE i.quantity <> COALESCE((SELECT SUM(t.quantity) FROM inventory_transactions t WHERE t.store_id=i.store_id AND t.product_variant_id=i.product_variant_id),0)`);
  await check('batchVsLedger',db.$queryRaw`SELECT COUNT(*)::int AS count FROM batches b WHERE b.quantity <> COALESCE((SELECT SUM(t.quantity) FROM inventory_transactions t WHERE t.batch_id=b.id),0)`);
  await check('variantStockTotals',db.$queryRaw`SELECT COUNT(*)::int AS count FROM product_variants v WHERE v.sku LIKE 'GU-V-%' AND v.stock_quantity <> COALESCE((SELECT SUM(i.quantity) FROM inventory i WHERE i.product_variant_id=v.id),0)`);
  await check('reservations',db.$queryRaw`SELECT COUNT(*)::int AS count FROM inventory i WHERE i.reserved_quantity <> COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.store_id=i.store_id AND oi.product_variant_id=i.product_variant_id AND o.status IN ('PENDING','CONFIRMED','PROCESSING')),0)`);
  await check('orderTotals',db.$queryRaw`SELECT COUNT(*)::int AS count FROM orders o WHERE o.note LIKE 'DEMO:%' AND o.total_amount <> COALESCE((SELECT SUM(i.total_price) FROM order_items i WHERE i.order_id=o.id),0)+o.shipping_fee+o.tax_amount`);
  await check('fulfillmentTrace',db.$queryRaw`SELECT COUNT(*)::int AS count FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.note LIKE 'DEMO:%' AND o.status IN ('SHIPPING','DELIVERED','COMPLETED') AND i.quantity <> COALESCE((SELECT SUM(b.quantity) FROM order_item_batches b WHERE b.order_item_id=i.id),0)`);
  await check('completedFunding',db.$queryRaw`SELECT COUNT(*)::int AS count FROM orders o WHERE o.note LIKE 'DEMO:%' AND o.status='COMPLETED' AND o.total_amount <> COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id=o.id AND p.status='COMPLETED'),0)+COALESCE((SELECT e.credit_applied FROM exchange_settlements e WHERE e.replacement_order_id=o.id AND e.status='ACTIVE'),0)`);
  await check('loyaltyLedger',db.$queryRaw`SELECT COUNT(*)::int AS count FROM customers c JOIN users u ON u.id=c.user_id WHERE u.email LIKE '%@demo.glowup.test' AND c.total_points <> COALESCE((SELECT SUM(t.points) FROM loyalty_points_transactions t WHERE t.customer_id=c.id),0)`);
  await check('customerOrderCounts',db.$queryRaw`SELECT COUNT(*)::int AS count FROM customers c JOIN users u ON u.id=c.user_id WHERE u.email LIKE '%@demo.glowup.test' AND c.total_orders <> (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id AND o.status='COMPLETED')`);
  await check('customerNetSpend',db.$queryRaw`SELECT COUNT(*)::int AS count FROM customers c JOIN users u ON u.id=c.user_id WHERE u.email LIKE '%@demo.glowup.test' AND c.total_spent <> COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.customer_id=c.id AND o.status='COMPLETED'),0)-COALESCE((SELECT SUM(ri.refund_amount) FROM return_order_items ri JOIN return_orders r ON r.id=ri.return_order_id WHERE r.customer_id=c.id AND r.status='COMPLETED'),0)`);
  await check('couponCounters',db.$queryRaw`SELECT COUNT(*)::int AS count FROM coupons c WHERE (c.code LIKE 'DEMO-%' OR c.code LIKE 'LP-%') AND c.used_count <> (SELECT COUNT(*) FROM coupon_usage u WHERE u.coupon_id=c.id)`);
  // POS records promotion usage on order items, while checkout uses the usage table.
  await check('promotionCounters',db.$queryRaw`SELECT COUNT(*)::int AS count FROM promotions p WHERE p.name LIKE 'GlowUp Demo%' AND p.used_count <> (SELECT COUNT(*) FROM promotion_order_usages u WHERE u.promotion_id=p.id AND u.status <> 'RELEASED')+(SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.order_type='POS' AND o.status='COMPLETED' AND i.promotion_id=p.id AND NOT EXISTS(SELECT 1 FROM promotion_order_usages u WHERE u.promotion_id=p.id AND u.order_id=o.id))`);
  await check('quotaCounters',db.$queryRaw`SELECT COUNT(*)::int AS count FROM promotion_variant_quotas q WHERE q.reserved_quantity <> COALESCE((SELECT SUM(a.quantity) FROM promotion_allocations a WHERE a.quota_id=q.id AND a.status='RESERVED'),0) OR q.consumed_quantity <> COALESCE((SELECT SUM(a.quantity) FROM promotion_allocations a WHERE a.quota_id=q.id AND a.status='CONSUMED'),0)`);
  await check('reviewAggregates',db.$queryRaw`SELECT COUNT(*)::int AS count FROM products p WHERE p.total_reviews <> (SELECT COUNT(*) FROM reviews r WHERE r.product_id=p.id AND r.is_approved) OR p.avg_rating <> COALESCE((SELECT ROUND(AVG(r.rating)::numeric,2) FROM reviews r WHERE r.product_id=p.id AND r.is_approved),0)`);
  await check('purchaseTotals',db.$queryRaw`SELECT COUNT(*)::int AS count FROM purchase_orders p WHERE p.po_number LIKE 'DEMO-%' AND p.total_amount <> COALESCE((SELECT SUM(i.total_cost) FROM purchase_order_items i WHERE i.purchase_order_id=p.id),0)`);
  await check('purchaseQuantities',db.$queryRaw`SELECT COUNT(*)::int AS count FROM purchase_order_items i JOIN purchase_orders p ON p.id=i.purchase_order_id WHERE p.po_number LIKE 'DEMO-%' AND (i.quantity_received>i.quantity_ordered OR i.total_cost<>i.quantity_ordered*i.unit_cost)`);
  await check('invoiceTotals',db.$queryRaw`SELECT COUNT(*)::int AS count FROM invoices i WHERE i.invoice_series='DEMO' AND (i.status<>'DRAFT' OR i.total_amount<>COALESCE((SELECT SUM(x.total_amount) FROM invoice_items x WHERE x.invoice_id=i.id),0))`);
  await check('noOutgoingDemoEmail',db.$queryRaw`SELECT COUNT(*)::int AS count FROM email_outbox WHERE recipient LIKE '%@demo.glowup.test' AND status <> 'CANCELLED'`);
  const models=['user','userStore','customer','customerAddress','employee','department','shift','attendance','supplier','loyaltyTier','setting','page','faq','banner','blogCategory','blogPost','promotion','promotionVariantQuota','promotionAllocation','promotionOrderUsage','coupon','couponUsage','cart','cartItem','wishlist','order','orderItem','orderItemBatch','orderStatusHistory','payment','posSession','commission','purchaseOrder','purchaseOrderItem','supplierPayment','inventory','batch','inventoryTransaction','inventoryTransfer','inventoryTransferItem','stocktake','stocktakeItem','shipment','shipmentEvent','returnOrder','returnOrderItem','returnStatusHistory','refund','exchangeItem','exchangeSettlement','exchangeFunding','loyaltyPointsTransaction','loyaltyRedemption','review','invoice','invoiceItem','notification','emailOutbox','commandReceipt'];
  const counts=Object.fromEntries(await Promise.all(models.map(async model=>[model,await db[model].count()])));
  if(counts.order<30||counts.posSession<5||counts.purchaseOrder<5||counts.returnOrder<4)throw new Error('Scenario coverage is incomplete');
  const accounts=await db.user.count({where:{email:{endsWith:'@demo.glowup.test'}}});
  if(accounts!==34)throw new Error('Expected 34 isolated demo accounts');
  const adminAssignments=await db.userStore.count({where:{userId:{in:[demoId('user','admin'),demoId('user','accountant')]}}});
  if(adminAssignments!==0)throw new Error('Back-office demo users should not be assigned to POS tills');
  const report={completedAt:new Date().toISOString(),protectedModels,checks,counts,demoAccounts:accounts,allChecksPassed:true};
  fs.writeFileSync(path.join(ROOT,'verification-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
