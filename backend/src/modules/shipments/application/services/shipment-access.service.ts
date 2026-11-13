import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
  ShipmentAccessInfo,
} from '../../domain/repositories/shipment.repository.interface';
import { assertStoreInScope } from '../utils/scope.util';

@Injectable()
export class ShipmentAccessService {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async getAccessibleShipment(userId: string, shipmentId: string): Promise<ShipmentAccessInfo> {
    const info = await this.repository.findAccessInfo(shipmentId);
    if (!info) throw new NotFoundException('SHIPMENT_NOT_FOUND');
    const scope = await this.getUserDataScope.execute(userId);
    assertStoreInScope(scope, info.storeId, 'Vận đơn');
    return info;
  }
}
