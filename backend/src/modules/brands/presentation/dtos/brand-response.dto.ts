import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandEntity } from '../../domain/entities/brand.entity';

export class BrandResponseDto {
  @ApiProperty({ example: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id: string;

  @ApiProperty({ example: 'Innisfree' })
  name: string;

  @ApiProperty({ example: 'innisfree' })
  slug: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  bannerUrl?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Hàn Quốc' })
  countryOfOrigin?: string | null;

  @ApiPropertyOptional()
  websiteUrl?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: false })
  isFeatured: boolean;

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

  static fromDomain(entity: BrandEntity): BrandResponseDto {
    const dto = new BrandResponseDto();
    dto.id = entity.id!;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.logoUrl = entity.logoUrl;
    dto.bannerUrl = entity.bannerUrl;
    dto.description = entity.description;
    dto.countryOfOrigin = entity.countryOfOrigin;
    dto.websiteUrl = entity.websiteUrl;
    dto.sortOrder = entity.sortOrder;
    dto.isFeatured = entity.isFeatured;
    dto.isActive = entity.isActive;
    dto.metaTitle = entity.metaTitle;
    dto.metaDescription = entity.metaDescription;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
