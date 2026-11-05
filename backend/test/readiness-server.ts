import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { UpstashRedisService } from '../src/core/cache/upstash-redis.service';
import { ElasticsearchProductService } from '../src/modules/products/infrastructure/search/elasticsearch-product.service';
import { AllExceptionsFilter } from '../src/core/filters/http-exception.filter';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import { corsOptions } from '../src/core/config/runtime-config';

async function main() {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService).useValue(new ConfigService())
    .overrideProvider(UpstashRedisService).useValue({ configured: false })
    .overrideProvider(ElasticsearchProductService).useValue({ isAvailable: false, initIndex: async () => {}, search: async () => null })
    .compile();
  const app = module.createNestApplication({ rawBody: true, logger: ['error', 'warn'] });
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  app.setGlobalPrefix('api/v1');
  app.enableCors(corsOptions(app.get(ConfigService)));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  await app.init();
  if (process.env.READINESS_NO_SEED === 'true') {
    await app.listen(3300, '127.0.0.1');
    console.log('Readiness API ready using the existing isolated benchmark dataset.');
    return;
  }
  const db = module.get(PrismaService);
  await db.role.create({ data: { id: 6, name: 'Customer', displayName: 'Khách hàng', dataScope: 'SELF' } });
  const password = 'Readiness-Local-Only-123!';
  const customer = await db.user.create({ data: {
    email: 'readiness-customer@test.local', fullName: 'Readiness Customer',
    roleId: 6, emailVerified: true, passwordHash: await hash(password, 10),
    customer: { create: { fullName: 'Readiness Customer', totalPoints: 100000 } },
  }, include: { customer: true } });
  const other = await db.user.create({ data: {
    email: 'readiness-other@test.local', fullName: 'Other Customer',
    roleId: 6, emailVerified: true, passwordHash: await hash(password, 10),
    customer: { create: { fullName: 'Other Customer' } },
  } });
  const store = await db.store.create({ data: { code: 'STORE_ONLINE', name: 'Readiness warehouse', address: 'Test', city: 'Test', district: 'Test' } });
  const category = await db.category.create({ data: { name: 'Readiness skincare', slug: 'readiness-skincare' } });
  const product = await db.product.create({ data: { categoryId: category.id, name: 'Readiness Serum', slug: 'readiness-serum', sku: 'READINESS-SERUM', basePrice: 100000 } });
  const variant = await db.productVariant.create({ data: { productId: product.id, sku: 'READINESS-SERUM-30', option1Value: '30ml', price: 100000, costPrice: 50000 } });
  await db.inventory.create({ data: { storeId: store.id, productVariantId: variant.id, quantity: 100 } });
  await db.setting.create({ data: { key: 'loyalty_config', value: { point_value_vnd: 1, point_rate: 100 } } });
  writeFileSync(process.env.READINESS_FIXTURE_FILE!, JSON.stringify({
    email: customer.email, otherEmail: other.email, password,
    customerId: customer.customer!.id, productId: product.id, variantId: variant.id,
    productSlug: product.slug, storeId: store.id, databaseSchema: new URL(process.env.DATABASE_URL!).searchParams.get('schema'),
    price: 100000, shippingFee: 30000,
  }, null, 2));
  await app.listen(3300, '127.0.0.1');
  console.log('Readiness API ready on 127.0.0.1:3300; database isolated; external providers disabled.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
