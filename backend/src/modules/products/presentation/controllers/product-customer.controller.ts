import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { Public } from '@core/decorators/public.decorator';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { SearchProductsUseCase } from '../../application/use-cases/search-products.use-case';
import { SuggestProductsUseCase } from '../../application/use-cases/suggest-products.use-case';
import { GetRelatedProductsUseCase } from '../../application/use-cases/get-related-products.use-case';
import { ProductResponseDto } from '../dtos/product-response.dto';
import { ProductFilterDto } from '../dtos/product-filter.dto';
import { ProductSuggestionDto } from '../dtos/product-suggestion.dto';

@ApiTags('Customer - Products (Việt Trung)')
@Controller('customer/products')
export class ProductCustomerController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly suggestProductsUseCase: SuggestProductsUseCase,
    private readonly getRelatedProductsUseCase: GetRelatedProductsUseCase,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm hiển thị trên Web/Mobile (phân trang, lọc, sắp xếp)' })
  @ApiOkResponse({ description: 'Danh sách sản phẩm thành công' })
  async getProducts(@Query() filter: ProductFilterDto) {
    const { items, total } = await this.getProductsUseCase.execute(filter);

    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({
      pageOptionsDto: { page: filter.page ?? 1, limit: filter.limit ?? 20 } as any,
      itemCount: total,
    });
    return new PageDto(data, meta);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm sản phẩm theo từ khóa (Elasticsearch + fallback DB)' })
  @ApiQuery({ name: 'q', required: true, description: 'Từ khóa tìm kiếm (tên, thương hiệu, thành phần...)' })
  @ApiOkResponse({ description: 'Kết quả tìm kiếm sản phẩm' })
  async searchProducts(
    @Query('q') query: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    const { items, total } = await this.searchProductsUseCase.execute(query || '', pageOptionsDto);
    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: total });
    return new PageDto(data, meta);
  }

  @Public()
  @Get('suggest')
  @ApiOperation({ summary: 'Gợi ý tìm kiếm nhanh / autocomplete (tối đa 8 kết quả)' })
  @ApiQuery({ name: 'q', required: true, description: 'Từ khóa bắt đầu gõ' })
  @ApiQuery({ name: 'limit', required: false, example: 8, description: 'Số lượng gợi ý' })
  @ApiOkResponse({ type: [ProductSuggestionDto], description: 'Danh sách gợi ý sản phẩm' })
  async suggestProducts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<ProductSuggestionDto[]> {
    return this.suggestProductsUseCase.execute(query || '', limit ? Number(limit) : 8);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm theo slug (URL thân thiện SEO)' })
  @ApiOkResponse({ type: ProductResponseDto, description: 'Chi tiết sản phẩm' })
  async getProductBySlug(@Param('slug') slug: string) {
    const product = await this.getProductDetailUseCase.executeBySlug(slug);
    return ProductResponseDto.fromDomain(product);
  }

  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm liên quan (cùng danh mục hoặc thương hiệu)' })
  @ApiQuery({ name: 'limit', required: false, example: 8, description: 'Số lượng sản phẩm liên quan' })
  @ApiOkResponse({ type: [ProductResponseDto], description: 'Danh sách sản phẩm liên quan' })
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const items = await this.getRelatedProductsUseCase.execute(id, limit ? Number(limit) : 8);
    return items.map((p) => ProductResponseDto.fromDomain(p));
  }
}
