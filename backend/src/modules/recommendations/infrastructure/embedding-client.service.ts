import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from '../domain/product-embedding-text.util';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const DEFAULT_MAX_NEURONS_PER_DAY = 9500;
const ESTIMATED_NEURONS_PER_ITEM = 15;

@Injectable()
export class EmbeddingClientService {
  private readonly logger = new Logger(EmbeddingClientService.name);
  private dailyNeuronDate = '';
  private dailyNeuronsUsed = 0;

  constructor(@Optional() private readonly config?: ConfigService) {}

  private getEnv(key: string): string {
    return (
      this.config?.get<string>(key) ??
      process.env[key] ??
      ''
    ).trim();
  }

  isConfigured(): boolean {
    return Boolean(this.getEnv('CF_ACCOUNT_ID') && this.getEnv('CF_AI_API_TOKEN'));
  }

  getModelName(): string {
    return this.getEnv('CF_AI_EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL;
  }

  private getMaxDailyNeurons(): number {
    const raw = Number(this.getEnv('CF_AI_MAX_NEURONS_PER_DAY'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_NEURONS_PER_DAY;
  }

  private resetDailyBudgetIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyNeuronDate !== today) {
      this.dailyNeuronDate = today;
      this.dailyNeuronsUsed = 0;
    }
  }

  hasRemainingDailyBudget(itemCount = 1): boolean {
    this.resetDailyBudgetIfNeeded();
    const estimated = Math.max(1, itemCount) * ESTIMATED_NEURONS_PER_ITEM;
    return this.dailyNeuronsUsed + estimated <= this.getMaxDailyNeurons();
  }

  async embedTexts(texts: readonly string[]): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Workers AI credentials are not configured');
    }

    if (!this.hasRemainingDailyBudget(texts.length)) {
      throw new Error('Cloudflare Workers AI daily free-tier neuron budget reached');
    }

    const accountId = this.getEnv('CF_ACCOUNT_ID');
    const apiToken = this.getEnv('CF_AI_API_TOKEN');
    const model = this.getModelName();
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: texts }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (res.status === 429 || res.status >= 500) {
          const retryAfterSec = Number(res.headers.get('retry-after') ?? 0);
          const delayMs =
            retryAfterSec > 0
              ? Math.min(retryAfterSec * 1000, 5000)
              : 300 * Math.pow(2, attempt - 1);
          lastError = new Error(`Cloudflare AI HTTP ${res.status}`);
          if (attempt < MAX_RETRIES) {
            await this.sleep(delayMs);
            continue;
          }
          throw lastError;
        }

        if (!res.ok) {
          throw new Error(`Cloudflare AI HTTP ${res.status}`);
        }

        const json = (await res.json()) as {
          success?: boolean;
          result?: { data?: number[][] };
          errors?: Array<{ message?: string }>;
        };

        const vectors = json?.result?.data;
        if (
          !Array.isArray(vectors) ||
          vectors.length !== texts.length ||
          vectors.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS)
        ) {
          throw new Error('Invalid embedding payload returned by Workers AI');
        }

        this.resetDailyBudgetIfNeeded();
        this.dailyNeuronsUsed += texts.length * ESTIMATED_NEURONS_PER_ITEM;
        return vectors;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          await this.sleep(250 * Math.pow(2, attempt - 1));
          continue;
        }
      }
    }

    throw lastError ?? new Error('Cloudflare Workers AI request failed');
  }

  async embedQuery(query: string): Promise<number[] | null> {
    const clean = query.trim();
    if (!clean || !this.isConfigured()) {
      return null;
    }

    try {
      const [vector] = await this.embedTexts([clean]);
      return vector ?? null;
    } catch (error: any) {
      this.logger.warn({
        event: 'semantic_query_embedding_fallback',
        error: error?.message ?? 'unknown',
      });
      return null;
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
