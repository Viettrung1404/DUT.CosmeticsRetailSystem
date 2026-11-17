import { Test, TestingModule } from '@nestjs/testing';
import { AdminReturnAnalyticsController } from '../admin-return-analytics.controller';
import { LotQualityAnalyticsService } from '../../../application/services/lot-quality-analytics.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';

describe('AdminReturnAnalyticsController', () => {
  let controller: AdminReturnAnalyticsController;
  let service: any;

  beforeEach(async () => {
    service = {
      getLotQualityReport: jest.fn(),
      getReturnReasonBreakdown: jest.fn(),
      getCarrierDamageComparison: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReturnAnalyticsController],
      providers: [
        { provide: LotQualityAnalyticsService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminReturnAnalyticsController>(
      AdminReturnAnalyticsController,
    );
  });

  it('GET /api/v1/admin/returns/analytics/quality-by-lot gọi đúng service', async () => {
    service.getLotQualityReport.mockResolvedValue([
      {
        lotId: 'lot-1',
        batchCode: 'BATCH-001',
        defectRatePercentage: 1.5,
        isAlertTriggered: false,
      },
    ]);

    const result = await controller.getLotQualityReport({
      thresholdPercent: 5.0,
    });

    expect(result).toHaveLength(1);
    expect(service.getLotQualityReport).toHaveBeenCalledWith({
      thresholdPercent: 5.0,
    });
  });

  it('GET /api/v1/admin/returns/analytics/reason-breakdown gọi đúng service', async () => {
    service.getReturnReasonBreakdown.mockResolvedValue({
      totalReturns: 15,
      totalRefundValue: 3000000,
      reasons: [],
    });

    const result = await controller.getReturnReasonBreakdown({});

    expect(result.totalReturns).toBe(15);
    expect(service.getReturnReasonBreakdown).toHaveBeenCalledWith({});
  });

  it('GET /api/v1/admin/returns/analytics/carrier-damage gọi đúng service', async () => {
    service.getCarrierDamageComparison.mockResolvedValue({
      period: {},
      carriers: [],
    });

    const result = await controller.getCarrierDamageComparison({});

    expect(result.carriers).toBeDefined();
    expect(service.getCarrierDamageComparison).toHaveBeenCalledWith({});
  });
});
