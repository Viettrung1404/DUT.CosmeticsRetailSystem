import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetInventoryUseCase } from '../../application/use-cases/get-inventory.use-case';
import { PosInventoryQueryDto } from '../dtos/inventory-request.dto';
import { InventoryItemResponseDto } from '../dtos/inventory-response.dto';

@ApiTags('POS - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/inventory')
export class InventoryPosController {
  constructor(private readonly getInventoryUseCase: GetInventoryUseCase) {}

  @Get()
  @RequirePermissions('INVENTORY_VIEW')
  @ApiOperation({ summary: 'POS - Xem tồn kho tại cửa hàng đang trực' })
  @ApiForbiddenResponse({ description: 'Cửa hàng ngoài phạm vi của bạn' })
  async getInventory(@CurrentUser('userId') userId: string, @Query() query: PosInventoryQueryDto) {
    const { items, total } = await this.getInventoryUseCase.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      search: query.search,
    });
    const data = items.map((item) => InventoryItemResponseDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }
}
