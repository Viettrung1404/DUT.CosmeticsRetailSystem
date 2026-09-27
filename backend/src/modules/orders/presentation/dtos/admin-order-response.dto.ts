import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminOrderListItem,
  OrderCustomerSummary,
  OrderStoreSummary,
} from '../../domain/repositories/admin-order.repository.interface';

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
