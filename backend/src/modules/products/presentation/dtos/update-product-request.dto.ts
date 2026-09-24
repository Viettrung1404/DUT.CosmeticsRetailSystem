import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductRequestDto } from './create-product-request.dto';

// Biến thể sửa qua API riêng /admin/variants/:id; images nếu gửi lên sẽ thay toàn bộ ảnh cũ
export class UpdateProductRequestDto extends PartialType(
  OmitType(CreateProductRequestDto, ['variants'] as const),
) {}
