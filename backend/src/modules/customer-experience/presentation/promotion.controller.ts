import { promotionSlotEnd, isPromotionInSlot } from '@core/utils/flash-sale.util';
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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
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
} from "class-validator";
import { Type } from "class-transformer";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "@infrastructure/database/prisma.service";
import { Public } from "@core/decorators/public.decorator";
import { UpstashRedisService } from "@core/cache/upstash-redis.service";
import { CustomerOnlyGuard } from "@modules/customer-commerce/presentation/customer-only.guard";
import { CommercePricingService } from "../application/commerce-pricing.service";
import { PublicListDto } from "./experience.dto";
import { ExperienceResponse } from "./experience.responses";
import { CommerceErrors } from "@modules/customer-commerce/presentation/commerce.responses";
import { publicUrl } from "../domain/public-content";
import {
  MIN_REDEEM_BALANCE_VND,
  REDEEM_STEP_VND,
  POINT_VALUE_VND,
  MAX_REDEEM_RATIO,
} from "@core/utils/loyalty-policy.util";

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
  slotStartHour: true,
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
  async checkoutBenefits(customerId: string) {
    const now = new Date();
    const [customer, coupons] = await Promise.all([
      this.db.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { totalPoints: true },
      }),
      this.db.coupon.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gt: now },
          OR: [{ customerId: null }, { customerId }],
          AND: [
            {
              OR: [
                { maxUses: null },
                { usedCount: { lt: this.db.coupon.fields.maxUses } },
              ],
            },
          ],
        },
        orderBy: [{ endDate: "asc" }, { id: "asc" }],
        take: 100,
        include: {
          _count: { select: { usages: { where: { customerId } } } },
          promotion: {
            select: {
              isActive: true,
              startDate: true,
              endDate: true,
              usageLimit: true,
              usedCount: true,
            },
          },
        },
      }),
    ]);
    return {
      coupons: coupons
        .filter((coupon) => {
          const p = coupon.promotion;
          return (
            coupon._count.usages < coupon.maxUsesPerCustomer &&
            (!p ||
              (p.isActive &&
                p.startDate <= now &&
                p.endDate > now &&
                (p.usageLimit === null || p.usedCount < p.usageLimit)))
          );
        })
        .map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          minOrderAmount: Number(coupon.minOrderAmount),
          maxDiscountAmount:
            coupon.maxDiscountAmount === null
              ? null
              : Number(coupon.maxDiscountAmount),
          endDate: coupon.endDate.toISOString(),
        })),
      points: {
        balance: customer.totalPoints,
        value: POINT_VALUE_VND,
        minimumBalance: MIN_REDEEM_BALANCE_VND / POINT_VALUE_VND,
        step: REDEEM_STEP_VND / POINT_VALUE_VND,
        maxRatio: MAX_REDEEM_RATIO,
      },
    };
  }
  async flashCards(limit: number) {
    const now = new Date();
    const selected = await this.db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM (
        SELECT DISTINCT ON (v.product_id) q.id::text AS id, v.product_id,
          (1 - sprint5_variant_price(v.id,0) / NULLIF(v.price,0)) AS discount
        FROM promotion_variant_quotas q JOIN promotions p ON p.id=q.promotion_id
        JOIN product_variants v ON v.id=q.product_variant_id
        JOIN products product ON product.id=v.product_id
        WHERE p.is_active AND p.is_flash_sale AND p.start_date<=${now} AND p.end_date>${now}
          AND glowup_slot_active(p.slot_start_hour,${now})
          AND (p.usage_limit IS NULL OR p.used_count<p.usage_limit)
          AND (p.slot_start_hour IS NULL OR glowup_featured(q.product_rank,p.rotation_product_count,p.featured_product_count,p.slot_start_hour,${now}))
          AND q.quota-q.reserved_quantity-q.consumed_quantity>0
          AND v.is_active AND product.is_active
          AND EXISTS (SELECT 1 FROM inventory i WHERE i.product_variant_id=v.id AND i.available_quantity>0)
        ORDER BY v.product_id, discount DESC, q.id
      ) chosen ORDER BY discount DESC, product_id LIMIT ${limit}
    `;
    const quotas = await this.db.promotionVariantQuota.findMany({
      where: {
        id: { in: selected.map((row) => row.id) },
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
      orderBy: [{ promotion: { endDate: "asc" } }, { id: "asc" }],
      take: Math.min(limit * 5, 100),
      select: {
        id: true,
        productVariantId: true,
        quota: true,
        reservedQuantity: true,
        consumedQuantity: true,
        promotion: {
          select: { id: true, name: true, endDate: true, minOrderAmount: true, slotStartHour: true, startDate: true },
        },
        variant: {
          select: {
            option1Value: true,
            option2Value: true,
            price: true,
            inventory: {
              where: {
                availableQuantity: { gt: 0 },
                store: { isActive: true, type: { in: ['STORE', 'WAREHOUSE'] } },
              },
              select: { availableQuantity: true },
            },
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                images: {
                  orderBy: { sortOrder: "asc" },
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
      .filter((q) => q.quota > q.reservedQuantity + q.consumedQuantity && isPromotionInSlot(q.promotion.slotStartHour, now))
      .sort((a,b) => selected.findIndex((r) => r.id === a.id) - selected.findIndex((r) => r.id === b.id))
      .slice(0, limit);
    const ids = active.map((q) => q.productVariantId);
    const prices = ids.length
      ? await this.db.$queryRaw<
          { id: string; price: number }[]
        >`SELECT id,sprint5_variant_price(id,0::numeric)::float8 AS price FROM product_variants WHERE id=ANY(${ids}::uuid[])`
      : [];
    return active.map((q) => {
      return {
        serverTime: now.toISOString(),
        promotionId: q.promotion.id,
        promotionName: q.promotion.name,
        endDate: promotionSlotEnd(q.promotion.endDate, q.promotion.slotStartHour, now),
        campaignStartDate: q.promotion.startDate,
        campaignEndDate: q.promotion.endDate,
        isFeatured: q.promotion.slotStartHour != null,
        conditional: Number(q.promotion.minOrderAmount) > 0,
        remaining: q.quota - q.reservedQuantity - q.consumedQuantity,
        stockQuantity: q.variant.inventory.reduce((total, item) => total + (item.availableQuantity ?? 0), 0),
        variantId: q.productVariantId,
        variantLabel: [q.variant.option1Value, q.variant.option2Value].filter(Boolean).join(" / "),
        productId: q.variant.product.id,
        name: q.variant.product.name,
        slug: q.variant.product.slug,
        brandName: q.variant.product.brand?.name ?? null,
        imageUrl: publicUrl(q.variant.product.images[0]?.imageUrl ?? null),
        originalPrice: Number(q.variant.price),
        effectivePrice:
          prices.find((p) => p.id === q.productVariantId)?.price ??
          Number(q.variant.price),
      };
    });
  }
  async active(query: PublicListDto, flash = false) {
    const now = new Date();
    const where = {
      AND: [{ OR: [{ slotStartHour: null }, { slotStartHour: Math.floor(new Date(now.getTime() + 7 * 3600000).getUTCHours() / 2) * 2 }] }],
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
      orderBy: [{ endDate: "asc" }, { id: "asc" }],
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
      orderBy: [{ promotionId: "asc" }, { id: "asc" }],
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
      items: items.map((p) => {
        return {
          ...p,
          endDate: promotionSlotEnd(p.endDate, p.slotStartHour, now),
          variants: quotas
            .filter((q) => q.promotionId === p.id)
            .map((q) => ({
              variantId: q.productVariantId,
              remaining: q.quota - q.reservedQuantity - q.consumedQuantity,
              effectivePrice: prices.find((v) => v.id === q.productVariantId)
                ?.price,
              conditional: Number(p.minOrderAmount) > 0,
            })),
        };
      }),
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
    if (!promotion || !isPromotionInSlot(promotion.slotStartHour, now)) throw new NotFoundException("PROMOTION_NOT_FOUND");
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
        orderBy: { id: "asc" },
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
                    orderBy: { sortOrder: "asc" },
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
    const variantIds = quotas.map((quota) => quota.productVariantId);
    const effectivePrices = variantIds.length ? await this.db.$queryRaw<Array<{ id: string; price: number }>>`
      SELECT id::text AS id, sprint5_variant_price(id,0)::float8 AS price
      FROM product_variants WHERE id=ANY(${variantIds}::uuid[])
    ` : [];
    return {
      ...promotion,
      endDate: promotionSlotEnd(promotion.endDate, promotion.slotStartHour, now),
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
        originalPrice: Number(q.variant.price),
        price: effectivePrices.find((price) => price.id === q.productVariantId)?.price ?? Number(q.variant.price),
        remaining: Math.max(
          0,
          q.quota - q.reservedQuantity - q.consumedQuantity,
        ),
      })),
    };
  }
}
@ApiTags("Customer - Promotions")
@CommerceErrors()
@Controller()
export class PromotionController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly pricing: CommercePricingService,
    private readonly redis: UpstashRedisService,
  ) {}
  @Get("customers/me/checkout-benefits")
  @UseGuards(CustomerOnlyGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary:
      "Voucher của tài khoản và quy tắc dùng điểm tại checkout; chưa giữ lượt sử dụng",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["coupons", "points"],
      properties: {
        coupons: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
              "code",
              "discountType",
              "discountValue",
              "minOrderAmount",
              "maxDiscountAmount",
              "endDate",
            ],
            properties: {
              id: { type: "string", format: "uuid" },
              code: { type: "string" },
              discountType: { type: "string" },
              discountValue: { type: "number" },
              minOrderAmount: { type: "number" },
              maxDiscountAmount: { type: "number", nullable: true },
              endDate: { type: "string", format: "date-time" },
            },
          },
        },
        points: {
          type: "object",
          required: ["balance", "value", "minimumBalance", "step", "maxRatio"],
          properties: {
            balance: { type: "integer" },
            value: { type: "number" },
            minimumBalance: { type: "integer" },
            step: { type: "integer" },
            maxRatio: { type: "number" },
          },
        },
      },
    },
  })
  checkoutBenefits(@Req() req: { customerId: string }) {
    return this.promotions.checkoutBenefits(req.customerId);
  }
  @Public()
  @Get("promotions/flash-sale/cards")
  @ApiOperation({ summary: "Card sản phẩm flash sale còn quota cho trang chủ" })
  flashCards(@Query("limit") limit?: string) {
    const requested = Number(limit ?? 5);
    return this.promotions.flashCards(
      Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 20) : 5,
    );
  }
  @Public()
  @Get("promotions/active")
  @ApiOperation({
    summary:
      "Campaign đang hoạt động và điều kiện áp dụng, không trả mã coupon riêng",
  })
  @ExperienceResponse("promotions")
  active(@Query() query: PublicListDto) {
    return this.promotions.active(query);
  }
  @Public()
  @Get("promotions/flash-sale")
  @ApiOperation({
    summary:
      "Flash Sale và quota còn lại; checkout xác nhận lại giá và giữ quota",
  })
  @ExperienceResponse("promotions")
  flash(@Query() query: PublicListDto) {
    return this.promotions.active(query, true);
  }
  @Public()
  @Get("promotions/:id")
  @ApiOperation({
    summary: "Chi tiết campaign đang hoạt động và sản phẩm có quota",
  })
  detail(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PublicListDto,
  ) {
    return this.promotions.detail(id, query.page, query.limit);
  }
  @Post("coupons/validate")
  @HttpCode(200)
  @UseGuards(CustomerOnlyGuard)
  @ApiBearerAuth("JWT-auth")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      "Kiểm tra coupon bằng cùng pricing engine; không giữ quota/điểm/lượt coupon",
  })
  @ExperienceResponse("quote")
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
        throw new HttpException("COUPON_RATE_LIMITED", 429);
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
          reasonCode: "COUPON_OR_SELECTION_NOT_AVAILABLE",
        };
      throw error;
    }
  }
}
