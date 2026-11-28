import { PrismaClient } from '@prisma/client';

describe('Migration: P2 Schema Additions (CarrierClaims & ReturnAbuseEvaluations)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Bảng carrier_claims và return_abuse_evaluations tồn tại trong database', async () => {
    const carrierClaimsCount = await prisma.carrierClaim.count();
    expect(typeof carrierClaimsCount).toBe('number');

    const abuseEvalsCount = await prisma.returnAbuseEvaluation.count();
    expect(typeof abuseEvalsCount).toBe('number');
  });

  it('2. Model ReturnOrder hỗ trợ các trường riskScore, riskLevel, isFraudFlagged', async () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const result = await prisma.returnOrder.findUnique({
      where: { id: dummyId },
      select: {
        id: true,
        riskScore: true,
        riskLevel: true,
        isFraudFlagged: true,
        fraudReason: true,
      },
    });
    expect(result).toBeNull();
  });
});
