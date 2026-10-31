import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
export function guestSessionHash(session: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      session ?? '',
    )
  )
    throw new BadRequestException('GUEST_SESSION_REQUIRED');
  return createHash('sha256').update(`guest-checkout:${session}`).digest('hex');
}
export function checkoutRequestHash(input: unknown): string {
  const canonical = (value: any): any =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .filter((key) => value[key] !== undefined)
              .map((key) => [key, canonical(value[key])]),
          )
        : value;
  return createHash('sha256')
    .update(JSON.stringify(canonical(input)))
    .digest('hex');
}
