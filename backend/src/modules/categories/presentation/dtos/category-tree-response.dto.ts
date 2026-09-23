import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryEntity } from '../../domain/entities/category.entity';

export class CategoryTreeResponseDto {
  @ApiProperty({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id: string;

  @ApiPropertyOptional({ example: null })
  parentId?: string | null;

  @ApiProperty({ example: 'Chăm sóc da' })
  name: string;

  @ApiProperty({ example: 'cham-soc-da' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/cat-skincare.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiProperty({ type: () => [CategoryTreeResponseDto] })
  children: CategoryTreeResponseDto[];

  static fromDomain(entity: CategoryEntity): CategoryTreeResponseDto {
    const dto = new CategoryTreeResponseDto();
    dto.id = entity.id!;
    dto.parentId = entity.parentId;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.imageUrl = entity.imageUrl;
    dto.sortOrder = entity.sortOrder;
    dto.children = entity.children?.map((c) => CategoryTreeResponseDto.fromDomain(c)) ?? [];
    return dto;
  }
}
