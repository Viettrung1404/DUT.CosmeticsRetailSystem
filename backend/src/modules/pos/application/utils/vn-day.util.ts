const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Ngày theo giờ Việt Nam (UTC+7): chuỗi YYYYMMDD và khoảng [start, end) tính bằng giờ UTC
export const vnDay = (at: Date): { ymd: string; start: Date; end: Date } => {
  const shifted = new Date(at.getTime() + VN_OFFSET_MS);
  const ymd = shifted.toISOString().slice(0, 10).replace(/-/g, '');
  const startUtc =
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - VN_OFFSET_MS;
  return { ymd, start: new Date(startUtc), end: new Date(startUtc + 24 * 60 * 60 * 1000) };
};
