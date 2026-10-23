import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PosReceipt } from '../../../domain/entities/pos-sale.entity';
import { IPosOrderRepository } from '../../../domain/repositories/pos-order.repository.interface';
import { PosReceiptResponseDto } from '../../../presentation/dtos/pos-order-response.dto';
import { GetPosOrderReceiptUseCase } from '../get-pos-order-receipt.use-case';

const receipt = (over: Partial<PosReceipt> = {}): PosReceipt => ({
  orderId: 'o1',
  orderNumber: 'ORD202610230001',
  status: 'COMPLETED',
  createdAt: new Date(),
  storeId: 's1',
  store: { code: 'CH01', name: 'GlowUp CH01' },
  session: { id: 'ses1', code: 'POS-CH01-20261023-01', cashierId: 'thungan' },
  cashierName: 'Thu Ngân',
  customer: null,
  items: [],
  subtotal: 300000,
  promotionDiscount: 0,
  couponDiscount: 0,
  couponCode: null,
  pointsUsed: 0,
  pointsDiscount: 0,
  total: 300000,
  pointsEarned: 0,
  payments: [{ method: 'CASH', amount: 300000, tenderedAmount: 500000 }],
  ...over,
});

describe('GetPosOrderReceiptUseCase', () => {
  let repo: jest.Mocked<Pick<IPosOrderRepository, 'findReceipt'>>;
  let scope: { execute: jest.Mock };
  let useCase: GetPosOrderReceiptUseCase;

  beforeEach(() => {
    repo = { findReceipt: jest.fn().mockResolvedValue(receipt()) };
    scope = { execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: null }) };
    useCase = new GetPosOrderReceiptUseCase(repo as unknown as IPosOrderRepository, scope as never);
  });

  it('không có đơn thì 404', async () => {
    repo.findReceipt.mockResolvedValue(null);
    await expect(useCase.execute('thungan', [], 'o1')).rejects.toThrow(NotFoundException);
  });

  it('thu ngân của ca xem được', async () => {
    await expect(useCase.execute('thungan', ['PAYMENT_COLLECT'], 'o1')).resolves.toBeDefined();
    expect(scope.execute).not.toHaveBeenCalled();
  });

  it('nhân viên bán khác (không có quyền đối soát) bị chặn dù cùng cửa hàng', async () => {
    await expect(useCase.execute('nv-khac', ['ORDER_POS_CREATE', 'PAYMENT_COLLECT'], 'o1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('quản lý có quyền đối soát xem được đơn cửa hàng mình', async () => {
    await expect(useCase.execute('ql', ['PAYMENT_RECONCILE'], 'o1')).resolves.toBeDefined();
  });

  it('quản lý cửa hàng khác bị chặn', async () => {
    scope.execute.mockResolvedValue({ type: 'STORE', storeIds: ['s2'], employeeId: null });
    await expect(useCase.execute('ql2', ['PAYMENT_RECONCILE'], 'o1')).rejects.toThrow(ForbiddenException);
  });

  it('kế toán phạm vi ALL xem được', async () => {
    scope.execute.mockResolvedValue({ type: 'ALL', storeIds: [], employeeId: null });
    await expect(useCase.execute('kt', ['PAYMENT_RECONCILE'], 'o1')).resolves.toBeDefined();
  });
});

describe('PosReceiptResponseDto', () => {
  it('tính tổng khách đưa và tiền thừa từ các khoản thanh toán', () => {
    const dto = PosReceiptResponseDto.fromDomain(
      receipt({
        total: 909000,
        payments: [
          { method: 'CASH', amount: 509000, tenderedAmount: 600000 },
          { method: 'TRANSFER', amount: 400000, tenderedAmount: null },
        ],
      }),
    );
    expect(dto.totalReceived).toBe(1000000);
    expect(dto.change).toBe(91000);
    expect(dto.sessionCode).toBe('POS-CH01-20261023-01');
  });
});
