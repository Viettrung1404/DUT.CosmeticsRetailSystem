const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient, Prisma } = require('@prisma/client');
const { id: hashId } = require('../catalog/normalize.cjs');

const prisma = new PrismaClient();
const demoId = (kind, key) => hashId(`demo-v1:${kind}:${key}`);

async function main() {
  console.log('🚀 Bắt đầu triển khai Flash Sale 24/7 theo giờ cho 100% sản phẩm & biến thể...');

  // 1. Cập nhật hàm SQL sprint5_variant_price để chuẩn hóa Charm Pricing (đuôi 9.000đ chiếm ~75%)
  console.log('⚙️ Cập nhật hàm SQL sprint5_variant_price với logic Charm Pricing...');
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION sprint5_variant_price(target_variant uuid, tier_percentage numeric) RETURNS numeric LANGUAGE plpgsql STABLE AS $$
    DECLARE v record; campaign record; discount numeric; best numeric; final_price numeric; is_charm boolean;
    BEGIN
      SELECT pv.price,pv.product_id,p.category_id INTO v FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.id=target_variant;
      IF NOT FOUND THEN RETURN NULL; END IF;
      best=trunc(v.price*LEAST(100,GREATEST(0,tier_percentage))/100,2);
      FOR campaign IN SELECT p.* FROM promotions p WHERE p.is_active AND p.start_date<=now() AND p.end_date>now()
        AND p.min_order_amount=0 AND (p.usage_limit IS NULL OR p.used_count<p.usage_limit)
        AND p.type IN ('PERCENTAGE','FIXED_AMOUNT')
        AND ((COALESCE(p.applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(p.applicable_categories,'[]'::jsonb)='[]'::jsonb)
          OR p.applicable_products ? v.product_id::text OR p.applicable_categories ? v.category_id::text)
        AND (NOT p.is_flash_sale OR EXISTS(SELECT 1 FROM promotion_variant_quotas q WHERE q.promotion_id=p.id AND q.product_variant_id=target_variant AND q.quota-q.reserved_quantity-q.consumed_quantity>=1))
        ORDER BY p.id LOOP
        discount=CASE WHEN campaign.type='PERCENTAGE' THEN trunc(v.price*campaign.value/100,2) ELSE campaign.value END;
        discount=LEAST(v.price,discount,COALESCE(campaign.max_discount_amount,v.price));
        best=GREATEST(best,discount);
      END LOOP;
      IF best > 0 THEN
        final_price := GREATEST(0, v.price - best);
        -- 75% biến thể được làm tròn đuôi 9.000đ, 25% làm tròn đuôi 0.000đ
        is_charm := ('x' || substr(md5(target_variant::text), 1, 2))::bit(8)::int % 100 < 75;
        IF is_charm AND final_price >= 19000 THEN
          final_price := (floor(final_price / 10000) * 10000) + 9000;
          IF final_price >= v.price THEN
            final_price := final_price - 10000;
          END IF;
        ELSE
          final_price := round(final_price / 1000) * 1000;
        END IF;
        RETURN final_price;
      END IF;
      RETURN v.price;
    END $$;
  `);
  console.log('✅ Hàm SQL sprint5_variant_price đã sẵn sàng.');

  // 2. Lấy tất cả 350 sản phẩm và toàn bộ biến thể trong cơ sở dữ liệu
  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      variants: {
        where: { isActive: true },
        select: { id: true, price: true, sku: true, option1Value: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  });

  const totalProducts = allProducts.length;
  const totalVariants = allProducts.reduce((sum, p) => sum + p.variants.length, 0);
  console.log(`📦 Đã nạp ${totalProducts} sản phẩm với ${totalVariants} biến thể.`);

  // 3. Chuẩn bị các khung giờ trong ngày:
  // Chúng ta phủ sóng cho hôm nay và 7 ngày tới (mỗi ngày 24 khung giờ nối tiếp 00:00 - 23:59)
  const now = new Date();
  const currentHour = now.getHours();

  // Mức chiết khấu tham chiếu từ Beauty Box thực tế
  // Khung giờ thường: 15%, 20%, 25%, 28%, 32%, 35%
  const REGULAR_RATES = [15, 20, 25, 28, 32, 35];
  // Khung giờ cao điểm (trưa 12h-13h, tối 20h-23h): giảm sâu hơn 5-10% (22%, 27%, 30%, 35%, 40%, 45%)
  const PEAK_RATES = [22, 27, 30, 35, 40, 45];
  const PEAK_HOURS = [12, 13, 20, 21, 22, 23];

  console.log('⏰ Khởi tạo các khung giờ Flash Sale 24/7 (phủ kín 24 khung giờ/ngày)...');

  // Xóa các Flash Sale cũ để tránh xung đột
  await prisma.promotionAllocation.deleteMany({});
  await prisma.promotionOrderUsage.deleteMany({});
  await prisma.promotionVariantQuota.deleteMany({});
  await prisma.promotion.deleteMany({
    where: {
      isFlashSale: true,
      id: { not: demoId('promotion', 'flash') }, // giữ demoId cơ sở nếu cần
    },
  });

  // Tạo khung giờ cho 7 ngày tới (đảm bảo lúc nào vào cũng có Flash Sale active và upcoming)
  const DAYS_TO_SEED = 7;
  let totalPromosCreated = 0;
  let totalQuotasCreated = 0;

  for (let dayOffset = 0; dayOffset < DAYS_TO_SEED; dayOffset++) {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() + dayOffset);

    for (let h = 0; h < 24; h++) {
      const slotStart = new Date(baseDate);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(baseDate);
      slotEnd.setHours(h, 59, 59, 999);

      const isPeak = PEAK_HOURS.includes(h);
      const rates = isPeak ? PEAK_RATES : REGULAR_RATES;
      const hourStr = String(h).padStart(2, '0');
      const dateStr = slotStart.toISOString().slice(0, 10);

      // Mỗi giờ tạo 6 chiến dịch tương ứng 6 mức giảm khác nhau
      const tierCampaigns = [];
      for (let t = 0; t < rates.length; t++) {
        const rate = rates[t];
        const promoId = demoId('promotion', `fs-${dateStr}-${hourStr}-tier${t}`);
        const promoName = isPeak
          ? `🔥 Giờ Vàng [${hourStr}:00 - ${hourStr}:59] — Flash Sale -${rate}%`
          : `⚡ Flash Sale [${hourStr}:00 - ${hourStr}:59] — Giảm ${rate}%`;

        tierCampaigns.push({
          id: promoId,
          name: promoName,
          description: `Khung giờ ${hourStr}:00 - ${hourStr}:59 ưu đãi chớp nhoáng giảm ${rate}% cho các sản phẩm tuyển chọn!`,
          type: 'PERCENTAGE',
          value: new Prisma.Decimal(rate),
          minOrderAmount: new Prisma.Decimal(0),
          startDate: slotStart,
          endDate: slotEnd,
          isActive: true,
          isFlashSale: true,
          usageLimit: 10000,
          applicableProducts: [], // Sẽ gom product IDs sau khi phân bổ biến thể
          applicableCategories: [],
          rate,
          tierIndex: t,
        });
      }

      // Phân bổ 1.039 biến thể vào 6 tiers của giờ này:
      // Công thức: rateIndex = (pIdx * 3 + vIdx + h) % 6
      // Đảm bảo:
      // 1. Các sản phẩm khác nhau có tier khác nhau
      // 2. Các biến thể của CÙNG MỘT SẢN PHẨM có tier KHÁC NHAU
      // 3. Qua từng giờ, tier của từng biến thể sẽ xoay vòng đổi sang mức sale mới!
      const productSets = Array.from({ length: 6 }, () => new Set());
      const quotasToInsert = [];

      for (let pIdx = 0; pIdx < allProducts.length; pIdx++) {
        const product = allProducts[pIdx];
        for (let vIdx = 0; vIdx < product.variants.length; vIdx++) {
          const variant = product.variants[vIdx];
          const tierIdx = (pIdx * 3 + vIdx + h) % 6;

          productSets[tierIdx].add(product.id);
          const assignedPromo = tierCampaigns[tierIdx];

          // Quota và số lượng đã bán thực tế
          const quota = 50;
          // Tạo thanh tiến độ đa dạng: 15% - 85% đã bán
          const consumed = 10 + ((pIdx * 7 + vIdx * 5 + h * 3) % 32);
          const reserved = (pIdx + vIdx) % 2;

          quotasToInsert.push({
            id: demoId('quota', `${assignedPromo.id}:${variant.id}`),
            promotionId: assignedPromo.id,
            productVariantId: variant.id,
            quota,
            consumedQuantity: consumed,
            reservedQuantity: reserved,
          });
        }
      }

      // Gán danh sách sản phẩm cho từng campaign
      for (let t = 0; t < 6; t++) {
        tierCampaigns[t].applicableProducts = Array.from(productSets[t]);
      }

      // Lưu promotions của giờ này
      await prisma.promotion.createMany({
        data: tierCampaigns.map(({ rate, tierIndex, ...p }) => p),
        skipDuplicates: true,
      });
      totalPromosCreated += tierCampaigns.length;

      // Lưu quotas (chỉ cần lưu cho hôm nay và ngày mai để tối ưu dung lượng)
      if (dayOffset <= 1) {
        await prisma.promotionVariantQuota.createMany({
          data: quotasToInsert,
          skipDuplicates: true,
        });
        totalQuotasCreated += quotasToInsert.length;
      }
    }
    console.log(`✓ Đã nạp 24 khung giờ cho ngày ${baseDate.toLocaleDateString('vi-VN')}`);
  }

  // 4. Khuyến mãi tự động theo ngành hàng & Giỏ hàng (Platform level - Không cần voucher)
  const longTermStart = new Date('2026-10-01T00:00:00Z');
  const longTermEnd = new Date('2027-10-27T00:00:00Z');

  const skincareCategories = await prisma.category.findMany({
    where: {
      slug: {
        in: [
          'tay-trang-da-mat',
          'sua-rua-mat',
          'kem-duong-da-mat-va-mat',
          'nuoc-can-bang',
          'tinh-chat-duong',
        ],
      },
    },
    select: { id: true },
  });

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
      usageLimit: 5000,
      applicableProducts: [],
      applicableCategories: skincareCategories.map((c) => c.id),
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
      usageLimit: 10000,
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
      usageLimit: 10000,
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
  }

  // 5. Kiểm tra & Báo cáo tỷ lệ Charm Pricing (đuôi 9.000đ)
  console.log('\n📊 Đang kiểm tra giá thực tế của các sản phẩm đa biến thể trong khung giờ hiện tại:');
  
  // Chọn 8 sản phẩm có nhiều biến thể
  const sampleProducts = allProducts.filter((p) => p.variants.length > 1).slice(0, 8);
  let sampleCheckCharm = 0;
  let sampleTotal = 0;

  for (const product of sampleProducts) {
    console.log(`\n🛍️ [Sản phẩm]: ${product.name.slice(0, 60)}`);
    for (const v of product.variants) {
      const result = await prisma.$queryRaw`
        SELECT sprint5_variant_price(${v.id}::uuid, 0::numeric)::float8 AS price
      `;
      const salePrice = result[0]?.price ?? Number(v.price);
      const originalPrice = Number(v.price);
      const discount = originalPrice - salePrice;
      const percent = Math.round((discount / originalPrice) * 100);
      const is9000 = salePrice % 10000 === 9000;

      if (is9000) sampleCheckCharm++;
      sampleTotal++;

      console.log(
        `   - Biến thể [${v.option1Value || v.sku}]: ` +
        `Gốc ${originalPrice.toLocaleString('vi-VN')}đ ➔ ` +
        `Sale ${salePrice.toLocaleString('vi-VN')}đ ` +
        `(-${percent}%) ` +
        (is9000 ? '⭐ (Đuôi 9.000đ)' : '• (Giá chuẩn)')
      );
    }
  }

  const charmRatio = ((sampleCheckCharm / sampleTotal) * 100).toFixed(1);
  console.log(`\n🎯 Tỷ lệ giá kết thúc bằng đuôi 9.000đ trong mẫu kiểm tra: ${charmRatio}% (Mục tiêu 70% - 80%).`);

  // Đánh lại Catalog Index Jobs
  await prisma.$executeRaw`
    INSERT INTO catalog_index_jobs(product_id, version, attempts, next_attempt_at, updated_at)
    SELECT id, 1, 0, now(), now() FROM products WHERE is_active = true
    ON CONFLICT(product_id) DO UPDATE SET 
      version = catalog_index_jobs.version + 1,
      attempts = 0,
      next_attempt_at = now(),
      updated_at = now()
  `;

  console.log(`\n🎉 Hoàn thành! Đã tạo ${totalPromosCreated} chiến dịch theo giờ và ${totalQuotasCreated} hạn ngạch biến thể.`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
