import { IAdminOrderRepository } from '../../../domain/repositories/admin-order.repository.interface';

export const createAdminOrderRepositoryMock = (): jest.Mocked<IAdminOrderRepository> =>
  ({
    findMany: jest.fn(),
    findAccessInfo: jest.fn(),
    findDetail: jest.fn(),
    confirm: jest.fn(),
    updateStatus: jest.fn(),
  }) as unknown as jest.Mocked<IAdminOrderRepository>;
