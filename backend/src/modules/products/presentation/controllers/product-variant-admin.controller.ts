import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetProductVariantsUseCase } from '../../application/use-cases/get-product-variants.use-case';
import { CreateProductVariantUseCase } from '../../application/use-cases/create-product-variant.use-case';
import { UpdateProductVariantUseCase } from '../../application/use-cases/update-product-variant.use-case';
import { DeleteProductVariantUseCase } from '../../application/use-cases/delete-product-variant.use-case';
import {
  CreateProductVariantRequestDto,
  UpdateProductVariantRequestDto,
} from '../dtos/product-variant-request.dto';
import { ProductVariantResponseDto } from '../dtos/product-variant-response.dto';

@ApiTags('Admin - Product Variants (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class ProductVariantAdminController {
  constructor(
    private readonly getProductVariantsUseCase: GetProductVariantsUseCase,
    private readonly createProductVariantUseCase: CreateProductVariantUseCase,
    private readonly updateProductVariantUseCase: UpdateProductVariantUseCase,
    private readonly deleteProductVariantUseCase: DeleteProductVariantUseCase,
  ) {}

  @Get('products/:productId/variants')
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách biến thể của sản phẩm (gồm cả đã ẩn)' })
  @ApiOkResponse({ type: [ProductVariantResponseDto] })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  async getVariants(@Param('productId', ParseUUIDPipe) productId: string) {
    const variants = await this.getProductVariantsUseCase.execute(productId);
    return variants.map((variant) => ProductVariantResponseDto.fromDomain(variant));
  }

  @Post('products/:productId/variants')
  @RequirePermissions('PRODUCT_CREATE')
  @ApiOperation({ summary: 'Admin - Thêm biến thể (kiểm tra tổ hợp thuộc tính không trùng)' })
  @ApiCreatedResponse({ type: ProductVariantResponseDto })
  @ApiBadRequestResponse({ description: 'Giá trị thuộc tính không khớp với tên thuộc tính của sản phẩm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiConflictResponse({ description: 'Trùng tổ hợp thuộc tính, SKU hoặc mã vạch' })
  async createVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductVariantRequestDto,
  ) {
    const variant = await this.createProductVariantUseCase.execute(productId, dto);
    return { message: 'Thêm biến thể thành công', data: ProductVariantResponseDto.fromDomain(variant) };
  }

  @Patch('variants/:id')
  @RequirePermissions('PRODUCT_UPDATE')
  @ApiOperation({ summary: 'Admin - Sửa biến thể (giá, SKU, mã vạch, thuộc tính, trạng thái)' })
  @ApiOkResponse({ type: ProductVariantResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể' })
  @ApiConflictResponse({ description: 'Trùng tổ hợp thuộc tính, SKU hoặc mã vạch' })
  async updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantRequestDto,
  ) {
    const variant = await this.updateProductVariantUseCase.execute(id, dto);
    return { message: 'Cập nhật biến thể thành công', data: ProductVariantResponseDto.fromDomain(variant) };
  }

  @Delete('variants/:id')
  @RequirePermissions('PRODUCT_DELETE')
  @ApiOperation({ summary: 'Admin - Xóa mềm biến thể (chuyển sang ngừng bán)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể' })
  async deleteVariant(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteProductVariantUseCase.execute(id);
    return { message: 'Đã ngừng bán biến thể', data: null };
  }
}
