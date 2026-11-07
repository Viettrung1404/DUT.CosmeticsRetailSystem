import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { UpstashRedisService } from '../src/core/cache/upstash-redis.service';
import { InMemoryCacheService } from '../src/core/cache/in-memory-cache.service';
import { VersionedPublicCacheService } from '../src/core/cache/versioned-public-cache.service';
import { AllExceptionsFilter } from '../src/core/filters/http-exception.filter';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import {
  OAuthProviderService,
  VerifiedIdentity,
} from '../src/modules/auth/infrastructure/adapters/oauth-provider.service';
import { EMAIL_SERVICE } from '../src/modules/auth/application/ports/email.port';
import { ElasticsearchProductService } from '../src/modules/products/infrastructure/search/elasticsearch-product.service';
import { JwtTokenService } from '../src/modules/auth/infrastructure/adapters/jwt.service';
import { BcryptService } from '../src/modules/auth/infrastructure/adapters/bcrypt.service';
import { OAuthService } from '../src/modules/auth/application/oauth.service';
import { corsOptions } from '../src/core/config/runtime-config';
import { documentResponseEnvelopes } from '../src/core/common/openapi';

describe('Sprint 6 — isolated PostgreSQL, OAuth and public HTTP contracts', () => {
  let app: INestApplication, db: PrismaService, oauth: OAuthService;
  const providers = { google: jest.fn(), facebook: jest.fn() };
  const mail = {
    sendOAuthVerificationEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };
  const nonce = 'sprint6-client-random-binding-secret';
  const googleBody = {
    idToken: 'provider-token-placeholder-not-a-real-token',
    clientNonce: nonce,
  };
  const identity = (extra: Partial<VerifiedIdentity> = {}): VerifiedIdentity => ({
    provider: 'google',
    subject: randomUUID(),
    email: `${randomUUID()}@gmail.com`,
    fullName: 'OAuth Customer',
    emailAuthoritative: true,
    ...extra,
  });
  const login = (value: VerifiedIdentity) => {
    providers.google.mockResolvedValue(value);
    return request(app.getHttpServer()).post('/api/v1/auth/oauth/google').send(googleBody);
  };
  async function session(userId: string) {
    const row = await db.userSession.create({
      data: {
        userId,
        refreshToken: randomUUID(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return app.get(JwtTokenService).generateAccessToken({
      userId,
      sessionId: row.id,
      roleId: 6,
      roleName: 'Customer',
      dataScope: 'SELF',
      permissionCodes: [],
    });
  }
  beforeAll(async () => {
    const value = process.env.SPRINT6_TEST_DATABASE_URL;
    if (!value)
      throw new Error('SPRINT6_TEST_DATABASE_URL must name an isolated local sprint6_* schema');
    const url = new URL(value);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !/^sprint6_[a-z0-9_]+$/.test(url.searchParams.get('schema') ?? '')
    )
      throw new Error('Refusing non-local/non-sprint6 schema');
    process.env.DATABASE_URL = value;
    process.env.JWT_SECRET = 'sprint6-tests-only-secret-do-not-deploy';
    process.env.PUBLIC_WEB_URL = 'https://shop.example.test';
    process.env.CORS_ALLOWED_ORIGINS =
      'https://shop.example.test,http://localhost:3001,http://127.0.0.1:3001';
    process.env.SEO_INDEXING_ENABLED = 'true';
    process.env.NOTIFICATION_DELIVERY_ENABLED = 'false';
    process.env.CATALOG_INDEX_WORKER_ENABLED = 'false';
    process.env.BROADCAST_WORKER_ENABLED = 'false';
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
      env: process.env,
      stdio: 'pipe',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService())
      .overrideProvider(UpstashRedisService)
      .useValue({ configured: false })
      .overrideProvider(OAuthProviderService)
      .useValue(providers)
      .overrideProvider(EMAIL_SERVICE)
      .useValue(mail)
      .overrideProvider(ElasticsearchProductService)
      .useValue({ isAvailable: false, initIndex: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.enableCors(corsOptions(app.get(ConfigService)));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
    db = module.get(PrismaService);
    oauth = module.get(OAuthService);
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
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('creates exactly one customer/identity under simultaneous first Google sign-in', async () => {
    const value = identity();
    const results = await Promise.all([
      oauth.login(value, nonce, {}),
      oauth.login(value, nonce, {}),
    ]);
    expect(results[0].user!.id).toBe(results[1].user!.id);
    expect(
      await db.userOAuthAccount.count({
        where: { provider: 'google', providerUserId: value.subject },
      }),
    ).toBe(1);
    expect(await db.customer.count({ where: { userId: results[0].user!.id } })).toBe(1);
  });
  it('uses the normal auth contract and immediately rejects a revoked session', async () => {
    const response = await login(identity()).expect(200);
    const { accessToken, refreshToken } = response.body.data;
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(401);
  });
  it('blocks disabled linked users and never changes internal email from provider claims', async () => {
    const value = identity();
    const first = await oauth.login(value, nonce, {});
    await db.user.update({
      where: { id: first.user!.id },
      data: { status: 'BANNED' },
    });
    await expect(oauth.login({ ...value, email: 'changed@gmail.com' }, nonce, {})).rejects.toThrow(
      'ACCOUNT_NOT_ACTIVE',
    );
    expect((await db.user.findUniqueOrThrow({ where: { id: first.user!.id } })).email).toBe(
      value.email,
    );
  });
  it('requires current-account login and fresh email proof before linking even a verified Google email', async () => {
    const value = identity();
    const owner = await db.user.create({
      data: {
        email: value.email!.toUpperCase(),
        fullName: 'Existing',
        emailVerified: true,
      },
    });
    const start = await oauth.login(value, nonce, {});
    expect(start.code).toBe('ACCOUNT_LINK_REQUIRED');
    expect(start.accessToken).toBeUndefined();
    const challenge = { challenge: start.challenge!, clientNonce: nonce };
    await oauth.sendEmail({ ...challenge, email: value.email! });
    const verificationToken = mail.sendOAuthVerificationEmail.mock.calls.at(-1)![1];
    await expect(oauth.complete({ ...challenge, verificationToken }, {})).rejects.toThrow(
      'ACCOUNT_LINK_REQUIRED',
    );
    const attacker = await db.user.create({
      data: {
        email: `${randomUUID()}@test.local`,
        fullName: 'Other',
        emailVerified: true,
      },
    });
    await expect(
      oauth.complete({ ...challenge, verificationToken }, {}, attacker.id),
    ).rejects.toThrow('ACCOUNT_LINK_REQUIRED');
    const linked = await oauth.complete({ ...challenge, verificationToken }, {}, owner.id);
    expect(linked.user.id).toBe(owner.id);
    await expect(oauth.complete({ ...challenge, verificationToken }, {}, owner.id)).rejects.toThrow(
      'OAUTH_CHALLENGE_INVALID',
    );
  });
  it('onboards missing/untrusted provider email only after one-time email verification', async () => {
    const start = await oauth.login(
      identity({
        provider: 'facebook',
        email: undefined,
        emailAuthoritative: false,
      }),
      nonce,
      {},
    );
    const challenge = { challenge: start.challenge!, clientNonce: nonce };
    expect(start.code).toBe('EMAIL_VERIFICATION_REQUIRED');
    await expect(
      oauth.sendEmail({
        ...challenge,
        clientNonce: 'wrong-secret',
        email: 'new@example.test',
      }),
    ).rejects.toThrow('OAUTH_CHALLENGE_INVALID');
    const email = `${randomUUID()}@example.test`;
    await oauth.sendEmail({ ...challenge, email });
    await expect(oauth.sendEmail({ ...challenge, email })).rejects.toThrow(
      'OAUTH_EMAIL_ALREADY_SENT',
    );
    const verificationToken = mail.sendOAuthVerificationEmail.mock.calls.at(-1)![1];
    const attempts = await Promise.allSettled([
      oauth.complete({ ...challenge, verificationToken }, {}),
      oauth.complete({ ...challenge, verificationToken }, {}),
    ]);
    expect(attempts.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await db.user.count({ where: { email } })).toBe(1);
  });
  it('expires onboarding challenges and does not activate accounts when email delivery fails', async () => {
    const start = await oauth.login(
      identity({ email: undefined, emailAuthoritative: false }),
      nonce,
      {},
    );
    mail.sendOAuthVerificationEmail.mockRejectedValueOnce(new Error('test delivery failure'));
    const email = `${randomUUID()}@test.local`;
    await expect(
      oauth.sendEmail({
        challenge: start.challenge!,
        clientNonce: nonce,
        email,
      }),
    ).rejects.toThrow('test delivery failure');
    expect(await db.user.count({ where: { email } })).toBe(0);
    await db.oAuthPendingIdentity.updateMany({
      where: { usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(
      oauth.sendEmail({
        challenge: start.challenge!,
        clientNonce: nonce,
        email,
      }),
    ).rejects.toThrow('OAUTH_CHALLENGE_INVALID');
  });
  it('rotates a password refresh token only once under concurrent requests', async () => {
    const password = 'StrongPassword@123';
    const email = `${randomUUID()}@test.local`;
    await db.user.create({
      data: {
        email,
        fullName: 'Password user',
        emailVerified: true,
        passwordHash: await app.get(BcryptService).hash(password),
      },
    });
    const signed = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/refresh-token')
          .send({ refreshToken: signed.body.data.refreshToken }),
      ),
    );
    expect(results.map((x) => x.status).sort()).toEqual([200, 401]);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(signed.body.data.accessToken, { type: 'bearer' })
      .expect(401);
  });
  it('registers exactly one CRM profile and never inherits an unverified POS phone', async () => {
    const phone = '0901234567';
    const pos = await db.customer.create({ data: { phone, totalPoints: 500 } });
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${randomUUID()}@test.local`,
        password: 'StrongPassword@123',
        fullName: 'Customer',
        phone,
      });
    expect(rejected.status).toBe(409);
    expect((await db.customer.findUniqueOrThrow({ where: { id: pos.id } })).userId).toBeNull();
    const email = `${randomUUID()}@test.local`;
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassword@123', fullName: 'New customer' })
      .expect(201);
    expect(
      await db.customer.count({
        where: { userId: registered.body.data.userId },
      }),
    ).toBe(1);
  });
  it('serves raw XML/text with stable ETag, published data only, encoded slugs and fixed host', async () => {
    const category = await db.category.create({
      data: { name: 'SEO', slug: 'seo-category' },
    });
    await db.product.create({
      data: {
        name: 'Product',
        slug: 'a&<"/ mỹ phẩm',
        sku: randomUUID(),
        categoryId: category.id,
        basePrice: 100,
        variants: { create: { sku: randomUUID(), price: 100, costPrice: 50 } },
      },
    });
    await db.product.create({
      data: {
        name: 'Hidden',
        slug: 'hidden-seo',
        sku: randomUUID(),
        categoryId: category.id,
        basePrice: 100,
        isActive: false,
      },
    });
    await db.blogPost.create({
      data: {
        title: 'Published',
        slug: 'published-seo',
        content: 'Hello',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await db.blogPost.create({
      data: {
        title: 'Future',
        slug: 'future-seo',
        content: 'Hidden',
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() + 86400000),
      },
    });
    const index = await request(app.getHttpServer())
      .get('/api/v1/sitemap.xml')
      .set('Host', 'untrusted.invalid')
      .expect(200)
      .expect('Content-Type', /application\/xml/);
    expect(index.text).toContain('<sitemapindex');
    expect(index.text).toContain('https://shop.example.test/sitemaps/products/1.xml');
    expect(index.text).not.toContain('untrusted.invalid');
    await request(app.getHttpServer())
      .get('/api/v1/sitemap.xml')
      .set('If-None-Match', index.headers.etag)
      .expect(304);
    const products = await request(app.getHttpServer())
      .get('/api/v1/sitemaps/products/1.xml')
      .expect(200);
    expect(products.text).toContain(encodeURIComponent('a&<"/ mỹ phẩm'));
    expect(products.text).not.toContain('hidden-seo');
    const hiddenParent = await db.category.create({
      data: { name: 'Hidden parent', slug: 'hidden-parent', isActive: false },
    });
    await db.category.create({
      data: {
        name: 'Orphaned child',
        slug: 'orphaned-child',
        parentId: hiddenParent.id,
      },
    });
    expect(
      (await request(app.getHttpServer()).get('/api/v1/sitemaps/categories/1.xml')).text,
    ).not.toContain('orphaned-child');
    const blog = await request(app.getHttpServer()).get('/api/v1/sitemaps/blog/1.xml').expect(200);
    expect(blog.text).toContain('published-seo');
    expect(blog.text).not.toContain('future-seo');
    await db.blogPost.update({
      where: { slug: 'published-seo' },
      data: { viewsCount: { increment: 1 } },
    });
    const views = await request(app.getHttpServer()).get('/api/v1/sitemaps/blog/1.xml');
    expect(views.headers.etag).toBe(blog.headers.etag);
    await db.blogPost.update({
      where: { slug: 'published-seo' },
      data: { title: 'Changed content' },
    });
    expect(
      (await request(app.getHttpServer()).get('/api/v1/sitemaps/blog/1.xml')).headers.etag,
    ).not.toBe(blog.headers.etag);
    await request(app.getHttpServer())
      .get('/api/v1/robots.txt')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect(/Sitemap: https:\/\/shop.example.test\/sitemap.xml/);
    await request(app.getHttpServer()).get('/api/v1/sitemaps/invalid/1.xml').expect(400);
  });
  it('invalidates CMS/category metadata across instances, rejects stale fills, and rolls revision back with writer', async () => {
    const shared = new InMemoryCacheService();
    const first = new VersionedPublicCacheService(db, shared),
      second = new VersionedPublicCacheService(db, shared);
    let release!: () => void;
    const pending = first.remember('race', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return 'old';
    });
    while (!release) await new Promise((resolve) => setImmediate(resolve));
    await db.page.create({
      data: {
        title: 'Fresh',
        slug: 'fresh-page',
        content: 'Fresh',
        isPublished: true,
      },
    });
    expect(await second.remember('race', async () => 'fresh')).toBe('fresh');
    release();
    await pending;
    expect(await first.remember('race', async () => 'wrong')).toBe('fresh');
    const before = await db.publicCacheRevision.findUniqueOrThrow({
      where: { id: 1 },
    });
    await expect(
      db.$transaction(async (tx) => {
        await tx.page.create({
          data: { title: 'Rollback', slug: 'rollback', content: 'x' },
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect((await db.publicCacheRevision.findUniqueOrThrow({ where: { id: 1 } })).generation).toBe(
      before.generation,
    );
    shared.onModuleDestroy();
  });
  it('rejects role injection and exposes the shared Facebook onboarding contract over HTTP', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/google')
      .send({ ...googleBody, roleId: 1 })
      .expect(400);
    providers.facebook.mockResolvedValue(
      identity({ provider: 'facebook', email: undefined, emailAuthoritative: false }),
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/facebook')
      .send({ accessToken: 'provider-token-placeholder-not-a-real-token', clientNonce: nonce })
      .expect(200);
    expect(response.body.data).toMatchObject({
      code: 'EMAIL_VERIFICATION_REQUIRED',
      expiresIn: 600,
    });
    expect(response.body.data.accessToken).toBeUndefined();
  });
  it('enforces CORS allowlist and auth limits without trusting spoofed forwarded IP', async () => {
    const good = await request(app.getHttpServer())
      .get('/api/v1/robots.txt')
      .set('Origin', 'https://shop.example.test');
    expect(good.headers['access-control-allow-origin']).toBe('https://shop.example.test');
    const bad = await request(app.getHttpServer())
      .get('/api/v1/robots.txt')
      .set('Origin', 'https://untrusted.invalid');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    providers.facebook.mockRejectedValue(new UnauthorizedException('INVALID_FACEBOOK_TOKEN'));
    const results: request.Response[] = [];
    for (let i = 0; i < 7; i++)
      results.push(
        await request(app.getHttpServer())
          .post('/api/v1/auth/oauth/facebook')
          .set('X-Forwarded-For', `192.0.2.${i}`)
          .send({
            accessToken: 'provider-token-placeholder-not-a-real-token',
            clientNonce: nonce,
          }),
      );
    const blocked = results.find((x) => x.status === 429);
    expect(blocked).toBeDefined();
    expect(Number(blocked!.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('exposes liveness and dependency readiness without connection details', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
  });
  it('accepts Next.js preflight for Bearer, guest cart and idempotent commands', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/orders')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'authorization,content-type,idempotency-key,x-session-id',
      )
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(response.headers['access-control-allow-headers']).toContain('idempotency-key');
    expect(response.headers['access-control-allow-headers']).toContain('x-session-id');
    expect(response.headers['access-control-expose-headers']).toContain('Retry-After');
    const rejected = await request(app.getHttpServer())
      .options('/api/v1/orders')
      .set('Origin', 'https://untrusted.invalid')
      .set('Access-Control-Request-Method', 'POST');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('supports Expo-style native Bearer calls with no browser Origin header', async () => {
    const user = await db.user.create({
      data: {
        email: `${randomUUID()}@test.local`,
        fullName: 'Expo fixture',
        emailVerified: true,
        customer: { create: {} },
      },
    });
    const token = await session(user.id);
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.data.id).toBe(user.id);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await request(app.getHttpServer())
      .post('/api/v1/users/me/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceToken: 'ExpoPushToken[fixture]', platform: 'ANDROID' })
      .expect(400);
  });
  it('exports OpenAPI from the real application for Apidog without credentials', () => {
    const doc = documentResponseEnvelopes(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('GlowUp API')
          .setVersion('1.0')
          .addBearerAuth(undefined, 'JWT-auth')
          .build(),
      ),
    );
    expect(doc.paths['/api/v1/auth/oauth/link'].post!.security).toEqual([{ 'JWT-auth': [] }]);
    expect(doc.paths['/api/v1/sitemap.xml'].get!.responses['200']).toBeDefined();
    const response = doc.paths['/api/v1/auth/oauth/facebook'].post!.responses['200'];
    expect(
      response && !('$ref' in response) && response.content?.['application/json']?.schema,
    ).toMatchObject({ properties: { data: { oneOf: expect.any(Array) } } });
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      if (
        '$ref' in value &&
        typeof value.$ref === 'string' &&
        value.$ref.startsWith('#/components/schemas/')
      )
        expect(doc.components!.schemas![value.$ref.split('/').pop()!]).toBeDefined();
      Object.values(value).forEach(visit);
    };
    visit(doc);
    mkdirSync('docs/api', { recursive: true });
    writeFileSync('docs/api/openapi.json', JSON.stringify(doc, null, 2) + '\n');
    execFileSync(process.execPath, ['scripts/sprint6-export-collection.cjs'], {
      stdio: 'pipe',
    });
  });
});
