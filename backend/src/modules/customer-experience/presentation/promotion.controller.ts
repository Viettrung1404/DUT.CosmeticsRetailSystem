import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Injectable,
  Post,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Public } from '@core/decorators/public.decorator';
import { UpstashRedisService } from '@core/cache/upstash-redis.service';
import { CustomerOnlyGuard } from '@modules/customer-commerce/presentation/customer-only.guard';
import { CommercePricingService } from '../application/commerce-pricing.service';
import { PublicListDto } from './experience.dto';
import { ExperienceResponse } from './experience.responses';
import { CommerceErrors } from '@modules/customer-commerce/presentation/commerce.responses';
import { publicUrl } from '../domain/public-content';

class SelectionItemDto {
  @ApiProperty() @IsUUID() variantId: string;
  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity: number;
}
export class CouponValidationDto {
  @ApiProperty() @IsString() @MaxLength(50) code: string;
  @ApiProperty({ type: [SelectionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SelectionItemDto)
  items: SelectionItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) usePoints?: number;
}
const publicCampaign = {
  id: true,
  name: true,
  description: true,
  type: true,
  value: true,
  minOrderAmount: true,
  maxDiscountAmount: true,
  startDate: true,
  endDate: true,
  isFlashSale: true,
  applicableProducts: true,
  applicableCategories: true,
} as const;
@Injectable()
export class PromotionsService {
  constructor(private readonly db: PrismaService) {}
  async flashCards(limit: number) {
    const now = new Date();
    const quotas = await this.db.promotionVariantQuota.findMany({
      where: {
        promotion: {
          isActive: true,
          isFlashSale: true,
          startDate: { lte: now },
          endDate: { gt: now },
          OR: [
            { usageLimit: null },
            { usedCount: { lt: this.db.promotion.fields.usageLimit } },
          ],
        },
        variant: {
          isActive: true,
          product: {
            isActive: true,
            category: { isActive: true },
            OR: [{ brandId: null }, { brand: { isActive: true } }],
          },
        },
      },
      orderBy: [{ promotion: { endDate: 'asc' } }, { id: 'asc' }],
      take: Math.min(limit * 5, 100),
      select: {
        id: true,
        productVariantId: true,
        quota: true,
        reservedQuantity: true,
        consumedQuantity: true,
        promotion: {
          select: { id: true, name: true, endDate: true, minOrderAmount: true },
        },
        variant: {
          select: {
            price: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  select: { imageUrl: true },
                },
                brand: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    const active = quotas
      .filter((q) => q.quota > q.reservedQuantity + q.consumedQuantity)
      .slice(0, limit);
    const ids = active.map((q) => q.productVariantId);
    const prices = ids.length
      ? await this.db.$queryRaw<
          { id: string; price: number }[]
        >`SELECT id,sprint5_variant_price(id,0::numeric)::float8 AS price FROM product_variants WHERE id=ANY(${ids}::uuid[])`
      : [];
    return active.map((q) => ({
      serverTime: now.toISOString(),
      promotionId: q.promotion.id,
      promotionName: q.promotion.name,
      endDate: q.promotion.endDate,
      conditional: Number(q.promotion.minOrderAmount) > 0,
      remaining: q.quota - q.reservedQuantity - q.consumedQuantity,
      variantId: q.productVariantId,
      productId: q.variant.product.id,
      name: q.variant.product.name,
      slug: q.variant.product.slug,
      brandName: q.variant.product.brand?.name ?? null,
      imageUrl: publicUrl(q.variant.product.images[0]?.imageUrl ?? null),
      originalPrice: Number(q.variant.price),
      effectivePrice:
        prices.find((p) => p.id === q.productVariantId)?.price ??
        Number(q.variant.price),
    }));
  }
  async active(query: PublicListDto, flash = false) {
    const now = new Date();
    const where = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gt: now },
      OR: [
        { usageLimit: null },
        { usedCount: { lt: this.db.promotion.fields.usageLimit } },
      ],
      ...(flash && { isFlashSale: true }),
    };
    const rows = await this.db.promotion.findMany({
      where,
      orderBy: [{ endDate: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: { ...publicCampaign, usageLimit: true, usedCount: true },
    });
    const items = rows
      .filter((p) => p.usageLimit === null || p.usedCount < p.usageLimit)
      .map(({ usageLimit: _, usedCount: __, ...p }) => p);
    const total = await this.db.promotion.count({ where });
    if (!flash)
      return {
        items,
        total,
        page: query.page,
        limit: query.limit,
        serverTime: now.toISOString(),
      };
    const quotas = await this.db.promotionVariantQuota.findMany({
      where: {
        promotionId: { in: items.map((p) => p.id) },
        variant: {
          isActive: true,
          product: {
            isActive: true,
            category: { isActive: true },
            OR: [{ brandId: null }, { brand: { isActive: true } }],
          },
        },
      },
      orderBy: [{ promotionId: 'asc' }, { id: 'asc' }],
      take: 500,
      select: {
        id: true,
        promotionId: true,
        productVariantId: true,
        quota: true,
        reservedQuantity: true,
        consumedQuantity: true,
      },
    });
    const ids = quotas.map((q) => q.productVariantId);
    const prices = ids.length
      ? await this.db.$queryRaw<
          { id: string; price: number }[]
        >`SELECT id,sprint5_variant_price(id,0::numeric)::float8 AS price FROM product_variants WHERE id=ANY(${ids}::uuid[])`
      : [];
    return {
      items: items.map((p) => ({
        ...p,
        variants: quotas
          .filter((q) => q.promotionId === p.id)
          .map((q) => ({
            variantId: q.productVariantId,
            remaining: q.quota - q.reservedQuantity - q.consumedQuantity,
            effectivePrice: prices.find((v) => v.id === q.productVariantId)
              ?.price,
            conditional: Number(p.minOrderAmount) > 0,
          })),
      })),
      total,
      page: query.page,
      limit: query.limit,
      serverTime: now.toISOString(),
      reservation: false,
    };
  }

  async detail(id: string, page: number, limit: number) {
    const now = new Date();
    const promotion = await this.db.promotion.findFirst({
      where: {
        id,
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      select: publicCampaign,
    });
    if (!promotion) throw new NotFoundException('PROMOTION_NOT_FOUND');
    const where = {
      promotionId: id,
      variant: {
        isActive: true,
        product: {
          isActive: true,
          category: { isActive: true },
          OR: [{ brandId: null }, { brand: { isActive: true } }],
        },
      },
    };
    const [quotas, total] = await this.db.$transaction([
      this.db.promotionVariantQuota.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          productVariantId: true,
          quota: true,
          reservedQuantity: true,
          consumedQuantity: true,
          variant: {
            select: {
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                    select: { imageUrl: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.promotionVariantQuota.count({ where }),
    ]);
    return {
      ...promotion,
      serverTime: now.toISOString(),
      page,
      limit,
      total,
      products: quotas.map((q) => ({
        variantId: q.productVariantId,
        productId: q.variant.product.id,
        name: q.variant.product.name,
        slug: q.variant.product.slug,
        imageUrl: publicUrl(q.variant.product.images[0]?.imageUrl ?? null),
        price: Number(q.variant.price),
        remaining: Math.max(
          0,
          q.quota - q.reservedQuantity - q.consumedQuantity,
        ),
      })),
    };
  }
}
@ApiTags('Customer - Promotions')
@CommerceErrors()
@Controller()
export class PromotionController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly pricing: CommercePricingService,
    private readonly redis: UpstashRedisService,
  ) {}
  @Public()
  @Get('promotions/flash-sale/cards')
  @ApiOperation({ summary: 'Card sản phẩm flash sale còn quota cho trang chủ' })
  flashCards(@Query('limit') limit?: string) {
    const requested = Number(limit ?? 5);
    return this.promotions.flashCards(
      Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 20) : 5,
    );
  }
  @Public()
  @Get('promotions/active')
  @ApiOperation({
    summary:
      'Campaign đang hoạt động và điều kiện áp dụng, không trả mã coupon riêng',
  })
  @ExperienceResponse('promotions')
  active(@Query() query: PublicListDto) {
    return this.promotions.active(query);
  }
  @Public()
  @Get('promotions/flash-sale')
  @ApiOperation({
    summary:
      'Flash Sale và quota còn lại; checkout xác nhận lại giá và giữ quota',
  })
  @ExperienceResponse('promotions')
  flash(@Query() query: PublicListDto) {
    return this.promotions.active(query, true);
  }
  @Public()
  @Get('promotions/:id')
  @ApiOperation({
    summary: 'Chi tiết campaign đang hoạt động và sản phẩm có quota',
  })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PublicListDto,
  ) {
    return this.promotions.detail(id, query.page, query.limit);
  }
  @Post('coupons/validate')
  @HttpCode(200)
  @UseGuards(CustomerOnlyGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Kiểm tra coupon bằng cùng pricing engine; không giữ quota/điểm/lượt coupon',
  })
  @ExperienceResponse('quote')
  async validate(
    @Req() req: { user: { userId: string }; customerId: string; ip: string },
    @Body() input: CouponValidationDto,
  ) {
    if (this.redis.configured) {
      const userAllowed = await this.redis.rateLimit(
        `coupon:user:${req.user.userId}`,
        10,
        60000,
      );
      const ipAllowed = await this.redis.rateLimit(
        `coupon:ip:${req.ip}`,
        30,
        60000,
      );
      if (!userAllowed || !ipAllowed)
        throw new HttpException('COUPON_RATE_LIMITED', 429);
    }
    try {
      const { variants: _, ...quote } = await this.pricing.quote({
        customerId: req.customerId,
        items: input.items,
        couponCode: input.code,
        usePoints: input.usePoints,
      });
      return { valid: true, reasonCode: null, ...quote };
    } catch (error) {
      if (error instanceof BadRequestException)
        return {
          valid: false,
          reasonCode: 'COUPON_OR_SELECTION_NOT_AVAILABLE',
        };
      throw error;
    }
  }
}
