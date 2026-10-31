import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';

@ApiTags('Customer - Stores')
@Controller('stores')
export class StoreController {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get published() {
    return this.config.get('PUBLIC_STORE_DIRECTORY_ENABLED') === 'true';
  }

  private readonly fields = {
    id: true,
    name: true,
    code: true,
    address: true,
    city: true,
    district: true,
    phone: true,
    email: true,
    latitude: true,
    longitude: true,
    openingHours: true,
  } as const;

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Cửa hàng đang hoạt động; không công bố kho nội bộ',
  })
  async list(@Query('city') city?: string) {
    if (!this.published) return [];
    const rows = await this.db.store.findMany({
      where: { isActive: true, type: 'STORE', ...(city && { city }) },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      take: 200,
      select: this.fields,
    });
    return rows.map((row) => ({
      ...row,
      latitude: row.latitude?.toNumber() ?? null,
      longitude: row.longitude?.toNumber() ?? null,
    }));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết cửa hàng đang hoạt động' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    if (!this.published) throw new NotFoundException('STORE_NOT_FOUND');
    const row = await this.db.store.findFirst({
      where: { id, isActive: true, type: 'STORE' },
      select: this.fields,
    });
    if (!row) throw new NotFoundException('STORE_NOT_FOUND');
    return {
      ...row,
      latitude: row.latitude?.toNumber() ?? null,
      longitude: row.longitude?.toNumber() ?? null,
    };
  }
}
