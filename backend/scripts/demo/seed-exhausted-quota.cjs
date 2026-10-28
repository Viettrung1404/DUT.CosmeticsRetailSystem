const fs=require('node:fs');
const path=require('node:path');
const {demoId}=require('./fixtures.cjs');
const {createRuntime,ROOT}=require('./runtime.cjs');
const {db,step,checkout}=createRuntime();
async function main(){
  const quota=await step('quota:exhausted',()=>db.transaction(async tx=>{
    const candidates=await tx.promotionVariantQuota.findMany({where:{promotionId:demoId('promotion','flash')},orderBy:{id:'asc'}});
    const row=candidates.find(q=>q.consumedQuantity===2&&q.reservedQuantity===0);
    if(!row)throw new Error('Expected a fixture quota with exactly two fulfilled sales and no holds');
    const trace=await tx.promotionAllocation.aggregate({where:{quotaId:row.id,status:'CONSUMED'},_sum:{quantity:true}});
    if(trace._sum.quantity!==2)throw new Error('Quota sales must match actual allocations');
    const change=await tx.promotionVariantQuota.updateMany({where:{id:row.id,quota:{in:[2,25]},consumedQuantity:2,reservedQuantity:0},data:{quota:2}});
    if(change.count!==1)throw new Error('Demo quota configuration changed; will not overwrite it');
    await tx.$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT product_id,1,0,now(),now() FROM product_variants WHERE id=${row.productVariantId}::uuid
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now()`;
    return {id:row.id,productVariantId:row.productVariantId,promotionId:row.promotionId,quota:2,consumedQuantity:2,remaining:0};
  }));
  const current=await db.promotionVariantQuota.findUniqueOrThrow({where:{id:quota.id}});
  if(current.quota-current.reservedQuantity-current.consumedQuantity!==0)throw new Error('Fixture quota is no longer exhausted');
  const customerId=demoId('customer','customer-20');
  const address=await db.customerAddress.findFirstOrThrow({where:{customerId,isDefault:true}});
  const quote=await checkout.preview({customerId,paymentMethod:'COD',shippingAddress:{recipientName:address.recipientName,phone:address.phone,addressLine:address.addressLine,ward:address.ward,district:address.district,city:address.city},items:[{variantId:quota.productVariantId,quantity:1}]});
  // Inspect quote shape, using serialized public result to catch accidental reuse.
  const serialized=JSON.stringify(quote);
  if(serialized.includes(quota.promotionId))throw new Error('Checkout still applied the exhausted flash-sale promotion');
  fs.writeFileSync(path.join(ROOT,'exhausted-quota-report.json'),JSON.stringify({...quota,checkoutExcludesExhaustedPromotion:true,checkedAt:new Date().toISOString()},null,2));
  console.log('Exhausted quota verified: 2 units, 2 consumed allocations, 0 remaining; checkout excludes it.');
}
main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
