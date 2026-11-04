"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Eye,
  Home,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  Store as StoreIcon,
} from "lucide-react";
import { StoreMap } from "./store-map";

export interface StoreItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: unknown | null;
}

const FALLBACK_STORES: StoreItem[] = [
  {
    id: "store-03",
    code: "STORE-03",
    name: "GlowUp Quận 1",
    address: "45 Lê Lợi, Phường Bến Nghé",
    district: "Quận 1",
    city: "TP. Hồ Chí Minh",
    phone: "028 3999 0003",
    email: "quan1@glowup.vn",
    latitude: 10.7745,
    longitude: 106.7009,
    openingHours: { mon_sun: "08:00-22:00" },
  },
  {
    id: "store-05",
    code: "STORE-05",
    name: "GlowUp Thủ Đức",
    address: "88 Võ Văn Ngân, Phường Linh Chiểu",
    district: "TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
    phone: "028 3999 0005",
    email: "thuduc@glowup.vn",
    latitude: 10.8507,
    longitude: 106.7719,
    openingHours: { mon_sun: "08:00-22:00" },
  },
  {
    id: "store-01",
    code: "STORE-01",
    name: "GlowUp Hai Bà Trưng",
    address: "120 Phố Huế, Phường Phố Huế",
    district: "Hai Bà Trưng",
    city: "Hà Nội",
    phone: "024 3999 0001",
    email: "haibatrung@glowup.vn",
    latitude: 21.0136,
    longitude: 105.8501,
    openingHours: { mon_sun: "08:00-22:00" },
  },
  {
    id: "store-02",
    code: "STORE-02",
    name: "GlowUp Cầu Giấy",
    address: "88 Xuân Thủy, Phường Dịch Vọng Hậu",
    district: "Cầu Giấy",
    city: "Hà Nội",
    phone: "024 3999 0002",
    email: "caugiay@glowup.vn",
    latitude: 21.0366,
    longitude: 105.7828,
    openingHours: { mon_sun: "08:00-22:00" },
  },
  {
    id: "store-04",
    code: "STORE-04",
    name: "GlowUp Hải Châu",
    address: "120 Nguyễn Văn Linh, Phường Nam Dương",
    district: "Hải Châu",
    city: "Đà Nẵng",
    phone: "023 6399 0004",
    email: "haichau@glowup.vn",
    latitude: 16.0607,
    longitude: 108.2144,
    openingHours: { mon_sun: "08:00-22:00" },
  },
];

function getDisplayHours(raw: unknown): string {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.display === "string") return obj.display;
    if (typeof obj.mon_sun === "string") return obj.mon_sun;
  }
  return "08:00 - 22:00";
}

function getStoreStatus(displayHours: string): { isOpen: boolean; label: string } {
  const match = displayHours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) {
    return { isOpen: true, label: "Đang mở cửa" };
  }

  const now = new Date();
  const utcHours = now.getUTCHours() + 7;
  const currentHour = utcHours >= 24 ? utcHours - 24 : utcHours;
  const currentMinute = now.getUTCMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  const openMinutes = Number(match[1]) * 60 + Number(match[2]);
  const closeMinutes = Number(match[3]) * 60 + Number(match[4]);

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return {
    isOpen,
    label: isOpen ? "Đang mở cửa" : "Đã đóng cửa",
  };
}

