import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiPagedOkResponse(item: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(item),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(item) } },
          meta: {
            type: 'object',
            required: ['page', 'limit', 'itemCount', 'pageCount', 'hasPreviousPage', 'hasNextPage'],
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              itemCount: { type: 'integer', example: 120 },
              pageCount: { type: 'integer', example: 6 },
              hasPreviousPage: { type: 'boolean', example: false },
              hasNextPage: { type: 'boolean', example: true },
            },
          },
        },
      },
    }),
  );
}
