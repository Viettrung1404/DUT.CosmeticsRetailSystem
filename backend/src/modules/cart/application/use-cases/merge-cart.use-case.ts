import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';

export interface MergeCartInput {
  sessionId: string;
  customerId: string;
}

@Injectable()
export class MergeCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(input: MergeCartInput): Promise<void> {
    if (!input.sessionId || !input.customerId) {
      throw new BadRequestException('Phải cung cấp cả sessionId và customerId');
    }

    const guestCart = await this.cartRepository.findCart({ sessionId: input.sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      // Nothing to merge — guest cart empty or not found
      return;
    }

    let customerCart = await this.cartRepository.findCart({ customerId: input.customerId });
    if (!customerCart) {
      customerCart = await this.cartRepository.createCart({ customerId: input.customerId });
    }

    // #2 + #3 + #6: mergeCarts now uses $transaction, batch processing, stock validation
    await this.cartRepository.mergeCarts(guestCart.id, customerCart.id);

    // #7: No more double fetch — controller calls GetCartUseCase once
  }
}
