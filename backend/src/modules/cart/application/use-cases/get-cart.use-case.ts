import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';

export interface GetCartInput {
  customerId?: string;
  sessionId?: string;
}

export interface CartResponseDto {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  storeId: string | null;
  items: {
    id: string;
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productName?: string;
    variantName?: string;
    sku?: string;
    thumbnailUrl?: string;
    availableStock?: number;
  }[];
  totalQuantity: number;
  subtotal: number;
}

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: GetCartInput): Promise<CartResponseDto> {
    if (!input.customerId && !input.sessionId) {
      return {
        id: '',
        customerId: null,
        sessionId: null,
        storeId: null,
        items: [],
        totalQuantity: 0,
        subtotal: 0,
      };
    }

    const cart = await this.cartRepository.findCart({
      customerId: input.customerId,
      sessionId: input.sessionId,
    });

    if (!cart) {
      return {
        id: '',
        customerId: input.customerId || null,
        sessionId: input.sessionId || null,
        storeId: null,
        items: [],
        totalQuantity: 0,
        subtotal: 0,
      };
    }

    return {
      id: cart.id,
      customerId: cart.customerId,
      sessionId: cart.sessionId,
      storeId: cart.storeId,
      items: cart.items.map((i) => ({
        id: i.id,
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.getTotalPrice(),
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        thumbnailUrl: i.thumbnailUrl,
        availableStock: i.availableStock,
      })),
      totalQuantity: cart.getTotalQuantity(),
      subtotal: cart.getSubtotal(),
    };
  }
}
