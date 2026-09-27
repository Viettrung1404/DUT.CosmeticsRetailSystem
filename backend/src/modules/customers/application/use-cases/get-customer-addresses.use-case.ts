import { Inject, Injectable } from '@nestjs/common';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerAddressEntity } from '../../domain/entities/customer-address.entity';

@Injectable()
export class GetCustomerAddressesUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(customerId: string): Promise<CustomerAddressEntity[]> {
    return this.customerRepository.findAddressesByCustomerId(customerId);
  }
}
