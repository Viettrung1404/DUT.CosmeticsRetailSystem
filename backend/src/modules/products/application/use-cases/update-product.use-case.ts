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
import { ProductChanges, ProductEntity } from '../../domain/entities/product.entity';
import {
  normalizeImages,
  normalizeIngredients,
  normalizeTags,
  ProductImageInput,
  ProductIngredientInput,
} from './create-product.use-case';

export type UpdateProductInput = ProductChanges & {
  images?: ProductImageInput[];
  tags?: string[];
  ingredients?: ProductIngredientInput[];
};

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(id: string, input: UpdateProductInput): Promise<ProductEntity> {
    const { images, tags, ingredients, ...changes } = input;
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (changes.slug && changes.slug !== product.slug && (await this.productRepository.findBySlug(changes.slug))) {
      throw new ConflictException(`Slug "${changes.slug}" đã được sản phẩm khác sử dụng`);
    }
    if (changes.sku && changes.sku !== product.sku && (await this.productRepository.findBySku(changes.sku))) {
      throw new ConflictException(`SKU sản phẩm "${changes.sku}" đã tồn tại`);
    }
    const categoryChanged = !!changes.categoryId && changes.categoryId !== product.categoryId;
    if (categoryChanged || (changes.isActive === true && !product.isActive)) {
      const category = await this.productRepository.findCategoryState(changes.categoryId ?? product.categoryId);
      if (!category) throw new NotFoundException('Không tìm thấy danh mục');
      if (!category.isActive) throw new BadRequestException('Danh mục đang ngừng hoạt động');
    }
    if (changes.brandId && !(await this.productRepository.brandExists(changes.brandId))) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }
    this.assertOptionNamesStillUsed(product, changes);

    product.update(changes);
    if (!product.hasValidSalePrice()) {
      throw new BadRequestException('Giá khuyến mãi không được lớn hơn giá gốc');
    }

    return this.productRepository.update(product, {
      images: images ? normalizeImages(images) : undefined,
      tags: tags ? normalizeTags(tags) : undefined,
      ingredients: ingredients ? normalizeIngredients(ingredients) : undefined,
    });
  }

  // Không cho xóa tên thuộc tính khi còn biến thể đang dùng giá trị của thuộc tính đó
  private assertOptionNamesStillUsed(product: ProductEntity, changes: ProductChanges): void {
    const removed = [changes.option1Name, changes.option2Name, changes.option3Name];
    for (let i = 0; i < 3; i++) {
      if (removed[i] !== null) continue;
      const key = `option${i + 1}Value` as 'option1Value' | 'option2Value' | 'option3Value';
      if (product.variants.some((v) => v[key])) {
        throw new BadRequestException(
          `Không thể bỏ thuộc tính ${i + 1} vì còn biến thể đang dùng, hãy sửa các biến thể trước`,
        );
      }
    }
  }
}
