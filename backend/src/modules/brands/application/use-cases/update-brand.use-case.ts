import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRAND_REPOSITORY,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';
import { BrandChanges, BrandEntity } from '../../domain/entities/brand.entity';

@Injectable()
export class UpdateBrandUseCase {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  async execute(id: string, changes: BrandChanges): Promise<BrandEntity> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    if (changes.slug && changes.slug !== brand.slug) {
      const sameSlug = await this.brandRepository.findBySlug(changes.slug);
      if (sameSlug) {
        throw new ConflictException(`Slug "${changes.slug}" đã được thương hiệu khác sử dụng`);
      }
    }

    brand.update(changes);
    return this.brandRepository.update(brand);
  }
}
