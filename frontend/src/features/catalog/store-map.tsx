"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer } from "leaflet";

export interface StoreMapItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string | null;
}

interface StoreMapProps {
  stores: StoreMapItem[];
  activeStoreId: string;
  onSelectStore: (id: string) => void;
}

export function StoreMap({ stores, activeStoreId, onSelectStore }: StoreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  const initialCenterRef = useRef({
    lat: activeStore?.latitude ?? 21.0368,
    lng: activeStore?.longitude ?? 105.7831,
  });

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;
    const markers = markersRef.current;
    let resizeObserver: ResizeObserver | null = null;

    void import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const initialLat = initialCenterRef.current.lat;
      const initialLng = initialCenterRef.current.lng;

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        zoomControl: false,
      }).setView([initialLat, initialLng], 14);

      mapInstanceRef.current = map;

      // Google Maps standard tile layer (reliable, fast, zero blockage in VN, no API key required)
      const configuredTileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
      const defaultTileUrl = "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
      const tileUrl = configuredTileUrl || defaultTileUrl;
      const isGoogle = tileUrl.includes("google.com");

      const tileLayer: TileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        // Tile providers require a Referer; send only the origin, without address data.
        referrerPolicy: "strict-origin-when-cross-origin",
        subdomains: isGoogle ? ["mt0", "mt1", "mt2", "mt3"] : ["a", "b", "c"],
        attribution:
          process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
          (isGoogle
            ? "&copy; Google Maps"
            : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'),
      });

      // Fallback to ESRI World Street Map if primary fails
      tileLayer.on("tileerror", () => {
        if (!configuredTileUrl && isGoogle) {
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            {
              maxZoom: 19,
              attribution: "&copy; Esri",
            },
          ).addTo(map);
        }
      });

      tileLayer.addTo(map);

      // Trigger size recalculation shortly after render
      const timer = setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      // Observe size changes
      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      setMapReady(true);

      return () => {
        clearTimeout(timer);
      };
    });

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markers.clear();
    };
  }, []);

  // Update markers when stores or activeStore changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    void import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Remove existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      stores.forEach((store) => {
        if (store.latitude === null || store.longitude === null) return;

        const isActive = store.id === activeStoreId;

        // Custom icon
        const iconHtml = isActive
          ? `<div class="store-pin-active" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:scale(1.15);transition:all 0.2s ease;">
               <div style="width:42px;height:42px;border-radius:50%;background:#9d394f;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(157,57,79,0.45);border:3px solid #ffffff;">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                 </svg>
               </div>
               <div style="width:8px;height:8px;background:#9d394f;border-right:2px solid #ffffff;border-bottom:2px solid #ffffff;transform:rotate(45deg);margin-top:-4px;"></div>
             </div>`
          : `<div class="store-pin-regular" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all 0.2s ease;">
               <div style="width:34px;height:34px;border-radius:50%;background:#ffffff;color:#9d394f;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid #e098a8;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                   <polyline points="9 22 9 12 15 12 15 22"></polyline>
                 </svg>
               </div>
               <div style="width:6px;height:6px;background:#ffffff;border-right:2px solid #e098a8;border-bottom:2px solid #e098a8;transform:rotate(45deg);margin-top:-3px;"></div>
             </div>`;

        const icon = L.divIcon({
          className: `custom-store-pin-${store.id}`,
          html: iconHtml,
          iconSize: isActive ? [42, 50] : [34, 40],
          iconAnchor: isActive ? [21, 50] : [17, 40],
        });

        const marker = L.marker([store.latitude, store.longitude], {
          icon,
          zIndexOffset: isActive ? 1000 : 1,
        }).addTo(map);

        marker.on("click", () => {
          onSelectStore(store.id);
        });

        marker.bindTooltip(store.name, {
          direction: "top",
          offset: [0, isActive ? -45 : -35],
          className: "store-map-tooltip",
        });

        markersRef.current.set(store.id, marker);
      });
    });
  }, [stores, activeStoreId, mapReady, onSelectStore]);

  // Center on active store when changed
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !activeStore) return;
    if (activeStore.latitude === null || activeStore.longitude === null) return;

    mapInstanceRef.current.flyTo([activeStore.latitude, activeStore.longitude], 15, {
      duration: 1.2,
    });
  }, [activeStoreId, mapReady, activeStore]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị vị trí.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14, { duration: 1.5 });
        }

        // Find nearest store
        let minDistance = Infinity;
        let nearestId = "";

        stores.forEach((store) => {
          if (store.latitude === null || store.longitude === null) return;
          const dLat = store.latitude - latitude;
          const dLng = store.longitude - longitude;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestId = store.id;
          }
        });

        if (nearestId) {
          onSelectStore(nearestId);
        }
      },
      () => {
        setLocatingUser(false);
        alert("Không thể truy cập vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.");
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden rounded-2xl bg-[#f8f9fa]">
      {/* Map Host Div */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

      {/* Floating Map Controls Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-[#efe5e7] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9d394f] animate-ping" />
          <span className="text-xs font-semibold text-[#412e27] truncate max-w-[200px] sm:max-w-none">
            {activeStore ? `Đang định vị: ${activeStore.name}` : "Hệ thống Showroom"}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-md text-[#412e27] shadow-sm hover:text-[#9d394f] hover:bg-white flex items-center justify-center transition-colors border border-[#efe5e7]"
            title="Phóng to"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-md text-[#412e27] shadow-sm hover:text-[#9d394f] hover:bg-white flex items-center justify-center transition-colors border border-[#efe5e7]"
            title="Thu nhỏ"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locatingUser}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-md text-[#412e27] shadow-sm hover:text-[#9d394f] hover:bg-white flex items-center justify-center transition-colors border border-[#efe5e7] disabled:opacity-50"
            title="Tìm showroom gần tôi nhất"
          >
            <LocateFixed size={16} className={locatingUser ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
