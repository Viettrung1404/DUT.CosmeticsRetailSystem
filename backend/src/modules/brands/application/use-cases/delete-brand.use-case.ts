import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRAND_REPOSITORY,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';

@Injectable()
export class DeleteBrandUseCase {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    // Xóa hẳn chỉ dành cho thương hiệu tạo nhầm; còn sản phẩm thì phải ngừng kinh doanh (isActive = false)
    const productCount = await this.brandRepository.countProducts(id);
    if (productCount > 0) {
      throw new ConflictException(
        `Thương hiệu "${brand.name}" đang có ${productCount} sản phẩm, không thể xóa. Hãy chuyển sang trạng thái ngừng kinh doanh.`,
      );
    }

    await this.brandRepository.delete(id);
  }
}
