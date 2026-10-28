const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {PrismaClient}=require('@prisma/client');
const {demoId,ANCHOR,ACTIVE_START,ACTIVE_END,SETTINGS,PAGES,FAQS,BLOG_CATEGORIES,BLOGS}=require('./fixtures.cjs');
const ROOT=path.resolve(__dirname,'../../.demo-data');
const db=new PrismaClient();
const encode=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v);
const digest=value=>crypto.createHash('sha256').update(encode(value)).digest('hex');
async function main(){
  fs.mkdirSync(ROOT,{recursive:true});
  const roles=await db.role.findMany();
  for(const name of ['admin','accountant','warehouse_staff','store_manager','sales_staff','customer'])if(!roles.some(r=>r.name===name))throw new Error('Missing existing role '+name);
  const baselinePath=path.join(ROOT,'protected-before.json');
  if(!fs.existsSync(baselinePath)){
    const baseline={};
    for(const model of ['role','permission','user','customer']){
      const rows=await db[model].findMany({orderBy:model==='permission'?{bitPosition:'asc'}:{id:'asc'}});
      baseline[model]={keys:rows.map(r=>model==='permission'?r.bitPosition:r.id),sha256:digest(rows)};
    }
    fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2));
  }
  const stores=await db.store.findMany({where:{code:{in:['WH-HN','STORE-01','STORE-02','STORE-03','STORE-04','STORE-05']}},orderBy:{code:'asc'}});
  if(stores.length!==6)throw new Error('Expected five demo stores and one warehouse');
  const storeMap=new Map(stores.map(s=>[s.code,s]));
  const catalog=JSON.parse(fs.readFileSync(path.resolve(ROOT,'../.catalog-data/catalog.json'),'utf8'));
  const imageManifest=JSON.parse(fs.readFileSync(path.resolve(ROOT,'../.catalog-data/uploaded.json'),'utf8'));
  const assetManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets-uploaded.json'),'utf8'));
  const banners=JSON.parse(fs.readFileSync(path.join(ROOT,'banners.json'),'utf8'));
  const brandAssets=JSON.parse(fs.readFileSync(path.join(ROOT,'brands.json'),'utf8'));
  const assetUrl=asset=>{const url=assetManifest[asset.sha256]?.url;if(!url)throw new Error('Upload content assets first');return url;};
  const accounts=[
    {key:'admin',role:'admin',name:'Điều phối Demo GlowUp',department:'office'},
    {key:'accountant',role:'accountant',name:'Kế toán Demo GlowUp',department:'accounting'},
    {key:'warehouse-01',role:'warehouse_staff',name:'Nhân viên kho Demo 01',department:'warehouse',storeCode:'WH-HN'},
    {key:'warehouse-02',role:'warehouse_staff',name:'Nhân viên kho Demo 02',department:'warehouse',storeCode:'WH-HN'},
    ...stores.filter(s=>s.type==='STORE').flatMap(s=>[
      {key:'manager-'+s.code.toLowerCase(),role:'store_manager',name:'Quản lý Demo '+s.name,department:'sales',storeCode:s.code},
      {key:'cashier-'+s.code.toLowerCase(),role:'sales_staff',name:'Thu ngân Demo '+s.name,department:'sales',storeCode:s.code},
    ]),
    ...Array.from({length:20},(_,i)=>({key:`customer-${String(i+1).padStart(2,'0')}`,role:'customer',name:`Khách Demo ${String(i+1).padStart(2,'0')}`,index:i})),
  ];
  const credentialsPath=path.join(ROOT,'credentials.json');
  let credentials=fs.existsSync(credentialsPath)?JSON.parse(fs.readFileSync(credentialsPath,'utf8')):{};
  const users=[];
  for(const account of accounts){
    const email=account.key+'@demo.glowup.test';
    const userId=demoId('user',account.key);
    const existing=await db.user.findUnique({where:{email},select:{id:true}});
    if(existing && existing.id!==userId)throw new Error('Reserved demo email already belongs to another user: '+email);
    if(existing && !credentials[email])throw new Error('Local credentials missing for existing demo account; refusing to reset password');
    if(!credentials[email])credentials[email]={password:crypto.randomBytes(18).toString('base64url'),role:account.role,userId};
    const passwordHash=existing?undefined:await bcrypt.hash(credentials[email].password,12);
    users.push({id:userId,email,roleId:roles.find(r=>r.name===account.role).id,fullName:account.name.slice(0,100),emailVerified:true,status:'ACTIVE',...(passwordHash&&{passwordHash})});
  }
  fs.writeFileSync(credentialsPath,JSON.stringify(credentials,null,2));
  const departments=[['office','Điều phối'],['accounting','Kế toán'],['warehouse','Kho vận'],['sales','Bán hàng']].map(([key,name])=>({id:demoId('department',key),name,description:'Bộ phận trong cấu hình vận hành mẫu GlowUp'}));
  const suppliers=['Miền Bắc','Miền Nam','Chăm sóc da','Trang điểm','Phụ kiện'].map((name,i)=>({id:demoId('supplier',i),name:`Nhà cung cấp Demo ${name}`,contactPerson:'Đầu mối giả lập',email:`supplier-${i+1}@partners.glowup.test`,paymentTerms:'Đối soát công nợ mẫu trong 30 ngày; không phải hợp đồng thực tế'}));
  const shifts=[...stores.flatMap(s=>s.type==='WAREHOUSE'?[{id:demoId('shift',s.code+'-day'),storeId:s.id,name:'Ca kho ban ngày',startTime:'07:30',endTime:'17:30'}]:[
    {id:demoId('shift',s.code+'-morning'),storeId:s.id,name:'Ca sáng',startTime:'08:00',endTime:'15:00'},
    {id:demoId('shift',s.code+'-evening'),storeId:s.id,name:'Ca chiều',startTime:'15:00',endTime:'22:00'},
  ]),{id:demoId('shift','office'),name:'Ca văn phòng',startTime:'08:00',endTime:'17:00'}];
  await db.$transaction(async tx=>{
    const insert=async(model,rows)=>{for(let i=0;i<rows.length;i+=100)await tx[model].createMany({data:rows.slice(i,i+100),skipDuplicates:true});};
    await insert('department',departments);
    await insert('supplier',suppliers);
    await insert('user',users);
    await insert('shift',shifts);
    for(const setting of SETTINGS)await tx.setting.upsert({where:{key:setting.key},update:{},create:{...setting,description:'Cấu hình mẫu GlowUp khớp định dạng service đang sử dụng'}});
    const tiers=await tx.loyaltyTier.findMany({orderBy:[{minPoints:'desc'},{id:'asc'}]});
    if(!tiers.length)throw new Error('Existing loyalty tiers are required');
    const employees=accounts.filter(a=>a.role!=='customer').map((a,i)=>({id:demoId('employee',a.key),userId:demoId('user',a.key),storeId:a.storeCode?storeMap.get(a.storeCode).id:null,departmentId:demoId('department',a.department),employeeCode:'DEMO-'+String(i+1).padStart(3,'0'),position:a.role,hireDate:new Date('2026-09-01T00:00:00Z'),salary:a.role==='store_manager'?12000000:8000000,commissionRate:a.role==='sales_staff'?1:0}));
    await insert('employee',employees);
    const assignments=accounts.filter(a=>a.role!=='customer').flatMap(a=>{
      const locations=a.storeCode?[storeMap.get(a.storeCode)]:[];
      return locations.map(s=>({userId:demoId('user',a.key),storeId:s.id}));
    });
    await insert('userStore',assignments);
    await tx.userStore.deleteMany({where:{userId:{in:[demoId('user','admin'),demoId('user','accountant')]}}});
    for(const a of accounts.filter(a=>a.role==='store_manager'))await tx.store.updateMany({where:{id:storeMap.get(a.storeCode).id,managerId:null},data:{managerId:demoId('employee',a.key)}});
    const customerIds=[];
    for(const a of accounts.filter(a=>a.role==='customer')){
      const customerId=demoId('customer',a.key);customerIds.push(customerId);
      const openingPoints=[0,1000,5000,15000,25000][a.index%5];
      const existing=await tx.customer.findUnique({where:{id:customerId}});
      if(!existing){
        await tx.customer.create({data:{id:customerId,userId:demoId('user',a.key),fullName:a.name,phone:'09000001'+String(a.index).padStart(2,'0'),totalPoints:openingPoints,loyaltyTierId:tiers.find(t=>t.minPoints<=openingPoints)?.id,referralCode:'DEMO'+String(a.index+1).padStart(4,'0')}});
        if(openingPoints)await tx.loyaltyPointsTransaction.create({data:{id:demoId('opening-points',a.key),customerId,points:openingPoints,type:'ADJUST',description:'Điểm mở đầu giả lập cho kịch bản demo',eventKey:'DEMO:OPENING:'+customerId}});
      }
      const store=stores.filter(s=>s.type==='STORE')[a.index%5];
      const addresses=[{id:demoId('address',a.key+'-home'),customerId,label:'Nhà',recipientName:a.name,phone:'09000001'+String(a.index).padStart(2,'0'),addressLine:`${20+a.index} Đường Demo`,city:store.city,district:store.district,ward:'Phường mẫu',isDefault:true}];
      if(a.index<5)addresses.push({...addresses[0],id:demoId('address',a.key+'-office'),label:'Văn phòng',addressLine:`${100+a.index} Đường Demo`,isDefault:false});
      await insert('customerAddress',addresses);
    }
    const attendances=[];
    for(const employee of employees){
      const shift=shifts.find(s=>employee.storeId?s.storeId===employee.storeId:!s.storeId);
      for(let day=1;day<=7;day++){
        const date=new Date(ANCHOR.getTime()-day*86400000);date.setUTCHours(0,0,0,0);
        const [hour,minute]=shift.startTime.split(':').map(Number);
        const [endHour,endMinute]=shift.endTime.split(':').map(Number);
        const checkInAt=new Date(date);checkInAt.setUTCHours(hour-7,minute);
        const checkOutAt=new Date(date);checkOutAt.setUTCHours(endHour-7,endMinute);
        attendances.push({id:demoId('attendance',employee.id+':'+date.toISOString()),employeeId:employee.id,shiftId:shift.id,date,checkInAt,checkOutAt,status:'PRESENT',note:'Chấm công giả lập; không phải dữ liệu nhân sự thực tế'});
      }
    }
    await insert('attendance',attendances);
    await insert('page',PAGES.map((p,i)=>({...p,sortOrder:i})));
    await insert('faq',FAQS);
    await insert('blogCategory',BLOG_CATEGORIES);
    await insert('blogPost',BLOGS.map((p,i)=>{const {categorySlug,...data}=p;return {...data,blogCategoryId:BLOG_CATEGORIES.find(c=>c.slug===categorySlug).id,authorId:demoId('user','admin'),status:'PUBLISHED',featuredImage:imageManifest[catalog.products[(i*17)%catalog.products.length].images[0].sha256].url,metaTitle:p.title,metaDescription:p.excerpt};}));
    await insert('banner',banners.map((b,i)=>({id:demoId('banner',b.key),title:b.title,imageUrl:assetUrl(b),linkUrl:b.linkUrl,position:b.position,sortOrder:i})));
    let logoUpdates=0,bannerUpdates=0;
    for(const source of brandAssets){
      if(source.logo)logoUpdates+=(await tx.brand.updateMany({where:{slug:source.slug,logoUrl:null},data:{logoUrl:assetUrl(source.logo)}})).count;
      if(source.banner)bannerUpdates+=(await tx.brand.updateMany({where:{slug:source.slug,OR:[{bannerUrl:null},{bannerUrl:{contains:'images.unsplash.com'}}]},data:{bannerUrl:assetUrl(source.banner)}})).count;
    }
    const selection=[...catalog.products.filter(p=>p.category.parent==='cham-soc-da').slice(0,6),...catalog.products.filter(p=>p.category.parent==='trang-diem').slice(0,3)];
    const promotions=[
      {id:demoId('promotion','skincare'),name:'GlowUp Demo — Chăm sóc da -10%',type:'PERCENTAGE',value:10,minOrderAmount:0,maxDiscountAmount:100000,startDate:ACTIVE_START,endDate:ACTIVE_END,usageLimit:1000,applicableProducts:selection.slice(0,6).map(p=>p.id)},
      {id:demoId('promotion','shipping'),name:'GlowUp Demo — Miễn phí giao đơn từ 300K',type:'FREE_SHIPPING',value:0,minOrderAmount:300000,startDate:ACTIVE_START,endDate:ACTIVE_END,usageLimit:1000},
      {id:demoId('promotion','flash'),name:'GlowUp Demo — Flash sale chọn lọc -15%',type:'PERCENTAGE',value:15,minOrderAmount:0,maxDiscountAmount:80000,isFlashSale:true,startDate:ACTIVE_START,endDate:ACTIVE_END,usageLimit:200,applicableProducts:selection.slice(6,9).map(p=>p.id)},
      {id:demoId('promotion','expired'),name:'GlowUp Demo — Chương trình đã kết thúc',type:'PERCENTAGE',value:5,minOrderAmount:0,startDate:new Date('2026-09-01T00:00:00Z'),endDate:new Date('2026-09-30T00:00:00Z')},
    ];
    const priorPromotionCount=await tx.promotion.count({where:{id:{in:promotions.map(p=>p.id)}}});
    await insert('promotion',promotions);
    await insert('promotionVariantQuota',selection.slice(6,9).map(p=>({id:demoId('quota',p.variants[0].id),promotionId:demoId('promotion','flash'),productVariantId:p.variants[0].id,quota:25})));
    const coupons=[
      {code:'DEMO-WELCOME10',discountType:'PERCENTAGE',discountValue:10,minOrderAmount:150000,maxDiscountAmount:50000,maxUses:100,maxUsesPerCustomer:1},
      {code:'DEMO-SAVE30K',discountType:'FIXED_AMOUNT',discountValue:30000,minOrderAmount:300000,maxUses:100,maxUsesPerCustomer:2},
      {code:'DEMO-ONEUSE',discountType:'FIXED_AMOUNT',discountValue:10000,minOrderAmount:50000,maxUses:1,maxUsesPerCustomer:1},
      {code:'DEMO-PERSONAL',customerId:customerIds[0],discountType:'FIXED_AMOUNT',discountValue:15000,minOrderAmount:100000,maxUses:1,maxUsesPerCustomer:1},
      {code:'DEMO-EXPIRED',discountType:'PERCENTAGE',discountValue:5,minOrderAmount:0,maxUses:10,maxUsesPerCustomer:1,endDate:new Date('2026-09-30T00:00:00Z'),startDate:new Date('2026-09-01T00:00:00Z')},
    ];
    await insert('coupon',coupons.map(c=>({id:demoId('coupon',c.code),startDate:ACTIVE_START,endDate:ACTIVE_END,...c})));
    if(priorPromotionCount<promotions.length)await tx.$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT id,1,0,now(),now() FROM products WHERE sku LIKE 'GU-%'
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now()`;
    fs.writeFileSync(path.join(ROOT,'foundation-prepared.json'),JSON.stringify({accounts:accounts.length,employees:employees.length,customers:customerIds.length,departments:departments.length,shifts:shifts.length,attendance:attendances.length,suppliers:suppliers.length,pages:PAGES.length,faqs:FAQS.length,blogPosts:BLOGS.length,banners:banners.length,logoUpdates,bannerUpdates},null,2));
  },{timeout:240000,maxWait:15000});
  fs.copyFileSync(path.join(ROOT,'foundation-prepared.json'),path.join(ROOT,'foundation-report.json'));
  console.log('Foundation seed completed; credentials saved locally, existing accounts and permissions preserved.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
