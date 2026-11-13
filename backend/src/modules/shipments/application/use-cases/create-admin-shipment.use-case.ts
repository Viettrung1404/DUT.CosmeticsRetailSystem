import { randomInt } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import {
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
  ShipmentDetail,
} from '../../domain/repositories/shipment.repository.interface';
import { codAmountFor } from '../../domain/shipment-status';
import { MOCK_CARRIER_CODE } from '../../infrastructure/adapters/mock-carrier.adapter';
import { CarrierRegistry } from '../services/carrier-registry.service';
import { assertStoreInScope } from '../utils/scope.util';
import { GetAdminShipmentDetailUseCase } from './get-admin-shipment-detail.use-case';

export function newShipmentCode(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `VD${d}${randomInt(0, 1_000_000).toString().padStart(6, '0')}`;
}

@Injectable()
export class CreateAdminShipmentUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
    private readonly carriers: CarrierRegistry,
    private readonly getDetail: GetAdminShipmentDetailUseCase,
  ) {}

  async execute(userId: string, orderId: string, carrierCode = MOCK_CARRIER_CODE): Promise<ShipmentDetail> {
    const gateway = this.carriers.require(carrierCode);
    const order = await this.repository.findOrderForShipment(orderId);
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    assertStoreInScope(await this.getUserDataScope.execute(userId), order.storeId, 'Đơn hàng');
    if (order.orderType !== 'ONLINE') throw new BadRequestException('SHIPMENT_ORDER_NOT_DELIVERY');
    if (order.status !== OrderStatus.PROCESSING) throw new ConflictException('SHIPMENT_ORDER_STATE_INVALID');
    if (order.hasActiveShipment) throw new ConflictException('SHIPMENT_ALREADY_EXISTS');
    const address = order.shippingAddress;
    if (!address?.recipientName || !address.phone || !address.addressLine) {
      throw new BadRequestException('SHIPMENT_ADDRESS_MISSING');
    }

    const shipmentCode = newShipmentCode();
    const codAmount = codAmountFor(order.totalAmount, order.completedPaid, order.exchangeCredit);
    const created = await gateway.createShipment({
      shipmentCode,
      orderNumber: order.orderNumber,
      codAmount,
      shippingFee: order.shippingFee,
      weightGrams: order.totalWeightGrams,
      recipientName: address.recipientName,
      recipientPhone: address.phone,
      recipientAddress: [address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', '),
    });
    try {
      const id = await this.repository.create({
        orderId,
        shipmentCode,
        carrierCode,
        trackingCode: created.trackingCode,
        serviceCode: created.serviceCode,
        labelUrl: created.labelUrl,
        metadata: created.metadata,
        codAmount,
        shippingFee: order.shippingFee,
        createdBy: userId,
      });
      return await this.getDetail.execute(userId, id);
    } catch (error) {
      // Ghi vận đơn thất bại thì hủy bên hãng để không mồ côi
      await gateway.cancelShipment(created.trackingCode).catch(() => undefined);
      throw error;
    }
  }
}
