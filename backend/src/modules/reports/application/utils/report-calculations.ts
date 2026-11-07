import { BadRequestException } from '@nestjs/common';
import {
  CustomerActivityRow,
  OrderOutcomeRow,
  RevenueRow,
} from '../../domain/repositories/report.repository.interface';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

// Ngày YYYY-MM-DD theo giờ VN → mốc 0h VN tính bằng UTC
export const vnDayStart = (day: string): Date => new Date(new Date(`${day}T00:00:00Z`).getTime() - VN_OFFSET_MS);

export const toVnDay = (date: Date): string => new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (day: string, days: number): string =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const addMonths = (month: string, months: number): string => {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
};

export interface DateRange {
  fromDay: string;
  toDay: string;
  from: Date;
  to: Date;
}

// [from, to] theo ngày VN, to tính hết ngày; mặc định 30 ngày gần nhất
export const resolveRange = (now: Date, from?: string, to?: string): DateRange => {
  const toDay = to ?? toVnDay(now);
  const fromDay = from ?? addDays(toDay, -29);
  const start = vnDayStart(fromDay);
  const end = vnDayStart(addDays(toDay, 1));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Ngày không hợp lệ');
  }
  if (start >= end) {
    throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  }
  if ((end.getTime() - start.getTime()) / DAY_MS > MAX_RANGE_DAYS) {
    throw new BadRequestException(`Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`);
  }
  return { fromDay, toDay, from: start, to: end };
};

export type PeriodKind = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface RevenueReportRow {
  period: string;
  orders: number;
  revenue: number;
  discount: number;
  shippingFee: number;
  returns: number;
  netRevenue: number;
  cost: number;
  grossProfit: number;
}

const emptyRow = (period: string): RevenueReportRow => ({
  period,
  orders: 0,
  revenue: 0,
  discount: 0,
  shippingFee: 0,
  returns: 0,
  netRevenue: 0,
  cost: 0,
  grossProfit: 0,
});

const round = (v: number) => Math.round(v * 100) / 100;

const weekStart = (day: string): string => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
};

// Khóa kỳ cho dòng ngày (YYYY-MM-DD) hoặc tháng (YYYY-MM)
export const periodKey = (period: string, kind: PeriodKind): string => {
  if (kind === 'week') return weekStart(period);
  if (kind === 'year') return period.slice(0, 4);
  if (kind === 'quarter') {
    return `${period.slice(0, 4)}-Q${Math.ceil(Number(period.slice(5, 7)) / 3)}`;
  }
  return period;
};

// Gộp dòng ngày/tháng của repository theo kỳ yêu cầu; giá vốn đã trừ giá vốn hàng trả
export const groupRevenue = (rows: RevenueRow[], kind: PeriodKind): RevenueReportRow[] => {
  const map = new Map<string, RevenueReportRow>();
  for (const r of rows) {
    const key = periodKey(r.period, kind);
    const cur = map.get(key) ?? emptyRow(key);
    cur.orders += r.orders;
    cur.revenue += r.revenue;
    cur.discount += r.discount;
    cur.shippingFee += r.shipping;
    cur.returns += r.returns;
    cur.cost += r.cost - r.returnedCost;
    map.set(key, cur);
  }
  return [...map.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => {
      const netRevenue = round(r.revenue - r.returns);
      const cost = round(r.cost);
      return {
        ...r,
        revenue: round(r.revenue),
        discount: round(r.discount),
        shippingFee: round(r.shippingFee),
        returns: round(r.returns),
        netRevenue,
        cost,
        grossProfit: round(netRevenue - cost),
      };
    });
};

export const percent = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

// Thêm giá trị đơn trung bình và tỷ lệ hủy cho từng kỳ; kỳ chỉ có đơn hủy vẫn hiện để không mất số liệu
export const withOrderMetrics = (
  rows: RevenueReportRow[],
  outcomes: OrderOutcomeRow[],
  kind: PeriodKind,
) => {
  const grouped = new Map<string, { placed: number; cancelled: number }>();
  for (const o of outcomes) {
    const key = periodKey(o.period, kind);
    const cur = grouped.get(key) ?? { placed: 0, cancelled: 0 };
    cur.placed += o.placed;
    cur.cancelled += o.cancelled;
    grouped.set(key, cur);
  }
  const all = [...rows];
  for (const key of grouped.keys()) {
    if (!rows.some((r) => r.period === key)) all.push(emptyRow(key));
  }
  return all
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => {
      const o = grouped.get(r.period) ?? { placed: 0, cancelled: 0 };
      return {
        ...r,
        averageOrderValue: r.orders ? Math.round(r.revenue / r.orders) : 0,
        placedOrders: o.placed,
        cancelledOrders: o.cancelled,
        cancelRate: percent(o.cancelled, o.placed),
      };
    });
};

