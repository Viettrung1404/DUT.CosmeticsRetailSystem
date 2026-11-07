import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ImportContext,
  ImportLookupKeys,
  IProductImportRepository,
  ProductPlan,
  VariantPlan,
} from '../../domain/repositories/product-import.repository.interface';

const variantData = (v: VariantPlan) => ({
  option1Value: v.option1Value,
  option2Value: v.option2Value,
  option3Value: v.option3Value,
  price: v.price,
  costPrice: v.costPrice,
  weight: v.weight,
  unit: v.unit,
  barcode: v.barcode,
});

@Injectable()
export class PrismaProductImportRepository implements IProductImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadContext(keys: ImportLookupKeys): Promise<ImportContext> {
    const [categories, brands, products, variants, barcodes, slugs] = await Promise.all([
      this.prisma.category.findMany({
        where: { slug: { in: keys.categorySlugs } },
        select: { id: true, slug: true, isActive: true },
      }),
      this.prisma.brand.findMany({
        where: { slug: { in: keys.brandSlugs } },
        select: { id: true, slug: true },
      }),
      this.prisma.product.findMany({
        where: { sku: { in: keys.productSkus } },
        select: {
          id: true,
          sku: true,
          option1Name: true,
          option2Name: true,
          option3Name: true,
          variants: {
            select: { id: true, sku: true, option1Value: true, option2Value: true, option3Value: true },
          },
        },
      }),
      this.prisma.productVariant.findMany({
        where: { sku: { in: keys.variantSkus } },
        select: { sku: true, product: { select: { sku: true } } },
      }),
      this.prisma.productVariant.findMany({
        where: { barcode: { in: keys.barcodes } },
        select: { sku: true, barcode: true },
      }),
      this.prisma.product.findMany({
        where: { slug: { in: keys.slugs } },
        select: { slug: true },
      }),
    ]);

    return {
      categories: new Map(categories.map((c) => [c.slug, { id: c.id, isActive: c.isActive }])),
      brands: new Map(brands.map((b) => [b.slug, b.id])),
      products: new Map(
        products.map((p) => [
          p.sku,
          {
            id: p.id,
            option1Name: p.option1Name,
            option2Name: p.option2Name,
            option3Name: p.option3Name,
            variants: p.variants,
          },
        ]),
      ),
      variantOwners: new Map(variants.map((v) => [v.sku, v.product.sku])),
      barcodeOwners: new Map(barcodes.map((v) => [v.barcode as string, v.sku])),
      takenSlugs: new Set(slugs.map((s) => s.slug)),
    };
  }

  async apply(plans: ProductPlan[]): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        for (const plan of plans) {
          const fields = {
            name: plan.name,
            categoryId: plan.categoryId,
            brandId: plan.brandId,
            basePrice: plan.basePrice,
            description: plan.description,
          };
          if (!plan.existingId) {
            await tx.product.create({
              data: {
                ...fields,
                sku: plan.sku,
                slug: plan.slug,
                option1Name: plan.option1Name,
                option2Name: plan.option2Name,
                option3Name: plan.option3Name,
                variants: { create: plan.variants.map((v) => ({ sku: v.sku, ...variantData(v) })) },
                tags: plan.tags?.length ? { create: plan.tags.map((tagName) => ({ tagName })) } : undefined,
              },
            });
            continue;
          }

          const productId = plan.existingId;
          await tx.product.update({
            where: { id: productId },
            data: { ...fields, brandId: plan.brandId ?? undefined, description: plan.description ?? undefined },
          });
          if (plan.tags) {
            await tx.productTag.deleteMany({ where: { productId } });
            await tx.productTag.createMany({
              data: plan.tags.map((tagName) => ({ productId, tagName })),
            });
          }
          for (const v of plan.variants.filter((x) => x.existingId)) {
            await tx.productVariant.update({
              where: { id: v.existingId as string },
              data: variantData(v),
            });
          }
          const created = plan.variants.filter((v) => !v.existingId);
          if (created.length) {
            await tx.productVariant.createMany({
              data: created.map((v) => ({ productId, sku: v.sku, ...variantData(v) })),
            });
          }
        }
      },
      { timeout: 120000, maxWait: 10000 },
    );
  }
}
