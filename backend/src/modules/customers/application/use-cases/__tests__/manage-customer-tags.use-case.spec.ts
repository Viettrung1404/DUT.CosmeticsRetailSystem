import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IAdminCustomerRepository } from '../../../domain/repositories/admin-customer.repository.interface';
import { ManageCustomerTagsUseCase, normalizeTags } from '../manage-customer-tags.use-case';

const build = (over: Partial<jest.Mocked<IAdminCustomerRepository>> = {}) => {
  const repository = {
    exists: jest.fn().mockResolvedValue(true),
    isVisible: jest.fn().mockResolvedValue(true),
    replaceTags: jest.fn(),
    listTags: jest.fn(),
    ...over,
  } as unknown as jest.Mocked<IAdminCustomerRepository>;
  const scope = {
    execute: jest.fn().mockResolvedValue({ type: 'ALL', storeIds: [], employeeId: null }),
  } as unknown as GetUserDataScopeUseCase;
  return { repository, useCase: new ManageCustomerTagsUseCase(repository, scope) };
};

describe('ManageCustomerTagsUseCase', () => {
  it('bỏ khoảng trắng, nhãn rỗng và nhãn trùng không phân biệt hoa thường', () => {
    expect(normalizeTags([' VIP ', 'vip', '', 'Hay đổi trả'])).toEqual(['vip', 'Hay đổi trả']);
  });

  it('thay toàn bộ nhãn của khách', async () => {
    const { repository, useCase } = build();
    await expect(useCase.replace('u', 'c1', ['VIP'])).resolves.toEqual({ customerId: 'c1', tags: ['VIP'] });
    expect(repository.replaceTags).toHaveBeenCalledWith('c1', ['VIP']);
  });

  it('quá 20 nhãn trả 400', async () => {
    const tags = Array.from({ length: 21 }, (_, i) => `n${i}`);
    await expect(build().useCase.replace('u', 'c1', tags)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('khách không tồn tại trả 404', async () => {
    const { useCase } = build({ exists: jest.fn().mockResolvedValue(false) });
    await expect(useCase.replace('u', 'c1', [])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('khách ngoài phạm vi trả 403', async () => {
    const { repository, useCase } = build({ isVisible: jest.fn().mockResolvedValue(false) });
    await expect(useCase.replace('u', 'c1', [])).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.replaceTags).not.toHaveBeenCalled();
  });
});
