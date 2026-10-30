import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';
import { stockFailureToException } from '../utils/stock-error.util';

// Cửa hàng nhận đếm hàng: dòng không gửi coi như nhận đủ; nhận thiếu phải ghi lý do hao hụt
@Injectable()
export class ReceiveTransferUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async execute(
    userId: string,
    id: string,
    items: { itemId: string; quantityReceived: number; lossReason?: string }[] = [],
  ): Promise<TransferView> {
    const transfer = await this.access.load(userId, id, 'TO', ['SHIPPED']);
    const byId = new Map(transfer.items.map((i) => [i.id, i]));
    const lines = new Map<string, { quantityReceived: number; lossReason: string | null }>();
    for (const line of items) {
      const item = byId.get(line.itemId);
      if (!item || item.quantityShipped === 0) {
        throw new BadRequestException('Dòng không thuộc hàng đã xuất của phiếu này');
      }
      if (line.quantityReceived > item.quantityShipped) {
        throw new BadRequestException(`${item.sku}: số nhận không được vượt số đã xuất (${item.quantityShipped})`);
      }
      const lossReason = line.lossReason?.trim() || null;
      if (line.quantityReceived < item.quantityShipped && !lossReason) {
        throw new BadRequestException(`${item.sku}: nhận thiếu thì phải ghi lý do hao hụt`);
      }
      lines.set(line.itemId, { quantityReceived: line.quantityReceived, lossReason });
    }
    const result = await this.access.repository.receive(id, userId, lines);
    if (!result.ok) throw stockFailureToException(result.reason, result.available, result.sku);
    return this.access.reload(id);
  }
}
