import { Injectable, Logger } from '@nestjs/common';
import { RecommendationRepository } from '../../infrastructure/recommendation.repository';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MergeAnonymousEventsInput {
  customerId: string;
  anonymousId?: string | null;
}

@Injectable()
export class MergeAnonymousEventsUseCase {
  private readonly logger = new Logger(MergeAnonymousEventsUseCase.name);

  constructor(private readonly repository: RecommendationRepository) {}

  async execute(input: MergeAnonymousEventsInput): Promise<number> {
    const customerId = input.customerId?.trim();
    const anonymousId = input.anonymousId?.trim();

    if (!customerId || !anonymousId || !UUID_PATTERN.test(customerId)) {
      return 0;
    }

    return this.repository.mergeAnonymousEventsToCustomer(
      customerId,
      anonymousId,
    );
  }

  async mergeForUser(
    userId: string,
    anonymousId?: string | null,
  ): Promise<number> {
    const trimmedAnon = anonymousId?.trim();
    if (!userId || !trimmedAnon) {
      return 0;
    }

    const customerId = await this.repository.findCustomerIdByUserId(userId);
    if (!customerId) {
      return 0;
    }

    return this.execute({ customerId, anonymousId: trimmedAnon });
  }

  /**
   * Phiên bản non-blocking/fail-safe dùng trong luồng Login & Register để không
   * bao giờ làm gián đoạn hoặc chậm phản hồi xác thực.
   */
  async mergeForUserSafe(
    userId: string,
    anonymousId?: string | null,
  ): Promise<number> {
    try {
      return await this.mergeForUser(userId, anonymousId);
    } catch (error: any) {
      this.logger.warn(
        `Non-fatal anonymous behavior merge failure for user ${userId}: ${error?.message ?? 'unknown'}`,
      );
      return 0;
    }
  }
}
