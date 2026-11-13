import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000031' })
  id: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productId: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: 'Nguyễn Thu H.', nullable: true, type: String })
  customerName: string | null;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty({ example: 'Dùng rất dịu', nullable: true, type: String })
  title: string | null;

  @ApiProperty({ example: 'Da mềm sau một tuần sử dụng', nullable: true, type: String })
  content: string | null;

  @ApiProperty({ example: true })
  isVerifiedPurchase: boolean;

  @ApiProperty({ example: false })
  isApproved: boolean;

  @ApiProperty({ example: 'Cảm ơn bạn đã đánh giá!', nullable: true, type: String })
  adminReply: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class BlogPostResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000032' })
  id: string;

  @ApiProperty({ example: 'Quy trình dưỡng ẩm buổi tối' })
  title: string;

  @ApiProperty({ example: 'quy-trinh-duong-am-buoi-toi' })
  slug: string;

  @ApiProperty({ example: '<p>Nội dung bài viết</p>' })
  content: string;

  @ApiProperty({ example: 'Tóm tắt ngắn', nullable: true, type: String })
  excerpt: string | null;

  @ApiProperty({ example: 'https://cdn.example/blog/a.webp', nullable: true, type: String })
  featuredImage: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  blogCategoryId: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  authorId: string | null;

  @ApiProperty({ example: 'DRAFT', description: 'Trạng thái bài viết (ví dụ DRAFT)' })
  status: string;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  publishedAt: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  metaTitle: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  metaDescription: string | null;

  @ApiProperty({ example: 0 })
  viewsCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  contentUpdatedAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class BlogCategoryResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000033' })
  id: string;

  @ApiProperty({ example: 'Kiến thức làm đẹp' })
  name: string;

  @ApiProperty({ example: 'kien-thuc-lam-dep' })
  slug: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  description: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class PageContentResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000034' })
  id: string;

  @ApiProperty({ example: 'Chính sách đổi trả' })
  title: string;

  @ApiProperty({ example: 'chinh-sach-doi-tra' })
  slug: string;

  @ApiProperty({ example: '<p>Nội dung trang</p>' })
  content: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  metaTitle: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  metaDescription: string | null;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class FaqResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000035' })
  id: string;

  @ApiProperty({ example: 'Thời gian giao hàng là bao lâu?' })
  question: string;

  @ApiProperty({ example: 'Từ 1 đến 3 ngày làm việc.' })
  answer: string;

  @ApiProperty({ example: 'Giao hàng', nullable: true, type: String })
  category: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class BannerResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000036' })
  id: string;

  @ApiProperty({ example: 'Khuyến mãi tháng 11', nullable: true, type: String })
  title: string | null;

  @ApiProperty({ example: 'https://cdn.example/banner/nov.webp' })
  imageUrl: string;

  @ApiProperty({ example: '/khuyen-mai', nullable: true, type: String })
  linkUrl: string | null;

  @ApiProperty({ example: 'HOME_HERO' })
  position: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  startDate: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  endDate: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class EmailTemplateResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000037' })
  id: string;

  @ApiProperty({ example: 'Chào mừng thành viên mới' })
  name: string;

  @ApiProperty({ example: 'Chào mừng bạn đến GlowUp' })
  subject: string;

  @ApiProperty({ example: '<h1>Xin chào {{fullName}}</h1>' })
  html: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class CampaignResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000038' })
  id: string;

  @ApiProperty({ example: 'Ưu đãi cuối tuần' })
  name: string;

  @ApiProperty({ enum: ['PUSH', 'EMAIL'], example: 'PUSH' })
  channel: string;

  @ApiProperty({ enum: ['ALL', 'TIER', 'CUSTOMERS'], example: 'ALL' })
  audienceType: string;

  @ApiProperty({ example: null, nullable: true, type: Object, description: 'Điều kiện lọc khách (tier, danh sách khách, nhóm RFM)' })
  audienceValue: Record<string, unknown> | null;

  @ApiProperty({ example: 'Giảm 20% mỹ phẩm' })
  title: string;

  @ApiProperty({ example: 'Áp dụng đến hết Chủ nhật' })
  content: string;

  @ApiProperty({ enum: ['PRODUCT', 'PROMOTION', 'BLOG'], example: 'PROMOTION', nullable: true, type: String })
  route: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  resourceId: string | null;

  @ApiProperty({ enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'], example: 'DRAFT' })
  status: string;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  scheduledAt: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  sentAt: Date | null;

  @ApiProperty({ example: 0 })
  recipientCount: number;

  @ApiProperty({ example: 0 })
  sendVersion: number;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000050' })
  createdBy: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

class CampaignPushStatsDto {
  @ApiProperty({ example: 120 })
  recipients: number;

  @ApiProperty({ example: 110 })
  delivered: number;

  @ApiProperty({ example: { sent: 110, failed: 10 }, description: 'Số lượng theo trạng thái gửi' })
  deliveries: Record<string, number>;
}

class CampaignEngagementDto {
  @ApiProperty({ example: 80 })
  opens: number;

  @ApiProperty({ example: 60 })
  uniqueOpens: number;

  @ApiProperty({ example: 25 })
  clicks: number;

  @ApiProperty({ example: 20 })
  uniqueClicks: number;

  @ApiProperty({ example: 0.5 })
  openRate: number;

  @ApiProperty({ example: 0.17 })
  clickRate: number;

  @ApiProperty({ example: [{ url: '/khuyen-mai', clicks: 12 }] })
  topLinks: { url: string; clicks: number }[];
}

export class CampaignStatsResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000038' })
  campaignId: string;

  @ApiProperty({ enum: ['PUSH', 'EMAIL'], example: 'EMAIL' })
  channel: string;

  @ApiProperty({ example: 'SENT' })
  status: string;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  sentAt: Date | null;

  @ApiProperty({ example: 120 })
  recipientCount: number;

  @ApiProperty({ type: CampaignPushStatsDto })
  push: CampaignPushStatsDto;

  @ApiProperty({ example: { sent: 100, bounced: 2 }, description: 'Số lượng email theo trạng thái' })
  email: Record<string, number>;

  @ApiProperty({ type: CampaignEngagementDto, nullable: true })
  engagement: CampaignEngagementDto | null;
}

export class PromotionResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000039' })
  id: string;

  @ApiProperty({ example: 'Giảm 10% dịp Black Friday' })
  name: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  description: string | null;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'], example: 'PERCENTAGE' })
  type: string;

  @ApiProperty({ example: 10 })
  value: number;

  @ApiProperty({ example: 200000 })
  minOrderAmount: number;

  @ApiProperty({ example: 100000, nullable: true, type: Number })
  maxDiscountAmount: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endDate: Date;

  @ApiProperty({ example: 500, nullable: true, type: Number })
  usageLimit: number | null;

  @ApiProperty({ example: false })
  isFlashSale: boolean;

  @ApiProperty({ type: [String], nullable: true })
  applicableProducts: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  applicableCategories: string[] | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 12 })
  usedCount: number;

  @ApiProperty({ example: 3 })
  couponCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class PromotionStatsResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000039' })
  promotionId: string;

  @ApiProperty({ example: 'Giảm 10% dịp Black Friday' })
  name: string;

  @ApiProperty({ example: 12 })
  orderCount: number;

  @ApiProperty({ example: 20 })
  unitCount: number;

  @ApiProperty({ example: 150000, description: 'Tổng tiền giảm (VND)' })
  discountTotal: number;

  @ApiProperty({ example: 3500000, description: 'Doanh thu gộp (VND)' })
  grossRevenue: number;

  @ApiProperty({ example: 3350000, description: 'Doanh thu thuần (VND)' })
  netRevenue: number;

  @ApiProperty({ example: 21.3, description: 'ROI do hệ thống tính theo promotionRoi (xem ManagePromotionsUseCase)' })
  roi: number;
}

