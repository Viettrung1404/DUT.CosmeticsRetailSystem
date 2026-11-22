const { PrismaClient } = require('../../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Running DDL on PostgreSQL...');
  await prisma.$executeRawUnsafe('ALTER TABLE products ADD COLUMN IF NOT EXISTS how_to_use TEXT;');
  console.log('Added how_to_use to products.');
  await prisma.$executeRawUnsafe('ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB;');
  console.log('Added specifications to products.');
  await prisma.$executeRawUnsafe('ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS purpose VARCHAR(500);');
  console.log('Added purpose to product_ingredients.');
  console.log('All DDL statements executed successfully!');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Migration error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
