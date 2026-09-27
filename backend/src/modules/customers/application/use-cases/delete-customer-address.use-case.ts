import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from '../../domain/repositories/customer.repository.interface';

export interface DeleteCustomerAddressInput {
  addressId: string;
  customerId: string;
}

@Injectable()
export class DeleteCustomerAddressUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: DeleteCustomerAddressInput): Promise<void> {
    const address = await this.customerRepository.findAddressById(input.addressId);
    if (!address) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    if (address.customerId !== input.customerId) {
      throw new ForbiddenException('Bạn không có quyền xóa địa chỉ này');
    }

    await this.customerRepository.deleteAddress(input.addressId);
  }
}

@Injectable()
export class SetDefaultAddressUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: { addressId: string; customerId: string }): Promise<void> {
    const address = await this.customerRepository.findAddressById(input.addressId);
    if (!address) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    if (address.customerId !== input.customerId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên địa chỉ này');
    }

    await this.customerRepository.unsetDefaultAddresses(input.customerId);
    await this.customerRepository.setDefaultAddress(input.customerId, input.addressId);
  }
}
