import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetAdminProductsUseCase } from '../../application/use-cases/get-admin-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { CreateProductRequestDto } from '../dtos/create-product-request.dto';
import { UpdateProductRequestDto } from '../dtos/update-product-request.dto';
import { GetAdminProductsQueryDto } from '../dtos/get-admin-products-query.dto';
import { ProductResponseDto } from '../dtos/product-response.dto';

@ApiTags('Admin - Products (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/products')
export class ProductAdminController {
  constructor(
    private readonly getAdminProductsUseCase: GetAdminProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách sản phẩm (gồm cả đã ẩn; tìm theo tên/SKU, lọc danh mục, thương hiệu, trạng thái)' })
  async getProducts(@Query() query: GetAdminProductsQueryDto) {
    const { items, total } = await this.getAdminProductsUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      search: query.search,
      categoryId: query.categoryId,
      brandId: query.brandId,
      isActive: query.isActive,
    });

    const data = items.map((product) =>
      ProductResponseDto.fromDomain(product, { onlyActiveVariants: false }),
    );
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Chi tiết sản phẩm kèm biến thể và ảnh' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  async getProductById(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.getProductDetailUseCase.executeById(id);
    return ProductResponseDto.fromDomain(product, { onlyActiveVariants: false });
  }

  @Post()
  @RequirePermissions('PRODUCT_CREATE')
  @ApiOperation({ summary: 'Admin - Thêm sản phẩm kèm biến thể và ảnh (lưu trong một transaction)' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Sai giá, sai thuộc tính biến thể, trùng tổ hợp, danh mục đang ẩn' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục hoặc thương hiệu' })
  @ApiConflictResponse({ description: 'Trùng slug, SKU hoặc mã vạch' })
  async createProduct(@Body() dto: CreateProductRequestDto) {
    const product = await this.createProductUseCase.execute(dto);
    return {
      message: 'Thêm sản phẩm thành công',
      data: ProductResponseDto.fromDomain(product, { onlyActiveVariants: false }),
    };
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_UPDATE')
  @ApiOperation({ summary: 'Admin - Sửa sản phẩm (gửi images sẽ thay toàn bộ ảnh; biến thể sửa ở API riêng)' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm, danh mục hoặc thương hiệu' })
  @ApiConflictResponse({ description: 'Trùng slug hoặc SKU' })
  async updateProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductRequestDto) {
    const product = await this.updateProductUseCase.execute(id, dto);
    return {
      message: 'Cập nhật sản phẩm thành công',
      data: ProductResponseDto.fromDomain(product, { onlyActiveVariants: false }),
    };
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_DELETE')
  @ApiOperation({ summary: 'Admin - Xóa mềm sản phẩm (chuyển sang ngừng kinh doanh)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteProductUseCase.execute(id);
    return { message: 'Đã ngừng kinh doanh sản phẩm', data: null };
  }
}
