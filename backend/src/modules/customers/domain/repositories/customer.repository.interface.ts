import { CustomerEntity } from '../entities/customer.entity';
import { CustomerAddressEntity } from '../entities/customer-address.entity';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface ICustomerRepository {
  findByUserId(userId: string): Promise<CustomerEntity | null>;
  findById(id: string): Promise<CustomerEntity | null>;
  findAddressesByCustomerId(customerId: string): Promise<CustomerAddressEntity[]>;
  findAddressById(addressId: string): Promise<CustomerAddressEntity | null>;
  countAddresses(customerId: string): Promise<number>;
  createAddress(customerId: string, address: Omit<CustomerAddressEntity, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'getFullAddress'>): Promise<CustomerAddressEntity>;
  updateAddress(addressId: string, address: Partial<Omit<CustomerAddressEntity, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'getFullAddress'>>): Promise<CustomerAddressEntity>;
  deleteAddress(addressId: string): Promise<void>;
  unsetDefaultAddresses(customerId: string): Promise<void>;
  setDefaultAddress(customerId: string, addressId: string): Promise<void>;
  updateProfile(
    customerId: string,
    data: {
      fullName?: string;
      phone?: string;
      gender?: string;
      dateOfBirth?: Date | null;
    },
  ): Promise<CustomerEntity>;
}

