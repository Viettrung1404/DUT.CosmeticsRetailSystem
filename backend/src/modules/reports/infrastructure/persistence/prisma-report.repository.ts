import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  CategoryRevenueRow,
  CategorySeriesRow,
  ChannelRow,
  CustomerActivityRow,
  HeatmapRow,
  HrSummaryRow,
  IReportRepository,
  OrderOutcomeRow,
  ProductSalesRow,
  ReportFilter,
  RevenueRow,
  SlowMoverRow,
  StaffRow,
} from '../../domain/repositories/report.repository.interface';

const n = (v: unknown) => Number(v ?? 0);

const storeClause = (storeIds?: string[], column = Prisma.sql`o.store_id`) =>
  storeIds
    ? storeIds.length
      ? Prisma.sql`AND ${column} IN (${Prisma.join(storeIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.sql`AND false`
    : Prisma.empty;

const staffClause = (employeeId?: string) =>
  employeeId ? Prisma.sql`AND o.sales_staff_id = ${employeeId}::uuid` : Prisma.empty;

// Danh mục được chọn và toàn bộ danh mục con của nó
const categoryClause = (categoryId?: string, column = Prisma.sql`p.category_id`) =>
  categoryId
    ? Prisma.sql`AND ${column} IN (
        WITH RECURSIVE tree AS (
          SELECT id FROM categories WHERE id = ${categoryId}::uuid
          UNION ALL
          SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
        )
        SELECT id FROM tree)`
    : Prisma.empty;

// doanh thu thuần tiền hàng (không phí ship, không thuế), thời điểm ghi nhận theo kênh
const salesCte = (f: ReportFilter) => Prisma.sql`
  sales AS (
    SELECT o.id, o.store_id, o.sales_staff_id, o.customer_id, o.order_type,
      (o.total_amount - o.shipping_fee - o.tax_amount) AS revenue,
      o.discount_amount AS discount, o.shipping_fee AS shipping,
      CASE WHEN o.order_type = 'POS' THEN o.created_at
        ELSE (SELECT min(h.created_at) FROM order_status_history h WHERE h.order_id = o.id AND h.status = 'COMPLETED')
      END AS recognized_at
    FROM orders o
    WHERE o.status IN ('COMPLETED', 'RETURNED') ${storeClause(f.storeIds)} ${staffClause(f.employeeId)}
  ),
  recognized AS (
    SELECT * FROM sales WHERE recognized_at >= ${f.from} AND recognized_at < ${f.to}
  )`;

const returnsCte = (f: ReportFilter) => Prisma.sql`
  returned AS (
    SELECT r.id, o.store_id, o.sales_staff_id, r.refund_amount,
      (SELECT min(h.created_at) FROM return_status_history h WHERE h.return_order_id = r.id AND h.status = 'COMPLETED') AS returned_at,
      (SELECT coalesce(sum(ri.quantity * oi.unit_cost), 0) FROM return_order_items ri
         JOIN order_items oi ON oi.id = ri.order_item_id WHERE ri.return_order_id = r.id) AS returned_cost
    FROM return_orders r JOIN orders o ON o.id = r.order_id
    WHERE r.status = 'COMPLETED' ${storeClause(f.storeIds)} ${staffClause(f.employeeId)}
  )`;

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async revenueSeries(f: ReportFilter, granularity: 'day' | 'month'): Promise<RevenueRow[]> {
    const format = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}, ${returnsCte(f)},
      sold AS (
        SELECT to_char(s.recognized_at + interval '7 hour', ${format}) AS period,
          count(*)::int AS orders, sum(s.revenue) AS revenue,
          sum(s.discount) AS discount, sum(s.shipping) AS shipping,
          sum((SELECT coalesce(sum(oi.unit_cost * oi.quantity), 0) FROM order_items oi WHERE oi.order_id = s.id)) AS cost
        FROM recognized s GROUP BY 1
      ),
      back AS (
        SELECT to_char(r.returned_at + interval '7 hour', ${format}) AS period,
          sum(r.refund_amount) AS returns, sum(r.returned_cost) AS returned_cost
        FROM returned r WHERE r.returned_at >= ${f.from} AND r.returned_at < ${f.to} GROUP BY 1
      )
      SELECT coalesce(s.period, b.period) AS period, coalesce(s.orders, 0) AS orders,
        coalesce(s.revenue, 0)::text AS revenue, coalesce(s.discount, 0)::text AS discount,
        coalesce(s.shipping, 0)::text AS shipping, coalesce(s.cost, 0)::text AS cost,
        coalesce(b.returns, 0)::text AS returns, coalesce(b.returned_cost, 0)::text AS returned_cost
      FROM sold s FULL JOIN back b ON b.period = s.period
      ORDER BY 1`;
    return rows.map((r) => ({
      period: r.period as string,
      orders: n(r.orders),
      revenue: n(r.revenue),
      discount: n(r.discount),
      shipping: n(r.shipping),
      cost: n(r.cost),
      returns: n(r.returns),
      returnedCost: n(r.returned_cost),
    }));
  }

  async orderOutcomes(f: ReportFilter, granularity: 'day' | 'month'): Promise<OrderOutcomeRow[]> {
    const format = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT to_char(o.created_at + interval '7 hour', ${format}) AS period,
        count(*)::int AS placed,
        count(*) FILTER (WHERE o.status = 'CANCELLED')::int AS cancelled
      FROM orders o
      WHERE o.created_at >= ${f.from} AND o.created_at < ${f.to}
        ${storeClause(f.storeIds)} ${staffClause(f.employeeId)}
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({
      period: r.period as string,
      placed: n(r.placed),
      cancelled: n(r.cancelled),
    }));
  }

  async revenueByChannel(f: ReportFilter): Promise<ChannelRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}
      SELECT order_type AS channel, count(*)::int AS orders, sum(revenue)::text AS revenue
      FROM recognized GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({ channel: r.channel as string, orders: n(r.orders), revenue: n(r.revenue) }));
  }

  // Doanh thu dòng = thành tiền dòng trừ phần điểm phân bổ; giảm giá cấp đơn chưa chia về dòng
  async productSales(f: ReportFilter, limit: number): Promise<ProductSalesRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}
      SELECT oi.product_variant_id, v.sku, max(oi.product_name) AS product_name,
        sum(oi.quantity)::int AS quantity,
        sum(oi.total_price - oi.points_discount)::text AS revenue,
        sum(oi.unit_cost * oi.quantity)::text AS cost
      FROM recognized s
      JOIN order_items oi ON oi.order_id = s.id
      JOIN product_variants v ON v.id = oi.product_variant_id
      JOIN products p ON p.id = v.product_id
      WHERE true ${categoryClause(f.categoryId)}
      GROUP BY oi.product_variant_id, v.sku
      ORDER BY sum(oi.quantity) DESC, v.sku
      LIMIT ${limit}`;
    return rows.map((r) => ({
      productVariantId: r.product_variant_id as string,
      sku: r.sku as string,
      productName: r.product_name as string,
      quantity: n(r.quantity),
      revenue: n(r.revenue),
      cost: n(r.cost),
    }));
  }

  // còn tồn nhưng không bán được trong khoảng gần đây
  async slowMovers(
    storeIds: string[] | undefined,
    since: Date,
    limit: number,
    categoryId?: string,
  ): Promise<SlowMoverRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH stock AS (
        SELECT i.product_variant_id, sum(i.quantity)::int AS stock
        FROM inventory i WHERE i.quantity > 0 ${storeClause(storeIds, Prisma.sql`i.store_id`)}
        GROUP BY 1
      ),
      last_sale AS (
        SELECT oi.product_variant_id, max(o.created_at) AS last_sold_at
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('CANCELLED') ${storeClause(storeIds)}
        GROUP BY 1
      )
      SELECT st.product_variant_id, v.sku, p.name AS product_name, st.stock, ls.last_sold_at
      FROM stock st
      JOIN product_variants v ON v.id = st.product_variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN last_sale ls ON ls.product_variant_id = st.product_variant_id
      WHERE (ls.last_sold_at IS NULL OR ls.last_sold_at < ${since}) ${categoryClause(categoryId)}
      ORDER BY ls.last_sold_at NULLS FIRST, st.stock DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      productVariantId: r.product_variant_id as string,
      sku: r.sku as string,
      productName: r.product_name as string,
      stock: n(r.stock),
      lastSoldAt: (r.last_sold_at as Date | null) ?? null,
    }));
  }

  async staffPerformance(f: ReportFilter): Promise<StaffRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}, ${returnsCte(f)}
      SELECT e.id AS employee_id, e.employee_code, u.full_name,
        count(s.id)::int AS orders, coalesce(sum(s.revenue), 0)::text AS revenue,
        (SELECT coalesce(sum(r.refund_amount), 0) FROM returned r
           WHERE r.sales_staff_id = e.id AND r.returned_at >= ${f.from} AND r.returned_at < ${f.to})::text AS returns,
        (SELECT coalesce(sum(c.amount), 0) FROM commissions c
           WHERE c.employee_id = e.id AND c.status <> 'CANCELLED' AND c.order_id IN (SELECT id FROM recognized))::text AS commission
      FROM recognized s
      JOIN employees e ON e.id = s.sales_staff_id
      JOIN users u ON u.id = e.user_id
      GROUP BY e.id, e.employee_code, u.full_name
      ORDER BY sum(s.revenue) DESC`;
    return rows.map((r) => ({
      employeeId: r.employee_id as string,
      employeeCode: r.employee_code as string,
      fullName: r.full_name as string,
      orders: n(r.orders),
      revenue: n(r.revenue),
      returns: n(r.returns),
      commission: n(r.commission),
    }));
  }

  async customerActivity(f: ReportFilter): Promise<CustomerActivityRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}
      SELECT s.customer_id, coalesce(c.full_name, u.full_name) AS full_name, max(s.recognized_at) AS last_purchase_at,
        count(*)::int AS frequency, sum(s.revenue)::text AS monetary
      FROM recognized s
      JOIN customers c ON c.id = s.customer_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE s.customer_id IS NOT NULL
      GROUP BY s.customer_id, c.full_name, u.full_name`;
    return rows.map((r) => ({
      customerId: r.customer_id as string,
      fullName: (r.full_name as string | null) ?? null,
      lastPurchaseAt: r.last_purchase_at as Date,
      frequency: n(r.frequency),
      monetary: n(r.monetary),
    }));
  }

  async lowStockCount(storeIds: string[] | undefined) {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM inventory i
      WHERE i.available_quantity < i.min_quantity ${storeClause(storeIds, Prisma.sql`i.store_id`)}`;
    return rows[0]?.count ?? 0;
  }

  newCustomers(from: Date, to: Date) {
    return this.prisma.customer.count({ where: { createdAt: { gte: from, lt: to } } });
  }

  async pendingOrders(storeIds: string[] | undefined) {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM orders o WHERE o.status = 'PENDING' ${storeClause(storeIds)}`;
    return rows[0]?.count ?? 0;
  }

  // Hàng trả trừ vào đúng danh mục, theo ngày hoàn tất trả như doanh thu thuần
  async categoryRevenue(f: ReportFilter): Promise<CategoryRevenueRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}, ${returnsCte(f)},
      sold AS (
        SELECT p.category_id, sum(oi.quantity)::int AS quantity,
          sum(oi.total_price - oi.points_discount) AS revenue
        FROM recognized s
        JOIN order_items oi ON oi.order_id = s.id
        JOIN product_variants v ON v.id = oi.product_variant_id
        JOIN products p ON p.id = v.product_id
        WHERE true ${categoryClause(f.categoryId)}
        GROUP BY 1
      ),
      back AS (
        SELECT p.category_id, sum(ri.quantity)::int AS quantity, sum(ri.refund_amount) AS revenue
        FROM returned r
        JOIN return_order_items ri ON ri.return_order_id = r.id
        JOIN product_variants v ON v.id = ri.product_variant_id
        JOIN products p ON p.id = v.product_id
        WHERE r.returned_at >= ${f.from} AND r.returned_at < ${f.to} ${categoryClause(f.categoryId)}
        GROUP BY 1
      )
      SELECT c.id AS category_id, c.name AS category_name,
        coalesce(s.quantity, 0) - coalesce(b.quantity, 0) AS quantity,
        (coalesce(s.revenue, 0) - coalesce(b.revenue, 0))::text AS revenue
      FROM sold s
      FULL JOIN back b ON b.category_id = s.category_id
      JOIN categories c ON c.id = coalesce(s.category_id, b.category_id)
      ORDER BY coalesce(s.revenue, 0) - coalesce(b.revenue, 0) DESC, c.name`;
    return rows.map((r) => ({
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      quantity: n(r.quantity),
      revenue: n(r.revenue),
    }));
  }

  async categorySeries(f: ReportFilter, granularity: 'day' | 'month'): Promise<CategorySeriesRow[]> {
    const format = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}, ${returnsCte(f)},
      moves AS (
        SELECT to_char(s.recognized_at + interval '7 hour', ${format}) AS period,
          p.category_id, (oi.total_price - oi.points_discount) AS revenue
        FROM recognized s
        JOIN order_items oi ON oi.order_id = s.id
        JOIN product_variants v ON v.id = oi.product_variant_id
        JOIN products p ON p.id = v.product_id
        UNION ALL
        SELECT to_char(r.returned_at + interval '7 hour', ${format}), p.category_id, -ri.refund_amount
        FROM returned r
        JOIN return_order_items ri ON ri.return_order_id = r.id
        JOIN product_variants v ON v.id = ri.product_variant_id
        JOIN products p ON p.id = v.product_id
        WHERE r.returned_at >= ${f.from} AND r.returned_at < ${f.to}
      )
      SELECT m.period, c.id AS category_id, c.name AS category_name, sum(m.revenue)::text AS revenue
      FROM moves m JOIN categories c ON c.id = m.category_id
      GROUP BY 1, 2, 3 ORDER BY 1, sum(m.revenue) DESC`;
    return rows.map((r) => ({
      period: r.period as string,
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      revenue: n(r.revenue),
    }));
  }

  async salesHeatmap(f: ReportFilter): Promise<HeatmapRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH ${salesCte(f)}
      SELECT (extract(isodow FROM s.recognized_at + interval '7 hour')::int - 1) AS weekday,
        extract(hour FROM s.recognized_at + interval '7 hour')::int AS hour,
        count(*)::int AS orders, sum(s.revenue)::text AS revenue
      FROM recognized s GROUP BY 1, 2 ORDER BY 1, 2`;
    return rows.map((r) => ({
      weekday: n(r.weekday),
      hour: n(r.hour),
      orders: n(r.orders),
      revenue: n(r.revenue),
    }));
  }

  async hrSummary(storeIds: string[] | undefined, fromDay: string, toDay: string): Promise<HrSummaryRow> {
    const empStore = storeClause(storeIds, Prisma.sql`e.store_id`);
    const [byStatus, byDepartment, byStore, attendance] = await Promise.all([
      this.prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT e.status, count(*)::int AS count FROM employees e WHERE true ${empStore} GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT coalesce(d.name, 'Chưa phân phòng ban') AS name, count(*)::int AS count
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.status <> 'RESIGNED' ${empStore} GROUP BY 1 ORDER BY 2 DESC, 1`,
      this.prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT coalesce(s.name, 'Chưa gán cửa hàng') AS name, count(*)::int AS count
        FROM employees e LEFT JOIN stores s ON s.id = e.store_id
        WHERE e.status <> 'RESIGNED' ${empStore} GROUP BY 1 ORDER BY 2 DESC, 1`,
      this.prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT a.status, count(*)::int AS count
        FROM attendance a JOIN employees e ON e.id = a.employee_id
        WHERE a.date >= ${fromDay}::date AND a.date < ${toDay}::date ${empStore} GROUP BY 1`,
    ]);
    return {
      byStatus: byStatus.map((r) => ({ status: r.status as string, count: n(r.count) })),
      byDepartment: byDepartment.map((r) => ({ name: r.name as string, count: n(r.count) })),
      byStore: byStore.map((r) => ({ name: r.name as string, count: n(r.count) })),
      attendance: attendance.map((r) => ({ status: (r.status as string | null) ?? null, count: n(r.count) })),
    };
  }
}