export const sumOutcomes = (outcomes: OrderOutcomeRow[]) => {
  const placed = outcomes.reduce((s, o) => s + o.placed, 0);
  const cancelled = outcomes.reduce((s, o) => s + o.cancelled, 0);
  return { placedOrders: placed, cancelledOrders: cancelled, cancelRate: percent(cancelled, placed) };
};

// 29/02 lùi về năm không nhuận thì lấy 28/02
const validDay = (day: string) => {
  const year = Number(day.slice(0, 4));
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return day.endsWith('-02-29') && !leap ? `${day.slice(0, 8)}28` : day;
};

// Kỳ so sánh: 'previous' là khoảng cùng độ dài ngay trước, 'last_year' là cùng khoảng năm trước
export const comparisonRange = (
  fromDay: string,
  toDay: string,
  mode: 'previous' | 'last_year',
): { from: string; to: string } => {
  if (mode === 'last_year') {
    const shift = (day: string) => validDay(`${Number(day.slice(0, 4)) - 1}${day.slice(4)}`);
    return { from: shift(fromDay), to: shift(toDay) };
  }
  const days = Math.round(
    (new Date(`${toDay}T00:00:00Z`).getTime() - new Date(`${fromDay}T00:00:00Z`).getTime()) / DAY_MS,
  );
  return { from: addDays(fromDay, -(days + 1)), to: addDays(fromDay, -1) };
};

export const changePercent = (current: number, previous: number): number | null =>
  previous ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null;

export const sumRevenue = (rows: RevenueReportRow[]): RevenueReportRow => {
  const total = emptyRow('TOTAL');
  for (const r of rows) {
    total.orders += r.orders;
    total.revenue += r.revenue;
    total.discount += r.discount;
    total.shippingFee += r.shippingFee;
    total.returns += r.returns;
    total.netRevenue += r.netRevenue;
    total.cost += r.cost;
    total.grossProfit += r.grossProfit;
  }
  return {
    ...total,
    revenue: round(total.revenue),
    discount: round(total.discount),
    shippingFee: round(total.shippingFee),
    returns: round(total.returns),
    netRevenue: round(total.netRevenue),
    cost: round(total.cost),
    grossProfit: round(total.grossProfit),
  };
};

// Điền 0 cho ngày không có đơn để biểu đồ liên tục
export const fillDays = (rows: RevenueReportRow[], fromDay: string, toDay: string): RevenueReportRow[] => {
  const byDay = new Map(rows.map((r) => [r.period, r]));
  const out: RevenueReportRow[] = [];
  for (let d = fromDay; d <= toDay; d = addDays(d, 1)) {
    out.push(byDay.get(d) ?? emptyRow(d));
  }
  return out;
};

export const RFM_SEGMENTS = ['CHAMPIONS', 'LOYAL', 'NEW', 'AT_RISK', 'LOST', 'NEEDS_ATTENTION'] as const;

export type RfmSegment = (typeof RFM_SEGMENTS)[number];

export const RFM_SEGMENT_LABELS: Record<RfmSegment, string> = {
  CHAMPIONS: 'Khách vàng',
  LOYAL: 'Khách trung thành',
  NEW: 'Khách mới',
  AT_RISK: 'Có nguy cơ rời bỏ',
  LOST: 'Đã mất',
  NEEDS_ATTENTION: 'Cần chăm sóc',
};

export interface RfmCustomer {
  customerId: string;
  fullName: string | null;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: RfmSegment;
  segmentLabel: string;
}

// Điểm 1..5 theo ngũ phân vị vị trí; giá trị bằng nhau cùng điểm; higherIsBetter=false cho Recency (số ngày càng nhỏ càng tốt)
export const quintileScores = (values: number[], higherIsBetter: boolean): number[] => {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const firstIndex = sorted.indexOf(v);
    const score = Math.min(5, Math.floor((firstIndex * 5) / n) + 1);
    return higherIsBetter ? score : 6 - score;
  });
};

