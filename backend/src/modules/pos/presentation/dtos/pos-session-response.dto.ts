import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PosSessionEntity } from '../../domain/entities/pos-session.entity';

export class PosSessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'POS-STORE-01-20261007-01' }) sessionCode: string;
  @ApiProperty() store: { id: string; code: string; name: string };
  @ApiProperty() cashier: { id: string; fullName: string };
  @ApiProperty() openedAt: Date;
  @ApiPropertyOptional() closedAt: Date | null;
  @ApiProperty() openingCash: number;
  @ApiProperty({ description: 'Tiền mặt hệ thống ghi nhận từ các đơn trong ca' }) systemCash: number;
  @ApiPropertyOptional() countedCash: number | null;
  @ApiPropertyOptional({ description: 'Tiền đếm được - (đầu ca + hệ thống); âm là thiếu, dương là dư' })
  difference: number | null;
  @ApiProperty({ enum: ['OPEN', 'CLOSED', 'RECONCILED'] }) status: string;
  @ApiPropertyOptional() note: string | null;
  @ApiPropertyOptional() approvedBy: { id: string; fullName: string | null } | null;

  static fromDomain(entity: PosSessionEntity): PosSessionResponseDto {
    const dto = new PosSessionResponseDto();
    dto.id = entity.id;
    dto.sessionCode = entity.sessionCode;
    dto.store = { id: entity.storeId, code: entity.storeCode, name: entity.storeName };
    dto.cashier = { id: entity.cashierId, fullName: entity.cashierName };
    dto.openedAt = entity.openedAt;
    dto.closedAt = entity.closedAt;
    dto.openingCash = entity.openingCash;
    dto.systemCash = entity.systemCash;
    dto.countedCash = entity.countedCash;
    dto.difference = entity.difference;
    dto.status = entity.status;
    dto.note = entity.note;
    dto.approvedBy = entity.approvedBy
      ? { id: entity.approvedBy, fullName: entity.approverName }
      : null;
    return dto;
  }
}
