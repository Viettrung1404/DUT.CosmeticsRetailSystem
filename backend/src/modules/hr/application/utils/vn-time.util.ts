const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Số phút đã trôi qua từ 0h theo giờ Việt Nam
export const vnMinutesOfDay = (at: Date): number => {
  const vn = new Date(at.getTime() + VN_OFFSET_MS);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
};

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// "YYYY-MM-DD" -> Date 0h UTC, cùng cách lưu với cột DATE
export const parseDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
