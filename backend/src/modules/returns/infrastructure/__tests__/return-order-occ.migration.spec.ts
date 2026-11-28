import { PrismaClient } from '@prisma/client';

describe('EP18 Database Migration: ReturnOrder Version & Work Queue Indexes', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. should verify version column exists in return_orders table and defaults to 1', async () => {
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'return_orders' AND column_name = 'version'
    `);

    expect(columns).toHaveLength(1);
    expect(columns[0].column_name).toBe('version');
    expect(columns[0].data_type).toBe('integer');
    expect(columns[0].column_default).toContain('1');
  });

  it('2. should verify index on (status, created_at, dropoff_location_id) exists', async () => {
    const indexes: any[] = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'return_orders' AND indexname = 'return_orders_status_created_at_dropoff_location_id_idx'
    `);

    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain('status');
    expect(indexes[0].indexdef).toContain('created_at');
    expect(indexes[0].indexdef).toContain('dropoff_location_id');
  });
});
