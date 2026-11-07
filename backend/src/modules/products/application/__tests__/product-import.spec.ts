import { Workbook } from 'exceljs';
import { isXlsx, parseXlsx } from '../utils/xlsx.util';
import { BadRequestException } from '@nestjs/common';
import {
  ImportContext,
  IProductImportRepository,
} from '../../domain/repositories/product-import.repository.interface';
import { ImportProductsUseCase } from '../use-cases/import-products.use-case';
import { buildImportPlan, parseDryRun, readImportTable } from '../product-import.rules';
import { buildCsv, parseCsv } from '../utils/csv.util';

const HEADER =
  'product_sku,product_name,category_slug,brand_slug,base_price,description,tags,option1_name,option2_name,option3_name,variant_sku,option1_value,option2_value,option3_value,price,cost_price,weight,unit,barcode';

const csv = (...lines: string[]) => [HEADER, ...lines].join('\n');

const context = (over: Partial<ImportContext> = {}): ImportContext => ({
  categories: new Map([['son-moi', { id: 'cat1', isActive: true }]]),
  brands: new Map([['laneige', 'brand1']]),
  products: new Map(),
  variantOwners: new Map(),
  barcodeOwners: new Map(),
  takenSlugs: new Set(),
  ...over,
});

const plan = (text: string, ctx = context()) => {
  const { rows, errors } = readImportTable(parseCsv(text));
  expect(errors).toEqual([]);
  return buildImportPlan(rows, ctx);
};

