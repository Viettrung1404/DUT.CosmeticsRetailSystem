import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryListItem } from '../../domain/repositories/inventory.repository.interface';
import { nearExpiryThreshold } from '../../application/utils/vn-date.util';

export class InventoryItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() store: { id: string; code: string; name: string };
  @ApiProperty() variant: {
    id: string;
    sku: string;
    barcode: string | null;
    optionLabel: string | null;
    productId: string;
    productName: string;
  };
  @ApiProperty({ description: 'Tồn thực tế' }) quantity: number;
  @ApiProperty({ description: 'Đang giữ chỗ cho đơn online' }) reservedQuantity: number;
  @ApiProperty({ description: 'Khả dụng để bán = thực tế - giữ chỗ' }) availableQuantity: number;
  @ApiProperty() minQuantity: number;
  @ApiProperty({ description: 'Tồn ≤ ngưỡng tối thiểu' }) isLowStock: boolean;
  @ApiPropertyOptional({ description: 'Hạn dùng gần nhất trong các lô còn hàng' })
  nearestExpiryDate: string | null;
  @ApiProperty({ description: 'Có lô còn hạn dưới 3 tháng (BR-04)' }) hasNearExpiry: boolean;
  @ApiProperty() updatedAt: Date;

  static fromDomain(item: InventoryListItem, now: Date = new Date()): InventoryItemResponseDto {
    const dto = new InventoryItemResponseDto();
    dto.id = item.id;
    dto.store = item.store;
    dto.variant = item.variant;
    dto.quantity = item.quantity;
    dto.reservedQuantity = item.reservedQuantity;
    dto.availableQuantity = item.availableQuantity;
    dto.minQuantity = item.minQuantity;
    dto.isLowStock = item.quantity <= item.minQuantity;
    dto.nearestExpiryDate = item.nearestExpiryDate?.toISOString().slice(0, 10) ?? null;
    dto.hasNearExpiry =
      !!item.nearestExpiryDate && item.nearestExpiryDate.getTime() < nearExpiryThreshold(now).getTime();
    dto.updatedAt = item.updatedAt;
    return dto;
  }
}
