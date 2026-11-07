import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/decorators/public.decorator';
import { CustomerOnlyGuard } from '@modules/customer-commerce/presentation/customer-only.guard';
import { ReviewsService } from '../application/reviews.service';
import { ContentService } from '../application/content.service';
import { BannerQueryDto, BlogQueryDto, CreateReviewDto, ReviewQueryDto } from './experience.dto';
import { ExperienceResponse } from './experience.responses';
import { CommerceErrors } from '@modules/customer-commerce/presentation/commerce.responses';

@ApiTags('Customer - Reviews and Content')
@CommerceErrors()
@Controller()
export class ExperienceController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly content: ContentService,
  ) {}
  @Post('reviews')
  @UseGuards(CustomerOnlyGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Đánh giá sản phẩm đã mua trong đơn COMPLETED; một review/product/customer',
  })
  @ExperienceResponse('review', 201)
  create(@Req() req: { user: { userId: string } }, @Body() input: CreateReviewDto) {
    return this.reviews.create(req.user.userId, input);
  }
  @Public()
  @Get('customer/products/:id/reviews')
  @ApiOperation({
    summary: 'Review đã duyệt, histogram và aggregate, không trả thông tin riêng của khách',
  })
  @ExperienceResponse('reviews')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() query: ReviewQueryDto) {
    return this.reviews.list(id, query);
  }
  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Trang đã xuất bản, nội dung HTML an toàn' })
  @ExperienceResponse('page')
  page(@Param('slug') slug: string) {
    return this.content.page(slug);
  }
  @Public()
  @Get('blog/posts')
  @ApiOperation({ summary: 'Bài viết PUBLISHED đã tới thời điểm xuất bản' })
  @ExperienceResponse('posts')
  posts(@Query() query: BlogQueryDto) {
    return this.content.posts(query);
  }
  @Public()
  @Get('blog/posts/:slug')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Chi tiết bài viết và tăng một lượt xem thành công',
  })
  @ExperienceResponse('post')
  post(@Param('slug') slug: string) {
    return this.content.post(slug);
  }
  @Public()
  @Get('blog/categories')
  @ApiOperation({ summary: 'Danh mục có bài đã xuất bản' })
  @ExperienceResponse('categories')
  categories() {
    return this.content.categories();
  }
  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'FAQ đang hoạt động, nhóm theo category' })
  @ExperienceResponse('faqs')
  faqs() {
    return this.content.faqs();
  }
  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Banner đúng lịch, vị trí và URL hợp lệ' })
  @ExperienceResponse('banners')
  banners(@Query() query: BannerQueryDto) {
    return this.content.banners(query.position);
  }
}
