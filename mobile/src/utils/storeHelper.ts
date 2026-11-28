export interface StoreItem {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  phone: string;
  openingHours?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
}

// Lọc danh sách showroom theo từ khóa tìm kiếm (tên, địa chỉ hoặc thành phố)
export const filterStores = (stores: StoreItem[], query: string): StoreItem[] => {
  if (!query || !query.trim()) return stores;
  const lower = query.toLowerCase().trim();
  return stores.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.address.toLowerCase().includes(lower) ||
      s.city.toLowerCase().includes(lower) ||
      (s.district && s.district.toLowerCase().includes(lower))
  );
};

// Định dạng URI gọi điện thoại
export const formatTelUrl = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
};

// Định dạng liên kết Google Maps chỉ đường
export const formatGoogleMapsUrl = (lat: number, lng: number, label?: string): string => {
  const query = `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

