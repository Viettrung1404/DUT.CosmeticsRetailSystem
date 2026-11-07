import { PrismaClient } from '@prisma/client';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

async function run() {
  const value = process.env.SPRINT6_TEST_DATABASE_URL;
  if (!value) throw new Error('Explicit SPRINT6_TEST_DATABASE_URL is required');
  const url = new URL(value);
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !/^sprint6_upgrade_[a-z0-9_]+$/.test(url.searchParams.get('schema') ?? '')
  )
    throw new Error('Refusing non-local/non-upgrade schema');
  const base = resolve('.tmp', `sprint6-migrations-${randomUUID()}`);
  mkdirSync(base, { recursive: true });
  copyFileSync('prisma/schema.prisma', `${base}/schema.prisma`);
  mkdirSync(`${base}/migrations`);
  copyFileSync('prisma/migrations/migration_lock.toml', `${base}/migrations/migration_lock.toml`);
  for (const entry of readdirSync('prisma/migrations', { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.includes('sprint6')) continue;
    mkdirSync(`${base}/migrations/${entry.name}`);
    copyFileSync(
      `prisma/migrations/${entry.name}/migration.sql`,
      `${base}/migrations/${entry.name}/migration.sql`,
    );
  }
  const migrate = (schema: string) =>
    execFileSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', schema],
      { env: { ...process.env, DATABASE_URL: value }, stdio: 'pipe' },
    );
  migrate(`${base}/schema.prisma`);
  const db = new PrismaClient({ datasources: { db: { url: value } } });
  try {
    const oldDate = new Date('2026-01-15T00:00:00Z');
    const user = randomUUID(),
      post = randomUUID();
    await db.$executeRaw`INSERT INTO roles(id,name,display_name) VALUES (6,'Customer','Customer') ON CONFLICT DO NOTHING`;
    await db.$executeRaw`INSERT INTO users(id,email,full_name,role_id) VALUES (${user}::uuid,'migration-fixture@example.test','Existing customer',6)`;
    await db.$executeRaw`INSERT INTO blog_posts(id,title,slug,content,updated_at) VALUES (${post}::uuid,'Old post','old-migration-fixture','Existing content',${oldDate})`;
    migrate('prisma/schema.prisma');
    const retained = await db.blogPost.findUniqueOrThrow({ where: { id: post } });
    if (
      retained.content !== 'Existing content' ||
      retained.contentUpdatedAt.getTime() !== oldDate.getTime()
    )
      throw new Error('Backfill did not preserve existing content/timestamp');
    if (!(await db.user.findUnique({ where: { id: user } })))
      throw new Error('Existing customer was lost');
    const generated = await db.$queryRaw<
      { is_generated: string }[]
    >`SELECT is_generated FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='inventory' AND column_name='available_quantity'`;
    if (generated[0]?.is_generated !== 'ALWAYS')
      throw new Error('Inventory generated column changed');
    const evidence = {
      checkedAt: new Date().toISOString(),
      upgradeFromSprint5WithExistingData: true,
      blogTimestampBackfilled: true,
      existingCustomerPreserved: true,
      generatedInventoryPreserved: true,
    };
    mkdirSync('.tmp', { recursive: true });
    writeFileSync('.tmp/sprint6-upgrade.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence));
  } finally {
    await db.$disconnect();
  }
}
run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration upgrade check failed');
  process.exitCode = 1;
});
