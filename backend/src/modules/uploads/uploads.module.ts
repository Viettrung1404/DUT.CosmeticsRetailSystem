import { Module } from '@nestjs/common';
import { UploadAdminController } from './presentation/controllers/upload-admin.controller';
import { UploadImageUseCase } from './application/use-cases/upload-image.use-case';
import { FILE_STORAGE } from './application/ports/file-storage.port';
import { S3FileStorageService } from './infrastructure/adapters/s3-file-storage.service';

@Module({
  controllers: [UploadAdminController],
  providers: [
    UploadImageUseCase,
    {
      provide: FILE_STORAGE,
      useClass: S3FileStorageService,
    },
  ],
})
export class UploadsModule {}
