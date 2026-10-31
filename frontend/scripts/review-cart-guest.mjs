import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const origin=process.env.FE_REVIEW_ORIGIN||'http://localhost:3012';
const backend='http://localhost:3000/api/v1';
const output='test-results/stitch-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const checks=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const products=(await(await fetch(`${backend}/customer/products?limit=3`)).json()).data.data;
 async function request(path,method='GET',data){const r=await context.request.fetch(origin+path,{method,headers:{Origin:origin},data});const body=await r.json();if(!r.ok())throw Error(`${method} ${path}: ${r.status()} ${JSON.stringify(body)}`);return body;}
 for(const product of products){const variant=product.variants.find(v=>v.stockQuantity>3);if(variant)await request('/api/cart/items','POST',{productVariantId:variant.id,quantity:1});}
 const cart=await request('/api/cart/items');
 if(cart.items.length<2)throw Error('Need two in-stock products for selection test');
 await request(`/api/cart/items/${cart.items[1].id}`,'PUT',{isSelected:false});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/cart',{waitUntil:'networkidle'});
 await page.getByLabel(/Chọn tất cả/).click();
 await page.waitForFunction(()=>document.querySelector('.cart-selection-notice')?.textContent.includes('3/3'));
 await page.getByRole('checkbox',{name:`Chọn mua ${cart.items[1].productName}`,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cart-selection-notice')?.textContent.includes('2/3'));
 const productName=cart.items[0].productName;
 await page.getByRole('button',{name:`Tăng số lượng ${productName}`,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cart-page-heading')?.textContent.includes('4 sản phẩm'));
 await page.getByRole('button',{name:`Giảm số lượng ${productName}`,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cart-page-heading')?.textContent.includes('3 sản phẩm'));
 checks.push({cartSelectAll:true,cartQuantityButtons:true});
 for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  await page.setViewportSize(viewport);
  for(const [id,path] of [['S14','/cart'],['S37','/checkout'],['S39','/'],['S05','/chinh-sach-doi-tra']]){
   await page.goto(origin+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:`${output}/${id}-${device}-corrected.png`,fullPage:true,style:'nextjs-portal {display:none}'});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   checks.push({id,device,overflow});
  }
  await page.goto(origin+'/cart',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mở giỏ hàng',exact:true}).click();
  await page.screenshot({path:`${output}/S24-${device}-corrected.png`,fullPage:true,style:'nextjs-portal {display:none}'});
 }
 const selected=(await request('/api/cart/items')).items.filter(i=>i.isSelected).map(i=>({variantId:i.productVariantId,quantity:i.quantity}));
 const quote=await request('/api/checkout/preview','POST',{items:selected});
 checks.push({guestPreview:true,total:quote.totalAmount,selected:selected.length});
 if(process.env.FE_REVIEW_PLACE_ORDER==='1'){
  const input={items:selected,quoteVersion:quote.quoteVersion,paymentMethod:'COD',idempotencyKey:crypto.randomUUID(),shippingAddress:{recipientName:'KIỂM THỬ GUEST - KHÔNG GIAO',phone:'0900000000',addressLine:'Đơn kiểm thử local, không giao hàng',city:'Đà Nẵng'}};
  let created;
  try {
   created=await request('/api/checkout/order','POST',input);
   const replay=await request('/api/checkout/order','POST',input);
   if(replay.id!==created.id)throw Error('Duplicate guest order on replay');
   const detail=await request(`/api/checkout/order/${created.id}`);
   if(!detail.isGuest||detail.items.length!==selected.length)throw Error('Invalid guest receipt');
   const after=await request('/api/cart/items');
   if(after.items.some(item=>item.isSelected)||!after.items.some(item=>!item.isSelected))throw Error('Selected cart cleanup failed');
   const stranger=await browser.newContext();
   const denied=await stranger.request.get(`${origin}/api/checkout/order/${created.id}`);
   if(denied.ok())throw Error('Another session accessed guest receipt');
   await stranger.close();
   await page.setViewportSize({width:1440,height:1000});
   await page.goto(`${origin}/order-success/${created.id}`,{waitUntil:'networkidle'});
   await page.getByText(created.orderNumber,{exact:false}).first().waitFor();
   await page.screenshot({path:`${output}/S32-guest-corrected.png`,fullPage:true,style:'nextjs-portal {display:none}'});
   checks.push({guestOrder:true,replaySameOrder:true,guestReceipt:true,unselectedCartRetained:true,otherSessionDenied:denied.status()});
  }finally{
   if(created){
    const credentials=JSON.parse(await readFile(new URL('../../backend/.demo-data/credentials.json',import.meta.url),'utf8'));
    const email='admin@demo.glowup.test';
    const login=await fetch(`${backend}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:credentials[email].password})});
    const auth=(await login.json()).data;
    const cancel=await fetch(`${backend}/admin/orders/${created.id}/cancel`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth.accessToken}`},body:JSON.stringify({reason:'Hủy đơn kiểm thử guest checkout local'})});
    if(!cancel.ok)throw Error(`Cannot cancel local test order: ${cancel.status}`);
    checks.push({testOrderCancelled:true});
   }
  }
 }
 // Read-only route cannot expose another session's order, even with its UUID.
 const other=await browser.newContext();
 const missing=await other.request.get(`${origin}/api/checkout/order/00000000-0000-4000-8000-000000000000`);
 checks.push({unownedOrderStatus:missing.status()});await other.close();
 checks.push({errors});
 await context.close();
}finally{await browser.close();await writeFile(`${output}/cart-guest-checks.json`,JSON.stringify(checks,null,2));}
console.log(JSON.stringify(checks));