export const assignSegment = (r: number, f: number): RfmSegment => {
  if (r >= 4 && f >= 4) return 'CHAMPIONS';
  if (r >= 3 && f >= 3) return 'LOYAL';
  if (r >= 4) return 'NEW';
  if (r <= 2 && f >= 3) return 'AT_RISK';
  if (r <= 2) return 'LOST';
  return 'NEEDS_ATTENTION';
};

export const computeRfm = (rows: CustomerActivityRow[], now: Date): RfmCustomer[] => {
  if (!rows.length) return [];
  const recency = rows.map((r) => Math.max(0, Math.floor((now.getTime() - r.lastPurchaseAt.getTime()) / DAY_MS)));
  const rs = quintileScores(recency, false);
  const fs = quintileScores(
    rows.map((r) => r.frequency),
    true,
  );
  const ms = quintileScores(
    rows.map((r) => r.monetary),
    true,
  );
  return rows.map((r, i) => {
    const segment = assignSegment(rs[i], fs[i]);
    return {
      customerId: r.customerId,
      fullName: r.fullName,
      recencyDays: recency[i],
      frequency: r.frequency,
      monetary: r.monetary,
      rScore: rs[i],
      fScore: fs[i],
      mScore: ms[i],
      segment,
      segmentLabel: RFM_SEGMENT_LABELS[segment],
    };
  });
};

export const summarizeSegments = (customers: RfmCustomer[]) =>
  (Object.keys(RFM_SEGMENT_LABELS) as RfmSegment[]).map((segment) => {
    const members = customers.filter((c) => c.segment === segment);
    return {
      segment,
      label: RFM_SEGMENT_LABELS[segment],
      customers: members.length,
      monetary: round(members.reduce((s, c) => s + c.monetary, 0)),
    };
  });

// Trung bình trượt: mỗi tháng dự báo là trung bình `window` tháng liền trước (kể cả tháng đã dự báo)
export const forecastSma = (history: number[], months: number, window = 3): number[] => {
  const series = [...history];
  const out: number[] = [];
  for (let i = 0; i < months; i++) {
    const tail = series.slice(-window);
    const value = tail.length ? tail.reduce((s, v) => s + v, 0) / tail.length : 0;
    const rounded = round(value);
    out.push(rounded);
    series.push(rounded);
  }
  return out;
};

export interface ForecastPoint {
  revenue: number;
  lower: number;
  upper: number;
}

const Z_95 = 1.96;

const rootMeanSquare = (errors: number[]) =>
  errors.length ? Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length) : 0;

// Khoảng tin cậy 95%: sai số một bước trên lịch sử, nới theo căn số bước dự báo, không âm
const withInterval = (values: number[], sigma: number): ForecastPoint[] =>
  values.map((revenue, i) => {
    const margin = Z_95 * sigma * Math.sqrt(i + 1);
    return { revenue, lower: Math.max(0, round(revenue - margin)), upper: round(revenue + margin) };
  });

export const smaWithInterval = (history: number[], months: number, window = 3): ForecastPoint[] => {
  const errors: number[] = [];
  for (let i = window; i < history.length; i++) {
    const mean = history.slice(i - window, i).reduce((s, v) => s + v, 0) / window;
    errors.push(history[i] - mean);
  }
  return withInterval(forecastSma(history, months, window), rootMeanSquare(errors));
};

// Hồi quy tuyến tính bình phương nhỏ nhất theo chỉ số tháng; doanh thu dự báo không âm
export const linearWithInterval = (history: number[], months: number): ForecastPoint[] => {
  const n = history.length;
  if (n < 2) return withInterval(Array(months).fill(round(history[0] ?? 0)), 0);
  const meanX = (n - 1) / 2;
  const meanY = history.reduce((s, v) => s + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  history.forEach((y, x) => {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const errors = history.map((y, x) => y - (intercept + slope * x));
  const values = Array.from({ length: months }, (_, i) => Math.max(0, round(intercept + slope * (n + i))));
  return withInterval(values, rootMeanSquare(errors));
};

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Chặn Excel hiểu ô văn bản là công thức
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// CSV UTF-8 có BOM để Excel đọc đúng tiếng Việt
export const toCsv = (headers: string[], rows: unknown[][]): string =>
  '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
