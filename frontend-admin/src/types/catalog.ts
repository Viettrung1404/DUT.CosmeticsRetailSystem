export interface PageMeta {
  page: number
  limit: number
  itemCount: number
  pageCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface PageResult<T> {
  data: T[]
  meta: PageMeta
}

export interface Category {
  id: string
  parentId?: string | null
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  sortOrder: number
  isActive: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  createdAt?: string
  updatedAt?: string
  children?: Category[]
}

export interface CategoryPayload {
  parentId?: string | null
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  sortOrder?: number
  isActive?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
}

export interface Brand {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  bannerUrl?: string | null
  description?: string | null
  countryOfOrigin?: string | null
  websiteUrl?: string | null
  sortOrder: number
  isFeatured: boolean
  isActive: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BrandPayload {
  name: string
  slug: string
  logoUrl?: string | null
  bannerUrl?: string | null
  description?: string | null
  countryOfOrigin?: string | null
  websiteUrl?: string | null
  sortOrder?: number
  isFeatured?: boolean
  isActive?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
}

export interface ProductVariant {
  id?: string
  productId?: string
  sku: string
  barcode?: string | null
  option1Value?: string | null
  option2Value?: string | null
  option3Value?: string | null
  price: number
  costPrice?: number
  weight?: number | null
  unit?: string | null
  stockQuantity?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductVariantPayload {
  sku: string
  barcode?: string | null
  option1Value?: string | null
  option2Value?: string | null
  option3Value?: string | null
  price: number
  costPrice: number
  weight?: number | null
  unit?: string | null
  isActive?: boolean
}

export interface ProductImage {
  id?: string
  imageUrl: string
  altText?: string | null
  sortOrder: number
  isPrimary: boolean
  productVariantId?: string | null
}

export interface ProductImagePayload {
  imageUrl: string
  altText?: string | null
  sortOrder?: number
  isPrimary?: boolean
}

export interface Product {
  id: string
  categoryId: string
  brandId?: string | null
  brandName?: string | null
  categoryName?: string
  primaryImage?: string | null
  name: string
  slug: string
  sku: string
  description?: string | null
  shortDescription?: string | null
  basePrice: number
  salePrice?: number | null
  isActive: boolean
  isFeatured: boolean
  avgRating?: number
  totalReviews?: number
  totalSold?: number
  option1Name?: string | null
  option2Name?: string | null
  option3Name?: string | null
  variants: ProductVariant[]
  images?: ProductImage[]
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductPayload {
  categoryId: string
  brandId?: string | null
  name: string
  slug: string
  sku: string
  description?: string | null
  shortDescription?: string | null
  basePrice: number
  salePrice?: number | null
  option1Name?: string | null
  option2Name?: string | null
  option3Name?: string | null
  isActive?: boolean
  isFeatured?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  variants: ProductVariantPayload[]
  images?: ProductImagePayload[]
}

export interface ProductUpdatePayload extends Omit<Partial<ProductPayload>, 'variants'> {}

export interface ListQuery {
  page?: number
  limit?: number
  order?: 'ASC' | 'DESC'
  search?: string
  isActive?: boolean
}

export interface ProductListQuery extends ListQuery {
  categoryId?: string
  brandId?: string
}