describe('parseCsv', () => {
  it('bỏ BOM, đọc ô có dấu phẩy, nháy kép và xuống dòng trong ô', () => {
    const table = parseCsv('﻿a,b,c\r\n"x,y","dòng ""1""\nhai",z\r\n\r\n');
    expect(table).toEqual([
      ['a', 'b', 'c'],
      ['x,y', 'dòng "1"\nhai', 'z'],
    ]);
  });

  it('giữ ô trống và dòng cuối không có xuống dòng', () => {
    expect(parseCsv('a,,c\n1,2,')).toEqual([
      ['a', '', 'c'],
      ['1', '2', ''],
    ]);
  });

  it('báo lỗi khi nháy kép không đóng', () => {
    expect(() => parseCsv('a,"b\nc')).toThrow('UNTERMINATED_QUOTE');
  });

  it('buildCsv sinh lại đúng nội dung có BOM', () => {
    const out = buildCsv([['a', 'b,c'], ['"q"', 'd']]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(parseCsv(out)).toEqual([['a', 'b,c'], ['"q"', 'd']]);
  });
});

describe('readImportTable', () => {
  it('báo thiếu cột bắt buộc ở dòng tiêu đề', () => {
    const { errors } = readImportTable(parseCsv('product_sku,product_name\nA,B'));
    expect(errors.map((e) => e.column)).toEqual(
      expect.arrayContaining(['category_slug', 'base_price', 'variant_sku', 'price', 'cost_price']),
    );
    expect(errors[0].row).toBe(1);
  });

  it('file chỉ có tiêu đề bị từ chối', () => {
    expect(readImportTable(parseCsv(HEADER)).errors).toHaveLength(1);
  });
});

describe('buildImportPlan', () => {
  it('gom các dòng cùng SKU thành một sản phẩm nhiều biến thể, tạo slug và tag', () => {
    const { plans, errors } = plan(
      csv(
        'SON-1,Son lì Velvet,son-moi,laneige,250000,Mô tả,hot;moi;hot,Màu,,,SON-1-DO,Đỏ,,,250000,120000,10,thỏi,893001',
        'SON-1,,,,,,,,,,SON-1-HONG,Hồng,,,260000,125000,,,',
      ),
    );
    expect(errors).toEqual([]);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      existingId: null,
      slug: 'son-li-velvet',
      brandId: 'brand1',
      tags: ['hot', 'moi'],
      option1Name: 'Màu',
    });
    expect(plans[0].variants.map((v) => v.sku)).toEqual(['SON-1-DO', 'SON-1-HONG']);
  });

  it('báo lỗi từng dòng, từng cột bằng tiếng Việt', () => {
    const { plans, errors } = plan(
      csv(
        'A,Sản phẩm A,khong-co,,abc,,,Màu,,,A-1,,,,100,50,,,',
        'A,Sản phẩm A,khong-co,,abc,,,Màu,,,A-2,Xanh,,,x,50,,,',
      ),
    );
    expect(plans).toEqual([]);
    expect(errors).toEqual(
      expect.arrayContaining([
        { row: 2, column: 'category_slug', message: 'Không tìm thấy danh mục "khong-co"' },
        { row: 2, column: 'base_price', message: expect.stringContaining('Giá gốc') },
        { row: 2, column: 'option1_value', message: 'Biến thể phải có giá trị cho thuộc tính "Màu"' },
        { row: 3, column: 'price', message: expect.stringContaining('Giá bán') },
      ]),
    );
  });

  it('SKU biến thể lặp trong file hoặc thuộc sản phẩm khác bị chặn', () => {
    const ctx = context({ variantOwners: new Map([['B-1', 'OTHER']]) });
    const { errors } = plan(
      csv('A,Sản phẩm A,son-moi,,1000,,,,,,A-1,,,,1000,500,,,', 'B,Sản phẩm B,son-moi,,1000,,,,,,A-1,,,,1000,500,,,', 'B,Sản phẩm B,son-moi,,1000,,,,,,B-1,,,,1000,500,,,'),
      ctx,
    );
    expect(errors.find((e) => e.column === 'variant_sku' && e.row === 3)?.message).toContain('bị lặp với dòng 2');
    expect(errors.find((e) => e.row === 4)?.message).toContain('đã thuộc sản phẩm khác (OTHER)');
  });

  it('SKU sản phẩm đã có thì cập nhật, biến thể mới thì thêm, cấm đổi tên thuộc tính', () => {
    const ctx = context({
      products: new Map([
        [
          'SON-1',
          {
            id: 'p1',
            option1Name: 'Màu',
            option2Name: null,
            option3Name: null,
            variants: [{ id: 'v1', sku: 'SON-1-DO', option1Value: 'Đỏ', option2Value: null, option3Value: null }],
          },
        ],
      ]),
      variantOwners: new Map([['SON-1-DO', 'SON-1']]),
    });
    const ok = plan(
      csv(
        'SON-1,Son lì mới,son-moi,,300000,,,,,,SON-1-DO,Đỏ,,,300000,150000,,,',
        'SON-1,,,,,,,,,,SON-1-CAM,Cam,,,300000,150000,,,',
      ),
      ctx,
    );
    expect(ok.errors).toEqual([]);
    expect(ok.plans[0].existingId).toBe('p1');
    expect(ok.plans[0].variants.map((v) => v.existingId)).toEqual(['v1', null]);

    const bad = plan(csv('SON-1,Son,son-moi,,300000,,,Size,,,SON-1-CAM,Cam,,,300000,150000,,,'), ctx);
    expect(bad.errors[0]).toMatchObject({ row: 2, column: 'option1_name' });

    const clash = plan(csv('SON-1,Son,son-moi,,300000,,,,,,SON-1-CAM,Đỏ,,,300000,150000,,,'), ctx);
    expect(clash.errors[0].message).toContain('SON-1-DO');
  });

  it('slug trùng thì thêm SKU phía sau', () => {
    const { plans } = plan(
      csv('NEW-1,Son lì,son-moi,,1000,,,,,,NEW-1-A,,,,1000,500,,,'),
      context({ takenSlugs: new Set(['son-li']) }),
    );
    expect(plans[0].slug).toBe('son-li-new-1');
  });
});

