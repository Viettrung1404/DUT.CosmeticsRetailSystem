const VN_OFFSET_MS = 7 * 3_600_000;
const ROTATION_EPOCH = Date.UTC(2026, 10, 26);

export function isPromotionInSlot(slotStartHour: number | null | undefined, now = new Date()): boolean {
  if (slotStartHour == null) return true;
  return Math.floor(new Date(now.getTime() + VN_OFFSET_MS).getUTCHours() / 2) * 2 === slotStartHour;
}

export function isFeaturedProduct(rank: number | null | undefined, total: number, count: number, slot: number | null | undefined, now = new Date()): boolean {
  if (rank == null || total <= 0 || slot == null) return false;
  const days = Math.floor((now.getTime() + VN_OFFSET_MS - ROTATION_EPOCH) / 86_400_000);
  const offset = (days * 12 + slot / 2) * count;
  return ((rank - offset) % total + total) % total < Math.min(count, total);
}

export function promotionSlotEnd(endDate: Date, slot: number | null | undefined, now = new Date()): Date {
  if (slot == null) return endDate;
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const end = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate(), slot + 2) - VN_OFFSET_MS;
  return new Date(Math.min(end, endDate.getTime()));
}
