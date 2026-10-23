import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PosCustomerInfo, PosVariantView } from '../../domain/entities/pos-lookup.entity';

export class PosVariantResponseDto {
  @ApiProperty() variantId: string;
  @ApiProperty() productId: string;
  @ApiProperty() productName: string;
  @ApiPropertyOptional() variantName: string | null;
  @ApiProperty() sku: string;
  @ApiPropertyOptional() barcode: string | null;
  @ApiProperty() price: number;
  @ApiProperty({ description: 'Tồn - đang giữ chỗ - lô đã hết hạn' }) sellableQuantity: number;
  @ApiProperty({ description: 'Có lô còn hạn dưới 3 tháng (cận date)' }) hasNearExpiryBatch: boolean;
  @ApiProperty({ description: 'false nếu biến thể hoặc sản phẩm đã ngừng bán' }) isSellable: boolean;
  @ApiPropertyOptional() unavailableReason: string | null;

  static fromDomain(view: PosVariantView): PosVariantResponseDto {
    const dto = new PosVariantResponseDto();
    dto.variantId = view.variantId;
    dto.productId = view.productId;
    dto.productName = view.productName;
    dto.variantName = view.variantName;
    dto.sku = view.sku;
    dto.barcode = view.barcode;
    dto.price = view.price;
    dto.sellableQuantity = view.sellableQuantity;
    dto.hasNearExpiryBatch = view.hasNearExpiry;
    dto.isSellable = view.isActive && view.productActive;
    dto.unavailableReason = !view.productActive
      ? 'Sản phẩm đã ngừng bán'
      : !view.isActive
        ? 'Biến thể này đã ngừng bán'
        : null;
    return dto;
  }
}

export class PosCustomerResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() fullName: string | null;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty({ description: 'Khách đã có tài khoản website/app' }) hasAccount: boolean;
  @ApiProperty() totalPoints: number;
  @ApiPropertyOptional() tier: PosCustomerInfo['tier'];

  static fromDomain(info: PosCustomerInfo): PosCustomerResponseDto {
    const dto = new PosCustomerResponseDto();
    dto.id = info.id;
    dto.fullName = info.fullName;
    dto.phone = info.phone;
    dto.hasAccount = info.hasAccount;
    dto.totalPoints = info.totalPoints;
    dto.tier = info.tier;
    return dto;
  }
}