export function StoreLocator({ initialStores }: { initialStores: StoreItem[] }) {
  const stores = initialStores.length > 0 ? initialStores : FALLBACK_STORES;

  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeStoreId, setActiveStoreId] = useState<string>(stores[0]?.id || "");

  const citySelectId = useId();
  const districtSelectId = useId();
  const searchInputId = useId();
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Derive unique cities with store counts
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    stores.forEach((store) => {
      counts.set(store.city, (counts.get(store.city) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([city, count]) => ({ city, count }));
  }, [stores]);

  // Derive available districts based on selected city
  const districts = useMemo(() => {
    const list = stores
      .filter((s) => selectedCity === "all" || s.city === selectedCity)
      .map((s) => s.district);
    return Array.from(new Set(list));
  }, [stores, selectedCity]);

  // Filtered stores
  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stores.filter((store) => {
      const matchCity = selectedCity === "all" || store.city === selectedCity;
      const matchDistrict = selectedDistrict === "all" || store.district === selectedDistrict;
      const matchQuery =
        !q ||
        store.name.toLowerCase().includes(q) ||
        store.address.toLowerCase().includes(q) ||
        store.district.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q);

      return matchCity && matchDistrict && matchQuery;
    });
  }, [stores, selectedCity, selectedDistrict, searchQuery]);

  const fallbackStore = FALLBACK_STORES[0] as StoreItem;
  const safeStores = stores.length > 0 ? stores : FALLBACK_STORES;
  const activeStore: StoreItem =
    filteredStores.find((s) => s.id === activeStoreId) ||
    filteredStores[0] ||
    safeStores[0] ||
    fallbackStore;

  const handleSelectStore = (id: string) => {
    setActiveStoreId(id);
    const cardEl = document.getElementById(`store-card-${id}`);
    if (cardEl && cardsContainerRef.current) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleResetFilters = () => {
    setSelectedCity("all");
    setSelectedDistrict("all");
    setSearchQuery("");
  };

  return (
    <div className="w-full bg-[#f9ecee] min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="py-3">
          <ol className="flex items-center gap-1.5 text-xs text-[#776d6d]">
            <li>
              <Link
                href="/"
                className="hover:text-[#9d394f] transition-colors flex items-center gap-1"
              >
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
            </li>
            <li>
              <ChevronRight size={12} className="text-[#a49a9a]" />
            </li>
            <li className="font-semibold text-[#412e27]">
              <span>Hệ thống cửa hàng</span>
            </li>
          </ol>
        </nav>

        {/* Banner Header */}
        <section className="relative overflow-hidden rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-[#efe5e7] mb-6">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffe9e2] text-[#9d394f] text-[11px] font-bold uppercase tracking-wider mb-2.5">
              <StoreIcon size={14} />
              <span>Hệ Thống Cửa Hàng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#412e27] tracking-tight mb-2">
              Hệ thống Showroom GlowUp
            </h1>
            <p className="text-sm text-[#776d6d] leading-relaxed">
              Tìm thông tin địa chỉ, giờ hoạt động và liên hệ cửa hàng gần bạn nhất để được phục vụ
              tận tình.
            </p>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <div className="rounded-2xl bg-white p-4 md:p-6 shadow-sm border border-[#efe5e7] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* City Selector */}
            <div className="md:col-span-3">
              <label
                htmlFor={citySelectId}
                className="block text-xs font-semibold text-[#412e27] mb-1.5"
              >
                Tỉnh / Thành phố
              </label>
              <div className="relative">
                <select
                  id={citySelectId}
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedDistrict("all");
                  }}
                  className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-[#fefafc] border border-[#efe5e7] text-sm text-[#412e27] focus:outline-none focus:border-[#9d394f] appearance-none cursor-pointer"
                >
                  <option value="all">Tất cả tỉnh thành ({stores.length})</option>
                  {cities.map(({ city, count }) => (
                    <option key={city} value={city}>
                      {city} ({count})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-3.5 text-[#776d6d]">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* District Selector */}
            <div className="md:col-span-3">
              <label
                htmlFor={districtSelectId}
                className="block text-xs font-semibold text-[#412e27] mb-1.5"
              >
                Quận / Khu vực
              </label>
              <div className="relative">
                <select
                  id={districtSelectId}
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-[#fefafc] border border-[#efe5e7] text-sm text-[#412e27] focus:outline-none focus:border-[#9d394f] appearance-none cursor-pointer"
                >
                  <option value="all">Tất cả quận/khu vực</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-3.5 text-[#776d6d]">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Street Search Input */}
            <div className="md:col-span-6">
              <label
                htmlFor={searchInputId}
                className="block text-xs font-semibold text-[#412e27] mb-1.5"
              >
                Tìm theo tên đường hoặc địa chỉ
              </label>
              <div className="relative flex items-center">
                <Search
                  size={16}
                  className="absolute left-3.5 text-[#776d6d] pointer-events-none"
                />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="VD: Lê Lợi, Xuân Thủy, Phố Huế, Nguyễn Văn Linh..."
                  className="w-full h-11 pl-10 pr-24 rounded-xl bg-[#fefafc] border border-[#efe5e7] text-sm text-[#412e27] placeholder:text-[#a49a9a] focus:outline-none focus:border-[#9d394f]"
                />
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="absolute right-2 h-7 px-2.5 rounded-lg bg-[#ffe9e2] text-[#9d394f] text-xs font-semibold hover:bg-[#9d394f] hover:text-white transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Locator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Showroom Directory (Desktop col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-4 order-2 lg:order-1">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#412e27]">Danh sách Showroom</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffe9e2] text-[#9d394f] text-xs font-bold">
                  {filteredStores.length} hiển thị
                </span>
              </div>
            </div>

            {/* Scrollable Store Cards */}
            <div
              ref={cardsContainerRef}
              className="space-y-3.5 max-h-[760px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin"
            >
              {filteredStores.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white border border-[#efe5e7]">
                  <StoreIcon size={32} className="mx-auto text-[#776d6d] mb-2" />
                  <p className="font-semibold text-sm text-[#412e27]">
                    Không tìm thấy showroom phù hợp
                  </p>
                  <p className="text-xs text-[#776d6d] mt-1 mb-4">
                    Thử chọn lại tỉnh thành hoặc xóa từ khóa tìm kiếm.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-[#ffe9e2] text-[#9d394f] text-xs font-semibold hover:bg-[#9d394f] hover:text-white transition-colors"
                  >
                    Xem tất cả showroom
                  </button>
                </div>
              ) : (
                filteredStores.map((store) => {
                  const hoursStr = getDisplayHours(store.openingHours);
                  const status = getStoreStatus(hoursStr);
                  const isSelected = store.id === activeStore.id;

                  const googleMapsUrl =
                    store.latitude !== null && store.longitude !== null
                      ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
                      : `https://maps.google.com/?q=${encodeURIComponent(
                          store.name + " " + store.address + " " + store.city,
                        )}`;

                  return (
                    <article
                      key={store.id}
                      id={`store-card-${store.id}`}
                      onClick={() => handleSelectStore(store.id)}
                      className={`cursor-pointer rounded-2xl bg-white p-5 border transition-all relative overflow-hidden shadow-sm ${
                        isSelected
                          ? "border-[#9d394f] ring-2 ring-[#9d394f]/20 bg-[#fffcfd]"
                          : "border-[#efe5e7] hover:border-[#dbc0c3] hover:shadow"
                      }`}
                    >
                      {/* Active Indicator Bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#9d394f]" />
                      )}

                      {/* Header row: Name & Open Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="text-base font-bold text-[#412e27] leading-snug">
                          {store.name}
                        </h2>
                        <span
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            status.isOpen
                              ? "bg-[#e8f5e9] text-[#227a55]"
                              : "bg-[#f5f5f5] text-[#776d6d]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status.isOpen ? "bg-[#227a55] animate-pulse" : "bg-[#a49a9a]"
                            }`}
                          />
                          {status.label}
                        </span>
                      </div>

                      {/* Contact & Address info */}
                      <div className="space-y-1.5 text-xs text-[#776d6d] mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin size={15} className="text-[#9d394f] flex-shrink-0 mt-0.5" />
                          <span className="text-[#412e27] leading-relaxed">
                            {store.address}, {store.district}, {store.city}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-[#776d6d] flex-shrink-0" />
                          <span>
                            Giờ mở cửa:{" "}
                            <strong className="text-[#412e27] font-medium">{hoursStr}</strong>
                          </span>
                        </div>
                        {store.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={15} className="text-[#776d6d] flex-shrink-0" />
                            <a
                              href={`tel:${store.phone.replace(/\s+/g, "")}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-[#9d394f] transition-colors font-medium"
                            >
                              {store.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/stores/${store.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 h-9 rounded-xl bg-[#9d394f] text-white text-xs font-semibold hover:bg-[#81243b] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye size={14} />
                          <span>Xem chi tiết</span>
                        </Link>
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 h-9 rounded-xl bg-[#fefafc] border border-[#efe5e7] text-[#412e27] text-xs font-semibold hover:bg-[#ffe9e2] hover:text-[#9d394f] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Navigation size={14} />
                          <span>Chỉ đường</span>
                        </a>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Interactive Map Preview Container (Desktop col-span-7) */}
          <div className="lg:col-span-7 sticky top-24 order-1 lg:order-2">
            <div className="relative w-full h-[480px] lg:h-[760px] rounded-2xl overflow-hidden shadow-sm border border-[#efe5e7] bg-[#f8f9fa]">
              {/* Interactive Map Component */}
              <StoreMap
                stores={filteredStores}
                activeStoreId={activeStore.id}
                onSelectStore={handleSelectStore}
              />

              {/* Bottom Quick-View Popup Card pinned to Map */}
              {activeStore && (
                <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
                  <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-[#efe5e7]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#ffe9e2] flex items-center justify-center text-[#9d394f] flex-shrink-0">
                          <StoreIcon size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#412e27] leading-tight">
                            {activeStore.name}
                          </h3>
                          <p className="text-xs text-[#776d6d] line-clamp-1 mt-0.5">
                            {activeStore.address}, {activeStore.district}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#227a55] px-2.5 py-0.5 rounded-full bg-[#e8f5e9] flex-shrink-0">
                        {getStoreStatus(getDisplayHours(activeStore.openingHours)).label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 py-2 mb-3 text-xs text-[#776d6d] border-t border-b border-[#efe5e7]/60">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#9d394f]" />
                        <span>Giờ mở cửa: {getDisplayHours(activeStore.openingHours)}</span>
                      </div>
                      {activeStore.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-[#9d394f]" />
                          <span>{activeStore.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={
                          activeStore.latitude !== null && activeStore.longitude !== null
                            ? `https://www.google.com/maps/dir/?api=1&destination=${activeStore.latitude},${activeStore.longitude}`
                            : `https://maps.google.com/?q=${encodeURIComponent(
                                activeStore.name +
                                  " " +
                                  activeStore.address +
                                  " " +
                                  activeStore.city,
                              )}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-9 rounded-xl bg-[#9d394f] text-white text-xs font-semibold hover:bg-[#81243b] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Navigation size={14} />
                        <span>Mở Google Maps chỉ đường</span>
                      </a>
                      {activeStore.phone && (
                        <a
                          href={`tel:${activeStore.phone.replace(/\s+/g, "")}`}
                          className="h-9 px-3.5 rounded-xl bg-[#fefafc] border border-[#efe5e7] text-[#412e27] text-xs font-semibold hover:bg-[#ffe9e2] hover:text-[#9d394f] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Phone size={14} />
                          <span>Gọi điện</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
