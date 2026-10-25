import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { CustomerOnlyGuard } from './customer-only.guard';
import {
  AcceptExchangeDto,
  CreateReturnDto,
  DeviceDto,
  RedeemDto,
  ReturnQueryDto,
  WishlistDto,
  WishlistStateDto,
} from './commerce.dto';
import { ReturnsService } from '../application/returns.service';
import { LoyaltyService } from '../application/loyalty.service';
import { WishlistService } from '../application/wishlist.service';
import { TrackingService } from '../application/tracking.service';
import { NotificationsService } from '../application/notifications.service';
import { ReturnImageStorage } from '../infrastructure/return-image.storage';
import { CommerceErrors, CommerceResponse } from './commerce.responses';

interface CustomerRequest {
  user: { userId: string };
  customerId: string;
}
const keyHeader = {
  name: 'Idempotency-Key',
  required: true,
  description:
    '8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409',
};
@ApiTags('Customer - Sprint 4')
@ApiBearerAuth('JWT-auth')
@CommerceErrors()
@UseGuards(CustomerOnlyGuard, ThrottlerGuard)
@Controller()
export class CommerceController {
  constructor(
    private readonly returns: ReturnsService,
    private readonly loyalty: LoyaltyService,
    private readonly wishlist: WishlistService,
    private readonly tracking: TrackingService,
    private readonly notifications: NotificationsService,
    private readonly images: ReturnImageStorage,
  ) {}
  @Post('returns')
  @ApiHeader(keyHeader)
  @ApiOperation({
    summary:
      'Tạo yêu cầu REFUND/EXCHANGE cho đơn của tôi trong 7 ngày từ COMPLETED',
  })
  @CommerceResponse('returnCreated', 201)
  createReturn(
    @Req() req: CustomerRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returns.create(req.user.userId, key, dto);
  }
  @Get('returns')
  @ApiOperation({ summary: 'Danh sách yêu cầu đổi trả của tôi' })
  @CommerceResponse('returns')
  listReturns(@Req() req: CustomerRequest, @Query() query: ReturnQueryDto) {
    return this.returns.list(
      req.customerId,
      query.page!,
      query.limit!,
      query.status,
    );
  }
  @Get('returns/:id')
  @ApiOperation({
    summary: 'Chi tiết đổi trả, quote, settlement và trạng thái hoàn tiền',
  })
  @CommerceResponse('returnDetail')
  returnDetail(
    @Req() req: CustomerRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.detail(req.customerId, id);
  }
  @Post('returns/:id/exchange/accept')
  @ApiHeader(keyHeader)
  @ApiOperation({
    summary:
      'Chấp nhận quote đổi hàng đã kiểm định; giữ tồn và tạo đơn thay thế',
  })
  @CommerceResponse('exchange', 201)
  accept(
    @Req() req: CustomerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: AcceptExchangeDto,
  ) {
    return this.returns.accept(req.user.userId, id, key, dto);
  }
  @Get('orders/:id/tracking')
  @ApiOperation({
    summary: 'Theo dõi nhiều kiện hàng của đơn thuộc khách hàng',
  })
  @CommerceResponse('tracking')
  track(@Req() req: CustomerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tracking.get(req.customerId, id);
  }
  @Post('uploads/return-images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({
    summary:
      'Upload bằng chứng vào private bucket; tối đa 5 MB, trả attachmentId',
  })
  @CommerceResponse('image', 201)
  upload(
    @Req() req: CustomerRequest,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    return this.images.upload(req.user.userId, file?.buffer!);
  }
  @Get('uploads/return-images/:id')
  @ApiOperation({ summary: 'Lấy URL ảnh có hạn 5 phút, chỉ chủ ảnh' })
  @CommerceResponse('imageUrl')
  image(@Req() req: CustomerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.images.url(req.user.userId, id);
  }
  @Get('customers/me/loyalty')
  @ApiOperation({
    summary: 'Số dư, hạng, quyền lợi và lịch sử điểm phân trang',
  })
  @CommerceResponse('loyalty')
  getLoyalty(@Req() req: CustomerRequest, @Query() query: PageOptionsDto) {
    return this.loyalty.get(req.customerId, query.page!, query.limit!);
  }
  @Get('customers/me/loyalty/rewards')
  @ApiOperation({ summary: 'Phần thưởng cấu hình; thiếu policy trả 503' })
  @CommerceResponse('rewards')
  rewards() {
    return this.loyalty.rewards();
  }
  @Post('customers/me/loyalty/redeem')
  @ApiHeader(keyHeader)
  @ApiOperation({
    summary: 'Đổi rewardCode lấy voucher riêng trong transaction',
  })
  @CommerceResponse('redemption', 201)
  redeem(
    @Req() req: CustomerRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: RedeemDto,
  ) {
    return this.loyalty.redeem(req.user.userId, key, dto.rewardCode);
  }
  @Post('wishlists/toggle')
  @ApiHeader(keyHeader)
  @ApiOperation({
    summary: 'Đảo trạng thái yêu thích; retry cùng key không đảo lại',
  })
  @CommerceResponse('wishlist', 201)
  toggle(
    @Req() req: CustomerRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: WishlistDto,
  ) {
    return this.wishlist.change(req.user.userId, key, dto.productId);
  }
  @Put('wishlists/:productId')
  @ApiHeader(keyHeader)
  @ApiOperation({ summary: 'Đặt trạng thái yêu thích đích' })
  @CommerceResponse('wishlist')
  select(
    @Req() req: CustomerRequest,
    @Param('productId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: WishlistStateDto,
  ) {
    return this.wishlist.change(req.user.userId, key, id, dto.selected);
  }
  @Get('wishlists')
  @ApiOperation({ summary: 'Danh sách sản phẩm yêu thích còn hiển thị' })
  @CommerceResponse('wishlists')
  listWishlist(@Req() req: CustomerRequest, @Query() query: PageOptionsDto) {
    return this.wishlist.list(req.customerId, query.page!, query.limit!);
  }
  @Get('notifications')
  @ApiOperation({ summary: 'Thông báo của tôi và số chưa đọc' })
  @CommerceResponse('notifications')
  listNotifications(
    @Req() req: CustomerRequest,
    @Query() query: PageOptionsDto,
  ) {
    return this.notifications.list(req.user.userId, query.page!, query.limit!);
  }
  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo của tôi đã đọc' })
  @CommerceResponse('read')
  read(@Req() req: CustomerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.read(req.user.userId, id);
  }
  @Post('users/me/devices')
  @ApiOperation({ summary: 'Đăng ký/rotate FCM token cho tài khoản hiện tại' })
  @CommerceResponse('device', 201)
  register(@Req() req: CustomerRequest, @Body() dto: DeviceDto) {
    return this.notifications.register(req.user.userId, dto);
  }
  @Delete('users/me/devices/:id')
  @ApiOperation({
    summary: 'Hủy đăng ký thiết bị và ngừng delivery trước logout',
  })
  @CommerceResponse('device')
  unregister(
    @Req() req: CustomerRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.unregister(req.user.userId, id);
  }
}
