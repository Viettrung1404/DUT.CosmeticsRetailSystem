import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  provider: 'OPENROUTESERVICE' | 'GOOGLE_MAPS' | 'HAVERSINE_FALLBACK';
  isFallback: boolean;
  durationMinutes?: number;
}

export interface AddressQuery {
  provinceCity?: string;
  district?: string;
  ward?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
}

// Bảng tọa độ tham chiếu mặc định cho các quận/huyện tại các thành phố trọng điểm của GlowUp
const KNOWN_COORDINATES: Record<string, Record<string, Coordinates>> = {
  'tp. hồ chí minh': {
    'quận 1': { latitude: 10.7769, longitude: 106.7009 },
    'quận 3': { latitude: 10.7844, longitude: 106.6844 },
    'quận 5': { latitude: 10.7554, longitude: 106.6675 },
    'quận 10': { latitude: 10.7746, longitude: 106.6669 },
    'quận tân bình': { latitude: 10.8015, longitude: 106.6534 },
    'tân bình': { latitude: 10.8015, longitude: 106.6534 },
    'quận tân phú': { latitude: 10.7916, longitude: 106.6284 },
    'tân phú': { latitude: 10.7916, longitude: 106.6284 },
    'quận bình thạnh': { latitude: 10.8016, longitude: 106.7114 },
    'bình thạnh': { latitude: 10.8016, longitude: 106.7114 },
    'thành phố thủ đức': { latitude: 10.8504, longitude: 106.7533 },
    'thủ đức': { latitude: 10.8504, longitude: 106.7533 },
    'quận gò vấp': { latitude: 10.8387, longitude: 106.6653 },
    'gò vấp': { latitude: 10.8387, longitude: 106.6653 },
    'quận 7': { latitude: 10.7345, longitude: 106.7218 },
    'quận 12': { latitude: 10.8672, longitude: 106.6412 },
    default: { latitude: 10.7769, longitude: 106.7009 },
  },
  'hà nội': {
    'quận hai bà trưng': { latitude: 21.0074, longitude: 105.8524 },
    'hai bà trưng': { latitude: 21.0074, longitude: 105.8524 },
    'quận cầu giấy': { latitude: 21.0333, longitude: 105.7939 },
    'cầu giấy': { latitude: 21.0333, longitude: 105.7939 },
    'quận hoàn kiếm': { latitude: 21.0285, longitude: 105.8542 },
    'hoàn kiếm': { latitude: 21.0285, longitude: 105.8542 },
    'quận đống đa': { latitude: 21.0181, longitude: 105.8299 },
    'đống đa': { latitude: 21.0181, longitude: 105.8299 },
    'quận ba đình': { latitude: 21.0341, longitude: 105.8244 },
    'ba đình': { latitude: 21.0341, longitude: 105.8244 },
    'huyện mê linh': { latitude: 21.1926, longitude: 105.7513 },
    'mê linh': { latitude: 21.1926, longitude: 105.7513 },
    'quận hà đông': { latitude: 20.9723, longitude: 105.7767 },
    'hà đông': { latitude: 20.9723, longitude: 105.7767 },
    default: { latitude: 21.0285, longitude: 105.8542 },
  },
  'đà nẵng': {
    'quận hải châu': { latitude: 16.0678, longitude: 108.2208 },
    'hải châu': { latitude: 16.0678, longitude: 108.2208 },
    'quận thanh khê': { latitude: 16.0623, longitude: 108.1884 },
    'quận sơn trà': { latitude: 16.0827, longitude: 108.2435 },
    default: { latitude: 16.0678, longitude: 108.2208 },
  },
};

@Injectable()
export class DistanceCalculatorService {
  private readonly logger = new Logger(DistanceCalculatorService.name);
  public static readonly URBAN_WINDING_FACTOR = 1.3; // Hệ số uốn lượn đô thị theo quyết định DEC-01

  constructor(private readonly config: ConfigService) {}

