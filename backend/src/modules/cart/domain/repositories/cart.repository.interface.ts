import { CartEntity } from '../entities/cart.entity';
import { CartItemEntity } from '../entities/cart-item.entity';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface ICartRepository {
  findCart(params: { customerId?: string; sessionId?: string }): Promise<CartEntity | null>;
  findCartById(cartId: string): Promise<CartEntity | null>;
  createCart(params: { customerId?: string; sessionId?: string; storeId?: string }): Promise<CartEntity>;
  findCartItem(cartId: string, productVariantId: string): Promise<CartItemEntity | null>;
  findCartItemById(itemId: string): Promise<CartItemEntity | null>;
  addItem(cartId: string, item: { productVariantId: string; quantity: number; unitPrice: number }): Promise<CartItemEntity>;
  updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity>;
  removeItem(itemId: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
  mergeCarts(sourceCartId: string, targetCartId: string): Promise<CartEntity>;
  getVariantStockAndPrice(productVariantId: string, storeId?: string): Promise<{
    availableStock: number;
    price: number;
    productName: string;
    variantName: string;
    sku: string;
    thumbnailUrl?: string;
    isActive: boolean;
  } | null>;
}
