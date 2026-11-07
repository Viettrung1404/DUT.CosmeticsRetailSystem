import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { RFM_SEGMENTS } from '@modules/reports/application/utils/report-calculations';
import {
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_ROUTES,
  CAMPAIGN_STATUSES,
} from '../../domain/repositories/campaign.repository.interface';

export class AudienceValueDto {
  @ApiPropertyOptional({ description: 'Dùng khi audienceType = TIER', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Tối đa 20 hạng thành viên' })
  @IsUUID('4', { each: true, message: 'Mã hạng thành viên không hợp lệ' })
  readonly tierIds?: string[];

  @ApiPropertyOptional({ description: 'Dùng khi audienceType = CUSTOMERS (id khách hàng)', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000, { message: 'Tối đa 5000 khách hàng mỗi chiến dịch' })
  @IsUUID('4', { each: true, message: 'Mã khách hàng không hợp lệ' })
  readonly customerIds?: string[];

  @ApiPropertyOptional({
    enum: RFM_SEGMENTS,
    isArray: true,
    description: 'Dùng khi audienceType = CUSTOMERS thay cho customerIds: gửi theo nhóm RFM, danh sách khách tính lại lúc gửi',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(RFM_SEGMENTS.length)
  @IsIn(RFM_SEGMENTS, { each: true, message: 'Nhóm khách RFM không hợp lệ' })
  readonly rfmSegments?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Dùng khi audienceType = CUSTOMERS: gửi cho khách có một trong các nhãn này, tính lại lúc gửi',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Tối đa 50 nhãn' })
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'Nhãn tối đa 50 ký tự' })
  readonly customerTags?: string[];
}

export class CampaignContentDto {
  @ApiProperty({ example: 'Flash sale cuối tuần' })
  @IsString()
  @IsNotEmpty({ message: 'Tên chiến dịch không được để trống' })
  @MaxLength(200, { message: 'Tên chiến dịch tối đa 200 ký tự' })
  readonly name!: string;

  @ApiProperty({ enum: CAMPAIGN_CHANNELS })
  @IsIn(CAMPAIGN_CHANNELS, { message: 'Kênh gửi phải là PUSH hoặc EMAIL' })
  readonly channel!: (typeof CAMPAIGN_CHANNELS)[number];

  @ApiProperty({ enum: CAMPAIGN_AUDIENCES, description: 'ALL: mọi khách đang hoạt động; TIER: theo hạng; CUSTOMERS: danh sách khách hoặc nhóm RFM' })
  @IsIn(CAMPAIGN_AUDIENCES, { message: 'Đối tượng nhận không hợp lệ' })
  readonly audienceType!: (typeof CAMPAIGN_AUDIENCES)[number];

  @ApiPropertyOptional({ type: AudienceValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceValueDto)
  readonly audienceValue?: AudienceValueDto;

  @ApiProperty({ example: 'Giảm 30% toàn bộ son môi' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề tối đa 255 ký tự' })
  readonly title!: string;

  @ApiProperty({
    description:
      'PUSH: văn bản thuần, tối đa 2000 ký tự. EMAIL: văn bản hoặc HTML, dùng được {{fullName}} và {{email}}; link http(s) được tự theo dõi lượt nhấp',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @MaxLength(50000, { message: 'Nội dung tối đa 50000 ký tự' })
  readonly content!: string;

  @ApiPropertyOptional({ enum: CAMPAIGN_ROUTES, description: 'Bắt buộc với PUSH: nơi mở khi khách bấm vào thông báo' })
  @IsOptional()
  @IsIn(CAMPAIGN_ROUTES, { message: 'Nơi mở thông báo không hợp lệ' })
  readonly route?: (typeof CAMPAIGN_ROUTES)[number];

  @ApiPropertyOptional({ description: 'Id sản phẩm / khuyến mãi / bài viết tương ứng với route' })
  @IsOptional()
  @IsUUID('4', { message: 'Mã đối tượng mở không hợp lệ' })
  readonly resourceId?: string;
}

export class SendEmailCampaignDto extends OmitType(CampaignContentDto, [
  'channel',
  'route',
  'resourceId',
] as const) {}

export class EmailTemplateDto {
  @ApiProperty({ example: 'Khuyến mãi cuối tuần' })
  @IsString()
  @IsNotEmpty({ message: 'Tên mẫu không được để trống' })
  @MaxLength(150, { message: 'Tên mẫu tối đa 150 ký tự' })
  readonly name!: string;

  @ApiProperty({ example: 'Ưu đãi dành riêng cho {{fullName}}' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề thư không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề thư tối đa 255 ký tự' })
  readonly subject!: string;

  @ApiProperty({ description: 'Nội dung HTML; dùng được {{fullName}} và {{email}}' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung mẫu không được để trống' })
  @MaxLength(50000, { message: 'Nội dung tối đa 50000 ký tự' })
  readonly html!: string;
}

export class ScheduleCampaignDto {
  @ApiProperty({ example: '2026-11-10T09:00:00+07:00' })
  @Type(() => Date)
  @IsDate({ message: 'Thời điểm hẹn giờ không hợp lệ' })
  readonly scheduledAt!: Date;
}

export class CampaignQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES, { message: 'Trạng thái không hợp lệ' })
  readonly status?: (typeof CAMPAIGN_STATUSES)[number];

  @ApiPropertyOptional({ enum: CAMPAIGN_CHANNELS })
  @IsOptional()
  @IsIn(CAMPAIGN_CHANNELS, { message: 'Kênh gửi không hợp lệ' })
  readonly channel?: (typeof CAMPAIGN_CHANNELS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;
}

export const PUSH_TARGETS = ['all', 'segment', 'individual'] as const;

export class SendPushDto {
  @ApiProperty({
    enum: PUSH_TARGETS,
    description: 'all: mọi khách; segment: theo nhóm RFM (rfmSegments) hoặc theo hạng (tierIds); individual: danh sách khách (customerIds)',
  })
  @IsIn(PUSH_TARGETS, { message: 'Đối tượng nhận phải là all, segment hoặc individual' })
  readonly target!: (typeof PUSH_TARGETS)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true, message: 'Mã hạng thành viên không hợp lệ' })
  readonly tierIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true, message: 'Mã khách hàng không hợp lệ' })
  readonly customerIds?: string[];

  @ApiPropertyOptional({ enum: RFM_SEGMENTS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(RFM_SEGMENTS.length)
  @IsIn(RFM_SEGMENTS, { each: true, message: 'Nhóm khách RFM không hợp lệ' })
  readonly rfmSegments?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề tối đa 255 ký tự' })
  readonly title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @MaxLength(2000, { message: 'Nội dung tối đa 2000 ký tự' })
  readonly message!: string;

  @ApiProperty({ enum: CAMPAIGN_ROUTES })
  @IsIn(CAMPAIGN_ROUTES, { message: 'Nơi mở thông báo không hợp lệ' })
  readonly route!: (typeof CAMPAIGN_ROUTES)[number];

  @ApiProperty()
  @IsUUID('4', { message: 'Mã đối tượng mở không hợp lệ' })
  readonly resourceId!: string;
}
