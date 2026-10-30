import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { ShiftView } from '../../domain/entities/shift.entity';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/repositories/shift.repository.interface';
import { assertShiftTimes } from './create-shift.use-case';
import { assertCanWriteShiftOfStore } from './shift-scope.util';

@Injectable()
export class UpdateShiftUseCase {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly repository: IShiftRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    id: string,
    input: { name?: string; startTime?: string; endTime?: string },
  ): Promise<ShiftView> {
    const shift = await this.repository.findById(id);
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc');
    assertCanWriteShiftOfStore(await this.getUserDataScope.execute(userId), shift.storeId);

    assertShiftTimes(input.startTime ?? shift.startTime, input.endTime ?? shift.endTime);
    return this.repository.update(id, {
      name: input.name?.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
    });
  }
}
