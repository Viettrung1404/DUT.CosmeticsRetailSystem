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
import { GetBrandsUseCase } from '../../application/use-cases/get-brands.use-case';
import { GetBrandDetailUseCase } from '../../application/use-cases/get-brand-detail.use-case';
import { CreateBrandUseCase } from '../../application/use-cases/create-brand.use-case';
import { UpdateBrandUseCase } from '../../application/use-cases/update-brand.use-case';
import { DeleteBrandUseCase } from '../../application/use-cases/delete-brand.use-case';
import { CreateBrandRequestDto } from '../dtos/create-brand-request.dto';
import { UpdateBrandRequestDto } from '../dtos/update-brand-request.dto';
import { GetBrandsQueryDto } from '../dtos/get-brands-query.dto';
import { BrandResponseDto } from '../dtos/brand-response.dto';

@ApiTags('Admin - Brands (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/brands')
export class BrandAdminController {
  constructor(
    private readonly getBrandsUseCase: GetBrandsUseCase,
    private readonly getBrandDetailUseCase: GetBrandDetailUseCase,
    private readonly createBrandUseCase: CreateBrandUseCase,
    private readonly updateBrandUseCase: UpdateBrandUseCase,
    private readonly deleteBrandUseCase: DeleteBrandUseCase,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách thương hiệu (phân trang, tìm theo tên, lọc trạng thái)' })
  async getBrands(@Query() query: GetBrandsQueryDto) {
    const { items, total } = await this.getBrandsUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      search: query.search,
      isActive: query.isActive,
    });

    const data = items.map((brand) => BrandResponseDto.fromDomain(brand));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Xem chi tiết thương hiệu' })
  @ApiOkResponse({ type: BrandResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thương hiệu' })
  async getBrandById(@Param('id', ParseUUIDPipe) id: string) {
    const brand = await this.getBrandDetailUseCase.execute(id);
    return BrandResponseDto.fromDomain(brand);
  }

  @Post()
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm thương hiệu' })
  @ApiCreatedResponse({ type: BrandResponseDto })
  @ApiConflictResponse({ description: 'Slug đã tồn tại' })
  async createBrand(@Body() dto: CreateBrandRequestDto) {
    const brand = await this.createBrandUseCase.execute(dto);
    return { message: 'Thêm thương hiệu thành công', data: BrandResponseDto.fromDomain(brand) };
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa thương hiệu (gửi isActive = false để ngừng kinh doanh)' })
  @ApiOkResponse({ type: BrandResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thương hiệu' })
  @ApiConflictResponse({ description: 'Slug đã tồn tại' })
  async updateBrand(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandRequestDto) {
    const brand = await this.updateBrandUseCase.execute(id, dto);
    return { message: 'Cập nhật thương hiệu thành công', data: BrandResponseDto.fromDomain(brand) };
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa thương hiệu (chỉ khi chưa có sản phẩm nào)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thương hiệu' })
  @ApiConflictResponse({ description: 'Thương hiệu đang có sản phẩm' })
  async deleteBrand(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteBrandUseCase.execute(id);
    return { message: 'Đã xóa thương hiệu', data: null };
  }
}
