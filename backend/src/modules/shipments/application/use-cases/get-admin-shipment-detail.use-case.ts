import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
  ShipmentDetail,
} from '../../domain/repositories/shipment.repository.interface';
import { ShipmentAccessService } from '../services/shipment-access.service';

@Injectable()
export class GetAdminShipmentDetailUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly access: ShipmentAccessService,
  ) {}

  async execute(userId: string, shipmentId: string): Promise<ShipmentDetail> {
    await this.access.getAccessibleShipment(userId, shipmentId);
    const detail = await this.repository.findDetail(shipmentId);
    if (!detail) throw new NotFoundException('SHIPMENT_NOT_FOUND');
    return detail;
  }
}
