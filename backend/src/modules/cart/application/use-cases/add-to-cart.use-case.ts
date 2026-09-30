import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartItemEntity } from '../../domain/entities/cart-item.entity';

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

  async execute(input: AddToCartInput): Promise<void> {
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

    if (!variantInfo) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }
    if (!variantInfo.isActive) {
      throw new BadRequestException('Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    // Fail-fast validation against available stock
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

    // Rich Domain Model: Validate via CartEntity Aggregate Root
    const newItem = new CartItemEntity({
      id: '',
      cartId: cart.id,
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      unitPrice: variantInfo.price,
      currentPrice: variantInfo.price,
      availableStock: variantInfo.availableStock,
      isVariantActive: variantInfo.isActive,
    });

    try {
      cart.addItem(newItem, variantInfo.availableStock);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    // P1: Atomic Upsert to DB — protects against race conditions
    await this.cartRepository.addItem(cart.id, {
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      unitPrice: variantInfo.price,
      isSelected: true,
    });
  }
}
