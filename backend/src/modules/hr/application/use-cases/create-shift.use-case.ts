import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { ShiftView } from '../../domain/entities/shift.entity';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/repositories/shift.repository.interface';
import { toMinutes } from '../utils/vn-time.util';
import { assertCanWriteShiftOfStore } from './shift-scope.util';

export const assertShiftTimes = (startTime: string, endTime: string): void => {
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu (ca không qua nửa đêm)');
  }
};

@Injectable()
export class CreateShiftUseCase {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly repository: IShiftRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: { storeId?: string | null; name: string; startTime: string; endTime: string },
  ): Promise<ShiftView> {
    const storeId = input.storeId ?? null;
    assertShiftTimes(input.startTime, input.endTime);
    assertCanWriteShiftOfStore(await this.getUserDataScope.execute(userId), storeId);
    if (storeId && !(await this.repository.storeExists(storeId))) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    return this.repository.create({
      storeId,
      name: input.name.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
    });
  }
}
