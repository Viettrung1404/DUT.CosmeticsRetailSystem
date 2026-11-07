import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  IProductImportRepository,
  PRODUCT_IMPORT_REPOSITORY,
} from '../../domain/repositories/product-import.repository.interface';
import { buildCsv, parseCsv } from '../utils/csv.util';
import { buildXlsx, isXlsx, parseXlsx } from '../utils/xlsx.util';
import {
  IMPORT_TEMPLATE_ROWS,
  ImportError,
  buildImportPlan,
  collectLookupKeys,
  readImportTable,
  summarizePlans,
} from '../product-import.rules';

export const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;
const MAX_REPORTED_ERRORS = 200;

export interface ImportFileInput {
  buffer: Buffer;
  size: number;
}

export interface ImportResult {
  dryRun: boolean;
  valid: boolean;
  imported: boolean;
  summary: ReturnType<typeof summarizePlans>;
  errorCount: number;
  errors: ImportError[];
}

@Injectable()
export class ImportProductsUseCase {
  constructor(
    @Inject(PRODUCT_IMPORT_REPOSITORY) private readonly repository: IProductImportRepository,
  ) {}

  template(format: 'xlsx' | 'csv' = 'xlsx'): Promise<Buffer> | string {
    return format === 'csv' ? buildCsv(IMPORT_TEMPLATE_ROWS) : buildXlsx(IMPORT_TEMPLATE_ROWS);
  }

  async execute(file: ImportFileInput | undefined, dryRun: boolean): Promise<ImportResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Chưa chọn file Excel hoặc CSV (gửi trong trường "file")');
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new BadRequestException('File nhập tối đa 2 MB');
    }

    const table = await this.readTable(file.buffer);
    const empty = summarizePlans([]);
    const { rows, errors: tableErrors } = readImportTable(table);
    if (tableErrors.length) return this.result(dryRun, empty, tableErrors, false);

    const context = await this.repository.loadContext(collectLookupKeys(rows));
    const { plans, errors } = buildImportPlan(rows, context);
    const summary = summarizePlans(plans);
    if (errors.length) return this.result(dryRun, summary, errors, false);

    if (!dryRun) await this.repository.apply(plans);
    return this.result(dryRun, summary, [], !dryRun);
  }

  private async readTable(buffer: Buffer): Promise<string[][]> {
    if (isXlsx(buffer)) {
      try {
        return await parseXlsx(buffer);
      } catch {
        throw new BadRequestException('File Excel bị lỗi, không đọc được');
      }
    }
    try {
      return parseCsv(buffer.toString('utf8'));
    } catch {
      throw new BadRequestException('File CSV sai định dạng: có ô mở nháy kép nhưng không đóng');
    }
  }

  private result(
    dryRun: boolean,
    summary: ImportResult['summary'],
    errors: ImportError[],
    imported: boolean,
  ): ImportResult {
    return {
      dryRun,
      valid: errors.length === 0,
      imported,
      summary,
      errorCount: errors.length,
      errors: errors.slice(0, MAX_REPORTED_ERRORS),
    };
  }
}
