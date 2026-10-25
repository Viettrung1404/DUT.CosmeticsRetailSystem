import { OpenAPIObject } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/** Describe the global response interceptor/filter without changing raw SEO responses. */
export function documentResponseEnvelopes(document: OpenAPIObject): OpenAPIObject {
  const error: SchemaObject = {
    type: 'object',
    required: ['statusCode', 'success', 'message', 'path', 'timestamp'],
    properties: {
      statusCode: { type: 'integer' },
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
      code: { type: 'string' },
      details: { type: 'object', additionalProperties: true },
      path: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };
  for (const path of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = path?.[method];
      if (!operation) continue;
      if (!operation.tags?.includes('SEO')) {
        for (const [status, response] of Object.entries(operation.responses)) {
          if (!response || !/^2\d\d$/.test(status) || status === '204' || '$ref' in response)
            continue;
          const content = response.content ?? {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              } as SchemaObject,
            },
          };
          const json = content['application/json'];
          if (!json) continue;
          const schema = json.schema ?? {};
          const resolved =
            '$ref' in schema
              ? document.components?.schemas?.[schema.$ref.split('/').pop()!]
              : schema;
          if (
            resolved &&
            !('$ref' in resolved) &&
            resolved.properties?.success &&
            resolved.properties?.data
          )
            continue;
          json.schema = {
            type: 'object',
            required: ['statusCode', 'success', 'message', 'data', 'timestamp'],
            properties: {
              statusCode: { type: 'integer', example: Number(status) },
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
              data: schema,
              timestamp: { type: 'string', format: 'date-time' },
            },
          };
          response.content = content;
        }
      }
      for (const [status, description] of Object.entries({
        400: 'Validation failed',
        401: 'Authentication or active session required',
        403: 'Access denied',
        409: 'Conflict',
        429: 'Rate limited; Retry-After is seconds',
        503: 'Required dependency unavailable',
      })) {
        operation.responses[status] ??= { description };
        const response = operation.responses[status]!;
        if ('$ref' in response) continue;
        response.content ??= { 'application/json': { schema: error } };
        if (status === '429')
          response.headers = {
            ...response.headers,
            'Retry-After': { schema: { type: 'integer', minimum: 1 } },
          };
      }
    }
  }
  return document;
}
