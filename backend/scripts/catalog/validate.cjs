const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const ROOT=path.resolve(__dirname,'../../.catalog-data');
async function main(){
  const {products}=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
  const seen=new Map();
  const unique=(type,value)=>{const key=type+':'+value;if(seen.has(key))throw new Error('Duplicate '+key);seen.set(key,true);};
  if(products.length<350 && !process.argv.includes('--preview')) throw new Error('Need at least 350 distinct products');
  for(const p of products){
    unique('product-id',p.id);unique('product-sku',p.sku);unique('slug',p.slug);
    if(!p.name || !p.brand || !p.category || !p.variants.length || !p.images.length)throw new Error('Incomplete '+p.sku);
    if(/<\/?(?:script|iframe|style)|onerror=|onclick=/i.test(p.description))throw new Error('Unsafe description');
    for(const v of p.variants){
      unique('variant-id',v.id);unique('variant-sku',v.sku);unique('option',p.id+':'+v.option1Value);
      if(v.barcode)unique('barcode',v.barcode);
      if(!Number.isFinite(v.price)||v.price<=0||v.costPrice<0||v.costPrice>v.price)throw new Error('Invalid price '+v.sku);
    }
    for(const [index,im] of p.images.entries()){
      if(im.variantId && !p.variants.some(v=>v.id===im.variantId))throw new Error('Image references a variant from another product');
      const file=path.resolve(ROOT,im.localPath);
      if(!file.startsWith(ROOT+path.sep))throw new Error('Path outside data directory');
      const body=fs.readFileSync(file);
      if(crypto.createHash('sha256').update(body).digest('hex')!==im.sha256)throw new Error('Checksum mismatch');
      const meta=await sharp(body).metadata();
      if(Math.min(meta.width,meta.height)<(index===0?800:700))throw new Error('Image too small');
    }
  }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards=products.map(p=>`<article>
    <img loading="lazy" src="${escape(p.images[0].localPath)}" alt="${escape(p.name)}">
    <p>${escape(p.name)}</p>
    <small>${escape(p.brand.name)} · ${p.variants.length} biến thể · ${p.images.length} ảnh</small>
    <details><summary>Xem bộ ảnh</summary>${p.images.map(im=>`<a href="${escape(im.localPath)}"><img loading="lazy" src="${escape(im.localPath)}" alt="${escape(p.name)}"></a>`).join('')}</details>
    <a href="${escape(p.sources[0].url)}">Nguồn ảnh và thông tin</a></article>`).join('');
  fs.writeFileSync(path.join(ROOT,'gallery.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><title>GlowUp catalog review</title>
    <style>body{font:15px system-ui;background:#f9ecee;color:#412e27;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}article{background:white;padding:16px;border-radius:12px;border:1px solid #e5cdd3}img{width:100%;aspect-ratio:1;object-fit:contain}small{color:#705b55}h1{font-size:26px;color:#c85a70}p{min-height:60px}a,summary{color:#9d394f;font-size:12px}summary{cursor:pointer;margin:12px 0}details img{width:65px;margin:3px}</style>
    <a href="/demo" style="font-size:16px">Xem danh mục, thương hiệu và dữ liệu demo →</a>
    <h1>GlowUp — ${products.length} sản phẩm</h1><main>${cards}</main></html>`);
  console.log(`Validated ${products.length} products, unique SKUs/options/barcodes, sanitized HTML and image checksums/resolution. Gallery generated.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
