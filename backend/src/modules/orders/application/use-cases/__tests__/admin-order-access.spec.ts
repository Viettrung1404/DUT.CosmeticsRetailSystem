import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AdminOrderAccessService } from '../../services/admin-order-access.service';
import { GetAdminOrderDetailUseCase } from '../get-admin-order-detail.use-case';
import { ConfirmAdminOrderUseCase } from '../confirm-admin-order.use-case';
import { createAdminOrderRepositoryMock } from './admin-order-mocks';

describe('Admin order: truy cập, chi tiết, xác nhận', () => {
  let repository: ReturnType<typeof createAdminOrderRepositoryMock>;
  let getUserDataScope: { execute: jest.Mock };
  let access: AdminOrderAccessService;
  let getDetail: GetAdminOrderDetailUseCase;
  let confirm: ConfirmAdminOrderUseCase;

  const givenOrder = (status: string, storeId = 's1') => {
    repository.findAccessInfo.mockResolvedValue({ id: 'o1', status, storeId, salesStaffId: null });
    repository.findDetail.mockResolvedValue({ id: 'o1', status } as never);
  };

  beforeEach(() => {
    repository = createAdminOrderRepositoryMock();
    getUserDataScope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: 'e1' }),
    };
    access = new AdminOrderAccessService(
      repository,
      getUserDataScope as unknown as GetUserDataScopeUseCase,
    );
    getDetail = new GetAdminOrderDetailUseCase(repository, access);
    confirm = new ConfirmAdminOrderUseCase(repository, access, getDetail);
  });

  describe('AdminOrderAccessService', () => {
    it('đơn không tồn tại → 404', async () => {
      repository.findAccessInfo.mockResolvedValue(null);
      await expect(access.getAccessibleOrder('u1', 'o404')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('đơn của cửa hàng khác → 403', async () => {
      givenOrder('PENDING', 's2');
      await expect(access.getAccessibleOrder('u1', 'o1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('đơn trong phạm vi → trả thông tin đơn', async () => {
      givenOrder('PENDING');
      await expect(access.getAccessibleOrder('u1', 'o1')).resolves.toMatchObject({ id: 'o1' });
    });
  });

  describe('GetAdminOrderDetailUseCase', () => {
    it('đơn PENDING: cho phép xác nhận', async () => {
      givenOrder('PENDING');
      const detail = await getDetail.execute('u1', 'o1');
      expect(detail.actions.canConfirm).toBe(true);
    });

    it('đơn đã CONFIRMED: không hiện nút xác nhận nữa', async () => {
      givenOrder('CONFIRMED');
      const detail = await getDetail.execute('u1', 'o1');
      expect(detail.actions.canConfirm).toBe(false);
    });

    it('ngoài phạm vi thì không đọc chi tiết', async () => {
      givenOrder('PENDING', 's2');
      await expect(getDetail.execute('u1', 'o1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findDetail).not.toHaveBeenCalled();
    });
  });

  describe('ConfirmAdminOrderUseCase', () => {
    it('đơn PENDING: gọi repository xác nhận kèm người thao tác rồi trả chi tiết mới', async () => {
      givenOrder('PENDING');
      await confirm.execute('u1', 'o1', 'Đã gọi khách');
      expect(repository.confirm).toHaveBeenCalledWith({
        orderId: 'o1',
        changedBy: 'u1',
        note: 'Đã gọi khách',
      });
      expect(repository.findDetail).toHaveBeenCalledWith('o1');
    });

    it('đơn không ở PENDING → 400, không ghi DB', async () => {
      givenOrder('SHIPPING');
      await expect(confirm.execute('u1', 'o1')).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.confirm).not.toHaveBeenCalled();
    });

    it('đơn của cửa hàng khác → 403, không ghi DB', async () => {
      givenOrder('PENDING', 's2');
      await expect(confirm.execute('u1', 'o1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.confirm).not.toHaveBeenCalled();
    });
  });
});
