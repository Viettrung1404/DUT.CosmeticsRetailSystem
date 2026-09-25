import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import {
  MAX_IMAGE_SIZE,
  UPLOAD_FOLDERS,
  UploadImageInput,
  UploadImageUseCase,
} from '../../application/use-cases/upload-image.use-case';
import { UploadErrorInterceptor } from '../interceptors/upload-error.interceptor';
import { UploadImageRequestDto } from '../dtos/upload-image-request.dto';
import { UploadImageResponseDto } from '../dtos/upload-image-response.dto';

@ApiTags('Admin - Uploads (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/uploads')
export class UploadAdminController {
  constructor(private readonly uploadImageUseCase: UploadImageUseCase) {}

  @Post('images')
  @RequirePermissions('PRODUCT_UPDATE')
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } }),
  )
  @ApiOperation({
    summary: 'Admin - Tải một ảnh lên kho, trả về link để gắn vào sản phẩm / thương hiệu / danh mục',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'folder'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Ảnh JPG, PNG hoặc WEBP, tối đa 5 MB' },
        folder: { type: 'string', enum: [...UPLOAD_FOLDERS] },
      },
    },
  })
  @ApiCreatedResponse({ type: UploadImageResponseDto })
  @ApiBadRequestResponse({ description: 'Thiếu ảnh, sai định dạng hoặc sai folder' })
  @ApiPayloadTooLargeResponse({ description: 'Ảnh vượt quá 5 MB' })
  @ApiServiceUnavailableResponse({ description: 'Kho lưu ảnh chưa cấu hình hoặc đang lỗi' })
  async uploadImage(
    @UploadedFile() file: UploadImageInput | undefined,
    @Body() dto: UploadImageRequestDto,
  ) {
    const url = await this.uploadImageUseCase.execute(file, dto.folder);
    return { message: 'Tải ảnh lên thành công', data: new UploadImageResponseDto(url) };
  }
}
