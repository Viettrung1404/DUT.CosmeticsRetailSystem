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
  ProductVariantEntity,
  ProductVariantEntityProps,
} from '../../domain/entities/product-variant.entity';
import { assertVariantCodesUnique } from '../variant-rules';

export type CreateProductVariantInput = Omit<
  ProductVariantEntityProps,
  'id' | 'productId' | 'stockQuantity' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class CreateProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  async execute(productId: string, input: CreateProductVariantInput): Promise<ProductVariantEntity> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const optionError = product.getVariantOptionError(input);
    if (optionError) throw new BadRequestException(optionError);

    if (await this.variantRepository.findByOptions(productId, input)) {
      throw new ConflictException('Sản phẩm đã có biến thể với tổ hợp thuộc tính này');
    }
    await assertVariantCodesUnique(this.variantRepository, input);

    return this.variantRepository.create(new ProductVariantEntity({ ...input, productId }));
  }
}
