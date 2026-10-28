const {test}=require('node:test');
const assert=require('node:assert/strict');
require('ts-node').register({transpileOnly:true});
const {validReward,validReturnPolicy}=require('../../src/modules/customer-commerce/domain/policy.ts');
const {publicHtml}=require('../../src/modules/customer-experience/domain/public-content.ts');
const {SETTINGS,PAGES,FAQS,BLOGS,BLOG_CATEGORIES}=require('./fixtures.cjs');
test('seed settings satisfy actual service policy validators',()=>{
  const settings=Object.fromEntries(SETTINGS.map(s=>[s.key,s.value]));
  assert.equal(validReturnPolicy(settings.return_policy),true);
  assert.equal(settings.loyalty_rewards.rewards.every(validReward),true);
  assert.ok(Number.isSafeInteger(settings.loyalty_config.point_value_vnd)&&settings.loyalty_config.point_value_vnd>0);
  assert.ok(settings.loyalty_config.point_rate>0&&settings.loyalty_config.point_rate<=1);
});
test('public seed content survives production HTML sanitizer without active content',()=>{
  for(const content of [...PAGES.map(x=>x.content),...FAQS.map(x=>x.answer),...BLOGS.map(x=>x.content)]){
    const sanitized=publicHtml(content);
    assert.ok(sanitized.length>20);
    assert.doesNotMatch(sanitized,/<(?:script|iframe|style)|onerror=|onclick=/i);
  }
});
test('CMS identities, routes and category links are unique and complete',()=>{
  const rows=[...PAGES,...FAQS,...BLOGS,...BLOG_CATEGORIES];
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  assert.equal(new Set(PAGES.map(p=>p.slug)).size,PAGES.length);
  for(const post of BLOGS)assert.ok(BLOG_CATEGORIES.some(c=>c.slug===post.categorySlug));
});
