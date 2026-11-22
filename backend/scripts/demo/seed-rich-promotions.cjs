const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient, Prisma } = require('@prisma/client');
const { id: hashId } = require('../catalog/normalize.cjs');

const prisma = new PrismaClient();
const demoId = (kind, key) => hashId(`demo-v1:${kind}:${key}`);

/**
 * Danh sách sản phẩm Hot thực tế từ Beauty Box và mức giá Sale mục tiêu chuẩn đuôi 9 (Charm Pricing).
 * Mỗi sản phẩm có:
 * - keyword: từ khóa để tìm chính xác sản phẩm trong catalog
 * - dayPrice: giá sale khung giờ thường ban ngày (đuôi 9.000đ)
 * - peakPrice: giá sale khung giờ vàng đêm muộn 20h-24h (giảm sâu hơn, đuôi 9.000đ)
 */
const BEAUTYBOX_HERO_DEALS = [
  {
    keyword: 'Cocoon Winter Melon',
    dayPrice: 219000,
    peakPrice: 199000,
  },
  {
    keyword: 'Amuse Mịn Lì Thuần Chay',
    dayPrice: 159000,
    peakPrice: 139000,
  },
  {
    keyword: 'Clio Kill Cover Founwear Cushion',
    dayPrice: 329000,
    peakPrice: 299000,
  },
  {
    keyword: 'Clio Pro Eye Palette Air',
    dayPrice: 549000,
    peakPrice: 499000,
  },
  {
    keyword: 'Dear Dahlia Lip Paradise',
    dayPrice: 549000,
    peakPrice: 499000,
  },
  {
    keyword: 'Tattoo Liner Play',
    dayPrice: 149000,
    peakPrice: 129000,
  },
  {
    keyword: 'Dermatory',
    dayPrice: 89000,
    peakPrice: 79000,
  },
  {
    keyword: 'Goodal',
    dayPrice: 429000,
    peakPrice: 389000,
  },
  {
    keyword: 'Dear Dahlia Paradise Aurora Shine',
    dayPrice: 529000,
    peakPrice: 479000,
  },
  {
    keyword: 'Clio Kill Lash Superproof Mascara',
    dayPrice: 259000,
    peakPrice: 219000, // Đúng giá sale thực tế Beauty Box!
  },
  {
    keyword: 'Clio Superproof Brush Liner',
    dayPrice: 329000,
    peakPrice: 289000,
  },
  {
    keyword: 'Le Petit Marseillais',
    dayPrice: 299000,
    peakPrice: 269000,
  },
];

