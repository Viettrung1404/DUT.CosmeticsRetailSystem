// Dữ liệu demo: 5 cửa hàng + 1 kho tổng.
// Địa chỉ cập nhật theo đơn vị hành chính sau sáp nhập và tọa độ thực tế.
// Nhà cung cấp chỉ giao về kho tổng, nên luôn phải có ít nhất một địa điểm WAREHOUSE.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPENING_HOURS = { mon_sun: '08:00-22:00' };

const STORES = [
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
    openingHours: OPENING_HOURS,
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
    openingHours: OPENING_HOURS,
  },
  {
    code: 'STORE-03',
    name: 'GlowUp Quận 1',
    type: 'STORE',
    address: '45 Lê Lợi, Phường Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3999 0003',
    email: 'quan1@glowup.vn',
    latitude: 10.7745,
    longitude: 106.7009,
    openingHours: OPENING_HOURS,
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
    openingHours: OPENING_HOURS,
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
    openingHours: OPENING_HOURS,
  },
  {
    code: 'WH-HN',
    name: 'Kho Tổng Hà Nội',
    type: 'WAREHOUSE',
    address: 'Lô C2, KCN Quang Minh',
    district: 'Mê Linh',
    city: 'Hà Nội',
    phone: '024 3999 0000',
    email: 'warehouse.hn@glowup.vn',
    latitude: 21.1926,
    longitude: 105.7513,
    openingHours: { mon_sat: '07:30-17:30' },
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
