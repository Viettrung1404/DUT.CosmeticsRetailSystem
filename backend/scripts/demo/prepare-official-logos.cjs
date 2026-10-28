const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('../../../frontend/node_modules/sharp');
const {chromium}=require('../../../frontend/node_modules/playwright');
const ROOT=path.resolve(__dirname,'../../.demo-data');
async function main(){
  const rows=JSON.parse(fs.readFileSync(path.join(ROOT,'official-brands.json'),'utf8'));
  const candidates=[];
  for(const row of rows){
    const candidate=row.logoCandidate;
    if(!candidate||/beiersdorf|fnco|Apple_Pay|cafe24\.svg/i.test(candidate.sourceImageUrl))continue;
    try{
      const input=path.join(ROOT,candidate.rawPath),metadata=await sharp(input).metadata();
      if(metadata.format!=='svg'&&(metadata.width<120||metadata.height<12))continue;
      const localPath=`images/official-${row.slug}-logo.webp`;
      const raster=await sharp(input,{density:160}).resize({width:600,height:180,fit:'inside',withoutEnlargement:metadata.format!=='svg'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let visible=0,light=0;
      for(let i=0;i<raster.data.length;i+=4)if(raster.data[i+3]>128){visible++;if(Math.min(raster.data[i],raster.data[i+1],raster.data[i+2])>225)light++;}
      if(!visible)continue;
      const contrast=metadata.hasAlpha&&light/visible>.6;
      let output=sharp(raster.data,{raw:raster.info});
      if(contrast)output=output.flatten({background:'#292929'});
      await output.webp({quality:95}).toFile(path.join(ROOT,localPath));
      const body=fs.readFileSync(path.join(ROOT,localPath));
      candidates.push({slug:row.slug,sourceUrl:row.sourceUrl,sourceImageUrl:candidate.sourceImageUrl,localPath,sha256:crypto.createHash('sha256').update(body).digest('hex'),contentType:'image/webp',...(contrast&&{backgroundAddedForContrast:'#292929'})});
    }catch(e){console.log('Skipped '+row.slug+': '+e.message.slice(0,100));}
  }
  fs.writeFileSync(path.join(ROOT,'official-logo-candidates.json'),JSON.stringify(candidates,null,2));
  const html='<html><meta charset="utf-8"><style>body{font:16px Arial;background:#eee}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{background:#fff;padding:12px}.box{height:80px;display:flex;align-items:center;justify-content:center}.dark{background:#333}img{max-width:230px;max-height:65px}</style><div class="grid">'+candidates.map((r,i)=>`<div class="card"><b>${i+1}. ${r.slug}</b><div class="box"><img src="data:image/webp;base64,${fs.readFileSync(path.join(ROOT,r.localPath)).toString('base64')}"></div><div class="box dark"><img src="data:image/webp;base64,${fs.readFileSync(path.join(ROOT,r.localPath)).toString('base64')}"></div></div>`).join('')+'</div></html>';
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage({viewport:{width:1160,height:900},deviceScaleFactor:1});await page.setContent(html);await page.screenshot({path:path.join(ROOT,'official-logo-review.png'),fullPage:true});}finally{await browser.close();}
  console.log('Logo candidates ready for visual review: '+candidates.length);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
