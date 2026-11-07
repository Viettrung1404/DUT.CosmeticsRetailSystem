import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { customerContext } from '@modules/customer-commerce/infrastructure/commands';
import {
  CreateReviewDto,
  ReviewQueryDto,
} from '../presentation/experience.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly db: PrismaService) {}
  async create(userId: string, input: CreateReviewDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        const customerId = await customerContext(tx, userId);
        const order = await tx.order.findFirst({
          where: {
            ...(input.orderId && { id: input.orderId }),
            customerId,
            status: 'COMPLETED',
            items: { some: { variant: { productId: input.productId } } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (!order) throw new ForbiddenException('VERIFIED_PURCHASE_REQUIRED');
        return tx.review.create({
          data: {
            ...input,
            customerId,
            orderId: order.id,
            isVerifiedPurchase: true,
            isApproved: false,
          },
          select: {
            id: true,
            productId: true,
            rating: true,
            title: true,
            content: true,
            isApproved: true,
            createdAt: true,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('REVIEW_ALREADY_EXISTS');
      throw error;
    }
  }
  async list(productId: string, query: ReviewQueryDto) {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        category: { isActive: true },
        OR: [{ brandId: null }, { brand: { isActive: true } }],
      },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return this.db.$transaction(
      async (tx) => {
        const where = {
          productId,
          isApproved: true,
          ...(query.rating && { rating: query.rating }),
        };
        const items = await tx.review.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: [
            ...(query.sort === 'newest'
              ? []
              : [
                  {
                    rating:
                      query.sort === 'rating_asc'
                        ? ('asc' as const)
                        : ('desc' as const),
                  },
                ]),
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            isVerifiedPurchase: true,
            adminReply: true,
            createdAt: true,
            customer: { select: { fullName: true } },
          },
        });
        const groups = await tx.review.groupBy({
          by: ['rating'],
          where: { productId, isApproved: true },
          _count: true,
        });
        const histogram = Object.fromEntries(
          [1, 2, 3, 4, 5].map((rating) => [
            rating,
            groups.find((g) => g.rating === rating)?._count ?? 0,
          ]),
        );
        const totalReviews = groups.reduce((sum, g) => sum + g._count, 0);
        const total = query.rating ? histogram[query.rating] : totalReviews;
        const avgRating = totalReviews
          ? new Prisma.Decimal(
              groups.reduce((s, g) => s + g.rating * g._count, 0),
            )
              .div(totalReviews)
              .toDecimalPlaces(2)
              .toNumber()
          : 0;
        return {
          items: items.map(({ customer, ...item }) => ({
            ...item,
            reviewerName: customer.fullName ?? 'Khách hàng',
          })),
          total,
          page: query.page,
          limit: query.limit,
          histogram,
          totalReviews,
          avgRating,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  /** Admin must authorize actor/store before invoking inside its transaction. */
  async moderate(
    tx: Prisma.TransactionClient,
    reviewId: string,
    approved: boolean,
    adminReply?: string,
  ) {
    const review = await tx.review.findUniqueOrThrow({
      where: { id: reviewId },
    });
    await tx.$queryRaw`SELECT id FROM products WHERE id=${review.productId}::uuid FOR UPDATE`;
    await tx.review.update({
      where: { id: reviewId },
      data: {
        isApproved: approved,
        ...(adminReply !== undefined && { adminReply }),
      },
    });
    const aggregate = await tx.review.aggregate({
      where: { productId: review.productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });
    const avgRating = new Prisma.Decimal(aggregate._avg.rating ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
    await tx.product.update({
      where: { id: review.productId },
      data: { avgRating, totalReviews: aggregate._count },
    });
    return { avgRating, totalReviews: aggregate._count };
  }
}
