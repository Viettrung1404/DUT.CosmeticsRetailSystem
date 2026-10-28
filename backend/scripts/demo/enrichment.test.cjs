const {test}=require('node:test');
const assert=require('node:assert/strict');
const {extractIngredients,extractTags,extractOrigin}=require('./enrichment.cjs');

test('reads ingredient bullets and only binds a concentration to its named ingredient',()=>{
  const rows=extractIngredients('<h2>Thành phần chính</h2><p>- 12% Nước cây bách giúp làm dịu da</p><p>Niacinamide: dưỡng sáng</p><h2>Hướng dẫn sử dụng</h2><p>Thoa 2% lượng sản phẩm.</p>');
  assert.ok(rows.some(i=>i.ingredientName==='Nước cây bách'&&i.percentage==='12%'));
  assert.ok(rows.some(i=>i.ingredientName==='Niacinamide'&&i.percentage===null));
  assert.ok(rows.every(i=>!i.ingredientName.includes('Thoa')));
});
test('reads explicit inline lists and does not invent INCI from benefits',()=>{
  const rows=extractIngredients('<p><em>Thành phần chính: Glycerin, Salicylic acid, Betaine &amp; Panthenol</em></p><p>Hiệu quả sau khi sử dụng: da mịn màng.</p>');
  assert.deepEqual(rows.map(i=>i.ingredientName),['Glycerin','Salicylic acid','Betaine','Panthenol']);
  assert.equal(extractIngredients('<p>Dưỡng ẩm lâu dài, trắng sáng sau 7 ngày.</p>').length,0);
});
test('retains INCI parentheses and does not convert ppm without evidence',()=>{
  const rows=extractIngredients('<h2>Ingredients</h2><p>Water (Aqua), Glycerin, Centella Asiatica Extract (10,000 ppm), Sodium Hyaluronate.</p><h2>How to use</h2><p>Apply daily.</p>');
  assert.equal(rows.length,4);
  assert.ok(rows.some(i=>i.ingredientName==='Centella Asiatica Extract'&&i.percentage===null));
});
test('tags respect explicit exclusion, and category alone does not imply skin suitability',()=>{
  const tags=extractTags({name:'Serum dưỡng ẩm',description:'<p>Không phù hợp với da nhạy cảm. Phù hợp với da dầu.</p>',category:{name:'Serum và tinh chất'}});
  assert.ok(tags.includes('da dầu'));
  assert.ok(!tags.includes('da nhạy cảm'));
  assert.ok(tags.includes('dưỡng ẩm'));
});
test('origin requires an explicit brand-origin phrase and ignores retailer footer',()=>{
  assert.equal(extractOrigin('Cocoon là thương hiệu mỹ phẩm thuần chay Việt Nam được thành lập năm 2014.'),'Việt Nam');
  assert.equal(extractOrigin('Beauty Box là nhà phân phối hơn 50 thương hiệu Hàn Quốc tại Việt Nam.'),null);
});
test('percent marketing claims are not ingredients and conflicting concentrations remain unknown',()=>{
  const rows=extractIngredients('<h2>Thành phần chính</h2><p>100% thuần chay, không thử nghiệm trên động vật</p><p>80% Collagen thủy phân: dưỡng ẩm.</p><p>70% Collagen thủy phân: dưỡng ẩm.</p>');
  assert.equal(rows.length,1);
  assert.equal(rows[0].ingredientName,'Collagen thủy phân');
  assert.equal(rows[0].percentage,null);
  assert.equal(rows[0].percentageConflict,true);
});
test('does not mistake skin-use headings or biological effects for formula ingredients',()=>{
  const rows=extractIngredients('<h2>Thành phần chính</h2><p>Retinol: kích thích sản xuất collagen.</p><p>Làn da sử dụng: da dầu.</p><p>Hướng dẫn sử dụng: thoa lên da.</p>');
  assert.deepEqual(rows.map(i=>i.ingredientName),['Retinol']);
});
test('preserves numeric commas within INCI chemical names',()=>{
  const rows=extractIngredients('<h2>Ingredients</h2><p>Water, 1,2-Hexanediol, Glycerin.</p>');
  assert.deepEqual(rows.map(i=>i.ingredientName),['Water','1,2-Hexanediol','Glycerin']);
});
