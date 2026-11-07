import { ServiceUnavailableException } from '@nestjs/common';
import { GatewayCallNotStartedError } from '../../domain/gateway-call-not-started.error';
import {
  GatewayHttp,
  parseGatewayJson,
} from './gateway-adapters';

export function createGatewayTransport(method: string): GatewayHttp {
  const starts: number[] = [];
  return async (url, body, form = false) => {
    if (new URL(url).protocol !== 'https:')
      throw new GatewayCallNotStartedError();
    const qps = Number(process.env[`${method}_MAX_QPS`]);
    if (!Number.isInteger(qps) || qps < 1)
      throw new GatewayCallNotStartedError();
    const now = Date.now();
    while (starts.length && starts[0] < now - 1000) starts.shift();
    if (starts.length >= qps) throw new GatewayCallNotStartedError();
    starts.push(now);
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': form
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
      },
      body: form
        ? new URLSearchParams(
            Object.entries(body).map(([key, value]) => [
              key,
              String(value),
            ]),
          ).toString()
        : JSON.stringify(body),
    });
    if (!response.ok)
      throw new ServiceUnavailableException('Gateway HTTP error');
    const raw = await response.text();
    if (raw.length > 256 * 1024)
      throw new ServiceUnavailableException('Gateway response too large');
    return parseGatewayJson(raw);
  };
}
