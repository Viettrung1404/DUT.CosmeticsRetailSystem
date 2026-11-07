import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { autoSeo } from '@core/utils/seo.util';
import {
  BlogPostData,
  CmsEntity,
  CONTENT_REPOSITORY,
  IContentRepository,
} from '../../domain/repositories/content.repository.interface';

const CMS_LABEL: Record<CmsEntity, string> = {
  blogCategory: 'danh mục blog',
  page: 'trang tĩnh',
  faq: 'câu hỏi thường gặp',
  banner: 'banner',
  emailTemplate: 'mẫu email',
};

const CMS_REQUIRED: Record<CmsEntity, string[]> = {
  blogCategory: ['name'],
  page: ['title', 'content'],
  faq: ['question', 'answer'],
  banner: ['imageUrl', 'position'],
  emailTemplate: ['name', 'subject', 'html'],
};

export const slugify =(text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

// Duyệt đánh giá, blog + trang tĩnh + FAQ, banner
@Injectable()
export class ManageContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repository: IContentRepository) {}

  listReviews(input: { page: number; limit: number; isApproved?: boolean; productId?: string; rating?: number }) {
    return this.repository.findReviews({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      isApproved: input.isApproved,
      productId: input.productId,
      rating: input.rating,
    });
  }

  async moderateReview(id: string, approved: boolean, reply?: string) {
    const review = await this.repository.findReview(id);
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    const adminReply = reply === undefined ? undefined : reply.trim();
    return this.repository.moderateReview(id, approved, adminReply);
  }

  async replyReview(id: string, reply: string) {
    const review = await this.repository.findReview(id);
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    const text = reply.trim();
    if (!text) throw new BadRequestException('Nội dung trả lời không được để trống');
    return this.repository.moderateReview(id, review.isApproved, text);
  }

  listPosts(input: { page: number; limit: number; status?: string; categoryId?: string; search?: string }) {
    return this.repository.findPosts({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      status: input.status,
      categoryId: input.categoryId,
      search: input.search?.trim() || undefined,
    });
  }

  async createPost(authorId: string, input: Omit<BlogPostData, 'slug'> & { slug?: string }) {
    const slug = slugify(input.slug || input.title);
    if (!slug) throw new BadRequestException('Không tạo được đường dẫn từ tiêu đề');
    if (await this.repository.slugTaken('blogPost', slug)) {
      throw new ConflictException('Đường dẫn bài viết đã tồn tại');
    }
    await this.checkCategory(input.blogCategoryId);
    const seo = autoSeo({
      title: input.title,
      description: input.excerpt || input.content,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });
    return this.repository.createPost({ ...input, ...seo, title: input.title.trim(), slug, authorId });
  }

  async getPost(id: string) {
    const post = await this.repository.getPostDetail(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }

  // Bài đã đăng có thể đang được chia sẻ nên chỉ lưu trữ, không xóa
  async deletePost(id: string) {
    const post = await this.post(id);
    if (post.status !== 'DRAFT') {
      throw new ConflictException('Chỉ xóa được bài nháp; bài đã đăng hoặc hẹn giờ thì lưu trữ');
    }
    await this.repository.deletePost(id);
  }

  async updatePost(id: string, input: Partial<BlogPostData>) {
    const post = await this.post(id);
    if (post.status === 'ARCHIVED') throw new ConflictException('Bài viết đã lưu trữ, không sửa được');
    const data = { ...input };
    if (input.slug !== undefined) {
      data.slug = slugify(input.slug);
      if (!data.slug) throw new BadRequestException('Đường dẫn không hợp lệ');
      if (await this.repository.slugTaken('blogPost', data.slug, id)) {
        throw new ConflictException('Đường dẫn bài viết đã tồn tại');
      }
    }
    await this.checkCategory(input.blogCategoryId);
    return this.repository.updatePost(id, data);
  }

  async publishPost(id: string) {
    const post = await this.post(id);
    if (post.status === 'PUBLISHED') throw new ConflictException('Bài viết đã đăng');
    return this.repository.updatePost(id, { status: 'PUBLISHED', publishedAt: new Date() });
  }

  // Hẹn giờ, job 5 phút/lần đổi SCHEDULED → PUBLISHED
  async schedulePost(id: string, publishAt: Date) {
    const post = await this.post(id);
    if (!['DRAFT', 'SCHEDULED'].includes(post.status)) {
      throw new ConflictException('Chỉ hẹn giờ bài nháp hoặc bài đã hẹn');
    }
    if (publishAt <= new Date()) throw new BadRequestException('Giờ đăng phải ở tương lai');
    return this.repository.updatePost(id, { status: 'SCHEDULED', publishedAt: publishAt });
  }

  async archivePost(id: string) {
    const post = await this.post(id);
    if (post.status === 'ARCHIVED') throw new ConflictException('Bài viết đã lưu trữ');
    return this.repository.updatePost(id, { status: 'ARCHIVED' });
  }

  publishDue(now: Date = new Date()) {
    return this.repository.publishDue(now);
  }

  listCms(entity: CmsEntity, page: number, limit: number, where?: Record<string, unknown>) {
    return this.repository.listCms(entity, (page - 1) * limit, limit, where);
  }

  getCms(entity: CmsEntity, id: string) {
    return this.cms(entity, id);
  }

  async reorderCms(entity: 'faq' | 'banner', ids: string[]) {
    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new BadRequestException('Danh sách sắp xếp có id trùng');
    if ((await this.repository.countCms(entity, ids)) !== ids.length) {
      throw new BadRequestException(`Có ${CMS_LABEL[entity]} không tồn tại trong danh sách sắp xếp`);
    }
    await this.repository.reorderCms(entity, ids);
  }

  async createCms(entity: CmsEntity, data: Record<string, unknown>) {
    const missing = CMS_REQUIRED[entity].filter((field) => data[field] === undefined || data[field] === null);
    if (missing.length) {
      throw new BadRequestException(`Tạo ${CMS_LABEL[entity]} cần có: ${missing.join(', ')}`);
    }
    const prepared = await this.prepareCms(entity, data);
    return this.repository.createCms(entity, prepared);
  }

  async updateCms(entity: CmsEntity, id: string, data: Record<string, unknown>) {
    await this.cms(entity, id);
    const prepared = await this.prepareCms(entity, data, id);
    return this.repository.updateCms(entity, id, prepared);
  }

  async deleteCms(entity: CmsEntity, id: string) {
    await this.cms(entity, id);
    if (entity === 'blogCategory' && (await this.repository.categoryInUse(id))) {
      throw new ConflictException('Danh mục còn bài viết, chuyển bài sang danh mục khác trước');
    }
    await this.repository.deleteCms(entity, id);
  }

  private async prepareCms(entity: CmsEntity, data: Record<string, unknown>, id?: string) {
    const prepared = { ...data };
    if (entity === 'emailTemplate' && (await this.repository.templateNameTaken(data.name as string, id))) {
      throw new ConflictException('Tên mẫu email đã tồn tại');
    }
    if (entity === 'page' && !id) {
      Object.assign(
        prepared,
        autoSeo({
          title: data.title as string,
          description: data.content as string,
          metaTitle: data.metaTitle as string | null | undefined,
          metaDescription: data.metaDescription as string | null | undefined,
        }),
      );
    }
    if (entity === 'blogCategory' || entity === 'page') {
      // Sửa tên / tiêu đề không đổi đường dẫn cũ (link đã chia sẻ); chỉ đổi khi gửi slug mới
      const source = id
        ? (data.slug as string | undefined)
        : ((data.slug as string | undefined) || (data.name as string | undefined) || (data.title as string | undefined));
      if (source !== undefined) {
        const slug = slugify(source ?? '');
        if (!slug) throw new BadRequestException('Đường dẫn không hợp lệ');
        if (await this.repository.slugTaken(entity, slug, id)) {
          throw new ConflictException('Đường dẫn đã tồn tại');
        }
        prepared.slug = slug;
      }
    }
    if (entity === 'banner' && data.startDate && data.endDate && (data.endDate as Date) <= (data.startDate as Date)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
    return prepared;
  }

  private async cms(entity: CmsEntity, id: string) {
    const row = await this.repository.findCms(entity, id);
    if (!row) throw new NotFoundException(`Không tìm thấy ${CMS_LABEL[entity]}`);
    return row;
  }

  private async post(id: string) {
    const post = await this.repository.findPost(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }

  private async checkCategory(id: string | null | undefined) {
    if (id && !(await this.repository.findCms('blogCategory', id))) {
      throw new BadRequestException('Danh mục blog không tồn tại');
    }
  }
}
