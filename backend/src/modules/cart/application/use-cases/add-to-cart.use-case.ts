import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';

export interface AddToCartInput {
  customerId?: string;
  sessionId?: string;
  storeId?: string;
  productVariantId: string;
  quantity: number;
}

@Injectable()
export class AddToCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: AddToCartInput): Promise<CartEntity> {
    if (!input.customerId && !input.sessionId) {
      throw new BadRequestException('Phải cung cấp customerId hoặc sessionId');
    }
    if (!input.quantity || input.quantity <= 0) {
      throw new BadRequestException('Số lượng phải lớn hơn 0');
    }

    const variantInfo = await this.cartRepository.getVariantStockAndPrice(
      input.productVariantId,
      input.storeId,
    );

    if (!variantInfo || !variantInfo.isActive) {
      throw new BadRequestException('Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    if (input.quantity > variantInfo.availableStock) {
      throw new BadRequestException(
        `Số lượng yêu cầu (${input.quantity}) vượt quá tồn kho khả dụng (${variantInfo.availableStock})`,
      );
    }

    let cart = await this.cartRepository.findCart({
      customerId: input.customerId,
      sessionId: input.sessionId,
    });

    if (!cart) {
      cart = await this.cartRepository.createCart({
        customerId: input.customerId,
        sessionId: input.sessionId,
        storeId: input.storeId,
      });
    }

    const existingItem = await this.cartRepository.findCartItem(cart.id, input.productVariantId);
    const targetQuantity = existingItem ? existingItem.quantity + input.quantity : input.quantity;

    if (targetQuantity > variantInfo.availableStock) {
      throw new BadRequestException(
        `Số lượng yêu cầu (${targetQuantity}) vượt quá tồn kho khả dụng (${variantInfo.availableStock})`,
      );
    }
    if (targetQuantity > 99) {
      throw new BadRequestException('Số lượng cho mỗi sản phẩm tối đa là 99');
    }

    if (existingItem) {
      await this.cartRepository.updateItemQuantity(existingItem.id, targetQuantity);
    } else {
      await this.cartRepository.addItem(cart.id, {
        productVariantId: input.productVariantId,
        quantity: input.quantity,
        unitPrice: variantInfo.price,
      });
    }

    const updated = await this.cartRepository.findCartById(cart.id);
    return updated || cart;
  }
}
