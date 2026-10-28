import { ApiOkResponse } from '@nestjs/swagger';

// Both providers return this same union inside the global response envelope's data.
export function OAuthLoginResponse() {
  return ApiOkResponse({
    description:
      'GlowUp session or bound onboarding/link challenge; never treat a challenge as login',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/LoginResponseDto' },
        {
          type: 'object',
          required: ['code', 'challenge', 'expiresIn'],
          properties: {
            code: {
              type: 'string',
              enum: ['ACCOUNT_LINK_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED'],
            },
            challenge: { type: 'string', minLength: 64, maxLength: 64 },
            expiresIn: { type: 'integer', example: 600 },
          },
        },
      ],
    },
  });
}
