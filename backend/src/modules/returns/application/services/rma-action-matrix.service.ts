import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
} from '../../domain/entities/return-policy.entity';
import { TransitionRmaDto } from '../../presentation/dtos/rma-queue.dto';

export enum RmaAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_MORE_INFO = 'REQUEST_MORE_INFO',
  RECEIVE_DROPOFF = 'RECEIVE_DROPOFF',
  DISPATCH_PICKUP = 'DISPATCH_PICKUP',
  START_INSPECTION = 'START_INSPECTION',
  COMPLETE_INSPECTION = 'COMPLETE_INSPECTION',
  CALCULATE_REFUND = 'CALCULATE_REFUND',
  CREATE_REFUND = 'CREATE_REFUND',
  CALCULATE_EXCHANGE_QUOTE = 'CALCULATE_EXCHANGE_QUOTE',
  CREATE_EXCHANGE_ORDER = 'CREATE_EXCHANGE_ORDER',
  CANCEL = 'CANCEL',
}

@Injectable()
export class RmaActionMatrixService {
  private readonly logger = new Logger(RmaActionMatrixService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán danh sách hành động khả dụng động (Available Actions) dựa trên trạng thái RMA hiện tại
   * Tuân thủ ma trận chuyển đổi trạng thái của DES-05 / DES-08 (EP18-T02)
   */
  getAvailableActions(returnOrder: {
    status: string;
    returnChannel?: string;
  }): string[] {
    const status = returnOrder.status as ReturnOrderStatus;
    const channel = returnOrder.returnChannel;

    switch (status) {
      case ReturnOrderStatus.SUBMITTED:
        return [
          RmaAction.APPROVE,
          RmaAction.REJECT,
          RmaAction.REQUEST_MORE_INFO,
        ];

      case ReturnOrderStatus.APPROVED:
        if (channel === ReturnChannel.STORE_DROPOFF) {
          return [RmaAction.RECEIVE_DROPOFF, RmaAction.CANCEL];
        }
        if (channel === ReturnChannel.CARRIER_PICKUP) {
          return [RmaAction.DISPATCH_PICKUP, RmaAction.CANCEL];
        }
        return [
          RmaAction.RECEIVE_DROPOFF,
          RmaAction.DISPATCH_PICKUP,
          RmaAction.CANCEL,
        ];

      case ReturnOrderStatus.RECEIVED:
        // AC2: Tuyệt đối không bao giờ cho phép bấm REFUND hay EXCHANGE khi chưa có kết quả KCS
        return [RmaAction.START_INSPECTION, RmaAction.COMPLETE_INSPECTION];

      case ReturnOrderStatus.RESOLUTION_PENDING:
        return [
          RmaAction.CALCULATE_REFUND,
          RmaAction.CREATE_REFUND,
          RmaAction.CALCULATE_EXCHANGE_QUOTE,
          RmaAction.CREATE_EXCHANGE_ORDER,
        ];

      case ReturnOrderStatus.COMPLETED:
      case ReturnOrderStatus.REJECTED:
      case ReturnOrderStatus.CANCELLED:
      default:
        return [];
    }
  }

  /**
   * Xác thực xem một hành động nghiệp vụ có hợp lệ với trạng thái hiện tại hay không
   */
  validateAction(
    returnOrder: { status: string; returnChannel?: string },
    action: string,
  ): void {
    const availableActions = this.getAvailableActions(returnOrder);
    if (!availableActions.includes(action)) {
      throw new BadRequestException(
        `Hành động '${action}' không hợp lệ đối với hồ sơ ở trạng thái '${returnOrder.status}'. Danh sách hành động khả dụng: [${availableActions.join(', ')}]`,
      );
    }
  }

  /**
   * Thực hiện chuyển trạng thái hồ sơ với cơ chế kiểm soát đồng thời lạc quan (OCC)
   * Sử dụng cột version để chặn xung đột thao tác đồng thời (HTTP 409 Conflict) (EP18-T02)
   */
  async transitionWithOcc(
    returnOrderId: string,
    operatorUserId: string,
    dto: TransitionRmaDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Truy vấn bản ghi hiện tại
      const current = await tx.returnOrder.findUnique({
        where: { id: returnOrderId },
      });

      if (!current) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ đổi trả với ID: ${returnOrderId}`,
        );
      }

      // 2. Kiểm tra xung đột phiên bản OCC (EP18-T02 AC3)
      if (current.version !== dto.expectedVersion) {
        this.logger.warn(
          `[OCC_CONFLICT] Hồ sơ RMA ${current.returnCode} phát hiện xung đột đồng thời. Phiên bản hiện tại: ${current.version}, Phiên bản yêu cầu: ${dto.expectedVersion}`,
        );
        throw new ConflictException(
          `CONCURRENT_MODIFICATION_DETECTED: Hồ sơ RMA đã được cập nhật bởi một người dùng khác (phiên bản hiện tại: ${current.version}, phiên bản gửi lên: ${dto.expectedVersion}). Vui lòng tải lại trang để xem dữ liệu mới nhất.`,
        );
      }

      // 3. Kiểm tra tính hợp lệ của việc chuyển trạng thái
      this.validateStatusTransition(current.status as ReturnOrderStatus, dto.targetStatus);

      // 4. Cập nhật trạng thái và tăng số version
      const updated = await tx.returnOrder.update({
        where: { id: returnOrderId },
        data: {
          status: dto.targetStatus,
          version: { increment: 1 },
          handledBy: operatorUserId,
          rejectionReason: dto.reason || current.rejectionReason,
          adminNote: dto.note
            ? current.adminNote
              ? `${current.adminNote}\n${dto.note}`
              : dto.note
            : current.adminNote,
        },
      });

      // 5. Ghi nhật ký lịch sử trạng thái ReturnStatusHistory (AC4)
      await tx.returnStatusHistory.create({
        data: {
          returnOrderId: current.id,
          status: dto.targetStatus,
          changedBy: operatorUserId,
          note: dto.note || `Chuyển trạng thái sang ${dto.targetStatus} (v${updated.version})`,
        },
      });

      // 6. Ghi sự kiện Outbox RMA_STATUS_TRANSITIONED
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'RETURN_ORDER',
          aggregateId: current.id,
          eventType: 'RMA_STATUS_TRANSITIONED',
          payload: {
            returnOrderId: current.id,
            returnCode: current.returnCode,
            fromStatus: current.status,
            toStatus: dto.targetStatus,
            previousVersion: current.version,
            newVersion: updated.version,
            operatorUserId,
            note: dto.note,
          },
        },
      });

      return {
        returnOrder: updated,
        availableActions: this.getAvailableActions(updated),
      };
    });
  }

  /**
   * Kiểm tra luồng chuyển đổi trạng thái hợp lệ
   */
  private validateStatusTransition(
    from: ReturnOrderStatus,
    to: ReturnOrderStatus,
  ): void {
    if (from === to) return;

    const validTransitions: Record<ReturnOrderStatus, ReturnOrderStatus[]> = {
      [ReturnOrderStatus.DRAFT]: [
        ReturnOrderStatus.SUBMITTED,
        ReturnOrderStatus.CANCELLED,
      ],
      [ReturnOrderStatus.SUBMITTED]: [
        ReturnOrderStatus.APPROVED,
        ReturnOrderStatus.REJECTED,
        ReturnOrderStatus.CANCELLED,
      ],
      [ReturnOrderStatus.APPROVED]: [
        ReturnOrderStatus.SHIPPED,
        ReturnOrderStatus.RECEIVED,
        ReturnOrderStatus.CANCELLED,
      ],
      [ReturnOrderStatus.SHIPPED]: [
        ReturnOrderStatus.RECEIVED,
        ReturnOrderStatus.CANCELLED,
      ],
      [ReturnOrderStatus.RECEIVED]: [
        ReturnOrderStatus.INSPECTING,
        ReturnOrderStatus.RESOLUTION_PENDING,
        ReturnOrderStatus.REJECTED,
      ],
      [ReturnOrderStatus.INSPECTING]: [
        ReturnOrderStatus.RESOLUTION_PENDING,
        ReturnOrderStatus.REJECTED,
      ],
      [ReturnOrderStatus.RESOLUTION_PENDING]: [
        ReturnOrderStatus.COMPLETED,
        ReturnOrderStatus.DISPUTED,
        ReturnOrderStatus.REJECTED,
      ],
      [ReturnOrderStatus.DISPUTED]: [
        ReturnOrderStatus.RESOLUTION_PENDING,
        ReturnOrderStatus.COMPLETED,
        ReturnOrderStatus.REJECTED,
      ],
      [ReturnOrderStatus.COMPLETED]: [],
      [ReturnOrderStatus.REJECTED]: [],
      [ReturnOrderStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[from] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Không thể chuyển đổi trạng thái hồ sơ RMA từ '${from}' sang '${to}'. Các bước chuyển hợp lệ: [${allowed.join(', ')}]`,
      );
    }
  }
}
