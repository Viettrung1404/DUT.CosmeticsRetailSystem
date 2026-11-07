import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const money: SchemaObject = {
  type: 'string',
  description: 'Decimal tiền VND, không chuyển qua float',
  example: '100000',
};
const integer: SchemaObject = { type: 'integer' };
const summary: SchemaObject = {
  type: 'object',
  properties: {
    id: uuid,
    returnCode: { type: 'string' },
    orderId: uuid,
    returnType: { type: 'string', enum: ['REFUND', 'EXCHANGE'] },
    status: { type: 'string' },
    reason: { type: 'string' },
    refundAmount: money,
    createdAt: { type: 'string', format: 'date-time' },
  },
};
const paged = (items: SchemaObject): SchemaObject => ({
  type: 'object',
  properties: {
    items: { type: 'array', items },
    page: integer,
    limit: integer,
    total: integer,
  },
});
export const commerceSchemas: Record<string, SchemaObject> = {
  returnCreated: {
    type: 'object',
    required: ['id', 'returnCode', 'status'],
    properties: {
      id: uuid,
      returnCode: { type: 'string' },
      status: { type: 'string', example: 'REQUESTED' },
    },
  },
  returns: paged(summary),
  returnDetail: {
    ...summary,
    properties: {
      ...summary.properties,
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: uuid,
            orderItemId: uuid,
            productVariantId: uuid,
            quantity: integer,
            condition: { type: 'string', nullable: true },
            refundAmount: money,
            pointsToRestore: integer,
          },
        },
      },
      quoteVersion: integer,
      quoteExpiresAt: { type: 'string', format: 'date-time', nullable: true },
      quoteSnapshot: {
        type: 'object',
        nullable: true,
        description:
          'Báo giá public gồm lines, fee, credit, payable; không có cost',
      },
      settlement: {
        type: 'object',
        nullable: true,
        description:
          'replacementOrderId, creditApplied, additionalDue, refundDue, status; tiền là Decimal string',
      },
      refunds: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: uuid, amount: money, status: { type: 'string' } },
        },
      },
      history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            note: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      attachments: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: uuid, mimeType: { type: 'string' }, size: integer },
        },
      },
    },
  },
  exchange: {
    type: 'object',
    properties: {
      replacementOrderId: uuid,
      settlement: {
        type: 'object',
        properties: {
          id: uuid,
          returnOrderId: uuid,
          replacementOrderId: uuid,
          returnCredit: money,
          replacementPayable: money,
          creditApplied: money,
          additionalDue: money,
          refundDue: money,
          status: { type: 'string', example: 'ACTIVE' },
        },
      },
    },
  },
  loyalty: {
    type: 'object',
    properties: {
      balance: integer,
      tier: { type: 'object', nullable: true },
      nextTier: { type: 'object', nullable: true },
      history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: uuid,
            orderId: { ...uuid, nullable: true },
            points: integer,
            type: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      page: integer,
      limit: integer,
      total: integer,
    },
  },
  rewards: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        version: { type: 'string' },
        pointsCost: integer,
        discountType: { type: 'string' },
        discountValue: { type: 'number' },
        minOrderAmount: { type: 'number' },
        validityDays: integer,
      },
    },
  },
  redemption: {
    type: 'object',
    properties: {
      redemptionId: uuid,
      balance: integer,
      coupon: {
        type: 'object',
        properties: {
          id: uuid,
          code: { type: 'string' },
          discountType: { type: 'string' },
          discountValue: money,
          endDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  wishlist: {
    type: 'object',
    properties: { productId: uuid, isWishlisted: { type: 'boolean' } },
  },
  wishlists: paged({
    type: 'object',
    description: 'Public ProductResponseDto và isWishlisted=true',
  }),
  tracking: {
    type: 'object',
    properties: {
      id: uuid,
      status: { type: 'string' },
      shipments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: uuid,
            carrierCode: { type: 'string' },
            trackingCode: { type: 'string', nullable: true },
            trackingUrl: { type: 'string', nullable: true },
            status: { type: 'string' },
            events: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      statusHistories: { type: 'array', items: { type: 'object' } },
    },
  },
  notifications: {
    ...paged({
      type: 'object',
      properties: {
        id: uuid,
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object' },
        isRead: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    }),
    properties: {
      ...paged({}).properties,
      items: { type: 'array', items: { type: 'object' } },
      unreadCount: integer,
    },
  },
  read: {
    type: 'object',
    properties: { id: uuid, isRead: { type: 'boolean' } },
  },
  device: {
    type: 'object',
    properties: {
      id: uuid,
      platform: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  },
  image: {
    type: 'object',
    properties: {
      attachmentId: uuid,
      mimeType: { type: 'string' },
      size: integer,
    },
  },
  imageUrl: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      expiresIn: { type: 'integer', example: 300 },
    },
  },
};
export function CommerceResponse(
  name: keyof typeof commerceSchemas,
  status = 200,
) {
  return ApiResponse({
    status,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: status },
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: commerceSchemas[name],
      },
    },
  });
}
export function CommerceErrors() {
  return applyDecorators(
    ...[400, 401, 403, 404, 409, 413, 429, 503].map((status) =>
      ApiResponse({
        status,
        description:
          status === 503
            ? 'Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch'
            : 'Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ',
        schema: {
          type: 'object',
          properties: {
            statusCode: integer,
            success: { type: 'boolean' },
            code: {
              type: 'string',
              description: 'Mã nghiệp vụ ổn định nếu có',
            },
            message: { type: 'string' },
          },
        },
      }),
    ),
  );
}
