import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { PublicCatalogService } from '../src/modules/products/application/services/public-catalog.service';
import { ProductFilterDto } from '../src/modules/products/presentation/dtos/product-filter.dto';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

async function run() {
  const value = process.env.SPRINT6_TEST_DATABASE_URL;
  if (!value) throw new Error('Explicit isolated SPRINT6_TEST_DATABASE_URL is required');
  const url = new URL(value);
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !/^sprint6_benchmark_[a-z0-9_]+$/.test(url.searchParams.get('schema') ?? '')
  )
    throw new Error('Refusing non-local/non-benchmark database');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: value },
    stdio: 'pipe',
  });
  const db = new PrismaClient({
    datasources: { db: { url: value } },
    log: [{ level: 'query', emit: 'event' }],
  });
  let queryCount = 0;
  db.$on('query', () => {
    queryCount++;
  });
  try {
    await db.$executeRaw`INSERT INTO categories(id,name,slug) SELECT md5('s6-cat-'||n)::uuid,'Benchmark category '||n,'s6-bench-cat-'||n FROM generate_series(1,100) n ON CONFLICT DO NOTHING`;
    await db.$executeRaw`INSERT INTO products(id,category_id,name,slug,sku,base_price) SELECT md5('s6-prod-'||n)::uuid,md5('s6-cat-'||((n%100)+1))::uuid,'Benchmark product '||n,'s6-bench-product-'||n,'S6-BENCH-'||n,100000+n FROM generate_series(1,10000) n ON CONFLICT DO NOTHING`;
    await db.$executeRaw`INSERT INTO product_variants(id,product_id,sku,price,cost_price) SELECT md5('s6-var-'||n)::uuid,md5('s6-prod-'||n)::uuid,'S6-VARIANT-'||n,100000+n,50000 FROM generate_series(1,10000) n ON CONFLICT DO NOTHING`;
    await db.$executeRaw`INSERT INTO blog_posts(id,title,slug,content,status,published_at) SELECT md5('s6-blog-'||n)::uuid,'Benchmark post '||n,'s6-bench-post-'||n,'Synthetic benchmark content','PUBLISHED',now()-interval '1 day' FROM generate_series(1,10000) n ON CONFLICT DO NOTHING`;
    await db.$executeRaw`ANALYZE products`;
    await db.$executeRaw`ANALYZE product_variants`;
    await db.$executeRaw`ANALYZE blog_posts`;
    const explain =
      await db.$queryRaw`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT p.id,MIN(sprint5_variant_price(v.id,0::numeric)) AS effective_price FROM products p JOIN categories c ON c.id=p.category_id JOIN product_variants v ON v.product_id=p.id AND v.is_active=true LEFT JOIN brands b ON b.id=p.brand_id WHERE p.is_active=true AND c.is_active=true AND (p.brand_id IS NULL OR b.is_active=true) GROUP BY p.id ORDER BY effective_price,p.id LIMIT 20`;
    const blogExplain =
      await db.$queryRaw`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,slug,published_at FROM blog_posts WHERE status='PUBLISHED' AND published_at<=now() ORDER BY published_at DESC,id LIMIT 20`;
    const catalog = new PublicCatalogService(db as unknown as PrismaService);
    await catalog.list(
      Object.assign(new ProductFilterDto(), {
        page: 1,
        limit: 20,
        sortBy: 'price_asc',
      }),
    );
    queryCount = 0;
    const times: number[] = [];
    let errors = 0;
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let i = 0; i < 5; i++) {
          const now = performance.now();
          try {
            const result = await catalog.list(
              Object.assign(new ProductFilterDto(), {
                page: 1 + i,
                limit: 20,
                sortBy: 'price_asc',
              }),
            );
            if (result.items.length !== 20 || result.total !== 10000)
              throw new Error('Invalid catalog projection');
          } catch {
            errors++;
          }
          times.push(performance.now() - now);
        }
      }),
    );
    const measuredQueries = queryCount;
    const end = performance.now();
    queryCount = 0;
    await catalog.list(
      Object.assign(new ProductFilterDto(), {
        page: 1,
        limit: 100,
        sortBy: 'price_asc',
      }),
    );
    const queriesForPage100 = queryCount;
    times.sort((a, b) => a - b);
    const evidence = {
      checkedAt: new Date().toISOString(),
      node: process.version,
      postgres: await db.$queryRaw`SHOW server_version`,
      dataset: {
        products: 10000,
        variants: 10000,
        categories: 100,
        blogPosts: 10000,
        orders: 0,
        reviews: 0,
        notifications: 0,
      },
      workload:
        'Local PostgreSQL catalog service, guest, price_asc, pages 1-5, limit 20, DB-only; no HTTP/Redis/ES',
      concurrency: 4,
      requests: times.length,
      p50Ms: times[Math.ceil(times.length * 0.5) - 1],
      p95Ms: times[Math.ceil(times.length * 0.95) - 1],
      elapsedMs: end - start,
      errors,
      queries: measuredQueries,
      queriesPerRequest: measuredQueries / times.length,
      queriesForPage100,
      explain,
      blogExplain,
    };
    mkdirSync('.tmp', { recursive: true });
    writeFileSync('.tmp/sprint6-benchmark.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ ...evidence, explain: 'saved', blogExplain: 'saved' }));
    if (errors) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Benchmark failed');
  process.exitCode = 1;
});
