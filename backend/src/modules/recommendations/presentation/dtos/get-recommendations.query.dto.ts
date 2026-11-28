import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { HOME_MAX_PAGES } from "../../domain/home-intent";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuidListQuery(
  raw: unknown,
  maxItems = 5,
): string[] | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  const tokens = (Array.isArray(raw) ? raw : [raw])
    .flatMap((entry) =>
      typeof entry === "string" ? entry.split(",") : [String(entry)],
    )
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s));

  return Array.from(new Set(tokens)).slice(0, maxItems);
}

export class GetHomeRecommendationsQueryDto {
  @ApiPropertyOptional({
    description:
      "Danh sách tối đa 5 Product ID đã xem gần đây trong phiên (comma-separated hoặc lặp query param)",
    type: [String],
    example: ["11111111-1111-4111-8111-111111111111"],
  })
  @IsOptional()
  @Transform(({ value }) => parseUuidListQuery(value, 5))
  @IsArray()
  @IsUUID(undefined, { each: true })
  recentIds?: string[];

  @ApiPropertyOptional({
    description:
      "Recent views as UUID:timestampMs:dwellMs, comma-separated (up to 10)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(640)
  @Matches(/^[\da-f:-]+(?:,[\da-f:-]+){0,9}$/i)
  recentViews?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: HOME_MAX_PAGES })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HOME_MAX_PAGES)
  page?: number;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}

export function parseRecentViews(raw?: string) {
  return (raw ?? "").split(",").flatMap((entry) => {
    const [productId, viewedAt, dwellMs, ...extra] = entry.split(":");
    return UUID_REGEX.test(productId) &&
      /^\d{13}$/.test(viewedAt) &&
      /^\d{1,5}$/.test(dwellMs) &&
      Number(dwellMs) <= 60_000 &&
      extra.length === 0
      ? [
          {
            productId: productId.toLowerCase(),
            viewedAt: Number(viewedAt),
            dwellMs: Number(dwellMs),
          },
        ]
      : [];
  });
}

export class GetSimilarProductsQueryDto {
  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;

  @ApiPropertyOptional({
    description:
      "Mã màu HEX từ tính năng thử màu (VD: #C84B31) để ưu tiên tông màu tương đồng",
    example: "#C84B31",
  })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: "shadeHex phải đúng định dạng #RRGGBB",
  })
  shadeHex?: string;
}

export class GetBoughtTogetherQueryDto {
  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}

export class GetCartRecommendationsQueryDto {
  @ApiPropertyOptional({
    description:
      "Danh sách Product ID trong giỏ hàng (dành cho khách vãng lai hoặc đồng bộ client)",
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => parseUuidListQuery(value, 20))
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}

export class SemanticSearchQueryDto {
  @ApiPropertyOptional({
    description:
      "Câu truy vấn tự nhiên tiếng Việt (vd: serum kiềm dầu cho da mụn nhạy cảm)",
    example: "serum kiềm dầu cho da mụn nhạy cảm",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  q!: string;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
