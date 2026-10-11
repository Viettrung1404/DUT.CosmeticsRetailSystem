import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IVariantCatalogProvider,
  VariantDetail,
} from '../../application/ports/variant-catalog.provider';

@Injectable()
export class PrismaVariantCatalogAdapter implements IVariantCatalogProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getVariantsDetails(variantIds: string[]): Promise<VariantDetail[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    return variants.map((pv) => ({
      id: pv.id,
      productName: pv.product.name,
      option1Value: pv.option1Value,
      option2Value: pv.option2Value,
      option3Value: pv.option3Value,
      unitPrice: Number(pv.price),
      unitCost: Number(pv.costPrice || 0),
      sku: pv.sku,
    }));
  }
}
