import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';

export class TaskQueueQueryDto {
  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên một trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo ID chi nhánh cụ thể (phải nằm trong scope)' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class TaskQueueItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fulfillmentOrderNumber: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  sourceLocationId: string;

  @ApiPropertyOptional()
  sourceLocationName?: string;

  @ApiProperty()
  totalItemsCount: number;

  @ApiProperty()
  shippingServiceCode: string;

  @ApiPropertyOptional()
  assignedPickerId?: string | null;

  @ApiPropertyOptional()
  orderNumber?: string;

  @ApiPropertyOptional()
  recipientName?: string;

  @ApiPropertyOptional()
  recipientPhone?: string;

  @ApiPropertyOptional()
  deliveryMethod?: string;

  @ApiPropertyOptional()
  allocatedAt?: Date | null;

  @ApiPropertyOptional()
  pickedAt?: Date | null;

  @ApiPropertyOptional()
  packedAt?: Date | null;

  @ApiProperty({ type: [String] })
  availableActions: string[];
}

export class TaskQueueResponseDto {
  @ApiProperty({ type: [TaskQueueItemDto] })
  items: TaskQueueItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
