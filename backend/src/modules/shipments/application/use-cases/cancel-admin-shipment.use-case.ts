import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
  ShipmentDetail,
} from '../../domain/repositories/shipment.repository.interface';
import { canCancelShipment } from '../../domain/shipment-status';
import { CarrierRegistry } from '../services/carrier-registry.service';
import { ShipmentAccessService } from '../services/shipment-access.service';
import { GetAdminShipmentDetailUseCase } from './get-admin-shipment-detail.use-case';

@Injectable()
export class CancelAdminShipmentUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly access: ShipmentAccessService,
    private readonly carriers: CarrierRegistry,
    private readonly getDetail: GetAdminShipmentDetailUseCase,
  ) {}

  async execute(userId: string, shipmentId: string): Promise<ShipmentDetail> {
    const info = await this.access.getAccessibleShipment(userId, shipmentId);
    if (!canCancelShipment(info.status)) throw new ConflictException('SHIPMENT_CANCEL_NOT_ALLOWED');
    if (info.trackingCode) await this.carriers.require(info.carrierCode).cancelShipment(info.trackingCode);
    await this.repository.cancel(shipmentId, userId);
    return this.getDetail.execute(userId, shipmentId);
  }
}
