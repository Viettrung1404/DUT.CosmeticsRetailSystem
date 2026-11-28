import { Test, TestingModule } from '@nestjs/testing';
import { AdminLogisticsDashboardController } from '../admin-logistics-dashboard.controller';
import { LogisticsDashboardService } from '../../../application/services/logistics-dashboard.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';

describe('AdminLogisticsDashboardController Unit Tests (Epic 20)', () => {
  let controller: AdminLogisticsDashboardController;
  let service: any;

  beforeEach(async () => {
    service = {
      getDashboardOverview: jest.fn().mockResolvedValue({ generatedAt: new Date() }),
      getFirstAttemptDeliveryRate: jest.fn().mockResolvedValue({ firstAttemptRatePercentage: 80 }),
      getExpressSlaMetrics: jest.fn().mockResolvedValue({ breachRatePercentage: 5 }),
      getCodReconciliationHeatmap: jest.fn().mockResolvedValue({ overallDiscrepancy: 0 }),
      getFulfillmentThroughput: jest.fn().mockResolvedValue({ totalFulfillmentOrders: 50 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLogisticsDashboardController],
      providers: [{ provide: LogisticsDashboardService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminLogisticsDashboardController>(
      AdminLogisticsDashboardController,
    );
  });

  it('GET /overview: gọi getDashboardOverview', async () => {
    const res = await controller.getDashboardOverview({});
    expect(res).toBeDefined();
    expect(service.getDashboardOverview).toHaveBeenCalled();
  });

  it('GET /first-attempt-rate: gọi getFirstAttemptDeliveryRate', async () => {
    const res = await controller.getFirstAttemptRate({});
    expect(res.firstAttemptRatePercentage).toBe(80);
    expect(service.getFirstAttemptDeliveryRate).toHaveBeenCalled();
  });

  it('GET /express-sla: gọi getExpressSlaMetrics', async () => {
    const res = await controller.getExpressSla({});
    expect(res.breachRatePercentage).toBe(5);
    expect(service.getExpressSlaMetrics).toHaveBeenCalled();
  });

  it('GET /cod-reconciliation: gọi getCodReconciliationHeatmap', async () => {
    const res = await controller.getCodReconciliation({});
    expect(res.overallDiscrepancy).toBe(0);
    expect(service.getCodReconciliationHeatmap).toHaveBeenCalled();
  });

  it('GET /fulfillment-throughput: gọi getFulfillmentThroughput', async () => {
    const res = await controller.getFulfillmentThroughput({});
    expect(res.totalFulfillmentOrders).toBe(50);
    expect(service.getFulfillmentThroughput).toHaveBeenCalled();
  });
});
