const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Ngày hôm nay theo giờ Việt Nam, biểu diễn như cột DATE (0h UTC) để so với expiry_date
export const startOfVnToday = (now: Date = new Date()): Date => {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
};

// BR-04: còn hạn dưới 3 tháng là cận date
export const nearExpiryThreshold = (now: Date = new Date()): Date => {
  const today = startOfVnToday(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 3, today.getUTCDate()));
};
