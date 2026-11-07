import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AdminOrderAccessService } from '../../services/admin-order-access.service';
import { GetAdminOrderDetailUseCase } from '../get-admin-order-detail.use-case';
import { UpdateAdminOrderStatusUseCase } from '../update-admin-order-status.use-case';
import { createAdminOrderRepositoryMock } from './admin-order-mocks';

const NO_EFFECTS = { stockDeducted: false, codPaymentsCompleted: 0, loyalty: null, commissionAmount: null };

describe('UpdateAdminOrderStatusUseCase', () => {
  let repository: ReturnType<typeof createAdminOrderRepositoryMock>;
  let useCase: UpdateAdminOrderStatusUseCase;

  const givenOrder = (status: string, storeId = 's1') => {
    repository.findAccessInfo.mockResolvedValue({ id: 'o1', status, storeId, salesStaffId: null });
    repository.findDetail.mockResolvedValue({ id: 'o1', status } as never);
  };

  beforeEach(() => {
    repository = createAdminOrderRepositoryMock();
    repository.updateStatus.mockResolvedValue(NO_EFFECTS);
    const getUserDataScope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: null }),
    } as unknown as GetUserDataScopeUseCase;
    const access = new AdminOrderAccessService(repository, getUserDataScope);
    useCase = new UpdateAdminOrderStatusUseCase(
      repository,
      access,
      new GetAdminOrderDetailUseCase(repository, access),
    );
  });

  it('chuyển đúng thứ tự: gọi repository kèm người thao tác và ghi chú', async () => {
    givenOrder('CONFIRMED');
    await useCase.execute('u1', 'o1', OrderStatus.PROCESSING, 'Đang đóng gói');
    expect(repository.updateStatus).toHaveBeenCalledWith({
      orderId: 'o1',
      target: 'PROCESSING',
      changedBy: 'u1',
      note: 'Đang đóng gói',
    });
  });

  it('nhảy cóc CONFIRMED → DELIVERED → 400, không ghi DB', async () => {
    givenOrder('CONFIRMED');
    await expect(useCase.execute('u1', 'o1', OrderStatus.DELIVERED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('quay lui SHIPPING → PROCESSING → 400', async () => {
    givenOrder('SHIPPING');
    await expect(useCase.execute('u1', 'o1', OrderStatus.PROCESSING)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('đơn cửa hàng khác → 403', async () => {
    givenOrder('CONFIRMED', 's2');
    await expect(useCase.execute('u1', 'o1', OrderStatus.PROCESSING)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('COMPLETED chưa cấu hình tỷ lệ tích điểm: báo rõ trong ghi chú', async () => {
    givenOrder('DELIVERED');
    repository.updateStatus.mockResolvedValue({
      ...NO_EFFECTS,
      loyalty: { configured: false, pointsEarned: 0, newTierName: null },
    });
    const { notes } = await useCase.execute('u1', 'o1', OrderStatus.COMPLETED);
    expect(notes).toEqual([
      'Chưa cấu hình tỷ lệ tích điểm (settings: loyalty_config) nên chưa cộng điểm.',
    ]);
  });

  it('COMPLETED có tích điểm, lên hạng và hoa hồng: liệt kê đủ', async () => {
    givenOrder('DELIVERED');
    repository.updateStatus.mockResolvedValue({
      ...NO_EFFECTS,
      loyalty: { configured: true, pointsEarned: 99, newTierName: 'Silver' },
      commissionAmount: 19800,
    });
    const { notes } = await useCase.execute('u1', 'o1', OrderStatus.COMPLETED);
    expect(notes).toEqual([
      'Đã cộng 99 điểm cho khách.',
      'Khách lên hạng Silver.',
      'Đã ghi hoa hồng 19800đ cho nhân viên bán.',
    ]);
  });
});
