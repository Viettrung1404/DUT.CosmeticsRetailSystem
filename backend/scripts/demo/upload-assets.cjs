const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
const ROOT=path.resolve(__dirname,'../../.demo-data');
async function main(){
  const required=['STORAGE_ENDPOINT','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_BUCKET','STORAGE_PUBLIC_URL'];
  if(!required.every(k=>process.env[k]))throw new Error('Missing STORAGE_* configuration');
  const brands=JSON.parse(fs.readFileSync(path.join(ROOT,'brands.json'),'utf8'));
  const banners=JSON.parse(fs.readFileSync(path.join(ROOT,'banners.json'),'utf8'));
  const officialPath=path.join(ROOT,'official-logo-candidates.json');
  const approvals=require('./logo-review.json').approvedAssets;
  const official=fs.existsSync(officialPath)?JSON.parse(fs.readFileSync(officialPath,'utf8')).filter(r=>approvals[r.slug]===r.sha256):[];
  const assets=[...brands.flatMap(b=>[b.logo,b.banner].filter(Boolean)),...banners,...official];
  const manifestPath=path.join(ROOT,'assets-uploaded.json');
  const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
  const client=new S3Client({endpoint:process.env.STORAGE_ENDPOINT,region:process.env.STORAGE_REGION||'auto',forcePathStyle:true,credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.STORAGE_SECRET_ACCESS_KEY}});
  for(const asset of assets){
    const ext=asset.contentType==='image/png'?'png':'webp';
    const key=`demo/glowup/${asset.sha256}.${ext}`;
    const url=process.env.STORAGE_PUBLIC_URL.replace(/\/+$/,'')+'/'+key;
    if(manifest[asset.sha256]?.url===url)continue;
    const file=path.resolve(ROOT,asset.localPath);
    if(!file.startsWith(ROOT+path.sep))throw new Error('Asset outside demo directory');
    const body=fs.readFileSync(file);
    if(crypto.createHash('sha256').update(body).digest('hex')!==asset.sha256)throw new Error('Asset checksum mismatch');
    await client.send(new PutObjectCommand({Bucket:process.env.STORAGE_BUCKET,Key:key,Body:body,ContentType:asset.contentType,CacheControl:'public,max-age=31536000,immutable'}));
    manifest[asset.sha256]={key,url,localPath:asset.localPath};
    fs.writeFileSync(manifestPath+'.tmp',JSON.stringify(manifest,null,2));fs.renameSync(manifestPath+'.tmp',manifestPath);
  }
  console.log(`Cloud assets ready: ${assets.length} brand and GlowUp content assets.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
