const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize}=require('./normalize.cjs');
function row(pid,vid,volume){return {source:{externalId:pid},category:{slug:'sua-rua-mat',name:'Sữa rửa mặt',parent:'cham-soc-da'},images:[{sha256:'abc',localPath:'images/a.webp'}],product:{id:pid,detail:[{langCode:'vi',name:`Sữa rửa mặt Cocoon ${volume}`,htmlDescription:'<p>Sạch da</p><script>steal()</script><iframe src="x"></iframe>'}],attributeValues:[{id:'size',value:volume}],variants:[{id:vid,isActive:true,price:'100000',listAttributeValueIds:['size'],barCode:'1234567890123'}]}};}
test('merges volume variants and strips active HTML; preserves stable identity',()=>{
  const a=normalize([row('1','11','100ml'),row('2','22','200ml')]);
  assert.equal(a.products.length,1);assert.equal(a.products[0].variants.length,2);
  assert.equal(a.products[0].description,'<p>Sạch da</p>');
  assert.equal(a.products[0].variants[1].barcode,null);
  assert.equal(a.products[0].id,normalize([row('1','11','100ml')]).products[0].id);
});
test('duplicate source options do not create duplicate variants',()=>{
  const d=normalize([row('1','11','100ml'),row('1','11','100ml')]);
  assert.equal(d.products[0].variants.length,1);assert.equal(d.products[0].images.length,1);
});
test('unknown brands are quarantined instead of invented',()=>{
  const r=row('1','11','100ml');r.product.detail[0].name='Unknown product';
  assert.equal(normalize([r]).products.length,0);
});
test('gallery preserves distinct photos and links a source variant unambiguously',()=>{
  const r=row('1','11','100ml');
  r.images=[{sha256:'first',localPath:'images/first.webp',sourceVariantIds:['11']},{sha256:'second',localPath:'images/second.webp',sourceVariantIds:[]}];
  const p=normalize([r]).products[0];
  assert.equal(p.images.length,2);
  assert.equal(p.images[0].variantId,p.variants[0].id);
  assert.equal(p.images[1].variantId,null);
});
test('final selection prefers products with a real gallery over single-photo reserves',()=>{
  const single=row('1','11','100ml');
  const gallery=row('2','22','200ml');gallery.product.detail[0].name='Serum Cocoon 200ml';
  gallery.images.push({sha256:'second',localPath:'images/second.webp'});
  assert.equal(normalize([single,gallery],1).products[0].sources[0].externalId,'2');
});
