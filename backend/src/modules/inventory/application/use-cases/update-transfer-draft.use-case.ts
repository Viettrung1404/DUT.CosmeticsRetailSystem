import { Injectable } from '@nestjs/common';
import { TransferLineInput, TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';
import { validateTransferLines } from './create-transfer.use-case';

@Injectable()
export class UpdateTransferDraftUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async execute(
    userId: string,
    id: string,
    input: { note?: string | null; items?: TransferLineInput[] },
  ): Promise<TransferView> {
    await this.access.load(userId, id, 'TO', ['DRAFT']);
    if (input.items) await validateTransferLines(this.access.repository, input.items);
    const note = input.note === undefined ? undefined : input.note?.trim() || null;
    if (!(await this.access.repository.replaceDraft(id, note, input.items))) {
      throw this.access.statusChanged();
    }
    return this.access.reload(id);
  }
}
