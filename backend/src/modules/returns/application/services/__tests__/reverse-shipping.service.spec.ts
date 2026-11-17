import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReverseShippingService } from '../reverse-shipping.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';
import {
  ReturnChannel,
  ReturnOrderStatus,
} from '../../../domain/entities/return-policy.entity';

describe('EP14-T02: ReverseShippingService Unit Tests', () => {
  let service: ReverseShippingService;
  let prisma: any;
  let outboxWriter: any;
  let configService: any;

  const mockReturnOrderId = 'ret-uuid-2222';
  const mockOperatorId = 'user-staff-3333';
  const mockWarehouseId = 'wh-uuid-4444';
  const mockOrderId = 'order-uuid-5555';

  const mockReturnOrder = {
    id: mockReturnOrderId,
    orderId: mockOrderId,
    returnCode: 'RET-20261117-2002',
    returnChannel: ReturnChannel.CARRIER_PICKUP,
    status: ReturnOrderStatus.SUBMITTED,
    pickupAddress: '789 Vo Van Tan, Phuong 6, Quan 3, TP.HCM',
    storeId: mockWarehouseId,
    items: [
      {
        id: 'ret-item-1',
        productVariantId: 'var-1',
        quantity: 1,
      },
    ],
    order: {
      orderNumber: 'ORD-20261117-0001',
      storeId: mockWarehouseId,
    },
    shipments: [],
  };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        findUnique: jest.fn().mockResolvedValue(mockReturnOrder),
        update: jest.fn(),
      },
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: mockWarehouseId, type: 'WAREHOUSE' }),
      },
      shipment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        return callback(prisma);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-2' }),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReverseShippingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxWriterService, useValue: outboxWriter },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ReverseShippingService>(ReverseShippingService);
  });

  describe('dispatchReturnPickup', () => {
    it('1. should throw NotFoundException when ReturnOrder does not exist', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.dispatchReturnPickup('non-existent', mockOperatorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('2. should throw BadRequestException when channel is not CARRIER_PICKUP', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturnOrder,
        returnChannel: ReturnChannel.STORE_DROPOFF,
      });

      await expect(
        service.dispatchReturnPickup(mockReturnOrderId, mockOperatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('3. should throw BadRequestException when pickupAddress is missing', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturnOrder,
        pickupAddress: null,
      });

      await expect(
        service.dispatchReturnPickup(mockReturnOrderId, mockOperatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. should throw ConflictException when returnOrder status is invalid (e.g. RECEIVED)', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturnOrder,
        status: ReturnOrderStatus.RECEIVED,
      });

      await expect(
        service.dispatchReturnPickup(mockReturnOrderId, mockOperatorId),
      ).rejects.toThrow(ConflictException);
    });

    it('5. should throw ConflictException when active RETURN_PICKUP shipment already exists', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturnOrder,
        shipments: [
          {
            id: 'shp-1',
            trackingCode: 'LAD123456',
            status: 'READY_TO_PICK',
            shipmentType: 'RETURN_PICKUP',
          },
        ],
      });

      await expect(
        service.dispatchReturnPickup(mockReturnOrderId, mockOperatorId),
      ).rejects.toThrow(ConflictException);
    });

    it('6. should successfully dispatch GHN return pickup with LAD tracking code & Outbox event', async () => {
      const mockCreatedShipment = {
        id: 'shp-uuid-created',
        orderId: mockOrderId,
        returnOrderId: mockReturnOrderId,
        shipmentCode: 'SHP-REV-20261117-9999',
        shipmentType: 'RETURN_PICKUP',
        carrierCode: 'GHN',
        trackingCode: 'LAD987654',
        shippingLabelUrl: 'https://online-gateway.ghn.vn/a5/print/LAD987654',
        status: 'READY_TO_PICK',
        createdAt: new Date(),
      };

      const mockUpdatedReturnOrder = {
        ...mockReturnOrder,
        status: ReturnOrderStatus.APPROVED,
        handledBy: mockOperatorId,
      };

      prisma.shipment.create.mockResolvedValue(mockCreatedShipment);
      prisma.returnOrder.update.mockResolvedValue(mockUpdatedReturnOrder);

      const result = await service.dispatchReturnPickup(
        mockReturnOrderId,
        mockOperatorId,
        { destinationWarehouseId: mockWarehouseId },
      );

      // Verify shipment creation
      expect(prisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: mockOrderId,
            returnOrderId: mockReturnOrderId,
            shipmentType: 'RETURN_PICKUP',
            carrierCode: 'GHN',
            status: 'READY_TO_PICK',
            trackingCode: expect.stringMatching(/^LAD\d{6}$/),
          }),
        }),
      );

      // Verify ReturnOrder update
      expect(prisma.returnOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockReturnOrderId },
          data: expect.objectContaining({
            status: ReturnOrderStatus.APPROVED,
            handledBy: mockOperatorId,
          }),
        }),
      );

      // Verify Outbox Event: RETURN_PICKUP_DISPATCHED
      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'RETURN_ORDER',
          aggregateId: mockReturnOrderId,
          eventType: 'RETURN_PICKUP_DISPATCHED',
          payload: expect.objectContaining({
            returnOrderId: mockReturnOrderId,
            carrierCode: 'GHN',
            pickupAddress: mockReturnOrder.pickupAddress,
          }),
        }),
      );

      expect(result.shipment).toBeDefined();
      expect(result.returnOrder.status).toBe(ReturnOrderStatus.APPROVED);
    });
  });

  describe('handleCarrierPickedUp', () => {
    it('7. should throw NotFoundException if shipment does not exist', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleCarrierPickedUp('LAD000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('8. should return shipment as-is if no returnOrderId is linked', async () => {
      const regularShipment = {
        id: 'shp-outbound',
        trackingCode: 'LAD111111',
        returnOrderId: null,
      };
      prisma.shipment.findUnique.mockResolvedValue(regularShipment);

      const result = await service.handleCarrierPickedUp('LAD111111');
      expect(result).toEqual(regularShipment);
      expect(prisma.shipment.update).not.toHaveBeenCalled();
    });

    it('9. should transition shipment & return order to IN_TRANSIT with Outbox event', async () => {
      const returnShipment = {
        id: 'shp-ret-pickup',
        trackingCode: 'LAD222222',
        returnOrderId: mockReturnOrderId,
        carrierCode: 'GHN',
      };
      prisma.shipment.findUnique.mockResolvedValue(returnShipment);

      const updatedShipment = { ...returnShipment, status: 'IN_TRANSIT' };
      const updatedReturnOrder = { ...mockReturnOrder, status: 'IN_TRANSIT' };

      prisma.shipment.update.mockResolvedValue(updatedShipment);
      prisma.returnOrder.update.mockResolvedValue(updatedReturnOrder);

      const result = await service.handleCarrierPickedUp('LAD222222');

      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: returnShipment.id },
          data: { status: 'IN_TRANSIT' },
        }),
      );

      expect(prisma.returnOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockReturnOrderId },
          data: { status: 'IN_TRANSIT' },
        }),
      );

      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'RETURN_ORDER',
          aggregateId: mockReturnOrderId,
          eventType: 'RMA_IN_TRANSIT',
          payload: expect.objectContaining({
            returnOrderId: mockReturnOrderId,
            trackingCode: 'LAD222222',
            status: 'IN_TRANSIT',
          }),
        }),
      );

      expect((result as any).shipment.status).toBe('IN_TRANSIT');
      expect((result as any).returnOrder.status).toBe('IN_TRANSIT');
    });
  });
});
