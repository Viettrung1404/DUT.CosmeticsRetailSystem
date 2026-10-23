import { Injectable } from '@nestjs/common';
import { PosPreviewResult } from '../../domain/entities/pos-sale.entity';
import { PosSaleInput, PosSalePlanner } from '../services/pos-sale-planner.service';

@Injectable()
export class PreviewPosOrderUseCase {
  constructor(private readonly planner: PosSalePlanner) {}

  async execute(
    userId: string,
    permissionCodes: string[],
    input: PosSaleInput,
  ): Promise<PosPreviewResult> {
    const { context, pricing, shortages } = await this.planner.plan(userId, permissionCodes, input);
    return {
      pricing,
      shortages,
      customer: context.customer
        ? {
            id: context.customer.id,
            fullName: context.customer.fullName,
            phone: context.customer.phone,
            totalPoints: context.customer.totalPoints,
          }
        : null,
    };
  }
}
