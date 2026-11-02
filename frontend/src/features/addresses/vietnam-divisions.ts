import dataset from "./data/vietnam-divisions.json";

export const vietnamProvinces = dataset.provinces;
export const divisionDataVersion = dataset.version;
export function normalizeDivision(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp\.?|phuong|xa|dac khu)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}
export function findProvince(name: string) {
  return vietnamProvinces.find(
    (province) => normalizeDivision(province.name) === normalizeDivision(name),
  );
}
export function findWard(city: string, ward: string) {
  return findProvince(city)?.wards.find(
    (item) => normalizeDivision(item.name) === normalizeDivision(ward),
  );
}
export function isCurrentAddress(value: { city: string; ward?: string; district?: string }) {
  return !value.district && !!findWard(value.city, value.ward ?? "");
}
export function formatAddress(value: {
  addressLine: string;
  city: string;
  ward?: string;
  district?: string;
}) {
  return [value.addressLine, value.ward, value.district, value.city].filter(Boolean).join(", ");
}
