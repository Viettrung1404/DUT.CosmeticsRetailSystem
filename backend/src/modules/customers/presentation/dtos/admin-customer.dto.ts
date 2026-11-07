import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Lọc theo nhãn gắn tay', example: 'VIP' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Nhãn tối đa 50 ký tự' })
  readonly tag?: string;

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
  @ApiProperty({ type: [String], description: 'Nhãn gắn tay' }) tags: string[];
  @ApiProperty() createdAt: Date;

  static fromDomain(item: AdminCustomerListItem): AdminCustomerListItemDto {
    return Object.assign(new AdminCustomerListItemDto(), item);
  }
}

export class ReplaceCustomerTagsDto {
  @ApiProperty({ type: [String], example: ['VIP', 'Hay đổi trả'], description: 'Danh sách nhãn mới, thay toàn bộ nhãn cũ' })
  @IsArray({ message: 'tags phải là mảng' })
  @ArrayMaxSize(20, { message: 'Mỗi khách tối đa 20 nhãn' })
  @IsString({ each: true, message: 'Nhãn phải là chuỗi' })
  @MaxLength(50, { each: true, message: 'Nhãn tối đa 50 ký tự' })
  readonly tags: string[];
}
