import { Injectable } from '@nestjs/common';
import { TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';
import { stockFailureToException } from '../utils/stock-error.util';

@Injectable()
export class ShipTransferUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async execute(userId: string, id: string): Promise<TransferView> {
    await this.access.load(userId, id, 'FROM', ['APPROVED']);
    const result = await this.access.repository.ship(id, userId);
    if (!result.ok) throw stockFailureToException(result.reason, result.available, result.sku);
    return this.access.reload(id);
  }
}
