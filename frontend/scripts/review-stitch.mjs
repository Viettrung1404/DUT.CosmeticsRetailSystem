import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile,mkdir,writeFile } from "node:fs/promises";
import { resolve,join,sep } from "node:path";
const root=resolve(import.meta.dirname,"../..");
const origin=process.env.FE_REVIEW_ORIGIN||"http://localhost:3012";
const backend=process.env.FE_REVIEW_BACKEND||"http://localhost:3000/api/v1";
const output=resolve(root,"frontend/test-results/stitch-review");
await mkdir(output,{recursive:true});
const healthy=await fetch(`${backend}/health/ready`);if(!healthy.ok)throw Error("Backend readiness check failed");
const sourceRoot=resolve(root,"docs/4-stitch_design");
const server=createServer(async(req,res)=>{try{const path=resolve(sourceRoot,decodeURIComponent((req.url||"/").slice(1)));if(!path.startsWith(sourceRoot+sep))throw Error("Invalid path");res.setHeader("Content-Type",path.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream");res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(3181,"127.0.0.1",resolve));
const browser=await chromium.launch({headless:true});
const results=[];
const sources={S14:"gi_h_ng_glowup_beauty_retail",S37:"thanh_to_n_glowup",S32:"t_h_ng_th_nh_c_ng_glowup",S22:"k_t_qu_thanh_to_n_glowup",S24:"mini_cart_drawer_glowup",S33:"t_ng_quan_t_i_kho_n_glowup",S36:"th_ng_tin_c_nh_n_glowup",S23:"l_ch_s_n_h_ng_glowup",S08:"chi_ti_t_n_h_ng_glowup",S38:"theo_d_i_v_n_chuy_n_glowup",S31:"s_n_ph_m_y_u_th_ch_glowup",S19:"i_m_th_ng_h_ng_th_nh_vi_n_glowup",S20:"i_u_i_glowup",S16:"h_p_th_th_ng_b_o_glowup",S12:"danh_s_ch_i_tr_glowup",S34:"t_o_y_u_c_u_i_tr_m_i_glowup",S06:"chi_ti_t_i_tr_b_o_gi_glowup",S02:"b_o_m_t_t_i_kho_n_glowup",S39:"trang_ch_glowup_beauty_retail",S03:"c_u_h_i_th_ng_g_p_faq_glowup",S04:"ch_ng_tr_nh_khuy_n_m_i_glowup",S05:"ch_nh_s_ch_i_tr_ho_n_ti_n_glowup",S07:"chi_ti_t_khuy_n_m_i_glowup",S13:"flash_sale_glowup",S18:"h_th_ng_showroom_glowup",S10:"chi_ti_t_showroom_ng_kh_i_glowup",S40:"trung_t_m_tr_gi_p_glowup"};
async function api(path){const response=await fetch(`${backend}${path}`);if(!response.ok)return null;return(await response.json()).data;}
const [brands,promotions,categories,posts]=await Promise.all([api("/brands"),api("/promotions/active"),api("/blog/categories"),api("/blog/posts")]);
const credentials=JSON.parse(await readFile(resolve(root,"backend/.demo-data/credentials.json"),"utf8"));
const account="customer-01@demo.glowup.test";
try{
for(const [device,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]]){
 const context=await browser.newContext({viewport,reducedMotion:"reduce"});
 const login=await context.request.post(`${origin}/api/auth/login`,{headers:{Origin:origin},data:{email:account,password:credentials[account].password},timeout:45000});if(!login.ok())throw Error(`Review account login failed: ${login.status()}`);
 const ordersResponse=await context.request.get(`${origin}/api/account/orders?page=1`);const orders=await ordersResponse.json();
 const returnsResponse=await context.request.get(`${origin}/api/account/commerce/returns`);const returns=await returnsResponse.json();
 const order=orders.orders?.[0]; const completed=orders.orders?.find(item=>item.status==="COMPLETED"); const ret=returns.items?.[0];
 const pages=[ ["S39","/"],["S14","/cart"],["S37","/checkout"],["S33","/account"],["S36","/account/profile"],["S23","/account/orders"],["S02","/account/security"],["S31","/account/wishlist"],["S19","/account/loyalty"],["S20","/account/loyalty/rewards"],["S16","/account/notifications"],["S12","/account/returns"],["S34",`/account/returns/new${completed?`?orderId=${completed.id}`:""}`],["S03","/faq"],["S04","/promotions"],["S05","/chinh-sach-doi-tra"],["S13","/flash-sale"],["S18","/stores"],["S40","/help"],["B01","/brands"],["B03","/blog"], ...(order?[["S08",`/account/orders/${order.id}`],["S38",`/account/orders/${order.id}/tracking`],["S32",`/order-success/${order.id}`]]:[]),...(ret?[["S06",`/account/returns/${ret.id}`]]:[]),...(brands?.[0]?[["B02",`/brands/${brands[0].slug}`]]:[]),...(promotions?.items?.[0]?[["S07",`/promotions/${promotions.items[0].id}`]]:[]),...(categories?.[0]?[["B04",`/blog/category/${categories[0].slug}`]]:[]),...(posts?.items?.[0]?[["B05",`/blog/${posts.items[0].slug}`]]:[]) ];
 const page=await context.newPage();const reference=await browser.newPage({viewport,reducedMotion:"reduce"});
 for(const [id,path]of pages.filter(([id])=>!process.env.FE_REVIEW_SCREENS||process.env.FE_REVIEW_SCREENS.split(',').includes(id))){
  const errors=[];const onError=error=>errors.push(error.message);page.on("pageerror",onError);
  try{
   const response=await page.goto(`${origin}${path}`,{waitUntil:"networkidle",timeout:90000});await page.evaluate(()=>document.fonts.ready.then(()=>undefined));await page.screenshot({path:join(output,`${id}-${device}-actual.png`),fullPage:true,animations:"disabled",style:"nextjs-portal { display:none }"});
   const observed=await page.evaluate(()=>({title:document.querySelector('main h1')?.textContent?.trim(),overflow:document.documentElement.scrollWidth>innerWidth,mainWidth:document.querySelector('main')?.getBoundingClientRect().width,headings:[...document.querySelectorAll('main h1,main h2')].map(e=>e.textContent?.trim()).slice(0,15)}));
   if(sources[id]){await reference.goto(`http://127.0.0.1:3181/${sources[id]}/code.html`,{waitUntil:"networkidle",timeout:60000});await reference.evaluate(()=>document.fonts.ready.then(()=>undefined));await reference.screenshot({path:join(output,`${id}-${device}-source.png`),fullPage:true,animations:"disabled"});}
   results.push({id,device,path,status:response.status(),...observed,errors});console.log(JSON.stringify({id,device,status:response.status(),overflow:observed.overflow,errors:errors.length}));
  }catch(error){results.push({id,device,path,error:error.message});console.log(JSON.stringify({id,device,error:error.message.slice(0,180)}));}
  page.off("pageerror",onError);
 }
 await context.close();await reference.close();
}
}finally{const serialized=JSON.stringify(results,null,2);await writeFile(join(output,"results.json"),serialized);await writeFile(join(output,`results-${(process.env.FE_REVIEW_SCREENS||'all').replace(/[^A-Za-z0-9,]/g,'')}.json`),serialized);await browser.close();server.close();}
