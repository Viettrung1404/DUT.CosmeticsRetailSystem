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

export interface ListQuery {
  page?: number
  limit?: number
  order?: 'ASC' | 'DESC'
  search?: string
  isActive?: boolean
}
