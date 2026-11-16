import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QuoteRequestDto,
  QuoteResponseDto,
} from '../../../domain/dtos/shipping-provider.dto';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AhamovePoint {
  address: string;
  name?: string;
  mobile?: string;
  lat: number;
  lng: number;
  remarks?: string;
  cod_amount?: number;
  tracking_number?: string;
}

export interface AhamoveEstimateFeeRequest {
  order_time: number;
  service_id: string;
  path: [AhamovePoint, AhamovePoint];
}

export interface AhamoveEstimateFeeResponse {
  total_price: number;
  service_id: string;
  distance?: number;
  duration?: number;
  currency?: string;
}

// Bảng tọa độ tham chiếu chuẩn cho các quận trọng điểm
const DEFAULT_DISTRICT_COORDS: Record<string, Record<string, Coordinates>> = {
  'hồ chí minh': {
    'quận 1': { latitude: 10.7769, longitude: 106.7009 },
    'quận 3': { latitude: 10.7844, longitude: 106.6844 },
    'quận 5': { latitude: 10.7554, longitude: 106.6675 },
    'quận 10': { latitude: 10.7746, longitude: 106.6669 },
    'quận 7': { latitude: 10.7345, longitude: 106.7218 },
    'bình thạnh': { latitude: 10.8016, longitude: 106.7114 },
    'tân bình': { latitude: 10.8015, longitude: 106.6534 },
    default: { latitude: 10.7769, longitude: 106.7009 },
  },
  'hà nội': {
    'hoàn kiếm': { latitude: 21.0285, longitude: 105.8542 },
    'hai bà trưng': { latitude: 21.0074, longitude: 105.8524 },
    'cầu giấy': { latitude: 21.0333, longitude: 105.7939 },
    'đống đa': { latitude: 21.0181, longitude: 105.8299 },
    'ba đình': { latitude: 21.0341, longitude: 105.8244 },
    default: { latitude: 21.0285, longitude: 105.8542 },
  },
  'đà nẵng': {
    'hải châu': { latitude: 16.0678, longitude: 108.2208 },
    'thanh khê': { latitude: 16.0623, longitude: 108.1884 },
    default: { latitude: 16.0678, longitude: 108.2208 },
  },
};

export const MAX_EXPRESS_RADIUS_KM = 10; // Quyết định nghiệp vụ DEC-01: Bán kính tối đa 10km cho giao hỏa tốc 2H

