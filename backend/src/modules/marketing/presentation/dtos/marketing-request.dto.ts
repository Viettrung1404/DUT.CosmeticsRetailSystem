import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { COUPON_TYPES, PROMOTION_TYPES } from '../../domain/repositories/promotion.repository.interface';
import { BLOG_STATUSES } from '../../domain/repositories/content.repository.interface';

const MAX_MONEY = 9_999_999_999.99;
// Đọc giá trị gốc: chuyển kiểu ngầm của ValidationPipe biến chuỗi 'false' thành true
const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : raw;
};

class DiscountFields {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly minOrderAmount?: number;

  @ApiPropertyOptional({ example: 50000, nullable: true, description: 'Trần giảm (giảm %)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly maxDiscountAmount?: number | null;
}

export class UpdatePromotionDto extends DiscountFields {
  @ApiPropertyOptional({ example: 'Sale 11.11' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  readonly name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  readonly description?: string | null;

  @ApiPropertyOptional({ enum: PROMOTION_TYPES })
  @IsOptional()
  @IsIn(PROMOTION_TYPES, { message: 'Loại khuyến mãi chỉ nhận PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING' })
  readonly type?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly value?: number;

  @ApiPropertyOptional({ example: '2026-11-11T00:00:00+07:00' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate không hợp lệ' })
  readonly startDate?: Date;

  @ApiPropertyOptional({ example: '2026-11-12T00:00:00+07:00' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate không hợp lệ' })
  readonly endDate?: Date;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly usageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isFlashSale?: boolean;

  @ApiPropertyOptional({ type: [String], nullable: true, description: 'null = mọi sản phẩm' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  readonly applicableProducts?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  readonly applicableCategories?: string[] | null;
}

export class CreatePromotionDto extends DiscountFields {
  @ApiProperty({ example: 'Sale 11.11' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  readonly name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly description?: string;

  @ApiProperty({ enum: PROMOTION_TYPES })
  @IsIn(PROMOTION_TYPES, { message: 'Loại khuyến mãi chỉ nhận PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING' })
  readonly type: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly value: number;

  @ApiProperty({ example: '2026-11-11T00:00:00+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'startDate không hợp lệ' })
  readonly startDate: Date;

  @ApiProperty({ example: '2026-11-12T00:00:00+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'endDate không hợp lệ' })
  readonly endDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isFlashSale?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  readonly applicableProducts?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  readonly applicableCategories?: string[];
}

export class PromotionQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isFlashSale?: boolean;

  @ApiPropertyOptional({ description: 'true = chỉ chương trình đang trong thời gian chạy' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly runningOnly?: boolean;
}

export class CreateCouponDto extends DiscountFields {
  @ApiPropertyOptional({ example: 'TET2027', description: 'Bỏ trống để hệ thống sinh mã (M7)' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{4,30}$/, { message: 'Mã chỉ gồm chữ và số, 4–30 ký tự' })
  readonly code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'promotionId không hợp lệ' })
  readonly promotionId?: string;

  @ApiPropertyOptional({ description: 'Mã tặng riêng một khách' })
  @IsOptional()
  @IsUUID('4', { message: 'customerId không hợp lệ' })
  readonly customerId?: string;

  @ApiProperty({ enum: COUPON_TYPES })
  @IsIn(COUPON_TYPES, { message: 'Loại giảm chỉ nhận PERCENTAGE hoặc FIXED_AMOUNT' })
  readonly discountType: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly discountValue: number;

  @ApiPropertyOptional({ description: 'Tổng lượt dùng tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly maxUses?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly maxUsesPerCustomer?: number;

  @ApiProperty({ example: '2026-11-01T00:00:00+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'startDate không hợp lệ' })
  readonly startDate: Date;

  @ApiProperty({ example: '2026-11-30T23:59:59+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'endDate không hợp lệ' })
  readonly endDate: Date;
}

export class BulkCouponDto extends CreateCouponDto {
  @ApiProperty({ example: 100, description: '1–500 mã' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  readonly quantity: number;

  @ApiPropertyOptional({ example: 'BF', description: 'Tiền tố gắn trước 8 ký tự ngẫu nhiên' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{1,10}$/, { message: 'Tiền tố chỉ gồm chữ và số, tối đa 10 ký tự' })
  readonly prefix?: string;
}

export class CouponQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'promotionId không hợp lệ' })
  readonly promotionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isActive?: boolean;
}

export class ReviewQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'false = chờ duyệt / bị ẩn' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isApproved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'productId không hợp lệ' })
  readonly productId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  readonly rating?: number;
}

export class ReviewReplyDto {
  @ApiPropertyOptional({ example: 'Cảm ơn chị đã tin dùng GlowUp' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly reply?: string;
}

export class UpdateBlogPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  readonly title?: string;

  @ApiPropertyOptional({ description: 'Bỏ trống lúc tạo thì sinh từ tiêu đề' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  readonly content?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  readonly excerpt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  readonly featuredImage?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4', { message: 'blogCategoryId không hợp lệ' })
  readonly blogCategoryId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  readonly metaTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  readonly metaDescription?: string | null;
}

export class CreateBlogPostDto extends UpdateBlogPostDto {
  @ApiProperty({ example: '5 bước chăm da mùa hanh khô' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  readonly title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  readonly content: string;
}

export class ScheduleBlogPostDto {
  @ApiProperty({ example: '2026-11-01T08:00:00+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'publishAt không hợp lệ' })
  readonly publishAt: Date;
}

export class BlogPostQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: BLOG_STATUSES })
  @IsOptional()
  @IsIn(BLOG_STATUSES, { message: 'Trạng thái bài viết không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'categoryId không hợp lệ' })
  readonly categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;
}

export class BlogCategoryDto {
  @ApiPropertyOptional({ example: 'Chăm sóc da' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  readonly name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  readonly description?: string | null;
}

export class PageContentDto {
  @ApiPropertyOptional({ example: 'Chính sách đổi trả' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  readonly title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  readonly content?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  readonly metaTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  readonly metaDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly sortOrder?: number;
}

export class FaqDto {
  @ApiPropertyOptional({ example: 'Bao lâu thì nhận được hàng?' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  readonly question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  readonly answer?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  readonly category?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class BannerDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(150)
  readonly title?: string | null;

  @ApiPropertyOptional({ description: 'Link ảnh (từ API upload)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly imageUrl?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  readonly linkUrl?: string | null;

  @ApiPropertyOptional({ example: 'HOME_HERO' })
  @IsOptional()
  @Matches(/^[A-Z_]{2,50}$/, { message: 'Vị trí viết in hoa, ví dụ HOME_HERO' })
  readonly position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly sortOrder?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  readonly startDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  readonly endDate?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class PointRateDto {
  @ApiProperty({ example: 0.01, description: 'Điểm nhận trên mỗi 1đ tiền hàng (0.01 = 1%)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  readonly pointRate: number;
}

export class LoyaltyTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  readonly name?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly minPoints?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  readonly discountPercentage?: number;

  @ApiPropertyOptional({ example: 1.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10)
  readonly pointMultiplier?: number;

  @ApiPropertyOptional({ description: 'Mô tả quyền lợi (JSON)' })
  @IsOptional()
  readonly benefits?: unknown;
}

export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Danh sách id theo thứ tự mới từ trên xuống' })
  @IsArray({ message: 'ids phải là mảng' })
  @ArrayNotEmpty({ message: 'ids không được rỗng' })
  @ArrayMaxSize(500, { message: 'Tối đa 500 mục mỗi lần' })
  @IsUUID('4', { each: true, message: 'Có id không hợp lệ' })
  readonly ids: string[];
}

export class BannerQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ example: 'HOME_HERO', description: 'Lọc theo vị trí hiển thị' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Vị trí tối đa 50 ký tự' })
  readonly position?: string;
}

export class FaqQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Lọc theo nhóm câu hỏi' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nhóm câu hỏi tối đa 100 ký tự' })
  readonly category?: string;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ enum: COUPON_TYPES, description: 'Không đổi được khi mã đã có lượt dùng' })
  @IsOptional()
  @IsIn(COUPON_TYPES, { message: 'Loại giảm chỉ nhận PERCENTAGE hoặc FIXED_AMOUNT' })
  readonly discountType?: string;

  @ApiPropertyOptional({ description: 'Không đổi được khi mã đã có lượt dùng' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly minOrderAmount?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly maxDiscountAmount?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Không thấp hơn số lượt đã dùng' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly maxUses?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly maxUsesPerCustomer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate không hợp lệ' })
  readonly startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate không hợp lệ' })
  readonly endDate?: Date;
}
