import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReturnInspectionService } from '../return-inspection.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
  ReturnDisposition,
  ReturnReasonCode,
} from '../../../domain/entities/return-policy.entity';

describe('EP15-T01: ReturnInspectionService Unit Tests', () => {
  let service: ReturnInspectionService;
  let mockPrisma: any;
  let mockInventoryDispositionService: any;
  let mockRmaStatusAggregator: any;

  beforeEach(() => {
    mockPrisma = {
      returnOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      returnInspection: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      returnInspectionItem: {
        create: jest.fn(),
      },
      returnOrderItem: {
        update: jest.fn(),
      },
      returnStatusHistory: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockInventoryDispositionService = {
      executeItemDisposition: jest.fn().mockResolvedValue({ id: 'disp-1' }),
    };

    mockRmaStatusAggregator = {
      aggregate: jest.fn(),
    };

    service = new ReturnInspectionService(
      mockPrisma,
      mockInventoryDispositionService,
      mockRmaStatusAggregator,
    );
  });

  const sampleReturnOrder = {
    id: 'ret-uuid-1',
    returnCode: 'RET-20261117-0001',
    status: ReturnOrderStatus.RECEIVED,
    storeId: 'store-1',
    dropoffLocationId: 'store-1',
    receipts: [{ id: 'rcpt-1', locationId: 'store-1' }],
    items: [
      {
        id: 'item-uuid-1',
        returnOrderId: 'ret-uuid-1',
        productVariantId: 'var-1',
        quantity: 2,
        reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
      },
    ],
  };

  it('1. should complete inspection successfully when all items pass (AC1)', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);
    mockRmaStatusAggregator.aggregate.mockReturnValue({
      overallResult: 'PASSED',
      returnOrderStatus: ReturnOrderStatus.RESOLUTION_PENDING,
    });
    mockPrisma.returnInspection.create.mockResolvedValue({
      id: 'ins-uuid-1',
      inspectionCode: 'INS-20261117-0001',
      overallResult: 'PASSED',
    });
    mockPrisma.returnOrder.update.mockResolvedValue({
      ...sampleReturnOrder,
      status: ReturnOrderStatus.RESOLUTION_PENDING,
    });

    const dto = {
      inspectorNotes: 'Hàng nguyên seal chất lượng tốt',
      items: [
        {
          returnItemId: 'item-uuid-1',
          passedQuantity: 2,
          failedQuantity: 0,
          isSealIntact: true,
          remainingPercentage: 100,
          disposition: ReturnDisposition.RESTOCK,
          reasonDetail: 'Seal nguyên vẹn',
        },
      ],
    };

    const result = await service.completeInspection(
      'ret-uuid-1',
      'inspector-uuid',
      dto,
    );

    expect(result).toBeDefined();
    expect(result.overallResult).toBe('PASSED');
    expect(result.newStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);

    // Verify inventory disposition called
    expect(
      mockInventoryDispositionService.executeItemDisposition,
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        locationId: 'store-1',
        productVariantId: 'var-1',
        disposition: ReturnDisposition.RESTOCK,
        quantity: 2,
      }),
    );

    // Verify Outbox Event created
    expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'RMA_INSPECTION_COMPLETED',
        aggregateId: 'ret-uuid-1',
      }),
    });
  });

  it('2. should reject RESTOCK for CHANGE_OF_MIND when seal is broken (TC-RMA-05)', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);

    const dto = {
      items: [
        {
          returnItemId: 'item-uuid-1',
          passedQuantity: 2,
          failedQuantity: 0,
          isSealIntact: false, // Broken seal!
          disposition: ReturnDisposition.RESTOCK, // Invalid for broken seal cosmetics
        },
      ],
    };

    await expect(
      service.completeInspection('ret-uuid-1', 'inspector-uuid', dto),
    ).rejects.toThrow(
      'Mỹ phẩm đổi ý (CHANGE_OF_MIND) đã bị bóc seal / mất niêm phong tuyệt đối không được phép tái nhập kho (RESTOCK)',
    );
  });

  it('3. should reject DEC-05 ALLERGIC claim if remainingPercentage < 80% (TC-RMA-06)', async () => {
    const allergicReturnOrder = {
      ...sampleReturnOrder,
      items: [
        {
          id: 'item-allergic-1',
          returnOrderId: 'ret-uuid-1',
          productVariantId: 'var-cream',
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
        },
      ],
    };

    mockPrisma.returnOrder.findUnique.mockResolvedValue(allergicReturnOrder);

    const dto = {
      items: [
        {
          returnItemId: 'item-allergic-1',
          passedQuantity: 1, // Tried to pass
          failedQuantity: 0,
          isSealIntact: false,
          remainingPercentage: 65, // < 80% usage
          disposition: ReturnDisposition.SCRAP,
        },
      ],
    };

    await expect(
      service.completeInspection('ret-uuid-1', 'inspector-uuid', dto),
    ).rejects.toThrow(
      'Chính sách DEC-05 quy định: Khiếu nại kích ứng (ALLERGIC) có dung tích còn lại dưới 80% không đủ điều kiện chấp thuận kiểm định đạt chuẩn',
    );
  });

  it('4. should reject RESTOCK disposition for ALLERGIC claims', async () => {
    const allergicReturnOrder = {
      ...sampleReturnOrder,
      items: [
        {
          id: 'item-allergic-1',
          returnOrderId: 'ret-uuid-1',
          productVariantId: 'var-cream',
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
        },
      ],
    };

    mockPrisma.returnOrder.findUnique.mockResolvedValue(allergicReturnOrder);

    const dto = {
      items: [
        {
          returnItemId: 'item-allergic-1',
          passedQuantity: 0,
          failedQuantity: 1,
          isSealIntact: false,
          remainingPercentage: 85,
          disposition: ReturnDisposition.RESTOCK, // Invalid: cannot restock used cosmetics
        },
      ],
    };

    await expect(
      service.completeInspection('ret-uuid-1', 'inspector-uuid', dto),
    ).rejects.toThrow(
      'Mỹ phẩm kích ứng da đã qua sử dụng tuyệt đối không được phép tái nhập kho bán lẻ (RESTOCK)',
    );
  });

  it('5. should reject inspection if ReturnOrder is not in RECEIVED or INSPECTING status', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue({
      ...sampleReturnOrder,
      status: ReturnOrderStatus.SUBMITTED,
    });

    const dto = {
      items: [
        {
          returnItemId: 'item-uuid-1',
          passedQuantity: 2,
          failedQuantity: 0,
          isSealIntact: true,
          disposition: ReturnDisposition.RESTOCK,
        },
      ],
    };

    await expect(
      service.completeInspection('ret-uuid-1', 'inspector-uuid', dto),
    ).rejects.toThrow(
      "Không thể kiểm định đơn đổi trả ở trạng thái 'SUBMITTED'",
    );
  });

  it('6. should reject inspection if passedQuantity + failedQuantity does not match item quantity', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);

    const dto = {
      items: [
        {
          returnItemId: 'item-uuid-1',
          passedQuantity: 1,
          failedQuantity: 0, // Total = 1, but return item quantity = 2
          isSealIntact: true,
          disposition: ReturnDisposition.RESTOCK,
        },
      ],
    };

    await expect(
      service.completeInspection('ret-uuid-1', 'inspector-uuid', dto),
    ).rejects.toThrow('Tổng số lượng đạt (1) và không đạt (0) phải bằng số lượng hoàn trả (2)');
  });

  it('7. should transition ReturnOrder to REJECTED when 100% items failed', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);
    mockRmaStatusAggregator.aggregate.mockReturnValue({
      overallResult: 'FAILED',
      returnOrderStatus: ReturnOrderStatus.REJECTED,
    });
    mockPrisma.returnInspection.create.mockResolvedValue({
      id: 'ins-uuid-failed',
      overallResult: 'FAILED',
    });
    mockPrisma.returnOrder.update.mockResolvedValue({
      ...sampleReturnOrder,
      status: ReturnOrderStatus.REJECTED,
    });

    const dto = {
      items: [
        {
          returnItemId: 'item-uuid-1',
          passedQuantity: 0,
          failedQuantity: 2,
          isSealIntact: false,
          disposition: ReturnDisposition.RETURN_TO_CUSTOMER,
        },
      ],
    };

    const result = await service.completeInspection(
      'ret-uuid-1',
      'inspector-uuid',
      dto,
    );

    expect(result.overallResult).toBe('FAILED');
    expect(result.newStatus).toBe(ReturnOrderStatus.REJECTED);
  });

  it('8. should get inspection details by returnOrderId', async () => {
    mockPrisma.returnInspection.findFirst.mockResolvedValue({
      id: 'ins-1',
      returnOrderId: 'ret-uuid-1',
      overallResult: 'PASSED',
    });

    const res = await service.getInspectionByReturnOrderId('ret-uuid-1');
    expect(res).toBeDefined();
    expect(res.id).toBe('ins-1');
  });

  it('9. should throw NotFoundException when inspection does not exist', async () => {
    mockPrisma.returnInspection.findFirst.mockResolvedValue(null);

    await expect(
      service.getInspectionByReturnOrderId('unknown-id'),
    ).rejects.toThrow(NotFoundException);
  });
});
