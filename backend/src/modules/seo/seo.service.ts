import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { webOrigin } from '@core/config/runtime-config';

export const xmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (x) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[x]!,
  );
const sources = ['products', 'categories', 'blog', 'pages'] as const;
type Source = (typeof sources)[number];
const size = 1000;
const reserved = new Set([
  'api',
  'auth',
  'admin',
  'cart',
  'checkout',
  'account',
  'products',
  'categories',
  'blog',
  'sitemap.xml',
  'robots.txt',
]);

@Injectable()
export class SeoService {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {}
  private get origin() {
    const value = this.config.get<string>('PUBLIC_WEB_URL');
    if (!value) throw new ServiceUnavailableException('PUBLIC_WEB_URL_REQUIRED');
    return webOrigin(value, this.config.get('NODE_ENV') === 'production');
  }
  private productWhere() {
    return {
      isActive: true,
      category: { isActive: true },
      variants: { some: { isActive: true } },
      OR: [{ brandId: null }, { brand: { isActive: true } }],
    };
  }
  private pageWhere() {
    return { isPublished: true, slug: { notIn: ['.', '..', ...reserved] } };
  }
  private count(source: Source) {
    if (source === 'products') return this.db.product.count({ where: this.productWhere() });
    if (source === 'categories') return this.categoryCount();
    if (source === 'blog')
      return this.db.blogPost.count({
        where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      });
    return this.db.page.count({ where: this.pageWhere() });
  }
  private rows(
    source: Source,
    page: number,
  ): Promise<{ slug: string; updatedAt?: Date; contentUpdatedAt?: Date }[]> {
    const pagination = {
      orderBy: { id: 'asc' as const },
      skip: (page - 1) * size,
      take: size,
    };
    const select = { slug: true, updatedAt: true };
    if (source === 'products')
      return this.db.product.findMany({
        ...pagination,
        where: this.productWhere(),
        select,
      });
    if (source === 'categories') return this.categoryRows(page);
    if (source === 'blog')
      return this.db.blogPost.findMany({
        ...pagination,
        where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        select: { slug: true, contentUpdatedAt: true },
      });
    return this.db.page.findMany({
      ...pagination,
      where: this.pageWhere(),
      select,
    });
  }
  private async categoryCount() {
    const rows = await this.db.$queryRaw<{ total: bigint }[]>`WITH RECURSIVE visible AS (
      SELECT id FROM categories WHERE parent_id IS NULL AND is_active
      UNION ALL SELECT c.id FROM categories c JOIN visible parent ON c.parent_id=parent.id WHERE c.is_active)
      SELECT count(*) AS total FROM visible`;
    return Number(rows[0].total);
  }
  private categoryRows(page: number) {
    return this.db.$queryRaw<{ slug: string; updatedAt: Date }[]>`WITH RECURSIVE visible AS (
      SELECT id,slug,updated_at FROM categories WHERE parent_id IS NULL AND is_active
      UNION ALL SELECT c.id,c.slug,c.updated_at FROM categories c JOIN visible parent ON c.parent_id=parent.id WHERE c.is_active)
      SELECT slug,updated_at AS "updatedAt" FROM visible ORDER BY id LIMIT ${size} OFFSET ${(page - 1) * size}`;
  }
  async index() {
    const origin = this.origin;
    const counts = await Promise.all(sources.map((source) => this.count(source)));
    const entries: string[] = [];
    if (counts.reduce((total, count) => total + Math.ceil(count / size), 0) > 50000)
      throw new ServiceUnavailableException('SITEMAP_INDEX_LIMIT_EXCEEDED');
    sources.forEach((source, i) => {
      for (let page = 1; page <= Math.ceil(counts[i] / size); page++)
        entries.push(
          `<sitemap><loc>${xmlEscape(`${origin}/sitemaps/${source}/${page}.xml`)}</loc></sitemap>`,
        );
    });
    if (entries.length > 50000)
      throw new ServiceUnavailableException('SITEMAP_INDEX_LIMIT_EXCEEDED');
    return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</sitemapindex>`;
  }
  async sitemap(source: string, page: number) {
    if (
      !sources.includes(source as Source) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 50000
    )
      throw new BadRequestException('INVALID_SITEMAP_PART');
    const kind = source as Source;
    const origin = this.origin;
    const rows = await this.rows(kind, page);
    const urls = rows
      .filter(
        (row: { slug: string }) =>
          !['.', '..'].includes(row.slug) &&
          (kind !== 'pages' || !reserved.has(row.slug.toLowerCase())),
      )
      .map((row: { slug: string; updatedAt?: Date; contentUpdatedAt?: Date }) => {
        const prefix = kind === 'pages' ? '' : kind === 'blog' ? '/blog' : `/${kind}`;
        const loc = `${origin}${prefix}/${encodeURIComponent(row.slug)}`;
        return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${(row.contentUpdatedAt ?? row.updatedAt)!.toISOString()}</lastmod></url>`;
      });
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  }
  robots() {
    const origin = this.origin;
    return this.config.get('SEO_INDEXING_ENABLED') === 'true'
      ? `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n';
  }
}
