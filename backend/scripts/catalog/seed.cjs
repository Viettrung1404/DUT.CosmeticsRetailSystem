const fs=require('node:fs');
const path=require('node:path');
const {PrismaClient}=require('@prisma/client');
const {id}=require('./normalize.cjs');
const ROOT=path.resolve(__dirname,'../../.catalog-data');
const OLD_SKUS=['LRP-EFF-GEL','LRP-ANTHELIOS-50ML','INNI-GREENTEA-SERUM','CERAVE-MOIST-CREAM','BR-AIRFIT-V1','INNI-NOSEBUM-POWDER'];
const OLD_CATEGORY_SLUGS=['sua-rua-mat','kem-chong-nang','serum-tinh-chat','kem-duong-am','son-moi','phan-phu-cushion','trang-diem-mat','dau-goi-dau-xa','sua-tam','cham-soc-da','trang-diem','cham-soc-co-the-toc'];
const PARENTS={'cham-soc-da':'Chăm sóc da','trang-diem':'Trang điểm','co-the-toc':'Chăm sóc cơ thể và tóc','phu-kien':'Phụ kiện làm đẹp'};
const STORE_CODES=['WH-HN','STORE-01','STORE-02','STORE-03','STORE-04','STORE-05'];
const prisma=new PrismaClient();
async function main() {
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
  if(catalog.products.length<350) throw new Error('Require at least 350 normalized products before changing DB');
  const galleryReportPath=path.join(ROOT,'gallery-report.json');
  if(!fs.existsSync(galleryReportPath))throw new Error('Finish catalog:gallery and normalize again before seed');
  const sourceRows=JSON.parse(fs.readFileSync(path.join(ROOT,'collected.json'),'utf8'));
  const galleryReport=JSON.parse(fs.readFileSync(galleryReportPath,'utf8'));
  if(galleryReport.products!==sourceRows.length || galleryReport.images!==sourceRows.reduce((n,r)=>n+r.images.length,0))throw new Error('Gallery checkpoint does not match completed report');
  const local=process.argv.includes('--local');
  const manifest=local ? {} : JSON.parse(fs.readFileSync(path.join(ROOT,'uploaded.json'),'utf8'));
  const imageUrl=im=>local ? `http://localhost:4010/${im.localPath}` : manifest[im.sha256]?.url;
  for(const p of catalog.products) for(const im of p.images) {
    if(local && !fs.existsSync(path.join(ROOT,im.localPath)))throw new Error('Missing local image');
    if(!local && !imageUrl(im)?.startsWith('https://')) throw new Error('Upload all selected images before seed');
  }
  const stores=await prisma.store.findMany({where:{code:{in:STORE_CODES}}});
  if(stores.length!==6 || stores.filter(s=>s.type==='STORE').length!==5 || stores.filter(s=>s.type==='WAREHOUSE').length!==1) throw new Error('Run seed:stores first: need 5 stores and 1 warehouse');
  const old=await prisma.product.findMany({where:{sku:{in:OLD_SKUS}},include:{variants:true,images:true,ingredients:true,tags:true}});
  if(old.length && !process.argv.includes('--clean-legacy')) throw new Error('Legacy seed found; pass --clean-legacy to replace those six known SKUs');
  if(old.length) fs.writeFileSync(path.join(ROOT,`legacy-backup-${Date.now()}.json`),JSON.stringify(old,null,2));
  const [existingBrands,existingCategories,existingVariants]=await Promise.all([prisma.brand.findMany(),prisma.category.findMany(),prisma.productVariant.findMany({where:{sku:{startsWith:'GU-V-'}},select:{id:true}})]);
  const knownVariants=new Set(existingVariants.map(v=>v.id));
  const brandMap=new Map(existingBrands.map(b=>[b.slug,b.id]));
  const categoryMap=new Map(existingCategories.map(c=>[c.slug,c.id]));
  const brands=[],parents=[],categories=[],products=[],variants=[],images=[],ingredients=[],tags=[],inventory=[],batches=[],transactions=[];
  for(const [slug,name] of Object.entries(PARENTS)) {
    const cid=categoryMap.get(slug)||id('category:'+slug);categoryMap.set(slug,cid);
    parents.push({id:cid,slug,name});
  }
  for(const p of catalog.products) {
    if(!brandMap.has(p.brand.slug)){brandMap.set(p.brand.slug,p.brand.id);brands.push(p.brand);}
    if(!categoryMap.has(p.category.slug)){
      const cid=id('category:'+p.category.slug);categoryMap.set(p.category.slug,cid);
      categories.push({id:cid,slug:p.category.slug,name:p.category.name,parentId:categoryMap.get(p.category.parent)});
    }
    const {id:pid,sku,slug,name,description,shortDescription}=p;
    products.push({id:pid,sku,slug,name,description,shortDescription,categoryId:categoryMap.get(p.category.slug),brandId:brandMap.get(p.brand.slug),basePrice:Math.min(...p.variants.map(v=>v.price)),option1Name:'Phiên bản',isFeatured:products.length<12});
    for(const v of p.variants) {
      let total=0;
      for(const s of stores) {
        const seed=parseInt(v.id.replace(/-/g,'').slice(0,6),16);
        const quantity=s.type==='WAREHOUSE'?80+seed%41:10+(seed+Number(s.code.slice(-2)))%21;
        total+=quantity;
        if(knownVariants.has(v.id)) continue; // Never reset live stock on subsequent runs.
        const batchId=id('batch:'+s.code+':'+v.id);
        inventory.push({id:id('inventory:'+s.code+':'+v.id),storeId:s.id,productVariantId:v.id,quantity,reservedQuantity:0,minQuantity:5});
        batches.push({id:batchId,storeId:s.id,productVariantId:v.id,batchNumber:'DEMO-20261027-'+v.sku,quantity,manufactureDate:new Date('2026-09-01T00:00:00Z'),expiryDate:new Date('2028-09-01T00:00:00Z')});
        transactions.push({id:id('opening:'+s.code+':'+v.id),storeId:s.id,productVariantId:v.id,batchId,transactionType:'IN',quantity,referenceType:'SEED_OPENING',referenceId:batchId,note:'Tồn đầu kỳ giả lập GlowUp; không phải tồn kho nguồn crawl.'});
      }
      variants.push({...v,productId:pid,stockQuantity:total});
    }
    p.images.forEach((im,index)=>images.push({id:im.id,productId:pid,productVariantId:im.variantId || null,imageUrl:imageUrl(im),altText:name.slice(0,255),sortOrder:index,isPrimary:index===0}));
    for(const ingredient of p.ingredients) ingredients.push({...ingredient,productId:pid});
    for(const tagName of p.tags) tags.push({productId:pid,tagName});
  }
  const counts={products:products.length,variants:variants.length,images:images.length,newInventory:inventory.length,stores:stores.length};
  console.log('Prepared',JSON.stringify(counts));
  if(process.argv.includes('--dry-run')) return;
  await prisma.$transaction(async tx=>{
    // Cascade removes only the six old seed product graphs. FK restrictions abort
    // this entire transaction if any operational record references them.
    if(old.length) await tx.product.deleteMany({where:{sku:{in:OLD_SKUS}}});
    await tx.$executeRaw`INSERT INTO public_cache_revision(id,generation) VALUES(1,0) ON CONFLICT(id) DO NOTHING`;
    async function insert(model,rows){for(let i=0;i<rows.length;i+=100)await tx[model].createMany({data:rows.slice(i,i+100),skipDuplicates:true});}
    await insert('brand',brands);await insert('category',parents);await insert('category',categories);
    // Old seed used stock photography as brand logos. Remove only those placeholders.
    await tx.brand.updateMany({where:{slug:{in:['la-roche-posay','innisfree','black-rouge','cerave']},logoUrl:{contains:'images.unsplash.com'}},data:{logoUrl:null}});
    for(const categoryId of new Set(products.map(x=>x.categoryId))){
      const product=products.find(x=>x.categoryId===categoryId);
      await tx.category.updateMany({where:{id:categoryId,OR:[{imageUrl:null},{imageUrl:{contains:'images.unsplash.com'}}]},data:{imageUrl:images.find(x=>x.productId===product.id).imageUrl}});
    }
    await insert('product',products);await insert('productVariant',variants);await insert('productImage',images);
    await insert('productIngredient',ingredients);await insert('productTag',tags);
    await insert('batch',batches);await insert('inventory',inventory);await insert('inventoryTransaction',transactions);
    // Remove only now-empty legacy categories, leaves before their empty parent.
    for(let pass=0;pass<2;pass++)await tx.category.deleteMany({where:{slug:{in:OLD_CATEGORY_SLUGS},products:{none:{}},children:{none:{}}}});
  },{maxWait:15000,timeout:240000});
  const report=JSON.stringify({completedAt:new Date().toISOString(),...counts,imageMode:local?'local':'cloud',legacyDeleted:old.map(p=>p.sku),costAndInventory:'synthetic demo values'},null,2);
  fs.writeFileSync(path.join(ROOT,`seed-report-${Date.now()}.json`),report);
  fs.writeFileSync(path.join(ROOT,'seed-report.json'),report);
  console.log('Seed completed; roles and permissions untouched.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
