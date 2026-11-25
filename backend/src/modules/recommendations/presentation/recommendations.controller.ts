import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { CustomerContextService } from '@core/services/customer-context.service';
import { IngestBehaviorBatchUseCase } from '../application/use-cases/ingest-behavior-batch.use-case';
import { GetHomeRecommendationsUseCase } from '../application/use-cases/get-home-recommendations.use-case';
import { GetSimilarProductsUseCase } from '../application/use-cases/get-similar-products.use-case';
import { GetBoughtTogetherProductsUseCase } from '../application/use-cases/get-bought-together-products.use-case';
import { GetCartRecommendationsUseCase } from '../application/use-cases/get-cart-recommendations.use-case';
import { SemanticSearchProductsUseCase } from '../application/use-cases/semantic-search-products.use-case';
import { IngestEventsBatchDto } from './dtos/ingest-events-batch.dto';
import {
  GetBoughtTogetherQueryDto,
  GetCartRecommendationsQueryDto,
  GetHomeRecommendationsQueryDto,
  GetSimilarProductsQueryDto,
  SemanticSearchQueryDto,
} from './dtos/get-recommendations.query.dto';
import {
  RecommendationListResponseDto,
  SemanticSearchResponseDto,
} from './dtos/recommendation-response.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly ingestBehaviorBatch: IngestBehaviorBatchUseCase,
    private readonly customerContext: CustomerContextService,
    private readonly getHomeRecommendations: GetHomeRecommendationsUseCase,
    private readonly getSimilarProducts: GetSimilarProductsUseCase,
    private readonly getBoughtTogetherProducts: GetBoughtTogetherProductsUseCase,
    private readonly getCartRecommendations: GetCartRecommendationsUseCase,
    private readonly semanticSearchProducts: SemanticSearchProductsUseCase,
  ) {}

  @Public()
  @Post('events/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Nhận batch sự kiện hành vi & viewable impressions từ Web/Mobile (trả 202 Accepted)',
  })
  @ApiAcceptedResponse({
    description: 'Đã tiếp nhận batch sự kiện hành vi',
  })
  async ingestEventsBatch(
    @Body() dto: IngestEventsBatchDto,
    @Req() req?: { user?: { userId?: string } },
  ) {
    const verifiedCustomerId = await this.resolveOptionalCustomerId(req);

    const result = await this.ingestBehaviorBatch.executeClientBatch(
      dto,
      verifiedCustomerId,
    );

    return {
      accepted: true,
      ...result,
    };
  }

  @Public()
  @Get('home')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Gợi ý trang chủ cá nhân hóa ("Dành riêng cho bạn") với In-session boost & Cold-start fallback',
  })
  @ApiOkResponse({ type: RecommendationListResponseDto })
  async getHome(
    @Query() query: GetHomeRecommendationsQueryDto,
    @Req() req?: { user?: { userId?: string } },
  ): Promise<RecommendationListResponseDto> {
    const customerId = await this.resolveOptionalCustomerId(req);
    return this.getHomeRecommendations.execute({
      customerId,
      recentIds: query.recentIds ?? [],
      limit: query.limit ?? 12,
    });
  }

  @Public()
  @Get('products/:id/similar')
  @ApiOperation({
    summary:
      'Gợi ý sản phẩm tương tự (Content-based + tông màu thử son shadeHex + fallback cùng danh mục ±30%)',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product ID (SP cha)' })
  @ApiOkResponse({ type: RecommendationListResponseDto })
  async getSimilar(
    @Param('id', new ParseUUIDPipe()) productId: string,
    @Query() query: GetSimilarProductsQueryDto,
  ): Promise<RecommendationListResponseDto> {
    return this.getSimilarProducts.execute({
      productId,
      limit: query.limit ?? 8,
      shadeHex: query.shadeHex,
    });
  }

  @Public()
  @Get('products/:id/bought-together')
  @ApiOperation({
    summary:
      'Gợi ý thường mua cùng (Co-occurrence Lift Online + POS và fallback luật chu trình Skincare)',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product ID (SP cha)' })
  @ApiOkResponse({ type: RecommendationListResponseDto })
  async getBoughtTogether(
    @Param('id', new ParseUUIDPipe()) productId: string,
    @Query() query: GetBoughtTogetherQueryDto,
  ): Promise<RecommendationListResponseDto> {
    return this.getBoughtTogetherProducts.execute({
      productId,
      limit: query.limit ?? 6,
    });
  }

  @Public()
  @Get('cart')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Gợi ý hoàn thiện chu trình từ giỏ hàng (bổ trợ bước thiếu & lọc xung đột hoạt chất)',
  })
  @ApiOkResponse({ type: RecommendationListResponseDto })
  async getCart(
    @Query() query: GetCartRecommendationsQueryDto,
    @Req() req?: { user?: { userId?: string } },
  ): Promise<RecommendationListResponseDto> {
    const customerId = await this.resolveOptionalCustomerId(req);
    return this.getCartRecommendations.execute({
      customerId,
      productIds: query.productIds ?? [],
      limit: query.limit ?? 8,
    });
  }

  @Public()
  @Get('search')
  @ApiOperation({
    summary:
      'Tìm kiếm ngữ nghĩa tiếng Việt với pgvector halfvec (@cf/baai/bge-m3) + lọc tồn kho & keyword fallback',
  })
  @ApiOkResponse({ type: SemanticSearchResponseDto })
  async searchSemantic(
    @Query() query: SemanticSearchQueryDto,
  ): Promise<SemanticSearchResponseDto> {
    return this.semanticSearchProducts.execute({
      query: query.q,
      limit: query.limit ?? 12,
    });
  }

  private async resolveOptionalCustomerId(req?: {
    user?: { userId?: string };
  }): Promise<string | null> {
    if (!req?.user?.userId) {
      return null;
    }
    return this.customerContext.getCustomerIdFromUserId(req.user.userId);
  }
}
