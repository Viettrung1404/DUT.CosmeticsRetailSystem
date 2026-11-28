import { PrismaClient } from '@prisma/client';
import { seedDefaultReturnPolicy } from '../seeds/return-policy.seed';
import {
  ReturnReasonCode,
  ShippingFeeBearer,
} from '../../domain/entities/return-policy.entity';

describe('EP13-T01: Return Policy Versions & Rules Schema Verification', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should seed or retrieve the default return policy version with 6 standard rules', async () => {
    const policy = await seedDefaultReturnPolicy(prisma);

    expect(policy).toBeDefined();
    expect(policy.versionName).toBe('POLICY-V1-2026');
    expect(policy.isActive).toBe(true);
    expect(policy.rules.length).toBeGreaterThanOrEqual(6);

    const allergicRule = policy.rules.find(
      (r) => r.reasonCode === ReturnReasonCode.ALLERGIC,
    );
    expect(allergicRule).toBeDefined();
    expect(allergicRule?.requiresManualReview).toBe(true);
    expect(allergicRule?.maxUsagePercentage).toBe(20);
    expect(allergicRule?.shippingFeeBearer).toBe(ShippingFeeBearer.GLOWUP);

    const changeOfMindRule = policy.rules.find(
      (r) => r.reasonCode === ReturnReasonCode.CHANGE_OF_MIND,
    );
    expect(changeOfMindRule).toBeDefined();
    expect(changeOfMindRule?.windowDays).toBe(7);
    expect(changeOfMindRule?.requiresOriginalSeal).toBe(true);
    expect(changeOfMindRule?.shippingFeeBearer).toBe(ShippingFeeBearer.CUSTOMER);
  });

  it('should enforce chk_policy_window_days_positive constraint (window_days > 0)', async () => {
    const policy = await prisma.returnPolicyVersion.findUnique({
      where: { versionName: 'POLICY-V1-2026' },
    });
    expect(policy).toBeDefined();

    await expect(
      prisma.returnPolicyRule.create({
        data: {
          policyVersionId: policy!.id,
          reasonCode: 'INVALID_TEST',
          windowDays: 0, // Violates window_days > 0
          requiresOriginalSeal: false,
          maxUsagePercentage: 0,
          shippingFeeBearer: 'CUSTOMER',
        },
      }),
    ).rejects.toThrow();
  });

  it('should enforce chk_policy_usage_percentage_range constraint (0 <= max_usage_percentage <= 100)', async () => {
    const policy = await prisma.returnPolicyVersion.findUnique({
      where: { versionName: 'POLICY-V1-2026' },
    });
    expect(policy).toBeDefined();

    await expect(
      prisma.returnPolicyRule.create({
        data: {
          policyVersionId: policy!.id,
          reasonCode: 'INVALID_TEST_USAGE',
          windowDays: 7,
          requiresOriginalSeal: false,
          maxUsagePercentage: 150, // Violates <= 100
          shippingFeeBearer: 'CUSTOMER',
        },
      }),
    ).rejects.toThrow();
  });

  it('should enforce chk_policy_shipping_fee_bearer constraint (IN CUSTOMER, GLOWUP)', async () => {
    const policy = await prisma.returnPolicyVersion.findUnique({
      where: { versionName: 'POLICY-V1-2026' },
    });
    expect(policy).toBeDefined();

    await expect(
      prisma.returnPolicyRule.create({
        data: {
          policyVersionId: policy!.id,
          reasonCode: 'INVALID_TEST_BEARER',
          windowDays: 7,
          requiresOriginalSeal: false,
          maxUsagePercentage: 0,
          shippingFeeBearer: 'THIRD_PARTY', // Violates check constraint
        },
      }),
    ).rejects.toThrow();
  });
});
