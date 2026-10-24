import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PosCustomerInfo } from '../../domain/entities/pos-lookup.entity';
import {
  IPosCustomerRepository,
  POS_CUSTOMER_REPOSITORY,
} from '../../domain/repositories/pos-customer.repository.interface';

const PHONE_EXISTS = 'Số điện thoại này đã có khách hàng';

@Injectable()
export class CreatePosCustomerUseCase {
  constructor(
    @Inject(POS_CUSTOMER_REPOSITORY)
    private readonly repository: IPosCustomerRepository,
  ) {}

  // BR-09: mỗi số điện thoại chỉ một khách
  async execute(input: { phone: string; fullName: string }): Promise<PosCustomerInfo> {
    if (await this.repository.findByPhone(input.phone)) {
      throw new ConflictException(PHONE_EXISTS);
    }
    const created = await this.repository.create(input);
    if (!created) {
      throw new ConflictException(PHONE_EXISTS);
    }
    return created;
  }
}
