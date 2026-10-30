import { ForbiddenException } from '@nestjs/common';
import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';

// Ca dùng chung (storeId null) chỉ người có phạm vi toàn chuỗi được ghi
export const assertCanWriteShiftOfStore = (scope: DataScope, storeId: string | null): void => {
  const ok = storeId === null ? scope.type === 'ALL' : isStoreInScope(scope, storeId);
  if (!ok) {
    throw new ForbiddenException(
      storeId === null
        ? 'Chỉ người có phạm vi toàn chuỗi được quản lý ca dùng chung'
        : 'Bạn không được phân công làm việc tại cửa hàng này',
    );
  }
};
