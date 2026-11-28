import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { LocationScopeGuard } from '../../../../core/guards/location-scope.guard';
import { LocationScoped } from '../../../../core/decorators/location-scoped.decorator';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ReceiveStoreDropoffUseCase } from '../../application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from '../../application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from '../../application/use-cases/receive-warehouse-return.use-case';
import { ReturnInspectionService } from '../../application/services/return-inspection.service';
import { RefundCalculatorService } from '../../application/services/refund-calculator.service';
import { RefundExecutionService } from '../../application/services/refund-execution.service';
import { PaymentRefundGatewayService } from '../../application/services/payment-refund-gateway.service';
import { ReceiveStoreDropoffDto } from '../dtos/receive-return-receipt.dto';
import { DispatchReturnPickupDto } from '../dtos/dispatch-pickup.dto';
import { ReceiveWarehouseReturnDto } from '../dtos/receive-warehouse-return.dto';
import { CompleteInspectionDto } from '../dtos/complete-inspection.dto';
import {
  CalculateRefundDto,
  CreateRefundDto,
  ApproveRefundDto,
  ExecuteRefundDto,
} from '../dtos/refund-operations.dto';
import {
  CalculateExchangeQuoteDto,
  CreateExchangeOrderDto,
} from '../dtos/exchange-quote.dto';
import { TransitionRmaDto } from '../dtos/rma-queue.dto';
import { ExchangeSettlementService } from '../../application/services/exchange-settlement.service';
import { RmaActionMatrixService } from '../../application/services/rma-action-matrix.service';

