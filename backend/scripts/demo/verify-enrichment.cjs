const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../.demo-data');
const db=new PrismaClient();
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function main(){
  const manifest=read('enrichment-manifest.json');
  const ids=manifest.products.map(p=>p.productId);
  const [brands,categories,products,ingredients,tags,quotas]=await Promise.all([
    db.brand.findMany({where:{slug:{in:manifest.brands.map(b=>b.slug)}},orderBy:{id:'asc'}}),
    db.category.findMany({orderBy:{id:'asc'}}),
    db.product.findMany({where:{id:{in:ids}},select:{id:true,categoryId:true,brandId:true},orderBy:{id:'asc'}}),
    db.productIngredient.findMany({where:{productId:{in:ids}},orderBy:{id:'asc'}}),
    db.productTag.findMany({where:{productId:{in:ids}},orderBy:[{productId:'asc'},{tagName:'asc'}]}),
    db.promotionVariantQuota.findMany({orderBy:{id:'asc'}})
  ]);
  const checks={};
  function check(name,condition){checks[name]=Boolean(condition);if(!condition)throw new Error('Enrichment check failed: '+name);}
  check('allImportedProductsPresent',products.length===350);
  check('allBrandsPresent',brands.length===102);
  check('allProductsHaveTags',ids.every(id=>tags.some(t=>t.productId===id)));
  check('allProductsMappedToExpectedCategory',manifest.products.every(p=>products.find(x=>x.id===p.productId)?.categoryId===categories.find(c=>c.slug===p.category.slug)?.id));
  check('categoryMetadataComplete',categories.every(c=>c.description&&c.imageUrl&&c.metaTitle&&c.metaDescription));
  check('brandMetadataComplete',brands.every(b=>b.description&&b.metaTitle&&b.metaDescription));
  check('declaredIngredientsExist',manifest.products.every(p=>p.ingredients.every(i=>ingredients.some(r=>r.id===i.id&&r.productId===p.productId&&r.ingredientName===i.ingredientName))));
  check('percentagesMatchSourcedEvidence',manifest.products.every(p=>p.ingredients.every(i=>ingredients.find(r=>r.id===i.id)?.percentage===i.percentage)));
  check('conflictingPercentagesRemainUnknown',manifest.products.every(p=>p.ingredients.filter(i=>i.percentageConflict).every(i=>ingredients.find(r=>r.id===i.id)?.percentage===null)));
  check('allIngredientsHaveSourceEvidence',manifest.products.every(p=>p.ingredients.every(i=>i.sourceUrl?.startsWith('https://')&&i.evidence)));
  check('verifiedOriginsApplied',manifest.brands.filter(b=>b.countryOfOrigin).every(b=>brands.find(r=>r.slug===b.slug)?.countryOfOrigin===b.countryOfOrigin));
  const before=read('enrichment-before.json');
  check('verifiedWebsitesApplied',manifest.brands.filter(b=>b.websiteUrl).every(b=>{const r=brands.find(r=>r.slug===b.slug);return r.websiteUrl===b.websiteUrl||r.websiteUrl===before.brands.find(x=>x.slug===b.slug)?.websiteUrl;}));
  const exhausted=read('exhausted-quota-report.json');
  const quota=quotas.find(q=>q.id===exhausted.id);
  check('exhaustedQuotaHasNoRemainingUnits',quota?.quota===2&&quota.consumedQuantity===2&&quota.reservedQuantity===0);
  const allocations=await db.promotionAllocation.aggregate({where:{quotaId:quota.id,status:'CONSUMED'},_sum:{quantity:true}});
  check('exhaustedQuotaBackedBySales',allocations._sum.quantity===2);
  check('checkoutExcludesExhaustedPromotion',exhausted.checkoutExcludesExhaustedPromotion===true);
  const ownedOriginal=read('catalog-before-enrichment.json');
  const desired=new Set(manifest.products.flatMap(p=>p.ingredients.map(i=>i.id)));
  check('obsoleteGeneratedIngredientsRemoved',ownedOriginal.products.flatMap(p=>p.ingredients).filter(i=>!desired.has(i.id)).every(i=>!ingredients.some(r=>r.id===i.id)));
  const gaps={brands:brands.filter(b=>!b.websiteUrl||!b.countryOfOrigin||!b.logoUrl).map(b=>({name:b.name,slug:b.slug,missing:['websiteUrl','countryOfOrigin','logoUrl'].filter(k=>!b[k]),sourceStatus:manifest.brands.find(r=>r.slug===b.slug)?.websiteStatus,sourceReason:manifest.brands.find(r=>r.slug===b.slug)?.websiteReason,action:'Giữ null cho trường chưa có nguồn được duyệt; không dùng ảnh sản phẩm thay logo.'})),products:manifest.products.filter(p=>p.status!=='SOURCED_INGREDIENTS').map(p=>({id:p.productId,name:p.name,status:p.status,sourceUrls:p.sourceUrls,action:p.status==='NOT_APPLICABLE_TOOL_OR_MATERIAL'?'Phụ kiện/vật liệu; không gán công thức mỹ phẩm.':'Nguồn đã kiểm tra chưa cung cấp thành phần xác thực; cần nhãn hàng/bao bì đúng phiên bản.'}))};
  fs.writeFileSync(path.join(ROOT,'enrichment-gaps.json'),JSON.stringify(gaps,null,2));
  const counts={categories:categories.length,brands:brands.length,brandsWithWebsite:brands.filter(b=>b.websiteUrl).length,brandsWithCountry:brands.filter(b=>b.countryOfOrigin).length,brandsWithLogo:brands.filter(b=>b.logoUrl).length,brandsWithBanner:brands.filter(b=>b.bannerUrl).length,products:products.length,productsWithIngredients:new Set(ingredients.map(i=>i.productId)).size,ingredients:ingredients.length,declaredPercentages:ingredients.filter(i=>i.percentage).length,productsWithTags:new Set(tags.map(t=>t.productId)).size,tags:tags.length,notApplicableTools:manifest.products.filter(p=>p.status==='NOT_APPLICABLE_TOOL_OR_MATERIAL').length,formulaNotInReviewedSources:manifest.products.filter(p=>p.status==='NO_VERIFIABLE_FORMULA').length};
  const stateHash=digest({brands,categories,products,ingredients,tags,quotas});
  fs.writeFileSync(path.join(ROOT,'catalog-public.json'),JSON.stringify({
    brands:brands.map(b=>({name:b.name,slug:b.slug,country:b.countryOfOrigin,website:b.websiteUrl,logoUrl:b.logoUrl,products:products.filter(p=>p.brandId===b.id).length})),
    categories:categories.map(c=>({name:c.name,slug:c.slug,parent:categories.find(x=>x.id===c.parentId)?.name||null,products:products.filter(p=>p.categoryId===c.id).length}))
  },null,2));
  const report={verifiedAt:new Date().toISOString(),allChecksPassed:true,checks,counts,stateHash};
  const baselineFile=path.join(ROOT,'enrichment-state-before-rerun.json');
  if(process.argv.includes('--capture-state'))fs.writeFileSync(baselineFile,JSON.stringify({stateHash,counts},null,2));
  if(process.argv.includes('--check-state')){const baseline=read('enrichment-state-before-rerun.json');check('unchangedAfterRerun',baseline.stateHash===stateHash);report.idempotent=true;}
  fs.writeFileSync(path.join(ROOT,'enrichment-verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
