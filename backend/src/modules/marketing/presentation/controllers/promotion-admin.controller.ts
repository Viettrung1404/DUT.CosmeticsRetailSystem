import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { ManagePromotionsUseCase } from '../../application/use-cases/manage-promotions.use-case';
import {
  BulkCouponDto,
  CouponQueryDto,
  CreateCouponDto,
  CreatePromotionDto,
  PromotionQueryDto,
  UpdateCouponDto,
  UpdatePromotionDto,
} from '../dtos/marketing-request.dto';

@ApiTags('Admin - Marketing (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class PromotionAdminController {
  constructor(private readonly promotions: ManagePromotionsUseCase) {}

  @Get('promotions')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách chương trình khuyến mãi / flash sale' })
  async list(@Query() query: PromotionQueryDto) {
    const { items, total } = await this.promotions.listPromotions({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      isActive: query.isActive,
      isFlashSale: query.isFlashSale,
      runningOnly: query.runningOnly,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('promotions/:id')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết khuyến mãi' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.promotion(id);
  }

  @Get('promotions/:id/stats')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Thống kê khuyến mãi: số đơn, tiền giảm, doanh thu, ROI = (doanh thu - tiền giảm) / tiền giảm',
    description:
      'Chỉ tính đơn CONFIRMED / PROCESSING / SHIPPING / DELIVERED / COMPLETED (không tính đơn chờ xác nhận, hủy, trả). ' +
      'Số liệu lấy từ các dòng hàng gắn khuyến mãi: discountTotal = tổng tiền giảm; grossRevenue = tổng giá bán x số lượng trước giảm (dùng làm "doanh thu" trong ROI); ' +
      'netRevenue = tổng thực thu sau giảm. roi = null khi chưa có tiền giảm.',
  })
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.promotionStats(id);
  }

  @Post('promotions')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo khuyến mãi' })
  async create(@Body() dto: CreatePromotionDto) {
    const data = await this.promotions.createPromotion({
      name: dto.name,
      description: dto.description?.trim() || null,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      usageLimit: dto.usageLimit ?? null,
      isFlashSale: dto.isFlashSale ?? false,
      applicableProducts: dto.applicableProducts?.length ? dto.applicableProducts : null,
      applicableCategories: dto.applicableCategories?.length ? dto.applicableCategories : null,
    });
    return { message: `Đã tạo khuyến mãi ${data.name}`, data };
  }

  @Put('promotions/:id')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa khuyến mãi (đã có đơn dùng thì không đổi loại / mức giảm)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.updatePromotion(id, dto);
  }

  @Put('promotions/:id/deactivate')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Tắt khuyến mãi (không xóa, D0.4)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.setPromotionActive(id, false);
  }

  @Put('promotions/:id/activate')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Bật lại khuyến mãi' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.setPromotionActive(id, true);
  }

  @Get('coupons')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách mã giảm giá' })
  async listCoupons(@Query() query: CouponQueryDto) {
    const { items, total } = await this.promotions.listCoupons({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      promotionId: query.promotionId,
      isActive: query.isActive,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Post('coupons')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo một mã giảm giá (tự đặt mã hoặc để hệ thống sinh)' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    const data = await this.promotions.createCoupon(this.couponInput(dto));
    return { message: `Đã tạo mã ${data.code}`, data };
  }

  @Post('coupons/bulk')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo hàng loạt mã giảm giá (M7: 8 ký tự, bỏ 0/O/1/I)' })
  async bulk(@Body() dto: BulkCouponDto) {
    const data = await this.promotions.createBulk({
      ...this.couponInput(dto),
      quantity: dto.quantity,
      prefix: dto.prefix,
    });
    return { message: `Đã tạo ${data.length} mã giảm giá`, data };
  }

  @Get('coupons/:id')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết mã giảm giá' })
  getCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.getCoupon(id);
  }

  @Put('coupons/:id')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa mã giảm giá (mã đã dùng thì không đổi loại / mức giảm)' })
  updateCoupon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.promotions.updateCoupon(id, dto);
  }

  @Put('coupons/:id/activate')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Bật lại mã giảm giá' })
  activateCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.setCouponActive(id, true);
  }

  @Put('coupons/:id/deactivate')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Khóa mã giảm giá (không xóa)' })
  deactivateCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.setCouponActive(id, false);
  }

  private couponInput(dto: CreateCouponDto) {
    return {
      code: dto.code,
      promotionId: dto.promotionId ?? null,
      customerId: dto.customerId ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      maxUses: dto.maxUses ?? null,
      maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };
  }
}
