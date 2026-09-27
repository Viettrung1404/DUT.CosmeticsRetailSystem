import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';
import { CartItemEntity } from '../../domain/entities/cart-item.entity';

@Injectable()
export class PrismaCartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToCartEntity(raw: any): CartEntity {
    return new CartEntity({
      id: raw.id,
      customerId: raw.customerId,
      sessionId: raw.sessionId,
      storeId: raw.storeId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      items: (raw.items || []).map((i: any) => {
        const variant = i.variant;
        const product = variant?.product;
        const image = variant?.images?.[0] || product?.images?.[0];

        // Format variant name by concatenating options
        const variantParts = [variant?.option1Value, variant?.option2Value, variant?.option3Value].filter(Boolean);
        const variantName = variantParts.length > 0 ? variantParts.join(' / ') : (variant?.sku || 'Mặc định');

        // Calculate available stock from inventory
        let availableStock = 0;
        if (variant?.inventory && Array.isArray(variant.inventory)) {
          availableStock = variant.inventory.reduce(
            (sum: number, inv: any) => sum + Math.max(0, inv.quantity - (inv.reservedQuantity || 0)),
            0,
          );
        }

        return new CartItemEntity({
          id: i.id,
          cartId: i.cartId,
          productVariantId: i.productVariantId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          productName: product?.name || 'Sản phẩm',
          variantName,
          sku: variant?.sku,
          thumbnailUrl: image?.imageUrl || undefined,
          availableStock,
          createdAt: i.createdAt,
        });
      }),
    });
  }

  async findCart(params: { customerId?: string; sessionId?: string }): Promise<CartEntity | null> {
    if (!params.customerId && !params.sessionId) return null;

    const raw = await this.prisma.cart.findFirst({
      where: {
        OR: [
          ...(params.customerId ? [{ customerId: params.customerId }] : []),
          ...(params.sessionId ? [{ sessionId: params.sessionId }] : []),
        ],
      },
      include: {
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
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return raw ? this.mapToCartEntity(raw) : null;
  }

  async findCartById(cartId: string): Promise<CartEntity | null> {
    const raw = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
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
          orderBy: { createdAt: 'desc' },
        },
      },
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
      include: {
        items: true,
      },
    });

    return this.mapToCartEntity(raw);
  }

  async findCartItem(cartId: string, productVariantId: string): Promise<CartItemEntity | null> {
    const raw = await this.prisma.cartItem.findFirst({
      where: { cartId, productVariantId },
    });
    if (!raw) return null;

    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      createdAt: raw.createdAt,
    });
  }

  async findCartItemById(itemId: string): Promise<CartItemEntity | null> {
    const raw = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!raw) return null;

    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      createdAt: raw.createdAt,
    });
  }

  async addItem(cartId: string, item: { productVariantId: string; quantity: number; unitPrice: number }): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.create({
      data: {
        cartId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      },
    });

    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      createdAt: raw.createdAt,
    });
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity> {
    const raw = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return new CartItemEntity({
      id: raw.id,
      cartId: raw.cartId,
      productVariantId: raw.productVariantId,
      quantity: raw.quantity,
      unitPrice: Number(raw.unitPrice),
      createdAt: raw.createdAt,
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
    const sourceItems = await this.prisma.cartItem.findMany({
      where: { cartId: sourceCartId },
    });

    for (const sItem of sourceItems) {
      const existing = await this.prisma.cartItem.findFirst({
        where: { cartId: targetCartId, productVariantId: sItem.productVariantId },
      });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(99, existing.quantity + sItem.quantity) },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: targetCartId,
            productVariantId: sItem.productVariantId,
            quantity: sItem.quantity,
            unitPrice: sItem.unitPrice,
          },
        });
      }
    }

    // Delete guest source cart and its remaining items
    await this.prisma.cart.delete({
      where: { id: sourceCartId },
    }).catch(() => null);

    const targetCart = await this.findCartById(targetCartId);
    return targetCart!;
  }

  async getVariantStockAndPrice(productVariantId: string, storeId?: string): Promise<{
    availableStock: number;
    price: number;
    productName: string;
    variantName: string;
    sku: string;
    thumbnailUrl?: string;
    isActive: boolean;
  } | null> {
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

    const availableStock = variant.inventory.reduce((sum, inv) => {
      const avail = Math.max(0, inv.quantity - (inv.reservedQuantity || 0));
      return sum + avail;
    }, 0);

    const variantParts = [variant.option1Value, variant.option2Value, variant.option3Value].filter(Boolean);
    const variantName = variantParts.length > 0 ? variantParts.join(' / ') : (variant.sku || 'Mặc định');
    const image = variant.images[0] || variant.product.images[0];

    return {
      availableStock,
      price: Number(variant.price),
      productName: variant.product.name,
      variantName,
      sku: variant.sku,
      thumbnailUrl: image?.imageUrl || undefined,
      isActive: variant.isActive && variant.product.isActive,
    };
  }
}
