import { Injectable } from '@nestjs/common';
import { RfmService } from '../services/rfm.service';
import { summarizeSegments } from '../utils/report-calculations';

@Injectable()
export class GetRfmReportUseCase {
  constructor(private readonly rfm: RfmService) {}

  async execute(userId: string, input: { storeId?: string; segment?: string; limit?: number }) {
    const { windowFrom, windowTo, customers } = await this.rfm.compute(userId, input.storeId);
    const listed = (input.segment ? customers.filter((c) => c.segment === input.segment) : customers)
      .sort((a, b) => b.monetary - a.monetary)
      .slice(0, input.limit ?? 100);
    return {
      windowFrom,
      windowTo,
      totalCustomers: customers.length,
      segments: summarizeSegments(customers),
      customers: listed,
    };
  }
}
