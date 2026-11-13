import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShipmentDetail } from '../../domain/repositories/shipment.repository.interface';
import { CarrierRegistry } from '../services/carrier-registry.service';
import { ShipmentAccessService } from '../services/shipment-access.service';
import { GetAdminShipmentDetailUseCase } from './get-admin-shipment-detail.use-case';
import { ProcessCarrierEventUseCase } from './process-carrier-event.use-case';

@Injectable()
export class SimulateAdminShipmentUseCase {
  constructor(
    private readonly config: ConfigService,
    private readonly access: ShipmentAccessService,
    private readonly carriers: CarrierRegistry,
    private readonly processEvent: ProcessCarrierEventUseCase,
    private readonly getDetail: GetAdminShipmentDetailUseCase,
  ) {}

  async execute(userId: string, shipmentId: string, status: string): Promise<ShipmentDetail> {
    if (this.config.get<string>('SHIPPING_MOCK_ENABLED') !== 'true') {
      throw new NotFoundException('SHIPMENT_SIMULATE_DISABLED');
    }
    const info = await this.access.getAccessibleShipment(userId, shipmentId);
    if (!info.trackingCode) throw new BadRequestException('SHIPMENT_TRACKING_MISSING');
    const gateway = this.carriers.require(info.carrierCode);
    if (!gateway.buildSignedWebhook) throw new BadRequestException('SHIPMENT_SIMULATE_UNSUPPORTED');
    const { body, headers } = gateway.buildSignedWebhook({
      eventId: `SIM-${randomUUID()}`,
      trackingCode: info.trackingCode,
      status,
      occurredAt: new Date(),
    });
    await this.processEvent.execute(info.carrierCode, body, headers);
    return this.getDetail.execute(userId, shipmentId);
  }
}
