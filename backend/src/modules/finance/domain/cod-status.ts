/**
 * Trạng thái vòng đời thu hộ COD (4 giai đoạn độc lập theo DES-05 & DES-07)
 * 
 * 1. COD_EXPECTED: Tạo Shipment có phát sinh COD (remainingPayable > 0)
 * 2. COD_COLLECTED: Shipper xác nhận đã thu tiền mặt từ người nhận
 * 3. SETTLEMENT_PENDING: 3PL phát hành Bảng kê đối soát định kỳ (Reconciliation Report)
 * 4. SETTLED: Tiền thực tế đã chuyển vào Tài khoản Ngân hàng GlowUp & Đối chiếu khớp
 * 5. SETTLEMENT_DISCREPANCY: Lệch số tiền thu hộ / Sai phí cước dịch vụ
 */
export type CodStatus =
  | 'COD_EXPECTED'
  | 'COD_COLLECTED'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'SETTLEMENT_DISCREPANCY';

export const COD_STATUSES = {
  COD_EXPECTED: 'COD_EXPECTED' as CodStatus,
  COD_COLLECTED: 'COD_COLLECTED' as CodStatus,
  SETTLEMENT_PENDING: 'SETTLEMENT_PENDING' as CodStatus,
  SETTLED: 'SETTLED' as CodStatus,
  SETTLEMENT_DISCREPANCY: 'SETTLEMENT_DISCREPANCY' as CodStatus,
};

export const ALLOWED_COD_TRANSITIONS: Record<string, CodStatus[]> = {
  COD_EXPECTED: ['COD_COLLECTED', 'SETTLEMENT_PENDING'],
  COD_COLLECTED: ['SETTLEMENT_PENDING', 'SETTLED', 'SETTLEMENT_DISCREPANCY'],
  SETTLEMENT_PENDING: ['SETTLED', 'SETTLEMENT_DISCREPANCY'],
  SETTLEMENT_DISCREPANCY: ['SETTLED'],
  SETTLED: [], // Terminal state
};

/**
 * Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái COD
 */
export function isValidCodTransition(
  currentStatus: string | null | undefined,
  targetStatus: CodStatus,
): { isValid: boolean; reason?: string } {
  if (!currentStatus) {
    return { isValid: true };
  }

  const current = currentStatus.toUpperCase() as CodStatus;
  if (current === targetStatus) {
    return { isValid: true }; // Idempotent
  }

  const allowed = ALLOWED_COD_TRANSITIONS[current];
  if (!allowed || !allowed.includes(targetStatus)) {
    return {
      isValid: false,
      reason: `Không thể chuyển đổi trạng thái COD từ ${current} sang ${targetStatus}. Các trạng thái cho phép: [${(allowed || []).join(', ')}]`,
    };
  }

  return { isValid: true };
}

export interface PackageValuation {
  id: string;
  value: number;
}

export interface AllocatedCod {
  id: string;
  codAmount: number;
}

/**
 * Thuật toán phân bổ COD theo tỷ lệ giá trị hàng hóa khi tách đơn (Split Fulfillment)
 * Formula: Shipment[k].codAmount = Round(Order.remainingPayable * PackageValue[k] / sum(PackageValue))
 * Invariant: sum(Shipment.codAmount) === Order.remainingPayable
 * Khoản làm tròn số lẻ được cộng/trừ vào kiện hàng cuối cùng.
 */
export function allocateSplitCod(
  remainingPayable: number,
  packages: PackageValuation[],
): AllocatedCod[] {
  if (!packages || packages.length === 0) {
    return [];
  }

  const payable = Math.max(0, Math.round(remainingPayable));
  if (payable === 0) {
    return packages.map((pkg) => ({ id: pkg.id, codAmount: 0 }));
  }

  if (packages.length === 1) {
    return [{ id: packages[0].id, codAmount: payable }];
  }

  const totalValue = packages.reduce((sum, p) => sum + Math.max(0, p.value), 0);

  // Nếu tổng giá trị các kiện = 0, chia đều cho các kiện và phần dư vào kiện cuối
  if (totalValue === 0) {
    const baseShare = Math.floor(payable / packages.length);
    let remainder = payable - baseShare * packages.length;
    return packages.map((pkg, idx) => {
      const isLast = idx === packages.length - 1;
      return {
        id: pkg.id,
        codAmount: isLast ? baseShare + remainder : baseShare,
      };
    });
  }

  let allocatedSum = 0;
  const result: AllocatedCod[] = [];

  for (let i = 0; i < packages.length - 1; i++) {
    const pkg = packages[i];
    const pkgValue = Math.max(0, pkg.value);
    const amount = Math.round((payable * pkgValue) / totalValue);
    result.push({
      id: pkg.id,
      codAmount: amount,
    });
    allocatedSum += amount;
  }

  // Kiện cuối cùng nhận phần còn lại để bảo đảm sum === remainingPayable 100%
  const lastPkg = packages[packages.length - 1];
  const lastAmount = Math.max(0, payable - allocatedSum);
  result.push({
    id: lastPkg.id,
    codAmount: lastAmount,
  });

  return result;
}
