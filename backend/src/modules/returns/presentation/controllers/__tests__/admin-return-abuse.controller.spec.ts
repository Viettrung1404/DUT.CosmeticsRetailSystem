import { Test, TestingModule } from '@nestjs/testing';
import { AdminReturnAbuseController } from '../admin-return-abuse.controller';
import { ReturnAbuseDetectorService } from '../../../application/services/return-abuse-detector.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';

describe('AdminReturnAbuseController Unit Tests (Epic 21)', () => {
  let controller: AdminReturnAbuseController;
  let service: any;

  beforeEach(async () => {
    service = {
      evaluateReturnOrder: jest.fn().mockResolvedValue({
        riskScore: 25,
        riskLevel: 'LOW',
        isFlagged: false,
      }),
      getCustomerRiskProfile: jest.fn().mockResolvedValue({
        customerId: 'cust-1',
        riskLevel: 'LOW',
        isWatchlist: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReturnAbuseController],
      providers: [{ provide: ReturnAbuseDetectorService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminReturnAbuseController>(AdminReturnAbuseController);
  });

  it('GET /:id/abuse-check: gọi evaluateReturnOrder', async () => {
    const res = await controller.evaluateAbuse('rma-1');
    expect(res.riskScore).toBe(25);
    expect(service.evaluateReturnOrder).toHaveBeenCalledWith('rma-1');
  });

  it('GET /risk-profiles/:customerId: gọi getCustomerRiskProfile', async () => {
    const res = await controller.getCustomerRiskProfile('cust-1');
    expect(res.customerId).toBe('cust-1');
    expect(service.getCustomerRiskProfile).toHaveBeenCalledWith('cust-1');
  });
});