export class CouponResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000040' })
  id: string;

  @ApiProperty({ example: 'BF10-A1B2C3' })
  code: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  promotionId: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  customerId: string | null;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT'], example: 'PERCENTAGE' })
  discountType: string;

  @ApiProperty({ example: 10 })
  discountValue: number;

  @ApiProperty({ example: 200000 })
  minOrderAmount: number;

  @ApiProperty({ example: 100000, nullable: true, type: Number })
  maxDiscountAmount: number | null;

  @ApiProperty({ example: 100, nullable: true, type: Number })
  maxUses: number | null;

  @ApiProperty({ example: 1 })
  maxUsesPerCustomer: number;

  @ApiProperty({ example: 3, description: 'Số lần đã dùng' })
  usedCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endDate: Date;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class LoyaltyTierResponseDto {
  @ApiProperty({ example: 'f1a2b3c4-0000-4000-8000-000000000041' })
  id: string;

  @ApiProperty({ example: 'Vàng' })
  name: string;

  @ApiProperty({ example: 1000 })
  minPoints: number;

  @ApiProperty({ example: 5 })
  discountPercentage: number;

  @ApiProperty({ example: 1.2 })
  pointMultiplier: number;

  @ApiProperty({ example: {}, description: 'Quyền lợi (JSON tự do, lưu nguyên)' })
  benefits: unknown;
}

export class LoyaltySettingsResponseDto {
  @ApiProperty({ example: { point_rate: 0.0001 }, description: 'Cấu hình tích điểm (settings.loyalty_config)' })
  config: Record<string, unknown>;

  @ApiProperty({ type: [LoyaltyTierResponseDto] })
  tiers: LoyaltyTierResponseDto[];
}

export class LoyaltyConfigResponseDto {
  @ApiProperty({ example: 0.0001, description: 'Tỷ lệ tích điểm (point_rate), các khóa khác của loyalty_config giữ nguyên' })
  point_rate: number;
}
