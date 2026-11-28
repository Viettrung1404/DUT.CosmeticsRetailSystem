import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { LocationService } from '../../application/services/location.service';
import { LocationQueryDto } from '../dtos/location-query.dto';
import { LocationResponseDto } from '../dtos/location-response.dto';
import { LocationCapacityResponseDto } from '../dtos/location-capacity-response.dto';

@ApiTags('Locations & Fulfillment Capacity')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Truy vấn danh sách địa điểm (Showrooms & Kho tổng) kèm trạng thái hoạt động tức thời',
    description:
      'Cung cấp danh mục địa điểm phục vụ định tuyến đơn hàng, phân tuyến Showroom gần nhất và hiển thị cho khách hàng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách địa điểm thành công',
    type: [LocationResponseDto],
  })
  async listLocations(
    @Query() query: LocationQueryDto,
  ): Promise<LocationResponseDto[]> {
    return this.locationService.listLocations(query);
  }

  @Public()
  @Get(':id/capacity')
  @ApiOperation({
    summary: 'Kiểm tra năng lực hoàn tất đơn hàng trong ngày (Fulfillment Capacity)',
    description:
      'Đối chiếu công suất định mức fulfillmentCapacityPerDay với số lượng đơn đã phân bổ trong ngày để quyết định nhận thêm đơn.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin năng lực hoàn tất thành công',
    type: LocationCapacityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy địa điểm tương ứng',
  })
  async getLocationCapacity(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationCapacityResponseDto> {
    return this.locationService.getLocationCapacity(id);
  }
}
