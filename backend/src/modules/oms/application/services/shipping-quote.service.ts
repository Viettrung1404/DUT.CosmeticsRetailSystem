import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import { LocationService } from '@modules/inventory/application/services/location.service';
import { InventoryBalanceService } from '@modules/inventory/application/services/inventory-balance.service';
import {
  DistanceCalculatorService,
  Coordinates,
} from './distance-calculator.service';
import {
  CalculateShippingQuoteDto,
  ShippingQuoteOption,
  ShippingQuoteResponseDto,
} from '../../presentation/dtos/shipping-quote.dto';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

export interface ValidatedShippingQuote {
  quoteGroupId: string;
  quoteId: string;
  carrierCode: string;
  serviceCode: string;
  sourceLocationId: string;
  estimatedFee: number;
  isAvailable: boolean;
  expiresAt: Date;
}

@Injectable()
export class ShippingQuoteService {
  private readonly logger = new Logger(ShippingQuoteService.name);
  public static readonly QUOTE_TTL_MS = 15 * 60 * 1000; // 15 phút (TTL)
  public static readonly EXPRESS_MAX_DISTANCE_KM = 10.0; // DEC-01: Bán kính tối đa 10km đường bộ

  constructor(
    private readonly prisma: PrismaService,
    private readonly distanceCalculator: DistanceCalculatorService,
    private readonly locationService: LocationService,
    private readonly inventoryBalanceService: InventoryBalanceService,
    @Optional()
    @Inject(CACHE_SERVICE)
    private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Tính toán toàn diện các tùy chọn vận chuyển (Hỏa Tốc 2H & Tiêu Chuẩn) cho giỏ hàng
   */
  async calculateQuotes(
    dto: CalculateShippingQuoteDto,
  ): Promise<ShippingQuoteResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể tính cước vận chuyển');
    }

