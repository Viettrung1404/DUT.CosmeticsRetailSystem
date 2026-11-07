import { Injectable } from '@nestjs/common';
import { TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';

// Gửi yêu cầu (cửa hàng nhận) và hủy phiếu (bên nào cũng được, trước khi xuất kho)
@Injectable()
export class ChangeTransferStatusUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async request(userId: string, id: string): Promise<TransferView> {
    await this.access.load(userId, id, 'TO', ['DRAFT']);
    if (!(await this.access.repository.changeStatus(id, ['DRAFT'], 'REQUESTED'))) {
      throw this.access.statusChanged();
    }
    return this.access.reload(id);
  }

  async cancel(userId: string, id: string): Promise<TransferView> {
    const open = ['DRAFT', 'REQUESTED', 'APPROVED'];
    await this.access.load(userId, id, 'EITHER', open);
    if (!(await this.access.repository.changeStatus(id, open, 'CANCELLED'))) {
      throw this.access.statusChanged();
    }
    return this.access.reload(id);
  }
}
