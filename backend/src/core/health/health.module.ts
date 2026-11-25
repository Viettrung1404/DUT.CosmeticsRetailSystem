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
  /**
   * Liveness probe: strictly process-only (never queries DB or Redis) so Neon PostgreSQL
   * can auto-suspend during idle windows. External uptime monitors must target `/health/live`.
   */
  @Get('live')
  @ApiOkResponse({
    description:
      'Process is accepting HTTP requests without querying DB or Redis',
  })
  live() {
    return { status: 'ok' };
  }
  /**
   * Readiness probe: verifies PostgreSQL (`SELECT 1`) and Upstash (`PING`).
   * Reserve for deployment/startup readiness checks only — do not poll periodically.
   */
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
