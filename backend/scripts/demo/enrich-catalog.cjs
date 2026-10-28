const fs=require('node:fs');
const path=require('node:path');
const {PrismaClient}=require('@prisma/client');
const {id}=require('../catalog/normalize.cjs');
const {extractIngredients,extractTags,extractOrigin,refineCategory,clean}=require('./enrichment.cjs');
const ROOT=path.resolve(__dirname,'../../.demo-data');
const CATALOG=path.resolve(ROOT,'../.catalog-data/catalog.json');
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
const db=new PrismaClient();
async function main(){
  const catalog=JSON.parse(fs.readFileSync(CATALOG,'utf8'));
  const backup=path.join(ROOT,'catalog-before-enrichment.json');
  const original=fs.existsSync(backup)?JSON.parse(fs.readFileSync(backup,'utf8')):structuredClone(catalog);
  const official=read('official-brands.json');
  const origins=require('./reviewed-origins.json');
  const sources=[...read('official-ingredients.json'),...require('./reviewed-product-ingredients.json')];
  const uploaded=read('assets-uploaded.json');
  const approved=require('./logo-review.json').approvedAssets;
  const logos=read('official-logo-candidates.json').filter(r=>approved[r.slug]===r.sha256);
  const productRows=[];
  for(const product of catalog.products){
    const category=refineCategory(product);
    const merged=new Map();
    const ingredientSources=[{sourceUrl:product.sources[0].url,ingredientHtml:product.description,scope:'RETAILER_KEY_INGREDIENTS'},...sources.filter(s=>s.productId===product.id&&clean(s.ingredientHtml).length>10).map(s=>({...s,ingredientHtml:s.ingredientHtml.includes('<h2>')?s.ingredientHtml:'<h2>Ingredients</h2>'+s.ingredientHtml}))];
    if(category.parent!=='phu-kien')for(const source of ingredientSources){
      for(const row of extractIngredients(source.ingredientHtml)){
        const key=row.ingredientName.toLowerCase();
        const previous=merged.get(key);
        const evidence={...row,sourceUrl:source.sourceUrl,scope:source.scope};
        if(!previous)merged.set(key,evidence);
        else if(row.percentageConflict||previous.percentage&&row.percentage&&previous.percentage!==row.percentage){previous.percentage=null;previous.percentageConflict=true;}
        else if(row.percentage&&!previous.percentage&&!previous.percentageConflict){previous.percentage=row.percentage;previous.concentrationEvidence=row.concentrationEvidence;previous.concentrationSourceUrl=source.sourceUrl;}
      }
    }
    const ingredients=[...merged.values()].map(row=>({id:id('ingredient:'+product.id+':'+row.ingredientName),...row}));
    const tags=extractTags({...product,category});
    productRows.push({productId:product.id,name:product.name,category,ingredients,tags,status:category.parent==='phu-kien'?'NOT_APPLICABLE_TOOL_OR_MATERIAL':ingredients.length?'SOURCED_INGREDIENTS':'NO_VERIFIABLE_FORMULA',sourceUrls:ingredientSources.map(s=>s.sourceUrl)});
    product.category=category;
    product.ingredients=ingredients.map(({id,ingredientName,percentage,isKeyIngredient})=>({id,ingredientName,percentage,isKeyIngredient}));
    product.tags=tags;
  }
  const brands=[...new Map(catalog.products.map(p=>[p.brand.slug,p.brand])).values()];
  const brandRows=brands.map(brand=>{
    const page=official.find(r=>r.slug===brand.slug);
    const local=path.join(ROOT,'brand-raw',brand.slug+'.json');
    const collection=fs.existsSync(local)?JSON.parse(fs.readFileSync(local,'utf8')):null;
    const text=clean(collection?.detail?.find(d=>d.langCode==='vi')?.htmlDescription);
    const origin=origins[brand.slug]||{country:extractOrigin(text),sourceUrl:'https://beautybox.com.vn/collections/'+(brand.slug==='the-face-shop'?'thefaceshop':brand.slug),evidence:text.slice(0,650)};
    const confirmed=page?.status==='FETCHED_REQUIRES_REVIEW'&&page.title?.trim()&&!/maintenance|メンテナンス|^k-palette\.net$/i.test(page.title.trim())&&page.finalUrl?.startsWith('https://');
    const websiteUrl=confirmed?page.finalUrl:null;
    const logo=logos.find(r=>r.slug===brand.slug);
    if(logo&&!uploaded[logo.sha256])throw new Error('Approved logo has not been uploaded: '+brand.slug);
    const categoryNames=[...new Set(catalog.products.filter(p=>p.brand.slug===brand.slug).map(p=>p.category.name.toLowerCase()))].slice(0,3);
    return {...brand,websiteUrl,countryOfOrigin:origin.country,originSource:origin.country?origin:null,websiteStatus:confirmed?'OFFICIAL_SITE_REVIEWED':page?.status||'NO_CONFIRMED_OFFICIAL_SITE',websiteReason:page?.reason||null,logo:logo||null,description:`${brand.name}${origin.country?' là thương hiệu đến từ '+origin.country:'. Danh mục GlowUp giới thiệu các sản phẩm của thương hiệu này'}. Các nhóm sản phẩm trong danh mục: ${categoryNames.join(', ')}.`};
  });
  const manifest={schemaVersion:1,preparedAt:new Date().toISOString(),brands:brandRows,products:productRows};
  fs.writeFileSync(path.join(ROOT,'enrichment-manifest.json'),JSON.stringify(manifest,null,2));
  const summary={products:productRows.length,productsWithIngredients:productRows.filter(p=>p.ingredients.length).length,ingredientRows:productRows.flatMap(p=>p.ingredients).length,explicitPercentages:productRows.flatMap(p=>p.ingredients).filter(i=>i.percentage).length,percentageConflicts:productRows.flatMap(p=>p.ingredients).filter(i=>i.percentageConflict).length,toolsWithoutFormula:productRows.filter(p=>p.status==='NOT_APPLICABLE_TOOL_OR_MATERIAL').length,formulaUnavailable:productRows.filter(p=>p.status==='NO_VERIFIABLE_FORMULA').length,tagRows:productRows.flatMap(p=>p.tags).length,brandsWithReviewedWebsite:brandRows.filter(b=>b.websiteUrl).length,brandsWithSourcedOrigin:brandRows.filter(b=>b.countryOfOrigin).length,approvedLogos:logos.length};
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({dryRun:true,...summary}));return;}
  if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(original,null,2));
  const ids=productRows.map(p=>p.productId);
  const snapshotFile=path.join(ROOT,'enrichment-before.json');
  const [existingBrands,categories,dbProducts,dbIngredients,dbTags]=await Promise.all([
    db.brand.findMany({where:{slug:{in:brands.map(b=>b.slug)}}}),db.category.findMany(),db.product.findMany({where:{id:{in:ids}},select:{id:true,categoryId:true}}),db.productIngredient.findMany({where:{productId:{in:ids}}}),db.productTag.findMany({where:{productId:{in:ids}}})
  ]);
  if(dbProducts.length!==350)throw new Error('Expected the existing 350 imported products');
  if(!fs.existsSync(snapshotFile))fs.writeFileSync(snapshotFile,JSON.stringify({brands:existingBrands,categories,products:dbProducts,ingredients:dbIngredients,tags:dbTags},null,2));
  const changed={brands:0,categories:0,products:0,ingredientsCreated:0,ingredientsRemoved:0,percentagesUpdated:0,tagsCreated:0,tagsRemoved:0};
  await db.$transaction(async tx=>{
    for(const row of brandRows){
      const current=existingBrands.find(b=>b.slug===row.slug);if(!current)throw new Error('Missing existing brand '+row.slug);
      const data={};
      for(const key of ['websiteUrl','countryOfOrigin','description'])if(!current[key]&&row[key])data[key]=row[key];
      if(!current.logoUrl&&row.logo)data.logoUrl=uploaded[row.logo.sha256].url;
      if(!current.metaTitle)data.metaTitle=row.name+' | GlowUp';
      if(!current.metaDescription)data.metaDescription=row.description.slice(0,160);
      if(Object.keys(data).length){const done=await tx.brand.updateMany({where:{id:current.id,updatedAt:current.updatedAt},data});if(done.count!==1)throw new Error('Brand edited concurrently; retry '+row.slug);changed.brands++;}
    }
    const categoryMap=new Map(categories.map(c=>[c.slug,c]));
    for(const [index,row] of [...new Map(productRows.map(p=>[p.category.slug,p.category])).values()].entries()){
      let current=categoryMap.get(row.slug);
      if(!current){current=await tx.category.create({data:{id:id('category:'+row.slug),slug:row.slug,name:row.name,parentId:categoryMap.get(row.parent).id,sortOrder:index}});categoryMap.set(row.slug,current);changed.categories++;}
    }
    for(const [index,current] of [...categoryMap.values()].entries()){
      if(!productRows.some(p=>p.category.slug===current.slug||p.category.parent===current.slug))continue;
      const childSlugs=[...categoryMap.values()].filter(c=>c.parentId===current.id).map(c=>c.slug);
      const representative=productRows.find(p=>p.category.slug===current.slug||childSlugs.includes(p.category.slug));
      const product=catalog.products.find(p=>p.id===representative?.productId);
      const images=JSON.parse(fs.readFileSync(path.resolve(ROOT,'../.catalog-data/uploaded.json'),'utf8'));
      const data={};
      if(!current.description)data.description=`Khám phá các sản phẩm ${current.name.toLowerCase()} trong danh mục GlowUp.`;
      if(!current.metaTitle)data.metaTitle=current.name+' | GlowUp';
      if(!current.metaDescription)data.metaDescription=`Khám phá ${current.name.toLowerCase()} tại GlowUp: thông tin sản phẩm, biến thể và hình ảnh để lựa chọn phù hợp.`;
      if(!current.imageUrl&&product)data.imageUrl=images[product.images[0].sha256].url;
      if(current.sortOrder===0)data.sortOrder=index+1;
      if(Object.keys(data).length){await tx.category.update({where:{id:current.id},data});changed.categories++;}
    }
    for(const row of productRows){const current=dbProducts.find(p=>p.id===row.productId);const categoryId=categoryMap.get(row.category.slug).id;if(current.categoryId!==categoryId){await tx.product.updateMany({where:{id:row.productId,categoryId:current.categoryId},data:{categoryId}});changed.products++;}}
    const desired=productRows.flatMap(p=>p.ingredients.map(i=>({id:i.id,productId:p.productId,ingredientName:i.ingredientName,percentage:i.percentage,isKeyIngredient:i.isKeyIngredient})));
    const desiredIds=new Set(desired.map(i=>i.id));
    const ownedIds=original.products.flatMap(p=>p.ingredients.map(i=>i.id));
    const obsolete=ownedIds.filter(i=>!desiredIds.has(i));
    changed.ingredientsRemoved=(await tx.productIngredient.deleteMany({where:{id:{in:obsolete}}})).count;
    changed.ingredientsCreated=(await tx.productIngredient.createMany({data:desired,skipDuplicates:true})).count;
    for(const row of desired){const current=dbIngredients.find(i=>i.id===row.id);if(current&&current.percentage===null&&row.percentage){await tx.productIngredient.update({where:{id:row.id},data:{percentage:row.percentage}});changed.percentagesUpdated++;}}
    const tags=productRows.flatMap(p=>p.tags.map(tagName=>({productId:p.productId,tagName})));
    const stale=original.products.flatMap(p=>p.tags.filter(t=>!productRows.find(x=>x.productId===p.id).tags.includes(t)).map(tagName=>({productId:p.id,tagName})));
    if(stale.length)changed.tagsRemoved=(await tx.productTag.deleteMany({where:{OR:stale}})).count;
    changed.tagsCreated=(await tx.productTag.createMany({data:tags,skipDuplicates:true})).count;
    if(Object.values(changed).some(n=>n>0))await tx.$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT id,1,0,now(),now() FROM products WHERE id=ANY(${ids}::uuid[])
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now()`;
  },{timeout:240000,maxWait:15000});
  fs.writeFileSync(CATALOG+'.tmp',JSON.stringify(catalog,null,2));fs.renameSync(CATALOG+'.tmp',CATALOG);
  fs.writeFileSync(path.join(ROOT,'enrichment-report.json'),JSON.stringify({...summary,changed,completedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({...summary,changed}));
}
main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
