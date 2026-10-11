import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { AdminCustomerListItem } from '../../domain/repositories/admin-customer.repository.interface';

const SORT_FIELDS = ['createdAt', 'totalSpent', 'totalPoints'];

export class AdminCustomerQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên, số điện thoại hoặc email', example: '0905' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo hạng thành viên' })
  @IsOptional()
  @IsUUID('4', { message: 'loyaltyTierId không hợp lệ' })
  readonly loyaltyTierId?: string;

  @ApiPropertyOptional({ description: 'Khách từng có đơn tại cửa hàng này' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: 'sortBy chỉ nhận createdAt, totalSpent hoặc totalPoints' })
  readonly sortBy?: 'createdAt' | 'totalSpent' | 'totalPoints';
}

class LoyaltyTierSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Silver' }) name: string;
}

export class AdminCustomerListItemDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) fullName: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiProperty({ description: 'false = khách mua tại quầy, chưa đăng ký tài khoản' }) hasAccount: boolean;
  @ApiPropertyOptional({ type: LoyaltyTierSummaryDto, nullable: true }) loyaltyTier: LoyaltyTierSummaryDto | null;
  @ApiProperty() totalPoints: number;
  @ApiProperty() totalSpent: number;
  @ApiProperty() totalOrders: number;
  @ApiProperty() createdAt: Date;

  static fromDomain(item: AdminCustomerListItem): AdminCustomerListItemDto {
    return Object.assign(new AdminCustomerListItemDto(), item);
  }
}
