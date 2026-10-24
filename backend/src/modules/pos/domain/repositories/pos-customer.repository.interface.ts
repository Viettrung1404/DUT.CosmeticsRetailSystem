import { PosCustomerInfo } from '../entities/pos-lookup.entity';

export const POS_CUSTOMER_REPOSITORY = Symbol('IPosCustomerRepository');

export interface IPosCustomerRepository {
  findByPhone(phone: string): Promise<PosCustomerInfo | null>;
  // null khi SĐT vừa bị người khác tạo trước (trùng khóa duy nhất)
  create(data: { phone: string; fullName: string }): Promise<PosCustomerInfo | null>;
}
