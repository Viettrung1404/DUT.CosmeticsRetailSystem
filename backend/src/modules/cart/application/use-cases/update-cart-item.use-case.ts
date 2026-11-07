import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';

export interface UpdateCartItemInput {
  cartItemId: string;
  quantity?: number;
  isSelected?: boolean;
  customerId?: string;
  sessionId?: string;
}

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: UpdateCartItemInput): Promise<void> {
    if (input.quantity === undefined && input.isSelected === undefined) {
      throw new BadRequestException('Phải cung cấp số lượng (quantity) hoặc trạng thái chọn (isSelected)');
    }

    const item = await this.cartRepository.findCartItemById(input.cartItemId);
    if (!item) {
      throw new NotFoundException('Sản phẩm trong giỏ hàng không tồn tại');
    }

    const cart = await this.cartRepository.findCartById(item.cartId);
    if (!cart) {
      throw new NotFoundException('Giỏ hàng không tồn tại');
    }

    // Ownership check
    if (input.customerId && cart.customerId !== input.customerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa giỏ hàng này');
    }
    if (input.sessionId && !input.customerId && cart.sessionId !== input.sessionId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa giỏ hàng này');
    }

    // Update quantity with Rich Domain Model validation
    if (input.quantity !== undefined) {
      const variantInfo = await this.cartRepository.getVariantStockAndPrice(
        item.productVariantId,
        cart.storeId || undefined,
      );

      if (!variantInfo || !variantInfo.isActive) {
        throw new BadRequestException('Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
      }

      try {
        item.updateQuantity(input.quantity, variantInfo.availableStock);
      } catch (err: any) {
        throw new BadRequestException(err.message);
      }

      await this.cartRepository.updateItem(item.id, {
        quantity: input.quantity,
        isSelected: input.isSelected,
      });

      // Synchronize price upon user modification
      if (item.unitPrice !== variantInfo.price) {
        await this.cartRepository.updateItemPrice(item.id, variantInfo.price);
      }
    } else if (input.isSelected !== undefined) {
      // Toggle selection only
      item.toggleSelected(input.isSelected);
      await this.cartRepository.updateItemSelection(item.id, input.isSelected);
    }
  }
}
