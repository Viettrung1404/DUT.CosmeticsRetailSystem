import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class ReturnImageStorage {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.bucket = config.get('RETURN_STORAGE_BUCKET', '');
    const endpoint = config.get<string>('STORAGE_ENDPOINT');
    const accessKeyId = config.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('STORAGE_SECRET_ACCESS_KEY');
    this.client =
      this.bucket &&
      endpoint &&
      accessKeyId &&
      secretAccessKey &&
      config.get('RETURN_STORAGE_PRIVATE') === 'true'
        ? new S3Client({
            endpoint,
            region: config.get('STORAGE_REGION', 'ap-southeast-1'),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
          })
        : null;
  }
  async upload(userId: string, buffer: Buffer) {
    if (!this.client)
      throw new ServiceUnavailableException(
        'PRIVATE_RETURN_STORAGE_NOT_CONFIGURED',
      );
    if (!buffer?.length) throw new BadRequestException('IMAGE_REQUIRED');
    if (buffer.length > 5 * 1024 * 1024) throw new PayloadTooLargeException();
    const staged = await this.prisma.returnAttachment.count({
      where: {
        userId,
        returnOrderId: null,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
    });
    if (staged >= 20) throw new BadRequestException('STAGED_UPLOAD_LIMIT');
    let image: Buffer;
    try {
      const metadata = await sharp(buffer, {
        limitInputPixels: 25000000,
        animated: false,
      }).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new Error('format');
      image = await sharp(buffer, { limitInputPixels: 25000000 })
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException('INVALID_IMAGE');
    }
    const key = `returns/${userId}/${randomUUID()}.jpg`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: image,
          ContentType: 'image/jpeg',
          CacheControl: 'private, no-store',
        }),
      );
    } catch {
      throw new ServiceUnavailableException('RETURN_STORAGE_UNAVAILABLE');
    }
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
        const count = await tx.returnAttachment.count({
          where: {
            userId,
            returnOrderId: null,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        });
        if (count >= 20) throw new BadRequestException('STAGED_UPLOAD_LIMIT');
        return tx.returnAttachment.create({
          data: {
            userId,
            objectKey: key,
            mimeType: 'image/jpeg',
            size: image.length,
          },
        });
      });
      return { attachmentId: row.id, mimeType: row.mimeType, size: row.size };
    } catch (error) {
      await this.client
        .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch(() => undefined);
      throw error;
    }
  }
  async url(userId: string, id: string) {
    const attachment = await this.prisma.returnAttachment.findFirst({
      where: { id, userId },
    });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    if (!this.client)
      throw new ServiceUnavailableException(
        'PRIVATE_RETURN_STORAGE_NOT_CONFIGURED',
      );
    return {
      url: await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: attachment.objectKey,
        }),
        { expiresIn: 300 },
      ),
      expiresIn: 300,
    };
  }
  @Cron('0 0 3 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async cleanup() {
    if (!this.client) return;
    const rows = await this.prisma.returnAttachment.findMany({
      where: {
        returnOrderId: null,
        createdAt: { lt: new Date(Date.now() - 25 * 3600000) },
      },
      take: 100,
    });
    for (const row of rows) {
      try {
        await this.client.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: row.objectKey }),
        );
        await this.prisma.returnAttachment.deleteMany({
          where: { id: row.id, returnOrderId: null },
        });
      } catch {
        /* Retry from the durable attachment record during the next sweep. */
      }
    }
  }
}
