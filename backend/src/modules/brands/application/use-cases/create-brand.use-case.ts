import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  BRAND_REPOSITORY,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';
import { BrandEntity, BrandProps } from '../../domain/entities/brand.entity';
import { autoSeo } from '@core/utils/seo.util';

export type CreateBrandInput = Omit<BrandProps, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CreateBrandUseCase {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  async execute(input: CreateBrandInput): Promise<BrandEntity> {
    if (await this.brandRepository.findBySlug(input.slug)) {
      throw new ConflictException(`Slug "${input.slug}" đã được thương hiệu khác sử dụng`);
    }
    const seo = autoSeo({
      title: input.name,
      description: input.description,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });
    return this.brandRepository.create(new BrandEntity({ ...input, ...seo }));
  }
}
