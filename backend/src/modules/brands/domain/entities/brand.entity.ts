export interface BrandProps {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  countryOfOrigin?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BrandChanges = Partial<Omit<BrandProps, 'id' | 'createdAt' | 'updatedAt'>>;

export class BrandEntity {
  private props: BrandProps;

  constructor(props: BrandProps) {
    this.props = {
      ...props,
      name: BrandEntity.validateName(props.name),
      sortOrder: props.sortOrder ?? 0,
      isFeatured: props.isFeatured ?? false,
      isActive: props.isActive ?? true,
    };
  }

  get id(): string | undefined { return this.props.id; }
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get logoUrl(): string | null | undefined { return this.props.logoUrl; }
  get bannerUrl(): string | null | undefined { return this.props.bannerUrl; }
  get description(): string | null | undefined { return this.props.description; }
  get countryOfOrigin(): string | null | undefined { return this.props.countryOfOrigin; }
  get websiteUrl(): string | null | undefined { return this.props.websiteUrl; }
  get sortOrder(): number { return this.props.sortOrder!; }
  get isFeatured(): boolean { return this.props.isFeatured!; }
  get isActive(): boolean { return this.props.isActive!; }
  get metaTitle(): string | null | undefined { return this.props.metaTitle; }
  get metaDescription(): string | null | undefined { return this.props.metaDescription; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  update(changes: BrandChanges): void {
    const { name, slug, sortOrder, isFeatured, isActive, ...nullableFields } = changes;
    this.props = {
      ...this.props,
      ...nullableFields,
      name: name == null ? this.props.name : BrandEntity.validateName(name),
      slug: slug ?? this.props.slug,
      sortOrder: sortOrder ?? this.props.sortOrder,
      isFeatured: isFeatured ?? this.props.isFeatured,
      isActive: isActive ?? this.props.isActive,
    };
  }

  private static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new Error('Tên thương hiệu không được để trống');
    }
    return name.trim();
  }
}
