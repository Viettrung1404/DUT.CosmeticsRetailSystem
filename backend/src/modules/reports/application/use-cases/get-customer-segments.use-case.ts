import { Injectable } from '@nestjs/common';
import { RfmService } from '../services/rfm.service';
import { summarizeSegments } from '../utils/report-calculations';

@Injectable()
export class GetCustomerSegmentsUseCase {
  constructor(private readonly rfm: RfmService) {}

  async execute(userId: string, input: { storeId?: string }) {
    const { windowFrom, windowTo, customers } = await this.rfm.compute(userId, input.storeId);
    return { windowFrom, windowTo, totalCustomers: customers.length, segments: summarizeSegments(customers) };
  }
}
