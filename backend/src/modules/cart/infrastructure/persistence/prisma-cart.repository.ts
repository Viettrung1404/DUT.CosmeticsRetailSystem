import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
              category: { select: { isActive: true } },
              brand: { select: { isActive: true } },
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
            },
          },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
          inventory: { where: { store: { isActive: true, type: { in: ['STORE', 'WAREHOUSE'] } } } },
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
    productId?: string;
    sku: string;
    price: Prisma.Decimal | number;
    isActive: boolean;
    option1Value?: string | null;
    option2Value?: string | null;
    option3Value?: string | null;
    images?: { imageUrl: string }[];
    product: {
      name: string;
      category?: { isActive: boolean };
      brand?: { isActive: boolean } | null;
      slug?: string;
      isActive: boolean;
      images?: { imageUrl: string }[];
    };
    inventory?: {
      quantity: number;
      reservedQuantity: number;
      availableQuantity?: number | null;
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

  private calcAvailableStock(inventory?: { availableQuantity?: number | null }[]): number {
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) return 0;
    
    if (inventory.length === 1) {
      return Math.max(0, inventory[0].availableQuantity ?? 0);
    }

    return Math.max(
      ...inventory.map((inv) => Math.max(0, inv.availableQuantity ?? 0)),
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
      productId: variant?.productId,
      productSlug: product?.slug,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      currentPrice: variant ? Number(variant.price) : Number(raw.unitPrice),
      isSelected: raw.isSelected ?? true,
      productName: product?.name || 'Sản phẩm',
      variantName: this.buildVariantName(variant),
      sku: variant?.sku,
      thumbnailUrl: image?.imageUrl || undefined,
      availableStock: this.calcAvailableStock(variant?.inventory),
      isVariantActive: (variant?.isActive ?? false) && (product?.isActive ?? false) &&
        (product?.category?.isActive ?? true) && (product?.brand?.isActive ?? true),
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

  private async withCurrentPrices(cart: CartEntity): Promise<CartEntity> {
    if (!cart.items.length) return cart;
    const prices = await this.prisma.$queryRaw<Array<{ id: string; price: number }>>`
      SELECT id::text AS id,sprint5_variant_price(id,0)::float8 AS price
      FROM product_variants WHERE id=ANY(${cart.items.map((item) => item.productVariantId)}::uuid[])
    `;
    const byId = new Map(prices.map((row) => [row.id,row.price]));
    for (const item of cart.items) item.currentPrice = byId.get(item.productVariantId) ?? item.currentPrice;
    return cart;
  }

  async findCart(params: { customerId?: string; sessionId?: string }): Promise<CartEntity | null> {
    if (!params.customerId && !params.sessionId) return null;
    if (params.customerId) {
      const raw = await this.prisma.cart.findFirst({
        where: { customerId: params.customerId },
        include: CART_ITEMS_INCLUDE,
      });
      if (raw) return this.withCurrentPrices(this.mapToCartEntity(raw));
    }

    // Fallback: find by sessionId (guest cart)
    if (params.sessionId) {
      const raw = await this.prisma.cart.findFirst({
        where: { sessionId: params.sessionId },
        include: CART_ITEMS_INCLUDE,
      });
      if (raw) return this.withCurrentPrices(this.mapToCartEntity(raw));
    }

    return null;
  }

  async findCartById(cartId: string): Promise<CartEntity | null> {
    const raw = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: CART_ITEMS_INCLUDE,
    });

    return raw ? this.withCurrentPrices(this.mapToCartEntity(raw)) : null;
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
    item: { productVariantId: string; quantity: number; unitPrice: number; isSelected?: boolean; attributionSource?: string | null },
  ): Promise<CartItemEntity> {
    const raw = await this.prisma.$transaction(async (tx) => {
      // Serialize mutations of this cart before reading its existing quantity.
      const [cart] = await tx.$queryRaw<{ store_id: string | null }[]>`SELECT store_id FROM carts WHERE id=${cartId}::uuid FOR UPDATE`;
      if (!cart) throw new NotFoundException('Giỏ hàng không tồn tại');
      const existing = await tx.cartItem.findUnique({ where: { cartId_productVariantId: { cartId, productVariantId: item.productVariantId } } });
      await this.assertQuantity(tx, item.productVariantId, (existing?.quantity ?? 0) + item.quantity, cart.store_id);
      return tx.cartItem.upsert({
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
        ...(item.attributionSource ? { attributionSource: item.attributionSource } : {}),
      },
      update: {
        quantity: { increment: item.quantity },
        unitPrice: item.unitPrice,
        ...(item.attributionSource ? { attributionSource: item.attributionSource } : {}),
      },
      });
    });

    return this.mapSimpleItemToEntity(raw);
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity> {
    return this.updateItem(itemId, { quantity });
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
    const raw = await this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Sản phẩm trong giỏ hàng không tồn tại');
      const [cart] = await tx.$queryRaw<{ store_id: string | null }[]>`SELECT store_id FROM carts WHERE id=${item.cartId}::uuid FOR UPDATE`;
      if (!cart) throw new NotFoundException('Giỏ hàng không tồn tại');
      if (data.quantity !== undefined) await this.assertQuantity(tx, item.productVariantId, data.quantity, cart.store_id);
      return tx.cartItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.isSelected !== undefined ? { isSelected: data.isSelected } : {}),
      },
      });
    });

    return this.mapSimpleItemToEntity(raw);
  }

  private async assertQuantity(tx: Prisma.TransactionClient, variantId: string, quantity: number, storeId: string | null) {
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw new BadRequestException({ code: 'INVALID_QUANTITY', message: 'Số lượng phải là số nguyên lớn hơn 0' });
    const [stock] = await tx.$queryRaw<{ available: number }[]>`
      SELECT COALESCE(MAX(GREATEST(i.available_quantity,0)),0)::int AS available
      FROM inventory i JOIN stores s ON s.id=i.store_id
      WHERE i.product_variant_id=${variantId}::uuid AND s.is_active
        AND s.type IN ('STORE','WAREHOUSE') AND (${storeId}::uuid IS NULL OR i.store_id=${storeId}::uuid)
    `;
    if (quantity > stock.available)
      throw new BadRequestException({ code: 'STOCK_LIMIT_EXCEEDED', message: 'Số lượng trong giỏ vượt quá tồn kho khả dụng' });
    if (quantity > 99)
      throw new BadRequestException({ code: 'CART_QUANTITY_LIMIT', message: 'Số lượng cho mỗi sản phẩm tối đa là 99' });
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
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
          },
        },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
        inventory: { where: { ...(storeId ? { storeId } : {}), store: { isActive: true, type: { in: ['STORE', 'WAREHOUSE'] } } } },
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
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
          },
        },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
        inventory: { where: { ...(storeId ? { storeId } : {}), store: { isActive: true, type: { in: ['STORE', 'WAREHOUSE'] } } } },
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
