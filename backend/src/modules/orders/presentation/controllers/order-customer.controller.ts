import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { CustomerContextService } from '../../../../core/services/customer-context.service';
import { PreviewOrderUseCase } from '../../application/use-cases/preview-order.use-case';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetCustomerOrdersUseCase } from '../../application/use-cases/get-customer-orders.use-case';
import { GetOrderDetailUseCase } from '../../application/use-cases/get-order-detail.use-case';
import { CancelOrderUseCase } from '../../application/use-cases/cancel-order.use-case';
import { PreviewOrderDto } from '../dtos/preview-order.dto';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderQueryDto, CancelOrderDto } from '../dtos/order-query.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CustomerOrderController {
  constructor(
    private readonly previewOrderUseCase: PreviewOrderUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getCustomerOrdersUseCase: GetCustomerOrdersUseCase,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly customerContext: CustomerContextService,
  ) {}

  @Post('orders/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem trước chi phí đơn hàng, khuyến mãi, điểm thưởng và kho xử lý' })
  async previewOrder(@Req() req: any, @Body() dto: PreviewOrderDto) {
    const customerId = (await this.customerContext.getCustomerIdFromUserId(req.user.userId))!;

    const result = await this.previewOrderUseCase.execute({
      customerId,
      items: dto.items,
      couponCode: dto.couponCode,
      usePoints: dto.usePoints,
      storeId: dto.storeId,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Tính toán giá trị đơn hàng thành công',
      data: result,
    };
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Khởi tạo đơn hàng mới' })
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const customerId = (await this.customerContext.getCustomerIdFromUserId(req.user.userId))!;

    const result = await this.createOrderUseCase.execute({
      customerId,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      items: dto.items,
      couponCode: dto.couponCode,
      usePoints: dto.usePoints,
      storeId: dto.storeId,
      note: dto.note,
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Đặt hàng thành công',
      data: result,
    };
  }

  @Get('customers/me/orders')
  @ApiOperation({ summary: 'Lấy danh sách lịch sử đơn hàng của khách hàng' })
  async getCustomerOrders(@Req() req: any, @Query() query: OrderQueryDto) {
    const customerId = (await this.customerContext.getCustomerIdFromUserId(req.user.userId))!;

    const result = await this.getCustomerOrdersUseCase.execute({
      customerId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result,
    };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Xem chi tiết đơn hàng (có bảo vệ IDOR)' })
  async getOrderDetail(@Req() req: any, @Param('id') id: string) {
    const customerId = (await this.customerContext.getCustomerIdFromUserId(req.user.userId))!;

    const result = await this.getOrderDetailUseCase.execute(id, customerId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin đơn hàng thành công',
      data: result,
    };
  }

  @Put('orders/:id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng đang ở trạng thái PENDING' })
  async cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    const customerId = (await this.customerContext.getCustomerIdFromUserId(req.user.userId))!;

    const result = await this.cancelOrderUseCase.execute({
      orderId: id,
      customerId,
      reason: dto?.reason,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Hủy đơn hàng thành công',
      data: result,
    };
  }
}