@Injectable()
export class AhamoveClient {
  private readonly logger = new Logger(AhamoveClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('AHAMOVE_API_URL') ||
      'https://partner-api.ahamove.com'
    ).replace(/\/+$/, '');
    this.token =
      this.config.get<string>('AHAMOVE_API_KEY') ||
      this.config.get<string>('AHAMOVE_TOKEN') ||
      'TEST_AHAMOVE_TOKEN';
    this.timeoutMs = Number(
      this.config.get<number>('AHAMOVE_CLIENT_TIMEOUT_MS') || 5000,
    );
  }

  /**
   * Tính khoảng cách Haversine có tính hệ số uốn lượn đô thị 1.3 theo DEC-01
   */
  calculateHaversineDistanceKm(from: Coordinates, to: Coordinates): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Bán kính Trái Đất (km)

    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const straightDistance = R * c;
    const roadEstimated = straightDistance * 1.3; // Hệ số uốn lượn đô thị
    return Math.round(roadEstimated * 10) / 10;
  }

  /**
   * Xác định service_id của Ahamove dựa trên thành phố
   */
  resolveServiceId(provinceCity?: string): string {
    const cleanCity = (provinceCity || '').toLowerCase().trim();
    if (cleanCity.includes('hà nội') || cleanCity.includes('ha noi')) {
      return 'HAN-BIKE';
    }
    if (cleanCity.includes('đà nẵng') || cleanCity.includes('da nang')) {
      return 'DAD-BIKE';
    }
    return 'SGN-BIKE'; // Mặc định TP. Hồ Chí Minh
  }

  /**
   * Phân giải tọa độ từ địa chỉ nếu chưa có sẵn lat/long
   */
  resolveCoordinates(
    provinceCity?: string,
    district?: string,
    givenLat?: number,
    givenLng?: number,
  ): Coordinates {
    if (givenLat && givenLng && !isNaN(givenLat) && !isNaN(givenLng)) {
      return { latitude: givenLat, longitude: givenLng };
    }

    const cityKey = (provinceCity || '').toLowerCase().trim();
    const districtKey = (district || '').toLowerCase().trim();

    for (const [knownCity, distMap] of Object.entries(DEFAULT_DISTRICT_COORDS)) {
      if (cityKey.includes(knownCity)) {
        for (const [knownDist, coords] of Object.entries(distMap)) {
          if (districtKey.includes(knownDist)) {
            return coords;
          }
        }
        return distMap.default;
      }
    }

    // Default TP. Hồ Chí Minh Quận 1
    return { latitude: 10.7769, longitude: 106.7009 };
  }

  /**
   * Báo giá cước hỏa tốc 2H qua Ahamove API (POST /v1/order/estimated_fee)
   * Kiểm tra điều kiện bán kính tối đa 10km (DEC-01)
   */
  async calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto> {
    const senderCoords = this.resolveCoordinates(
      req.senderAddress.province,
      req.senderAddress.district,
      req.senderAddress.latitude,
      req.senderAddress.longitude,
    );

    const recipientCoords = this.resolveCoordinates(
      req.recipientAddress.province,
      req.recipientAddress.district,
      req.recipientAddress.latitude,
      req.recipientAddress.longitude,
    );

    // AC2: Kiểm tra bán kính phục vụ tối đa 10km theo DEC-01
    const distanceKm = this.calculateHaversineDistanceKm(
      senderCoords,
      recipientCoords,
    );

    if (distanceKm > MAX_EXPRESS_RADIUS_KM) {
      this.logger.warn({
        event: 'ahamove_express_radius_exceeded',
        distanceKm,
        maxRadius: MAX_EXPRESS_RADIUS_KM,
        sender: req.senderAddress,
        recipient: req.recipientAddress,
      });
      throw new BadRequestException(
        `AHAMOVE_SERVICE_UNAVAILABLE: Khoảng cách giao hàng (${distanceKm} km) vượt quá giới hạn phục vụ tối đa ${MAX_EXPRESS_RADIUS_KM} km của dịch vụ Hỏa tốc 2H. Vui lòng chọn Giao hàng Tiêu chuẩn.`,
      );
    }

    const serviceId = this.resolveServiceId(req.senderAddress.province);

    const payload: AhamoveEstimateFeeRequest = {
      order_time: 0, // Giao ngay tức thời
      service_id: serviceId,
      path: [
        {
          address: req.senderAddress.addressLine || 'Kho GlowUp',
          lat: senderCoords.latitude,
          lng: senderCoords.longitude,
        },
        {
          address: req.recipientAddress.addressLine || 'Địa chỉ khách hàng',
          lat: recipientCoords.latitude,
          lng: recipientCoords.longitude,
        },
      ],
    };

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(
        `${this.baseUrl}/v1/order/estimated_fee?token=${encodeURIComponent(this.token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal,
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(
          `Ahamove estimated fee returned HTTP ${res.status}: ${errorText}`,
        );
        throw new BadRequestException(
          `AHAMOVE_ESTIMATE_FEE_FAILED: Không thể tính cước phí Ahamove (${res.status})`,
        );
      }

      const json = (await res.json()) as AhamoveEstimateFeeResponse;
      const feeAmount = json.total_price || 25000;

      const estimatedDeliveryAt = new Date();
      estimatedDeliveryAt.setHours(estimatedDeliveryAt.getHours() + 2); // Giao trong 2 giờ

      return {
        carrierCode: 'AHAMOVE',
        serviceCode: 'AHAMOVE_EXPRESS_2H',
        feeAmountVnd: feeAmount,
        estimatedDeliveryDays: 0,
        estimatedDeliveryAt,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(
        `Ahamove estimate fee network error: ${err.message}`,
      );
      throw new BadRequestException(
        `AHAMOVE_SERVICE_UNAVAILABLE: Lỗi kết nối đối tác Ahamove (${err.message}). Vui lòng thử lại sau.`,
      );
    }
  }

  /**
   * Tạo booking hỏa tốc trên Ahamove (POST /v1/order/create)
   */
  async createOrder(payload: Record<string, unknown>): Promise<any> {
    const signal = AbortSignal.timeout(10000);
    const res = await fetch(
      `${this.baseUrl}/v1/order/create?token=${encodeURIComponent(this.token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AHAMOVE_CREATE_HTTP_ERROR_${res.status}: ${errText}`);
    }

    return res.json();
  }

  /**
   * Lấy đường dẫn chia sẻ theo dõi trực tiếp vị trí tài xế (GET /v3/orders/{id}/shared-link)
   */
  async getSharedLink(orderId: string): Promise<string | null> {
    try {
      const signal = AbortSignal.timeout(5000);
      const res = await fetch(
        `${this.baseUrl}/v3/orders/${encodeURIComponent(orderId)}/shared-link?token=${encodeURIComponent(this.token)}`,
        {
          method: 'GET',
          signal,
        },
      );

      if (!res.ok) {
        return null;
      }

      const json = (await res.json()) as { shared_link?: string };
      return json.shared_link || null;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch shared link for Ahamove order ${orderId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Hủy chuyến giao hàng trên Ahamove
   */
  async cancelOrder(orderId: string, comment = 'Khách yêu cầu hủy hoặc đổi phương thức'): Promise<boolean> {
    try {
      const signal = AbortSignal.timeout(5000);
      const res = await fetch(
        `${this.baseUrl}/v1/order/cancel?token=${encodeURIComponent(this.token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, comment }),
          signal,
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
