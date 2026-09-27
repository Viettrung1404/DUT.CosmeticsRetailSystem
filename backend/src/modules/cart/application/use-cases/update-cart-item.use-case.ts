import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';

export interface UpdateCartItemInput {
  cartItemId: string;
  quantity: number;
  customerId?: string;
  sessionId?: string;
}

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: UpdateCartItemInput): Promise<CartEntity> {
    if (input.quantity <= 0) {
      throw new BadRequestException('Số lượng phải lớn hơn 0');
    }
    if (input.quantity > 99) {
      throw new BadRequestException('Số lượng cho mỗi sản phẩm tối đa là 99');
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

    const variantInfo = await this.cartRepository.getVariantStockAndPrice(
      item.productVariantId,
      cart.storeId || undefined,
    );

    if (!variantInfo || !variantInfo.isActive) {
      throw new BadRequestException('Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    if (input.quantity > variantInfo.availableStock) {
      throw new BadRequestException(
        `Số lượng yêu cầu (${input.quantity}) vượt quá tồn kho khả dụng (${variantInfo.availableStock})`,
      );
    }

    await this.cartRepository.updateItemQuantity(item.id, input.quantity);

    const updated = await this.cartRepository.findCartById(cart.id);
    return updated || cart;
  }
}
