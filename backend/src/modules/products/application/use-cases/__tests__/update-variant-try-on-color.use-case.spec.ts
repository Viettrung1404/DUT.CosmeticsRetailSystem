import { NotFoundException } from '@nestjs/common';
import { IProductVariantRepository } from '../../../domain/repositories/product-variant.repository.interface';
import { UpdateVariantTryOnColorUseCase } from '../update-variant-try-on-color.use-case';

describe('UpdateVariantTryOnColorUseCase', () => {
  it('ghi mã màu thử son khi biến thể tồn tại', async () => {
    const repo = { updateTryOnColor: jest.fn().mockResolvedValue(true) };
    const useCase = new UpdateVariantTryOnColorUseCase(repo as unknown as IProductVariantRepository);

    await expect(useCase.execute('variant-1', '#B9465E')).resolves.toBeUndefined();
    expect(repo.updateTryOnColor).toHaveBeenCalledWith('variant-1', '#B9465E');
  });

  it('báo lỗi 404 khi không có biến thể', async () => {
    const repo = { updateTryOnColor: jest.fn().mockResolvedValue(false) };
    const useCase = new UpdateVariantTryOnColorUseCase(repo as unknown as IProductVariantRepository);

    await expect(useCase.execute('khong-ton-tai', '#B9465E')).rejects.toThrow(NotFoundException);
  });
});
