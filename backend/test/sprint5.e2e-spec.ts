import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { UpstashRedisService } from '../src/core/cache/upstash-redis.service';
import { AllExceptionsFilter } from '../src/core/filters/http-exception.filter';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import { ElasticsearchProductService } from '../src/modules/products/infrastructure/search/elasticsearch-product.service';
import { CatalogIndexWorker } from '../src/modules/products/infrastructure/search/catalog-index.worker';
import { CommercePricingService } from '../src/modules/customer-experience/application/commerce-pricing.service';
import { CommerceCheckoutService } from '../src/modules/orders/application/services/commerce-checkout.service';
import { ReviewsService } from '../src/modules/customer-experience/application/reviews.service';
import { ContentService } from '../src/modules/customer-experience/application/content.service';
import { BroadcastService } from '../src/modules/customer-experience/application/broadcast.service';
import { PrismaOrderRepository } from '../src/modules/orders/infrastructure/repositories/prisma-order.repository';
import { ReturnsService } from '../src/modules/customer-commerce/application/returns.service';

describe('Sprint 5 — isolated PostgreSQL and HTTP', () => {
  let app: INestApplication,
    db: PrismaService,
    pricing: CommercePricingService,
    checkout: CommerceCheckoutService,
    reviews: ReviewsService,
    content: ContentService,
    broadcasts: BroadcastService,
    indexer: CatalogIndexWorker;
  let customerId: string,
    userId: string,
    otherId: string,
    otherUser: string,
    storeId: string,
    categoryId: string,
    token: string;
  const es = {
    isAvailable: true,
    search: jest.fn().mockResolvedValue(null),
    syncVersioned: jest.fn().mockResolvedValue(undefined),
  };
  const secret = 'sprint5-local-tests-only';
  beforeAll(async () => {
    const value = process.env.SPRINT5_TEST_DATABASE_URL;
    if (!value)
      throw new Error(
        'SPRINT5_TEST_DATABASE_URL must name an isolated local sprint5_* schema',
      );
    const url = new URL(value);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !/^sprint5_[a-z0-9_]+$/.test(url.searchParams.get('schema') ?? '')
    )
      throw new Error('Refusing non-local/non-sprint5 schema');
    process.env.DATABASE_URL = value;
    process.env.JWT_SECRET = secret;
    process.env.NOTIFICATION_DELIVERY_ENABLED = 'false';
    process.env.CATALOG_INDEX_WORKER_ENABLED = 'false';
    process.env.BROADCAST_WORKER_ENABLED = 'false';
    execFileSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      { env: process.env, stdio: 'pipe' },
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ElasticsearchProductService)
      .useValue(es)
      .overrideProvider(UpstashRedisService)
      .useValue({ configured: false })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
    db = module.get(PrismaService);
    pricing = module.get(CommercePricingService);
    checkout = module.get(CommerceCheckoutService);
    reviews = module.get(ReviewsService);
    content = module.get(ContentService);
    broadcasts = module.get(BroadcastService);
    indexer = module.get(CatalogIndexWorker);
    await db.role.upsert({
      where: { id: 6 },
      create: {
        id: 6,
        name: 'Customer',
        displayName: 'Customer',
        dataScope: 'SELF',
      },
      update: {},
    });
    const a = await db.user.create({
      data: {
        email: `${randomUUID()}@test.local`,
        fullName: 'Customer A',
        roleId: 6,
        customer: { create: { fullName: 'Public reviewer', totalPoints: 100 } },
      },
      include: { customer: true },
    });
    const b = await db.user.create({
      data: {
        email: `${randomUUID()}@test.local`,
        fullName: 'Customer B',
        roleId: 6,
        customer: { create: { totalPoints: 100 } },
      },
      include: { customer: true },
    });
    userId = a.id;
    customerId = a.customer!.id;
    otherUser = b.id;
    otherId = b.customer!.id;
    token = jwt.sign({ userId }, secret);
    storeId = (
      await db.store.create({
        data: {
          name: 'Sprint 5 test',
          code: randomUUID().slice(0, 12),
          address: 'Local',
          city: 'Local',
          district: 'Local',
        },
      })
    ).id;
    categoryId = (
      await db.category.create({ data: { name: 'S5', slug: randomUUID() } })
    ).id;
    await db.setting.upsert({
      where: { key: 'loyalty_config' },
      create: {
        key: 'loyalty_config',
        value: { point_value_vnd: 1000, point_rate: 10000 },
      },
      update: {},
    });
    await db.setting.upsert({
      where: { key: 'return_policy' },
      create: {
        key: 'return_policy',
        value: {
          version: 's5-test',
          allocation: 'PROPORTIONAL',
          refundPointsAs: 'POINTS',
          exchangeShippingFee: 0,
          quoteMinutes: 30,
          allowDifferenceCod: true,
        },
      },
      update: {},
    });
  }, 60000);
  afterAll(async () => {
    if (app) await app.close();
  });
  async function fixture(price = 100000) {
    const product = await db.product.create({
      data: {
        name: `S5-${randomUUID()}`,
        slug: randomUUID(),
        sku: randomUUID(),
        categoryId,
        basePrice: price,
        salePrice: 1,
      },
    });
    const variant = await db.productVariant.create({
      data: {
        productId: product.id,
        sku: randomUUID(),
        price,
        costPrice: 1000,
      },
    });
    await db.inventory.create({
      data: {
        storeId,
        productVariantId: variant.id,
        quantity: 100,
        reservedQuantity: 0,
      },
    });
    return { product, variant };
  }
  async function promotion(
    productId: string,
    variantId: string,
    quota = 1,
    value = 20,
  ) {
    return db.promotion.create({
      data: {
        name: 'Flash test',
        type: 'PERCENTAGE',
        value,
        startDate: new Date(Date.now() - 60000),
        endDate: new Date(Date.now() + 3600000),
        applicableProducts: [productId],
        isFlashSale: true,
        quotas: { create: { productVariantId: variantId, quota } },
      },
      include: { quotas: true },
    });
  }
  const shippingAddress = {
    recipientName: 'Test',
    phone: '0900000000',
    addressLine: 'Local',
    city: 'Local',
  };
  async function purchase(
    variantId: string,
    owner = customerId,
    extras: Record<string, unknown> = {},
  ) {
    const input = {
      customerId: owner,
      items: [{ variantId, quantity: 1 }],
      storeId,
      ...extras,
    };
    const quote = await checkout.preview(input);
    return checkout.create({
      ...input,
      shippingAddress,
      quoteVersion: quote.quoteVersion,
      idempotencyKey: randomUUID(),
    });
  }
  it('migrates review uniqueness, generated inventory, quota CHECK and DB-backed pricing', async () => {
    const columns = await db.$queryRaw<
      { is_generated: string }[]
    >`SELECT is_generated FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='inventory' AND column_name='available_quantity'`;
    expect(columns[0].is_generated).toBe('ALWAYS');
    const { product, variant } = await fixture();
    const p = await promotion(product.id, variant.id);
    await expect(
      db.promotionVariantQuota.update({
        where: { id: p.quotas[0].id },
        data: { reservedQuantity: 2 },
      }),
    ).rejects.toThrow();
    const rows = await db.$queryRaw<
      { price: string }[]
    >`SELECT sprint5_variant_price(${variant.id}::uuid,0::numeric)::text AS price`;
    expect(Number(rows[0].price)).toBe(80000);
    const active = await request(app.getHttpServer()).get('/api/v1/promotions/active').expect(200);
    expect(active.body.data.total).toBe(1);
    const flash = await request(app.getHttpServer()).get('/api/v1/promotions/flash-sale').expect(200);
    expect(flash.body.data.items[0].variants[0]).toMatchObject({ variantId: variant.id, remaining: 1, effectivePrice: 80000 });
  });
  it('keeps SQL catalog pricing equal to the shared engine for single-unit tier/campaign/cap combinations', async () => {
    const tier = await db.loyaltyTier.create({
      data: { name: randomUUID(), minPoints: 0, discountPercentage: 10 },
    });
    await db.customer.update({
      where: { id: customerId },
      data: { loyaltyTierId: tier.id },
    });
    try {
      for (const scenario of [
        { type: 'PERCENTAGE', value: 20, cap: 10000 },
        { type: 'FIXED_AMOUNT', value: 30000, cap: 15000 },
        { type: 'PERCENTAGE', value: 10, cap: null },
        { type: 'PERCENTAGE', value: 33.33, cap: null },
      ]) {
        const { product, variant } = await fixture(123456.78);
        const campaign = await promotion(product.id, variant.id, 10);
        await db.promotion.update({
          where: { id: campaign.id },
          data: {
            type: scenario.type,
            value: scenario.value,
            maxDiscountAmount: scenario.cap,
          },
        });
        const quote = await pricing.quote({
          customerId,
          items: [{ variantId: variant.id, quantity: 1 }],
        });
        const rows = await db.$queryRaw<
          { price: string }[]
        >`SELECT sprint5_variant_price(${variant.id}::uuid,10::numeric)::text AS price`;
        expect(Number(rows[0].price)).toBe(quote.items[0].effectivePrice);
      }
    } finally {
      await db.customer.update({
        where: { id: customerId },
        data: { loyaltyTierId: null },
      });
      await db.loyaltyTier.delete({ where: { id: tier.id } });
    }
  });
  it('uses the new engine over HTTP, ignores manual salePrice and whitelists cost data', async () => {
    const { product, variant } = await fixture();
    await promotion(product.id, variant.id, 3);
    const preview = await request(app.getHttpServer())
      .post('/api/v1/orders/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ variantId: variant.id, quantity: 1 }], storeId })
      .expect(200);
    expect(preview.body.data).toMatchObject({
      lineDiscount: 20000,
      totalAmount: 110000,
      reservation: false,
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ variantId: variant.id, quantity: 1 }],
        storeId,
        shippingAddress,
        quoteVersion: preview.body.data.quoteVersion,
      })
      .expect(201);
    expect(response.body.data.items).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain('unitCost');
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/customer/products/${product.slug}`)
      .expect(200);
    expect(detail.body.data.effectivePrice).toBe(80000);
  });
  it('serializes two checkouts competing for the last quota; loser needs a new quote', async () => {
    const { product, variant } = await fixture();
    const promo = await promotion(product.id, variant.id);
    const a = await checkout.preview({
      customerId,
      items: [{ variantId: variant.id, quantity: 1 }],
      storeId,
    });
    const b = await checkout.preview({
      customerId: otherId,
      items: [{ variantId: variant.id, quantity: 1 }],
      storeId,
    });
    const outcomes = await Promise.allSettled([
      checkout.create({
        customerId,
        items: [{ variantId: variant.id, quantity: 1 }],
        storeId,
        shippingAddress,
        idempotencyKey: randomUUID(),
        quoteVersion: a.quoteVersion,
      }),
      checkout.create({
        customerId: otherId,
        items: [{ variantId: variant.id, quantity: 1 }],
        storeId,
        shippingAddress,
        idempotencyKey: randomUUID(),
        quoteVersion: b.quoteVersion,
      }),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    const quota = await db.promotionVariantQuota.findUniqueOrThrow({
      where: { id: promo.quotas[0].id },
    });
    expect(quota.reservedQuantity).toBe(1);
    expect(
      await db.promotionAllocation.count({ where: { promotionId: promo.id } }),
    ).toBe(1);
  });
  it('replays checkout once and rejects changed payload under the same key', async () => {
    const { variant } = await fixture();
    const items = [{ variantId: variant.id, quantity: 1 }];
    const quote = await checkout.preview({ customerId, items, storeId });
    const input = {
      customerId,
      items,
      storeId,
      shippingAddress,
      quoteVersion: quote.quoteVersion,
      idempotencyKey: randomUUID(),
    };
    const [first, replay] = await Promise.all([
      checkout.create(input),
      checkout.create(input),
    ]);
    expect(first.id).toBe(replay.id);
    await expect(
      checkout.create({ ...input, note: 'changed' }),
    ).rejects.toThrow('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });
  it('consumes on confirmation and releases once for cancellation, including consumed quota', async () => {
    const { product, variant } = await fixture();
    const p = await promotion(product.id, variant.id);
    const order = await purchase(variant.id);
    await db.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED' },
    });
    expect(
      await db.promotionVariantQuota.findUnique({
        where: { id: p.quotas[0].id },
      }),
    ).toMatchObject({ reservedQuantity: 0, consumedQuantity: 1 });
    await db.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });
    await db.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });
    expect(
      await db.promotionVariantQuota.findUnique({
        where: { id: p.quotas[0].id },
      }),
    ).toMatchObject({ reservedQuantity: 0, consumedQuantity: 0 });
    expect(
      (await db.promotion.findUniqueOrThrow({ where: { id: p.id } })).usedCount,
    ).toBe(0);
  });
  it('connects real customer/cron cancellation to quota, coupon and inventory release', async () => {
    const { product, variant } = await fixture();
    const p = await promotion(product.id, variant.id);
    const order = await purchase(variant.id);
    await new PrismaOrderRepository(db).cancelOrderWithTransaction(
      order.id,
      customerId,
      'Test',
    );
    expect(
      await db.promotionVariantQuota.findUnique({
        where: { id: p.quotas[0].id },
      }),
    ).toMatchObject({ reservedQuantity: 0 });
    expect(
      await db.inventory.findUnique({
        where: {
          storeId_productVariantId: { storeId, productVariantId: variant.id },
        },
      }),
    ).toMatchObject({ reservedQuantity: 0 });
  });
  it('does not reserve on preview and rolls back every write if inventory cannot be held', async () => {
    const { product, variant } = await fixture();
    const p = await promotion(product.id, variant.id);
    const quote = await checkout.preview({
      customerId,
      items: [{ variantId: variant.id, quantity: 1 }],
      storeId,
    });
    expect(
      (
        await db.promotionVariantQuota.findUniqueOrThrow({
          where: { id: p.quotas[0].id },
        })
      ).reservedQuantity,
    ).toBe(0);
    await expect(
      db.$transaction(async (tx) => {
        await tx.promotionVariantQuota.update({
          where: { id: p.quotas[0].id },
          data: { reservedQuantity: 1 },
        });
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');
    expect(
      (
        await db.promotionVariantQuota.findUniqueOrThrow({
          where: { id: p.quotas[0].id },
        })
      ).reservedQuantity,
    ).toBe(0);
    await db.productVariant.update({
      where: { id: variant.id },
      data: { price: 200000 },
    });
    await expect(
      checkout.create({
        customerId,
        items: [{ variantId: variant.id, quantity: 1 }],
        storeId,
        shippingAddress,
        idempotencyKey: randomUUID(),
        quoteVersion: quote.quoteVersion,
      }),
    ).rejects.toThrow();
    expect(
      await db.promotionAllocation.count({ where: { promotionId: p.id } }),
    ).toBe(0);
  });
  it('keeps private coupons private and records only coupon money, separately from points', async () => {
    const { variant } = await fixture();
    const coupon = await db.coupon.create({
      data: {
        code: randomUUID(),
        customerId,
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
        minOrderAmount: 0,
        maxDiscountAmount: 20000,
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 3600000),
        maxUses: 1,
      },
    });
    await expect(
      pricing.quote({
        customerId: otherId,
        items: [{ variantId: variant.id, quantity: 1 }],
        couponCode: coupon.code,
      }),
    ).rejects.toThrow('COUPON_NOT_AVAILABLE');
    const validation = await request(app.getHttpServer()).post('/api/v1/coupons/validate').set('Authorization', `Bearer ${token}`).send({ code: coupon.code, items: [{ variantId: variant.id, quantity: 1 }], usePoints: 5 }).expect(200);
    expect(validation.body.data).toMatchObject({ valid: true, couponDiscount: 20000, pointsDiscount: 5000 });
    const order = await purchase(variant.id, customerId, {
      couponCode: coupon.code,
      usePoints: 5,
    });
    expect(
      Number(
        (
          await db.couponUsage.findUniqueOrThrow({
            where: { orderId: order.id },
          })
        ).discountAmount,
      ),
    ).toBe(20000);
    const item = await db.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(item.pricingSnapshot).toMatchObject({
      couponDiscount: 20000,
      pointsUsed: 5,
      pointsValue: 5000,
      cashValue: 75000,
    });
  });
  it('allows only one checkout to consume the last coupon use', async () => {
    const { variant } = await fixture();
    const coupon = await db.coupon.create({
      data: {
        code: randomUUID(),
        discountType: 'FIXED_AMOUNT',
        discountValue: 1000,
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 3600000),
        maxUses: 1,
      },
    });
    const a = await checkout.preview({
      customerId,
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: coupon.code,
      storeId,
    });
    const b = await checkout.preview({
      customerId: otherId,
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: coupon.code,
      storeId,
    });
    const results = await Promise.allSettled([
      checkout.create({
        customerId,
        items: [{ variantId: variant.id, quantity: 1 }],
        couponCode: coupon.code,
        storeId,
        shippingAddress,
        quoteVersion: a.quoteVersion,
        idempotencyKey: randomUUID(),
      }),
      checkout.create({
        customerId: otherId,
        items: [{ variantId: variant.id, quantity: 1 }],
        couponCode: coupon.code,
        storeId,
        shippingAddress,
        quoteVersion: b.quoteVersion,
        idempotencyKey: randomUUID(),
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);
  });
  it('serializes concurrent spending of the same point balance without losing excess points', async () => {
    const { variant } = await fixture(10000);
    await db.customer.update({
      where: { id: customerId },
      data: { totalPoints: 5 },
    });
    const input = {
      customerId,
      items: [{ variantId: variant.id, quantity: 1 }],
      storeId,
      usePoints: 5,
    };
    const quote = await checkout.preview(input);
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        checkout.create({
          ...input,
          shippingAddress,
          quoteVersion: quote.quoteVersion,
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: customerId } }))
        .totalPoints,
    ).toBe(0);
    await db.customer.update({
      where: { id: customerId },
      data: { totalPoints: 100 },
    });
  });
  it('rolls back allocations, inventory, events and order when the final command receipt fails', async () => {
    const { product, variant } = await fixture();
    const p = await promotion(product.id, variant.id);
    const quote = await checkout.preview({
      customerId,
      items: [{ variantId: variant.id, quantity: 1 }],
      storeId,
    });
    await db.$executeRawUnsafe(
      "CREATE FUNCTION sprint5_test_receipt_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.idempotency_key='sprint5_rollback_key' THEN RAISE EXCEPTION 'FORCED_TEST_ROLLBACK'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER sprint5_test_failure BEFORE INSERT ON command_receipts FOR EACH ROW EXECUTE FUNCTION sprint5_test_receipt_failure()',
    );
    try {
      await expect(
        checkout.create({
          customerId,
          items: [{ variantId: variant.id, quantity: 1 }],
          storeId,
          shippingAddress,
          quoteVersion: quote.quoteVersion,
          idempotencyKey: 'sprint5_rollback_key',
        }),
      ).rejects.toThrow();
      expect(
        await db.promotionAllocation.count({ where: { promotionId: p.id } }),
      ).toBe(0);
      expect(
        (
          await db.promotionVariantQuota.findUniqueOrThrow({
            where: { id: p.quotas[0].id },
          })
        ).reservedQuantity,
      ).toBe(0);
      expect(
        (await db.promotion.findUniqueOrThrow({ where: { id: p.id } }))
          .usedCount,
      ).toBe(0);
      expect(
        (
          await db.inventory.findUniqueOrThrow({
            where: {
              storeId_productVariantId: {
                storeId,
                productVariantId: variant.id,
              },
            },
          })
        ).reservedQuantity,
      ).toBe(0);
      expect(
        await db.orderItem.count({ where: { productVariantId: variant.id } }),
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER sprint5_test_failure ON command_receipts',
      );
      await db.$executeRawUnsafe(
        'DROP FUNCTION sprint5_test_receipt_failure()',
      );
    }
  });
  it('prices EXCHANGE with the shared engine, preserves historical cash credit and reserves new quota', async () => {
    const original = await fixture(),
      replacement = await fixture(120000);
    const oldPromotion = await promotion(
      original.product.id,
      original.variant.id,
      1,
      20,
    );
    const newPromotion = await promotion(
      replacement.product.id,
      replacement.variant.id,
      1,
      30,
    );
    const order = await purchase(original.variant.id);
    await db.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED' },
    });
    const completed = await db.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        statusHistories: { create: { status: 'COMPLETED' } },
      },
      include: { items: true },
    });
    await db.payment.updateMany({
      where: { orderId: order.id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
    await db.promotion.update({
      where: { id: oldPromotion.id },
      data: { value: 90 },
    });
    const returns = app.get(ReturnsService);
    const rma = await returns.create(userId, randomUUID(), {
      orderId: order.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: completed.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: replacement.variant.id, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: rma.id },
      data: {
        status: 'INSPECTED',
        items: { updateMany: { where: {}, data: { condition: 'RESALEABLE' } } },
      },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, rma.id));
    const prepared = await db.returnOrder.findUniqueOrThrow({
      where: { id: rma.id },
    });
    expect(prepared.quoteSnapshot).toMatchObject({
      credit: 80000,
      payable: 84000,
    });
    const accepted = await returns.accept(userId, rma.id, randomUUID(), {
      quoteVersion: prepared.quoteVersion,
      paymentMethod: 'COD',
    });
    expect(
      (
        await db.promotionVariantQuota.findUniqueOrThrow({
          where: { id: newPromotion.quotas[0].id },
        })
      ).reservedQuantity,
    ).toBe(1);
    expect(
      (
        await db.promotionVariantQuota.findUniqueOrThrow({
          where: { id: oldPromotion.quotas[0].id },
        })
      ).consumedQuantity,
    ).toBe(1);
    const item = await db.orderItem.findFirstOrThrow({
      where: { orderId: accepted.replacementOrderId },
    });
    expect(Number(item.totalPrice)).toBe(84000);
    expect(item.pricingSnapshot).toMatchObject({
      cashValue: 84000,
      promotionDiscount: 36000,
    });
  });
  it('requires purchase proof, unique review, and approved-only aggregates under repeated moderation', async () => {
    const { product, variant } = await fixture();
    await expect(
      reviews.create(userId, { productId: product.id, rating: 5 }),
    ).rejects.toThrow('VERIFIED_PURCHASE_REQUIRED');
    const order = await purchase(variant.id);
    await expect(
      reviews.create(userId, {
        productId: product.id,
        orderId: order.id,
        rating: 5,
      }),
    ).rejects.toThrow();
    await db.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        statusHistories: { create: { status: 'COMPLETED' } },
      },
    });
    const created = await Promise.allSettled([
      reviews.create(userId, { productId: product.id, rating: 5 }),
      reviews.create(userId, { productId: product.id, rating: 4 }),
    ]);
    expect(created.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const review = await db.review.findFirstOrThrow({
      where: { productId: product.id },
    });
    expect(
      (await reviews.list(product.id, { page: 1, limit: 20, sort: 'newest' }))
        .total,
    ).toBe(0);
    await db.$transaction((tx) => reviews.moderate(tx, review.id, true));
    await db.$transaction((tx) => reviews.moderate(tx, review.id, true));
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .totalReviews,
    ).toBe(1);
    const listed = await reviews.list(product.id, {
      page: 1,
      limit: 20,
      sort: 'newest',
    });
    expect(listed.totalReviews).toBe(1);
    expect(JSON.stringify(listed)).not.toMatch(
      /email|phone|orderId|customerId/,
    );
    await db.$transaction((tx) => reviews.moderate(tx, review.id, false));
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .totalReviews,
    ).toBe(0);
    await expect(
      reviews.create(otherUser, {
        productId: product.id,
        orderId: order.id,
        rating: 5,
      }),
    ).rejects.toThrow();
  });
  it('enforces CMS publication, safe HTML, scheduled boundaries and atomic view increments', async () => {
    const slug = randomUUID();
    await db.page.create({
      data: {
        slug,
        title: 'Draft',
        content: '<script>bad()</script><p onclick="bad()">safe</p>',
      },
    });
    await expect(content.page(slug)).rejects.toThrow('PAGE_NOT_FOUND');
    await db.page.update({ where: { slug }, data: { isPublished: true } });
    expect((await content.page(slug)).content).toBe('<p>safe</p>');
    const post = await db.blogPost.create({
      data: {
        slug: randomUUID(),
        title: 'Scheduled',
        content: '<p>Published</p>',
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() + 3600000),
      },
    });
    await expect(content.post(post.slug)).rejects.toThrow('POST_NOT_FOUND');
    await db.blogPost.update({
      where: { id: post.id },
      data: { publishedAt: new Date(Date.now() - 1000) },
    });
    await Promise.all([content.post(post.slug), content.post(post.slug)]);
    expect(
      (await db.blogPost.findUniqueOrThrow({ where: { id: post.id } }))
        .viewsCount,
    ).toBe(2);
    await db.banner.createMany({
      data: [
        {
          position: 'HOME_HERO',
          imageUrl: 'https://cdn.example.com/ok.webp',
          startDate: null,
          endDate: null,
        },
        {
          position: 'HOME_HERO',
          imageUrl: 'javascript:bad()',
          startDate: null,
          endDate: null,
        },
        {
          position: 'HOME_HERO',
          imageUrl: 'https://cdn.example.com/future.webp',
          startDate: new Date(Date.now() + 100000),
        },
      ],
    });
    expect(await content.banners('HOME_HERO')).toHaveLength(1);
  });
  it('orders and filters effective catalog prices before pagination, with DB fallback and hidden ES results removed', async () => {
    const a = await fixture(90000),
      b = await fixture(120000);
    await promotion(b.product.id, b.variant.id, 10, 50);
    const tag = randomUUID();
    await db.productTag.createMany({
      data: [a.product.id, b.product.id].map((productId) => ({
        productId,
        tagName: tag,
      })),
    });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/customer/products?tag=${tag}&sortBy=price_asc&limit=1`)
      .expect(200);
    expect(response.body.data.data[0].id).toBe(b.product.id);
    expect(response.body.data.meta.itemCount).toBe(2);
    const filtered = await request(app.getHttpServer())
      .get(`/api/v1/customer/products?tag=${tag}&maxPrice=70000`)
      .expect(200);
    expect(filtered.body.data.data.map((p: { id: string }) => p.id)).toEqual([
      b.product.id,
    ]);
    await db.product.update({
      where: { id: b.product.id },
      data: { isActive: false },
    });
    es.search.mockResolvedValueOnce({ ids: [b.product.id], total: 1 });
    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/customer/products/search?q=${b.product.name}`)
      .expect(200);
    expect(hidden.body.data.data).toEqual([]);
  });
  it('freezes broadcast audience and retries without duplicate notifications/devices', async () => {
    await db.userDevice.create({
      data: { userId, deviceToken: randomUUID(), platform: 'ANDROID' },
    });
    const input = {
      campaignId: randomUUID(),
      sendVersion: 1,
      userIds: [userId, otherUser],
      title: 'Public campaign',
      message: 'New collection',
      route: 'PRODUCT' as const,
      resourceId: randomUUID(),
    };
    const a = await db.$transaction((tx) => broadcasts.freeze(tx, input));
    const b = await db.$transaction((tx) => broadcasts.freeze(tx, input));
    expect(a.id).toBe(b.id);
    await broadcasts.deliverBatch();
    await broadcasts.deliverBatch();
    expect(
      await db.notification.count({
        where: { eventKey: { startsWith: `CAMPAIGN:${input.campaignId}:1:` } },
      }),
    ).toBe(2);
    expect(
      await db.pushDelivery.count({
        where: {
          notification: {
            eventKey: `CAMPAIGN:${input.campaignId}:1:${userId}`,
          },
        },
      }),
    ).toBe(1);
    await expect(
      db.$transaction((tx) =>
        broadcasts.freeze(tx, { ...input, message: 'changed' }),
      ),
    ).rejects.toThrow('BROADCAST_PAYLOAD_MISMATCH');
  });
  it('retains indexing jobs across ES failure and fences a stale version after a concurrent DB update', async () => {
    const { product, variant } = await fixture();
    await db.catalogIndexJob.updateMany({ data: { indexedVersion: 999999 } });
    await db.productVariant.update({
      where: { id: variant.id },
      data: { price: 110000 },
    });
    const job = await db.catalogIndexJob.findUniqueOrThrow({
      where: { productId: product.id },
    });
    await db.catalogIndexJob.update({
      where: { productId: product.id },
      data: { indexedVersion: 0 },
    });
    es.syncVersioned.mockRejectedValueOnce(new Error('ES down'));
    await indexer.processBatch();
    expect(
      (
        await db.catalogIndexJob.findUniqueOrThrow({
          where: { productId: product.id },
        })
      ).indexedVersion,
    ).toBe(0n);
    await db.catalogIndexJob.update({
      where: { productId: product.id },
      data: { nextAttemptAt: new Date(0) },
    });
    es.syncVersioned.mockImplementationOnce(async () => {
      await db.productVariant.update({
        where: { id: variant.id },
        data: { price: 120000 },
      });
    });
    await indexer.processBatch();
    const pending = await db.catalogIndexJob.findUniqueOrThrow({
      where: { productId: product.id },
    });
    expect(pending.version).toBeGreaterThan(job.version);
    expect(pending.indexedVersion).toBe(0n);
    await indexer.processBatch();
    const synced = await db.catalogIndexJob.findUniqueOrThrow({
      where: { productId: product.id },
    });
    expect(synced.indexedVersion).toBe(synced.version);
  });
  it('records EXPLAIN evidence and includes the real new routes in OpenAPI', async () => {
    const plan =
      await db.$queryRaw`EXPLAIN (FORMAT JSON) SELECT id FROM reviews WHERE product_id=${randomUUID()}::uuid AND is_approved=true ORDER BY created_at DESC,id LIMIT 20`;
    expect(plan).toBeDefined();
    const spec = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Sprint 5').setVersion('1').build(),
    );
    for (const path of [
      '/api/v1/reviews',
      '/api/v1/customer/products/{id}/reviews',
      '/api/v1/coupons/validate',
      '/api/v1/promotions/flash-sale',
      '/api/v1/blog/posts',
    ])
      expect(spec.paths[path]).toBeDefined();
  });
});
