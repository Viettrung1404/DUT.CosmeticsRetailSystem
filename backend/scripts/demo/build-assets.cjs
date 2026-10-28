const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.resolve(__dirname,'../../../frontend/node_modules/playwright'));
const ROOT=path.resolve(__dirname,'../../.demo-data');
const CATALOG=path.resolve(__dirname,'../../.catalog-data');
async function main(){
  fs.mkdirSync(path.join(ROOT,'images'),{recursive:true});
  const products=JSON.parse(fs.readFileSync(path.join(CATALOG,'catalog.json'),'utf8')).products;
  const skin=products.filter(p=>p.brand.slug==='cocoon').slice(0,3);
  const makeup=products.filter(p=>['son-thoi','son-kem','phan-ma-hong'].includes(p.category.slug)).slice(0,3);
  const definitions=[
    {key:'hero',title:'Rạng rỡ theo cách của bạn',eyebrow:'GLOWUP BEAUTY SELECTION',description:'Khám phá những lựa chọn chăm sóc da và làm đẹp dành cho nhịp sống của bạn.',cta:'Khám phá sản phẩm',position:'HOME_HERO',linkUrl:'/customer/products',photos:skin},
    {key:'makeup',title:'Chọn màu của riêng bạn',eyebrow:'MAKEUP YOUR MOMENT',description:'Son môi, sắc má và những điểm nhấn nhỏ cho ngày thêm tươi mới.',cta:'Tìm sắc màu yêu thích',position:'HOME_HERO',linkUrl:'/customer/products',photos:makeup},
    {key:'member',title:'Thêm yêu chiều. Thêm quyền lợi.',eyebrow:'GLOWUP MEMBERS',description:'Tích điểm khi mua sắm, khám phá quà thành viên và theo dõi quyền lợi trong tài khoản.',cta:'Khám phá ưu đãi',position:'HOME_SECONDARY',linkUrl:'/promotions',photos:[skin[1],makeup[0],skin[2]]},
  ];
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:640},deviceScaleFactor:1});
  const assets=[];
  for(const d of definitions){
    const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#412e27}.banner{width:1600px;height:640px;display:flex;align-items:center;padding:66px 96px;background:radial-gradient(ellipse at 80% 30%,#fff6ee 0%,transparent 60%),linear-gradient(115deg,#f9ecee,#f5dce2);position:relative;overflow:hidden}.circle{position:absolute;width:800px;height:800px;border:1px solid #d8abb680;border-radius:50%;right:-130px;top:-130px}.copy{position:relative;width:670px;z-index:2}.logo{font-family:Georgia,serif;font-size:42px;color:#9d394f;margin-bottom:46px;letter-spacing:1px}.eyebrow{font-size:13px;letter-spacing:3px;color:#9d394f;font-weight:700;margin-bottom:18px}h1{font-family:Georgia,serif;font-size:62px;line-height:1.08;letter-spacing:-2px;max-width:650px;margin:0 0 24px}p{font-size:19px;line-height:1.55;max-width:550px;color:#705b55;margin:0 0 30px}.cta{display:inline-block;padding:16px 26px;border-radius:30px;background:#9d394f;color:white;font-size:15px;font-weight:bold}.photos{display:flex;align-items:center;gap:16px;position:absolute;right:65px;top:115px;transform:rotate(-5deg)}.photo{width:215px;height:350px;padding:15px;background:#fff;border:1px solid #edd9df;border-radius:120px 120px 24px 24px;box-shadow:0 18px 35px #705b5518}.photo:nth-child(2){margin-top:100px;transform:rotate(8deg)}.photo img{width:100%;height:100%;object-fit:contain;border-radius:80px}.foot{position:absolute;right:96px;bottom:38px;font-size:12px;letter-spacing:2px;color:#9d394f}
      </style><div class="banner"><div class="circle"></div><section class="copy"><div class="logo">GlowUp.</div><div class="eyebrow">${d.eyebrow}</div><h1>${escape(d.title)}</h1><p>${escape(d.description)}</p><div class="cta">${d.cta} &nbsp; →</div></section><div class="photos">${d.photos.map(p=>`<div class="photo"><img src="${pathToFileURL(path.join(CATALOG,p.images[0].localPath))}" alt=""></div>`).join('')}</div><div class="foot">BEAUTY · YOUR WAY</div></div></html>`;
    const htmlPath=path.join(ROOT,`banner-${d.key}.html`);
    fs.writeFileSync(htmlPath,html);
    await page.goto(pathToFileURL(htmlPath).href);
    await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
    const localPath=`images/banner-${d.key}.png`;
    await page.screenshot({path:path.join(ROOT,localPath)});
    const body=fs.readFileSync(path.join(ROOT,localPath));
    const {photos,...metadata}=d;
    assets.push({...metadata,localPath,sha256:crypto.createHash('sha256').update(body).digest('hex'),contentType:'image/png',width:1600,height:640});
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT,'banners.json'),JSON.stringify(assets,null,2));
  console.log(`Created ${assets.length} original GlowUp banner layouts from existing catalog photos.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
