import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminReturnController } from '../admin-return.controller';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';
import { LocationScopeGuard } from '../../../../../core/guards/location-scope.guard';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { ReceiveStoreDropoffUseCase } from '../../../application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from '../../../application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from '../../../application/use-cases/receive-warehouse-return.use-case';
import { ReturnInspectionService } from '../../../application/services/return-inspection.service';
import { RefundCalculatorService } from '../../../application/services/refund-calculator.service';
import { RefundExecutionService } from '../../../application/services/refund-execution.service';
import { PaymentRefundGatewayService } from '../../../application/services/payment-refund-gateway.service';
import { ExchangeSettlementService } from '../../../application/services/exchange-settlement.service';
import { RmaActionMatrixService } from '../../../application/services/rma-action-matrix.service';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnDisposition,
} from '../../../domain/entities/return-policy.entity';

describe('AdminReturnController Unit Tests', () => {
  let controller: AdminReturnController;
  let prisma: any;
  let receiveStoreDropoffUseCase: any;
  let reverseShippingService: any;
  let receiveWarehouseReturnUseCase: any;
  let returnInspectionService: any;
  let refundCalculatorService: any;
  let refundExecutionService: any;
  let paymentRefundGatewayService: any;
  let exchangeSettlementService: any;
  let rmaActionMatrixService: any;

  const mockAdminUser = { userId: 'admin-uuid-1', role: 'ADMIN' };
  const mockReq = { user: mockAdminUser };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ret-1',
            returnCode: 'RET-20261117-001',
            status: ReturnOrderStatus.SUBMITTED,
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'ret-1',
          returnCode: 'RET-20261117-001',
          status: ReturnOrderStatus.SUBMITTED,
          items: [],
          order: {},
          receipts: [],
          shipments: [],
        }),
      },
    };

    receiveStoreDropoffUseCase = {
      execute: jest.fn().mockResolvedValue({
        receipt: { id: 'rcp-1', receiptCode: 'RCP-20261117-0001' },
        returnOrder: { id: 'ret-1', status: ReturnOrderStatus.RECEIVED },
      }),
    };

    reverseShippingService = {
      dispatchReturnPickup: jest.fn().mockResolvedValue({
        shipment: { id: 'shp-1', trackingCode: 'LAD123456' },
        returnOrder: { id: 'ret-1', status: ReturnOrderStatus.APPROVED },
      }),
    };

    receiveWarehouseReturnUseCase = {
      execute: jest.fn().mockResolvedValue({
        receipt: { id: 'rcp-wh-1', receiptCode: 'RCP-WH-20261117-0001' },
        returnOrder: { id: 'ret-1', status: ReturnOrderStatus.RECEIVED },
      }),
    };

    returnInspectionService = {
      completeInspection: jest.fn().mockResolvedValue({
        inspection: { id: 'ins-1', inspectionCode: 'INS-20261117-0001' },
        overallResult: 'PASSED',
        newStatus: ReturnOrderStatus.RESOLUTION_PENDING,
      }),
      getInspectionByReturnOrderId: jest.fn().mockResolvedValue({
        id: 'ins-1',
        inspectionCode: 'INS-20261117-0001',
        overallResult: 'PASSED',
      }),
    };

    refundCalculatorService = {
      calculateRefundBreakdown: jest.fn().mockResolvedValue({
        returnOrderId: 'ret-1',
        grossCashAmount: 180000,
        returnShippingFeeDeduction: 0,
        netCashRefund: 180000,
        pointsToRestore: 50,
        lineBreakdowns: [],
      }),
    };

    refundExecutionService = {
      previewRefundForReturn: jest.fn().mockResolvedValue({
        items: [],
        grossRefundAmount: 180000,
        deductedShippingFee: 0,
        netRefundAmount: 180000,
        totalPointsToRestore: 50,
        originalOrderTotal: 1000000,
        shippingFeeBearer: 'CUSTOMER',
        returnChannel: 'STORE_DROPOFF',
      }),
      createRefundForReturn: jest.fn().mockResolvedValue({
        refund: { id: 'ref-1', amount: 180000, status: 'PENDING' },
        calculation: {},
        returnOrder: {},
      }),
      getRefundById: jest.fn().mockResolvedValue({
        id: 'ref-1',
        amount: 180000,
        status: 'PENDING',
        items: [],
      }),
    };

    paymentRefundGatewayService = {
      approveRefund: jest.fn().mockResolvedValue({
        id: 'ref-1',
        status: 'APPROVED',
      }),
      executeRefund: jest.fn().mockResolvedValue({
        refund: { id: 'ref-1', status: 'COMPLETED', gatewayTransactionId: 'TX-123' },
        returnOrder: { id: 'ret-1', status: ReturnOrderStatus.COMPLETED },
      }),
    };

    exchangeSettlementService = {
      calculateExchangeQuote: jest.fn().mockResolvedValue({
        returnOrderId: 'ret-1',
        returnCredit: 200000,
        replacementPayable: 200000,
        creditApplied: 200000,
        additionalDue: 0,
        refundDue: 0,
      }),
      createReplacementOrder: jest.fn().mockResolvedValue({
        settlement: { id: 'stl-1', status: 'SETTLED' },
        replacementOrder: { id: 'ord-rep-1', orderNumber: 'ORD-EXC-20261117-0001' },
        quote: { creditApplied: 200000, additionalDue: 0, refundDue: 0 },
      }),
      getExchangeSettlementByReturnOrderId: jest.fn().mockResolvedValue({
        id: 'stl-1',
        returnOrderId: 'ret-1',
        status: 'SETTLED',
      }),
    };

    rmaActionMatrixService = {
      getAvailableActions: jest.fn().mockReturnValue(['APPROVE', 'REJECT']),
      transitionWithOcc: jest.fn().mockResolvedValue({
        returnOrder: { id: 'ret-1', status: 'APPROVED', version: 2 },
        availableActions: ['RECEIVE_DROPOFF', 'CANCEL'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReturnController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: ReceiveStoreDropoffUseCase, useValue: receiveStoreDropoffUseCase },
        { provide: ReverseShippingService, useValue: reverseShippingService },
        { provide: ReceiveWarehouseReturnUseCase, useValue: receiveWarehouseReturnUseCase },
        { provide: ReturnInspectionService, useValue: returnInspectionService },
        { provide: RefundCalculatorService, useValue: refundCalculatorService },
        { provide: RefundExecutionService, useValue: refundExecutionService },
        { provide: PaymentRefundGatewayService, useValue: paymentRefundGatewayService },
        { provide: ExchangeSettlementService, useValue: exchangeSettlementService },
        { provide: RmaActionMatrixService, useValue: rmaActionMatrixService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LocationScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminReturnController>(AdminReturnController);
  });

  describe('receiveAtStore', () => {
    it('should delegate to ReceiveStoreDropoffUseCase with user ID from request', async () => {
      const dto = { packageConditionNote: 'Đã nhận tại quầy' };
      const result = await controller.receiveAtStore('ret-1', dto as any, mockReq);

      expect(receiveStoreDropoffUseCase.execute).toHaveBeenCalledWith(
        'ret-1',
        mockAdminUser.userId,
        dto,
      );
      expect(result.receipt.receiptCode).toBe('RCP-20261117-0001');
    });
  });

  describe('dispatchPickup', () => {
    it('should delegate to ReverseShippingService with user ID from request', async () => {
      const dto = { destinationWarehouseId: 'wh-1' };
      const result = await controller.dispatchPickup('ret-1', dto, mockReq);

      expect(reverseShippingService.dispatchReturnPickup).toHaveBeenCalledWith(
        'ret-1',
        mockAdminUser.userId,
        dto,
      );
      expect(result.shipment.trackingCode).toBe('LAD123456');
    });
  });

  describe('receiveAtWarehouse', () => {
    it('should delegate to ReceiveWarehouseReturnUseCase with user ID from request', async () => {
      const dto = { warehouseId: 'wh-1', packageConditionNote: 'Nguyên kiện' };
      const result = await controller.receiveAtWarehouse('ret-1', dto, mockReq);

      expect(receiveWarehouseReturnUseCase.execute).toHaveBeenCalledWith(
        'ret-1',
        mockAdminUser.userId,
        dto,
      );
      expect(result.receipt.receiptCode).toBe('RCP-WH-20261117-0001');
    });
  });

  describe('completeInspection', () => {
    it('should delegate to ReturnInspectionService with user ID from request', async () => {
      const dto = {
        inspectorNotes: 'Đạt chuẩn',
        items: [
          {
            returnItemId: 'item-1',
            passedQuantity: 1,
            failedQuantity: 0,
            isSealIntact: true,
            disposition: ReturnDisposition.RESTOCK,
          },
        ],
      };

      const result = await controller.completeInspection('ret-1', dto, mockReq);

      expect(returnInspectionService.completeInspection).toHaveBeenCalledWith(
        'ret-1',
        mockAdminUser.userId,
        dto,
      );
      expect(result.overallResult).toBe('PASSED');
      expect(result.newStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
    });
  });

  describe('getInspection', () => {
    it('should delegate to ReturnInspectionService.getInspectionByReturnOrderId', async () => {
      const result = await controller.getInspection('ret-1');

      expect(
        returnInspectionService.getInspectionByReturnOrderId,
      ).toHaveBeenCalledWith('ret-1');
      expect(result.inspectionCode).toBe('INS-20261117-0001');
    });
  });

  describe('listAdminReturns', () => {
    it('should query prisma with pagination and filters', async () => {
      const result = await controller.listAdminReturns(
        ReturnOrderStatus.SUBMITTED,
        ReturnChannel.STORE_DROPOFF,
        'RET-2026',
        '1',
        '10',
      );

      expect(prisma.returnOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReturnOrderStatus.SUBMITTED,
            returnChannel: ReturnChannel.STORE_DROPOFF,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getAdminReturnDetail', () => {
    it('should return returnOrder details with relations', async () => {
      const result = await controller.getAdminReturnDetail('ret-1');
      expect(result.id).toBe('ret-1');
      expect(result.availableActions).toEqual(['APPROVE', 'REJECT']);
      expect(prisma.returnOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ret-1' },
        }),
      );
    });

    it('should throw NotFoundException if returnOrder not found', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(null);
      await expect(controller.getAdminReturnDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateRefund', () => {
    it('should delegate to RefundExecutionService.previewRefundForReturn', async () => {
      const result = await controller.calculateRefund('ret-1', {
        shippingFeeOverride: 25000,
      });

      expect(
        refundExecutionService.previewRefundForReturn,
      ).toHaveBeenCalledWith('ret-1', 25000);
      expect(result.netRefundAmount).toBe(180000);
      expect(result.totalPointsToRestore).toBe(50);
    });
  });

  describe('createRefund', () => {
    it('should delegate to RefundExecutionService.createRefundForReturn', async () => {
      const dto = { note: 'Approved' };
      const result = await controller.createRefund('ret-1', dto, mockReq);

      expect(
        refundExecutionService.createRefundForReturn,
      ).toHaveBeenCalledWith('ret-1', 'admin-uuid-1', {
        notes: 'Approved',
      });
      expect(result.refund.status).toBe('PENDING');
    });
  });

  describe('getRefundDetail', () => {
    it('should delegate to RefundExecutionService.getRefundById', async () => {
      const result = await controller.getRefundDetail('ref-1');

      expect(refundExecutionService.getRefundById).toHaveBeenCalledWith('ref-1');
      expect(result.id).toBe('ref-1');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('approveRefund', () => {
    it('should delegate to PaymentRefundGatewayService.approveRefund', async () => {
      const dto = { note: 'Manager Approved' };
      const result = await controller.approveRefund('ref-1', dto, mockReq);

      expect(paymentRefundGatewayService.approveRefund).toHaveBeenCalledWith(
        'ref-1',
        'admin-uuid-1',
        'Manager Approved',
      );
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('executeRefund', () => {
    it('should delegate to PaymentRefundGatewayService.executeRefund', async () => {
      const dto = { manualSettlementNote: 'UNC-123' };
      const result = await controller.executeRefund('ref-1', dto, mockReq);

      expect(paymentRefundGatewayService.executeRefund).toHaveBeenCalledWith(
        'ref-1',
        'admin-uuid-1',
        'UNC-123',
      );
      expect(result.refund.status).toBe('COMPLETED');
    });
  });

  describe('calculateExchangeQuote', () => {
    it('should delegate to ExchangeSettlementService.calculateExchangeQuote', async () => {
      const dto = {
        replacementItems: [{ productVariantId: 'var-rep-1', quantity: 1 }],
        shippingFeeOverride: 0,
      };
      const result = await controller.calculateExchangeQuote('ret-1', dto as any);

      expect(exchangeSettlementService.calculateExchangeQuote).toHaveBeenCalledWith(
        'ret-1',
        dto.replacementItems,
        0,
      );
      expect(result.creditApplied).toBe(200000);
      expect(result.additionalDue).toBe(0);
    });
  });

  describe('createExchangeOrder', () => {
    it('should delegate to ExchangeSettlementService.createReplacementOrder', async () => {
      const dto = {
        replacementItems: [{ productVariantId: 'var-rep-1', quantity: 1 }],
        shippingAddress: {
          fullName: 'Nguyen Van A',
          phone: '0901234567',
          addressLine1: '123 Le Loi',
          ward: 'Ben Nghe',
          district: 'Quan 1',
          city: 'Ho Chi Minh',
        },
      };
      const result = await controller.createExchangeOrder('ret-1', dto as any, mockReq);

      expect(exchangeSettlementService.createReplacementOrder).toHaveBeenCalledWith(
        'ret-1',
        'admin-uuid-1',
        dto,
      );
      expect(result.settlement.status).toBe('SETTLED');
      expect(result.replacementOrder.orderNumber).toBe('ORD-EXC-20261117-0001');
    });
  });

  describe('getExchangeSettlement', () => {
    it('should delegate to ExchangeSettlementService.getExchangeSettlementByReturnOrderId', async () => {
      const result = await controller.getExchangeSettlement('ret-1');

      expect(
        exchangeSettlementService.getExchangeSettlementByReturnOrderId,
      ).toHaveBeenCalledWith('ret-1');
      expect(result.id).toBe('stl-1');
      expect(result.returnOrderId).toBe('ret-1');
    });
  });

  describe('transitionStatus (EP18-T02 OCC)', () => {
    it('should delegate to RmaActionMatrixService.transitionWithOcc', async () => {
      const dto = {
        expectedVersion: 1,
        targetStatus: ReturnOrderStatus.APPROVED,
        note: 'Duyệt yêu cầu đổi trả',
      };
      const result = await controller.transitionStatus('ret-1', dto, mockReq);

      expect(rmaActionMatrixService.transitionWithOcc).toHaveBeenCalledWith(
        'ret-1',
        'admin-uuid-1',
        dto,
      );
      expect(result.returnOrder.version).toBe(2);
      expect(result.returnOrder.status).toBe('APPROVED');
    });
  });
});
