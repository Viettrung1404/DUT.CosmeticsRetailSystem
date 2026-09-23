import { Inject, Injectable } from '@nestjs/common';
import {
  BRAND_REPOSITORY,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';
import { BrandEntity } from '../../domain/entities/brand.entity';

export interface GetBrandsInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
}

@Injectable()
export class GetBrandsUseCase {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  execute(input: GetBrandsInput): Promise<{ items: BrandEntity[]; total: number }> {
    return this.brandRepository.findAll({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      search: input.search?.trim() || undefined,
      isActive: input.isActive,
    });
  }
}
