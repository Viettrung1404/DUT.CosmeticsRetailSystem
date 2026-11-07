import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PosOrderResult, PosPaymentInput } from '../../domain/entities/pos-sale.entity';
import {
  IPosOrderRepository,
  POS_ORDER_REPOSITORY,
} from '../../domain/repositories/pos-order.repository.interface';
import {
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSaleInput, PosSalePlanner } from '../services/pos-sale-planner.service';
import { settlePayments } from '../utils/pos-payment.util';

export interface CreatePosOrderInput extends PosSaleInput {
  payments: PosPaymentInput[];
  note?: string;
}

@Injectable()
export class CreatePosOrderUseCase {
  constructor(
    private readonly planner: PosSalePlanner,
    @Inject(POS_ORDER_REPOSITORY)
    private readonly orderRepository: IPosOrderRepository,
    @Inject(POS_SESSION_REPOSITORY)
    private readonly sessionRepository: IPosSessionRepository,
  ) {}

  async execute(
    userId: string,
    permissionCodes: string[],
    input: CreatePosOrderInput,
  ): Promise<PosOrderResult> {
    const now = new Date();
    const plan = await this.planner.plan(userId, permissionCodes, input, now);

    // Chỉ bán khi chính mình đang có ca mở tại đúng cửa hàng này
    const session = await this.sessionRepository.findOpenByCashier(userId);
    if (!session || session.storeId !== input.storeId) {
      throw new ConflictException('Bạn chưa mở ca tại cửa hàng này, hãy mở ca trước khi bán');
    }

    if (plan.shortages.length > 0) {
      const first = plan.shortages[0];
      throw new ConflictException(
        `Không đủ hàng: ${first.productName}${first.variantName ? ` (${first.variantName})` : ''}, cần ${first.requested}, còn bán được ${first.sellable}`,
      );
    }

    const settlement = settlePayments(plan.pricing.total, input.payments);

    const sale = await this.orderRepository.createSale({
      orderNumberDate: now,
      storeId: input.storeId,
      sessionId: session.id,
      cashierUserId: userId,
      customerId: plan.context.customer?.id ?? null,
      couponId: plan.context.coupon?.id ?? null,
      note: input.note?.trim() || null,
      pricing: plan.pricing,
      settlement,
      employee: plan.context.employee,
      pointRate: plan.context.pointRate,
      promotionIds: plan.promotionIds,
    });

    const customer = plan.context.customer;
    return {
      sale,
      pricing: plan.pricing,
      settlement,
      customer: customer
        ? {
            id: customer.id,
            fullName: customer.fullName,
            phone: customer.phone,
            totalPoints: customer.totalPoints - plan.pricing.pointsUsed + sale.pointsEarned,
          }
        : null,
    };
  }
}
