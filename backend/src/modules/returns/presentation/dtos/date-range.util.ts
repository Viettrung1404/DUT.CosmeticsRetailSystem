// Ngày dạng YYYY-MM-DD theo giờ Việt Nam
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const startOfDayVn = (d?: string) => (d ? new Date(`${d}T00:00:00+07:00`) : undefined);
export const endOfDayVn = (d?: string) => (d ? new Date(`${d}T23:59:59.999+07:00`) : undefined);
