import { Injectable } from '@nestjs/common';
import {
  ReturnInspectionStatus,
  ReturnOrderStatus,
  ReturnDisposition,
} from '../../domain/entities/return-policy.entity';

export interface ItemInspectionOutcome {
  inspectionStatus: ReturnInspectionStatus | string;
  disposition?: ReturnDisposition | string | null;
}

export interface AggregationResult {
  overallResult: 'PASSED' | 'FAILED' | 'PARTIALLY_PASSED' | 'DISPUTED';
  returnOrderStatus: ReturnOrderStatus;
}

@Injectable()
export class RmaStatusAggregator {
  /**
   * Tính toán kết quả thẩm định tổng thể và trạng thái kế tiếp của ReturnOrder (EP15-T03)
   */
  aggregate(items: ItemInspectionOutcome[]): AggregationResult {
    if (!items || items.length === 0) {
      return {
        overallResult: 'DISPUTED',
        returnOrderStatus: ReturnOrderStatus.INSPECTING,
      };
    }

    // 1. Kiểm tra tranh chấp / khiếu nại
    const hasDispute = items.some(
      (item) => item.inspectionStatus === ReturnInspectionStatus.DISPUTED,
    );
    if (hasDispute) {
      return {
        overallResult: 'DISPUTED',
        returnOrderStatus: ReturnOrderStatus.DISPUTED,
      };
    }

    const allPassed = items.every(
      (item) => item.inspectionStatus === ReturnInspectionStatus.PASSED,
    );

    const allFailed = items.every(
      (item) => item.inspectionStatus === ReturnInspectionStatus.FAILED,
    );

    // 2. 100% items PASSED -> Chuyển sang RESOLUTION_PENDING (để tiến hành hoàn tiền / đổi hàng)
    if (allPassed) {
      return {
        overallResult: 'PASSED',
        returnOrderStatus: ReturnOrderStatus.RESOLUTION_PENDING,
      };
    }

    // 3. 100% items FAILED -> Chuyển sang REJECTED (từ chối toàn bộ hồ sơ)
    if (allFailed) {
      return {
        overallResult: 'FAILED',
        returnOrderStatus: ReturnOrderStatus.REJECTED,
      };
    }

    // 4. Hỗn hợp (Có ít nhất 1 item PASSED và 1 item FAILED) -> PARTIALLY_PASSED
    // ReturnOrder vẫn chuyển sang RESOLUTION_PENDING để thanh toán phần đạt chuẩn,
    // ghi nhận từ chối phần không đạt.
    return {
      overallResult: 'PARTIALLY_PASSED',
      returnOrderStatus: ReturnOrderStatus.RESOLUTION_PENDING,
    };
  }
}
