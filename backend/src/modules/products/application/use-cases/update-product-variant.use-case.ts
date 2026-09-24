import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import {
  IProductVariantRepository,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../domain/repositories/product-variant.repository.interface';
import {
  ProductVariantChanges,
  ProductVariantEntity,
} from '../../domain/entities/product-variant.entity';
import { variantOptionKey } from '../../domain/entities/product.entity';
import { assertVariantCodesUnique } from '../variant-rules';

@Injectable()
export class UpdateProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  async execute(id: string, changes: ProductVariantChanges): Promise<ProductVariantEntity> {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException('Không tìm thấy biến thể');
    }
    const product = await this.productRepository.findById(variant.productId);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm của biến thể');
    }

    const oldKey = variantOptionKey(variant);
    variant.update(changes);

    const optionError = product.getVariantOptionError(variant);
    if (optionError) throw new BadRequestException(optionError);

    if (variantOptionKey(variant) !== oldKey) {
      const sameOptions = await this.variantRepository.findByOptions(variant.productId, variant);
      if (sameOptions && sameOptions.id !== id) {
        throw new ConflictException('Sản phẩm đã có biến thể với tổ hợp thuộc tính này');
      }
    }
    await assertVariantCodesUnique(
      this.variantRepository,
      { sku: changes.sku, barcode: changes.barcode },
      id,
    );

    return this.variantRepository.update(variant);
  }
}
