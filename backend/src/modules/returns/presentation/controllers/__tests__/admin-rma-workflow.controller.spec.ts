import { Test, TestingModule } from '@nestjs/testing';
import { AdminRmaWorkflowController } from '../admin-rma-workflow.controller';
import { RmaWorkflowService } from '../../../application/services/rma-workflow.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';

describe('AdminRmaWorkflowController Unit Tests', () => {
  let controller: AdminRmaWorkflowController;
  let service: any;

  beforeEach(async () => {
    service = {
      expireStaleApprovedRmas: jest.fn(),
      checkQcSlaBreaches: jest.fn(),
      handleLostReturnPackage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminRmaWorkflowController],
      providers: [{ provide: RmaWorkflowService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminRmaWorkflowController>(AdminRmaWorkflowController);
  });

  it('POST /expire-stale: gọi service expireStaleApprovedRmas', async () => {
    service.expireStaleApprovedRmas.mockResolvedValue({ expiredCount: 2 });
    const res = await controller.expireStaleRmas({ thresholdDays: 7 });
    expect(res.expiredCount).toBe(2);
    expect(service.expireStaleApprovedRmas).toHaveBeenCalledWith(7);
  });

  it('POST /check-qc-sla: gọi service checkQcSlaBreaches', async () => {
    service.checkQcSlaBreaches.mockResolvedValue({ breachCount: 1 });
    const res = await controller.checkQcSla({ thresholdHours: 48 });
    expect(res.breachCount).toBe(1);
    expect(service.checkQcSlaBreaches).toHaveBeenCalledWith(48);
  });

  it('POST /lost-package/:shipmentId: gọi service handleLostReturnPackage', async () => {
    service.handleLostReturnPackage.mockResolvedValue({ status: 'COMPLETED' });
    const mockReq = { user: { id: 'admin-1' } };
    const res = await controller.handleLostPackage('shp-123', { reason: 'Lost' }, mockReq);
    expect(res.status).toBe('COMPLETED');
    expect(service.handleLostReturnPackage).toHaveBeenCalledWith('shp-123', {
      reason: 'Lost',
      operatorUserId: 'admin-1',
    });
  });
});
