import { ApiProperty } from '@nestjs/swagger';
import { OperatingStatusDto } from './location-response.dto';

export class LocationCapacityResponseDto {
  @ApiProperty({ description: 'ID định danh duy nhất của địa điểm (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  locationId: string;

  @ApiProperty({ description: 'Mã địa điểm', example: 'STORE-03' })
  locationCode: string;

  @ApiProperty({ description: 'Tên địa điểm', example: 'GlowUp Showroom Quận 1' })
  locationName: string;

  @ApiProperty({ description: 'Loại địa điểm: STORE hoặc WAREHOUSE', example: 'STORE' })
  locationType: string;

  @ApiProperty({ description: 'Công suất hoàn tất tối đa trong ngày (đơn hàng/ngày)', example: 500 })
  capacityPerDay: number;

  @ApiProperty({ description: 'Số lượng đơn hàng đã phân bổ hoàn tất trong ngày hôm nay', example: 120 })
  allocatedOrdersToday: number;

  @ApiProperty({ description: 'Công suất hoàn tất còn khả dụng trong ngày', example: 380 })
  remainingCapacityToday: number;

  @ApiProperty({ description: 'Còn năng lực tiếp nhận thêm đơn trong ngày hay không', example: true })
  isCapacityAvailable: boolean;

  @ApiProperty({ description: 'Ngày kiểm tra theo giờ Việt Nam (YYYY-MM-DD)', example: '2026-11-15' })
  date: string;

  @ApiProperty({ description: 'Trạng thái hoạt động tức thời theo giờ Việt Nam' })
  operatingStatus: OperatingStatusDto;
}
