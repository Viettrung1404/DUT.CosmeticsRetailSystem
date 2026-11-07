import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PosCustomerInfo } from '../../domain/entities/pos-lookup.entity';
import {
  IPosCustomerRepository,
  POS_CUSTOMER_REPOSITORY,
} from '../../domain/repositories/pos-customer.repository.interface';

@Injectable()
export class LookupPosCustomerUseCase {
  constructor(
    @Inject(POS_CUSTOMER_REPOSITORY)
    private readonly repository: IPosCustomerRepository,
  ) {}

  async execute(phone: string): Promise<PosCustomerInfo> {
    const customer = await this.repository.findByPhone(phone);
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng với số điện thoại này');
    }
    return customer;
  }
}
