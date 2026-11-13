import { describe, it, expect } from 'vitest';
import { filterStores, formatGoogleMapsUrl, formatTelUrl } from '@/utils/storeHelper';

describe('Store Locator Helpers (TDD)', () => {
  const mockStores = [
    {
      id: 'st-1',
      name: 'GlowUp Flagship Đồng Khởi',
      address: '123 Đồng Khởi, Bến Nghé, Quận 1',
      city: 'TP. Hồ Chí Minh',
      phone: '02838221234',
      lat: 10.7769,
      lng: 106.7009,
    },
    {
      id: 'st-2',
      name: 'GlowUp Tràng Tiền Plaza',
      address: '24 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm',
      city: 'Hà Nội',
      phone: '02439361234',
      lat: 21.0253,
      lng: 105.8544,
    },
    {
      id: 'st-3',
      name: 'GlowUp Landmark 81',
      address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      phone: '02836201234',
      lat: 10.795,
      lng: 106.7219,
    },
  ];

  it('1. filterStores should return all stores if search query is empty', () => {
    const results = filterStores(mockStores, '');
    expect(results.length).toBe(3);
  });

  it('2. filterStores should filter stores by city or name', () => {
    const hcmStores = filterStores(mockStores, 'Hồ Chí Minh');
    expect(hcmStores.length).toBe(2);

    const trangTien = filterStores(mockStores, 'Tràng Tiền');
    expect(trangTien.length).toBe(1);
    expect(trangTien[0].name).toContain('Tràng Tiền');
  });

  it('3. formatTelUrl should format telephone URI', () => {
    expect(formatTelUrl('028 3822 1234')).toBe('tel:02838221234');
  });

  it('4. formatGoogleMapsUrl should format google maps navigation link', () => {
    const url = formatGoogleMapsUrl(10.7769, 106.7009, 'GlowUp Đồng Khởi');
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=10.7769,106.7009');
  });
});

