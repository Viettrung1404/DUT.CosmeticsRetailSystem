import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerAddressEntity } from '../../domain/entities/customer-address.entity';

export interface CreateCustomerAddressInput {
  customerId: string;
  label?: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  district: string;
  ward: string;
  isDefault?: boolean;
}

@Injectable()
export class CreateCustomerAddressUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: CreateCustomerAddressInput): Promise<CustomerAddressEntity> {
    const totalAddresses = await this.customerRepository.countAddresses(input.customerId);
    if (totalAddresses >= 10) {
      throw new BadRequestException('Khách hàng chỉ được lưu tối đa 10 địa chỉ');
    }

    const shouldBeDefault = totalAddresses === 0 || input.isDefault === true;

    if (shouldBeDefault && totalAddresses > 0) {
      await this.customerRepository.unsetDefaultAddresses(input.customerId);
    }

    return this.customerRepository.createAddress(input.customerId, {
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      addressLine: input.addressLine,
      city: input.city,
      district: input.district,
      ward: input.ward,
      isDefault: shouldBeDefault,
    });
  }
}
