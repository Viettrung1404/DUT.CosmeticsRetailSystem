import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ReviewsService } from '@modules/customer-experience/application/reviews.service';
import {
  BlogPostData,
  CmsEntity,
  IContentRepository,
  ReviewView,
} from '../../domain/repositories/content.repository.interface';

const REVIEW_INCLUDE = {
  product: { select: { name: true } },
  customer: { select: { user: { select: { fullName: true } } } },
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

const toReview = (r: ReviewRow): ReviewView => ({
  id: r.id,
  productId: r.productId,
  productName: r.product.name,
  customerName: r.customer.user?.fullName ?? null,
  rating: r.rating,
  title: r.title,
  content: r.content,
  isVerifiedPurchase: r.isVerifiedPurchase,
  isApproved: r.isApproved,
  adminReply: r.adminReply,
  createdAt: r.createdAt,
});

const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  featuredImage: true,
  blogCategoryId: true,
  status: true,
  publishedAt: true,
  metaTitle: true,
  metaDescription: true,
  viewsCount: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  author: { select: { fullName: true } },
} satisfies Prisma.BlogPostSelect;

const CMS_ORDER: Record<CmsEntity, object> = {
  blogCategory: { name: 'asc' },
  page: [{ sortOrder: 'asc' }, { title: 'asc' }],
  faq: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  banner: [{ position: 'asc' }, { sortOrder: 'asc' }],
  emailTemplate: { name: 'asc' },
};

// Bốn bảng có chung thao tác CRUD; ép kiểu về một delegate tối thiểu để dùng chung
type CmsDelegate = {
  findMany(args: object): Promise<unknown[]>;
  count(args?: object): Promise<number>;
  findUnique(args: object): Promise<unknown | null>;
  create(args: object): Promise<unknown>;
  update(args: object): Promise<unknown>;
  delete(args: object): Promise<unknown>;
};

@Injectable()
export class PrismaContentRepository implements IContentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
  ) {}

  async findReviews(filter: { skip: number; take: number; isApproved?: boolean; productId?: string; rating?: number }) {
    const where: Prisma.ReviewWhereInput = {
      isApproved: filter.isApproved,
      productId: filter.productId,
      rating: filter.rating,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items: rows.map(toReview), total };
  }

  async findReview(id: string) {
    const row = await this.prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
    return row ? toReview(row) : null;
  }

  async moderateReview(id: string, approved: boolean, adminReply?: string) {
    await this.prisma.$transaction((tx) => this.reviews.moderate(tx, id, approved, adminReply));
    return (await this.findReview(id))!;
  }

  async findPosts(filter: { skip: number; take: number; status?: string; categoryId?: string; search?: string }) {
    const where: Prisma.BlogPostWhereInput = {
      status: filter.status,
      blogCategoryId: filter.categoryId,
      title: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        select: POST_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items, total };
  }

  findPost(id: string) {
    return this.prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, status: true, slug: true, publishedAt: true },
    });
  }

  getPostDetail(id: string) {
    return this.prisma.blogPost.findUnique({
      where: { id },
      select: { ...POST_SELECT, content: true, metaTitle: true, metaDescription: true },
    });
  }

  async deletePost(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async slugTaken(table: 'blogPost' | 'blogCategory' | 'page', slug: string, exceptId?: string) {
    const where = { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) };
    const count =
      table === 'blogPost'
        ? await this.prisma.blogPost.count({ where })
        : table === 'blogCategory'
          ? await this.prisma.blogCategory.count({ where })
          : await this.prisma.page.count({ where });
    return count > 0;
  }

  createPost(data: BlogPostData & { authorId: string }) {
    return this.prisma.blogPost.create({ data: { ...data, status: 'DRAFT' }, select: POST_SELECT });
  }

  updatePost(id: string, data: Partial<BlogPostData> & { status?: string; publishedAt?: Date | null }) {
    const contentChanged = data.content !== undefined || data.title !== undefined;
    return this.prisma.blogPost.update({
      where: { id },
      data: { ...data, ...(contentChanged ? { contentUpdatedAt: new Date() } : {}) },
      select: POST_SELECT,
    });
  }

  async publishDue(now: Date) {
    const result = await this.prisma.blogPost.updateMany({
      where: { status: 'SCHEDULED', publishedAt: { lte: now } },
      data: { status: 'PUBLISHED' },
    });
    return result.count;
  }

  async listCms(entity: CmsEntity, skip: number, take: number, where: Record<string, unknown> = {}) {
    const delegate = this.delegate(entity);
    const [items, total] = await Promise.all([
      delegate.findMany({ where, orderBy: CMS_ORDER[entity], skip, take }),
      delegate.count({ where }),
    ]);
    return { items, total };
  }

  countCms(entity: CmsEntity, ids: string[]) {
    return this.delegate(entity).count({ where: { id: { in: ids } } });
  }

  async reorderCms(entity: 'faq' | 'banner', ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        entity === 'faq'
          ? this.prisma.faq.update({ where: { id }, data: { sortOrder } })
          : this.prisma.banner.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  }

  findCms(entity: CmsEntity, id: string) {
    return this.delegate(entity).findUnique({ where: { id } });
  }

  createCms(entity: CmsEntity, data: Record<string, unknown>) {
    return this.delegate(entity).create({ data });
  }

  updateCms(entity: CmsEntity, id: string, data: Record<string, unknown>) {
    return this.delegate(entity).update({ where: { id }, data });
  }

  async deleteCms(entity: CmsEntity, id: string) {
    await this.delegate(entity).delete({ where: { id } });
  }

  async categoryInUse(id: string) {
    return (await this.prisma.blogPost.count({ where: { blogCategoryId: id } })) > 0;
  }

  async templateNameTaken(name: string, exceptId?: string) {
    const where = { name, ...(exceptId ? { NOT: { id: exceptId } } : {}) };
    return (await this.prisma.emailTemplate.count({ where })) > 0;
  }

  private delegate(entity: CmsEntity): CmsDelegate {
    return this.prisma[entity] as unknown as CmsDelegate;
  }
}