async function main() {
  console.log('🚀 Bắt đầu tối ưu hệ thống Promotion & Flash Sale chuẩn Charm Pricing (Đuôi 9)...');

  // 1. Tìm các sản phẩm mục tiêu trong database
  const matchedDeals = [];
  for (const deal of BEAUTYBOX_HERO_DEALS) {
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        name: { contains: deal.keyword, mode: 'insensitive' },
        variants: { some: { isActive: true } },
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (product && product.variants.length > 0) {
      matchedDeals.push({
        deal,
        product,
        baseVariant: product.variants[0],
      });
    }
  }

  console.log(`🎯 Đã khớp thành công ${matchedDeals.length} sản phẩm Beauty Box Hero Items.`);

  // 2. Thiết lập các khung giờ 24/7 (Động theo `now()`)
  const now = new Date();

  // Khung 1: Đang diễn ra (Active Ban Ngày) - bao trùm hiện tại
  const slotActiveStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const slotActiveEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  // Khung 2: Giờ Vàng Đêm Muộn (Peak Night Deal: 20h - 24h)
  const goldenNightStart = new Date(now);
  goldenNightStart.setHours(20, 0, 0, 0);
  const goldenNightEnd = new Date(now);
  goldenNightEnd.setHours(23, 59, 59, 999);
  if (now.getTime() > goldenNightEnd.getTime()) {
    goldenNightStart.setDate(goldenNightStart.getDate() + 1);
    goldenNightEnd.setDate(goldenNightEnd.getDate() + 1);
  }

  // Khung 3: Sắp mở bán (Upcoming)
  const slotUpcomingStart = new Date(slotActiveEnd.getTime());
  const slotUpcomingEnd = new Date(slotActiveEnd.getTime() + 6 * 60 * 60 * 1000);

  // Khung 4: Dài hạn cho Category & Cart Tiers
  const longTermStart = new Date('2026-10-01T00:00:00Z');
  const longTermEnd = new Date('2027-10-27T00:00:00Z');

  // Lấy category UUIDs cho Skincare
  const skincareCategorySlugs = [
    'tay-trang-da-mat',
    'sua-rua-mat',
    'kem-duong-da-mat-va-mat',
    'nuoc-can-bang',
    'tinh-chat-duong',
  ];
  const skincareCategories = await prisma.category.findMany({
    where: { slug: { in: skincareCategorySlugs } },
    select: { id: true },
  });
  const skincareCategoryIds = skincareCategories.map(c => c.id);

  // 3. Tạo các Campaign Flash Sale cụ thể cho từng sản phẩm Hero (Active Slot)
  let totalPromotions = 0;
  let totalQuotas = 0;

  for (let idx = 0; idx < matchedDeals.length; idx++) {
    const { deal, product, baseVariant } = matchedDeals[idx];
    const originalPrice = Number(baseVariant.price);
    const dayDiscount = Math.max(10000, originalPrice - deal.dayPrice);

    const promoId = demoId('promotion', `fs-active-${product.id.slice(0, 8)}`);

    // Tạo Promotion với FIXED_AMOUNT để giá sale kết thúc chính xác bằng 9.000đ
    await prisma.promotion.upsert({
      where: { id: promoId },
      update: {
        name: `⚡ Flash Sale: ${product.name.slice(0, 60)}`,
        description: `Giá gốc ${originalPrice.toLocaleString('vi-VN')}đ giảm sốc chỉ còn ${deal.dayPrice.toLocaleString('vi-VN')}đ`,
        type: 'FIXED_AMOUNT',
        value: new Prisma.Decimal(dayDiscount),
        minOrderAmount: new Prisma.Decimal(0),
        maxDiscountAmount: new Prisma.Decimal(dayDiscount),
        startDate: slotActiveStart,
        endDate: slotActiveEnd,
        isActive: true,
        isFlashSale: true,
        usageLimit: 500,
        applicableProducts: [product.id],
        applicableCategories: [],
      },
      create: {
        id: promoId,
        name: `⚡ Flash Sale: ${product.name.slice(0, 60)}`,
        description: `Giá gốc ${originalPrice.toLocaleString('vi-VN')}đ giảm sốc chỉ còn ${deal.dayPrice.toLocaleString('vi-VN')}đ`,
        type: 'FIXED_AMOUNT',
        value: new Prisma.Decimal(dayDiscount),
        minOrderAmount: new Prisma.Decimal(0),
        maxDiscountAmount: new Prisma.Decimal(dayDiscount),
        startDate: slotActiveStart,
        endDate: slotActiveEnd,
        isActive: true,
        isFlashSale: true,
        usageLimit: 500,
        applicableProducts: [product.id],
        applicableCategories: [],
      },
    });
    totalPromotions++;

    // Tạo Quota cho từng biến thể của sản phẩm này
    for (let vIdx = 0; vIdx < product.variants.length; vIdx++) {
      const v = product.variants[vIdx];
      const quotaId = demoId('quota', `${promoId}:${v.id}`);

      // Thiết lập số lượng hạn ngạch sinh động
      let quota = 30;
      let consumed = 12;
      let reserved = 1;

      if (idx === 0 && vIdx === 0) {
        // Đã bán 90% (Sắp cháy hàng)
        quota = 30;
        consumed = 26;
        reserved = 2;
      } else if (idx === 1 && vIdx === 0) {
        // Đã cháy hàng 100% (Test hết hàng Flash Sale)
        quota = 10;
        consumed = 10;
        reserved = 0;
      } else if (idx % 2 === 0) {
        // Đã bán 60% (Bán chạy)
        quota = 50;
        consumed = 30;
        reserved = 2;
      } else {
        // Mới mở bán (Đã bán 15%)
        quota = 25;
        consumed = 4;
        reserved = 0;
      }

      await prisma.promotionVariantQuota.upsert({
        where: {
          promotionId_productVariantId: {
            promotionId: promoId,
            productVariantId: v.id,
          },
        },
        update: {
          quota,
          consumedQuantity: consumed,
          reservedQuantity: reserved,
        },
        create: {
          id: quotaId,
          promotionId: promoId,
          productVariantId: v.id,
          quota,
          consumedQuantity: consumed,
          reservedQuantity: reserved,
        },
      });
      totalQuotas++;
    }
  }

  // 4. Đồng bộ thêm cho Flash Sale Giờ Vàng Đêm Muộn (Peak Night)
  for (let idx = 0; idx < Math.min(8, matchedDeals.length); idx++) {
    const { deal, product, baseVariant } = matchedDeals[idx];
    const originalPrice = Number(baseVariant.price);
    const peakDiscount = Math.max(10000, originalPrice - deal.peakPrice);

    const nightPromoId = demoId('promotion', `fs-night-${product.id.slice(0, 8)}`);

    await prisma.promotion.upsert({
      where: { id: nightPromoId },
      update: {
        name: `🌙 Giờ Vàng Đêm Muộn: ${product.name.slice(0, 50)}`,
        description: `Đêm muộn giảm cực sốc từ ${originalPrice.toLocaleString('vi-VN')}đ còn ${deal.peakPrice.toLocaleString('vi-VN')}đ`,
        type: 'FIXED_AMOUNT',
        value: new Prisma.Decimal(peakDiscount),
        minOrderAmount: new Prisma.Decimal(0),
        maxDiscountAmount: new Prisma.Decimal(peakDiscount),
        startDate: goldenNightStart,
        endDate: goldenNightEnd,
        isActive: true,
        isFlashSale: true,
        usageLimit: 300,
        applicableProducts: [product.id],
        applicableCategories: [],
      },
      create: {
        id: nightPromoId,
        name: `🌙 Giờ Vàng Đêm Muộn: ${product.name.slice(0, 50)}`,
        description: `Đêm muộn giảm cực sốc từ ${originalPrice.toLocaleString('vi-VN')}đ còn ${deal.peakPrice.toLocaleString('vi-VN')}đ`,
        type: 'FIXED_AMOUNT',
        value: new Prisma.Decimal(peakDiscount),
        minOrderAmount: new Prisma.Decimal(0),
        maxDiscountAmount: new Prisma.Decimal(peakDiscount),
        startDate: goldenNightStart,
        endDate: goldenNightEnd,
        isActive: true,
        isFlashSale: true,
        usageLimit: 300,
        applicableProducts: [product.id],
        applicableCategories: [],
      },
    });
    totalPromotions++;

    for (const v of product.variants) {
      const quotaId = demoId('quota', `${nightPromoId}:${v.id}`);
      await prisma.promotionVariantQuota.upsert({
        where: {
          promotionId_productVariantId: {
            promotionId: nightPromoId,
            productVariantId: v.id,
          },
        },
        update: { quota: 20, consumedQuantity: 1, reservedQuantity: 0 },
        create: {
          id: quotaId,
          promotionId: nightPromoId,
          productVariantId: v.id,
          quota: 20,
          consumedQuantity: 1,
          reservedQuantity: 0,
        },
      });
      totalQuotas++;
    }
  }

  // 5. Khuyến mãi tự động theo ngành hàng Skincare & Bậc thang giỏ hàng (Không cần voucher)
  const automaticPromos = [
    {
      id: demoId('promotion', 'skincare-week'),
      name: '🌸 Đại Tiệc Chăm Sóc Da — Tự Động Giảm 10%',
      description: 'Tự động giảm 10% (tối đa 50.000đ) cho tất cả sản phẩm thuộc dòng Tẩy trang, Sữa rửa mặt, Nước hoa hồng và Kem dưỡng.',
      type: 'PERCENTAGE',
      value: new Prisma.Decimal(10),
      minOrderAmount: new Prisma.Decimal(0),
      maxDiscountAmount: new Prisma.Decimal(50000),
      startDate: longTermStart,
      endDate: longTermEnd,
      isActive: true,
      isFlashSale: false,
      usageLimit: 2000,
      applicableProducts: [],
      applicableCategories: skincareCategoryIds,
    },
    {
      id: demoId('promotion', 'cart-tier-1'),
      name: '🛍️ Tự Động Giảm 29.000đ Cho Đơn Từ 350K',
      description: 'Giỏ hàng từ 350.000đ được tự động giảm ngay 29.000đ vào tổng tiền hàng.',
      type: 'FIXED_AMOUNT',
      value: new Prisma.Decimal(29000),
      minOrderAmount: new Prisma.Decimal(350000),
      startDate: longTermStart,
      endDate: longTermEnd,
      isActive: true,
      isFlashSale: false,
      usageLimit: 5000,
      applicableProducts: [],
      applicableCategories: [],
    },
    {
      id: demoId('promotion', 'cart-tier-2'),
      name: '🎉 Tự Động Giảm 69.000đ Cho Đơn Từ 700K',
      description: 'Giỏ hàng từ 700.000đ được tự động giảm ngay 69.000đ vào tổng tiền hàng.',
      type: 'FIXED_AMOUNT',
      value: new Prisma.Decimal(69000),
      minOrderAmount: new Prisma.Decimal(700000),
      startDate: longTermStart,
      endDate: longTermEnd,
      isActive: true,
      isFlashSale: false,
      usageLimit: 5000,
      applicableProducts: [],
      applicableCategories: [],
    },
  ];

  for (const promo of automaticPromos) {
    await prisma.promotion.upsert({
      where: { id: promo.id },
      update: promo,
      create: promo,
    });
    totalPromotions++;
  }

  // 6. Kiểm tra lại giá hiển thị thực tế qua hàm SQL `sprint5_variant_price`
  console.log('\n📊 Bảng giá Flash Sale thực tế (Chuẩn đuôi 9.000đ):');
  for (const { deal, product, baseVariant } of matchedDeals) {
    const result = await prisma.$queryRaw`
      SELECT sprint5_variant_price(${baseVariant.id}::uuid, 0::numeric)::float8 AS price
    `;
    const effectivePrice = result[0]?.price ?? Number(baseVariant.price);
    const originalPrice = Number(baseVariant.price);
    const discount = originalPrice - effectivePrice;
    const percent = Math.round((discount / originalPrice) * 100);

    console.log(
      `✓ ${product.name.slice(0, 36).padEnd(38, ' ')} | ` +
      `Gốc: ${originalPrice.toLocaleString('vi-VN')}đ ➔ ` +
      `Sale: ${effectivePrice.toLocaleString('vi-VN')}đ (-${percent}%)`
    );
  }

  // Trigger catalog indexing
  await prisma.$executeRaw`
    INSERT INTO catalog_index_jobs(product_id, version, attempts, next_attempt_at, updated_at)
    SELECT id, 1, 0, now(), now() FROM products WHERE is_active = true
    ON CONFLICT(product_id) DO UPDATE SET 
      version = catalog_index_jobs.version + 1,
      attempts = 0,
      next_attempt_at = now(),
      updated_at = now()
  `;

  console.log(`\n🎉 Đã hoàn thành! Tổng cộng: ${totalPromotions} chiến dịch, ${totalQuotas} hạn ngạch biến thể.`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
