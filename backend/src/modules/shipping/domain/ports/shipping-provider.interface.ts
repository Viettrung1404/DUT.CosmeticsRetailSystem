import {
  QuoteRequestDto,
  QuoteResponseDto,
  CreateShipmentDto,
  ShipmentResultDto,
  ParsedWebhookDto,
} from '../dtos/shipping-provider.dto';

export const SHIPPING_PROVIDER = Symbol('SHIPPING_PROVIDER');
export const SHIPPING_PROVIDERS = Symbol('SHIPPING_PROVIDERS');

/**
 * Interface chuẩn hóa hướng đối tác vận chuyển (3PL Shipping Provider Abstraction).
 * Đảm bảo khả năng cắm thêm adapter GHN, Ahamove, ViettelPost, v.v. mà không sửa core logic.
 */
export interface IShippingProvider {
  readonly carrierCode: string;

  /**
   * Tính toán cước phí và thời gian giao hàng dự kiến
   */
  calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto>;

  /**
   * Tạo vận đơn sang hãng vận chuyển 3PL
   */
  createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto>;

  /**
   * Hủy vận đơn trên hệ thống hãng
   */
  cancelShipment(trackingCode: string): Promise<boolean>;

  /**
   * Phân tích và chuẩn hóa payload Webhook từ đối tác
   */
  parseWebhook(rawBody: unknown, headers: Record<string, string | string[] | undefined>): ParsedWebhookDto;
}
