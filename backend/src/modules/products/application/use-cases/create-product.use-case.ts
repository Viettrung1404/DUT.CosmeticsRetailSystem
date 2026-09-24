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
  ProductChanges,
  ProductEntity,
  ProductImageProps,
  ProductVariantProps,
  variantOptionKey,
} from '../../domain/entities/product.entity';
import { assertVariantCodesUnique } from '../variant-rules';

export type CreateProductInput = Required<Pick<ProductChanges, 'categoryId' | 'name' | 'slug' | 'sku' | 'basePrice'>> &
  Omit<ProductChanges, 'categoryId' | 'name' | 'slug' | 'sku' | 'basePrice'> & {
    variants: ProductVariantProps[];
    images?: ProductImageInput[];
  };

export interface ProductImageInput {
  imageUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductEntity> {
    const { variants, images = [], ...productFields } = input;

    if (await this.productRepository.findBySlug(input.slug)) {
      throw new ConflictException(`Slug "${input.slug}" đã được sản phẩm khác sử dụng`);
    }
    if (await this.productRepository.findBySku(input.sku)) {
      throw new ConflictException(`SKU sản phẩm "${input.sku}" đã tồn tại`);
    }
    await this.assertReferences(input.categoryId, input.brandId);

    const product = new ProductEntity({
      ...productFields,
      name: input.name.trim(),
      variants: variants.map((v) => ({ ...v, isActive: v.isActive ?? true })),
      images: normalizeImages(images),
    });

    if (!product.hasValidSalePrice()) {
      throw new BadRequestException('Giá khuyến mãi không được lớn hơn giá gốc');
    }
    await this.assertVariants(product, variants);

    return this.productRepository.create(product);
  }

  private async assertReferences(categoryId: string, brandId?: string | null): Promise<void> {
    const category = await this.productRepository.findCategoryState(categoryId);
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    if (!category.isActive) throw new BadRequestException('Danh mục đang ngừng hoạt động');
    if (brandId && !(await this.productRepository.brandExists(brandId))) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }
  }

  private async assertVariants(product: ProductEntity, variants: ProductVariantProps[]): Promise<void> {
    const optionKeys = new Set<string>();
    const skus = new Set<string>();
    const barcodes = new Set<string>();

    for (const variant of variants) {
      const optionError = product.getVariantOptionError(variant);
      if (optionError) throw new BadRequestException(optionError);

      const key = variantOptionKey(variant);
      if (optionKeys.has(key)) {
        throw new BadRequestException(`Có hai biến thể trùng tổ hợp thuộc tính (${key.replace(/\|+$/, '')})`);
      }
      if (skus.has(variant.sku)) throw new BadRequestException(`SKU biến thể "${variant.sku}" bị lặp`);
      if (variant.barcode && barcodes.has(variant.barcode)) {
        throw new BadRequestException(`Mã vạch "${variant.barcode}" bị lặp`);
      }
      optionKeys.add(key);
      skus.add(variant.sku);
      if (variant.barcode) barcodes.add(variant.barcode);

      await assertVariantCodesUnique(this.variantRepository, variant);
    }
  }
}

// Tối đa 1 ảnh chính; không chọn ảnh nào thì ảnh đầu tiên là ảnh chính
export function normalizeImages(images: ProductImageInput[]): ProductImageProps[] {
  const primaryCount = images.filter((img) => img.isPrimary).length;
  if (primaryCount > 1) {
    throw new BadRequestException('Chỉ được chọn tối đa 1 ảnh chính');
  }
  return images.map((img, index) => ({
    ...img,
    sortOrder: img.sortOrder ?? index,
    isPrimary: primaryCount === 0 ? index === 0 : !!img.isPrimary,
  }));
}
