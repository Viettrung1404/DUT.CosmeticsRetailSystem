import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IInventoryRepository,
  PurchaseOrderSnapshot,
} from '../../../domain/repositories/inventory.repository.interface';
import { GetInventoryUseCase } from '../get-inventory.use-case';
import { ReceivePurchaseOrderUseCase } from '../receive-purchase-order.use-case';
import { AdjustInventoryUseCase } from '../adjust-inventory.use-case';

const makePo = (overrides: Partial<PurchaseOrderSnapshot> = {}): PurchaseOrderSnapshot => ({
  id: 'po1',
  poNumber: 'PO-0001',
  status: 'SENT',
  storeId: 'wh',
  storeType: 'WAREHOUSE',
  supplierId: 'sup',
  items: [
    { id: 'i1', productVariantId: 'v1', quantityOrdered: 50, quantityReceived: 20, unitCost: 120_000 },
  ],
  ...overrides,
});

describe('Inventory use cases', () => {
  let repo: jest.Mocked<IInventoryRepository>;
  let scope: { execute: jest.Mock };

  const givenScope = (type: 'ALL' | 'STORE' | 'SELF', storeIds: string[] = []) =>
    scope.execute.mockResolvedValue({ type, storeIds, employeeId: null });
  const scopeUseCase = () => scope as unknown as GetUserDataScopeUseCase;

  beforeEach(() => {
    repo = {
      findStore: jest.fn().mockResolvedValue({
        id: 's1',
        code: 'STORE-01',
        name: 'GlowUp',
        type: 'STORE',
        isActive: true,
      }),
      variantExists: jest.fn().mockResolvedValue(true),
      findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findPurchaseOrder: jest.fn().mockResolvedValue(makePo()),
      applyReceipt: jest.fn().mockResolvedValue({ ok: true, poStatus: 'PARTIALLY_RECEIVED', batchIds: ['b1'] }),
      applyAdjustment: jest.fn(),
    };
    scope = { execute: jest.fn() };
    givenScope('STORE', ['wh', 's1']);
  });

  describe('GetInventoryUseCase', () => {
    const get = (input: Record<string, unknown> = {}) =>
      new GetInventoryUseCase(repo, scopeUseCase()).execute('u1', { page: 1, limit: 20, ...input });

    it('STORE: tự giới hạn trong các cửa hàng được giao', async () => {
      await get();
      expect(repo.findMany.mock.calls[0][0].storeIds).toEqual(['wh', 's1']);
    });

    it('xem cửa hàng ngoài phạm vi → 403', async () => {
      await expect(get({ storeId: 's9' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ALL không giới hạn, chuỗi tìm kiếm rỗng bị bỏ', async () => {
      givenScope('ALL');
      await get({ search: '   ' });
      expect(repo.findMany.mock.calls[0][0]).toMatchObject({ storeIds: undefined, search: undefined });
    });
  });

  describe('ReceivePurchaseOrderUseCase', () => {
    const item = {
      purchaseOrderItemId: 'i1',
      quantity: 10,
      batchNumber: ' LOT-A ',
      expiryDate: '2099-01-01',
    };
    const receive = (items = [item]) =>
      new ReceivePurchaseOrderUseCase(repo, scopeUseCase()).execute('u1', {
        purchaseOrderId: 'po1',
        items,
      });

    it('nhận hàng, lấy giá nhập từ dòng PO và cắt khoảng trắng số lô', async () => {
      const result = await receive();
      const command = repo.applyReceipt.mock.calls[0][0];
      expect(command.lines[0]).toMatchObject({
        productVariantId: 'v1',
        unitCost: 120_000,
        batchNumber: 'LOT-A',
        quantity: 10,
      });
      expect(result).toEqual({ poNumber: 'PO-0001', status: 'PARTIALLY_RECEIVED', receivedLines: 1 });
    });

    it('nhận vượt số còn lại (tính gộp nhiều lô của cùng dòng) → 400', async () => {
      await expect(receive([item, { ...item, batchNumber: 'LOT-B', quantity: 25 }])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.applyReceipt).not.toHaveBeenCalled();
    });

    it('đơn chưa duyệt (DRAFT) → 400', async () => {
      repo.findPurchaseOrder.mockResolvedValue(makePo({ status: 'DRAFT' }));
      await expect(receive()).rejects.toThrow('chưa được duyệt');
    });

    it('đơn giao về cửa hàng (không phải kho tổng) → 400', async () => {
      repo.findPurchaseOrder.mockResolvedValue(makePo({ storeType: 'STORE' }));
      await expect(receive()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lô đã hết hạn → 400', async () => {
      await expect(receive([{ ...item, expiryDate: '2020-01-01' }])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('dòng hàng không thuộc đơn → 400', async () => {
      await expect(receive([{ ...item, purchaseOrderItemId: 'x' }])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('kho ngoài phạm vi → 403', async () => {
      givenScope('STORE', ['s1']);
      await expect(receive()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('không tìm thấy đơn → 404', async () => {
      repo.findPurchaseOrder.mockResolvedValue(null);
      await expect(receive()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('số lô trùng khác hạn dùng → 409', async () => {
      repo.applyReceipt.mockResolvedValue({ ok: false, reason: 'BATCH_EXPIRY_MISMATCH', batchNumber: 'LOT-A' });
      await expect(receive()).rejects.toBeInstanceOf(ConflictException);
    });

    it('người khác vừa nhận cùng đơn → 409', async () => {
      repo.applyReceipt.mockResolvedValue({ ok: false, reason: 'OVER_RECEIVED' });
      await expect(receive()).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('AdjustInventoryUseCase', () => {
    const adjust = (input: Record<string, unknown> = {}) =>
      new AdjustInventoryUseCase(repo, scopeUseCase()).execute('u1', {
        storeId: 's1',
        productVariantId: 'v1',
        quantity: -3,
        reason: 'Hủy hàng hết hạn',
        ...input,
      });

    it('xuất thủ công trả về tồn mới và các lô đã trừ', async () => {
      repo.applyAdjustment.mockResolvedValue({
        ok: true,
        quantity: 7,
        reservedQuantity: 2,
        allocations: [{ batchId: 'b1', batchNumber: 'LOT-A', quantity: 3 }],
      });
      await expect(adjust()).resolves.toMatchObject({ quantity: 7, availableQuantity: 5 });
    });

    it('thiếu lý do → 400', async () => {
      await expect(adjust({ reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('nhập thêm mà không có lô → 400', async () => {
      await expect(adjust({ quantity: 5 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('nhập thêm vào lô mới thì gửi thông tin lô xuống repository', async () => {
      repo.applyAdjustment.mockResolvedValue({ ok: true, quantity: 5, reservedQuantity: 0, allocations: [] });
      await adjust({ quantity: 5, batchNumber: 'MAU-THU', expiryDate: '2099-12-31' });
      expect(repo.applyAdjustment.mock.calls[0][0].newBatch).toMatchObject({ batchNumber: 'MAU-THU' });
    });

    it('ngày sản xuất không trước hạn dùng → 400', async () => {
      await expect(
        adjust({ quantity: 5, batchNumber: 'MAU-THU', expiryDate: '2099-12-31', manufactureDate: '2099-12-31' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('đụng phần giữ chỗ đơn online → 409', async () => {
      repo.applyAdjustment.mockResolvedValue({ ok: false, reason: 'RESERVED_CONFLICT', available: 1 });
      await expect(adjust()).rejects.toBeInstanceOf(ConflictException);
    });

    it('không đủ hàng → 400', async () => {
      repo.applyAdjustment.mockResolvedValue({ ok: false, reason: 'NO_STOCK', available: 1 });
      await expect(adjust()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cửa hàng ngoài phạm vi → 403', async () => {
      givenScope('STORE', ['wh']);
      await expect(adjust()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('biến thể không tồn tại → 404', async () => {
      repo.variantExists.mockResolvedValue(false);
      await expect(adjust()).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
