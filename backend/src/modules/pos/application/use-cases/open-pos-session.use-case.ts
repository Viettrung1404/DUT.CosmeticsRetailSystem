import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity } from '../../domain/entities/pos-session.entity';
import { vnDay } from '../utils/vn-day.util';

export interface OpenPosSessionInput {
  storeId: string;
  openingCash: number;
  note?: string;
}

@Injectable()
export class OpenPosSessionUseCase {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly repository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, input: OpenPosSessionInput): Promise<PosSessionEntity> {
    const store = await this.repository.findStore(input.storeId);
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    if (!store.isActive) {
      throw new BadRequestException('Cửa hàng đang ngừng hoạt động, không mở ca được');
    }
    // Kho tổng không bán lẻ nên không có quầy POS
    if (store.type === 'WAREHOUSE') {
      throw new BadRequestException('Kho tổng không bán hàng tại quầy, không mở ca POS được');
    }

    // Xét cửa hàng được gán chứ không xét phạm vi: Admin (phạm vi ALL) không đứng quầy
    const scope = await this.getUserDataScope.execute(userId);
    if (!scope.storeIds.includes(store.id)) {
      throw new ForbiddenException('Bạn không được phân công làm việc tại cửa hàng này nên không mở ca được');
    }

    const ownOpen = await this.repository.findOpenByCashier(userId);
    if (ownOpen) {
      throw new ConflictException(
        `Bạn đang có ca ${ownOpen.sessionCode} chưa đóng, hãy đóng ca đó trước`,
      );
    }
    const storeOpen = await this.repository.findOpenByStore(store.id);
    if (storeOpen) {
      throw new ConflictException(
        `Cửa hàng đang có ca ${storeOpen.sessionCode} của ${storeOpen.cashierName} chưa đóng`,
      );
    }

    const day = vnDay(new Date());
    const seq = (await this.repository.countOpenedBetween(store.id, day.start, day.end)) + 1;
    const sessionCode = `POS-${store.code}-${day.ymd}-${String(seq).padStart(2, '0')}`;

    const created = await this.repository.create({
      sessionCode,
      storeId: store.id,
      cashierId: userId,
      openingCash: input.openingCash,
      note: input.note?.trim() || null,
    });
    if (!created) {
      throw new ConflictException('Cửa hàng vừa có ca khác được mở, vui lòng tải lại');
    }
    return created;
  }
}
