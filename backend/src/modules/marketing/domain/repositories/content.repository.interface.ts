export const CONTENT_REPOSITORY = Symbol('IContentRepository');

export const BLOG_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;

export interface ReviewView {
  id: string;
  productId: string;
  productName: string;
  customerName: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  adminReply: string | null;
  createdAt: Date;
}

export interface BlogPostData {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  blogCategoryId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export type CmsEntity = 'blogCategory' | 'page' | 'faq' | 'banner' | 'emailTemplate';

export interface IContentRepository {
  findReviews(filter: {
    skip: number;
    take: number;
    isApproved?: boolean;
    productId?: string;
    rating?: number;
  }): Promise<{ items: ReviewView[]; total: number }>;
  findReview(id: string): Promise<ReviewView | null>;
  // Gọi ReviewsService.moderate của Trung trong cùng giao dịch: cập nhật trạng thái + tính lại avg_rating
  moderateReview(id: string, approved: boolean, adminReply?: string): Promise<ReviewView>;

  findPosts(filter: {
    skip: number;
    take: number;
    status?: string;
    categoryId?: string;
    search?: string;
  }): Promise<{ items: unknown[]; total: number }>;
  findPost(id: string): Promise<{ id: string; status: string; slug: string; publishedAt: Date | null } | null>;
  // Đủ nội dung bài để mở trình soạn thảo
  getPostDetail(id: string): Promise<unknown | null>;
  deletePost(id: string): Promise<void>;
  slugTaken(table: 'blogPost' | 'blogCategory' | 'page', slug: string, exceptId?: string): Promise<boolean>;
  createPost(data: BlogPostData & { authorId: string }): Promise<unknown>;
  updatePost(id: string, data: Partial<BlogPostData> & { status?: string; publishedAt?: Date | null }): Promise<unknown>;
  // SCHEDULED tới giờ → PUBLISHED
  publishDue(now: Date): Promise<number>;

  // Thực thể CMS đơn giản (danh mục blog, trang tĩnh, FAQ, banner): CRUD chung
  listCms(
    entity: CmsEntity,
    skip: number,
    take: number,
    where?: Record<string, unknown>,
  ): Promise<{ items: unknown[]; total: number }>;
  findCms(entity: CmsEntity, id: string): Promise<unknown | null>;
  createCms(entity: CmsEntity, data: Record<string, unknown>): Promise<unknown>;
  updateCms(entity: CmsEntity, id: string, data: Record<string, unknown>): Promise<unknown>;
  deleteCms(entity: CmsEntity, id: string): Promise<void>;
  countCms(entity: CmsEntity, ids: string[]): Promise<number>;
  // Thứ tự mới theo vị trí trong mảng, ghi trong một giao dịch
  reorderCms(entity: 'faq' | 'banner', ids: string[]): Promise<void>;
  categoryInUse(id: string): Promise<boolean>;
  templateNameTaken(name: string, exceptId?: string): Promise<boolean>;
}
