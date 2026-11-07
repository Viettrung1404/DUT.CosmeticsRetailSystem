import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ description: 'ID của cart item' })
  id: string;

  @ApiProperty({ description: 'ID của biến thể sản phẩm' })
  productVariantId: string;

  @ApiProperty({ description: 'Số lượng mua' })
  quantity: number;

  @ApiProperty({ description: 'Đơn giá lúc thêm vào giỏ (Snapshot)' })
  unitPrice: number;

  @ApiProperty({ description: 'Đơn giá hiện hành của biến thể' })
  currentPrice: number;

  @ApiProperty({ description: 'Tổng tiền (currentPrice * quantity)' })
  totalPrice: number;

  @ApiProperty({ description: 'Cảnh báo giá đã thay đổi so với lúc thêm vào giỏ' })
  priceChanged: boolean;

  @ApiProperty({ description: 'Sản phẩm có được tick chọn để mua không (Partial Checkout)' })
  isSelected: boolean;

  @ApiProperty({ description: 'Cảnh báo số lượng trong giỏ vượt quá tồn kho khả dụng hiện tại' })
  isQuantityExceeded: boolean;

  @ApiPropertyOptional({ description: 'Tên sản phẩm' })
  productName?: string;

  @ApiPropertyOptional({ description: 'Tên biến thể (màu, dung tích)' })
  variantName?: string;

  @ApiPropertyOptional({ description: 'Mã SKU' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện biến thể/sản phẩm' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Tồn kho khả dụng hiện tại' })
  availableStock?: number;

  @ApiProperty({ description: 'Trạng thái sản phẩm còn kinh doanh hay không' })
  isAvailable: boolean;
}

export class CartResponseDto {
  @ApiProperty({ description: 'ID của giỏ hàng' })
  id: string;

  @ApiPropertyOptional({ description: 'ID của customer (null nếu khách vãng lai)' })
  customerId: string | null;

  @ApiPropertyOptional({ description: 'Session ID của khách vãng lai' })
  sessionId: string | null;

  @ApiPropertyOptional({ description: 'ID chi nhánh cửa hàng liên kết' })
  storeId: string | null;

  @ApiProperty({ type: [CartItemResponseDto], description: 'Danh sách sản phẩm khả dụng trong giỏ' })
  items: CartItemResponseDto[];

  @ApiProperty({ type: [CartItemResponseDto], description: 'Danh sách sản phẩm hết hàng hoặc ngừng kinh doanh' })
  unavailableItems: CartItemResponseDto[];

  @ApiProperty({ description: 'Tổng số lượng sản phẩm trong giỏ' })
  totalQuantity: number;

  @ApiProperty({ description: 'Tổng tiền toàn bộ sản phẩm khả dụng' })
  subtotal: number;

  @ApiProperty({ description: 'Tổng số lượng các sản phẩm được chọn để thanh toán' })
  selectedQuantity: number;

  @ApiProperty({ description: 'Tổng tiền các sản phẩm được chọn để thanh toán (Partial Checkout)' })
  selectedSubtotal: number;

  @ApiProperty({ description: 'Có sản phẩm nào bị thay đổi giá hay không' })
  hasPriceChanges: boolean;
}
