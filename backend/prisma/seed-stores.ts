// Dữ liệu mẫu chi nhánh (tài liệu 04 mục 5.2): 3 cửa hàng Hà Nội / TP.HCM + 1 kho tổng.
// Nhà cung cấp chỉ giao về kho tổng, nên luôn phải có ít nhất một địa điểm WAREHOUSE.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPENING_HOURS = { mon_sun: '08:00-22:00' };

const STORES = [
  {
    code: 'WH-HN',
    name: 'Kho Tổng Hà Nội',
    type: 'WAREHOUSE',
    address: 'Lô C2, KCN Quang Minh',
    city: 'Hà Nội',
    district: 'Mê Linh',
    phone: '02439990000',
    openingHours: { mon_sat: '07:30-17:30' },
  },
  {
    code: 'STORE-01',
    name: 'GlowUp Hai Bà Trưng',
    type: 'STORE',
    address: '120 Phố Huế',
    city: 'Hà Nội',
    district: 'Hai Bà Trưng',
    phone: '02439990001',
    openingHours: OPENING_HOURS,
  },
  {
    code: 'STORE-02',
    name: 'GlowUp Cầu Giấy',
    type: 'STORE',
    address: '88 Xuân Thủy',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    phone: '02439990002',
    openingHours: OPENING_HOURS,
  },
  {
    code: 'STORE-03',
    name: 'GlowUp Quận 1',
    type: 'STORE',
    address: '45 Lê Lợi',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    phone: '02839990003',
    openingHours: OPENING_HOURS,
  },
];

// Chỉ thêm hoặc cập nhật theo mã, không xóa: chi nhánh đã có đơn hàng, tồn kho tham chiếu tới
async function main() {
  for (const { code, ...data } of STORES) {
    await prisma.store.upsert({
      where: { code },
      update: data,
      create: { code, ...data },
    });
  }
  console.log(`Đã seed ${STORES.length} chi nhánh: ${STORES.map((s) => s.code).join(', ')}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
