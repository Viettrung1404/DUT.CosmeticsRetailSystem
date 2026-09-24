import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IProductVariantRepository,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../domain/repositories/product-variant.repository.interface';

@Injectable()
export class DeleteProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  // Xóa mềm: biến thể gắn với tồn kho, lô hàng, đơn hàng nên không xóa hẳn
  async execute(id: string): Promise<void> {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException('Không tìm thấy biến thể');
    }
    variant.deactivate();
    await this.variantRepository.update(variant);
  }
}
