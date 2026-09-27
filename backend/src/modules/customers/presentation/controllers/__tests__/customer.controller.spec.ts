import { CustomerController } from '../customer.controller';
import { GetCustomerProfileUseCase } from '../../../application/use-cases/get-customer-profile.use-case';
import { GetCustomerAddressesUseCase } from '../../../application/use-cases/get-customer-addresses.use-case';
import { CreateCustomerAddressUseCase } from '../../../application/use-cases/create-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from '../../../application/use-cases/update-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from '../../../application/use-cases/delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from '../../../application/use-cases/set-default-address.use-case';
import { CustomerContextService } from '../../../../../core/services/customer-context.service';
import { CustomerEntity } from '../../../domain/entities/customer.entity';
import { CustomerAddressEntity } from '../../../domain/entities/customer-address.entity';

describe('CustomerController (Presentation TDD)', () => {
  let controller: CustomerController;
  let mockGetProfile: jest.Mocked<GetCustomerProfileUseCase>;
  let mockGetAddresses: jest.Mocked<GetCustomerAddressesUseCase>;
  let mockCreateAddress: jest.Mocked<CreateCustomerAddressUseCase>;
  let mockUpdateAddress: jest.Mocked<UpdateCustomerAddressUseCase>;
  let mockDeleteAddress: jest.Mocked<DeleteCustomerAddressUseCase>;
  let mockSetDefaultAddress: jest.Mocked<SetDefaultAddressUseCase>;
  let mockCustomerContext: jest.Mocked<CustomerContextService>;

  beforeEach(() => {
    mockGetProfile = { execute: jest.fn() } as any;
    mockGetAddresses = { execute: jest.fn() } as any;
    mockCreateAddress = { execute: jest.fn() } as any;
    mockUpdateAddress = { execute: jest.fn() } as any;
    mockDeleteAddress = { execute: jest.fn() } as any;
    mockSetDefaultAddress = { execute: jest.fn() } as any;
    mockCustomerContext = { getCustomerIdFromUserId: jest.fn() } as any;

    controller = new CustomerController(
      mockGetProfile,
      mockGetAddresses,
      mockCreateAddress,
      mockUpdateAddress,
      mockDeleteAddress,
      mockSetDefaultAddress,
      mockCustomerContext,
    );
  });

  it('should get customer profile', async () => {
    const customer = new CustomerEntity({
      id: 'cust-1',
      userId: 'u-1',
      fullName: 'Văn A',
    });
    mockGetProfile.execute.mockResolvedValue(customer);

    const res = await controller.getProfile({ user: { userId: 'u-1' } });
    expect(mockGetProfile.execute).toHaveBeenCalledWith('u-1');
    expect(res.fullName).toBe('Văn A');
  });

  it('should create address using customerId from context', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    const address = new CustomerAddressEntity({
      id: 'addr-1',
      customerId: 'cust-1',
      recipientName: 'Văn A',
      phone: '0901234567',
      addressLine: '123 Đường A',
      city: 'Đà Nẵng',
      district: 'Hải Châu',
      ward: 'Thạch Thang',
      isDefault: true,
    });
    mockCreateAddress.execute.mockResolvedValue(address);

    const res = await controller.createAddress(
      { user: { userId: 'u-1' } },
      {
        recipientName: 'Văn A',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
      },
    );

    expect(mockCustomerContext.getCustomerIdFromUserId).toHaveBeenCalledWith('u-1');
    expect(res.id).toBe('addr-1');
  });

  it('should delete address and return success', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockDeleteAddress.execute.mockResolvedValue();

    const res = await controller.deleteAddress({ user: { userId: 'u-1' } }, 'addr-1');
    expect(mockDeleteAddress.execute).toHaveBeenCalledWith({
      addressId: 'addr-1',
      customerId: 'cust-1',
    });
    expect(res.success).toBe(true);
  });
});
