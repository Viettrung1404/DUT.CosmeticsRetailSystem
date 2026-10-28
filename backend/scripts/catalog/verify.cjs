const fs=require('node:fs');
const path=require('node:path');
const {PrismaClient}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../.catalog-data');
const p=new PrismaClient();
async function main(){
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
  const ids=catalog.products.map(x=>x.id);
  const expectedVariants=catalog.products.flatMap(x=>x.variants).map(v=>v.id);
  const [products,variants,images,stores,stock,totals]=await Promise.all([
    p.product.count({where:{id:{in:ids}}}),p.productVariant.count({where:{id:{in:expectedVariants}}}),
    p.productImage.count({where:{productId:{in:ids}}}),p.store.findMany({where:{code:{in:['WH-HN','STORE-01','STORE-02','STORE-03','STORE-04','STORE-05']}},select:{code:true,type:true}}),
    p.$queryRaw`SELECT COUNT(*)::int AS count FROM inventory i WHERE i.product_variant_id IN (SELECT id FROM product_variants WHERE sku LIKE 'GU-V-%') AND (i.quantity <> COALESCE((SELECT SUM(b.quantity) FROM batches b WHERE b.store_id=i.store_id AND b.product_variant_id=i.product_variant_id),0) OR i.available_quantity <> i.quantity-i.reserved_quantity)`,
    p.inventory.count({where:{productVariantId:{in:expectedVariants}}})]);
  if(products!==ids.length||variants!==expectedVariants.length||stock[0].count!==0||totals!==variants*6||stores.length!==6||images!==catalog.products.reduce((n,x)=>n+x.images.length,0))throw new Error('Catalog verification failed: '+JSON.stringify({products,variants,images,stores,stock,totals}));
  const primary=await p.$queryRaw`SELECT COUNT(*)::int AS count FROM
    (SELECT pr.id FROM products pr LEFT JOIN product_images im ON im.product_id=pr.id
      WHERE pr.sku LIKE 'GU-%' GROUP BY pr.id HAVING COUNT(*) FILTER(WHERE im.is_primary) <> 1) bad`;
  if(primary[0].count!==0)throw new Error('Each product must have exactly one primary image');
  let protectedUnchanged=null;
  const beforePath=path.join(ROOT,'protected-before.json');
  if(fs.existsSync(beforePath)){
    const before=JSON.parse(fs.readFileSync(beforePath,'utf8'));
    const otherRows=await p.product.findMany({where:{id:{in:before.otherProducts.map(x=>x.id)}}});
    const after={roles:await p.role.findMany({orderBy:{id:'asc'}}),permissions:await p.permission.findMany({orderBy:{bitPosition:'asc'}}),otherProducts:before.otherProducts.map(x=>otherRows.find(r=>r.id===x.id))};
    protectedUnchanged=JSON.stringify(after,(_,v)=>typeof v==='bigint'?v.toString():v)===JSON.stringify(before);
    if(!protectedUnchanged)throw new Error('Protected roles, permissions or unrelated products have changed; inspect snapshot');
  }
  const imageDistribution=catalog.products.reduce((a,x)=>(a[x.images.length]=(a[x.images.length]||0)+1,a),{});
  const report={products,variants,images,imageDistribution,stores,inventoryRows:totals,inconsistentStock:stock[0].count,protectedUnchanged};
  fs.writeFileSync(path.join(ROOT,'verification-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>p.$disconnect());
