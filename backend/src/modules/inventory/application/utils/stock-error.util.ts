import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { StockFailure } from '../../domain/repositories/stock-movement.types';

export const stockFailureToException = (
  reason: StockFailure,
  available?: number,
  sku?: string,
): HttpException => {
  const item = sku ? ` (${sku})` : '';
  switch (reason) {
    case 'NO_STOCK':
      return new BadRequestException(`Không đủ hàng để xuất${item}: tồn hiện có ${available ?? 0}`);
    case 'RESERVED_CONFLICT':
      return new ConflictException(
        `Chỉ xuất được tối đa ${available ?? 0}${item} vì phần còn lại đang giữ chỗ cho đơn online`,
      );
    case 'BATCH_NOT_FOUND':
      return new NotFoundException('Không tìm thấy lô này tại địa điểm đã chọn');
    case 'BATCH_SHORTAGE':
      return new BadRequestException(`Lô còn dùng được chỉ đủ ${available ?? 0}${item}`);
    case 'BATCH_EXPIRY_MISMATCH':
      return new ConflictException('Số lô này đã có với hạn sử dụng khác, kiểm tra lại số lô');
    default:
      return new ConflictException('Phiếu vừa được người khác xử lý, tải lại để xem trạng thái mới');
  }
};
