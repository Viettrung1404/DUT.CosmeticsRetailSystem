const fs=require('node:fs');
const path=require('node:path');
const {demoId,ANCHOR}=require('./fixtures.cjs');
const {createRuntime,ROOT}=require('./runtime.cjs');
const rt=createRuntime();
const {db,step,adminId}=rt;
const customerKey=i=>`customer-${String(i+1).padStart(2,'0')}`;
const customerId=i=>demoId('customer',customerKey(i));
const userId=i=>demoId('user',customerKey(i));
async function advance(orderId,target){
  const states=['PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERED','COMPLETED'];
  let order=await db.order.findUniqueOrThrow({where:{id:orderId}});
  if(target==='CANCELLED'){
    if(order.status!=='CANCELLED')await rt.adminOrders.cancelByAdmin({orderId,changedBy:adminId,reason:'DEMO: khách thay đổi kế hoạch mua'});
    return;
  }
  for(let index=states.indexOf(order.status)+1;index<=states.indexOf(target);index++){
    const next=states[index];
    if(next==='CONFIRMED')await rt.adminOrders.confirm({orderId,changedBy:adminId,note:'DEMO: xác nhận qua luồng nghiệp vụ'});
    else await rt.adminOrders.updateStatus({orderId,target:next,changedBy:adminId,note:'DEMO: kịch bản xử lý đơn'});
  }
  await ensureShipment(orderId);
}
async function ensureShipment(orderId){
  return db.transaction(async tx=>{
    const order=await tx.order.findUniqueOrThrow({where:{id:orderId},include:{statusHistories:{where:{status:{in:['SHIPPING','DELIVERED']}},orderBy:{createdAt:'asc'}}}});
    if(order.orderType==='STORE_PICKUP'||!order.statusHistories.length)return;
    const shipmentId=demoId('shipment',orderId);
    const pending=await tx.payment.aggregate({where:{orderId,paymentMethod:'COD',status:'PENDING'},_sum:{amount:true}});
    await tx.shipment.upsert({where:{id:shipmentId},update:{},create:{id:shipmentId,orderId,shipmentCode:'DEMO-SHIP-'+orderId.slice(0,18),carrierCode:'DEMO',trackingCode:'DEMO-TRACK-'+orderId,codAmount:pending._sum.amount||0,shippingFeePaid:0,status:'CREATED',carrierMetadata:{demo:true,noExternalCarrier:true}}});
    for(const history of order.statusHistories){
      const status=history.status==='SHIPPING'?'IN_TRANSIT':'DELIVERED';
      await tx.shipment.update({where:{id:shipmentId},data:history.status==='SHIPPING'?{handedOverAt:history.createdAt}:{deliveredAt:history.createdAt}});
      await rt.integration.shipmentChanged(tx,{shipmentId,carrierCode:'DEMO',eventId:'DEMO:'+orderId+':'+history.status,status,occurredAt:history.createdAt});
    }
  });
}
async function main(){
  if(!fs.existsSync(path.join(ROOT,'foundation-report.json')))throw new Error('Seed foundation first');
  const admin=await db.user.findUniqueOrThrow({where:{id:adminId}});
  if(admin.roleId!==1)throw new Error('Demo admin identity mismatch');
  const stores=await db.store.findMany({where:{code:{in:['WH-HN','STORE-01','STORE-02','STORE-03','STORE-04','STORE-05']}},orderBy:{code:'asc'}});
  const warehouse=stores.find(s=>s.type==='WAREHOUSE');
  const retail=stores.filter(s=>s.type==='STORE');
  const catalog=JSON.parse(fs.readFileSync(path.resolve(ROOT,'../.catalog-data/catalog.json'),'utf8'));
  const candidates=catalog.products.flatMap(p=>p.variants.map(v=>({...v,productId:p.id}))).filter(v=>v.price>=200000&&v.price<=1000000);
  const onlineTargets=['COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERED','CANCELLED','PENDING','COMPLETED','CONFIRMED','CANCELLED','COMPLETED','PENDING'];
  const online=[];
  for(let i=0;i<onlineTargets.length;i++){
    const key='online-'+String(i+1).padStart(2,'0');
    const ci=i===18?0:i;
    const variant=i===15||i===16?(await db.promotionVariantQuota.findFirst({where:{promotionId:demoId('promotion','flash')},include:{variant:true}})).variant:candidates[i];
    const coupons={0:'DEMO-WELCOME10',2:'DEMO-ONEUSE',18:'DEMO-PERSONAL'};
    const order=await step(key+':create',async()=>{
      const note='DEMO:'+key;
      const previous=await db.order.findFirst({where:{note,customerId:customerId(ci)},select:{id:true}});
      if(previous)return previous;
      const address=await db.customerAddress.findFirstOrThrow({where:{customerId:customerId(ci),isDefault:true}});
      const input={customerId:customerId(ci),paymentMethod:'COD',shippingAddress:{recipientName:address.recipientName,phone:address.phone,addressLine:address.addressLine,ward:address.ward,district:address.district,city:address.city},items:[{variantId:variant.id,quantity:i===15||i===16?1:2}],couponCode:coupons[i],usePoints:[1,3,17].includes(i)?100:0,note,idempotencyKey:'demo-v1:'+key};
      if(i===18)input.storeId=retail[1].id;
      const quote=await rt.checkout.preview(input);
      const created=await rt.checkout.create({...input,quoteVersion:quote.quoteVersion});
      return {id:created.id};
    });
    await step(key+':'+onlineTargets[i],async()=>{await advance(order.id,onlineTargets[i]);return {id:order.id,status:onlineTargets[i]};});
    online.push({id:order.id,customerIndex:ci,target:onlineTargets[i]});
  }
  for(const [index,store] of retail.entries()){
    await step('pos:'+store.code,()=>db.transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`DEMO:POS:${store.code}`},0))::text`;
      const existing=await tx.order.findMany({where:{note:{startsWith:'DEMO:POS:'+store.code+':'}}});
      if(existing.length===2)return {orderIds:existing.map(o=>o.id)};
      if(existing.length)throw new Error('Partial POS fixture detected');
      const cashier=demoId('user','cashier-'+store.code.toLowerCase());
      const manager=demoId('user','manager-'+store.code.toLowerCase());
      const codes=await rt.codes(cashier);
      const session=await rt.open.execute(cashier,{storeId:store.id,openingCash:1000000,note:'DEMO:POS:'+store.code});
      const orderIds=[];
      for(let sale=0;sale<2;sale++){
        const variants=candidates.slice(40+index*4+sale*2,42+index*4+sale*2);
        const input={storeId:store.id,customerId:customerId(index+sale*5),items:variants.map(v=>({variantId:v.id,quantity:1})),couponCode:sale===0?'DEMO-SAVE30K':undefined,note:`DEMO:POS:${store.code}:${sale+1}`};
        const plan=await rt.planner.plan(cashier,codes,input);
        const result=await rt.pos.execute(cashier,codes,{...input,payments:[{method:'CASH',amount:Math.ceil(plan.pricing.total/10000)*10000}]});
        orderIds.push(result.sale.orderId);
      }
      const cash=await rt.sessions.sumCompletedCash(session.id);
      await rt.close.execute(cashier,codes,session.id,{countedCash:1000000+cash,note:'DEMO:POS:'+store.code});
      await rt.reconcile.execute(manager,session.id,'DEMO: đối soát khớp tiền mặt');
      return {sessionId:session.id,orderIds};
    }));
  }
  for(let i=0;i<5;i++)await step('purchase:'+i,()=>db.transaction(async tx=>{
    const poId=demoId('purchase-order',i);
    const existing=await tx.purchaseOrder.findUnique({where:{id:poId}});
    if(existing)return {id:poId,status:existing.status};
    const variants=candidates.slice(90+i*2,92+i*2);
    const total=variants.reduce((n,v)=>n+v.costPrice*30,0);
    await tx.purchaseOrder.create({data:{id:poId,poNumber:'DEMO-PO-'+String(i+1).padStart(3,'0'),supplierId:demoId('supplier',i),storeId:warehouse.id,status:i===0?'DRAFT':i===1?'SENT':'CONFIRMED',totalAmount:total,note:'DEMO: đơn nhập mẫu, không gửi nhà cung cấp',createdBy:adminId,expectedDate:ANCHOR,items:{create:variants.map((v,j)=>({id:demoId('purchase-item',i+':'+j),productVariantId:v.id,quantityOrdered:30,unitCost:v.costPrice,totalCost:v.costPrice*30}))}}});
    if(i===2||i===3){
      const quantity=i===2?30:12;
      await rt.receive.execute(adminId,{purchaseOrderId:poId,items:variants.map((v,j)=>({purchaseOrderItemId:demoId('purchase-item',i+':'+j),quantity,batchNumber:`DEMO-PO-${i+1}-${j+1}`,manufactureDate:'2026-09-01',expiryDate:'2028-09-01'})),note:'DEMO: nhận hàng qua service nhập kho'});
      await tx.supplierPayment.create({data:{id:demoId('supplier-payment',i),supplierId:demoId('supplier',i),purchaseOrderId:poId,amount:variants.reduce((n,v)=>n+v.costPrice*quantity,0),paymentMethod:'CASH',paymentDate:ANCHOR,status:'PENDING',note:'DEMO: đề nghị thanh toán, chưa chi tiền'}});
    }
    return {id:poId,status:(await tx.purchaseOrder.findUniqueOrThrow({where:{id:poId}})).status};
  }));
  await step('inventory-drafts',()=>db.transaction(async tx=>{
    for(const [i,store] of retail.entries()){
      const transferId=demoId('transfer',store.code);
      const variants=candidates.slice(110+i*3,113+i*3);
      await tx.inventoryTransfer.upsert({where:{id:transferId},update:{},create:{id:transferId,transferCode:'DEMO-TR-'+store.code,fromStoreId:warehouse.id,toStoreId:store.id,status:'REQUESTED',requestedBy:adminId,note:'DEMO: yêu cầu chuyển hàng chưa xuất kho',items:{create:variants.map((v,j)=>({id:demoId('transfer-item',store.code+':'+j),productVariantId:v.id,quantityRequested:3}))}}});
    }
    for(let i=0;i<3;i++){
      const store=retail[i],stocktakeId=demoId('stocktake',store.code);
      const inventory=await tx.inventory.findMany({where:{storeId:store.id,productVariantId:{in:candidates.slice(130,135).map(v=>v.id)}},include:{variant:{select:{costPrice:true}}},orderBy:{id:'asc'}});
      await tx.stocktake.upsert({where:{id:stocktakeId},update:{},create:{id:stocktakeId,stocktakeCode:'DEMO-ST-'+store.code,storeId:store.id,status:'DRAFT',createdBy:adminId,note:'DEMO: phiếu kiểm kê nháp, chưa điều chỉnh tồn kho',items:{create:inventory.map((row,j)=>({id:demoId('stocktake-item',stocktakeId+':'+j),productVariantId:row.productVariantId,systemQuantity:row.quantity,actualQuantity:row.quantity,unitCost:row.variant.costPrice}))}}});
    }
    return {transferDrafts:5,stocktakeDrafts:3};
  }));
  for(let i=0;i<20;i++)await step('wishlist:'+i,async()=>{
    for(let j=0;j<2;j++)await rt.wishlist.change(userId(i),`demo-v1:wishlist:${i}:${j}`,catalog.products[(i*7+j)%catalog.products.length].id,true);
    return {customerId:customerId(i),items:2};
  });
  await step('carts',()=>db.transaction(async tx=>{
    for(let i=10;i<20;i++){
      const cartId=demoId('cart',i);
      await tx.cart.upsert({where:{customerId:customerId(i)},update:{},create:{id:cartId,customerId:customerId(i),storeId:retail[i%5].id,items:{create:candidates.slice(160+(i-10)*2,162+(i-10)*2).map((v,j)=>({id:demoId('cart-item',i+':'+j),productVariantId:v.id,quantity:1,unitPrice:v.price,isSelected:j===0}))}}});
    }
    return {carts:10,items:20};
  }));
  for(const i of [2,4,9])await step('redeem:'+i,()=>rt.loyalty.redeem(userId(i),`demo-v1:redeem:${i}`,'GLOWUP-5K'));
  for(let i=0;i<8;i++)await step('review:'+i,async()=>{
    const order=await db.order.findUniqueOrThrow({where:{id:online[i].id},include:{items:true}});
    const productId=(await db.productVariant.findUniqueOrThrow({where:{id:order.items[0].productVariantId}})).productId;
    const existing=await db.review.findUnique({where:{customerId_productId:{customerId:customerId(i),productId}}});
    const review=existing||await rt.reviews.create(userId(i),{productId,orderId:order.id,rating:i%3===0?4:5,title:'Đánh giá demo — đối chiếu đơn mua',content:'Dữ liệu đánh giá giả lập để kiểm tra luồng mua hàng và kiểm duyệt của GlowUp.'});
    await db.$transaction(tx=>rt.reviews.moderate(tx,review.id,i<6,'Phản hồi mẫu từ GlowUp: cảm ơn bạn đã kiểm tra đơn hàng.'));
    return {id:review.id,approved:i<6};
  });
  await seedReturns(online,catalog);
  await step('invoices',()=>db.transaction(async tx=>{
    const eligible=await tx.order.findMany({where:{id:{in:online.map(o=>o.id)},status:'COMPLETED',shippingFee:0},include:{items:true,customer:true},take:5,orderBy:{id:'asc'}});
    for(const [i,order] of eligible.entries()){
      const invoiceId=demoId('invoice',order.id);
      const subtotal=order.items.reduce((n,item)=>n+Number(item.totalPrice),0);
      await tx.invoice.upsert({where:{id:invoiceId},update:{},create:{id:invoiceId,invoiceSeries:'DEMO',invoiceNumber:'DEMO-INV-'+String(i+1).padStart(3,'0'),lookupCode:'DEMO-'+invoiceId,orderId:order.id,storeId:order.storeId,customerId:order.customerId,buyerName:order.customer.fullName,subtotal,taxRate:0,taxAmount:0,totalAmount:subtotal,paymentMethod:'COD',status:'DRAFT',issuedBy:adminId,items:{create:order.items.map(item=>({id:demoId('invoice-item',item.id),orderItemId:item.id,itemName:item.productName,unit:'cái',quantity:item.quantity,unitPrice:Number(item.totalPrice)/item.quantity,taxRate:0,taxAmount:0,totalAmount:item.totalPrice}))}}});
    }
    return {draftInvoices:eligible.length};
  }));
  // Refresh the legacy aggregate from actual store balances, never reset balances.
  await db.$executeRaw`UPDATE product_variants v SET stock_quantity=x.quantity FROM
    (SELECT product_variant_id,SUM(quantity)::int AS quantity FROM inventory GROUP BY product_variant_id) x
    WHERE v.id=x.product_variant_id AND v.sku LIKE 'GU-V-%' AND v.stock_quantity<>x.quantity`;
  await db.auditLog.upsert({where:{id:demoId('audit','dataset-v1')},update:{},create:{id:demoId('audit','dataset-v1'),userId:adminId,action:'CREATE_DEMO_DATA',entityType:'DEMO_DATASET',entityId:demoId('dataset','v1'),newData:{version:'demo-v1',source:'local seed runner',externalPayments:false,outgoingEmail:false}}});
  console.log('Demo scenarios completed. All cash movements are simulated; outgoing fixture emails are cancelled.');
}

async function seedReturns(online,catalog){
  const variants=catalog.products.flatMap(p=>p.variants).sort((a,b)=>a.price-b.price);
  const specs=[
    {key:'partial-refund',source:0,type:'REFUND',complete:true},
    {key:'requested-refund',source:5,type:'REFUND',complete:false},
    {key:'exchange-credit',source:4,type:'EXCHANGE',complete:true,replacement:variants[0]},
    {key:'exchange-topup',source:6,type:'EXCHANGE',complete:true,replacement:variants.at(-1)},
  ];
  for(const spec of specs){
    const source=online[spec.source];
    const order=await db.order.findUniqueOrThrow({where:{id:source.id},include:{items:true}});
    const rma=await step('return:'+spec.key+':create',async()=>{
      const receipt=await db.commandReceipt.findUnique({where:{userId_operation_idempotencyKey:{userId:userId(source.customerIndex),operation:'RETURN_CREATE',idempotencyKey:'demo-v1:return:'+spec.key}}});
      if(receipt)return receipt.result;
      return rt.returns.create(userId(source.customerIndex),'demo-v1:return:'+spec.key,{orderId:order.id,type:spec.type,reason:'CUSTOMER_CHANGE_MIND',items:[{orderItemId:order.items[0].id,quantity:1}],...(spec.replacement&&{replacements:[{productVariantId:spec.replacement.id,quantity:1}]})});
    });
    if(!spec.complete)continue;
    await step('return:'+spec.key+':inspect',()=>db.transaction(async tx=>{
      let row=await tx.returnOrder.findUniqueOrThrow({where:{id:rma.id},include:{items:true}});
      if(row.status==='COMPLETED')return {id:row.id};
      const sequence=['REQUESTED','APPROVED','RECEIVED','INSPECTED'];
      for(let index=sequence.indexOf(row.status)+1;index<sequence.length;index++){
        const status=sequence[index];
        await tx.returnOrder.update({where:{id:row.id},data:{status,handledBy:adminId,adminNote:'DEMO: kiểm tra hàng nguyên trạng để nhập lại kho'}});
        await rt.integration.returnStatusChanged(tx,row.id,adminId,'DEMO_'+status,'Kịch bản kiểm tra và xử lý nội bộ');
      }
      for(const item of row.items){
        if(item.restockBatchId)continue;
        const trace=await tx.orderItemBatch.findFirstOrThrow({where:{orderItemId:item.orderItemId},include:{batch:true},orderBy:{id:'asc'}});
        await tx.batch.update({where:{id:trace.batchId},data:{quantity:{increment:item.quantity}}});
        await tx.inventory.update({where:{storeId_productVariantId:{storeId:row.storeId,productVariantId:item.productVariantId}},data:{quantity:{increment:item.quantity}}});
        await tx.inventoryTransaction.create({data:{id:demoId('return-stock',item.id),storeId:row.storeId,productVariantId:item.productVariantId,batchId:trace.batchId,transactionType:'IN',quantity:item.quantity,referenceType:'RETURN',referenceId:row.id,createdBy:adminId,note:'DEMO: nhập lại lô gốc sau kiểm tra hàng nguyên trạng'}});
        await tx.returnOrderItem.update({where:{id:item.id},data:{condition:'RESALEABLE',restockStoreId:row.storeId,restockBatchId:trace.batchId,note:'DEMO: hàng nguyên trạng'}});
      }
      if(spec.type==='EXCHANGE')await rt.returns.prepareExchangeQuote(tx,row.id);
      else await rt.integration.reserveRefund(tx,row.id,row.items.reduce((sum,i)=>sum+Number(i.refundAmount),0));
      return {id:row.id};
    }));
    if(spec.type==='EXCHANGE'){
      const exchange=await step('return:'+spec.key+':accept',async()=>{
        const previous=await db.exchangeSettlement.findUnique({where:{returnOrderId:rma.id}});
        if(previous)return {replacementOrderId:previous.replacementOrderId};
        let row=await db.returnOrder.findUniqueOrThrow({where:{id:rma.id}});
        if(!row.quoteExpiresAt||row.quoteExpiresAt<=new Date()){
          await db.transaction(tx=>rt.returns.prepareExchangeQuote(tx,row.id));
          row=await db.returnOrder.findUniqueOrThrow({where:{id:rma.id}});
        }
        return rt.returns.accept(userId(source.customerIndex),rma.id,'demo-v1:exchange:'+spec.key,{quoteVersion:row.quoteVersion,paymentMethod:'COD'});
      });
      await db.order.updateMany({where:{id:exchange.replacementOrderId,note:null},data:{note:'DEMO:EXCHANGE:'+spec.key}});
      await step('return:'+spec.key+':replacement-completed',async()=>{await advance(exchange.replacementOrderId,'COMPLETED');return {id:exchange.replacementOrderId};});
    }
    await step('return:'+spec.key+':complete',()=>db.transaction(async tx=>{
      const row=await tx.returnOrder.findUniqueOrThrow({where:{id:rma.id}});
      if(row.status==='COMPLETED')return {id:row.id};
      const refunds=await tx.refund.findMany({where:{returnOrderId:row.id},include:{payment:true}});
      for(const refund of refunds){
        if(!['CASH','COD'].includes(refund.payment?.paymentMethod))throw new Error('Demo runner may only settle simulated cash refunds');
        if(refund.status!=='COMPLETED')await tx.refund.update({where:{id:refund.id},data:{status:'COMPLETED',processedAt:new Date(),refundTransactionId:'DEMO-CASH-'+refund.id}});
        await rt.integration.refundCompleted(tx,refund.id);
      }
      await rt.integration.completeReturn(tx,row.id,adminId);
      return {id:row.id};
    }));
  }
}
main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
