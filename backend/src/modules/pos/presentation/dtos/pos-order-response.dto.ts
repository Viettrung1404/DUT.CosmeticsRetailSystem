import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PosOrderResult,
  PosPreviewResult,
  PosPricedLine,
  PosPricing,
  PosReceipt,
  PosSaleCustomerSummary,
  PosStockShortage,
} from '../../domain/entities/pos-sale.entity';

export class PosPricedLineResponseDto {
  @ApiProperty() variantId: string;
  @ApiProperty() productName: string;
  @ApiPropertyOptional() variantName: string | null;
  @ApiProperty() sku: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty({ description: 'Đơn giá x số lượng, trước mọi giảm giá' }) gross: number;
  @ApiPropertyOptional({ description: 'Chương trình khuyến mãi tự động đã áp' }) promotionName: string | null;
  @ApiProperty() promotionDiscount: number;
  @ApiProperty({ description: 'Phần voucher chia cho dòng này' }) couponDiscount: number;
  @ApiProperty({ description: 'Phần điểm chia cho dòng này' }) pointsDiscount: number;
  @ApiProperty({ description: 'gross - khuyến mãi - voucher (chưa trừ điểm)' }) lineTotal: number;

  static fromDomain(line: PosPricedLine): PosPricedLineResponseDto {
    const dto = new PosPricedLineResponseDto();
    dto.variantId = line.variantId;
    dto.productName = line.productName;
    dto.variantName = line.variantName;
    dto.sku = line.sku;
    dto.quantity = line.quantity;
    dto.unitPrice = line.unitPrice;
    dto.gross = line.gross;
    dto.promotionName = line.promotionName;
    dto.promotionDiscount = line.promotionDiscount;
    dto.couponDiscount = line.couponDiscount;
    dto.pointsDiscount = line.pointsDiscount;
    dto.lineTotal = line.lineTotal;
    return dto;
  }
}

export class PosPricingResponseDto {
  @ApiProperty({ type: [PosPricedLineResponseDto] }) lines: PosPricedLineResponseDto[];
  @ApiProperty({ description: 'Tạm tính, trước giảm giá' }) subtotal: number;
  @ApiProperty() promotionDiscount: number;
  @ApiProperty() couponDiscount: number;
  @ApiProperty() pointsDiscount: number;
  @ApiProperty({ description: 'Số điểm sẽ trừ' }) pointsUsed: number;
  @ApiProperty({ description: 'Số tiền khách phải trả' }) total: number;

  static fromDomain(pricing: PosPricing): PosPricingResponseDto {
    const dto = new PosPricingResponseDto();
    dto.lines = pricing.lines.map(PosPricedLineResponseDto.fromDomain);
    dto.subtotal = pricing.subtotal;
    dto.promotionDiscount = pricing.promotionDiscount;
    dto.couponDiscount = pricing.couponDiscount;
    dto.pointsDiscount = pricing.pointsDiscount;
    dto.pointsUsed = pricing.pointsUsed;
    dto.total = pricing.total;
    return dto;
  }
}

export class PosPreviewResponseDto extends PosPricingResponseDto {
  @ApiProperty({ description: 'Dòng thiếu hàng bán được; rỗng là đủ hàng' })
  shortages: PosStockShortage[];
  @ApiProperty() canCheckout: boolean;
  @ApiPropertyOptional() customer: PosSaleCustomerSummary | null;

  static fromPreview(result: PosPreviewResult): PosPreviewResponseDto {
    const dto = Object.assign(new PosPreviewResponseDto(), PosPricingResponseDto.fromDomain(result.pricing));
    dto.shortages = result.shortages;
    dto.canCheckout = result.shortages.length === 0;
    dto.customer = result.customer;
    return dto;
  }
}

export class PosOrderCreatedResponseDto extends PosPricingResponseDto {
  @ApiProperty() orderId: string;
  @ApiProperty({ example: 'POS202610230001' }) orderNumber: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ description: 'Tổng khách đưa (cộng các phương thức)' }) totalReceived: number;
  @ApiProperty({ description: 'Tiền thừa phải thối lại khách (chỉ từ tiền mặt)' }) change: number;
  @ApiProperty() payments: Array<{ method: string; amount: number; tenderedAmount: number | null }>;
  @ApiProperty() pointsEarned: number;
  @ApiPropertyOptional() pointsNote: string | null;
  @ApiPropertyOptional() customer: PosSaleCustomerSummary | null;
  @ApiPropertyOptional({ description: 'Hạng của khách sau đơn' }) tierName: string | null;
  @ApiProperty() tierChanged: boolean;
  @ApiProperty({ description: 'Hoa hồng của nhân viên bán (0 nếu không có hồ sơ nhân viên)' }) commissionAmount: number;

  static fromResult(result: PosOrderResult): PosOrderCreatedResponseDto {
    const dto = Object.assign(new PosOrderCreatedResponseDto(), PosPricingResponseDto.fromDomain(result.pricing));
    dto.orderId = result.sale.orderId;
    dto.orderNumber = result.sale.orderNumber;
    dto.createdAt = result.sale.createdAt;
    dto.totalReceived = result.settlement.totalReceived;
    dto.change = result.settlement.change;
    dto.payments = result.settlement.payments;
    dto.pointsEarned = result.sale.pointsEarned;
    dto.pointsNote = result.sale.pointsNote;
    dto.customer = result.customer;
    dto.tierName = result.sale.tierName;
    dto.tierChanged = result.sale.tierChanged;
    dto.commissionAmount = result.sale.commissionAmount;
    return dto;
  }
}

export class PosReceiptResponseDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() store: { code: string; name: string };
  @ApiPropertyOptional() sessionCode: string | null;
  @ApiPropertyOptional() cashierName: string | null;
  @ApiPropertyOptional() customer: { id: string; fullName: string | null; phone: string | null } | null;
  @ApiProperty() items: PosReceipt['items'];
  @ApiProperty() subtotal: number;
  @ApiProperty() promotionDiscount: number;
  @ApiProperty() couponDiscount: number;
  @ApiPropertyOptional() couponCode: string | null;
  @ApiProperty() pointsUsed: number;
  @ApiProperty() pointsDiscount: number;
  @ApiProperty() total: number;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() payments: PosReceipt['payments'];
  @ApiProperty({ description: 'Tổng khách đưa' }) totalReceived: number;
  @ApiProperty({ description: 'Tiền thừa đã thối lại' }) change: number;

  static fromDomain(receipt: PosReceipt): PosReceiptResponseDto {
    const dto = new PosReceiptResponseDto();
    dto.orderId = receipt.orderId;
    dto.orderNumber = receipt.orderNumber;
    dto.status = receipt.status;
    dto.createdAt = receipt.createdAt;
    dto.store = receipt.store;
    dto.sessionCode = receipt.session?.code ?? null;
    dto.cashierName = receipt.cashierName;
    dto.customer = receipt.customer;
    dto.items = receipt.items;
    dto.subtotal = receipt.subtotal;
    dto.promotionDiscount = receipt.promotionDiscount;
    dto.couponDiscount = receipt.couponDiscount;
    dto.couponCode = receipt.couponCode;
    dto.pointsUsed = receipt.pointsUsed;
    dto.pointsDiscount = receipt.pointsDiscount;
    dto.total = receipt.total;
    dto.pointsEarned = receipt.pointsEarned;
    dto.payments = receipt.payments;
    dto.totalReceived = receipt.payments.reduce((s, p) => s + (p.tenderedAmount ?? p.amount), 0);
    dto.change = dto.totalReceived - receipt.payments.reduce((s, p) => s + p.amount, 0);
    return dto;
  }
}
