import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { VersionedPublicCacheService } from '@core/cache/versioned-public-cache.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BlogQueryDto } from '../presentation/experience.dto';
import { publicHtml, publicUrl } from '../domain/public-content';

const blogSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImage: true,
  publishedAt: true,
  metaTitle: true,
  metaDescription: true,
  viewsCount: true,
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { fullName: true } },
} as const;
@Injectable()
export class ContentService {
  constructor(
    private readonly db: PrismaService,
    @Optional() private readonly cache?: VersionedPublicCacheService,
  ) {}
  async page(slug: string) {
    return this.cache
      ? this.cache.remember(`page:${encodeURIComponent(slug)}`, () => this.loadPage(slug))
      : this.loadPage(slug);
  }
  private async loadPage(slug: string) {
    const row = await this.db.page.findFirst({
      where: { slug, isPublished: true },
      select: {
        title: true,
        slug: true,
        content: true,
        metaTitle: true,
        metaDescription: true,
        updatedAt: true,
      },
    });
    if (!row) throw new NotFoundException('PAGE_NOT_FOUND');
    return { ...row, content: publicHtml(row.content) };
  }
  async posts(query: BlogQueryDto) {
    const where = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
      ...(query.categoryId && { blogCategoryId: query.categoryId }),
    };
    const [items, total] = await this.db.$transaction([
      this.db.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: blogSelect,
      }),
      this.db.blogPost.count({ where }),
    ]);
    return {
      items: items.map((row) => ({
        ...row,
        featuredImage: publicUrl(row.featuredImage),
        excerpt: row.excerpt ? publicHtml(row.excerpt) : null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async post(slug: string) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.blogPost.updateMany({
        where: { slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        data: { viewsCount: { increment: 1 } },
      });
      if (!result.count) throw new NotFoundException('POST_NOT_FOUND');
      const row = await tx.blogPost.findUniqueOrThrow({
        where: { slug },
        select: { ...blogSelect, content: true },
      });
      return {
        ...row,
        featuredImage: publicUrl(row.featuredImage),
        excerpt: row.excerpt ? publicHtml(row.excerpt) : null,
        content: publicHtml(row.content),
      };
    });
  }
  categories() {
    return this.db.blogCategory.findMany({
      where: {
        posts: {
          some: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 200,
      select: { id: true, name: true, slug: true, description: true },
    });
  }
  async faqs() {
    return this.cache ? this.cache.remember('faqs', () => this.loadFaqs()) : this.loadFaqs();
  }
  private async loadFaqs() {
    const rows = await this.db.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 200,
      select: { id: true, question: true, answer: true, category: true },
    });
    const groups = new Map<string, { id: string; question: string; answer: string }[]>();
    for (const row of rows) {
      const category = row.category ?? 'Chung';
      const items = groups.get(category) ?? [];
      items.push({
        id: row.id,
        question: row.question,
        answer: publicHtml(row.answer),
      });
      groups.set(category, items);
    }
    return [...groups].map(([category, items]) => ({ category, items }));
  }
  async banners(position: string) {
    const now = new Date();
    const rows = await this.db.banner.findMany({
      where: {
        position,
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        position: true,
      },
    });
    return rows
      .map((row) => ({
        ...row,
        imageUrl: publicUrl(row.imageUrl),
        linkUrl: publicUrl(row.linkUrl, true),
      }))
      .filter((row) => row.imageUrl);
  }
}
