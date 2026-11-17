import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_RETURN_POLICY_VERSION,
  DEFAULT_RETURN_POLICY_RULES,
} from '../../domain/rules/default-policies';

export async function seedDefaultReturnPolicy(prisma: PrismaClient) {
  let policy = await prisma.returnPolicyVersion.findUnique({
    where: { versionName: DEFAULT_RETURN_POLICY_VERSION.versionName },
    include: { rules: true },
  });

  if (!policy) {
    policy = await prisma.returnPolicyVersion.create({
      data: {
        versionName: DEFAULT_RETURN_POLICY_VERSION.versionName,
        effectiveFrom: DEFAULT_RETURN_POLICY_VERSION.effectiveFrom,
        effectiveTo: DEFAULT_RETURN_POLICY_VERSION.effectiveTo,
        isActive: DEFAULT_RETURN_POLICY_VERSION.isActive,
        description: DEFAULT_RETURN_POLICY_VERSION.description,
        rules: {
          create: DEFAULT_RETURN_POLICY_RULES.map((r) => ({
            reasonCode: r.reasonCode,
            windowDays: r.windowDays,
            requiresOriginalSeal: r.requiresOriginalSeal,
            maxUsagePercentage: r.maxUsagePercentage,
            shippingFeeBearer: r.shippingFeeBearer,
            requiresEvidenceVideo: r.requiresEvidenceVideo,
            requiresEvidenceImage: r.requiresEvidenceImage,
            allowStoreDropoff: r.allowStoreDropoff,
            allowCarrierPickup: r.allowCarrierPickup,
            requiresManualReview: r.requiresManualReview,
          })),
        },
      },
      include: { rules: true },
    });
  }

  return policy;
}
