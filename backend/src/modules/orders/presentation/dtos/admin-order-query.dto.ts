import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { OrderStatus } from '@core/domain/orders/order-status.enum';

const ORDER_TYPES = ['ONLINE', 'POS'];
const SORT_FIELDS = ['createdAt', 'totalAmount'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AdminOrderQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo mã đơn', example: 'ORD20260927' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly search?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsIn(Object.values(OrderStatus), { message: 'Trạng thái đơn không hợp lệ' })
  readonly status?: OrderStatus;

  @ApiPropertyOptional({ enum: ORDER_TYPES })
  @IsOptional()
  @IsIn(ORDER_TYPES, { message: 'Loại đơn chỉ nhận ONLINE hoặc POS' })
  readonly orderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ description: 'Lọc đơn của một khách (xem lịch sử mua hàng)' })
  @IsOptional()
  @IsUUID('4', { message: 'customerId không hợp lệ' })
  readonly customerId?: string;

  @ApiPropertyOptional({ description: 'Từ ngày (giờ Việt Nam), dạng YYYY-MM-DD', example: '2026-09-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'fromDate phải có dạng YYYY-MM-DD' })
  readonly fromDate?: string;

  @ApiPropertyOptional({ description: 'Đến hết ngày (giờ Việt Nam), dạng YYYY-MM-DD', example: '2026-09-30' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'toDate phải có dạng YYYY-MM-DD' })
  readonly toDate?: string;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'createdAt', description: 'Sắp theo ngày tạo hoặc giá trị đơn; chiều sắp dùng tham số order' })
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: 'sortBy chỉ nhận createdAt hoặc totalAmount' })
  readonly sortBy?: 'createdAt' | 'totalAmount';
}
