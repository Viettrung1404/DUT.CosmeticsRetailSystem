const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlToUint8Array(input: string): Uint8Array<ArrayBuffer> {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> | null {
  try {
    const bytes = base64UrlToUint8Array(segment);
    const parsed = JSON.parse(decoder.decode(bytes));
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export interface VerifiedJwtClaims {
  customerId: string | null;
  userId: string | null;
}

/**
 * Edge HS256 JWT verification via Web Crypto API (<1ms CPU, zero dependencies).
 * Extracts both customerId (if present) and userId/sub (matching NestJS JwtAuthGuard payload).
 */
export async function verifyJwtClaims(
  authorizationHeader: string | null,
  jwtSecret?: string,
  nowMs = Date.now(),
): Promise<VerifiedJwtClaims> {
  if (!authorizationHeader || !jwtSecret) {
    return { customerId: null, userId: null };
  }

  const match = authorizationHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    return { customerId: null, userId: null };
  }

  const parts = match[1].split('.');
  if (parts.length !== 3) {
    return { customerId: null, userId: null };
  }

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson(headerSeg);
  if (!header || header.alg !== 'HS256') {
    return { customerId: null, userId: null };
  }

  const payload = decodeBase64UrlJson(payloadSeg);
  if (!payload) {
    return { customerId: null, userId: null };
  }

  if (typeof payload.exp === 'number' && payload.exp * 1000 <= nowMs) {
    return { customerId: null, userId: null };
  }
  if (typeof payload.nbf === 'number' && payload.nbf * 1000 > nowMs) {
    return { customerId: null, userId: null };
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signatureBytes = base64UrlToUint8Array(sigSeg);
    const signingInput = encoder.encode(`${headerSeg}.${payloadSeg}`);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as BufferSource,
      signingInput as BufferSource,
    );
    if (!valid) {
      return { customerId: null, userId: null };
    }

    const customerId =
      typeof payload.customerId === 'string' && payload.customerId
        ? payload.customerId
        : null;
    const userId =
      typeof payload.userId === 'string' && payload.userId
        ? payload.userId
        : typeof payload.sub === 'string' && payload.sub
          ? payload.sub
          : null;

    return { customerId, userId };
  } catch {
    return { customerId: null, userId: null };
  }
}

export async function verifyJwtCustomerId(
  authorizationHeader: string | null,
  jwtSecret?: string,
  nowMs = Date.now(),
): Promise<string | null> {
  const claims = await verifyJwtClaims(authorizationHeader, jwtSecret, nowMs);
  return claims.customerId ?? claims.userId ?? null;
}
