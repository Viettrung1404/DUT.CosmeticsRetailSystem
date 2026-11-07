import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ManageContentUseCase } from '../../application/use-cases/manage-content.use-case';
import { CmsEntity } from '../../domain/repositories/content.repository.interface';
import {
  BannerDto,
  BlogCategoryDto,
  BannerQueryDto,
  BlogPostQueryDto,
  CreateBlogPostDto,
  FaqDto,
  FaqQueryDto,
  PageContentDto,
  ReorderDto,
  ReviewQueryDto,
  ReviewReplyDto,
  ScheduleBlogPostDto,
  UpdateBlogPostDto,
} from '../dtos/marketing-request.dto';

const page = <T>(query: PageOptionsDto, result: { items: T[]; total: number }) =>
  new PageDto(result.items, new PageMetaDto({ pageOptionsDto: query, itemCount: result.total }));

@ApiTags('Admin - Marketing (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class ContentAdminController {
  constructor(private readonly content: ManageContentUseCase) {}

  @Get('reviews')
  @RequirePermissions('CUSTOMER_FEEDBACK_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách đánh giá (lọc chờ duyệt, sản phẩm, số sao)' })
  async reviews(@Query() query: ReviewQueryDto) {
    return page(
      query,
      await this.content.listReviews({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        isApproved: query.isApproved,
        productId: query.productId,
        rating: query.rating,
      }),
    );
  }

  @Put('reviews/:id/approve')
  @RequirePermissions('CUSTOMER_FEEDBACK_MANAGE')
  @ApiOperation({ summary: 'Admin - Duyệt đánh giá (kèm trả lời nếu có), tính lại sao trung bình sản phẩm' })
  approveReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReplyDto) {
    return this.content.moderateReview(id, true, dto.reply);
  }

  @Put('reviews/:id/reject')
  @RequirePermissions('CUSTOMER_FEEDBACK_MANAGE')
  @ApiOperation({ summary: 'Admin - Ẩn / từ chối đánh giá' })
  rejectReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReplyDto) {
    return this.content.moderateReview(id, false, dto.reply);
  }

  @Put('reviews/:id/reply')
  @RequirePermissions('CUSTOMER_FEEDBACK_MANAGE')
  @ApiOperation({ summary: 'Admin - Trả lời đánh giá (giữ trạng thái duyệt)' })
  replyReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReplyDto) {
    return this.content.replyReview(id, dto.reply ?? '');
  }

  @Get('blog/posts')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách bài viết blog (mọi trạng thái)' })
  async posts(@Query() query: BlogPostQueryDto) {
    return page(
      query,
      await this.content.listPosts({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        status: query.status,
        categoryId: query.categoryId,
        search: query.search,
      }),
    );
  }

  @Post('blog/posts')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Viết bài (lưu nháp)' })
  createPost(@CurrentUser('userId') userId: string, @Body() dto: CreateBlogPostDto) {
    return this.content.createPost(userId, {
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      excerpt: dto.excerpt ?? null,
      featuredImage: dto.featuredImage ?? null,
      blogCategoryId: dto.blogCategoryId ?? null,
      metaTitle: dto.metaTitle ?? null,
      metaDescription: dto.metaDescription ?? null,
    });
  }

  @Get('blog/posts/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết bài viết (đủ nội dung để soạn)' })
  getPost(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getPost(id);
  }

  @Delete('blog/posts/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa bài nháp (bài đã đăng thì lưu trữ)' })
  async deletePost(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deletePost(id);
    return { message: 'Đã xóa bài viết', data: null };
  }

  @Put('blog/posts/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa bài' })
  updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlogPostDto) {
    return this.content.updatePost(id, dto);
  }

  @Put('blog/posts/:id/publish')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Đăng ngay' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.publishPost(id);
  }

  @Put('blog/posts/:id/schedule')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Hẹn giờ đăng (job 5 phút/lần)' })
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleBlogPostDto) {
    return this.content.schedulePost(id, dto.publishAt);
  }

  @Put('blog/posts/:id/archive')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Lưu trữ (gỡ khỏi trang khách)' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.archivePost(id);
  }

  @Get('blog/categories')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh mục blog' })
  async categories(@Query() query: PageOptionsDto) {
    return this.listCms('blogCategory', query);
  }

  @Get('blog/categories/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết danh mục blog' })
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCms('blogCategory', id);
  }

  @Post('blog/categories')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm danh mục blog' })
  createCategory(@Body() dto: BlogCategoryDto) {
    return this.content.createCms('blogCategory', { ...dto });
  }

  @Put('blog/categories/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa danh mục blog' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BlogCategoryDto) {
    return this.content.updateCms('blogCategory', id, { ...dto });
  }

  @Delete('blog/categories/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa danh mục blog chưa có bài' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deleteCms('blogCategory', id);
    return { message: 'Đã xóa danh mục blog', data: null };
  }

  @Get('pages')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Trang tĩnh (giới thiệu, chính sách...)' })
  pages(@Query() query: PageOptionsDto) {
    return this.listCms('page', query);
  }

  @Get('pages/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết trang tĩnh' })
  getPage(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCms('page', id);
  }

  @Post('pages')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm trang tĩnh; trường SEO để trống thì tự sinh' })
  createPage(@Body() dto: PageContentDto) {
    return this.content.createCms('page', { ...dto });
  }

  @Put('pages/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa trang tĩnh' })
  updatePage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PageContentDto) {
    return this.content.updateCms('page', id, { ...dto });
  }

  @Delete('pages/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa trang tĩnh' })
  async deletePage(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deleteCms('page', id);
    return { message: 'Đã xóa trang tĩnh', data: null };
  }

  @Get('faqs')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Câu hỏi thường gặp' })
  faqs(@Query() query: FaqQueryDto) {
    return this.listCms('faq', query, query.category ? { category: query.category } : undefined);
  }

  @Put('faqs/reorder')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Sắp xếp lại câu hỏi (kéo thả), gửi danh sách id theo thứ tự mới' })
  async reorderFaqs(@Body() dto: ReorderDto) {
    await this.content.reorderCms('faq', dto.ids);
    return { message: 'Đã sắp xếp lại câu hỏi', data: null };
  }

  @Get('faqs/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết câu hỏi' })
  getFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCms('faq', id);
  }

  @Post('faqs')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm câu hỏi' })
  createFaq(@Body() dto: FaqDto) {
    return this.content.createCms('faq', { ...dto });
  }

  @Put('faqs/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa câu hỏi' })
  updateFaq(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FaqDto) {
    return this.content.updateCms('faq', id, { ...dto });
  }

  @Delete('faqs/:id')
  @RequirePermissions('MARKETING_BLOG_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa câu hỏi' })
  async deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deleteCms('faq', id);
    return { message: 'Đã xóa câu hỏi', data: null };
  }

  @Get('banners')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Banner trang chủ web / app' })
  banners(@Query() query: BannerQueryDto) {
    return this.listCms('banner', query, query.position ? { position: query.position } : undefined);
  }

  @Put('banners/reorder')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sắp xếp lại banner (kéo thả), gửi danh sách id theo thứ tự mới' })
  async reorderBanners(@Body() dto: ReorderDto) {
    await this.content.reorderCms('banner', dto.ids);
    return { message: 'Đã sắp xếp lại banner', data: null };
  }

  @Get('banners/:id')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết banner' })
  getBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCms('banner', id);
  }

  @Post('banners')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm banner' })
  createBanner(@Body() dto: BannerDto) {
    return this.content.createCms('banner', { ...dto });
  }

  @Put('banners/:id')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa banner' })
  updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BannerDto) {
    return this.content.updateCms('banner', id, { ...dto });
  }

  @Delete('banners/:id')
  @RequirePermissions('MARKETING_BANNER_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa banner' })
  async deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deleteCms('banner', id);
    return { message: 'Đã xóa banner', data: null };
  }

  private async listCms(entity: CmsEntity, query: PageOptionsDto, where?: Record<string, unknown>) {
    return page(query, await this.content.listCms(entity, query.page ?? 1, query.limit ?? 20, where));
  }
}
