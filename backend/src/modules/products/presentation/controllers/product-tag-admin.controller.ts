import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ListProductTagsUseCase } from '../../application/use-cases/list-product-tags.use-case';
import { ProductTagQueryDto } from '../dtos/product-tag-query.dto';

@ApiTags('Admin - Products (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/product-tags')
export class ProductTagAdminController {
  constructor(private readonly listTags: ListProductTagsUseCase) {}

  @Get()
  @RequirePermissions('PRODUCT_VIEW')
  @ApiOperation({
    summary:
      'Admin - Danh sách tag sản phẩm kèm số sản phẩm (gợi ý khi gán tag); gán / bỏ tag làm qua trường tags khi tạo / sửa sản phẩm',
  })
  list(@Query() query: ProductTagQueryDto) {
    return this.listTags.execute({ search: query.search, limit: query.limit ?? 50 });
  }
}
