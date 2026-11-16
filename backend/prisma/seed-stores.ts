// Dữ liệu chuẩn hóa mạng lưới bán lẻ & kho vận theo thiết kế DES-05 / DES-06 / DES-07:
// - Central Warehouse: Kho Tổng Tân Bình (WH-TB, 2500 đơn/ngày), Kho Tổng Hà Nội (WH-HN, 2000 đơn/ngày)
// - Showroom chuẩn hóa HCM: Quận 1 (STORE-03), Quận 10 (STORE-06), Bình Thạnh (STORE-07) (500 đơn/ngày)
// - Mạng lưới chi nhánh mở rộng: STORE-01 (Hai Bà Trưng), STORE-02 (Cầu Giấy), STORE-04 (Hải Châu), STORE-05 (Thủ Đức)
// - Khởi tạo Inventory Balances (tồn vật lý, giữ chỗ, an toàn, cách ly, hỏng) cho các kho/showroom mới.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPENING_HOURS_STORE = { mon_sun: '08:00-22:00' };
const OPENING_HOURS_WH = { mon_sat: '07:30-18:00' };

export const STORES = [
  // --- KHO TỔNG (CENTRAL WAREHOUSE) ---
  {
    code: 'WH-TB',
    name: 'Tổng kho Tân Bình - GlowUp Central DC',
    type: 'WAREHOUSE',
    address: 'Lô 5, Đường CN13, KCN Tân Bình, Phường Tây Thạnh',
    district: 'Tân Phú',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0000',
    email: 'warehouse.tb@glowup.vn',
    latitude: 10.8142,
    longitude: 106.6264,
    openingHours: OPENING_HOURS_WH,
    fulfillmentCapacityPerDay: 2500,
  },
  {
    code: 'WH-HN',
    name: 'Kho Tổng Hà Nội - GlowUp Northern DC',
    type: 'WAREHOUSE',
    address: 'Lô C2, KCN Quang Minh',
    district: 'Mê Linh',
    city: 'Hà Nội',
    phone: '024 3999 0000',
    email: 'warehouse.hn@glowup.vn',
    latitude: 21.1926,
    longitude: 105.7513,
    openingHours: OPENING_HOURS_WH,
    fulfillmentCapacityPerDay: 2000,
  },

  // --- 3 SHOWROOM CHUẨN HÓA HCM (DES-07) ---
  {
    code: 'STORE-03',
    name: 'GlowUp Showroom Quận 1',
    type: 'STORE',
    address: '45 Lê Lợi, Phường Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0003',
    email: 'quan1@glowup.vn',
    latitude: 10.7745,
    longitude: 106.7009,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
  {
    code: 'STORE-06',
    name: 'GlowUp Showroom Quận 10',
    type: 'STORE',
    address: '256 Ba Tháng Hai, Phường 12',
    district: 'Quận 10',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0006',
    email: 'quan10@glowup.vn',
    latitude: 10.7708,
    longitude: 106.6698,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
  {
    code: 'STORE-07',
    name: 'GlowUp Showroom Bình Thạnh',
    type: 'STORE',
    address: '180 Phan Đăng Lưu, Phường 1',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0007',
    email: 'binhthanh@glowup.vn',
    latitude: 10.8035,
    longitude: 106.6914,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },

  // --- CHI NHÁNH BỔ TRỢ TOÀN QUỐC ---
  {
    code: 'STORE-01',
    name: 'GlowUp Hai Bà Trưng',
    type: 'STORE',
    address: '120 Phố Huế, Phường Phố Huế',
    district: 'Hai Bà Trưng',
    city: 'Hà Nội',
    phone: '024 3999 0001',
    email: 'haibatrung@glowup.vn',
    latitude: 21.0136,
    longitude: 105.8501,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
  {
    code: 'STORE-02',
    name: 'GlowUp Cầu Giấy',
    type: 'STORE',
    address: '88 Xuân Thủy, Phường Dịch Vọng Hậu',
    district: 'Cầu Giấy',
    city: 'Hà Nội',
    phone: '024 3999 0002',
    email: 'caugiay@glowup.vn',
    latitude: 21.0366,
    longitude: 105.7828,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
  {
    code: 'STORE-04',
    name: 'GlowUp Hải Châu',
    type: 'STORE',
    address: '120 Nguyễn Văn Linh, Phường Nam Dương',
    district: 'Hải Châu',
    city: 'Đà Nẵng',
    phone: '023 6399 0004',
    email: 'haichau@glowup.vn',
    latitude: 16.0607,
    longitude: 108.2144,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
  {
    code: 'STORE-05',
    name: 'GlowUp Thủ Đức',
    type: 'STORE',
    address: '88 Võ Văn Ngân, Phường Linh Chiểu',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0005',
    email: 'thuduc@glowup.vn',
    latitude: 10.8507,
    longitude: 106.7719,
    openingHours: OPENING_HOURS_STORE,
    fulfillmentCapacityPerDay: 500,
  },
];

export async function seedStoresAndInventory() {
  console.log('📦 Bắt đầu seed Locations (Stores/Warehouses) & Inventory Balances...');

  // 1. Upsert Stores & Warehouses
  const seededStores: any[] = [];
  for (const { code, ...data } of STORES) {
    const store = await prisma.store.upsert({
      where: { code },
      update: data,
      create: { code, ...data },
    });
    seededStores.push(store);
  }
  console.log(`✅ Đã seed ${seededStores.length} địa điểm: ${seededStores.map((s) => s.code).join(', ')}.`);

  // 2. Kiểm tra và bổ sung Inventory Balances cho các kho/showroom mới
  // Lấy danh sách sample variants (lấy tối đa 100 variants tiêu biểu để seed số dư mẫu nếu chưa có)
  const variants = await prisma.productVariant.findMany({
    take: 100,
    select: { id: true, sku: true },
  });

  if (variants.length > 0) {
    const inventoryData: any[] = [];
    for (const store of seededStores) {
      const isWarehouse = store.type === 'WAREHOUSE';
      const initialQty = isWarehouse ? 200 : 30;
      const safetyStock = isWarehouse ? 10 : 3;

      for (const variant of variants) {
        inventoryData.push({
          storeId: store.id,
          productVariantId: variant.id,
          quantity: initialQty,
          reservedQuantity: 0,
          safetyStock: safetyStock,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
          minQuantity: 5,
        });
      }
    }

    const result = await prisma.inventory.createMany({
      data: inventoryData,
      skipDuplicates: true,
    });
    console.log(`✅ Đã đồng bộ ${result.count} bản ghi Inventory Balances ban đầu.`);

    // 3. Khởi tạo các Lô hàng mẫu (InventoryLot) phục vụ FEFO Engine
    // Mỗi variant tại mỗi kho sẽ có 2 lô: 1 lô date chuẩn (+12 tháng) và 1 lô date xa (+24 tháng)
    const now = new Date();
    const lotsData: any[] = [];
    const targetVariants = variants.slice(0, 20); // Chọn 20 variants mẫu để seed lô

    for (const store of seededStores) {
      const isWarehouse = store.type === 'WAREHOUSE';
      const lot1Qty = isWarehouse ? 80 : 15;
      const lot2Qty = isWarehouse ? 100 : 12;

      for (const variant of targetVariants) {
        // Lô 1: Hạn dùng 12 tháng tới (365 ngày)
        const expiry1 = new Date(now);
        expiry1.setDate(expiry1.getDate() + 365);

        // Lô 2: Hạn dùng 24 tháng tới (730 ngày)
        const expiry2 = new Date(now);
        expiry2.setDate(expiry2.getDate() + 730);

        lotsData.push({
          locationId: store.id,
          productVariantId: variant.id,
          batchCode: `LOT-${variant.sku.substring(0, 10)}-${store.code}-A`,
          expiryDate: expiry1,
          quantityOnHand: lot1Qty,
          quantityReserved: 0,
        });

        lotsData.push({
          locationId: store.id,
          productVariantId: variant.id,
          batchCode: `LOT-${variant.sku.substring(0, 10)}-${store.code}-B`,
          expiryDate: expiry2,
          quantityOnHand: lot2Qty,
          quantityReserved: 0,
        });
      }
    }

    const lotsResult = await prisma.inventoryLot.createMany({
      data: lotsData,
      skipDuplicates: true,
    });
    console.log(`✅ Đã khởi tạo ${lotsResult.count} bản ghi InventoryLot mẫu cho FEFO.`);
  }

  return seededStores;
}

async function main() {
  await seedStoresAndInventory();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Lỗi seed stores:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
