"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";

export type LocationPoint = { latitude: number; longitude: number };
export function LocationPicker({
  value,
  center,
  onChange,
}: {
  value: LocationPoint | null;
  center?: LocationPoint;
  onChange: (value: LocationPoint | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  const initialView = useRef({
    point: value ?? center ?? { latitude: 16.06, longitude: 108.22 },
    zoom: value ? 16 : center ? 14 : 5,
  });
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    let active = true;
    void import("leaflet")
      .then((L) => {
        if (!active || !host.current) return;
        // This picker can unmount as soon as a point is saved. Leaflet's zoom
        // transition fallback can otherwise run after remove() destroys its pane.
        const instance = L.map(host.current, {
          scrollWheelZoom: false,
          zoomAnimation: false,
        }).setView(
          [initialView.current.point.latitude, initialView.current.point.longitude],
          initialView.current.zoom,
        );
        map.current = instance;
        const tileUrl =
          process.env.NEXT_PUBLIC_MAP_TILE_URL ||
          "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
        const isGoogle = tileUrl.includes("google.com");

        L.tileLayer(tileUrl, {
          maxZoom: 20,
          // Override the page's no-referrer policy for tile provider identification.
          referrerPolicy: "strict-origin-when-cross-origin",
          subdomains: isGoogle ? ["mt0", "mt1", "mt2", "mt3"] : ["a", "b", "c"],
          attribution:
            process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
            (isGoogle
              ? "&copy; Google Maps"
              : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'),
        })
          .on("tileerror", () => {
            if (active)
              setMessage(
                "Một số ô bản đồ chưa tải được. Bạn vẫn có thể nhập địa chỉ hoặc thử mở lại bản đồ.",
              );
          })
          .addTo(instance);

        setTimeout(() => {
          if (active && map.current) {
            map.current.invalidateSize();
          }
        }, 200);
        instance.on("click", (event) =>
          change.current({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
        );
        setReady(true);
      })
      .catch(() => {
        if (active) setMessage("Chưa tải được bản đồ. Vui lòng nhập địa chỉ bên trên.");
      });
    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    let active = true;
    void import("leaflet").then((L) => {
      if (!active) return;
      marker.current?.remove();
      marker.current = null;
      if (value) {
        marker.current = L.marker([value.latitude, value.longitude], {
          draggable: true,
          title: "Điểm giao hàng — kéo để điều chỉnh",
          icon: L.divIcon({
            className: "delivery-map-pin",
            html: '<span aria-hidden="true"></span>',
            iconSize: [28, 36],
            iconAnchor: [14, 36],
          }),
        })
          .on("dragend", () => {
            const point = marker.current?.getLatLng();
            if (point) change.current({ latitude: point.lat, longitude: point.lng });
          })
          .addTo(instance);
        instance.setView([value.latitude, value.longitude], 16);
      } else if (center) instance.setView([center.latitude, center.longitude], 14);
    });
    return () => {
      active = false;
    };
  }, [ready, value, center]);
  function locate() {
    if (!navigator.geolocation) {
      setMessage("Trình duyệt chưa hỗ trợ định vị. Hãy chạm vào bản đồ để ghim điểm.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        change.current({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setMessage(
          "Chưa lấy được vị trí. Bạn có thể cấp quyền định vị hoặc chạm vào bản đồ để chọn điểm.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <div className="delivery-map">
      <div className="delivery-map-toolbar">
        <span>
          <MapPin size={16} /> Ghim vị trí nhận hàng
        </span>
        <button type="button" onClick={locate} disabled={locating}>
          <LocateFixed size={16} />
          {locating ? "Đang định vị…" : "Vị trí của tôi"}
        </button>
      </div>
      <div ref={host} className="delivery-map-canvas" aria-label="Bản đồ chọn vị trí giao hàng" />
      {message && (
        <p role="status" className="delivery-map-message">
          {message}
        </p>
      )}
      <div className="delivery-map-caption">
        {value ? (
          <>
            <span>
              Đã ghim: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </span>
            <button type="button" onClick={() => onChange(null)}>
              <X size={14} /> Bỏ ghim
            </button>
          </>
        ) : (
          <span>Chạm vào bản đồ để ghim điểm. Có thể kéo ghim để điều chỉnh.</span>
        )}
      </div>
      <small>
        Vị trí ghim giúp tìm điểm giao hàng. Vui lòng kiểm tra tỉnh/thành, phường/xã và số nhà bên
        trên.
      </small>
    </div>
  );
}
