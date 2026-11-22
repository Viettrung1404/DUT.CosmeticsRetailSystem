import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CACHE_SERVICE, ICacheService } from './cache.service.interface';

@Injectable()
export class VersionedPublicCacheService {
  private cachedGeneration: { value: bigint | number; expiresAt: number } | null = null;

  constructor(
    private readonly db: PrismaService,
    @Inject(CACHE_SERVICE) private readonly cache: ICacheService,
  ) {}

  private async getGeneration(): Promise<bigint | number> {
    const now = Date.now();
    if (this.cachedGeneration && this.cachedGeneration.expiresAt > now) {
      return this.cachedGeneration.value;
    }
    const revision = await this.db.publicCacheRevision.findUniqueOrThrow({
      where: { id: 1 },
    });
    this.cachedGeneration = { value: revision.generation, expiresAt: now + 5000 };
    return revision.generation;
  }

  async remember<T>(key: string, load: () => Promise<T>, ttlMs = 60000): Promise<T> {
    // DB trigger increments this revision in the writer's transaction, including Admin/SQL writes.
    // Keep the captured revision for SET: an old reader can only populate an old namespace.
    const generation = await this.getGeneration();
    const versioned = `public:v${generation}:${key}`;
    const hit = await this.cache.get<T>(versioned);
    if (hit !== null) return hit;
    const result = await load();
    await this.cache.set(versioned, result, ttlMs);
    return result;
  }
}
