import { Injectable } from '@nestjs/common';

export interface InventoryBalanceInput {
  physicalOnHand?: number | null;
  quantity?: number | null;
  reservedQuantity?: number | null;
  safetyStock?: number | null;
  quarantinedQuantity?: number | null;
  damagedQuantity?: number | null;
}

@Injectable()
export class AtpCalculatorService {
  /**
   * Tính toán tồn kho khả dụng bán lẻ (Available to Promise - ATP)
   * Chuẩn hóa theo tài liệu DES-05 / DES-06:
   * ATP = max(0, physicalOnHand - reservedQuantity - safetyStock - quarantinedQuantity - damagedQuantity)
   */
  calculateAtp(balance: InventoryBalanceInput | null | undefined): number {
    if (!balance) {
      return 0;
    }

    const physical = balance.physicalOnHand ?? balance.quantity ?? 0;
    const reserved = balance.reservedQuantity ?? 0;
    const safety = balance.safetyStock ?? 0;
    const quarantined = balance.quarantinedQuantity ?? 0;
    const damaged = balance.damagedQuantity ?? 0;

    const rawAtp = physical - reserved - safety - quarantined - damaged;
    return Math.max(0, rawAtp);
  }

  /**
   * Kiểm tra xem số lượng tồn ATP có đủ cho số lượng yêu cầu hay không.
   */
  hasSufficientAtp(
    balance: InventoryBalanceInput | null | undefined,
    requestedQuantity: number,
  ): boolean {
    if (requestedQuantity <= 0) {
      return true;
    }
    return this.calculateAtp(balance) >= requestedQuantity;
  }
}
