import { Inject, Injectable } from '@nestjs/common';
import {
  IProductTagRepository,
  PRODUCT_TAG_REPOSITORY,
} from '../../domain/repositories/product-tag.repository.interface';

@Injectable()
export class ListProductTagsUseCase {
  constructor(@Inject(PRODUCT_TAG_REPOSITORY) private readonly repository: IProductTagRepository) {}

  execute(input: { search?: string; limit: number }) {
    return this.repository.list({ search: input.search?.trim() || undefined, take: input.limit });
  }
}
