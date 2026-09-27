import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../domain/entities/cart.entity';

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

  async execute(input: MergeCartInput): Promise<CartEntity> {
    if (!input.sessionId || !input.customerId) {
      throw new BadRequestException('Phải cung cấp cả sessionId và customerId');
    }

    const guestCart = await this.cartRepository.findCart({ sessionId: input.sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      const existingCustomerCart = await this.cartRepository.findCart({ customerId: input.customerId });
      return existingCustomerCart || new CartEntity({ id: '', customerId: input.customerId, items: [] });
    }

    let customerCart = await this.cartRepository.findCart({ customerId: input.customerId });
    if (!customerCart) {
      customerCart = await this.cartRepository.createCart({ customerId: input.customerId });
    }

    const merged = await this.cartRepository.mergeCarts(guestCart.id, customerCart.id);
    return merged;
  }
}
