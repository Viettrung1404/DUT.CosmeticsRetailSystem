import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommercePricingService } from '@modules/customer-experience/application/commerce-pricing.service';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartItemResponseDto, CartResponseDto } from '../../presentation/dtos/cart-response.dto';

export interface GetCartInput {
  customerId?: string;
  sessionId?: string;
}

// Re-export for compatibility with other modules if needed
export { CartItemResponseDto, CartResponseDto };

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
    @Optional() private readonly pricing?: CommercePricingService,
  ) {}

  async execute(input: GetCartInput): Promise<CartResponseDto> {
    const emptyCart: CartResponseDto = {
      id: '',
      customerId: input.customerId || null,
      sessionId: input.sessionId || null,
      storeId: null,
      items: [],
      unavailableItems: [],
      totalQuantity: 0,
      subtotal: 0,
      selectedQuantity: 0,
      selectedSubtotal: 0,
      hasPriceChanges: false,
    };

    if (!input.customerId && !input.sessionId) {
      return emptyCart;
    }

    // Load cart structure once, then obtain authoritative quantity-aware prices.
    const cart = await this.cartRepository.findCart({
      customerId: input.customerId,
      sessionId: input.sessionId,
    });

    if (!cart || cart.items.length === 0) {
      return { ...emptyCart, id: cart?.id || '' };
    }

    if (this.pricing) {
      const available = cart.items.filter(item => item.isVariantActive && !item.isQuantityExceeded);
      const selected = available.filter(item => item.isSelected);
      // Unselected items must not unlock discounts for the selected set.
      const groups = [selected, ...available.filter(item => !item.isSelected).map(item => [item])]
        .filter(group => group.length > 0);
      for (let offset = 0; offset < groups.length; offset += 5) {
        await Promise.all(groups.slice(offset, offset + 5).map(async group => {
          const quote = await this.pricing!.quote({ customerId: input.customerId,
            items: group.map(item => ({ variantId: item.productVariantId, quantity: item.quantity })) });
          for (const item of group) {
            const line = quote.items.find(line => line.variantId === item.productVariantId)!;
            item.currentPrice = line.effectivePrice;
            item.currentTotalPrice = line.afterLineDiscount;
          }
        }));
      }
    }

    const availableItems: CartItemResponseDto[] = [];
    const unavailableItems: CartItemResponseDto[] = [];
    let hasPriceChanges = false;

    for (const item of cart.items) {
      const isAvailable = item.isVariantActive;
      const priceChanged = item.priceChanged;

      if (priceChanged) {
        hasPriceChanges = true;
      }

      const dto: CartItemResponseDto = {
        id: item.id,
        productVariantId: item.productVariantId,
        productId: item.productId,
        productSlug: item.productSlug,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currentPrice: item.currentPrice,
        totalPrice: item.getTotalPrice(),
        priceChanged,
        isSelected: item.isSelected,
        isQuantityExceeded: item.isQuantityExceeded,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        thumbnailUrl: item.thumbnailUrl,
        availableStock: item.availableStock ?? 0,
        isAvailable,
      };

      if (isAvailable) {
        availableItems.push(dto);
      } else {
        unavailableItems.push(dto);
      }
    }

    // P2: Pure read-only — NO side-effect database writes on GET method

    const totalQuantity = availableItems.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = availableItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const selectedItems = availableItems.filter((i) => i.isSelected);
    const selectedQuantity = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
    const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    return {
      id: cart.id,
      customerId: cart.customerId,
      sessionId: cart.sessionId,
      storeId: cart.storeId,
      items: availableItems,
      unavailableItems,
      totalQuantity,
      subtotal,
      selectedQuantity,
      selectedSubtotal,
      hasPriceChanges,
    };
  }
}