describe('ImportProductsUseCase', () => {
  const file = (text: string) => ({ buffer: Buffer.from(text, 'utf8'), size: Buffer.byteLength(text) });
  const repo = (ctx = context()): jest.Mocked<IProductImportRepository> => ({
    loadContext: jest.fn().mockResolvedValue(ctx),
    apply: jest.fn().mockResolvedValue(undefined),
  });
  const good = csv('A,Sản phẩm A,son-moi,,1000,,,,,,A-1,,,,1000,500,,,');

  it('dryRun chỉ kiểm tra, không ghi', async () => {
    const r = repo();
    const result = await new ImportProductsUseCase(r).execute(file(good), true);
    expect(result).toMatchObject({ valid: true, imported: false, dryRun: true });
    expect(r.apply).not.toHaveBeenCalled();
  });

  it('hợp lệ thì ghi một lần', async () => {
    const r = repo();
    const result = await new ImportProductsUseCase(r).execute(file(good), false);
    expect(result).toMatchObject({ imported: true, summary: { products: { create: 1, update: 0 } } });
    expect(r.apply).toHaveBeenCalledTimes(1);
  });

  it('có dòng lỗi thì không ghi gì', async () => {
    const r = repo();
    const result = await new ImportProductsUseCase(r).execute(
      file(csv('A,Sản phẩm A,son-moi,,1000,,,,,,A-1,,,,1000,500,,,', 'B,Sản phẩm B,sai,,1000,,,,,,B-1,,,,1000,500,,,')),
      false,
    );
    expect(result).toMatchObject({ valid: false, imported: false, errorCount: 1 });
    expect(r.apply).not.toHaveBeenCalled();
  });

  it('từ chối file thiếu, quá lớn hoặc sai định dạng', async () => {
    const useCase = new ImportProductsUseCase(repo());
    await expect(useCase.execute(undefined, false)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute({ buffer: Buffer.from('a'), size: 3 * 1024 * 1024 }, false)).rejects.toThrow('2 MB');
    await expect(useCase.execute(file('a,"b'), false)).rejects.toThrow('nháy kép');
  });

  it('file mẫu đọc lại được và hợp lệ về cấu trúc', () => {
    const { rows, errors } = readImportTable(parseCsv(new ImportProductsUseCase(repo()).template('csv') as string));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });
});

describe('parseDryRun', () => {
  it('nhận true/1 và false/0 không phân biệt hoa thường, bỏ trống là false', () => {
    expect(['true', 'TRUE', '1', ' True '].map(parseDryRun)).toEqual([true, true, true, true]);
    expect(['false', '0', '', undefined].map(parseDryRun)).toEqual([false, false, false, false]);
  });

  it('giá trị lạ bị từ chối để không ghi dữ liệu thật nhầm', () => {
    expect(() => parseDryRun('yes')).toThrow(BadRequestException);
  });
});

describe('ImportProductsUseCase với file Excel', () => {
  it('file mẫu Excel đọc lại đúng từng ô như file mẫu CSV', async () => {
    const useCase = new ImportProductsUseCase({} as never);
    const file = (await useCase.template('xlsx')) as Buffer;
    expect(isXlsx(file)).toBe(true);
    expect(await parseXlsx(file)).toEqual(parseCsv(useCase.template('csv') as string));
  });

  it('ô số trong Excel đọc thành chuỗi số', async () => {
    const workbook = new Workbook();
    workbook.addWorksheet('a').addRow(['sku', 150000, null, 'x']);
    const file = Buffer.from(await workbook.xlsx.writeBuffer());
    expect(await parseXlsx(file)).toEqual([['sku', '150000', '', 'x']]);
  });

  it('file Excel hỏng trả lỗi tiếng Việt', async () => {
    const broken = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('rac rac rac')]);
    await expect(
      new ImportProductsUseCase({} as never).execute({ buffer: broken, size: broken.length }, true),
    ).rejects.toThrow('File Excel bị lỗi');
  });
});
