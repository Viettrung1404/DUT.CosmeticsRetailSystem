/**
 * Helper nghiệp vụ cho Phân hệ Nhân viên Cửa hàng & Kho (Store Staff Operations)
 * GlowUp Omnichannel - Phase 4 (MB-05, MB-06, MB-07)
 */

export interface PickItemTarget {
  variantId: string;
  sku: string;
  productName: string;
  barcode?: string | null;
  lotId?: string;
  batchCode: string;
  expiryDate?: Date | string;
  quantity: number;
}

export interface PickItemState extends PickItemTarget {
  pickedCount: number;
}

export interface BarcodeMatchResult {
  success: boolean;
  type: 'EXACT_MATCH' | 'WRONG_SKU' | 'WRONG_BATCH' | 'ALREADY_COMPLETED' | 'NOT_FOUND';
  message: string;
  matchedVariantId?: string;
}

/**
 * Kiểm tra xem người dùng hiện tại có quyền truy cập Staff Mode không
 */
export function isStaffUser(user: any): boolean {
  if (!user) return false;
  const role = (user.roleName || user.role || '').toUpperCase();
  const allowedRoles = [
    'ADMIN',
    'STORE_STAFF',
    'STAFF',
    'STORE_MGR',
    'STORE_MANAGER',
    'WH_OPERATOR',
    'WH_SUPERVISOR',
    'WAREHOUSE_STAFF',
    'MANAGER',
  ];
  return allowedRoles.includes(role);
}

/**
 * Đối chiếu mã vạch quét được (1D/2D) với danh sách nhặt hàng
 */
export function verifyPickingBarcode(
  scannedCode: string,
  targetItem: PickItemState
): BarcodeMatchResult {
  const code = (scannedCode || '').trim().toUpperCase();
  if (!code) {
    return {
      success: false,
      type: 'NOT_FOUND',
      message: 'Mã quét rỗng hoặc không đọc được',
    };
  }

  // Đã nhặt đủ số lượng cho item này
  if (targetItem.pickedCount >= targetItem.quantity) {
    return {
      success: false,
      type: 'ALREADY_COMPLETED',
      message: `Sản phẩm ${targetItem.sku} đã nhặt đủ số lượng (${targetItem.quantity}/${targetItem.quantity})`,
    };
  }

  const itemBarcode = (targetItem.barcode || '').trim().toUpperCase();
  const itemSku = (targetItem.sku || '').trim().toUpperCase();
  const itemBatch = (targetItem.batchCode || '').trim().toUpperCase();

  // 1. Kiểm tra khớp chính xác cả SKU/Barcode và Lô (ví dụ quét mã QR chứa SKU|BATCH hoặc barcode chuẩn)
  const isBarcodeOrSkuMatch = code === itemBarcode || code === itemSku;
  const isBatchMatch = code === itemBatch;

  // Trường hợp quét mã tổng hợp SKU + BATCH (ví dụ: "SKU123|LOT202611")
  if (code.includes('|') || code.includes(';')) {
    const parts = code.split(/[|;]/).map((s) => s.trim());
    const hasSku = parts.some((p) => p === itemSku || p === itemBarcode);
    const hasBatch = parts.some((p) => p === itemBatch);

    if (hasSku && hasBatch) {
      return {
        success: true,
        type: 'EXACT_MATCH',
        message: `Khớp chính xác: ${targetItem.productName} (Lô: ${targetItem.batchCode})`,
        matchedVariantId: targetItem.variantId,
      };
    }

    if (hasSku && !hasBatch) {
      return {
        success: false,
        type: 'WRONG_BATCH',
        message: `Sai số lô! Yêu cầu lô FEFO [${targetItem.batchCode}], mã quét chứa lô khác.`,
      };
    }
  }

  // Quét barcode hoặc SKU đơn thuần
  if (isBarcodeOrSkuMatch) {
    return {
      success: true,
      type: 'EXACT_MATCH',
      message: `Đã nhặt: ${targetItem.productName} - SKU: ${targetItem.sku}`,
      matchedVariantId: targetItem.variantId,
    };
  }

  // Quét trúng Batch nhưng không khớp Barcode/SKU
  if (isBatchMatch) {
    return {
      success: true,
      type: 'EXACT_MATCH',
      message: `Khớp số lô FEFO: ${targetItem.batchCode}`,
      matchedVariantId: targetItem.variantId,
    };
  }

  return {
    success: false,
    type: 'WRONG_SKU',
    message: `Mã [${scannedCode}] không khớp với SKU hoặc Barcode của mặt hàng này!`,
  };
}

/**
 * Kiểm tra toàn bộ Pick List đã nhặt đủ 100% chưa
 */
export function isPickingListComplete(items: PickItemState[]): boolean {
  if (!items || items.length === 0) return false;
  return items.every((item) => item.pickedCount >= item.quantity);
}

/**
 * Tính tổng tiến độ nhặt hàng
 */
export function calculatePickingProgress(items: PickItemState[]): {
  totalRequired: number;
  totalPicked: number;
  percentage: number;
  isComplete: boolean;
} {
  const totalRequired = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalPicked = items.reduce((sum, it) => sum + it.pickedCount, 0);
  const percentage = totalRequired > 0 ? Math.round((totalPicked / totalRequired) * 100) : 0;
  return {
    totalRequired,
    totalPicked,
    percentage: Math.min(percentage, 100),
    isComplete: totalRequired > 0 && totalPicked >= totalRequired,
  };
}

/**
 * Kiểm tra điều kiện tiếp nhận hồ sơ đổi trả tại Showroom (MB-07)
 */
export function verifyDropoffEligibility(
  returnOrder: any,
  currentStoreLocationId?: string
): { eligible: boolean; reason?: string } {
  if (!returnOrder) {
    return { eligible: false, reason: 'Không tìm thấy thông tin hồ sơ đổi trả' };
  }

  // 1. Phải là kênh trả tại Showroom
  if (returnOrder.returnChannel && returnOrder.returnChannel !== 'STORE_DROPOFF') {
    return {
      eligible: false,
      reason: 'Hồ sơ này đăng ký hình thức gửi qua bưu cục/shipper, không phải trả tại Showroom.',
    };
  }

  // 2. Trạng thái phải hợp lệ
  const validStatuses = ['SUBMITTED', 'APPROVED', 'AWAITING_RETURN'];
  const status = (returnOrder.status || '').toUpperCase();
  if (!validStatuses.includes(status)) {
    return {
      eligible: false,
      reason: `Hồ sơ đang ở trạng thái [${status}]. Chỉ có thể tiếp nhận khi hồ sơ ở trạng thái SUBMITTED hoặc APPROVED.`,
    };
  }

  // 3. Khớp địa điểm tiếp nhận Showroom
  if (currentStoreLocationId && returnOrder.dropoffLocationId) {
    if (returnOrder.dropoffLocationId !== currentStoreLocationId) {
      const storeName = returnOrder.dropoffLocation?.name || returnOrder.dropoffLocationName || 'chi nhánh khác';
      return {
        eligible: false,
        reason: `Khách hàng đã đăng ký trả tại Showroom [${storeName}]. Quý khách mang nhầm cửa hàng tiếp nhận!`,
      };
    }
  }

  return { eligible: true };
}
