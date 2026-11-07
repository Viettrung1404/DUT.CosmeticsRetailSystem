import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  ADMIN_CUSTOMER_REPOSITORY,
  IAdminCustomerRepository,
} from '../../domain/repositories/admin-customer.repository.interface';
import { toCustomerScopeFilter } from './get-admin-customers.use-case';

const MAX_TAGS = 20;

export const normalizeTags = (tags: string[]): string[] => {
  const unique = new Map<string, string>();
  for (const raw of tags) {
    const tag = raw.trim();
    if (tag) unique.set(tag.toLowerCase(), tag);
  }
  return [...unique.values()];
};

// Phân nhóm thủ công (FR-08.06), song song với nhóm RFM tự động
@Injectable()
export class ManageCustomerTagsUseCase {
  constructor(
    @Inject(ADMIN_CUSTOMER_REPOSITORY) private readonly repository: IAdminCustomerRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  list() {
    return this.repository.listTags();
  }

  async replace(userId: string, customerId: string, tags: string[]) {
    const normalized = normalizeTags(tags);
    if (normalized.length > MAX_TAGS) {
      throw new BadRequestException(`Mỗi khách tối đa ${MAX_TAGS} nhãn`);
    }
    if (!(await this.repository.exists(customerId))) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }
    const scope = toCustomerScopeFilter(await this.getUserDataScope.execute(userId));
    if (!(await this.repository.isVisible(customerId, scope))) {
      throw new ForbiddenException('Khách hàng ngoài phạm vi của bạn');
    }
    await this.repository.replaceTags(customerId, normalized);
    return { customerId, tags: normalized };
  }
}
