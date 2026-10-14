import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UploadAvatarUseCase } from '../../application/use-cases/upload-avatar.use-case';
import {
  MAX_IMAGE_SIZE,
  UploadImageInput,
} from '../../application/use-cases/upload-image.use-case';
import { UploadErrorInterceptor } from '../interceptors/upload-error.interceptor';
@Controller('upload')
@ApiTags('Customer - Avatar (Việt Trung)')
@ApiBearerAuth('JWT-auth')
export class UploadAvatarController {
  constructor(private readonly upload: UploadAvatarUseCase) {}
  @Post('avatar')
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } }),
  )
  @ApiOperation({ summary: 'Avatar JPG/PNG/WebP tối đa 5 MB, resize 512×512' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async avatar(@UploadedFile() file: UploadImageInput | undefined) {
    return { url: await this.upload.execute(file) };
  }
}