    // 1. Tải danh sách các địa điểm khả dụng từ hệ thống
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        city: true,
        district: true,
        latitude: true,
        longitude: true,
        openingHours: true,
        fulfillmentCapacityPerDay: true,
      },
    });

    if (stores.length === 0) {
      throw new NotFoundException('Không tìm thấy chi nhánh/kho nào đang hoạt động');
    }

    // 2. Xác định tọa độ khách hàng
    const destCoords = this.distanceCalculator.resolveCoordinates(
      dto.shippingAddress,
    );

    const quoteGroupId = randomUUID();
    const expiresAt = new Date(Date.now() + ShippingQuoteService.QUOTE_TTL_MS);
    const options: ShippingQuoteOption[] = [];

    // 3. TÍNH TOÁN TÙY CHỌN 1: HỎA TỐC 2H (AHAMOVE - DEC-01)
    const expressOption = await this.evaluateExpress2HOption(
      stores,
      destCoords,
      dto,
    );
    options.push(expressOption);

    // 4. TÍNH TOÁN TÙY CHỌN 2: TIÊU CHUẨN (GHN STANDARD)
    const standardOption = await this.evaluateStandardOption(
      stores,
      destCoords,
      dto,
    );
    options.push(standardOption);

    // 5. LƯU BÁO GIÁ VÀO DATABASE POSTGRESQL (bảng shipping_quotes)
    await this.persistQuotes(quoteGroupId, options, expiresAt);

    // 6. CACHE VÀO UPSTASH REDIS (Cache-Aside TTL 15 phút)
    const response: ShippingQuoteResponseDto = {
      quoteGroupId,
      expiresAt,
      options,
    };
    await this.cacheQuoteGroup(quoteGroupId, response);

    return response;
  }

  /**
   * Đánh giá tùy chọn Hỏa Tốc 2H (Ahamove) theo quyết định DEC-01
   */
  private async evaluateExpress2HOption(
    stores: Array<any>,
    destCoords: Coordinates | null,
    dto: CalculateShippingQuoteDto,
  ): Promise<ShippingQuoteOption> {
    const showrooms = stores.filter((s) => s.type === 'STORE');
    const customerCity = (dto.shippingAddress.provinceCity || '').toLowerCase();

    // Lọc các showroom cùng thành phố trước
    let candidateShowrooms = showrooms.filter(
      (s) =>
        s.city.toLowerCase().includes(customerCity) ||
        customerCity.includes(s.city.toLowerCase()),
    );

    if (candidateShowrooms.length === 0) {
      candidateShowrooms = showrooms;
    }

    // Nếu không thể định vị được tọa độ khách hàng
    if (!destCoords) {
      const fallbackShowroom = candidateShowrooms[0] || stores[0];
      return {
        carrierCode: 'AHAMOVE',
        serviceCode: 'EXPRESS_2H',
        serviceName: 'Giao Hỏa Tốc 2H (Ahamove)',
        sourceLocationId: fallbackShowroom.id,
        sourceLocationName: fallbackShowroom.name,
        estimatedFee: 35000,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        isAvailable: false,
        unavailableReason: 'Không thể xác định tọa độ địa chỉ giao hàng để tính lộ trình hỏa tốc',
      };
    }

    // Đánh giá từng showroom: tính cự ly, giờ mở cửa, capacity và tồn kho ATP
    interface ShowroomEvaluation {
      store: any;
      distanceKm: number;
      isOpen: boolean;
      hasCapacity: boolean;
      hasStock: boolean;
      fee: number;
    }

    const evaluations: ShowroomEvaluation[] = [];

    for (const showroom of candidateShowrooms) {
      if (!showroom.latitude || !showroom.longitude) continue;

      const storeCoords: Coordinates = {
        latitude: Number(showroom.latitude),
        longitude: Number(showroom.longitude),
      };

      const distResult = await this.distanceCalculator.calculateDistance(
        storeCoords,
        destCoords,
      );

      const operatingStatus = this.locationService.checkIsOpenNow(showroom.openingHours);
      const isOpen = operatingStatus.isOpenNow;

      const capacityInfo = await this.locationService.getLocationCapacity(
        showroom.id,
      );
      const hasCapacity = capacityInfo.isCapacityAvailable;

      const stockCheck = await this.inventoryBalanceService.checkAvailability(
        showroom.id,
        dto.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );
      const hasStock = stockCheck.isAvailable;

      // Biểu phí Ahamove: 25.000đ cho 3km đầu, mỗi km tiếp theo 5.000đ/km
      let fee = 25000;
      if (distResult.distanceKm > 3.0) {
        fee += Math.ceil((distResult.distanceKm - 3.0) * 5000);
      }
      fee = Math.round(fee / 1000) * 1000;

      evaluations.push({
        store: showroom,
        distanceKm: distResult.distanceKm,
        isOpen,
        hasCapacity,
        hasStock,
        fee,
      });
    }

    // Sắp xếp theo khoảng cách tăng dần
    evaluations.sort((a, b) => a.distanceKm - b.distanceKm);

    if (evaluations.length === 0) {
      const fallbackShowroom = stores[0];
      return {
        carrierCode: 'AHAMOVE',
        serviceCode: 'EXPRESS_2H',
        serviceName: 'Giao Hỏa Tốc 2H (Ahamove)',
        sourceLocationId: fallbackShowroom.id,
        sourceLocationName: fallbackShowroom.name,
        estimatedFee: 35000,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        isAvailable: false,
        unavailableReason: 'Không tìm thấy chi nhánh phù hợp trong khu vực',
      };
    }

    // Tìm showroom thỏa mãn 100% điều kiện: cự ly <= 10km, mở cửa, còn capacity, đủ tồn kho
    const validCandidate = evaluations.find(
      (e) =>
        e.distanceKm <= ShippingQuoteService.EXPRESS_MAX_DISTANCE_KM &&
        e.isOpen &&
        e.hasCapacity &&
        e.hasStock,
    );

    if (validCandidate) {
      return {
        carrierCode: 'AHAMOVE',
        serviceCode: 'EXPRESS_2H',
        serviceName: 'Giao Hỏa Tốc 2H (Ahamove)',
        sourceLocationId: validCandidate.store.id,
        sourceLocationName: validCandidate.store.name,
        estimatedFee: validCandidate.fee,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        distanceKm: validCandidate.distanceKm,
        isAvailable: true,
      };
    }

    // Nếu không showroom nào đủ điều kiện, lấy showroom gần nhất để báo lý do từ chối cụ thể
    const closest = evaluations[0];
    let unavailableReason = 'Chi nhánh gần nhất không đủ điều kiện giao hỏa tốc';

    if (closest.distanceKm > ShippingQuoteService.EXPRESS_MAX_DISTANCE_KM) {
      // Tiêu chí nghiệm thu AC1: Khách cách 10.5 km đường bộ => isAvailable = false
      unavailableReason = `Vượt quá bán kính phục vụ hỏa tốc 10 km (${closest.distanceKm} km)`;
    } else if (!closest.hasStock) {
      unavailableReason = 'Chi nhánh gần nhất không đủ tồn kho khả dụng cho toàn bộ đơn hàng';
    } else if (!closest.isOpen) {
      unavailableReason = 'Chi nhánh gần nhất hiện đang ngoài giờ mở cửa';
    } else if (!closest.hasCapacity) {
      unavailableReason = 'Chi nhánh gần nhất đã đạt giới hạn công suất hoàn tất hôm nay';
    }

    return {
      carrierCode: 'AHAMOVE',
      serviceCode: 'EXPRESS_2H',
      serviceName: 'Giao Hỏa Tốc 2H (Ahamove)',
      sourceLocationId: closest.store.id,
      sourceLocationName: closest.store.name,
      estimatedFee: closest.fee,
      estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      distanceKm: closest.distanceKm,
      isAvailable: false,
      unavailableReason,
    };
  }

  /**
   * Đánh giá tùy chọn Tiêu Chuẩn (GHN Standard)
   */
  private async evaluateStandardOption(
    stores: Array<any>,
    destCoords: Coordinates | null,
    dto: CalculateShippingQuoteDto,
  ): Promise<ShippingQuoteOption> {
    const customerCity = (dto.shippingAddress.provinceCity || '').toLowerCase();
    const warehouses = stores.filter((s) => s.type === 'WAREHOUSE');

    // Ưu tiên chọn Kho Tổng Tân Bình (WH-TB) cho miền Nam và Kho Tổng Hà Nội (WH-HN) cho miền Bắc
    let targetWarehouse = warehouses.find((w) => {
      const isSouth =
        customerCity.includes('hồ chí minh') ||
        customerCity.includes('bình dương') ||
        customerCity.includes('đồng nai') ||
        customerCity.includes('cần thơ');
      if (isSouth) return w.code === 'WH-TB';
      return w.code === 'WH-HN';
    });

    if (!targetWarehouse) {
      targetWarehouse = warehouses[0] || stores[0];
    }

    // Biểu phí chuẩn GHN: 22.000đ nội tỉnh, 35.000đ liên tỉnh
    const isSameCity =
      targetWarehouse.city.toLowerCase().includes(customerCity) ||
      customerCity.includes(targetWarehouse.city.toLowerCase());

    const estimatedFee = isSameCity ? 22000 : 35000;
    const deliveryDays = isSameCity ? 1 : 3;
    const estimatedDeliveryTime = new Date(
      Date.now() + deliveryDays * 24 * 60 * 60 * 1000,
    );

    let distanceKm: number | undefined;
    if (destCoords && targetWarehouse.latitude && targetWarehouse.longitude) {
      const whCoords: Coordinates = {
        latitude: Number(targetWarehouse.latitude),
        longitude: Number(targetWarehouse.longitude),
      };
      const dist = await this.distanceCalculator.calculateDistance(
        whCoords,
        destCoords,
      );
      distanceKm = dist.distanceKm;
    }

    return {
      carrierCode: 'GHN',
      serviceCode: 'STANDARD',
      serviceName: 'Giao Tiêu Chuẩn (GHN)',
      sourceLocationId: targetWarehouse.id,
      sourceLocationName: targetWarehouse.name,
      estimatedFee,
      estimatedDeliveryTime,
      distanceKm,
      isAvailable: true,
    };
  }

  /**
   * Lưu các báo giá vào bảng database `shipping_quotes`
   */
  private async persistQuotes(
    quoteGroupId: string,
    options: ShippingQuoteOption[],
    expiresAt: Date,
  ): Promise<void> {
    const records = options.map((opt) => ({
      quoteGroupId,
      carrierCode: opt.carrierCode,
      serviceCode: opt.serviceCode,
      sourceLocationId: opt.sourceLocationId,
      estimatedFee: new Prisma.Decimal(opt.estimatedFee),
      estimatedDeliveryTime: opt.estimatedDeliveryTime,
      distanceKm: opt.distanceKm ? new Prisma.Decimal(opt.distanceKm) : null,
      isAvailable: opt.isAvailable,
      unavailableReason: opt.unavailableReason || null,
      expiresAt,
    }));

    await this.prisma.shippingQuote.createMany({
      data: records,
    });
  }

  /**
   * Lưu cache nhóm báo giá vào Redis với TTL 15 phút
   */
  private async cacheQuoteGroup(
    quoteGroupId: string,
    data: ShippingQuoteResponseDto,
  ): Promise<void> {
    if (!this.cacheService) return;
    try {
      const cacheKey = `shipping:quote_group:${quoteGroupId}`;
      await this.cacheService.set(cacheKey, data, ShippingQuoteService.QUOTE_TTL_MS);
    } catch (err: any) {
      this.logger.warn(`Failed to cache quote group in Redis: ${err.message}`);
    }
  }

  /**
   * Lấy chi tiết nhóm báo giá từ Redis hoặc DB
   */
  async getQuoteGroup(
    quoteGroupId: string,
  ): Promise<ShippingQuoteResponseDto | null> {
    // 1. Kiểm tra cache Redis
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<ShippingQuoteResponseDto>(
          `shipping:quote_group:${quoteGroupId}`,
        );
        if (cached) return cached;
      } catch (err: any) {
        this.logger.warn(`Redis get failed: ${err.message}`);
      }
    }

    // 2. Fallback sang Database
    const quotes = await this.prisma.shippingQuote.findMany({
      where: { quoteGroupId },
      include: {
        sourceLocation: {
          select: { name: true },
        },
      },
    });

    if (quotes.length === 0) return null;

    const options: ShippingQuoteOption[] = quotes.map((q) => ({
      id: q.id,
      carrierCode: q.carrierCode as any,
      serviceCode: q.serviceCode as any,
      serviceName:
        q.serviceCode === 'EXPRESS_2H'
          ? 'Giao Hỏa Tốc 2H (Ahamove)'
          : 'Giao Tiêu Chuẩn (GHN)',
      sourceLocationId: q.sourceLocationId,
      sourceLocationName: q.sourceLocation.name,
      estimatedFee: Number(q.estimatedFee),
      estimatedDeliveryTime: q.estimatedDeliveryTime,
      distanceKm: q.distanceKm ? Number(q.distanceKm) : undefined,
      isAvailable: q.isAvailable,
      unavailableReason: q.unavailableReason || undefined,
    }));

    return {
      quoteGroupId,
      expiresAt: quotes[0].expiresAt,
      options,
    };
  }

  /**
   * Xác thực tính hợp lệ của báo giá khi checkout.
   * Ngăn chặn khách hàng sửa đổi phí ship từ client (Bảo vệ toàn vẹn tài chính).
   */
  async validateQuote(
    quoteGroupId: string,
    serviceCode: string,
    sourceLocationId?: string,
  ): Promise<ValidatedShippingQuote> {
    const group = await this.getQuoteGroup(quoteGroupId);
    if (!group) {
      throw new NotFoundException('Không tìm thấy thông tin báo giá vận chuyển');
    }

    if (new Date() > new Date(group.expiresAt)) {
      throw new HttpException(
        {
          code: 'SHIPPING_QUOTE_EXPIRED',
          message:
            'Báo giá vận chuyển đã hết hạn (quá 15 phút), vui lòng tính lại cước',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const matched = group.options.find(
      (opt) =>
        (opt.serviceCode === serviceCode ||
          opt.id === serviceCode ||
          opt.carrierCode === serviceCode) &&
        (!sourceLocationId || opt.sourceLocationId === sourceLocationId),
    );

    if (!matched) {
      throw new BadRequestException(
        `Tùy chọn vận chuyển ${serviceCode} không tồn tại trong báo giá được cấp`,
      );
    }

    if (!matched.isAvailable) {
      throw new BadRequestException(
        `Tùy chọn vận chuyển ${serviceCode} không khả dụng: ${matched.unavailableReason}`,
      );
    }

    return {
      quoteGroupId,
      quoteId: matched.id || '',
      carrierCode: matched.carrierCode,
      serviceCode: matched.serviceCode,
      sourceLocationId: matched.sourceLocationId,
      estimatedFee: matched.estimatedFee,
      isAvailable: matched.isAvailable,
      expiresAt: group.expiresAt,
    };
  }
}
