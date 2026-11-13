import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { CarrierRegistry } from '../../services/carrier-registry.service';
import { ShipmentAccessService } from '../../services/shipment-access.service';
import { CancelAdminShipmentUseCase } from '../cancel-admin-shipment.use-case';
import { CreateAdminShipmentUseCase } from '../create-admin-shipment.use-case';
import { GetAdminShipmentDetailUseCase } from '../get-admin-shipment-detail.use-case';
import { ListAdminShipmentsUseCase } from '../list-admin-shipments.use-case';
import { ProcessCarrierEventUseCase } from '../process-carrier-event.use-case';
import { SimulateAdminShipmentUseCase } from '../simulate-admin-shipment.use-case';

const ALL: DataScope = { type: 'ALL', storeIds: [], employeeId: null };
const store = (...ids: string[]): DataScope => ({ type: 'STORE', storeIds: ids, employeeId: 'e1' });

const order = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  orderNumber: 'ORD1',
  storeId: 'S1',
  orderType: 'ONLINE',
  status: 'PROCESSING',
  shippingFee: 30000,
  totalAmount: 530000,
  totalWeightGrams: 500,
  shippingAddress: { recipientName: 'A', phone: '0900000000', addressLine: '1 Lê Lợi', city: 'Đà Nẵng' },
  completedPaid: 0,
  exchangeCredit: 0,
  hasActiveShipment: false,
  ...over,
});

function setup(scope: DataScope, orderOver: Record<string, unknown> = {}, shipmentOver: Record<string, unknown> = {}) {
  const gateway = {
    carrierCode: 'MOCK',
    createShipment: jest.fn().mockResolvedValue({ trackingCode: 'MOCK1', serviceCode: 'STD' }),
    cancelShipment: jest.fn().mockResolvedValue(undefined),
    parseWebhook: jest.fn().mockReturnValue({ eventId: 'E', trackingCode: 'MOCK1', status: 'PICKED_UP', occurredAt: new Date() }),
    buildSignedWebhook: jest.fn().mockReturnValue({ body: { a: 1 }, headers: { sig: 'x' } }),
  };
  const info = { id: 's1', orderId: 'o1', storeId: 'S1', carrierCode: 'MOCK', trackingCode: 'MOCK1', status: 'READY_TO_SHIP', ...shipmentOver };
  const repository = {
    findOrderForShipment: jest.fn().mockResolvedValue(order(orderOver)),
    findAccessInfo: jest.fn().mockResolvedValue(info),
    findDetail: jest.fn().mockResolvedValue({ id: 's1', events: [] }),
    findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    create: jest.fn().mockResolvedValue('s1'),
    cancel: jest.fn().mockResolvedValue(undefined),
    applyCarrierEvent: jest.fn().mockResolvedValue({ shipmentId: 's1' }),
  };
  const scopeUc = { execute: jest.fn().mockResolvedValue(scope) };
  const carriers = new CarrierRegistry([gateway as never]);
  const access = new ShipmentAccessService(repository as never, scopeUc as never);
  const getDetail = new GetAdminShipmentDetailUseCase(repository as never, access);
  return { gateway, repository, scopeUc, carriers, access, getDetail };
}

