import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../../../core/decorators/public.decorator';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { CustomerContextService } from '../../../../core/services/customer-context.service';
import { AddToCartUseCase } from '../../application/use-cases/add-to-cart.use-case';
import { GetCartUseCase } from '../../application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '../../application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '../../application/use-cases/remove-cart-item.use-case';
import { MergeCartUseCase } from '../../application/use-cases/merge-cart.use-case';
import { AddToCartDto } from '../dtos/add-to-cart.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { MergeCartDto } from '../dtos/merge-cart.dto';
import { CartResponseDto } from '../dtos/cart-response.dto';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class CartController {
  constructor(
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly mergeCartUseCase: MergeCartUseCase,
    private readonly customerContext: CustomerContextService,
  ) {}

  private async resolveCustomerIdAndSession(req: any, headerSession?: string, bodySession?: string) {
    const userId = req.user?.userId;
    const customerId = userId ? await this.customerContext.getCustomerIdFromUserId(userId) : undefined;
    const sessionId = bodySession || headerSession || req.headers?.['x-session-id'];
    return { customerId: customerId || undefined, sessionId };
  }

  // Rate limit add-to-cart — max 20 requests per 60 seconds
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Public()
  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm biến thể vào giỏ hàng (Guest hoặc Customer)' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session ID dành cho khách vãng lai' })
  @ApiBearerAuth()
  async addToCart(
    @Req() req: any,
    @Body() dto: AddToCartDto,
    @Headers('x-session-id') headerSession?: string,
  ): Promise<CartResponseDto> {
    const { customerId, sessionId } = await this.resolveCustomerIdAndSession(req, headerSession, dto.sessionId);

    // Use-case does mutation only
    await this.addToCartUseCase.execute({
      customerId,
      sessionId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      storeId: dto.storeId,
    });

    // Single fetch for response
    return this.getCartUseCase.execute({ customerId, sessionId });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Xem giỏ hàng hiện tại kèm thông tin tồn kho, giá realtime, và trạng thái sản phẩm' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session ID dành cho khách vãng lai' })
  @ApiBearerAuth()
  async getCart(
    @Req() req: any,
    @Headers('x-session-id') headerSession?: string,
  ): Promise<CartResponseDto> {
    const { customerId, sessionId } = await this.resolveCustomerIdAndSession(req, headerSession);
    return this.getCartUseCase.execute({ customerId, sessionId });
  }

  // Rate limit update — max 30 requests per 60 seconds
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Public()
  @Put('items/:id')
  @ApiOperation({ summary: 'Cập nhật số lượng hoặc trạng thái chọn (Partial Checkout) của sản phẩm trong giỏ' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session ID dành cho khách vãng lai' })
  @ApiBearerAuth()
  async updateCartItem(
    @Req() req: any,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-session-id') headerSession?: string,
  ): Promise<CartResponseDto> {
    const { customerId, sessionId } = await this.resolveCustomerIdAndSession(req, headerSession, dto.sessionId);

    // Use-case does mutation only
    await this.updateCartItemUseCase.execute({
      cartItemId,
      quantity: dto.quantity,
      isSelected: dto.isSelected,
      customerId,
      sessionId,
    });

    return this.getCartUseCase.execute({ customerId, sessionId });
  }

  @Public()
  @Delete('items/:id')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi giỏ hàng' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session ID dành cho khách vãng lai' })
  @ApiBearerAuth()
  async removeCartItem(
    @Req() req: any,
    @Param('id') cartItemId: string,
    @Headers('x-session-id') headerSession?: string,
  ): Promise<CartResponseDto> {
    const { customerId, sessionId } = await this.resolveCustomerIdAndSession(req, headerSession);

    // Use-case does mutation only
    await this.removeCartItemUseCase.execute({
      cartItemId,
      customerId,
      sessionId,
    });

    return this.getCartUseCase.execute({ customerId, sessionId });
  }

  // Rate limit merge — max 5 requests per 60 seconds
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('merge')
  @ApiOperation({ summary: 'Gộp giỏ hàng khách vãng lai (Guest session) vào tài khoản Customer khi đăng nhập' })
  @ApiBearerAuth()
  async mergeCart(
    @Req() req: any,
    @Body() dto: MergeCartDto,
  ): Promise<CartResponseDto> {
    const userId = req.user?.userId;
    const customerId = await this.customerContext.getCustomerIdFromUserId(userId);
    if (!customerId) {
      throw new BadRequestException('Không tìm thấy hồ sơ khách hàng cho tài khoản này');
    }

    await this.mergeCartUseCase.execute({
      sessionId: dto.sessionId,
      customerId,
    });

    return this.getCartUseCase.execute({ customerId });
  }
}
