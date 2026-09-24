import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryEntity } from '../../domain/entities/category.entity';

export class CategoryResponseDto {
  @ApiProperty({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id: string;

  @ApiPropertyOptional({ example: null })
  parentId?: string | null;

  @ApiProperty({ example: 'Kem chống nắng' })
  name: string;

  @ApiProperty({ example: 'kem-chong-nang' })
  slug: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional()
  metaTitle?: string | null;

  @ApiPropertyOptional()
  metaDescription?: string | null;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({ type: () => [CategoryResponseDto], description: 'Chỉ có ở API dạng cây' })
  children?: CategoryResponseDto[];

  static fromDomain(entity: CategoryEntity, withChildren = false): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = entity.id!;
    dto.parentId = entity.parentId ?? null;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.sortOrder = entity.sortOrder;
    dto.isActive = entity.isActive;
    dto.metaTitle = entity.metaTitle;
    dto.metaDescription = entity.metaDescription;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (withChildren) {
      dto.children = entity.children.map((child) => CategoryResponseDto.fromDomain(child, true));
    }
    return dto;
  }
}
