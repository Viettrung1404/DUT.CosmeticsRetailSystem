import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AdminOrderAccessService } from '../../services/admin-order-access.service';
import { GetAdminOrderDetailUseCase } from '../get-admin-order-detail.use-case';
import { CancelAdminOrderUseCase } from '../cancel-admin-order.use-case';
import { getAdminOrderActions } from '../../utils/order-actions.util';
import { createAdminOrderRepositoryMock } from './admin-order-mocks';

const NOTHING = { reservationReleased: false, couponReleased: false, pointsRefunded: 0, refundAmount: 0 };

describe('CancelAdminOrderUseCase', () => {
  let repository: ReturnType<typeof createAdminOrderRepositoryMock>;
  let useCase: CancelAdminOrderUseCase;

  const givenOrder = (status: string, storeId = 's1') => {
    repository.findAccessInfo.mockResolvedValue({ id: 'o1', status, storeId, salesStaffId: null });
    repository.findDetail.mockResolvedValue({ id: 'o1', status } as never);
  };

  beforeEach(() => {
    repository = createAdminOrderRepositoryMock();
    repository.cancelByAdmin.mockResolvedValue(NOTHING);
    const getUserDataScope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: null }),
    } as unknown as GetUserDataScopeUseCase;
    const access = new AdminOrderAccessService(repository, getUserDataScope);
    useCase = new CancelAdminOrderUseCase(
      repository,
      access,
      new GetAdminOrderDetailUseCase(repository, access),
    );
  });

  it.each(['PENDING', 'CONFIRMED', 'PROCESSING'])('hủy được đơn %s, ghi lý do và người hủy', async (status) => {
    givenOrder(status);
    await useCase.execute('u1', 'o1', 'Khách đổi ý');
    expect(repository.cancelByAdmin).toHaveBeenCalledWith({
      orderId: 'o1',
      changedBy: 'u1',
      reason: 'Khách đổi ý',
    });
  });

  it.each(['SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'])(
    'không hủy được đơn %s → 400, không ghi DB',
    async (status) => {
      givenOrder(status);
      await expect(useCase.execute('u1', 'o1', 'x')).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.cancelByAdmin).not.toHaveBeenCalled();
    },
  );

  it('đơn cửa hàng khác → 403', async () => {
    givenOrder('PENDING', 's2');
    await expect(useCase.execute('u1', 'o1', 'x')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('liệt kê đủ tác động khi hủy đơn đã thu tiền, có coupon và điểm', async () => {
    givenOrder('PROCESSING');
    repository.cancelByAdmin.mockResolvedValue({
      reservationReleased: true,
      couponReleased: true,
      pointsRefunded: 50,
      refundAmount: 615000,
    });
    const { notes } = await useCase.execute('u1', 'o1', 'Hết hàng');
    expect(notes).toEqual([
      'Đã trả lại hàng đang giữ về tồn khả dụng.',
      'Đã hoàn lượt dùng mã giảm giá.',
      'Đã hoàn 50 điểm cho khách.',
      'Đã tạo phiếu hoàn tiền 615000đ chờ xử lý.',
    ]);
  });

  it('actions.canCancel khớp luật trạng thái', () => {
    expect(getAdminOrderActions('PROCESSING').canCancel).toBe(true);
    expect(getAdminOrderActions('SHIPPING').canCancel).toBe(false);
  });
});
