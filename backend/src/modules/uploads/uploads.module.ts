import { Module } from '@nestjs/common';
import { UploadAvatarController } from './presentation/controllers/upload-avatar.controller';
import { UploadAvatarUseCase } from './application/use-cases/upload-avatar.use-case';
import { UploadAdminController } from './presentation/controllers/upload-admin.controller';
import { UploadImageUseCase } from './application/use-cases/upload-image.use-case';
import { FILE_STORAGE } from './application/ports/file-storage.port';
import { S3FileStorageService } from './infrastructure/adapters/s3-file-storage.service';

@Module({
  controllers: [UploadAdminController, UploadAvatarController],
  providers: [
    UploadImageUseCase,
    UploadAvatarUseCase,
    {
      provide: FILE_STORAGE,
      useClass: S3FileStorageService,
    },
  ],
})
export class UploadsModule {}
