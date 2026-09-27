import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '../../domain/repositories/permission.repository.interface';

export type DataScopeType = 'ALL' | 'STORE' | 'SELF';

export interface DataScope {
  type: DataScopeType;
  storeIds: string[];
  employeeId: string | null;
}

// Phần "được làm ở đâu" của phân quyền (tài liệu 04, mục 3.1): ALL toàn chuỗi, STORE theo cửa hàng, SELF của chính mình
@Injectable()
export class GetUserDataScopeUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(userId: string): Promise<DataScope> {
    const info = await this.permissionRepository.findUserScopeInfo(userId);
    if (!info) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const storeIds = new Set(info.assignedStoreIds);
    if (info.employeeStoreId) {
      storeIds.add(info.employeeStoreId);
    }

    // Giá trị lạ trong DB thì hạ về SELF (hẹp nhất) thay vì mở rộng quyền
    const type: DataScopeType =
      info.dataScope === 'ALL' || info.dataScope === 'STORE' ? info.dataScope : 'SELF';

    return { type, storeIds: [...storeIds], employeeId: info.employeeId };
  }
}
