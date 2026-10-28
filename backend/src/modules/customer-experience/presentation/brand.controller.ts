import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Public } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { publicUrl } from '../domain/public-content';

class PublicBrandQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 8 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 8;
}

@ApiTags('Customer - Brands')
@Controller('brands')
export class BrandController {
  constructor(private readonly db: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách thương hiệu đang hiển thị trên cửa hàng' })
  @ApiOkResponse({ description: 'Thương hiệu công khai, ưu tiên thương hiệu nổi bật' })
  async list(@Query() query: PublicBrandQueryDto) {
    const rows = await this.db.brand.findMany({
      where: { isActive: true, products: { some: { isActive: true, category: { isActive: true }, variants: { some: { isActive: true } } } } },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      take: query.limit,
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    return rows.map((row) => ({ ...row, logoUrl: publicUrl(row.logoUrl) }));
  }
}
