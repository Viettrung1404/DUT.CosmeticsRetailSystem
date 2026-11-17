import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnRiskLevel,
  AbuseActionRecommendation,
  RiskFactorDetail,
  ReturnAbuseEvaluationResult,
  CustomerRiskProfileResult,
} from '../../presentation/dtos/return-abuse.dto';

@Injectable()
export class ReturnAbuseDetectorService {
  private readonly logger = new Logger(ReturnAbuseDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đánh giá rủi ro gian lận / lạm dụng đổi trả cho một hồ sơ RMA cụ thể (EP21)
   */
  async evaluateReturnOrder(
    returnOrderId: string,
  ): Promise<ReturnAbuseEvaluationResult> {
    const rma = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!rma) {
      throw new NotFoundException(`Không tìm thấy hồ sơ RMA với ID: ${returnOrderId}`);
    }

    const customerId = rma.customerId;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const factors: RiskFactorDetail[] = [];
    let riskScore = 0;

    // 1. Phân tích Tần suất mua / trả hàng (Frequency Factor)
    const [totalCustomerOrders, recentReturns] = await Promise.all([
      this.prisma.order.count({
        where: { customerId },
      }),
      this.prisma.returnOrder.findMany({
        where: {
          customerId,
          createdAt: { gte: ninetyDaysAgo },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
        },
        include: {
          items: true,
        },
      }),
    ]);

    const returnCount90d = recentReturns.length;
    const returnCount30d = recentReturns.filter(
      (r) => r.createdAt >= thirtyDaysAgo,
    ).length;

    if (totalCustomerOrders > 0) {
      const returnRatio = (returnCount90d / totalCustomerOrders) * 100;
      if (returnRatio >= 50 && returnCount90d >= 2) {
        const pts = 35;
        riskScore += pts;
        factors.push({
          factorCode: 'HIGH_RETURN_RATIO_90D',
          description: `Tỷ lệ trả hàng 90 ngày đạt ${Math.round(returnRatio)}% (>= 50% trên tổng đơn mua)`,
          scoreContribution: pts,
          evidence: { returnCount90d, totalCustomerOrders, returnRatio },
        });
      } else if (returnRatio >= 30 && returnCount90d >= 2) {
        const pts = 20;
        riskScore += pts;
        factors.push({
          factorCode: 'ELEVATED_RETURN_RATIO_90D',
          description: `Tỷ lệ trả hàng 90 ngày đạt ${Math.round(returnRatio)}% (>= 30% trên tổng đơn mua)`,
          scoreContribution: pts,
          evidence: { returnCount90d, totalCustomerOrders, returnRatio },
        });
      }
    }

    if (returnCount30d >= 3) {
      const pts = 15;
      riskScore += pts;
      factors.push({
        factorCode: 'HIGH_RETURN_FREQUENCY_30D',
        description: `Yêu cầu trả hàng ${returnCount30d} lần trong vòng 30 ngày qua`,
        scoreContribution: pts,
        evidence: { returnCount30d },
      });
    }

    // 2. Lịch sử bị từ chối KCS (Rejection / Broken Seal History)
    const failedInspectionItems = await this.prisma.returnOrderItem.count({
      where: {
        returnOrder: { customerId },
        inspectionStatus: 'FAILED',
      },
    });

    if (failedInspectionItems > 0) {
      const pts = Math.min(50, failedInspectionItems * 25);
      riskScore += pts;
      factors.push({
        factorCode: 'PAST_QC_REJECTIONS',
        description: `Khách hàng từng có ${failedInspectionItems} sản phẩm bị KCS đánh giá không đạt (rách seal / tráo hàng / hư hỏng do lỗi người dùng)`,
        scoreContribution: pts,
        evidence: { failedInspectionItems },
      });
    }

    // 3. Khiếu nại kích ứng da lặp lại (Repeated Allergy Claims)
    const allergicReturnsCount = recentReturns.filter((r) =>
      r.items.some((i) => i.reasonCode === 'ALLERGIC'),
    ).length;

    if (allergicReturnsCount >= 2) {
      const pts = 20;
      riskScore += pts;
      factors.push({
        factorCode: 'REPEATED_ALLERGY_CLAIMS',
        description: `Khách hàng nộp khiếu nại dị ứng da ${allergicReturnsCount} lần gần đây trên các dòng sản phẩm khác nhau`,
        scoreContribution: pts,
        evidence: { allergicReturnsCount },
      });
    }

    // 4. Phát hiện trùng lặp bằng chứng đa phương tiện (Duplicate Evidence Media Reuse)
    const currentEvidenceUrls: string[] = [];
    for (const item of rma.items) {
      if (Array.isArray(item.evidenceImages)) {
        currentEvidenceUrls.push(...(item.evidenceImages as string[]));
      }
      if (item.evidenceVideoUrl) {
        currentEvidenceUrls.push(item.evidenceVideoUrl);
      }
    }

    if (currentEvidenceUrls.length > 0) {
      const otherReturnsWithSameEvidence = await this.prisma.returnOrderItem.findMany({
        where: {
          returnOrderId: { not: rma.id },
          OR: currentEvidenceUrls.map((url) => ({
            OR: [
              { evidenceImages: { array_contains: url } },
              { evidenceVideoUrl: url },
            ],
          })),
        },
        select: {
          id: true,
          returnOrderId: true,
          returnOrder: { select: { customerId: true, returnCode: true } },
        },
        take: 3,
      });

      if (otherReturnsWithSameEvidence.length > 0) {
        const pts = 45;
        riskScore += pts;
        const matchingCodes = otherReturnsWithSameEvidence.map(
          (o) => o.returnOrder?.returnCode,
        );
        factors.push({
          factorCode: 'DUPLICATE_EVIDENCE_DETECTED',
          description: `Phát hiện URL hình ảnh/video bằng chứng trùng lặp với hồ sơ RMA khác (${matchingCodes.join(', ')})`,
          scoreContribution: pts,
          evidence: { matchingReturnCodes: matchingCodes },
        });
      }
    }

    // Giới hạn điểm số từ 0 đến 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Xác định phân hạng rủi ro & khuyến nghị xử lý
    let riskLevel: ReturnRiskLevel;
    let actionRecommended: AbuseActionRecommendation;

    if (riskScore >= 80) {
      riskLevel = ReturnRiskLevel.CRITICAL;
      actionRecommended = AbuseActionRecommendation.FLAGGED_FOR_FRAUD_AUDIT;
    } else if (riskScore >= 60) {
      riskLevel = ReturnRiskLevel.HIGH;
      actionRecommended = AbuseActionRecommendation.REQUIRE_SUPERVISOR_APPROVAL;
    } else if (riskScore >= 30) {
      riskLevel = ReturnRiskLevel.MEDIUM;
      actionRecommended = AbuseActionRecommendation.STANDARD_REVIEW;
    } else {
      riskLevel = ReturnRiskLevel.LOW;
      actionRecommended = AbuseActionRecommendation.AUTO_APPROVE_ELIGIBLE;
    }

    const isFlagged = riskScore >= 60;
    const fraudReason = isFlagged
      ? factors.map((f) => `[${f.factorCode}] ${f.description}`).join('; ')
      : null;

    // Lưu kết quả đánh giá vào CSDL
    await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật cờ trên ReturnOrder
      await tx.returnOrder.update({
        where: { id: rma.id },
        data: {
          riskScore,
          riskLevel,
          isFraudFlagged: isFlagged,
          fraudReason,
        },
      });

      // 2. Lưu bản ghi audit ReturnAbuseEvaluation
      await tx.returnAbuseEvaluation.create({
        data: {
          returnOrderId: rma.id,
          customerId,
          riskScore,
          riskLevel,
          isFlagged,
          factors: factors as any,
          actionRecommended,
          evaluatedAt: now,
        },
      });

      // 3. Nếu bị gắn cờ, phát sự kiện Outbox RETURN_ABUSE_FLAGGED
      if (isFlagged) {
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'RETURN_ORDER',
            aggregateId: rma.id,
            eventType: 'RETURN_ABUSE_FLAGGED',
            payload: {
              returnOrderId: rma.id,
              customerId,
              riskScore,
              riskLevel,
              factors: factors as any,
              actionRecommended,
            } as any,
          },
        });
      }
    });

    if (isFlagged) {
      this.logger.warn(
        `[ABUSE_ALERT] Hồ sơ RMA ${rma.returnCode} bị gắn cờ rủi ro ${riskLevel} (${riskScore}đ). Lý do: ${fraudReason}`,
      );
    }

    return {
      returnOrderId: rma.id,
      customerId,
      riskScore,
      riskLevel,
      isFlagged,
      actionRecommended,
      factors,
      evaluatedAt: now,
    };
  }

  /**
   * Truy vấn hồ sơ rủi ro đổi trả tổng thể của một khách hàng (Customer Risk Profile)
   */
  async getCustomerRiskProfile(
    customerId: string,
  ): Promise<CustomerRiskProfileResult> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        returnAbuseEvaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng với ID: ${customerId}`);
    }

    const [totalOrders, returnOrders, failedInspections] = await Promise.all([
      this.prisma.order.count({ where: { customerId } }),
      this.prisma.returnOrder.count({ where: { customerId } }),
      this.prisma.returnOrderItem.count({
        where: {
          returnOrder: { customerId },
          inspectionStatus: 'FAILED',
        },
      }),
    ]);

    const returnRatePercentage =
      totalOrders > 0 ? Math.round((returnOrders / totalOrders) * 10000) / 100 : 0;

    const latestEval = customer.returnAbuseEvaluations?.[0];
    const riskLevel = (latestEval?.riskLevel as ReturnRiskLevel) || ReturnRiskLevel.LOW;
    const isWatchlist = latestEval?.isFlagged || failedInspections >= 2;

    return {
      customerId,
      fullName: customer.fullName || undefined,
      totalOrders,
      totalReturns: returnOrders,
      returnRatePercentage,
      totalFailedInspections: failedInspections,
      riskLevel,
      isWatchlist,
      recentEvaluationsCount: customer.returnAbuseEvaluations?.length || 0,
    };
  }
}
