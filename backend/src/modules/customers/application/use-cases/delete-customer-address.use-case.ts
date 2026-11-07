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

    // Nếu địa chỉ vừa xóa là địa chỉ mặc định, tự động chuyển mặc định cho địa chỉ còn lại mới nhất
    if (address.isDefault) {
      const remainingAddresses = await this.customerRepository.findAddressesByCustomerId(input.customerId);
      if (remainingAddresses.length > 0) {
        await this.customerRepository.setDefaultAddress(input.customerId, remainingAddresses[0].id);
      }
    }
  }
}

