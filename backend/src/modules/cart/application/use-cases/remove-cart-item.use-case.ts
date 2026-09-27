import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';

export interface RemoveCartItemInput {
  cartItemId: string;
  customerId?: string;
  sessionId?: string;
}

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: RemoveCartItemInput): Promise<CartEntity> {
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
      throw new ForbiddenException('Bạn không có quyền thao tác trên giỏ hàng này');
    }
    if (input.sessionId && !input.customerId && cart.sessionId !== input.sessionId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên giỏ hàng này');
    }

    await this.cartRepository.removeItem(item.id);

    const updated = await this.cartRepository.findCartById(cart.id);
    return updated || new CartEntity({ id: cart.id, customerId: cart.customerId, sessionId: cart.sessionId, items: [] });
  }
}
