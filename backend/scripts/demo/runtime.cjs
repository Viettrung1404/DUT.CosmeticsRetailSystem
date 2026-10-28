require('reflect-metadata');
require('ts-node').register({transpileOnly:true});
require('tsconfig-paths/register');
const path=require('node:path');
const fs=require('node:fs');
const {demoId}=require('./fixtures.cjs');
const ROOT=path.resolve(__dirname,'../../.demo-data');
const load=(file,name)=>require(path.resolve(__dirname,'../../src',file))[name];
function createRuntime(){
  // Instantiate only the required services. No Nest app, mailer, push, payment
  // gateway, scheduler, Elasticsearch worker or external carrier is started.
  process.env.PRISMA_LOG_QUERIES='false';
  const PrismaService=load('infrastructure/database/prisma.service.ts','PrismaService');
  const db=new PrismaService();
  const originalTransaction=db.transaction.bind(db);
  const originalArrayTransaction=db.$transaction.bind(db);
  const transaction=(work,options)=>originalTransaction(async tx=>{
    const value=await work(tx);
    // Cancel fixture email in the SAME transaction before a worker can claim it.
    await tx.emailOutbox.updateMany({where:{recipient:{endsWith:'@demo.glowup.test'},status:'PENDING'},data:{status:'CANCELLED'}});
    return value;
  },{...options,timeout:Math.max(options?.timeout||0,90000),maxWait:15000});
  db.transaction=transaction;
  db.$transaction=(work,options)=>typeof work==='function'?transaction(work,options):originalArrayTransaction(work,options);
  const make=(file,name,...args)=>new (load(file,name))(...args);
  const commands=make('modules/customer-commerce/infrastructure/commands.ts','CustomerCommands',db);
  const pricing=make('modules/customer-experience/application/commerce-pricing.service.ts','CommercePricingService',db);
  const storeProvider=make('modules/orders/infrastructure/adapters/prisma-store-inventory.adapter.ts','PrismaStoreInventoryAdapter',db);
  const resolver=make('modules/orders/application/services/store-resolver.service.ts','StoreResolverService',storeProvider);
  const checkout=make('modules/orders/application/services/commerce-checkout.service.ts','CommerceCheckoutService',db,pricing,commands,resolver);
  const adminOrders=make('modules/orders/infrastructure/repositories/prisma-admin-order.repository.ts','PrismaAdminOrderRepository',db);
  const permissionRepository=make('modules/permissions/infrastructure/persistence/prisma-permission.repository.ts','PrismaPermissionRepository',db);
  const scopes=make('modules/permissions/application/use-cases/get-user-data-scope.use-case.ts','GetUserDataScopeUseCase',permissionRepository);
  const inventory=make('modules/inventory/infrastructure/persistence/prisma-inventory.repository.ts','PrismaInventoryRepository',db);
  const receive=make('modules/inventory/application/use-cases/receive-purchase-order.use-case.ts','ReceivePurchaseOrderUseCase',inventory,scopes);
  const sessions=make('modules/pos/infrastructure/persistence/prisma-pos-session.repository.ts','PrismaPosSessionRepository',db);
  const posOrders=make('modules/pos/infrastructure/persistence/prisma-pos-order.repository.ts','PrismaPosOrderRepository',db);
  const posAccess=make('modules/pos/application/services/pos-store-access.service.ts','PosStoreAccessService',sessions,scopes);
  const planner=make('modules/pos/application/services/pos-sale-planner.service.ts','PosSalePlanner',posOrders,posAccess);
  const pos=make('modules/pos/application/use-cases/create-pos-order.use-case.ts','CreatePosOrderUseCase',planner,posOrders,sessions);
  const open=make('modules/pos/application/use-cases/open-pos-session.use-case.ts','OpenPosSessionUseCase',sessions,scopes);
  const close=make('modules/pos/application/use-cases/close-pos-session.use-case.ts','ClosePosSessionUseCase',sessions,scopes);
  const reconcile=make('modules/pos/application/use-cases/reconcile-pos-session.use-case.ts','ReconcilePosSessionUseCase',sessions,scopes);
  const integration=make('modules/customer-commerce/application/admin-integration.service.ts','CustomerEventIntegration');
  const returns=make('modules/customer-commerce/application/returns.service.ts','ReturnsService',db,commands,integration,pricing);
  const loyalty=make('modules/customer-commerce/application/loyalty.service.ts','LoyaltyService',db,commands);
  const wishlist=make('modules/customer-commerce/application/wishlist.service.ts','WishlistService',db,commands);
  const reviews=make('modules/customer-experience/application/reviews.service.ts','ReviewsService',db);
  const manifestPath=path.join(ROOT,'scenarios.json');
  const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
  async function step(key,work){
    if(Object.hasOwn(manifest,key))return manifest[key];
    const result=await work();
    manifest[key]=JSON.parse(JSON.stringify(result??null));
    fs.writeFileSync(manifestPath+'.tmp',JSON.stringify(manifest,null,2));fs.renameSync(manifestPath+'.tmp',manifestPath);
    console.log('Completed '+key);
    return manifest[key];
  }
  async function codes(userId){
    const user=await db.user.findUniqueOrThrow({where:{id:userId},include:{role:true}});
    const mask=(user.role.permissions|user.extraPermissions)&~user.revokedPermissions;
    return (await db.permission.findMany()).filter(p=>(mask&p.bitValue)!==0n).map(p=>p.permissionCode);
  }
  return {db,step,manifest,commands,pricing,checkout,adminOrders,receive,sessions,planner,pos,open,close,reconcile,integration,returns,loyalty,wishlist,reviews,codes,adminId:demoId('user','admin')};
}
module.exports={createRuntime,ROOT};
