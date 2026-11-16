import {
  Injectable,
  Inject,
  Optional,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import { LocationQueryDto } from '../../presentation/dtos/location-query.dto';
import {
  LocationResponseDto,
  OperatingStatusDto,
} from '../../presentation/dtos/location-response.dto';
import { LocationCapacityResponseDto } from '../../presentation/dtos/location-capacity-response.dto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(CACHE_SERVICE)
    private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Tính toán dải thời gian bắt đầu và kết thúc ngày theo múi giờ Việt Nam (UTC+7)
   */
  getVnDayRange(targetDate: Date = new Date()): {
    startUtc: Date;
    endUtc: Date;
    dateStr: string;
  } {
    // Chuyển sang mốc giờ VN (+7 giờ) để lấy chuẩn Ngày/Tháng/Năm
    const vnTime = new Date(targetDate.getTime() + 7 * 60 * 60 * 1000);
    const y = vnTime.getUTCFullYear();
    const m = vnTime.getUTCMonth();
    const d = vnTime.getUTCDate();

    // 00:00:00 VN biểu diễn dưới dạng UTC (trừ lại 7 giờ)
    const startUtc = new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
    // 23:59:59.999 VN
    const endUtc = new Date(Date.UTC(y, m, d, 16, 59, 59, 999));
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    return { startUtc, endUtc, dateStr };
  }

  /**
   * Đánh giá trạng thái mở cửa của địa điểm dựa trên cấu hình openingHours và thời điểm targetTime
   */
  checkIsOpenNow(
    openingHours: any,
    targetTime: Date = new Date(),
  ): OperatingStatusDto {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(targetTime);
    const weekday =
      parts.find((p) => p.type === 'weekday')?.value.toLowerCase() ?? 'mon';
    const hour = parseInt(
      parts.find((p) => p.type === 'hour')?.value ?? '0',
      10,
    );
    const minute = parseInt(
      parts.find((p) => p.type === 'minute')?.value ?? '0',
      10,
    );
    const currentMinutes = hour * 60 + minute;
    const currentLocalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    if (!openingHours || typeof openingHours !== 'object') {
      return {
        isOpenNow: false,
        currentLocalTime,
        todayOpeningHours: null,
      };
    }

    // Tìm chuỗi cấu hình giờ mở cửa áp dụng cho ngày hôm nay
    let todayRangeStr: string | null = null;

    if (openingHours[weekday]) {
      todayRangeStr = String(openingHours[weekday]);
    } else if (openingHours.mon_sun || openingHours['mon-sun']) {
      todayRangeStr = String(openingHours.mon_sun || openingHours['mon-sun']);
    } else if (
      weekday !== 'sun' &&
      (openingHours.mon_sat || openingHours['mon-sat'])
    ) {
      todayRangeStr = String(openingHours.mon_sat || openingHours['mon-sat']);
    } else if (
      weekday !== 'sat' &&
      weekday !== 'sun' &&
      (openingHours.mon_fri || openingHours['mon-fri'])
    ) {
      todayRangeStr = String(openingHours.mon_fri || openingHours['mon-fri']);
    } else if (openingHours.open && openingHours.close) {
      todayRangeStr = `${openingHours.open}-${openingHours.close}`;
    }

    if (!todayRangeStr || todayRangeStr.toLowerCase() === 'closed') {
      return {
        isOpenNow: false,
        currentLocalTime,
        todayOpeningHours: null,
      };
    }

    // Parse dạng '08:00-22:00' hoặc '07:30-18:00'
    const partsRange = todayRangeStr.split('-');
    if (partsRange.length !== 2) {
      return {
        isOpenNow: false,
        currentLocalTime,
        todayOpeningHours: todayRangeStr,
      };
    }

    const [startH, startM] = partsRange[0].split(':').map((v) => parseInt(v, 10));
    const [endH, endM] = partsRange[1].split(':').map((v) => parseInt(v, 10));

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return {
        isOpenNow: false,
        currentLocalTime,
        todayOpeningHours: todayRangeStr,
      };
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isOpenNow =
      currentMinutes >= startMinutes && currentMinutes < endMinutes;

    return {
      isOpenNow,
      currentLocalTime,
      todayOpeningHours: todayRangeStr,
    };
  }

  /**
   * Truy vấn danh sách địa điểm (Showrooms & Warehouses)
   */
  async listLocations(
    query: LocationQueryDto,
    now: Date = new Date(),
  ): Promise<LocationResponseDto[]> {
    const cacheKey = `locations:list:${query.type || 'all'}:${query.city || 'all'}:${query.isActive ?? true}`;

    // 1. Kiểm tra cache nếu có
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<LocationResponseDto[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          // Cập nhật lại operatingStatus theo thời điểm gọi thực tế
          return cached.map((loc) => ({
            ...loc,
            operatingStatus: this.checkIsOpenNow(loc.openingHours, now),
          }));
        }
      } catch (err) {
        this.logger.warn(`Lỗi đọc cache locations: ${(err as Error).message}`);
      }
    }

    // 2. Truy vấn Database
    const where: any = {
      isActive: query.isActive !== undefined ? query.isActive : true,
    };
    if (query.type) {
      where.type = query.type;
    }
    if (query.city) {
      where.city = query.city;
    }

    const stores = await this.prisma.store.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });

    const result: LocationResponseDto[] = stores.map((store) => {
      const operatingStatus = this.checkIsOpenNow(store.openingHours, now);
      return {
        id: store.id,
        code: store.code,
        name: store.name,
        type: store.type,
        address: store.address,
        district: store.district,
        city: store.city,
        phone: store.phone,
        email: store.email,
        latitude: store.latitude ? Number(store.latitude) : null,
        longitude: store.longitude ? Number(store.longitude) : null,
        fulfillmentCapacityPerDay: store.fulfillmentCapacityPerDay,
        openingHours: store.openingHours,
        operatingStatus,
      };
    });

    // 3. Ghi cache với TTL 1 giờ (3600 giây)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, result, 3600 * 1000);
      } catch (err) {
        this.logger.warn(`Lỗi ghi cache locations: ${(err as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Kiểm tra năng lực hoàn tất đơn hàng trong ngày của địa điểm
   */
  async getLocationCapacity(
    locationId: string,
    now: Date = new Date(),
  ): Promise<LocationCapacityResponseDto> {
    const store = await this.prisma.store.findUnique({
      where: { id: locationId },
    });

    if (!store) {
      throw new NotFoundException(`LOCATION_NOT_FOUND_${locationId}`);
    }

    const { startUtc, endUtc, dateStr } = this.getVnDayRange(now);

    // Tính toán số lượng đơn đã phân bổ trong ngày
    let allocatedOrdersToday = 0;
    if ((this.prisma as any).fulfillmentOrder) {
      allocatedOrdersToday = await (this.prisma as any).fulfillmentOrder.count({
        where: {
          sourceLocationId: store.id,
          createdAt: { gte: startUtc, lte: endUtc },
          status: { notIn: ['CANCELLED'] },
        },
      });
    } else {
      allocatedOrdersToday = await this.prisma.order.count({
        where: {
          storeId: store.id,
          createdAt: { gte: startUtc, lte: endUtc },
          status: { notIn: ['CANCELLED'] },
        },
      });
    }

    const capacityPerDay = store.fulfillmentCapacityPerDay ?? 500;
    const isCapacityAvailable = allocatedOrdersToday < capacityPerDay;
    const remainingCapacityToday = Math.max(0, capacityPerDay - allocatedOrdersToday);
    const operatingStatus = this.checkIsOpenNow(store.openingHours, now);

    return {
      locationId: store.id,
      locationCode: store.code,
      locationName: store.name,
      locationType: store.type,
      capacityPerDay,
      allocatedOrdersToday,
      remainingCapacityToday,
      isCapacityAvailable,
      date: dateStr,
      operatingStatus,
    };
  }
}
