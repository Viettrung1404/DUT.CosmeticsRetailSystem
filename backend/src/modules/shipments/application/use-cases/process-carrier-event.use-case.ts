import { Inject, Injectable } from '@nestjs/common';
import {
  ApplyCarrierEventResult,
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
} from '../../domain/repositories/shipment.repository.interface';
import { CarrierRegistry } from '../services/carrier-registry.service';

// Đường xử lý duy nhất cho sự kiện của hãng: webhook thật và giả lập đều đi qua đây
@Injectable()
export class ProcessCarrierEventUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly carriers: CarrierRegistry,
  ) {}

  execute(
    carrierCode: string,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<ApplyCarrierEventResult> {
    const event = this.carriers.requireForWebhook(carrierCode).parseWebhook(body, headers);
    return this.repository.applyCarrierEvent({ carrierCode, ...event });
  }
}
