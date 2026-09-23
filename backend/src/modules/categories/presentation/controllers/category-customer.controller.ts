import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import { GetCategoryTreeUseCase } from '../../application/use-cases/get-category-tree.use-case';
import { CategoryTreeResponseDto } from '../dtos/category-tree-response.dto';

@ApiTags('Customer - Categories (Việt Trung)')
@Controller('categories')
export class CategoryCustomerController {
  private static readonly CACHE_KEY = 'categories:tree:customer';
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

  constructor(
    private readonly getCategoryTreeUseCase: GetCategoryTreeUseCase,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  @Public()
  @Get('tree')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Lấy cây danh mục sản phẩm đa cấp phục vụ menu điều hướng Web/Mobile' })
  @ApiOkResponse({ type: [CategoryTreeResponseDto], description: 'Cây danh mục đa cấp' })
  async getCategoryTree(): Promise<CategoryTreeResponseDto[]> {
    const cached = await this.cacheService.get<CategoryTreeResponseDto[]>(
      CategoryCustomerController.CACHE_KEY,
    );
    if (cached) {
      return cached;
    }

    const tree = await this.getCategoryTreeUseCase.execute();
    const result = tree.map((cat) => CategoryTreeResponseDto.fromDomain(cat));

    await this.cacheService.set(
      CategoryCustomerController.CACHE_KEY,
      result,
      CategoryCustomerController.CACHE_TTL_MS,
    );

    return result;
  }
}
