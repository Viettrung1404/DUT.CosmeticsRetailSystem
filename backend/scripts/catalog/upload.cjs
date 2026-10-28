const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const ROOT = path.resolve(__dirname,'../../.catalog-data');
async function main() {
  const required=['STORAGE_ENDPOINT','STORAGE_BUCKET','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_PUBLIC_URL'];
  if (!required.every(k=>process.env[k])) throw new Error('Missing STORAGE_* configuration; local images are preserved.');
  const client=new S3Client({endpoint:process.env.STORAGE_ENDPOINT,region:process.env.STORAGE_REGION || 'ap-southeast-1',forcePathStyle:true,credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.STORAGE_SECRET_ACCESS_KEY}});
  const manifestPath=path.join(ROOT,'uploaded.json');
  const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
  const images=[...new Map(catalog.products.flatMap(p=>p.images).map(i=>[i.sha256,i])).values()];
  const base=process.env.STORAGE_PUBLIC_URL.replace(/\/+$/,'');
  let uploaded=0;
  for(const im of images) {
    const key=`catalog/beautybox/${im.sha256}.webp`;
    const url=`${base}/${key}`;
    if(manifest[im.sha256]?.url===url) continue;
    const file=path.resolve(ROOT,im.localPath);
    if(!file.startsWith(ROOT+path.sep)) throw new Error('Invalid image path');
    const body=fs.readFileSync(file);
    if(crypto.createHash('sha256').update(body).digest('hex')!==im.sha256) throw new Error('Image checksum mismatch');
    await client.send(new PutObjectCommand({Bucket:process.env.STORAGE_BUCKET,Key:key,Body:body,ContentType:'image/webp',CacheControl:'public, max-age=31536000, immutable'}));
    manifest[im.sha256]={key,url,localPath:im.localPath,uploadedAt:new Date().toISOString()};
    fs.writeFileSync(manifestPath+'.tmp',JSON.stringify(manifest,null,2));
    fs.renameSync(manifestPath+'.tmp',manifestPath);
    if(++uploaded%25===0) console.log(`Uploaded ${uploaded} new images`);
  }
  console.log(`Upload complete: ${images.length} required images; ${uploaded} newly uploaded`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
