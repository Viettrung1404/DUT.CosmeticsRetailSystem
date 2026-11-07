import { BadRequestException } from '@nestjs/common';
import {
  ImportContext,
  ImportLookupKeys,
  ProductPlan,
  VariantPlan,
} from '../domain/repositories/product-import.repository.interface';

export const IMPORT_COLUMNS = [
  'product_sku',
  'product_name',
  'category_slug',
  'brand_slug',
  'base_price',
  'description',
  'tags',
  'option1_name',
  'option2_name',
  'option3_name',
  'variant_sku',
  'option1_value',
  'option2_value',
  'option3_value',
  'price',
  'cost_price',
  'weight',
  'unit',
  'barcode',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

const REQUIRED_COLUMNS: ImportColumn[] = [
  'product_sku',
  'product_name',
  'category_slug',
  'base_price',
  'variant_sku',
  'price',
  'cost_price',
];

export const MAX_IMPORT_ROWS = 1000;
const MAX_MONEY = 9_999_999_999.99;

export interface ImportRow {
  line: number;
  values: Record<ImportColumn, string>;
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
}

export function parseDryRun(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const value = raw.trim().toLowerCase();
  if (['true', '1'].includes(value)) return true;
  if (['false', '0'].includes(value)) return false;
  throw new BadRequestException('Tham số dryRun chỉ nhận true hoặc false');
}

export const slugifyName = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

export const IMPORT_TEMPLATE_ROWS: string[][] = [
  [...IMPORT_COLUMNS],
  [
    'SON-VELVET',
    'Son lì Velvet',
    'son-moi',
    '',
    '250000',
    'Son lì lâu trôi',
    'bestseller;son-li',
    'Màu',
    '',
    '',
    'SON-VELVET-DO',
    'Đỏ cherry',
    '',
    '',
    '250000',
    '120000',
    '10',
    'thỏi',
    '8930000000001',
  ],
];

// Dòng đầu là tiêu đề; cột không biết thì bỏ qua
export function readImportTable(table: string[][]): { rows: ImportRow[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  if (!table.length) {
    return { rows: [], errors: [{ row: 1, column: '', message: 'File không có dữ liệu' }] };
  }
  const header = table[0].map((h) => h.trim().toLowerCase());
  const index = new Map<string, number>();
  header.forEach((name, i) => {
    if (!index.has(name)) index.set(name, i);
  });
  for (const column of REQUIRED_COLUMNS) {
    if (!index.has(column)) {
      errors.push({ row: 1, column, message: `Thiếu cột bắt buộc "${column}" ở dòng tiêu đề` });
    }
  }
  if (errors.length) return { rows: [], errors };
  if (table.length === 1) {
    return { rows: [], errors: [{ row: 2, column: '', message: 'File chỉ có dòng tiêu đề, chưa có dữ liệu' }] };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [{ row: 1, column: '', message: `Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} dòng, hãy tách file` }],
    };
  }

  const rows = table.slice(1).map((cells, i): ImportRow => {
    const values = {} as Record<ImportColumn, string>;
    for (const column of IMPORT_COLUMNS) {
      const at = index.get(column);
      values[column] = at === undefined ? '' : (cells[at] ?? '').trim();
    }
    return { line: i + 2, values };
  });
  return { rows, errors };
}

export function collectLookupKeys(rows: ImportRow[]): ImportLookupKeys {
  const uniq = (pick: (r: ImportRow) => string) => [...new Set(rows.map(pick).filter(Boolean))];
  return {
    categorySlugs: uniq((r) => r.values.category_slug),
    brandSlugs: uniq((r) => r.values.brand_slug),
    productSkus: uniq((r) => r.values.product_sku),
    variantSkus: uniq((r) => r.values.variant_sku),
    barcodes: uniq((r) => r.values.barcode),
    slugs: uniq((r) => slugifyName(r.values.product_name)),
  };
}

const parseMoney = (raw: string): number | null => {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const value = Number(raw);
  return value <= MAX_MONEY ? value : null;
};

export function buildImportPlan(
  rows: ImportRow[],
  ctx: ImportContext,
): { plans: ProductPlan[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const fail = (row: ImportRow, column: ImportColumn, message: string) =>
    errors.push({ row: row.line, column, message });

  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const sku = row.values.product_sku;
    if (!sku) {
      fail(row, 'product_sku', 'Thiếu SKU sản phẩm');
      continue;
    }
    groups.set(sku, [...(groups.get(sku) ?? []), row]);
  }

  const plans: ProductPlan[] = [];
  const usedSlugs = new Set<string>();
  const usedVariantSkus = new Map<string, number>();
  const usedBarcodes = new Map<string, string>();

  for (const [productSku, group] of groups) {
    const first = group[0];
    const v = first.values;
    const existing = ctx.products.get(productSku) ?? null;
    const before = errors.length;

    if (productSku.length > 50) fail(first, 'product_sku', 'SKU sản phẩm tối đa 50 ký tự');
    if (!v.product_name) fail(first, 'product_name', 'Thiếu tên sản phẩm');
    else if (v.product_name.length > 255) fail(first, 'product_name', 'Tên sản phẩm tối đa 255 ký tự');

    const category = v.category_slug ? ctx.categories.get(v.category_slug) : undefined;
    if (!v.category_slug) fail(first, 'category_slug', 'Thiếu mã danh mục (slug)');
    else if (!category) fail(first, 'category_slug', `Không tìm thấy danh mục "${v.category_slug}"`);
    else if (!category.isActive) fail(first, 'category_slug', `Danh mục "${v.category_slug}" đang ngừng hoạt động`);

    let brandId: string | null = null;
    if (v.brand_slug) {
      brandId = ctx.brands.get(v.brand_slug) ?? null;
      if (!brandId) fail(first, 'brand_slug', `Không tìm thấy thương hiệu "${v.brand_slug}"`);
    }

    const basePrice = parseMoney(v.base_price);
    if (basePrice === null) fail(first, 'base_price', 'Giá gốc phải là số không âm, tối đa 2 chữ số thập phân');

    const tags = v.tags
      ? [...new Set(v.tags.split(';').map((t) => t.trim()).filter(Boolean))]
      : null;
    if (tags?.some((t) => t.length > 50)) fail(first, 'tags', 'Mỗi tag tối đa 50 ký tự');

    for (const other of group.slice(1)) {
      for (const column of ['product_name', 'category_slug', 'base_price'] as const) {
        if (other.values[column] && other.values[column] !== v[column]) {
          fail(other, column, `Khác với dòng ${first.line} của cùng sản phẩm ${productSku}`);
        }
      }
    }

    const names = existing
      ? [existing.option1Name, existing.option2Name, existing.option3Name]
      : [v.option1_name || null, v.option2_name || null, v.option3_name || null];
    if (!existing) {
      if ((names[1] && !names[0]) || (names[2] && !names[1])) {
        fail(first, 'option1_name', 'Khai báo thuộc tính theo thứ tự, không bỏ trống thuộc tính đứng trước');
      }
      names.forEach((n, i) => {
        if (n && n.length > 50) fail(first, `option${i + 1}_name` as ImportColumn, 'Tên thuộc tính tối đa 50 ký tự');
      });
    } else {
      names.forEach((n, i) => {
        const given = v[`option${i + 1}_name` as ImportColumn];
        if (given && given !== (n ?? '')) {
          fail(first, `option${i + 1}_name` as ImportColumn, `Sản phẩm đã có thuộc tính ${i + 1} là "${n ?? ''}", không đổi bằng cách nhập file`);
        }
      });
    }

    const combos = new Set<string>();
    const touched = new Set<string>();
    const variants: VariantPlan[] = [];
    for (const row of group) {
      const r = row.values;
      if (!r.variant_sku) {
        fail(row, 'variant_sku', 'Thiếu SKU biến thể');
        continue;
      }
      if (r.variant_sku.length > 50) fail(row, 'variant_sku', 'SKU biến thể tối đa 50 ký tự');
      const dupLine = usedVariantSkus.get(r.variant_sku);
      if (dupLine) fail(row, 'variant_sku', `SKU biến thể "${r.variant_sku}" bị lặp với dòng ${dupLine}`);
      usedVariantSkus.set(r.variant_sku, row.line);

      const owner = ctx.variantOwners.get(r.variant_sku);
      const own = existing?.variants.find((x) => x.sku === r.variant_sku) ?? null;
      if (owner && owner !== productSku) {
        fail(row, 'variant_sku', `SKU biến thể "${r.variant_sku}" đã thuộc sản phẩm khác (${owner})`);
      }

      const values = [r.option1_value || null, r.option2_value || null, r.option3_value || null];
      values.forEach((val, i) => {
        const name = names[i];
        const column = `option${i + 1}_value` as ImportColumn;
        if (!name && val) fail(row, column, `Sản phẩm chưa khai báo thuộc tính ${i + 1}, không được có giá trị`);
        else if (name && !val) fail(row, column, `Biến thể phải có giá trị cho thuộc tính "${name}"`);
        else if (val && val.length > 100) fail(row, column, 'Giá trị thuộc tính tối đa 100 ký tự');
      });
      const combo = values.map((x) => x ?? '').join('|');
      if (combos.has(combo)) fail(row, 'option1_value', 'Trùng tổ hợp thuộc tính với một dòng khác của cùng sản phẩm');
      combos.add(combo);
      if (own) touched.add(own.id);

      const price = parseMoney(r.price);
      if (price === null) fail(row, 'price', 'Giá bán phải là số không âm, tối đa 2 chữ số thập phân');
      const costPrice = parseMoney(r.cost_price);
      if (costPrice === null) fail(row, 'cost_price', 'Giá vốn phải là số không âm, tối đa 2 chữ số thập phân');

      let weight: number | null = null;
      if (r.weight) {
        weight = /^\d+(\.\d{1,2})?$/.test(r.weight) ? Number(r.weight) : null;
        if (weight === null || weight > 999999) fail(row, 'weight', 'Khối lượng phải là số không âm');
      }
      if (r.unit.length > 20) fail(row, 'unit', 'Đơn vị tối đa 20 ký tự');

      if (r.barcode) {
        if (r.barcode.length > 100) fail(row, 'barcode', 'Mã vạch tối đa 100 ký tự');
        const barcodeOwner = ctx.barcodeOwners.get(r.barcode);
        if (barcodeOwner && barcodeOwner !== r.variant_sku) {
          fail(row, 'barcode', `Mã vạch "${r.barcode}" đã được biến thể ${barcodeOwner} sử dụng`);
        }
        const inFile = usedBarcodes.get(r.barcode);
        if (inFile && inFile !== r.variant_sku) fail(row, 'barcode', `Mã vạch "${r.barcode}" bị lặp trong file`);
        usedBarcodes.set(r.barcode, r.variant_sku);
      }

      variants.push({
        sku: r.variant_sku,
        existingId: own?.id ?? null,
        option1Value: values[0],
        option2Value: values[1],
        option3Value: values[2],
        price: price ?? 0,
        costPrice: costPrice ?? 0,
        weight,
        unit: r.unit || null,
        barcode: r.barcode || null,
      });
    }

    if (existing) {
      for (const other of existing.variants) {
        if (touched.has(other.id)) continue;
        const key = [other.option1Value ?? '', other.option2Value ?? '', other.option3Value ?? ''].join('|');
        if (combos.has(key)) {
          const row = group.find((g) =>
            [g.values.option1_value, g.values.option2_value, g.values.option3_value].join('|') === key,
          );
          if (row) fail(row, 'option1_value', `Trùng tổ hợp thuộc tính với biến thể ${other.sku} đã có`);
        }
      }
    }

    let slug = slugifyName(v.product_name);
    if (!existing) {
      if (!slug) fail(first, 'product_name', 'Tên sản phẩm phải có chữ hoặc số để tạo đường dẫn');
      else {
        if (ctx.takenSlugs.has(slug) || usedSlugs.has(slug)) slug = `${slug}-${slugifyName(productSku)}`.slice(0, 255);
        if (ctx.takenSlugs.has(slug) || usedSlugs.has(slug)) fail(first, 'product_name', 'Đường dẫn (slug) sản phẩm bị trùng');
        usedSlugs.add(slug);
      }
    }

    if (errors.length === before && category && basePrice !== null) {
      plans.push({
        sku: productSku,
        existingId: existing?.id ?? null,
        name: v.product_name,
        slug,
        categoryId: category.id,
        brandId,
        basePrice,
        description: v.description || null,
        tags,
        option1Name: names[0],
        option2Name: names[1],
        option3Name: names[2],
        variants,
      });
    }
  }

  errors.sort((a, b) => a.row - b.row);
  return { plans, errors };
}

export function summarizePlans(plans: ProductPlan[]) {
  const summary = {
    products: { create: 0, update: 0 },
    variants: { create: 0, update: 0 },
  };
  for (const plan of plans) {
    summary.products[plan.existingId ? 'update' : 'create'] += 1;
    for (const variant of plan.variants) {
      summary.variants[variant.existingId ? 'update' : 'create'] += 1;
    }
  }
  return summary;
}