describe('CreateAdminShipmentUseCase', () => {
  const build = (s: ReturnType<typeof setup>) =>
    new CreateAdminShipmentUseCase(s.repository as never, s.scopeUc as never, s.carriers, s.getDetail);

  it('tạo vận đơn: COD là phần chưa thanh toán, phí ship lấy từ đơn', async () => {
    const s = setup(store('S1'), { completedPaid: 100000 });
    await build(s).execute('u', 'o1');
    expect(s.gateway.createShipment).toHaveBeenCalledWith(expect.objectContaining({ codAmount: 430000, shippingFee: 30000 }));
    expect(s.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'o1', trackingCode: 'MOCK1', codAmount: 430000, shippingFee: 30000, createdBy: 'u' }),
    );
  });

  it('đơn đã trả đủ online -> COD 0', async () => {
    const s = setup(ALL, { completedPaid: 530000 });
    await build(s).execute('u', 'o1');
    expect(s.repository.create).toHaveBeenCalledWith(expect.objectContaining({ codAmount: 0 }));
  });

  it('đơn thuộc cửa hàng khác -> 403, không gọi hãng', async () => {
    const s = setup(store('S2'));
    await expect(build(s).execute('u', 'o1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.gateway.createShipment).not.toHaveBeenCalled();
  });

  it('không tìm thấy đơn -> 404', async () => {
    const s = setup(ALL);
    s.repository.findOrderForShipment.mockResolvedValue(null);
    await expect(build(s).execute('u', 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['đơn POS', { orderType: 'POS' }, BadRequestException],
    ['đơn nhận tại cửa hàng', { orderType: 'STORE_PICKUP' }, BadRequestException],
    ['đơn chưa PROCESSING', { status: 'CONFIRMED' }, ConflictException],
    ['đã có vận đơn', { hasActiveShipment: true }, ConflictException],
    ['thiếu địa chỉ', { shippingAddress: null }, BadRequestException],
  ])('%s -> từ chối, không gọi hãng', async (_name, over, error) => {
    const s = setup(ALL, over);
    await expect(build(s).execute('u', 'o1')).rejects.toBeInstanceOf(error);
    expect(s.gateway.createShipment).not.toHaveBeenCalled();
  });

  it('hãng không hỗ trợ -> 400', async () => {
    const s = setup(ALL);
    await expect(build(s).execute('u', 'o1', 'GHN')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ghi vận đơn thất bại thì hủy bên hãng', async () => {
    const s = setup(ALL);
    s.repository.create.mockRejectedValue(new ConflictException('SHIPMENT_ALREADY_EXISTS'));
    await expect(build(s).execute('u', 'o1')).rejects.toBeInstanceOf(ConflictException);
    expect(s.gateway.cancelShipment).toHaveBeenCalledWith('MOCK1');
  });
});

describe('CancelAdminShipmentUseCase', () => {
  const build = (s: ReturnType<typeof setup>) =>
    new CancelAdminShipmentUseCase(s.repository as never, s.access, s.carriers, s.getDetail);

  it('hủy vận đơn chờ lấy hàng -> báo hãng và ghi', async () => {
    const s = setup(store('S1'));
    await build(s).execute('u', 's1');
    expect(s.gateway.cancelShipment).toHaveBeenCalledWith('MOCK1');
    expect(s.repository.cancel).toHaveBeenCalledWith('s1', 'u');
  });

  it('hãng đã lấy hàng -> 409, không báo hãng', async () => {
    const s = setup(ALL, {}, { status: 'PICKED_UP' });
    await expect(build(s).execute('u', 's1')).rejects.toBeInstanceOf(ConflictException);
    expect(s.gateway.cancelShipment).not.toHaveBeenCalled();
    expect(s.repository.cancel).not.toHaveBeenCalled();
  });

  it('vận đơn cửa hàng khác -> 403', async () => {
    const s = setup(store('S2'));
    await expect(build(s).execute('u', 's1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.repository.cancel).not.toHaveBeenCalled();
  });
});

describe('Xem vận đơn theo phạm vi', () => {
  it('chi tiết vận đơn cửa hàng khác -> 403', async () => {
    const s = setup(store('S2'));
    await expect(s.getDetail.execute('u', 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('danh sách của quản lý chỉ lọc theo cửa hàng mình', async () => {
    const s = setup(store('S1', 'S3'));
    await new ListAdminShipmentsUseCase(s.repository as never, s.scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(s.repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ storeIds: ['S1', 'S3'] }));
  });

  it('quản lý lọc cửa hàng không thuộc mình -> rỗng, không truy vấn', async () => {
    const s = setup(store('S1'));
    const result = await new ListAdminShipmentsUseCase(s.repository as never, s.scopeUc as never).execute('u', {
      page: 1,
      limit: 20,
      storeId: 'S9',
    });
    expect(result).toEqual({ items: [], total: 0 });
    expect(s.repository.findMany).not.toHaveBeenCalled();
  });

  it('phạm vi SELF không thấy gì', async () => {
    const s = setup({ type: 'SELF', storeIds: [], employeeId: 'e' });
    const result = await new ListAdminShipmentsUseCase(s.repository as never, s.scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(result.total).toBe(0);
  });
});

describe('SimulateAdminShipmentUseCase', () => {
  const build = (s: ReturnType<typeof setup>, enabled: string | undefined) => {
    const process = new ProcessCarrierEventUseCase(s.repository as never, s.carriers);
    return new SimulateAdminShipmentUseCase(
      { get: () => enabled } as never,
      s.access,
      s.carriers,
      process,
      s.getDetail,
    );
  };

  it('tắt bằng biến môi trường -> 404, không xử lý gì', async () => {
    const s = setup(ALL);
    await expect(build(s, 'false').execute('u', 's1', 'PICKED_UP')).rejects.toBeInstanceOf(NotFoundException);
    expect(s.repository.applyCarrierEvent).not.toHaveBeenCalled();
  });

  it('bật: ký sự kiện rồi đi qua đúng đường webhook (parseWebhook + applyCarrierEvent)', async () => {
    const s = setup(ALL);
    await build(s, 'true').execute('u', 's1', 'PICKED_UP');
    expect(s.gateway.buildSignedWebhook).toHaveBeenCalledWith(expect.objectContaining({ trackingCode: 'MOCK1', status: 'PICKED_UP' }));
    expect(s.gateway.parseWebhook).toHaveBeenCalledWith({ a: 1 }, { sig: 'x' });
    expect(s.repository.applyCarrierEvent).toHaveBeenCalledWith(expect.objectContaining({ carrierCode: 'MOCK', trackingCode: 'MOCK1' }));
  });

  it('vận đơn cửa hàng khác -> 403', async () => {
    const s = setup(store('S2'));
    await expect(build(s, 'true').execute('u', 's1', 'PICKED_UP')).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.repository.applyCarrierEvent).not.toHaveBeenCalled();
  });
});

describe('ProcessCarrierEventUseCase', () => {
  it('hãng lạ trên đường dẫn webhook -> 404', () => {
    const s = setup(ALL);
    expect(() => new ProcessCarrierEventUseCase(s.repository as never, s.carriers).execute('XYZ', {}, {})).toThrow(NotFoundException);
  });

  it('chữ ký sai (adapter ném lỗi) -> không ghi gì', () => {
    const s = setup(ALL);
    s.gateway.parseWebhook.mockImplementation(() => {
      throw new ForbiddenException('sai chữ ký');
    });
    expect(() => new ProcessCarrierEventUseCase(s.repository as never, s.carriers).execute('MOCK', {}, {})).toThrow(ForbiddenException);
    expect(s.repository.applyCarrierEvent).not.toHaveBeenCalled();
  });
});
