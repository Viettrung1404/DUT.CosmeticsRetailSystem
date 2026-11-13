import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  IShipmentRepository,
  ReceiveReturnedShipmentResult,
  SHIPMENT_REPOSITORY,
} from '../../domain/repositories/shipment.repository.interface';
import { ShipmentAccessService } from '../services/shipment-access.service';

export interface ReceiveReturnedShipmentCommand {
  damaged?: { productVariantId: string; quantity: number }[];
  note?: string;
}

@Injectable()
export class ReceiveReturnedShipmentUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly access: ShipmentAccessService,
  ) {}

  async execute(
    userId: string,
    shipmentId: string,
    command: ReceiveReturnedShipmentCommand,
  ): Promise<ReceiveReturnedShipmentResult> {
    const info = await this.access.getAccessibleShipment(userId, shipmentId);
    if (info.status !== 'RETURNED') throw new ConflictException('SHIPMENT_NOT_RETURNED');
    return this.repository.receiveReturned({
      shipmentId,
      actorId: userId,
      damaged: command.damaged ?? [],
      note: command.note?.trim() || undefined,
    });
  }
}
