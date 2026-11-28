import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: Date;
}

@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Ghi nhận lịch sử tìm kiếm vào DB
   */
  async recordSearch(query: string, userId?: string, resultsCount = 0): Promise<void> {
    const cleanQuery = query?.trim().slice(0, 200);
    if (!cleanQuery || cleanQuery.length < 2) return;

    try {
      if (userId) {
        // Xóa query trùng trước đó của cùng user để tránh duplicate và đẩy query mới lên đầu
        await this.db.$executeRaw`
          DELETE FROM search_histories
          WHERE user_id = ${userId}::uuid AND LOWER(query) = LOWER(${cleanQuery})
        `;

        // Thêm bản ghi mới
        await this.db.$executeRaw`
          INSERT INTO search_histories (id, user_id, query, results_count, created_at, updated_at)
          VALUES (gen_random_uuid(), ${userId}::uuid, ${cleanQuery}, ${resultsCount}, now(), now())
        `;

        // Giới hạn tối đa 20 bản ghi gần nhất cho mỗi user
        await this.db.$executeRaw`
          DELETE FROM search_histories
          WHERE user_id = ${userId}::uuid
            AND id NOT IN (
              SELECT id FROM search_histories
              WHERE user_id = ${userId}::uuid
              ORDER BY created_at DESC
              LIMIT 20
            )
        `;
      } else {
        // Với khách vãng lai (không đăng nhập), vẫn lưu lại query để thống kê xu hướng (trending)
        await this.db.$executeRaw`
          INSERT INTO search_histories (id, user_id, query, results_count, created_at, updated_at)
          VALUES (gen_random_uuid(), NULL, ${cleanQuery}, ${resultsCount}, now(), now())
        `;
      }
    } catch (error) {
      // Ghi log nhẹ nhàng và không làm crash luồng tìm kiếm
      this.logger.warn(`Could not save search history: ${(error as Error).message}`);
    }
  }

  /**
   * Lấy lịch sử tìm kiếm gần đây của user
   */
  async getRecentSearches(userId?: string, limit = 10): Promise<SearchHistoryItem[]> {
    if (!userId) return [];

    try {
      const rows = await this.db.$queryRaw<{ id: string; query: string; createdAt: Date }[]>`
        SELECT id, query, created_at AS "createdAt"
        FROM search_histories
        WHERE user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return rows;
    } catch (error) {
      this.logger.warn(`Could not fetch user search history: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách từ khóa tìm kiếm thịnh hành (Trending) trong 14 ngày qua
   */
  async getTrendingSearches(limit = 6): Promise<string[]> {
    try {
      const rows = await this.db.$queryRaw<{ query: string; cnt: bigint }[]>`
        SELECT query, COUNT(*) as cnt
        FROM search_histories
        WHERE created_at >= now() - interval '14 days'
          AND length(query) >= 2
        GROUP BY query
        ORDER BY cnt DESC, max(created_at) DESC
        LIMIT ${limit}
      `;
      if (rows.length > 0) {
        return rows.map((r) => r.query);
      }
    } catch (error) {
      this.logger.warn(`Could not fetch trending searches: ${(error as Error).message}`);
    }

    // Fallback default trending searches nếu DB chưa đủ dữ liệu thống kê
    return [
      'Serum B5 phục hồi',
      'Kem chống nắng nâng tone',
      'Son dưỡng thuần chay',
      'Retinol dịu nhẹ',
      'Toner Pad diếp cá',
      'Nước tẩy trang Bioderma',
    ];
  }

  /**
   * Xóa một từ khóa cụ thể khỏi lịch sử tìm kiếm của user
   */
  async removeSearchItem(queryOrId: string, userId: string): Promise<boolean> {
    if (!userId || !queryOrId) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryOrId);
      if (isUuid) {
        await this.db.$executeRaw`
          DELETE FROM search_histories
          WHERE user_id = ${userId}::uuid AND id = ${queryOrId}::uuid
        `;
      } else {
        await this.db.$executeRaw`
          DELETE FROM search_histories
          WHERE user_id = ${userId}::uuid AND LOWER(query) = LOWER(${queryOrId.trim()})
        `;
      }
      return true;
    } catch (error) {
      this.logger.warn(`Could not remove search item: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Xóa toàn bộ lịch sử tìm kiếm của user
   */
  async clearAllHistory(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      await this.db.$executeRaw`
        DELETE FROM search_histories
        WHERE user_id = ${userId}::uuid
      `;
      return true;
    } catch (error) {
      this.logger.warn(`Could not clear search history: ${(error as Error).message}`);
      return false;
    }
  }
}
