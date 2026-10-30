import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { StocktakeWorkflowUseCase } from '../../application/use-cases/stocktake-workflow.use-case';
import {
  CreateStocktakeDto,
  RecordStocktakeCountsDto,
  StocktakeQueryDto,
} from '../dtos/inventory-workflow-request.dto';

@ApiTags('Admin - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/stocktakes')
export class StocktakeAdminController {
  constructor(private readonly stocktakes: StocktakeWorkflowUseCase) {}

  @Get()
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách phiếu kiểm kê theo phạm vi dữ liệu' })
  async list(@CurrentUser('userId') userId: string, @Query() query: StocktakeQueryDto) {
    const { items, total } = await this.stocktakes.list(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      status: query.status,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết phiếu kiểm kê (tồn sổ, số đếm, chênh lệch)' })
  detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakes.detail(userId, id);
  }

  @Post()
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo phiếu kiểm kê' })
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreateStocktakeDto) {
    const data = await this.stocktakes.create(userId, dto);
    return { message: `Đã tạo phiếu ${data.stocktakeCode}`, data };
  }

  @Post(':id/items')
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Nhập số đếm thực tế (hệ thống chụp tồn sổ ở lần nhập đầu của mỗi dòng)' })
  record(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordStocktakeCountsDto,
  ) {
    return this.stocktakes.recordCounts(userId, id, dto.items);
  }

  @Put(':id/complete')
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Chốt kiểm kê, điều chỉnh tồn theo chênh lệch (có chênh lệch thì người chốt khác người lập)' })
  async complete(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.stocktakes.complete(userId, id);
    return { message: `Đã chốt phiếu ${data.stocktakeCode}`, data };
  }

  @Put(':id/cancel')
  @RequirePermissions('INVENTORY_STOCKTAKE_MANAGE')
  @ApiOperation({ summary: 'Admin - Hủy phiếu kiểm kê chưa chốt' })
  async cancel(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.stocktakes.cancel(userId, id);
    return { message: `Đã hủy phiếu ${data.stocktakeCode}`, data };
  }
}
