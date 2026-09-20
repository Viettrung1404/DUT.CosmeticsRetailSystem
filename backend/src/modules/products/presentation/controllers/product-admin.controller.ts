import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { CreateProductRequestDto } from '../dtos/create-product-request.dto';
import { ProductResponseDto } from '../dtos/product-response.dto';

@ApiTags('Admin - Products (Thành Lập)')
@Controller('admin/products')
export class ProductAdminController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin - Lấy danh sách sản phẩm quản lý (phân trang, lọc)' })
  @ApiOkResponse({ description: 'Danh sách sản phẩm' })
  async getProducts(@Query() pageOptionsDto: PageOptionsDto) {
    const { items, total } = await this.getProductsUseCase.execute(pageOptionsDto);

    const data = items.map((product) => ProductResponseDto.fromDomain(product));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: total });
    return new PageDto(data, meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin - Xem chi tiết sản phẩm theo ID' })
  @ApiOkResponse({ type: ProductResponseDto })
  async getProductById(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.getProductDetailUseCase.executeById(id);
    return ProductResponseDto.fromDomain(product);
  }

  @Post()
  @ApiOperation({ summary: 'Admin - Thêm mới sản phẩm' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  async createProduct(@Body() dto: CreateProductRequestDto) {
    const product = await this.createProductUseCase.execute(dto);
    return ProductResponseDto.fromDomain(product);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin - Xóa sản phẩm' })
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteProductUseCase.execute(id);
    return { message: 'Đã xóa sản phẩm thành công' };
  }
}

