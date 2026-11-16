import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstashRedisService } from '@core/cache/upstash-redis.service';
import { getCorrelationId } from '@core/logger/correlation-context';
import {
  QuoteRequestDto,
  QuoteResponseDto,
} from '../../../domain/dtos/shipping-provider.dto';

export interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
}

export interface GHNWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

export interface GHNFeeCalculationRequest {
  from_district_id?: number;
  service_id?: number;
  service_type_id?: number;
  to_district_id: number;
  to_ward_code: string;
  height: number;
  length: number;
  width: number;
  weight: number;
  insurance_value?: number;
  coupon?: string | null;
}

export interface GHNFeeCalculationResponse {
  code: number;
  message: string;
  data?: {
    total: number;
    service_fee: number;
    insurance_fee?: number;
    pick_station_fee?: number;
    coupon_value?: number;
    r2s_fee?: number;
    document_return?: number;
    double_check?: number;
  };
}

/**
 * Bảng giá cước tĩnh dự phòng khi GHN API Timeout hoặc gián đoạn mạng
 */
export const GHN_FALLBACK_RATES = {
  SAME_PROVINCE_VND: 22000,
  INTER_PROVINCE_VND: 35000,
  DEFAULT_VND: 30000,
};

@Injectable()
export class GHNClient {
  private readonly logger = new Logger(GHNClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly shopId: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly redisService?: UpstashRedisService,
  ) {
    this.baseUrl = (
      this.config.get<string>('GHN_API_URL') ||
      'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/+$/, '');
    this.token =
      this.config.get<string>('GHN_API_TOKEN') ||
      this.config.get<string>('GHN_TOKEN') ||
      'TEST_GHN_TOKEN';
    this.shopId = String(
      this.config.get<string | number>('GHN_SHOP_ID') || '123456',
    );
    this.timeoutMs = Number(
      this.config.get<number>('GHN_CLIENT_TIMEOUT_MS') || 5000,
    );
  }

  private getHeaders(): Record<string, string> {
    const correlationId = getCorrelationId();
    return {
      'Content-Type': 'application/json',
      Token: this.token,
      ShopId: this.shopId,
      ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
    };
  }

  /**
   * Tra cứu danh sách Tỉnh/Thành phố từ GHN (Có Cache Redis 24h)
   */
  async getProvinces(): Promise<GHNProvince[]> {
    const cacheKey = 'ghn:address:provinces';
    if (this.redisService) {
      const cached = await this.redisService.get<GHNProvince[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/master-data/province`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal,
      });

      if (!res.ok) {
        throw new Error(`GHN_PROVINCE_HTTP_ERROR_${res.status}`);
      }

      const json = (await res.json()) as { code: number; data: GHNProvince[] };
      const provinces = json.data || [];

      if (this.redisService && provinces.length > 0) {
        await this.redisService.set(cacheKey, provinces, 86400000); // 24h
      }

      return provinces;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch GHN provinces: ${err.message}`);
      return [];
    }
  }

  /**
   * Tra cứu danh sách Quận/Huyện theo ProvinceID từ GHN (Có Cache Redis 24h)
   */
  async getDistricts(provinceId: number): Promise<GHNDistrict[]> {
    const cacheKey = `ghn:address:districts:${provinceId}`;
    if (this.redisService) {
      const cached = await this.redisService.get<GHNDistrict[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/master-data/district`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ province_id: provinceId }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`GHN_DISTRICT_HTTP_ERROR_${res.status}`);
      }

      const json = (await res.json()) as { code: number; data: GHNDistrict[] };
      const districts = json.data || [];

      if (this.redisService && districts.length > 0) {
        await this.redisService.set(cacheKey, districts, 86400000); // 24h
      }

      return districts;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch GHN districts for province ${provinceId}: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Tra cứu danh sách Phường/Xã theo DistrictID từ GHN (Có Cache Redis 24h)
   */
  async getWards(districtId: number): Promise<GHNWard[]> {
    const cacheKey = `ghn:address:wards:${districtId}`;
    if (this.redisService) {
      const cached = await this.redisService.get<GHNWard[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(
        `${this.baseUrl}/master-data/ward?district_id=${districtId}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal,
        },
      );

      if (!res.ok) {
        throw new Error(`GHN_WARD_HTTP_ERROR_${res.status}`);
      }

      const json = (await res.json()) as { code: number; data: GHNWard[] };
      const wards = json.data || [];

      if (this.redisService && wards.length > 0) {
        await this.redisService.set(cacheKey, wards, 86400000); // 24h
      }

      return wards;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch GHN wards for district ${districtId}: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Tiện ích chuẩn hóa & tìm DistrictID theo tên
   */
  async resolveDistrictId(
    provinceName: string,
    districtName: string,
  ): Promise<number | null> {
    const rawNumber = Number(districtName);
    if (!isNaN(rawNumber) && rawNumber > 0) {
      return rawNumber;
    }

    const provinces = await this.getProvinces();
    const cleanProvince = provinceName.toLowerCase().trim();
    const matchedProvince = provinces.find((p) =>
      p.ProvinceName.toLowerCase().includes(cleanProvince),
    );

    if (!matchedProvince) return null;

    const districts = await this.getDistricts(matchedProvince.ProvinceID);
    const cleanDistrict = districtName.toLowerCase().trim();
    const matchedDistrict = districts.find(
      (d) =>
        d.DistrictName.toLowerCase().includes(cleanDistrict) ||
        cleanDistrict.includes(d.DistrictName.toLowerCase()),
    );

    return matchedDistrict ? matchedDistrict.DistrictID : null;
  }

  /**
   * Tiện ích chuẩn hóa & tìm WardCode theo tên
   */
  async resolveWardCode(
    districtId: number,
    wardName: string,
  ): Promise<string | null> {
    if (/^\d+$/.test(wardName.trim())) {
      return wardName.trim();
    }

    const wards = await this.getWards(districtId);
    const cleanWard = wardName.toLowerCase().trim();
    const matchedWard = wards.find(
      (w) =>
        w.WardName.toLowerCase().includes(cleanWard) ||
        cleanWard.includes(w.WardName.toLowerCase()),
    );

    return matchedWard ? matchedWard.WardCode : null;
  }

  /**
   * Tính cước phí giao hàng qua GHN v2 (POST /shipping-order/fee)
   * Có cơ chế Timeout 5s và fallback cước tĩnh dự phòng (AC2)
   */
  async calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto> {
    const isSameProvince =
      req.senderAddress.province &&
      req.recipientAddress.province &&
      req.senderAddress.province.toLowerCase().trim() ===
        req.recipientAddress.province.toLowerCase().trim();

    const fallbackFee = isSameProvince
      ? GHN_FALLBACK_RATES.SAME_PROVINCE_VND
      : GHN_FALLBACK_RATES.INTER_PROVINCE_VND;

    // Resolve District & Ward IDs
    let toDistrictId: number | null = Number(req.recipientAddress.district);
    if (isNaN(toDistrictId) || toDistrictId <= 0) {
      toDistrictId = await this.resolveDistrictId(
        req.recipientAddress.province,
        req.recipientAddress.district,
      );
    }

    let toWardCode: string | null = req.recipientAddress.ward
      ? String(req.recipientAddress.ward)
      : null;
    if (toDistrictId && toWardCode && !/^\d+$/.test(toWardCode)) {
      toWardCode = await this.resolveWardCode(toDistrictId, toWardCode);
    }

    // Nếu không resolve được quận/huyện tối thiểu -> dùng fallback
    if (!toDistrictId) {
      this.logger.warn(
        `Cannot resolve toDistrictId for recipient: ${req.recipientAddress.district}, using fallback quote`,
      );
      return this.createFallbackQuote(fallbackFee, 'UNRESOLVED_ADDRESS');
    }

    const fromDistrictId = Number(req.senderAddress.district) || 1444; // Default Central WH Q10 HCM (1444)

    const payload: GHNFeeCalculationRequest = {
      service_type_id: 2, // Standard E-commerce
      from_district_id: fromDistrictId,
      to_district_id: toDistrictId,
      to_ward_code: toWardCode || '20314',
      weight: Math.max(Math.round(req.parcel.weightGrams), 50),
      length: Math.max(Math.round(req.parcel.lengthCm), 5),
      width: Math.max(Math.round(req.parcel.widthCm), 5),
      height: Math.max(Math.round(req.parcel.heightCm), 5),
      insurance_value: req.insuranceValueVnd || 0,
      coupon: null,
    };

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/shipping-order/fee`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        throw new Error(`GHN_FEE_HTTP_ERROR_${res.status}`);
      }

      const json = (await res.json()) as GHNFeeCalculationResponse;

      if (json.code !== 200 || !json.data) {
        throw new Error(json.message || 'GHN_FEE_API_ERROR');
      }

      const totalFee = json.data.total;
      const estimatedDays = isSameProvince ? 2 : 4;
      const estimatedDeliveryAt = new Date();
      estimatedDeliveryAt.setDate(
        estimatedDeliveryAt.getDate() + estimatedDays,
      );

      return {
        carrierCode: 'GHN',
        serviceCode: 'GHN_STANDARD',
        feeAmountVnd: totalFee,
        estimatedDeliveryDays: estimatedDays,
        estimatedDeliveryAt,
      };
    } catch (err: any) {
      const isTimeout =
        err.name === 'TimeoutError' ||
        err.message?.includes('timeout') ||
        err.message?.includes('aborted');

      this.logger.warn(
        `GHN fee calculation failed (${isTimeout ? 'TIMEOUT 5s' : err.message}). Fallback to static pricing (${fallbackFee} VND).`,
      );

      return this.createFallbackQuote(
        fallbackFee,
        isTimeout ? 'TIMEOUT_FALLBACK' : 'ERROR_FALLBACK',
      );
    }
  }

  private createFallbackQuote(
    feeAmountVnd: number,
    _reason: string,
  ): QuoteResponseDto {
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 3);

    return {
      carrierCode: 'GHN',
      serviceCode: 'GHN_STANDARD',
      feeAmountVnd,
      estimatedDeliveryDays: 3,
      estimatedDeliveryAt,
    };
  }

  /**
   * Gọi API tạo đơn sang GHN (dùng cho GHNProvider ở EP06-T02)
   */
  async createShippingOrder(payload: Record<string, unknown>): Promise<any> {
    const signal = AbortSignal.timeout(15000); // 15s cho tạo đơn
    const res = await fetch(`${this.baseUrl}/shipping-order/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GHN_CREATE_HTTP_ERROR_${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(json.message || 'GHN_CREATE_API_ERROR');
    }

    return json.data;
  }

  /**
   * Lấy token in nhãn A6 nhiệt từ GHN (dùng cho GHNProvider ở EP06-T02)
   */
  async generateA6PrintToken(orderCodes: string[]): Promise<string> {
    const signal = AbortSignal.timeout(10000);
    const res = await fetch(`${this.baseUrl}/a5/gen-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ order_codes: orderCodes }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`GHN_GEN_TOKEN_HTTP_ERROR_${res.status}`);
    }

    const json = await res.json();
    if (json.code !== 200 || !json.data?.token) {
      throw new Error(json.message || 'GHN_GEN_TOKEN_FAILED');
    }

    return json.data.token;
  }

  /**
   * Hủy vận đơn trên GHN
   */
  async cancelOrder(orderCodes: string[]): Promise<boolean> {
    const signal = AbortSignal.timeout(10000);
    const res = await fetch(`${this.baseUrl}/switch-status/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ order_codes: orderCodes }),
      signal,
    });

    if (!res.ok) {
      return false;
    }

    const json = await res.json();
    return json.code === 200;
  }
}
