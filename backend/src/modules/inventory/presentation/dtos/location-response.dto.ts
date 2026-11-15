import { ApiProperty } from '@nestjs/swagger';

export class OperatingStatusDto {
  @ApiProperty({ description: 'Đang mở cửa tại thời điểm hiện tại hay không', example: true })
  isOpenNow: boolean;

  @ApiProperty({ description: 'Giờ hiện tại theo múi giờ Asia/Ho_Chi_Minh (HH:mm)', example: '09:30' })
  currentLocalTime: string;

  @ApiProperty({ description: 'Khung giờ hoạt động hôm nay', example: '08:00-22:00', nullable: true })
  todayOpeningHours: string | null;
}

export class LocationResponseDto {
  @ApiProperty({ description: 'ID định danh duy nhất của địa điểm (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Mã định danh địa điểm', example: 'STORE-03' })
  code: string;

  @ApiProperty({ description: 'Tên địa điểm / Showroom / Kho', example: 'GlowUp Showroom Quận 1' })
  name: string;

  @ApiProperty({ description: 'Loại địa điểm: STORE hoặc WAREHOUSE', example: 'STORE' })
  type: string;

  @ApiProperty({ description: 'Địa chỉ đường', example: '45 Lê Lợi, Phường Bến Nghé' })
  address: string;

  @ApiProperty({ description: 'Quận / Huyện', example: 'Quận 1' })
  district: string;

  @ApiProperty({ description: 'Tỉnh / Thành phố', example: 'TP. Hồ Chí Minh' })
  city: string;

  @ApiProperty({ description: 'Số điện thoại liên hệ', nullable: true, example: '028 3999 0003' })
  phone: string | null;

  @ApiProperty({ description: 'Email liên hệ', nullable: true, example: 'quan1@glowup.vn' })
  email: string | null;

  @ApiProperty({ description: 'Vĩ độ tọa độ GPS', nullable: true, example: 10.7745 })
  latitude: number | null;

  @ApiProperty({ description: 'Kinh độ tọa độ GPS', nullable: true, example: 106.7009 })
  longitude: number | null;

  @ApiProperty({ description: 'Công suất hoàn tất đơn hàng tối đa mỗi ngày', example: 500 })
  fulfillmentCapacityPerDay: number;

  @ApiProperty({ description: 'Cấu hình khung giờ mở cửa theo ngày', example: { mon_sun: '08:00-22:00' } })
  openingHours: any;

  @ApiProperty({ description: 'Trạng thái hoạt động tức thời theo giờ Việt Nam' })
  operatingStatus: OperatingStatusDto;
}
