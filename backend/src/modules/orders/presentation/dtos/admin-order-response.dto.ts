import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminOrderListItem,
  OrderCustomerSummary,
  OrderStoreSummary,
} from '../../domain/repositories/admin-order.repository.interface';
import { AdminOrderDetailWithActions } from '../../application/use-cases/get-admin-order-detail.use-case';
import { ADMIN_STATUS_TARGETS } from '../../application/utils/order-actions.util';
import { OrderStatus } from '@core/domain/orders/order-status.enum';

export class OrderCustomerSummaryDto implements OrderCustomerSummary {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) fullName: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
}

export class OrderStoreSummaryDto implements OrderStoreSummary {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
}

export class AdminOrderListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ example: 'ONLINE' }) orderType: string;
  @ApiProperty({ example: 'PENDING' }) status: string;
  @ApiProperty() totalAmount: number;
  @ApiProperty({ description: 'Số dòng sản phẩm trong đơn' }) itemCount: number;
  @ApiPropertyOptional({ nullable: true, example: 'COD' }) paymentMethod: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'PENDING' }) paymentStatus: string | null;
  @ApiPropertyOptional({ type: OrderCustomerSummaryDto, nullable: true }) customer: OrderCustomerSummaryDto | null;
  @ApiProperty({ type: OrderStoreSummaryDto }) store: OrderStoreSummaryDto;
  @ApiProperty() createdAt: Date;

  static fromDomain(item: AdminOrderListItem): AdminOrderListItemDto {
    return Object.assign(new AdminOrderListItemDto(), item);
  }
}

class AdminOrderItemDto {
  @ApiProperty() id: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() sku: string;
  @ApiProperty() productName: string;
  @ApiProperty() variantName: string;
  @ApiPropertyOptional({ nullable: true }) imageUrl: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() discountAmount: number;
  @ApiProperty() totalPrice: number;
}

class AdminOrderPaymentDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'COD' }) paymentMethod: string;
  @ApiProperty() amount: number;
  @ApiProperty({ example: 'PENDING' }) status: string;
  @ApiPropertyOptional({ nullable: true }) transactionId: string | null;
  @ApiPropertyOptional({ nullable: true }) paidAt: Date | null;
  @ApiProperty() createdAt: Date;
}

class AdminOrderRefundDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) paymentId: string | null;
  @ApiProperty() amount: number;
  @ApiProperty() reason: string;
  @ApiProperty({ example: 'PENDING' }) status: string;
  @ApiPropertyOptional({ nullable: true }) processedAt: Date | null;
  @ApiProperty() createdAt: Date;
}

class AdminOrderShipmentDto {
  @ApiProperty() id: string;
  @ApiProperty() shipmentCode: string;
  @ApiProperty() carrierCode: string;
  @ApiPropertyOptional({ nullable: true }) trackingCode: string | null;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
}

class OrderUserSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
}

class AdminOrderStatusHistoryDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'CONFIRMED' }) status: string;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiPropertyOptional({ type: OrderUserSummaryDto, nullable: true, description: 'Người đổi trạng thái; null nếu do khách hoặc hệ thống' })
  changedBy: OrderUserSummaryDto | null;
  @ApiProperty() createdAt: Date;
}

class OrderSalesStaffDto {
  @ApiProperty() id: string;
  @ApiProperty() employeeCode: string;
  @ApiProperty() fullName: string;
}

class AdminOrderActionsDto {
  @ApiProperty({ description: 'Hiện nút "Xác nhận"' }) canConfirm: boolean;
  @ApiProperty({
    enum: ADMIN_STATUS_TARGETS,
    isArray: true,
    description: 'Trạng thái kế tiếp hợp lệ cho dropdown đổi trạng thái (rỗng nếu không đổi được)',
  })
  nextStatuses: OrderStatus[];
}

export class AdminOrderDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ example: 'ONLINE' }) orderType: string;
  @ApiProperty({ example: 'PENDING' }) status: string;
  @ApiProperty() subtotal: number;
  @ApiProperty() discountAmount: number;
  @ApiProperty() shippingFee: number;
  @ApiProperty() taxAmount: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty() loyaltyPointsUsed: number;
  @ApiPropertyOptional({ nullable: true, type: Object }) shippingAddress: Record<string, unknown> | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiPropertyOptional({ nullable: true }) couponCode: string | null;
  @ApiPropertyOptional({ type: OrderSalesStaffDto, nullable: true }) salesStaff: OrderSalesStaffDto | null;
  @ApiPropertyOptional({ type: OrderCustomerSummaryDto, nullable: true }) customer: OrderCustomerSummaryDto | null;
  @ApiProperty({ type: OrderStoreSummaryDto }) store: OrderStoreSummaryDto;
  @ApiProperty({ type: [AdminOrderItemDto] }) items: AdminOrderItemDto[];
  @ApiProperty({ type: [AdminOrderPaymentDto] }) payments: AdminOrderPaymentDto[];
  @ApiProperty({ type: [AdminOrderRefundDto] }) refunds: AdminOrderRefundDto[];
  @ApiProperty({ type: [AdminOrderShipmentDto] }) shipments: AdminOrderShipmentDto[];
  @ApiProperty({ type: [AdminOrderStatusHistoryDto], description: 'Dòng thời gian trạng thái, cũ trước mới sau' })
  statusHistory: AdminOrderStatusHistoryDto[];
  @ApiProperty({ type: AdminOrderActionsDto, description: 'Các thao tác hợp lệ với trạng thái hiện tại' })
  actions: AdminOrderActionsDto;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(detail: AdminOrderDetailWithActions): AdminOrderDetailDto {
    return Object.assign(new AdminOrderDetailDto(), detail);
  }
}
