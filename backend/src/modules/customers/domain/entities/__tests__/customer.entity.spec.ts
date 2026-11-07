import { CustomerEntity } from '../customer.entity';
import { CustomerAddressEntity } from '../customer-address.entity';

describe('Customer & CustomerAddress Domain Entities (TDD)', () => {
  it('should create CustomerAddressEntity with valid properties', () => {
    const address = new CustomerAddressEntity({
      id: 'addr-1',
      customerId: 'cust-1',
      label: 'Nhà riêng',
      recipientName: 'Nguyễn Văn A',
      phone: '0901234567',
      addressLine: '54 Nguyễn Lương Bằng',
      city: 'Đà Nẵng',
      district: 'Liên Chiểu',
      ward: 'Hòa Khánh Bắc',
      isDefault: true,
    });

    expect(address.id).toBe('addr-1');
    expect(address.recipientName).toBe('Nguyễn Văn A');
    expect(address.getFullAddress()).toBe('54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng');
    expect(address.isDefault).toBe(true);
  });

  it('should create CustomerEntity and check membership / tier benefits', () => {
    const customer = new CustomerEntity({
      id: 'cust-1',
      userId: 'user-1',
      phone: '0901234567',
      fullName: 'Trần Thị B',
      totalPoints: 150,
      totalSpent: 3500000,
      totalOrders: 5,
      loyaltyTier: {
        id: 'tier-silver',
        name: 'Silver',
        minPoints: 100,
        discountPercentage: 5,
        pointMultiplier: 1.2,
      },
    });

    expect(customer.id).toBe('cust-1');
    expect(customer.totalPoints).toBe(150);
    expect(customer.loyaltyTier?.name).toBe('Silver');
    expect(customer.loyaltyTier?.discountPercentage).toBe(5);
  });
});
