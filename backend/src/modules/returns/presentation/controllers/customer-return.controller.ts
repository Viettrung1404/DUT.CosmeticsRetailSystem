import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RmaEligibilityService } from '../../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../../application/use-cases/submit-return-request.use-case';
import { SubmitReturnRequestDto } from '../dtos/submit-return-request.dto';

@ApiTags('Customer - Returns & RMA')
@ApiBearerAuth('JWT-auth')
@Controller('customers/me')
@UseGuards(JwtAuthGuard)
export class CustomerReturnController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmaEligibilityService: RmaEligibilityService,
    private readonly submitReturnRequestUseCase: SubmitReturnRequestUseCase,
  ) {}

  private async resolveCustomerId(req: any): Promise<string> {
    const directCustomerId =
      req.user?.customerId || req.headers?.['x-customer-id'];
    if (directCustomerId) {
      return directCustomerId;
    }

    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (userId) {
      const customer = await this.prisma.customer.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (customer) {
        return customer.id;
      }
    }

    throw new UnauthorizedException(
      'Không thể xác thực danh tính khách hàng từ phiên đăng nhập',
    );
  }

  @Get('orders/:orderId/return-eligibility')
  @ApiOperation({
    summary:
      'Kiểm tra tính hợp lệ đổi trả của một đơn hàng theo phiên bản chính sách',
  })
  async checkEligibility(@Param('orderId') orderId: string, @Req() req: any) {
    const customerId = await this.resolveCustomerId(req);
    return this.rmaEligibilityService.checkOrderEligibility(orderId, customerId);
  }

  @Post('returns')
  @ApiOperation({
    summary: 'Nộp yêu cầu đổi trả sản phẩm mới (Customer RMA Claim Submission)',
  })
  async submitReturn(
    @Body() dto: SubmitReturnRequestDto,
    @Req() req: any,
  ) {
    const customerId = await this.resolveCustomerId(req);
    return this.submitReturnRequestUseCase.execute(customerId, dto);
  }

  @Get('returns')
  @ApiOperation({
    summary: 'Lấy danh sách các yêu cầu đổi trả của khách hàng hiện tại',
  })
  async listReturns(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const customerId = await this.resolveCustomerId(req);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = Math.max(0, (parseInt(page, 10) || 1) - 1) * take;

    const [total, returns] = await Promise.all([
      this.prisma.returnOrder.count({
        where: { customerId },
      }),
      this.prisma.returnOrder.findMany({
        where: { customerId },
        include: {
          items: {
            include: {
              variant: {
                select: {
                  sku: true,
                  option1Value: true,
                  price: true,
                },
              },
            },
          },
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
            },
          },
          dropoffLocation: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page: parseInt(page, 10) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get('returns/:id')
  @ApiOperation({
    summary: 'Xem chi tiết hồ sơ đổi trả của khách hàng',
  })
  async getReturnDetail(@Param('id') id: string, @Req() req: any) {
    const customerId = await this.resolveCustomerId(req);

    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        dropoffLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            versionName: true,
            description: true,
          },
        },
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với mã ID: ${id}`,
      );
    }

    if (returnOrder.customerId !== customerId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập hồ sơ đổi trả này',
      );
    }

    return returnOrder;
  }
}
