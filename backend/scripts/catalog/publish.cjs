// Run only after catalog:upload succeeds. Replaces local URLs, not catalog data.
const fs=require('node:fs');
const path=require('node:path');
const {PrismaClient}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../.catalog-data');
const p=new PrismaClient();
async function main(){
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'uploaded.json'),'utf8'));
  const rows=catalog.products.flatMap(x=>x.images.map(im=>({id:im.id,productId:x.id,url:manifest[im.sha256]?.url,localUrl:`http://localhost:4010/${im.localPath}`})));
  if(rows.some(x=>!x.url?.startsWith('https://')))throw new Error('Upload is incomplete');
  await p.$transaction(async tx=>{
    const changed=await tx.$executeRaw`UPDATE product_images AS i SET image_url=x.url
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(id uuid,url text)
      WHERE i.id=x.id`;
    if(changed!==rows.length)throw new Error('Some seeded images are missing; cloud publication rolled back');
    await tx.$executeRaw`UPDATE categories AS c SET image_url=x.url
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x("localUrl" text,url text)
      WHERE c.image_url=x."localUrl"`;
    // Product image mutations do not have an index trigger in the current schema.
    await tx.$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT x.id,1,0,now(),now() FROM jsonb_to_recordset(${JSON.stringify(catalog.products.map(x=>({id:x.id})))}::jsonb) AS x(id uuid)
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now()`;
  },{timeout:240000});
  console.log(`Published ${rows.length} cloud image URLs`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>p.$disconnect());
