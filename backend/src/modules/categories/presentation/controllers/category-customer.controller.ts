import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { GetCategoryTreeUseCase } from '../../application/use-cases/get-category-tree.use-case';
import { CategoryTreeResponseDto } from '../dtos/category-tree-response.dto';

@ApiTags('Customer - Categories (Việt Trung)')
@Controller('categories')
export class CategoryCustomerController {
  constructor(private readonly getCategoryTreeUseCase: GetCategoryTreeUseCase) {}

  @Public()
  @Get('tree')
  @ApiOperation({ summary: 'Lấy cây danh mục sản phẩm đa cấp phục vụ menu điều hướng Web/Mobile' })
  @ApiOkResponse({ type: [CategoryTreeResponseDto], description: 'Cây danh mục đa cấp' })
  async getCategoryTree(): Promise<CategoryTreeResponseDto[]> {
    const tree = await this.getCategoryTreeUseCase.execute();
    return tree.map((cat) => CategoryTreeResponseDto.fromDomain(cat));
  }
}
