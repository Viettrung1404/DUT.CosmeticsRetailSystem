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
import { GetCategoriesUseCase } from '../../application/use-cases/get-categories.use-case';
import { GetCategoryTreeAdminUseCase } from '../../application/use-cases/get-category-tree-admin.use-case';
import { GetCategoryDetailUseCase } from '../../application/use-cases/get-category-detail.use-case';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../../application/use-cases/delete-category.use-case';
import { CreateCategoryRequestDto } from '../dtos/create-category-request.dto';
import { UpdateCategoryRequestDto } from '../dtos/update-category-request.dto';
import { GetCategoriesQueryDto } from '../dtos/get-categories-query.dto';
import { CategoryResponseDto } from '../dtos/category-response.dto';

@ApiTags('Admin - Categories (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/categories')
export class CategoryAdminController {
  constructor(
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly getCategoryTreeAdminUseCase: GetCategoryTreeAdminUseCase,
    private readonly getCategoryDetailUseCase: GetCategoryDetailUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách danh mục dạng phẳng (phân trang, tìm, lọc)' })
  async getCategories(@Query() query: GetCategoriesQueryDto) {
    const { items, total } = await this.getCategoriesUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      search: query.search,
      isActive: query.isActive,
      parentId: query.parentId,
    });

    const data = items.map((category) => CategoryResponseDto.fromDomain(category));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('tree')
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Cây danh mục đầy đủ, gồm cả danh mục đã ẩn' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  async getCategoryTree() {
    const tree = await this.getCategoryTreeAdminUseCase.execute();
    return tree.map((category) => CategoryResponseDto.fromDomain(category, true));
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({ summary: 'Admin - Xem chi tiết danh mục' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  async getCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.getCategoryDetailUseCase.execute(id);
    return CategoryResponseDto.fromDomain(category);
  }

  @Post()
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm danh mục' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục cha' })
  @ApiConflictResponse({ description: 'Slug đã tồn tại' })
  async createCategory(@Body() dto: CreateCategoryRequestDto) {
    const category = await this.createCategoryUseCase.execute(dto);
    return { message: 'Thêm danh mục thành công', data: CategoryResponseDto.fromDomain(category) };
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa danh mục (đổi cha, đổi thứ tự, bật/tắt hoạt động)' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Đổi cha tạo thành vòng lặp' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục hoặc danh mục cha' })
  @ApiConflictResponse({ description: 'Slug đã tồn tại' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryRequestDto,
  ) {
    const category = await this.updateCategoryUseCase.execute(id, dto);
    return { message: 'Cập nhật danh mục thành công', data: CategoryResponseDto.fromDomain(category) };
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_CATEGORY_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa mềm danh mục (chuyển sang ngừng hoạt động)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  @ApiConflictResponse({ description: 'Còn danh mục con đang hoạt động' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteCategoryUseCase.execute(id);
    return { message: 'Đã xóa danh mục', data: null };
  }
}
