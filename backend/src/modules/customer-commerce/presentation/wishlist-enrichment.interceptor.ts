import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class WishlistEnrichmentInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const userId = context.switchToHttp().getRequest().user?.userId;
    return next.handle().pipe(
      mergeMap(async (response) => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [response];
        const ids = items.map((item) => item?.id).filter(Boolean);
        let selected = new Set<string>();
        if (userId && ids.length) {
          const rows = await this.prisma.wishlist.findMany({
            where: {
              productId: { in: ids },
              customer: { userId, user: { status: 'ACTIVE', roleId: 6 } },
            },
            select: { productId: true },
          });
          selected = new Set(rows.map((row) => row.productId));
        }
        // New objects ensure enrichment cannot mutate an object retained by a shared cache.
        const enriched = items.map((item) => ({
          ...item,
          isWishlisted: selected.has(item?.id),
        }));
        return Array.isArray(response)
          ? enriched
          : Array.isArray(response?.data)
            ? { ...response, data: enriched }
            : enriched[0];
      }),
    );
  }
}