  /**
   * Tính khoảng cách đường bộ thực tế giữa 2 tọa độ.
   * Ưu tiên tích hợp OpenRouteService / Google Distance Matrix.
   * Khi lỗi mạng hoặc không có API key, tự động chuyển về fallback Haversine x 1.3 theo DEC-01.
   */
  async calculateDistance(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<DistanceCalculationResult> {
    const orsKey = this.config.get<string>('OPENROUTESERVICE_API_KEY');
    const googleKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');

    if (orsKey) {
      try {
        const result = await this.queryOpenRouteService(
          origin,
          destination,
          orsKey,
        );
        if (result) return result;
      } catch (err: any) {
        this.logger.warn(
          `OpenRouteService failed: ${err.message}. Falling back to Haversine * 1.3`,
        );
      }
    }

    if (googleKey) {
      try {
        const result = await this.queryGoogleDistanceMatrix(
          origin,
          destination,
          googleKey,
        );
        if (result) return result;
      } catch (err: any) {
        this.logger.warn(
          `Google Distance Matrix failed: ${err.message}. Falling back to Haversine * 1.3`,
        );
      }
    }

    // Cơ chế dự phòng theo DEC-01
    const distanceKm = this.calculateHaversineWithWindingFactor(
      origin,
      destination,
      DistanceCalculatorService.URBAN_WINDING_FACTOR,
    );

    // Ước lượng thời gian di chuyển với vận tốc trung bình 30 km/h trong nội đô
    const durationMinutes = Math.round((distanceKm / 30) * 60);

    return {
      distanceKm,
      provider: 'HAVERSINE_FALLBACK',
      isFallback: true,
      durationMinutes,
    };
  }

  /**
   * Tính khoảng cách đường thẳng theo công thức Haversine
   */
  calculateStraightHaversine(
    origin: Coordinates,
    destination: Coordinates,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Bán kính trái đất (km)

    const dLat = toRad(destination.latitude - origin.latitude);
    const dLon = toRad(destination.longitude - origin.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(origin.latitude)) *
        Math.cos(toRad(destination.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Tính khoảng cách đường bộ ước tính bằng Haversine x Urban Winding Factor
   */
  calculateHaversineWithWindingFactor(
    origin: Coordinates,
    destination: Coordinates,
    windingFactor: number = DistanceCalculatorService.URBAN_WINDING_FACTOR,
  ): number {
    const straight = this.calculateStraightHaversine(origin, destination);
    return Math.round(straight * windingFactor * 100) / 100;
  }

  /**
   * Trích xuất tọa độ từ thông tin địa chỉ (ưu tiên tọa độ có sẵn, fallback lookup theo bảng địa lý)
   */
  resolveCoordinates(address: AddressQuery): Coordinates | null {
    if (
      typeof address.latitude === 'number' &&
      typeof address.longitude === 'number' &&
      !isNaN(address.latitude) &&
      !isNaN(address.longitude)
    ) {
      return { latitude: address.latitude, longitude: address.longitude };
    }

    const cityNorm = (address.provinceCity || '').trim().toLowerCase();
    const districtNorm = (address.district || '').trim().toLowerCase();

    const cleanStr = (s: string) =>
      s
        .toLowerCase()
        .replace(/^(tỉnh|thành phố|tp\.|quận|huyện|thị xã|tx\.)\s+/i, '')
        .trim();

    const cleanCity = cleanStr(cityNorm);
    const cleanDist = cleanStr(districtNorm);

    // Tìm kiếm trong bảng địa danh
    for (const [cityKey, districts] of Object.entries(KNOWN_COORDINATES)) {
      if (
        cleanStr(cityKey) === cleanCity ||
        cityNorm.includes(cityKey) ||
        cityKey.includes(cityNorm)
      ) {
        // 1. Khớp chính xác tên quận/huyện
        for (const [distKey, coords] of Object.entries(districts)) {
          if (distKey === 'default') continue;
          if (cleanStr(distKey) === cleanDist || distKey === districtNorm) {
            return coords;
          }
        }

        // 2. Khớp chuỗi theo thứ tự từ dài đến ngắn để tránh nhầm lẫn 'quận 1' với 'quận 10', 'quận 12'
        const sortedEntries = Object.entries(districts)
          .filter(([k]) => k !== 'default')
          .sort((a, b) => b[0].length - a[0].length);

        for (const [distKey, coords] of sortedEntries) {
          if (districtNorm.includes(distKey) || distKey.includes(districtNorm)) {
            return coords;
          }
        }
        return districts.default || null;
      }
    }

    return null;
  }

  private async queryOpenRouteService(
    origin: Coordinates,
    destination: Coordinates,
    apiKey: string,
  ): Promise<DistanceCalculationResult | null> {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const segment = data?.routes?.[0]?.summary;
      if (segment && typeof segment.distance === 'number') {
        const distanceKm = Math.round((segment.distance / 1000) * 100) / 100;
        const durationMinutes = Math.round((segment.duration || 0) / 60);
        return {
          distanceKm,
          provider: 'OPENROUTESERVICE',
          isFallback: false,
          durationMinutes,
        };
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async queryGoogleDistanceMatrix(
    origin: Coordinates,
    destination: Coordinates,
    apiKey: string,
  ): Promise<DistanceCalculationResult | null> {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      const element = data?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK' && element?.distance?.value) {
        const distanceKm = Math.round((element.distance.value / 1000) * 100) / 100;
        const durationMinutes = Math.round((element.duration?.value || 0) / 60);
        return {
          distanceKm,
          provider: 'GOOGLE_MAPS',
          isFallback: false,
          durationMinutes,
        };
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
