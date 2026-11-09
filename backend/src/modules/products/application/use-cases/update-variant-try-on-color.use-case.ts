import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IProductVariantRepository,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../domain/repositories/product-variant.repository.interface';

@Injectable()
export class UpdateVariantTryOnColorUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  async execute(id: string, colorHex: string): Promise<void> {
    const updated = await this.variantRepository.updateTryOnColor(id, colorHex);
    if (!updated) {
      throw new NotFoundException('Không tìm thấy biến thể sản phẩm');
    }
  }
}
