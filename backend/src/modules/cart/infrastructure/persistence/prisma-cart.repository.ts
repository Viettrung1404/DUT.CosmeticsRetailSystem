import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ICartRepository, VariantInfo } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';
import { CartItemEntity } from '../../domain/entities/cart-item.entity';

const CART_ITEMS_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          images: { where: { isPrimary: true }, take: 1 },
          inventory: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.CartInclude;

type CartItemRaw = {
  id: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: Prisma.Decimal | number;
  isSelected?: boolean;
  createdAt: Date;
  variant?: {
    sku: string;
    price: Prisma.Decimal | number;
    isActive: boolean;
    option1Value?: string | null;
    option2Value?: string | null;
    option3Value?: string | null;
    images?: { imageUrl: string }[];
    product: {
      name: string;
      isActive: boolean;
      images?: { imageUrl: string }[];
    };
    inventory?: {
      quantity: number;
      reservedQuantity: number;
    }[];
  };
};

@Injectable()
export class PrismaCartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildVariantName(variant: CartItemRaw['variant']): string {
    if (!variant) return 'Mặc định';
    const parts = [variant.option1Value, variant.option2Value, variant.option3Value].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (variant.sku || 'Mặc định');
  }

  private calcAvailableStock(inventory?: { quantity: number; reservedQuantity: number }[]): number {
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) return 0;
    
    if (inventory.length === 1) {
      return Math.max(0, inventory[0].quantity - (inventory[0].reservedQuantity || 0));
    }

    return Math.max(
      ...inventory.map((inv) => Math.max(0, inv.quantity - (inv.reservedQuantity || 0))),
      0,
    );
  }

  private mapRawItemToEntity(raw: CartItemRaw): CartItemEntity {
    const variant = raw.variant;
    const product = variant?.product;
    const image = variant?.images?.[0] || product?.images?.[0];

    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      currentPrice: variant ? Number(variant.price) : Number(raw.unitPrice),
      isSelected: raw.isSelected ?? true,
      productName: product?.name || 'Sản phẩm',
      variantName: this.buildVariantName(variant),
      sku: variant?.sku,
      thumbnailUrl: image?.imageUrl || undefined,
      availableStock: this.calcAvailableStock(variant?.inventory),
      isVariantActive: (variant?.isActive ?? false) && (product?.isActive ?? false),
      createdAt: raw.createdAt,
    });
  }

  private mapToCartEntity(raw: any): CartEntity {
    return new CartEntity({
      id: raw.id,
      customerId: raw.customerId,
      sessionId: raw.sessionId,
      storeId: raw.storeId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      items: (raw.items || []).map((i: CartItemRaw) => this.mapRawItemToEntity(i)),
    });
  }

  private mapSimpleItemToEntity(raw: {
    id: string;
    cartId: string;
    productVariantId: string;
    quantity: number;
    unitPrice: Prisma.Decimal | number;
    isSelected?: boolean;
    createdAt: Date;
  }): CartItemEntity {
    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      isSelected: raw.isSelected ?? true,
      createdAt: raw.createdAt,
    });
  }

  async findCart(params: { customerId?: string; sessionId?: string }): Promise<CartEntity | null> {
    if (!params.customerId && !params.sessionId) return null;
    if (params.customerId) {
      const raw = await this.prisma.cart.findFirst({
        where: { customerId: params.customerId },
        include: CART_ITEMS_INCLUDE,
      });
      if (raw) return this.mapToCartEntity(raw);
    }

    // Fallback: find by sessionId (guest cart)
    if (params.sessionId) {
      const raw = await this.prisma.cart.findFirst({
        where: { sessionId: params.sessionId },
        include: CART_ITEMS_INCLUDE,
      });
      if (raw) return this.mapToCartEntity(raw);
    }

    return null;
  }

  async findCartById(cartId: string): Promise<CartEntity | null> {
    const raw = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: CART_ITEMS_INCLUDE,
    });

    return raw ? this.mapToCartEntity(raw) : null;
  }

  async createCart(params: { customerId?: string; sessionId?: string; storeId?: string }): Promise<CartEntity> {
    const raw = await this.prisma.cart.create({
      data: {
        customerId: params.customerId || null,
        sessionId: params.sessionId || null,
        storeId: params.storeId || null,
      },
      include: { items: true },
    });

    return this.mapToCartEntity(raw);
  }

  async findCartItem(cartId: string, productVariantId: string): Promise<CartItemEntity | null> {
    const raw = await this.prisma.cartItem.findFirst({
      where: { cartId, productVariantId },
    });
    return raw ? this.mapSimpleItemToEntity(raw) : null;
  }

  async findCartItemById(itemId: string): Promise<CartItemEntity | null> {
    const raw = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    return raw ? this.mapSimpleItemToEntity(raw) : null;
  }

  async addItem(
    cartId: string,
    item: { productVariantId: string; quantity: number; unitPrice: number; isSelected?: boolean },
  ): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.upsert({
      where: {
        cartId_productVariantId: {
          cartId,
          productVariantId: item.productVariantId,
        },
      },
      create: {
        cartId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isSelected: item.isSelected ?? true,
      },
      update: {
        quantity: { increment: item.quantity },
        unitPrice: item.unitPrice,
      },
    });

    return this.mapSimpleItemToEntity(raw);
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.mapSimpleItemToEntity(raw);
  }

  async updateItemSelection(itemId: string, isSelected: boolean): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { isSelected },
    });

    return this.mapSimpleItemToEntity(raw);
  }

  async updateItem(
    itemId: string,
    data: { quantity?: number; isSelected?: boolean },
  ): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.isSelected !== undefined ? { isSelected: data.isSelected } : {}),
      },
    });

    return this.mapSimpleItemToEntity(raw);
  }

  // Update stored price to current price
  async updateItemPrice(itemId: string, unitPrice: number): Promise<void> {
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { unitPrice },
    });
  }

  async removeItem(itemId: string): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clearCart(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async mergeCarts(sourceCartId: string, targetCartId: string): Promise<CartEntity> {
    await this.prisma.$transaction(async (tx) => {
      const [sourceItems, targetItems] = await Promise.all([
        tx.cartItem.findMany({ where: { cartId: sourceCartId } }),
        tx.cartItem.findMany({ where: { cartId: targetCartId } }),
      ]);

      if (sourceItems.length === 0) {
        // Nothing to merge, just delete empty source cart
        await tx.cart.delete({ where: { id: sourceCartId } }).catch(() => undefined);
        return;
      }

      const targetMap = new Map(targetItems.map((i) => [i.productVariantId, i]));

      // Batch validate stock for all source variants
      const variantIds = sourceItems.map((i) => i.productVariantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: { select: { isActive: true } },
          inventory: true,
        },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      const updatePromises: Promise<any>[] = [];
      const createInputs: Prisma.CartItemCreateManyInput[] = [];

      for (const sItem of sourceItems) {
        const variant = variantMap.get(sItem.productVariantId);

        // Skip inactive variants during merge
        if (!variant || !variant.isActive || !variant.product.isActive) {
          continue;
        }

        const availableStock = this.calcAvailableStock(variant.inventory);

        const existing = targetMap.get(sItem.productVariantId);
        const mergedQty = existing
          ? Math.min(99, existing.quantity + sItem.quantity)
          : sItem.quantity;

        // Cap at available stock
        const finalQty = Math.min(mergedQty, availableStock);
        if (finalQty <= 0) continue;

        if (existing) {
          updatePromises.push(
            tx.cartItem.update({
              where: { id: existing.id },
              data: {
                quantity: finalQty,
                unitPrice: Number(variant.price), // Update to current price
              },
            }),
          );
        } else {
          createInputs.push({
            cartId: targetCartId,
            productVariantId: sItem.productVariantId,
            quantity: finalQty,
            unitPrice: Number(variant.price),
            isSelected: true,
          });
        }
      }

      // Batch execute all writes
      await Promise.all(updatePromises);
      if (createInputs.length > 0) {
        await tx.cartItem.createMany({ data: createInputs });
      }

      // Delete source cart (cascade deletes its items)
      await tx.cart.delete({ where: { id: sourceCartId } });
    });

    const targetCart = await this.findCartById(targetCartId);
    return targetCart!;
  }

  async getVariantStockAndPrice(productVariantId: string, storeId?: string): Promise<VariantInfo | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        images: { where: { isPrimary: true }, take: 1 },
        inventory: storeId ? { where: { storeId } } : true,
      },
    });

    if (!variant || !variant.isActive || !variant.product.isActive) {
      return null;
    }

    return {
      availableStock: this.calcAvailableStock(variant.inventory),
      price: Number(variant.price),
      productName: variant.product.name,
      variantName: this.buildVariantName(variant),
      sku: variant.sku,
      thumbnailUrl: (variant.images[0] || variant.product.images[0])?.imageUrl || undefined,
      isActive: variant.isActive && variant.product.isActive,
    };
  }

  async getVariantsStockAndPrice(variantIds: string[], storeId?: string): Promise<Map<string, VariantInfo>> {
    if (variantIds.length === 0) return new Map();

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        images: { where: { isPrimary: true }, take: 1 },
        inventory: storeId ? { where: { storeId } } : true,
      },
    });

    const result = new Map<string, VariantInfo>();
    for (const variant of variants) {
      result.set(variant.id, {
        availableStock: this.calcAvailableStock(variant.inventory),
        price: Number(variant.price),
        productName: variant.product.name,
        variantName: this.buildVariantName(variant),
        sku: variant.sku,
        thumbnailUrl: (variant.images[0] || variant.product.images[0])?.imageUrl || undefined,
        isActive: variant.isActive && variant.product.isActive,
      });
    }

    return result;
  }

  async deleteExpiredGuestCarts(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.cart.deleteMany({
      where: {
        customerId: null, // Guest carts only
        updatedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
