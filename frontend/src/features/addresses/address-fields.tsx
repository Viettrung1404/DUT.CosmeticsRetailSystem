"use client";
import { useMemo, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { LocationPicker } from "./location-picker";
import { findProvince, findWard, vietnamProvinces } from "./vietnam-divisions";

export type DeliveryAddress = {
  recipientName: string;
  phone: string;
  city: string;
  ward?: string;
  district?: string;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
};
export const blankDeliveryAddress: DeliveryAddress = {
  recipientName: "",
  phone: "",
  city: "",
  ward: "",
  district: "",
  addressLine: "",
  latitude: null,
  longitude: null,
};

export function AddressFields({
  value,
  onChange,
  prefix = "delivery",
}: {
  value: DeliveryAddress;
  onChange: (value: DeliveryAddress) => void;
  prefix?: string;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const province = findProvince(value.city);
  const ward = findWard(value.city, value.ward ?? "");
  const center = useMemo(() => ward ?? province, [ward, province]);
  const point = useMemo(
    () =>
      value.latitude != null && value.longitude != null
        ? { latitude: value.latitude, longitude: value.longitude }
        : null,
    [value.latitude, value.longitude],
  );
  return (
    <div className="delivery-fields">
      <div className="checkout-address-grid">
        <label htmlFor={`${prefix}-name`}>
          Họ và tên người nhận <span>*</span>
          <input
            id={`${prefix}-name`}
            autoComplete="shipping name"
            maxLength={100}
            required
            value={value.recipientName}
            onChange={(event) => onChange({ ...value, recipientName: event.target.value })}
            placeholder="Nhập họ và tên"
          />
        </label>
        <label htmlFor={`${prefix}-phone`}>
          Số điện thoại <span>*</span>
          <input
            id={`${prefix}-phone`}
            type="tel"
            autoComplete="shipping tel"
            maxLength={20}
            required
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
            placeholder="Số điện thoại nhận hàng"
          />
        </label>
        <label htmlFor={`${prefix}-city`}>
          Tỉnh / thành phố <span>*</span>
          <select
            id={`${prefix}-city`}
            autoComplete="shipping address-level1"
            required
            value={province?.code ?? ""}
            onChange={(event) => {
              const selected = vietnamProvinces.find((item) => item.code === event.target.value);
              onChange({
                ...value,
                city: selected?.name ?? "",
                ward: "",
                district: "",
                latitude: null,
                longitude: null,
              });
            }}
          >
            <option value="">Chọn tỉnh / thành phố</option>
            {vietnamProvinces.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${prefix}-ward`}>
          Phường / xã / đặc khu <span>*</span>
          <select
            id={`${prefix}-ward`}
            autoComplete="shipping address-level2"
            required
            disabled={!province}
            value={ward?.code ?? ""}
            onChange={(event) => {
              const selected = province?.wards.find((item) => item.code === event.target.value);
              onChange({
                ...value,
                city: province?.name ?? value.city,
                ward: selected?.name ?? "",
                district: "",
                latitude: null,
                longitude: null,
              });
            }}
          >
            <option value="">
              {province ? "Chọn phường / xã / đặc khu" : "Vui lòng chọn tỉnh / thành trước"}
            </option>
            {province?.wards.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="address-wide" htmlFor={`${prefix}-line`}>
          Số nhà, tên đường <span>*</span>
          <input
            id={`${prefix}-line`}
            autoComplete="shipping address-line1"
            required
            maxLength={255}
            value={value.addressLine}
            onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
            placeholder="Số nhà, tên đường, tòa nhà…"
          />
        </label>
      </div>
      <div className="delivery-location-note">
        <span>Địa chỉ theo đơn vị hành chính mới, không cần quận/huyện.</span>
        <a href="https://tinhthanhpho.com/en/api-docs#open-data" target="_blank" rel="noreferrer">
          Dữ liệu: tinhthanhpho.com
        </a>
      </div>
      <button
        type="button"
        className="delivery-map-toggle"
        aria-expanded={mapOpen}
        onClick={() => setMapOpen(!mapOpen)}
      >
        <MapPin size={18} />
        {point ? "Xem / chỉnh vị trí đã ghim" : "Chọn vị trí trên bản đồ"}
        <ChevronDown size={16} />
      </button>
      {mapOpen && (
        <LocationPicker
          value={point}
          center={center}
          onChange={(location) =>
            onChange({
              ...value,
              latitude: location?.latitude ?? null,
              longitude: location?.longitude ?? null,
            })
          }
        />
      )}
    </div>
  );
}
