import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UpstashRedisService } from '../cache/upstash-redis.service';
import { Public } from '../decorators/public.decorator';

@Public()
@SkipThrottle()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: UpstashRedisService,
    private readonly config: ConfigService,
  ) {}
  @Get('live')
  @ApiOkResponse({ description: 'Process is accepting HTTP requests' })
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOkResponse({
    description: 'Database and required rate-limit store are available',
  })
  @ApiServiceUnavailableResponse({
    description: 'A required dependency is unavailable; contains no connection details',
  })
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      if (this.redis.configured) await this.redis.command(['PING']);
      else if (this.config.get('NODE_ENV') === 'production') throw new Error();
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('DEPENDENCY_NOT_READY');
    }
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
