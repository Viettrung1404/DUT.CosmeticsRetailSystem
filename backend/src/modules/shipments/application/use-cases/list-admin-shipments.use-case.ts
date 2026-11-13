import { Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IShipmentRepository,
  SHIPMENT_REPOSITORY,
  ShipmentListItem,
} from '../../domain/repositories/shipment.repository.interface';
import { storeIdsForList } from '../utils/scope.util';

export interface ListAdminShipmentsInput {
  page: number;
  limit: number;
  status?: string;
  carrierCode?: string;
  storeId?: string;
  orderId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class ListAdminShipmentsUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY) private readonly repository: IShipmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, input: ListAdminShipmentsInput): Promise<{ items: ShipmentListItem[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    const storeIds = storeIdsForList(scope, input.storeId);
    if (storeIds && storeIds.length === 0) return { items: [], total: 0 };
    return this.repository.findMany({
      storeIds,
      page: input.page,
      limit: input.limit,
      status: input.status,
      carrierCode: input.carrierCode,
      orderId: input.orderId,
      search: input.search,
      from: input.from,
      to: input.to,
    });
  }
}
