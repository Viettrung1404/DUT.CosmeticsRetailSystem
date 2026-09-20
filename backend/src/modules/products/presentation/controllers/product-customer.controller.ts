import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { Public } from '@core/decorators/public.decorator';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { ProductResponseDto } from '../dtos/product-response.dto';

@ApiTags('Customer - Products (Việt Trung)')
@Controller('customer/products')
export class ProductCustomerController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm hiển thị trên Web/Mobile (phân trang)' })
  @ApiOkResponse({ description: 'Danh sách sản phẩm thành công' })
  async getProducts(@Query() pageOptionsDto: PageOptionsDto) {
    const { items, total } = await this.getProductsUseCase.execute(pageOptionsDto);

    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: total });
    return new PageDto(data, meta);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm theo slug (URL thân thiện SEO)' })
  @ApiOkResponse({ type: ProductResponseDto })
  async getProductBySlug(@Param('slug') slug: string) {
    const product = await this.getProductDetailUseCase.executeBySlug(slug);
    return ProductResponseDto.fromDomain(product);
  }
}

