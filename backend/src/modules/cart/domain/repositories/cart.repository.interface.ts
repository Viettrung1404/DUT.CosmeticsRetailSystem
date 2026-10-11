import { CartEntity } from '../entities/cart.entity';
import { CartItemEntity } from '../entities/cart-item.entity';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface VariantInfo {
  availableStock: number;
  price: number;
  productName: string;
  variantName: string;
  sku: string;
  thumbnailUrl?: string;
  isActive: boolean;
}

export interface ICartRepository {
  findCart(params: { customerId?: string; sessionId?: string }): Promise<CartEntity | null>;
  findCartById(cartId: string): Promise<CartEntity | null>;
  createCart(params: { customerId?: string; sessionId?: string; storeId?: string }): Promise<CartEntity>;
  findCartItem(cartId: string, productVariantId: string): Promise<CartItemEntity | null>;
  findCartItemById(itemId: string): Promise<CartItemEntity | null>;
  addItem(cartId: string, item: { productVariantId: string; quantity: number; unitPrice: number; isSelected?: boolean }): Promise<CartItemEntity>;
  updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity>;
  updateItemSelection(itemId: string, isSelected: boolean): Promise<CartItemEntity>;
  updateItem(itemId: string, data: { quantity?: number; isSelected?: boolean }): Promise<CartItemEntity>;
  updateItemPrice(itemId: string, unitPrice: number): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
  mergeCarts(sourceCartId: string, targetCartId: string): Promise<CartEntity>;
  getVariantStockAndPrice(productVariantId: string, storeId?: string): Promise<VariantInfo | null>;
  getVariantsStockAndPrice(variantIds: string[], storeId?: string): Promise<Map<string, VariantInfo>>;
  deleteExpiredGuestCarts(olderThanDays: number): Promise<number>;
}
