import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRAND_REPOSITORY,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';
import { BrandEntity } from '../../domain/entities/brand.entity';

@Injectable()
export class GetBrandDetailUseCase {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  async execute(id: string): Promise<BrandEntity> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }
    return brand;
  }
}
