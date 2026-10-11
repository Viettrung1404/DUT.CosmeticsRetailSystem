import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository.interface';
import { CustomerEntity } from '../../../domain/entities/customer.entity';
import { CustomerAddressEntity } from '../../../domain/entities/customer-address.entity';
import { GetCustomerProfileUseCase } from '../get-customer-profile.use-case';
import { UpdateCustomerProfileUseCase } from '../update-customer-profile.use-case';
import { GetCustomerAddressesUseCase } from '../get-customer-addresses.use-case';
import { CreateCustomerAddressUseCase } from '../create-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from '../update-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from '../delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from '../set-default-address.use-case';

describe('Customer Use Cases (Application TDD)', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let getProfileUseCase: GetCustomerProfileUseCase;
  let updateProfileUseCase: UpdateCustomerProfileUseCase;
  let getAddressesUseCase: GetCustomerAddressesUseCase;
  let createAddressUseCase: CreateCustomerAddressUseCase;
  let updateAddressUseCase: UpdateCustomerAddressUseCase;
  let deleteAddressUseCase: DeleteCustomerAddressUseCase;
  let setDefaultAddressUseCase: SetDefaultAddressUseCase;

  beforeEach(() => {
    mockRepo = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findAddressesByCustomerId: jest.fn(),
      findAddressById: jest.fn(),
      countAddresses: jest.fn(),
      createAddress: jest.fn(),
      updateAddress: jest.fn(),
      deleteAddress: jest.fn(),
      unsetDefaultAddresses: jest.fn(),
      setDefaultAddress: jest.fn(),
      updateProfile: jest.fn(),
    };

    getProfileUseCase = new GetCustomerProfileUseCase(mockRepo);
    updateProfileUseCase = new UpdateCustomerProfileUseCase(mockRepo);
    getAddressesUseCase = new GetCustomerAddressesUseCase(mockRepo);
    createAddressUseCase = new CreateCustomerAddressUseCase(mockRepo);
    updateAddressUseCase = new UpdateCustomerAddressUseCase(mockRepo);
    deleteAddressUseCase = new DeleteCustomerAddressUseCase(mockRepo);
    setDefaultAddressUseCase = new SetDefaultAddressUseCase(mockRepo);
  });

  describe('GetCustomerProfileUseCase', () => {
    it('should throw NotFoundException if customer not found', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);

      await expect(getProfileUseCase.execute('user-999')).rejects.toThrow(NotFoundException);
    });

    it('should return customer profile', async () => {
      const customer = new CustomerEntity({
        id: 'cust-1',
        userId: 'user-1',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        totalPoints: 100,
        totalSpent: 2000000,
        totalOrders: 3,
      });
      mockRepo.findByUserId.mockResolvedValue(customer);

      const res = await getProfileUseCase.execute('user-1');
      expect(res.id).toBe('cust-1');
      expect(res.fullName).toBe('Nguyễn Văn A');
      expect(res.totalPoints).toBe(100);
    });
  });

  describe('UpdateCustomerProfileUseCase', () => {
    it('should throw NotFoundException if customer not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        updateProfileUseCase.execute({ customerId: 'cust-999', fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update customer profile successfully', async () => {
      const existing = new CustomerEntity({
        id: 'cust-1',
        fullName: 'Old Name',
      });
      const updated = new CustomerEntity({
        id: 'cust-1',
        fullName: 'New Name',
        phone: '0909999999',
        gender: 'FEMALE',
      });
      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.updateProfile.mockResolvedValue(updated);

      const res = await updateProfileUseCase.execute({
        customerId: 'cust-1',
        fullName: 'New Name',
        phone: '0909999999',
        gender: 'FEMALE',
      });

      expect(mockRepo.updateProfile).toHaveBeenCalledWith('cust-1', {
        fullName: 'New Name',
        phone: '0909999999',
        gender: 'FEMALE',
        dateOfBirth: undefined,
      });
      expect(res.fullName).toBe('New Name');
    });
  });

  describe('Customer Address Use Cases', () => {
    it('should throw BadRequestException when creating more than 10 addresses', async () => {
      mockRepo.countAddresses.mockResolvedValue(10);

      await expect(
        createAddressUseCase.execute({
          customerId: 'cust-1',
          recipientName: 'Văn A',
          phone: '0901234567',
          addressLine: '123 Đường A',
          city: 'Đà Nẵng',
          district: 'Hải Châu',
          ward: 'Thạch Thang',
          isDefault: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create address and unset default if isDefault is true', async () => {
      mockRepo.countAddresses.mockResolvedValue(2);
      mockRepo.unsetDefaultAddresses.mockResolvedValue();
      const created = new CustomerAddressEntity({
        id: 'addr-new',
        customerId: 'cust-1',
        recipientName: 'Văn A',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: true,
      });
      mockRepo.createAddress.mockResolvedValue(created);

      const res = await createAddressUseCase.execute({
        customerId: 'cust-1',
        recipientName: 'Văn A',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: true,
      });

      expect(mockRepo.unsetDefaultAddresses).toHaveBeenCalledWith('cust-1');
      expect(res.id).toBe('addr-new');
      expect(res.isDefault).toBe(true);
    });

    it('should auto-set isDefault = true if this is the first address', async () => {
      mockRepo.countAddresses.mockResolvedValue(0);
      mockRepo.createAddress.mockImplementation(async (cId, data) => {
        return new CustomerAddressEntity({
          id: 'addr-first',
          customerId: cId,
          ...data,
        });
      });

      const res = await createAddressUseCase.execute({
        customerId: 'cust-1',
        recipientName: 'Văn A',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: false, // user didn't check default, but it's first
      });

      expect(res.isDefault).toBe(true);
    });

    it('should prevent updating or deleting another customer address (IDOR prevention)', async () => {
      const otherAddress = new CustomerAddressEntity({
        id: 'addr-2',
        customerId: 'cust-OTHER',
        recipientName: 'Người khác',
        phone: '0909999999',
        addressLine: '456 Đường B',
        city: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        isDefault: false,
      });
      mockRepo.findAddressById.mockResolvedValue(otherAddress);

      await expect(
        updateAddressUseCase.execute({
          addressId: 'addr-2',
          customerId: 'cust-1', // current customer is cust-1
          recipientName: 'Hacker',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        deleteAddressUseCase.execute({
          addressId: 'addr-2',
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set default address and unset previous default', async () => {
      const myAddress = new CustomerAddressEntity({
        id: 'addr-1',
        customerId: 'cust-1',
        recipientName: 'Tôi',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: false,
      });
      mockRepo.findAddressById.mockResolvedValue(myAddress);
      mockRepo.unsetDefaultAddresses.mockResolvedValue();
      mockRepo.setDefaultAddress.mockResolvedValue();

      await setDefaultAddressUseCase.execute({
        addressId: 'addr-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.unsetDefaultAddresses).toHaveBeenCalledWith('cust-1');
      expect(mockRepo.setDefaultAddress).toHaveBeenCalledWith('cust-1', 'addr-1');
    });

    it('should prevent unsetting default on an address that is currently default', async () => {
      const defaultAddress = new CustomerAddressEntity({
        id: 'addr-def',
        customerId: 'cust-1',
        recipientName: 'Tôi',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: true,
      });
      mockRepo.findAddressById.mockResolvedValue(defaultAddress);

      await expect(
        updateAddressUseCase.execute({
          addressId: 'addr-def',
          customerId: 'cust-1',
          isDefault: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-promote remaining address to default when deleting default address', async () => {
      const defaultAddress = new CustomerAddressEntity({
        id: 'addr-def',
        customerId: 'cust-1',
        recipientName: 'Tôi',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: true,
      });
      const remainingAddress = new CustomerAddressEntity({
        id: 'addr-rem',
        customerId: 'cust-1',
        recipientName: 'Tôi 2',
        phone: '0901234567',
        addressLine: '456 Đường B',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        isDefault: false,
      });

      mockRepo.findAddressById.mockResolvedValue(defaultAddress);
      mockRepo.deleteAddress.mockResolvedValue();
      mockRepo.findAddressesByCustomerId.mockResolvedValue([remainingAddress]);
      mockRepo.setDefaultAddress.mockResolvedValue();

      await deleteAddressUseCase.execute({
        addressId: 'addr-def',
        customerId: 'cust-1',
      });

      expect(mockRepo.deleteAddress).toHaveBeenCalledWith('addr-def');
      expect(mockRepo.findAddressesByCustomerId).toHaveBeenCalledWith('cust-1');
      expect(mockRepo.setDefaultAddress).toHaveBeenCalledWith('cust-1', 'addr-rem');
    });
  });
});
