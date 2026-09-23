import { UserEntity } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<UserEntity>;
  update(user: UserEntity): Promise<UserEntity>;
  updateLastLogin(userId: string): Promise<void>;
  createCustomerForUser(userId: string, phone?: string | null): Promise<void>;
  findCustomerByPhone(phone: string): Promise<{ id: string; userId: string | null } | null>;
  linkCustomerToUser(customerId: string, userId: string): Promise<void>;
}
