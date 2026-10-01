import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerEntity } from '../../domain/entities/customer.entity';

export interface UpdateCustomerProfileInput {
  customerId: string;
  fullName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
}

@Injectable()
export class UpdateCustomerProfileUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: UpdateCustomerProfileInput): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new NotFoundException('Hồ sơ khách hàng không tồn tại');
    }

    const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;

    return this.customerRepository.updateProfile(input.customerId, {
      fullName: input.fullName,
      phone: input.phone,
      gender: input.gender,
      dateOfBirth,
    });
  }
}
