import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IPurchaseOrderRepository,
  PurchaseOrderView,
} from '../../../domain/repositories/purchase-order.repository.interface';
import { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { PurchaseOrderWorkflowUseCase } from '../purchase-order-workflow.use-case';
import { SupplierPaymentsUseCase } from '../supplier-payments.use-case';
import { ManageSuppliersUseCase } from '../manage-suppliers.use-case';

const WH = 'wh';
const scopeOf = (type: 'ALL' | 'STORE', storeIds: string[] = []) =>
  ({
    execute: jest.fn().mockResolvedValue({ type, storeIds, employeeId: null }),
  }) as unknown as GetUserDataScopeUseCase;

const po = (over: Partial<PurchaseOrderView> = {}): PurchaseOrderView => ({
  id: 'po1',
  poNumber: 'PO202610300001',
  supplierId: 'sup',
  supplierName: 'NCC',
  storeId: WH,
  storeName: 'Kho tổng',
  status: 'DRAFT',
  totalAmount: 1000,
  note: null,
  expectedDate: null,
  receivedDate: null,
  createdBy: 'kho',
  createdByName: null,
  approvedBy: null,
  approvedByName: null,
  approvedAt: null,
  createdAt: new Date(),
  items: [
    {
      id: 'i1',
      productVariantId: 'v1',
      sku: 'SKU1',
      productName: 'P',
      quantityOrdered: 10,
      quantityReceived: 0,
      unitCost: 100,
      totalCost: 1000,
    },
  ],
  receipts: [],
  ...over,
});

const poRepo = (view = po()): jest.Mocked<IPurchaseOrderRepository> => ({
  findStore: jest.fn(async (id: string) => ({ id, type: id === WH ? 'WAREHOUSE' : 'STORE', isActive: true })),
  findSupplier: jest.fn().mockResolvedValue({ id: 'sup', isActive: true }),
  findMissingVariants: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue('po1'),
  replaceDraft: jest.fn().mockResolvedValue(true),
  changeStatus: jest.fn().mockResolvedValue(true),
  findById: jest.fn().mockResolvedValue(view),
  findMany: jest.fn(),
});

const line = [{ productVariantId: 'v1', quantity: 10, unitCost: 100 }];

describe('Đơn đặt hàng NCC (T1)', () => {
  it('chỉ giao về kho tổng (NC1); NCC ngừng hợp tác: 400', async () => {
    const r = poRepo();
    const uc = new PurchaseOrderWorkflowUseCase(r, scopeOf('ALL'));
    await expect(uc.create('kho', { supplierId: 'sup', storeId: 's1', items: line })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    r.findSupplier.mockResolvedValue({ id: 'sup', isActive: false });
    await expect(uc.create('kho', { supplierId: 'sup', storeId: WH, items: line })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('kho ngoài phạm vi: 403; hợp lệ thì tạo nháp', async () => {
    const r = poRepo();
    await expect(
      new PurchaseOrderWorkflowUseCase(r, scopeOf('STORE', ['khac'])).create('kho', {
        supplierId: 'sup',
        storeId: WH,
        items: line,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await new PurchaseOrderWorkflowUseCase(r, scopeOf('STORE', [WH])).create('kho', {
      supplierId: 'sup',
      storeId: WH,
      items: line,
    });
    expect(r.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'kho', storeId: WH }));
  });

  it('người lập không tự duyệt; người khác duyệt ghi approvedBy', async () => {
    const r = poRepo();
    const uc = new PurchaseOrderWorkflowUseCase(r, scopeOf('ALL'));
    await expect(uc.approveAndSend('kho', 'po1')).rejects.toBeInstanceOf(ForbiddenException);
    await uc.approveAndSend('ketoan', 'po1');
    expect(r.changeStatus).toHaveBeenCalledWith('po1', ['DRAFT'], 'SENT', { approvedBy: 'ketoan' });
  });

  it('xác nhận khi đơn còn nháp: 409', async () => {
    const uc = new PurchaseOrderWorkflowUseCase(poRepo(), scopeOf('ALL'));
    await expect(uc.confirm('kho', 'po1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('đã nhận một phần thì không hủy được', async () => {
    const r = poRepo(po({ status: 'CONFIRMED', items: [{ ...po().items[0], quantityReceived: 3 }] }));
    await expect(new PurchaseOrderWorkflowUseCase(r, scopeOf('ALL')).cancel('kho', 'po1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(r.changeStatus).not.toHaveBeenCalled();
  });
});

describe('Công nợ NCC (NC4)', () => {
  const repo = (): jest.Mocked<ISupplierRepository> => ({
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue({ id: 'sup' }),
    findByTaxCode: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    setRating: jest.fn(),
    balance: jest.fn(),
    createPayment: jest.fn().mockResolvedValue({ ok: false, balance: 500000 }),
    findPayments: jest.fn(),
    purchaseOrderSupplier: jest.fn().mockResolvedValue('khac'),
  });
  const input = { supplierId: 'sup', amount: 600000, paymentMethod: 'CASH', paymentDate: '2026-10-30' };

  it('trả vượt công nợ: 400 kèm số nợ', async () => {
    await expect(new SupplierPaymentsUseCase(repo()).pay('kt', input)).rejects.toThrow('500.000');
  });

  it('PO của NCC khác: 400; NCC không tồn tại: 404', async () => {
    const r = repo();
    await expect(
      new SupplierPaymentsUseCase(r).pay('kt', { ...input, purchaseOrderId: 'po1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    r.findById.mockResolvedValue(null);
    await expect(new SupplierPaymentsUseCase(r).pay('kt', input)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mã số thuế trùng NCC khác: 409', async () => {
    const r = repo();
    r.findByTaxCode.mockResolvedValue({ id: 'khac' });
    await expect(
      new ManageSuppliersUseCase(r).create({ name: 'NCC mới', taxCode: '0312345678' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