@ApiTags('Admin - Returns & Reverse Logistics (RMA)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/returns')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminReturnController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase,
    private readonly reverseShippingService: ReverseShippingService,
    private readonly receiveWarehouseReturnUseCase: ReceiveWarehouseReturnUseCase,
    private readonly returnInspectionService: ReturnInspectionService,
    private readonly refundCalculatorService: RefundCalculatorService,
    private readonly refundExecutionService: RefundExecutionService,
    private readonly paymentRefundGatewayService: PaymentRefundGatewayService,
    private readonly exchangeSettlementService: ExchangeSettlementService,
    private readonly rmaActionMatrixService: RmaActionMatrixService,
  ) {}

  @Post(':id/receive-at-store')
  @LocationScoped({ resourceType: 'RETURN_ORDER' })
  @UseGuards(LocationScopeGuard)
  @RequireAnyPermission('INVENTORY_UPDATE', 'RETURN_MANAGE', 'ADMIN', 'STORE_MGR', 'STAFF')
  @ApiOperation({
    summary:
      'Tiếp nhận hàng hoàn tại quầy Showroom & đưa vào tồn kho Quarantined (EP14-T01)',
  })
  async receiveAtStore(
    @Param('id') id: string,
    @Body() dto: ReceiveStoreDropoffDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.receiveStoreDropoffUseCase.execute(id, operatorUserId, dto);
  }

  @Post(':id/dispatch-pickup')
  @RequireAnyPermission('RETURN_MANAGE', 'SHIPPING_MANAGE', 'ADMIN')
  @ApiOperation({
    summary:
      'Phát lệnh điều phối bưu tá GHN đến lấy hàng hoàn tận nhà khách (EP14-T02)',
  })
  async dispatchPickup(
    @Param('id') id: string,
    @Body() dto: DispatchReturnPickupDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.reverseShippingService.dispatchReturnPickup(
      id,
      operatorUserId,
      dto,
    );
  }

  @Post(':id/receive-at-warehouse')
  @RequireAnyPermission('INVENTORY_UPDATE', 'RETURN_MANAGE', 'ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({
    summary:
      'Tiếp nhận kiện hàng hoàn thu hồi tại Tổng kho & chuyển diện cách ly KCS (EP14-T03)',
  })
  async receiveAtWarehouse(
    @Param('id') id: string,
    @Body() dto: ReceiveWarehouseReturnDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.receiveWarehouseReturnUseCase.execute(id, operatorUserId, dto);
  }

  @Post(':id/complete-inspection')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'QC_STAFF', 'STORE_MGR', 'WAREHOUSE_STAFF')
  @ApiOperation({
    summary:
      'Hoàn tất biên bản kiểm định chất lượng KCS & Định đoạt tồn kho (EP15-T01, EP15-T02, EP15-T03)',
  })
  async completeInspection(
    @Param('id') id: string,
    @Body() dto: CompleteInspectionDto,
    @Req() req: any,
  ) {
    const inspectorUserId = req.user?.userId || req.user?.id;
    return this.returnInspectionService.completeInspection(
      id,
      inspectorUserId,
      dto,
    );
  }

  @Get(':id/inspection')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN')
  @ApiOperation({
    summary:
      'Tra cứu biên bản kiểm định KCS và lịch sử định đoạt tồn kho của đơn RMA',
  })
  async getInspection(@Param('id') id: string) {
    return this.returnInspectionService.getInspectionByReturnOrderId(id);
  }

  @Post(':id/calculate-refund')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'FINANCE',
    'ACCOUNTANT',
  )
  @ApiOperation({
    summary:
      'Tính toán phân bổ tiền hoàn thực trả và điểm thưởng theo tỷ lệ (EP16-T01, TC-RMA-17, DEC-04)',
  })
  async calculateRefund(
    @Param('id') id: string,
    @Body() dto: CalculateRefundDto,
  ) {
    return this.refundExecutionService.previewRefundForReturn(
      id,
      dto?.shippingFeeOverride,
    );
  }

  @Post(':id/create-refund')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'FINANCE', 'ACCOUNTANT')
  @ApiOperation({
    summary:
      'Khởi tạo lệnh hoàn tiền chi tiết từng dòng sản phẩm với cơ chế chống hoàn trùng (EP16-T02)',
  })
  async createRefund(
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.refundExecutionService.createRefundForReturn(
      id,
      operatorUserId,
      {
        notes: dto?.note,
      },
    );
  }

  @Get('refunds/:refundId')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'FINANCE',
    'ACCOUNTANT',
  )
  @ApiOperation({
    summary:
      'Tra cứu thông tin chi tiết lệnh hoàn tiền và các dòng sản phẩm liên quan (EP16-T02)',
  })
  async getRefundDetail(@Param('refundId') refundId: string) {
    return this.refundExecutionService.getRefundById(refundId);
  }

  @Post('refunds/:refundId/approve')
  @RequireAnyPermission(
    'RETURN_MANAGE',
    'ADMIN',
    'FINANCE',
    'ACCOUNTANT',
    'MANAGER',
  )
  @ApiOperation({
    summary: 'Phê duyệt lệnh hoàn tiền trước khi phát lệnh giải ngân (EP16-T03)',
  })
  async approveRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.paymentRefundGatewayService.approveRefund(
      refundId,
      operatorUserId,
      dto?.note,
    );
  }

  @Post('refunds/:refundId/execute')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'FINANCE', 'ACCOUNTANT')
  @ApiOperation({
    summary:
      'Giải ngân hoàn tiền tự động qua cổng thanh toán hoặc đối soát tiền mặt (EP16-T03, TC-RMA-11, TC-RMA-12)',
  })
  async executeRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ExecuteRefundDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.paymentRefundGatewayService.executeRefund(
      refundId,
      operatorUserId,
      dto?.manualSettlementNote,
    );
  }

  @Get()
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN')
  @ApiOperation({
    summary: 'Tra cứu danh sách hồ sơ đổi trả RMA toàn hệ thống',
  })
  async listAdminReturns(
    @Query('status') status?: string,
    @Query('returnChannel') returnChannel?: string,
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = Math.max(0, (parseInt(page, 10) || 1) - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (returnChannel) where.returnChannel = returnChannel;
    if (search) {
      where.OR = [
        { returnCode: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, returns] = await Promise.all([
      this.prisma.returnOrder.count({ where }),
      this.prisma.returnOrder.findMany({
        where,
        include: {
          customer: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          items: {
            include: {
              variant: {
                select: {
                  sku: true,
                  option1Value: true,
                },
              },
            },
          },
          dropoffLocation: {
            select: {
              name: true,
              code: true,
            },
          },
          shipments: {
            select: {
              shipmentCode: true,
              trackingCode: true,
              carrierCode: true,
              status: true,
            },
          },
          receipts: true,
          inspections: true,
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

  @Post(':id/exchange-quote')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'ORDER_MANAGE')
  @ApiOperation({
    summary:
      'Tính toán bảng báo giá chênh lệch đổi hàng theo định lý bù trừ tài chính (EP17-T01)',
  })
  async calculateExchangeQuote(
    @Param('id') id: string,
    @Body() dto: CalculateExchangeQuoteDto,
  ) {
    return this.exchangeSettlementService.calculateExchangeQuote(
      id,
      dto.replacementItems,
      dto.shippingFeeOverride,
    );
  }

  @Post(':id/create-exchange-order')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'ORDER_MANAGE')
  @ApiOperation({
    summary:
      'Chốt đơn hàng thay thế và quyết toán tài chính đổi hàng tự động (EP17-T02)',
  })
  async createExchangeOrder(
    @Param('id') id: string,
    @Body() dto: CreateExchangeOrderDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.exchangeSettlementService.createReplacementOrder(
      id,
      operatorUserId,
      dto,
    );
  }

  @Get(':id/exchange-settlement')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'ORDER_VIEW')
  @ApiOperation({
    summary:
      'Truy vấn chi tiết bản quyết toán đổi hàng & nguồn gốc tài chính bù trừ (EP17-T01)',
  })
  async getExchangeSettlement(@Param('id') id: string) {
    return this.exchangeSettlementService.getExchangeSettlementByReturnOrderId(id);
  }

  @Post(':id/transition')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'STORE_MGR')
  @ApiOperation({
    summary:
      'Chuyển đổi trạng thái hồ sơ RMA với cơ chế kiểm soát đồng thời lạc quan OCC (EP18-T02)',
  })
  async transitionStatus(
    @Param('id') id: string,
    @Body() dto: TransitionRmaDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.userId || req.user?.id;
    return this.rmaActionMatrixService.transitionWithOcc(
      id,
      operatorUserId,
      dto,
    );
  }

  @Get(':id')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'STORE_STAFF',
    'STORE_MGR',
    'WAREHOUSE_STAFF',
    'STAFF',
    'INVENTORY_UPDATE',
  )
  @ApiOperation({
    summary: 'Xem chi tiết một hồ sơ đổi trả RMA',
  })
  async getAdminReturnDetail(@Param('id') id: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const includeQuery = {
      customer: true,
      order: {
        select: {
          orderNumber: true,
          totalAmount: true,
          createdAt: true,
        },
      },
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
      dropoffLocation: true,
      receipts: {
        include: {
          receiver: { select: { fullName: true, email: true } },
          location: { select: { name: true, code: true } },
        },
      },
      shipments: true,
      policyVersion: true,
      inspections: {
        include: {
          inspector: { select: { fullName: true, email: true } },
          items: true,
        },
      },
      settlement: true,
      refunds: true,
    };

    const returnOrder = isUuid
      ? await this.prisma.returnOrder.findUnique({
          where: { id },
          include: includeQuery,
        })
      : await this.prisma.returnOrder.findFirst({
          where: { returnCode: id },
          include: includeQuery,
        });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với ID: ${id}`,
      );
    }

    const availableActions = this.rmaActionMatrixService.getAvailableActions(returnOrder);

    return {
      ...returnOrder,
      availableActions,
    };
  }
}
