import { Controller, Get, INestApplication, Param } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { TieredThrottlerGuard } from '../tiered-throttler.guard';
import { PublicReadThrottle } from '../public-read-throttle.decorator';
import { Public } from '../../decorators/public.decorator';
import { BrandController } from '../../../modules/customer-experience/presentation/brand.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('customer/products')
class CatalogFixture {
  @Public()
  @Get('search')
  @PublicReadThrottle('search')
  search() { return { ok: true }; }

  @Public()
  @Get(':slug')
  @PublicReadThrottle('catalog')
  detail(@Param('slug') slug: string) { return { slug }; }
}

describe('Catalog limiter over HTTP (isolated store)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [CatalogFixture, BrandController],
      providers: [
        { provide: APP_GUARD, useClass: TieredThrottlerGuard },
        { provide: PrismaService, useValue: { brand: { findFirst: jest.fn(async () => ({ id: 'honey', name: 'Honey', slug: 'honey', logoUrl: null, bannerUrl: null })) } } },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  it('combines all slugs for one peer; arbitrary forwarded headers cannot evade the quota', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get(`/customer/products/slug-${i}`).expect(200);
    }
    const blocked = await request(app.getHttpServer())
      .get('/customer/products/another-slug').set('X-Forwarded-For', '203.0.113.22').expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('keeps the expensive search handler at 30/min and independent of detail', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app.getHttpServer()).get(`/customer/products/search?q=${i}`).expect(200);
    }
    const blocked = await request(app.getHttpServer()).get('/customer/products/search?q=next').expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('reproduces /brands/honey 429 on the real BrandController with an isolated limiter and stubbed DB', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/brands/honey').expect(200);
    }
    const blocked = await request(app.getHttpServer()).get('/brands/honey').expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(60);
    // Other brands are handled by the same method and share the exhausted bucket.
    await request(app.getHttpServer()).get('/brands/other-brand').expect(429);
  });
});
