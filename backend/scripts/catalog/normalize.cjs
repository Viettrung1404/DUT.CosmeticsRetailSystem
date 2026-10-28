const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sanitizeHtml = require('sanitize-html');
const {extractIngredients,extractTags,refineCategory}=require('../demo/enrichment.cjs');
const ROOT = path.resolve(__dirname, '../../.catalog-data');
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function id(value) {
  const h = crypto.createHash('sha256').update('glowup-catalog-v1:' + value).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
const plain = html => sanitizeHtml((html || '').replace(/<\/(?:p|li|h[1-6]|div)>|<br\s*\/?>/gi,' '), { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const BRAND_NAMES = ['THE FACE SHOP', 'La Roche-Posay', "Paula's Choice", 'Dear Dahlia', 'Banila Co', 'Dr.Belmeur', 'Dr. Belmeur', 'Dr.G', 'Dr.FORHAIR', 'Dr. FORHAIR', 'Mise En Scene', 'Head & Shoulders', 'Some By Mi', 'Round Lab', 'Beauty of Joseon', 'The Ordinary', 'The Inkey List', 'Skin1004', 'Bioderma', 'CeraVe', 'Cetaphil', 'Eucerin', 'Vichy', 'Avène', 'Avene', 'Cocoon', 'Goodal', 'Clio', 'Peripera', 'Amuse', 'Dermatory', 'Klavuu', 'Cosrx', 'AHC', 'CNP', 'Anessa', 'Elixir', 'Shiseido', 'Hada Labo', 'Senka', 'Dove', 'Tsubaki', 'Kundal', 'Diane', 'Yves Rocher', 'Tresemme', 'L’Oréal', "L'Oreal", 'Maybelline', 'Revlon', 'Romand', 'Rom&nd', '3CE', 'Lemonade', 'Ofélia', 'Ofelia', 'Merzy', 'Black Rouge', 'Innisfree', 'Laneige', 'Mamonde', 'Missha', 'Aestura', 'Beyond', 'Freshian', 'Glint', 'Obagi', 'OHUI', 'O HUI', 'Payot', 'Skinfood', 'SU:M37', 'Whoo', 'Vacosi', 'Real Techniques', 'Fillimilli', 'Glxy', 'Silcot', 'B.O.M', 'Torriden', 'Klairs', 'Neogen', 'Nivea', 'Vaseline', 'Sunsilk', 'Selsun', 'SNP', 'JMsolution', 'Mediheal', 'BNBG', 'Naruko', 'DHC', 'Rohto', 'Sunplay', 'Biore', 'Bioré', 'Lululun', 'Fino', 'Unove', 'Daleaf', 'Kissme', 'Kiss Me', 'Garnier', 'Simple', 'Acnes', 'SVR', 'Hatomugi', 'Maxclinic', 'Aromatica', 'Ryo', 'Reen', 'On The Body', 'Organist', 'Veilment', 'Cathy Doll', 'Judydoll', 'Too Cool For School', 'Etude', 'Espoir', 'Dasique', 'Wakemake', 'Dinto', 'Alltimate', 'Coringco', 'Piccasso', 'FOCALLURE'];
function brandFor(name) {
  const text = slug(name);
  const match = BRAND_NAMES.sort((a,b) => b.length-a.length).find(b => (`-${text}-`).includes(`-${slug(b)}-`));
  if (!match) return null;
  const canonical = ({ 'avene':'Avène', 'ofelia':'Ofélia', 'dr-belmeur':'Dr.Belmeur', 'o-hui':'OHUI', 'rom-nd':'Romand', 'biore':'Bioré', 'bom':'B.O.M' })[slug(match)] || match;
  return { id: id('brand:' + slug(canonical)), name: canonical, slug: slug(canonical) };
}
BRAND_NAMES.push('Moremo', "Tesori D'Oriente", 'Foellie', 'Rosette', 'Huxley', 'Dewytree', 'Beplain', 'Abib', 'Mixsoon', 'Celimax', 'Anua', 'Axis-Y', 'd’Alba', "d'Alba", 'D Program', 'D-program');
BRAND_NAMES.push("Momo's Workshop", 'Jomi', 'Laboratorios BABE', 'BABE', 'Muji', 'Lilybyred', 'Bbia', 'Hince', 'Unleashia', 'Kiss New York', 'Too Cool', 'Batiste', 'Milaganics', 'Pony Effect', 'Nard', 'Aprilskin', 'Wonjin', 'Dr.Ceuracle', 'Iunik', 'Isntree');
BRAND_NAMES.push('numbuzin', 'Le Petit Marseillais', 'Belif');
BRAND_NAMES.push('Bom', 'K-Palette', 'Weilaiya');
BRAND_NAMES.push('Ekseption', 'Sugarplum');
BRAND_NAMES.push('Malissa Kiss', 'Colab');
BRAND_NAMES.push('Rejuran', 'Carslan', 'Colorkey', 'Cocayhoala', 'VT');
BRAND_NAMES.push('Neutrogena', 'Naris', 'FMGT', 'Murad', 'Byphasse', 'MAC', 'Browit', 'Olaplex', 'Dcash', 'Colorescience', 'Asepso', 'Johnson’s', '&honey', 'ZA', 'Gota', 'Nara');
BRAND_NAMES.push('Nuxe', 'Nature Republic', 'BIAIfekt', 'M.O.I', 'Shu Uemura', 'Frudia', 'ADOLPH', 'Kosé', 'Mude', 'Ollin', 'Christophe Robin', 'B.By Banila', 'Dr.Jart+', 'Lipit');
function normalize(rows, target = 350) {
  const groups = new Map(), warnings = [], barcodeOwners = new Map();
  const brandsBySourceId = new Map();
  for (const row of rows) {
    const name = row.product.detail.find(d=>d.langCode==='vi')?.name || '';
    const brand = brandFor(name);
    for (const sourceId of row.sourceBrandIds || []) {
      if (!brand) continue;
      const choices = brandsBySourceId.get(sourceId) || new Map();
      choices.set(brand.slug,brand);brandsBySourceId.set(sourceId,choices);
    }
  }
  for (const row of rows) {
    const p = row.product;
    const detail = p.detail.find(d => d.langCode === 'vi' && d.name);
    if (!detail || !row.images.length) continue;
    const mapped = (row.sourceBrandIds || []).flatMap(k=>{
      const choices=brandsBySourceId.get(k);return choices?.size===1?[...choices.values()]:[];
    });
    const brand = brandFor(detail.name) || (mapped.length===1 ? mapped[0] : null);
    if (!brand) { warnings.push({ sourceId:p.id, reason:'Unknown brand', name:detail.name }); continue; }
    // Merge identical titles differing only in volume; do not fuzzy-merge formulations.
    const familyName = detail.name.replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|gr|g|lit|l)\b/gi, '').replace(/\(\s*\)/g,'').replace(/\s+/g,' ').trim();
    const family = brand.slug + ':' + row.category.slug + ':' + slug(familyName);
    let out = groups.get(family);
    if (!out) {
      const productId = id('product:' + family);
      out = { id:productId, sku:'GU-' + p.id, slug:slug(familyName).slice(0,220) + '-' + p.id,
        name:familyName.slice(0,255), brand, category:row.category,
        description:sanitizeHtml(detail.htmlDescription || '', {allowedTags:['p','br','ul','ol','li','h2','h3','strong','em'],allowedAttributes:{}}),
        shortDescription:plain(detail.htmlDescription).slice(0,300), sources:[], variants:[], images:[], ingredients:[], tags:[] };
      groups.set(family,out);
    }
    out.sources.push(row.source);
    const attrs = new Map((p.attributeValues || []).map(a=>[String(a.id),a]));
    for (const v of p.variants || []) {
      if (!v.isActive || !(Number(v.price) > 0)) continue;
      const values = (v.listAttributeValueIds || []).map(k=>attrs.get(String(k))?.value).filter(x=>x && !/^default title$/i.test(x));
      const fallbackVolume = detail.name.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|gr|g|lit)\b/i)?.[0];
      const option = [...new Set(values)].join(' / ') || fallbackVolume || 'Tiêu chuẩn';
      if (option.length > 100) {warnings.push({sourceId:p.id,variantId:v.id,reason:'Option exceeds 100 chars'});continue;}
      if (out.variants.some(x=>x.option1Value===option)) {
        warnings.push({sourceId:p.id,variantId:v.id,reason:'Duplicate option merged',option}); continue;
      }
      const barcode = /^\d{8,14}$/.test((v.barCode || '').trim()) ? v.barCode.trim() : null;
      const variant = {id:id('variant:'+v.id),sku:'GU-V-'+v.id,option1Value:option,price:Number(v.price),
        // Explicit demo-only estimate; never presented as supplier-sourced cost.
        costPrice:Math.round(Number(v.price)*0.65/1000)*1000,unit:'cái',barcode:barcode && !barcodeOwners.has(barcode) ? barcode : null};
      if (variant.barcode) barcodeOwners.set(variant.barcode,variant.id);
      out.variants.push(variant);
    }
    for (const im of row.images) {
      if (!out.images.some(x=>x.sha256===im.sha256)) out.images.push({...im,id:id('image:'+out.id+':'+im.sha256),
        variantId:im.sourceVariantIds?.length===1 && out.variants.some(v=>v.id===id('variant:'+im.sourceVariantIds[0])) ? id('variant:'+im.sourceVariantIds[0]) : null});
    }
    for(const row of extractIngredients(detail.htmlDescription||'')){
      const {ingredientName,percentage,isKeyIngredient}=row;
      const existing=out.ingredients.find(x=>x.ingredientName===ingredientName);
      if(!existing)out.ingredients.push({id:id('ingredient:'+out.id+':'+ingredientName),ingredientName,percentage,isKeyIngredient});
      else if(existing.percentage!==percentage)existing.percentage=null;
    }
  }
  // Prefer complete galleries when choosing the final 350 from the reserve pool.
  const products = [...groups.values()].filter(p=>p.variants.length && p.images.length)
    .sort((a,b)=>Number(b.images.length>1)-Number(a.images.length>1)).slice(0,target);
  for(const product of products){
    product.images=product.images.slice(0,5);
    // Refine display categories after assigning stable source-based family IDs.
    product.category=refineCategory(product);
    if(product.category.parent==='phu-kien')product.ingredients=[];
    product.tags=extractTags(product);
  }
  return {schemaVersion:1,createdAt:new Date().toISOString(),costPricePolicy:'DEMO: 65% of source retail price, rounded to VND 1000',products,warnings};
}
function main() {
  const curationPath=path.join(ROOT,'curation.json');
  const curation=fs.existsSync(curationPath)?JSON.parse(fs.readFileSync(curationPath,'utf8')):{};
  const rows=JSON.parse(fs.readFileSync(path.join(ROOT,'collected.json'),'utf8'))
    .filter(row=>!(curation.excludedSourceIds || []).includes(row.product.id));
  for(const row of rows){
    const primary=curation.primaryImages?.[row.product.id];
    if(primary){
      const photo=row.images.find(im=>im.sha256===primary);
      if(!photo)throw new Error('Curated primary image missing for '+row.product.id);
      row.images=[photo,...row.images.filter(im=>im.sha256!==primary)];
    }
  }
  const brandIds=new Set();
  for(const file of fs.readdirSync(path.join(ROOT,'raw')).filter(f=>f.startsWith('listing-')&&f.endsWith('.json'))){
    for(const listing of JSON.parse(fs.readFileSync(path.join(ROOT,'raw',file),'utf8'))){
      for(const collection of listing.collections || [])if(collection.id==='1')for(const brand of collection.subCollections || [])brandIds.add(brand.id);
    }
  }
  for(const row of rows)row.sourceBrandIds=(row.product.collections || []).filter(k=>brandIds.has(k));
  const data = normalize(rows);
  fs.writeFileSync(path.join(ROOT,'catalog.json'),JSON.stringify(data,null,2));
  const summary={products:data.products.length,variants:data.products.reduce((n,p)=>n+p.variants.length,0),brands:new Set(data.products.map(p=>p.brand.slug)).size,images:data.products.reduce((n,p)=>n+p.images.length,0),imageDistribution:data.products.reduce((counts,p)=>(counts[p.images.length]=(counts[p.images.length]||0)+1,counts),{}),variantsWithImages:new Set(data.products.flatMap(p=>p.images.map(i=>i.variantId).filter(Boolean))).size,warnings:data.warnings};
  fs.writeFileSync(path.join(ROOT,'normalization-report.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({...summary,warnings:summary.warnings.length}));
}
if (require.main===module) main();
module.exports={normalize,id,slug};
