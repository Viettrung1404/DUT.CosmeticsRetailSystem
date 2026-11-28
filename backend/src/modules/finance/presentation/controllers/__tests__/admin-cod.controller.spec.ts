import { Test, TestingModule } from '@nestjs/testing';
import { AdminCodController } from '../admin-cod.controller';
import { CodReconciliationService } from '../../../application/services/cod-reconciliation.service';
import { ReconcileBatchDto } from '../../dtos/cod-reconciliation.dto';

describe('AdminCodController', () => {
  let controller: AdminCodController;
  let service: any;

  beforeEach(async () => {
    service = {
      reconcileBatch: jest.fn(),
      listReconciliations: jest.fn(),
      getReconciliation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCodController],
      providers: [{ provide: CodReconciliationService, useValue: service }],
    }).compile();

    controller = module.get<AdminCodController>(AdminCodController);
  });

  it('reconcileBatch gọi service và trả về kết quả', async () => {
    const dto: ReconcileBatchDto = {
      reconciliationCode: 'REC-001',
      carrierCode: 'GHN',
      reconciliationDate: '2026-11-16',
      items: [{ trackingCode: 'LAD1', carrierPaidCodAmount: 200000 }],
    };

    service.reconcileBatch.mockResolvedValue({
      id: 'rec-1',
      reconciliationCode: 'REC-001',
      status: 'APPROVED',
    });

    const res = await controller.reconcileBatch('user-1', dto);
    expect(service.reconcileBatch).toHaveBeenCalledWith(dto, 'user-1');
    expect(res.status).toBe('APPROVED');
  });

  it('listReconciliations gọi service với query params', async () => {
    service.listReconciliations.mockResolvedValue({
      items: [],
      total: 0,
    });

    const res = await controller.listReconciliations({ carrierCode: 'GHN', page: 1, limit: 10 });
    expect(service.listReconciliations).toHaveBeenCalledWith({
      carrierCode: 'GHN',
      page: 1,
      limit: 10,
    });
    expect(res.total).toBe(0);
  });

  it('getReconciliation gọi service với id', async () => {
    service.getReconciliation.mockResolvedValue({
      id: 'rec-1',
      reconciliationCode: 'REC-001',
    });

    const res = await controller.getReconciliation('rec-1');
    expect(service.getReconciliation).toHaveBeenCalledWith('rec-1');
    expect(res.reconciliationCode).toBe('REC-001');
  });

  it('route prefix không bị double api/v1 (BE-01)', () => {
    const path = Reflect.getMetadata('path', AdminCodController);
    expect(path).toBe('admin/cod');
    expect(path).not.toContain('api/v1');
  });
});
