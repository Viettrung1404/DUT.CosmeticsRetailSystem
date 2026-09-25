import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UPLOAD_FOLDERS, UploadFolder } from '../../application/use-cases/upload-image.use-case';

export class UploadImageRequestDto {
  @ApiProperty({ enum: UPLOAD_FOLDERS, description: 'Ảnh dùng cho loại dữ liệu nào' })
  @IsIn([...UPLOAD_FOLDERS], { message: `folder phải là một trong: ${UPLOAD_FOLDERS.join(', ')}` })
  folder: UploadFolder;
}
