import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ScanPosProductUseCase } from '../../application/use-cases/scan-pos-product.use-case';
import { SearchPosProductsUseCase } from '../../application/use-cases/search-pos-products.use-case';
import { ScanProductQueryDto, SearchProductQueryDto } from '../dtos/pos-lookup-request.dto';
import { PosVariantResponseDto } from '../dtos/pos-lookup-response.dto';

@ApiTags('POS - Sales (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/products')
export class PosProductController {
  constructor(
    private readonly scanPosProductUseCase: ScanPosProductUseCase,
    private readonly searchPosProductsUseCase: SearchPosProductsUseCase,
  ) {}

  @Get('scan')
  @RequirePermissions('ORDER_POS_CREATE')
  @ApiOperation({ summary: 'POS - Quét mã vạch ra biến thể, giá và tồn bán được tại cửa hàng' })
  @ApiNotFoundResponse({ description: 'Không có biến thể với mã vạch này' })
  @ApiForbiddenResponse({ description: 'Không được gán cửa hàng này' })
  async scan(@CurrentUser('userId') userId: string, @Query() query: ScanProductQueryDto) {
    const view = await this.scanPosProductUseCase.execute(userId, query.barcode, query.storeId);
    return PosVariantResponseDto.fromDomain(view);
  }

  @Get('search')
  @RequirePermissions('ORDER_POS_CREATE')
  @ApiOperation({ summary: 'POS - Tìm biến thể theo tên hoặc SKU (chỉ hàng đang bán)' })
  @ApiBadRequestResponse({ description: 'Kho tổng hoặc cửa hàng ngừng hoạt động' })
  @ApiForbiddenResponse({ description: 'Không được gán cửa hàng này' })
  async search(
    @CurrentUser('userId') userId: string,
    @Query() query: SearchProductQueryDto,
  ): Promise<PageDto<PosVariantResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.searchPosProductsUseCase.execute(userId, {
      keyword: query.q,
      storeId: query.storeId,
      page,
      limit,
    });
    const meta = new PageMetaDto({
      pageOptionsDto: Object.assign(new PageOptionsDto(), { page, limit }),
      itemCount: total,
    });
    return new PageDto(items.map(PosVariantResponseDto.fromDomain), meta);
  }
}
