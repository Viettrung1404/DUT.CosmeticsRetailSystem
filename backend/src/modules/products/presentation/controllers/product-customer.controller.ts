import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  Optional,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { Public } from '@core/decorators/public.decorator';
import { WishlistEnrichmentInterceptor } from '@modules/customer-commerce/presentation/wishlist-enrichment.interceptor';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { SearchProductsUseCase } from '../../application/use-cases/search-products.use-case';
import { SuggestProductsUseCase } from '../../application/use-cases/suggest-products.use-case';
import { GetRelatedProductsUseCase } from '../../application/use-cases/get-related-products.use-case';
import { ProductResponseDto } from '../dtos/product-response.dto';
import { ProductFilterDto } from '../dtos/product-filter.dto';
import { ProductSuggestionDto } from '../dtos/product-suggestion.dto';
import { SearchProductsQueryDto } from '../dtos/search-products-query.dto';
import { SuggestProductsQueryDto } from '../dtos/suggest-products-query.dto';
import { PublicCatalogService } from '../../application/services/public-catalog.service';

@ApiTags('Customer - Products (Việt Trung)')
@Controller('customer/products')
@UseInterceptors(WishlistEnrichmentInterceptor)
export class ProductCustomerController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly suggestProductsUseCase: SuggestProductsUseCase,
    private readonly getRelatedProductsUseCase: GetRelatedProductsUseCase,
    @Optional() private readonly catalog?: PublicCatalogService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách sản phẩm hiển thị trên Web/Mobile (phân trang, lọc, sắp xếp)',
  })
  @ApiOkResponse({
    description: 'Danh sách sản phẩm thành công',
    type: PageDto,
  })
  async getProducts(@Query() filter: ProductFilterDto, @Req() req?: { user?: { userId?: string } }) {
    if (this.catalog) {
      const result = await this.catalog.list(filter, req?.user?.userId);
      return new PageDto(result.items, new PageMetaDto({ pageOptionsDto: filter, itemCount: result.total }));
    }
    const { items, total } = await this.getProductsUseCase.execute(filter);

    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({
      pageOptionsDto: filter,
      itemCount: total,
    });
    return new PageDto(data, meta);
  }

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Tìm kiếm sản phẩm theo từ khóa (Elasticsearch + fallback DB)',
  })
  @ApiOkResponse({ description: 'Kết quả tìm kiếm sản phẩm', type: PageDto })
  async searchProducts(@Query() queryDto: SearchProductsQueryDto, @Req() req?: { user?: { userId?: string } }) {
    if (this.catalog) {
      const filter = Object.assign(new ProductFilterDto(), queryDto);
      const result = await this.catalog.list(filter, req?.user?.userId, queryDto.q);
      return new PageDto(result.items, new PageMetaDto({ pageOptionsDto: filter, itemCount: result.total }));
    }
    const { items, total } = await this.searchProductsUseCase.execute(
      queryDto.q,
      queryDto,
    );
    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({
      pageOptionsDto: queryDto,
      itemCount: total,
    });
    return new PageDto(data, meta);
  }

  @Public()
  @Get('suggest')
  @ApiOperation({
    summary: 'Gợi ý tìm kiếm nhanh / autocomplete (tối đa 20 kết quả)',
  })
  @ApiOkResponse({
    type: [ProductSuggestionDto],
    description: 'Danh sách gợi ý sản phẩm',
  })
  async suggestProducts(
    @Query() queryDto: SuggestProductsQueryDto,
    @Req() req?: { user?: { userId?: string } },
  ): Promise<ProductSuggestionDto[]> {
    if (this.catalog) return this.catalog.suggest(queryDto.q, queryDto.limit ?? 8, req?.user?.userId);
    return this.suggestProductsUseCase.execute(queryDto.q, queryDto.limit ?? 8);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Xem chi tiết sản phẩm theo slug (URL thân thiện SEO)',
  })
  @ApiOkResponse({ type: ProductResponseDto, description: 'Chi tiết sản phẩm' })
  async getProductBySlug(@Param('slug') slug: string, @Req() req?: { user?: { userId?: string } }) {
    if (this.catalog) return this.catalog.detail(slug, req?.user?.userId);
    const product = await this.getProductDetailUseCase.executeBySlug(slug);
    return ProductResponseDto.fromDomain(product);
  }

  @Public()
  @Get(':id/related')
  @ApiOperation({
    summary:
      'Lấy danh sách sản phẩm liên quan (cùng danh mục hoặc thương hiệu)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 8,
    description: 'Số lượng sản phẩm liên quan (1 - 20)',
  })
  @ApiOkResponse({
    type: [ProductResponseDto],
    description: 'Danh sách sản phẩm liên quan',
  })
  async getRelatedProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Req() req?: { user?: { userId?: string } },
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    if (this.catalog) return this.catalog.related(id, safeLimit, req?.user?.userId);
    const items = await this.getRelatedProductsUseCase.execute(id, safeLimit);
    return items.map((p) => ProductResponseDto.fromDomain(p));
  }
}
