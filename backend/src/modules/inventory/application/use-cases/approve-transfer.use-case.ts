import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';

// NV kho tổng duyệt số lượng đáp ứng từng dòng (không gửi thì đáp ứng đủ số yêu cầu)
@Injectable()
export class ApproveTransferUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async execute(
    userId: string,
    id: string,
    items: { itemId: string; quantityApproved: number }[] = [],
  ): Promise<TransferView> {
    const transfer = await this.access.load(userId, id, 'FROM', ['REQUESTED']);
    const byId = new Map(transfer.items.map((i) => [i.id, i]));
    const approved = new Map(transfer.items.map((i) => [i.id, i.quantityRequested]));
    for (const line of items) {
      const item = byId.get(line.itemId);
      if (!item) throw new BadRequestException('Dòng không thuộc phiếu chuyển kho này');
      if (line.quantityApproved > item.quantityRequested) {
        throw new BadRequestException(`${item.sku}: số duyệt không được vượt số yêu cầu (${item.quantityRequested})`);
      }
      approved.set(line.itemId, line.quantityApproved);
    }
    if ([...approved.values()].every((q) => q === 0)) {
      throw new BadRequestException('Không đáp ứng dòng nào thì hãy hủy phiếu');
    }
    const ok = await this.access.repository.changeStatus(id, ['REQUESTED'], 'APPROVED', {
      approvedBy: userId,
      approvedQuantities: approved,
    });
    if (!ok) throw this.access.statusChanged();
    return this.access.reload(id);
  }
}
