import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CARRIER_GATEWAYS, CarrierGateway } from '../../domain/ports/carrier-gateway.port';

// Thêm hãng mới chỉ cần viết adapter rồi đăng ký vào CARRIER_GATEWAYS ở shipments.module.ts
@Injectable()
export class CarrierRegistry {
  private readonly byCode = new Map<string, CarrierGateway>();

  constructor(@Inject(CARRIER_GATEWAYS) gateways: CarrierGateway[]) {
    for (const g of gateways) this.byCode.set(g.carrierCode, g);
  }

  codes(): string[] {
    return [...this.byCode.keys()];
  }

  // Dùng cho API admin: mã hãng do người gọi gửi lên nên sai là lỗi 400
  require(carrierCode: string): CarrierGateway {
    const g = this.byCode.get(carrierCode);
    if (!g) throw new BadRequestException('Đơn vị vận chuyển không được hỗ trợ');
    return g;
  }

  // Dùng cho webhook: mã hãng nằm trên đường dẫn công khai nên không lộ danh sách hãng
  requireForWebhook(carrierCode: string): CarrierGateway {
    const g = this.byCode.get(carrierCode);
    if (!g) throw new NotFoundException('Không tìm thấy đơn vị vận chuyển');
    return g;
  }
}
