import { BadRequestException } from '@nestjs/common';
import { RevenueRow } from '../../../domain/repositories/report.repository.interface';
import {
  addMonths,
  assignSegment,
  computeRfm,
  fillDays,
  forecastSma,
  groupRevenue,
  quintileScores,
  resolveRange,
  summarizeSegments,
  sumRevenue,
  toCsv,
  changePercent,
  comparisonRange,
  linearWithInterval,
  periodKey,
  smaWithInterval,
} from '../report-calculations';

const row = (period: string, patch: Partial<RevenueRow> = {}): RevenueRow => ({
  period,
  orders: 1,
  revenue: 100,
  discount: 10,
  shipping: 5,
  cost: 60,
  returns: 0,
  returnedCost: 0,
  ...patch,
});

describe('quintileScores', () => {
  it('10 giá trị khác nhau chia đều 5 mức, mỗi mức 2 người', () => {
    const scores = quintileScores([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], true);
    expect(scores).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('Recency: số ngày nhỏ nhất được điểm cao nhất', () => {
    const scores = quintileScores([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], false);
    expect(scores[0]).toBe(5);
    expect(scores[9]).toBe(1);
  });

  it('giá trị bằng nhau cùng điểm', () => {
    const scores = quintileScores([5, 5, 5, 5, 5], true);
    expect(new Set(scores).size).toBe(1);
  });
});

describe('RFM', () => {
  it('gán nhóm theo điểm R và F', () => {
    expect(assignSegment(5, 5)).toBe('CHAMPIONS');
    expect(assignSegment(3, 4)).toBe('LOYAL');
    expect(assignSegment(5, 1)).toBe('NEW');
    expect(assignSegment(2, 4)).toBe('AT_RISK');
    expect(assignSegment(1, 1)).toBe('LOST');
    expect(assignSegment(3, 1)).toBe('NEEDS_ATTENTION');
  });

  it('khách mua gần, mua nhiều là Khách vàng; khách lâu không mua, ít đơn là Đã mất', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    const rows = Array.from({ length: 10 }, (_, i) => ({
      customerId: `c${i}`,
      fullName: `Khách ${i}`,
      lastPurchaseAt: new Date(now.getTime() - (i + 1) * 30 * day),
      frequency: 10 - i,
      monetary: (10 - i) * 1000,
    }));
    const result = computeRfm(rows, now);
    expect(result[0].segment).toBe('CHAMPIONS');
    expect(result[0].segmentLabel).toBe('Khách vàng');
    expect(result[9].segment).toBe('LOST');
    const summary = summarizeSegments(result);
    expect(summary.reduce((s, x) => s + x.customers, 0)).toBe(10);
  });

  it('không có khách thì trả mảng rỗng', () => {
    expect(computeRfm([], new Date())).toEqual([]);
  });
});

describe('forecastSma', () => {
  it('tháng đầu = trung bình 3 tháng cuối, tháng sau dùng cả giá trị đã dự báo', () => {
    expect(forecastSma([10, 20, 30], 2)).toEqual([20, 23.33]);
  });

  it('không có lịch sử thì dự báo 0', () => {
    expect(forecastSma([], 2)).toEqual([0, 0]);
  });
});

describe('groupRevenue', () => {
  it('gộp ngày vào tuần bắt đầu từ thứ Hai', () => {
    // 2026-11-02 là thứ Hai, 2026-11-08 là Chủ nhật cùng tuần
    const rows = groupRevenue([row('2026-11-01'), row('2026-11-02'), row('2026-11-08')], 'week');
    expect(rows.map((r) => r.period)).toEqual(['2026-10-26', '2026-11-02']);
    expect(rows[1].orders).toBe(2);
  });

  it('lợi nhuận gộp = doanh thu - hàng trả - (giá vốn - giá vốn hàng trả); phí ship nằm cột riêng', () => {
    const [r] = groupRevenue([row('2026-11-02', { returns: 20, returnedCost: 12 })], 'day');
    expect(r.netRevenue).toBe(80);
    expect(r.cost).toBe(48);
    expect(r.grossProfit).toBe(32);
    expect(r.shippingFee).toBe(5);
    expect(sumRevenue([r, r]).grossProfit).toBe(64);
  });

  it('fillDays điền 0 cho ngày thiếu', () => {
    const filled = fillDays(groupRevenue([row('2026-11-02')], 'day'), '2026-11-01', '2026-11-03');
    expect(filled.map((r) => r.orders)).toEqual([0, 1, 0]);
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-11-02T05:00:00Z');

  it('mặc định 30 ngày kết thúc hôm nay theo giờ VN', () => {
    const r = resolveRange(now);
    expect(r.toDay).toBe('2026-11-02');
    expect(r.fromDay).toBe('2026-10-04');
    expect(r.from.toISOString()).toBe('2026-10-03T17:00:00.000Z');
  });

  it('từ ngày sau đến ngày → 400', () => {
    expect(() => resolveRange(now, '2026-11-05', '2026-11-01')).toThrow(BadRequestException);
  });

  it('khoảng quá 366 ngày → 400', () => {
    expect(() => resolveRange(now, '2025-01-01', '2026-11-01')).toThrow(BadRequestException);
  });

  it('addMonths qua năm', () => {
    expect(addMonths('2026-02', -3)).toBe('2025-11');
    expect(addMonths('2026-11', 2)).toBe('2027-01');
  });
});

describe('toCsv', () => {
  it('có BOM, escape dấu phẩy, nháy kép và xuống dòng', () => {
    const csv = toCsv(['A', 'B'], [['x,y', 'nói "hay"'], ['dòng\n2', 5]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"x,y","nói ""hay"""');
    expect(csv).toContain('"dòng\n2",5');
  });

  it('chuỗi bắt đầu bằng = bị vô hiệu công thức, số âm vẫn giữ nguyên', () => {
    const csv = toCsv(['A', 'B'], [['=SUM(A1)', -5]]);
    expect(csv).toContain("'=SUM(A1),-5");
  });
});

describe('kỳ so sánh', () => {
  it('khoảng liền trước cùng độ dài', () => {
    expect(comparisonRange('2026-10-01', '2026-10-31', 'previous')).toEqual({
      from: '2026-08-31',
      to: '2026-09-30',
    });
  });

  it('cùng kỳ năm trước, 29/02 lùi về 28/02', () => {
    expect(comparisonRange('2024-02-29', '2024-03-01', 'last_year')).toEqual({
      from: '2023-02-28',
      to: '2023-03-01',
    });
  });

  it('kỳ trước bằng 0 thì không tính được phần trăm', () => {
    expect(changePercent(100, 0)).toBeNull();
    expect(changePercent(150, 100)).toBe(50);
  });
});

describe('khóa kỳ', () => {
  it('quý và năm', () => {
    expect(periodKey('2026-11', 'quarter')).toBe('2026-Q4');
    expect(periodKey('2026-03', 'quarter')).toBe('2026-Q1');
    expect(periodKey('2026-11', 'year')).toBe('2026');
  });
});

describe('khoảng tin cậy dự báo', () => {
  it('lịch sử phẳng thì khoảng tin cậy bằng 0', () => {
    expect(smaWithInterval([100, 100, 100, 100, 100], 2)).toEqual([
      { revenue: 100, lower: 100, upper: 100 },
      { revenue: 100, lower: 100, upper: 100 },
    ]);
  });

  it('SMA có dao động: khoảng rộng dần theo số tháng, cận dưới không âm', () => {
    const [first, second] = smaWithInterval([0, 100, 0, 100, 0, 100], 2);
    expect(first.upper - first.revenue).toBeGreaterThan(0);
    expect(second.upper - second.revenue).toBeGreaterThan(first.upper - first.revenue);
    expect(first.lower).toBeGreaterThanOrEqual(0);
  });

  it('hồi quy tuyến tính theo đúng đường thẳng', () => {
    expect(linearWithInterval([10, 20, 30, 40], 2)).toEqual([
      { revenue: 50, lower: 50, upper: 50 },
      { revenue: 60, lower: 60, upper: 60 },
    ]);
  });

  it('xu hướng giảm mạnh thì dự báo không âm', () => {
    expect(linearWithInterval([40, 30, 20, 10], 3)[2].revenue).toBe(0);
  });
});
