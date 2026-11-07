import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RawResponse } from '@core/decorators/raw-response.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import {
  ImportFileInput,
  ImportProductsUseCase,
  MAX_IMPORT_FILE_SIZE,
} from '../../application/use-cases/import-products.use-case';
import { parseDryRun } from '../../application/product-import.rules';
import { CsvUploadErrorInterceptor } from '../interceptors/csv-upload-error.interceptor';

// Đăng ký trước ProductAdminController để "import-template" không bị hiểu là :id
@ApiTags('Admin - Products (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/products')
export class ProductImportAdminController {
  constructor(private readonly importProducts: ImportProductsUseCase) {}

  @Get('import-template')
  @RawResponse()
  @RequirePermissions('PRODUCT_IMPORT_EXPORT')
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv')
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'], description: 'Mặc định xlsx' })
  @ApiOperation({
    summary:
      'Admin - Tải file mẫu nhập sản phẩm (Excel hoặc CSV). Mỗi dòng là một biến thể; các dòng cùng product_sku thuộc một sản phẩm',
  })
  async template(@Res() res: Response, @Query('format') format: string = 'xlsx') {
    if (format !== 'xlsx' && format !== 'csv') {
      throw new BadRequestException('format chỉ nhận xlsx hoặc csv');
    }
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mau-nhap-san-pham.${format}"`,
    });
    res.send(await this.importProducts.template(format));
  }

  @Post('import')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermissions('PRODUCT_IMPORT_EXPORT')
  @UseInterceptors(
    CsvUploadErrorInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File .xlsx hoặc CSV UTF-8, tối đa 2 MB, tối đa 1000 dòng' },
      },
    },
  })
  @ApiQuery({ name: 'dryRun', required: false, description: 'true: chỉ kiểm tra, không ghi dữ liệu' })
  @ApiOperation({
    summary:
      'Admin - Nhập sản phẩm hàng loạt từ Excel hoặc CSV: SKU sản phẩm đã có thì cập nhật, chưa có thì tạo cùng biến thể. Có dòng lỗi thì không ghi gì',
  })
  async import(@UploadedFile() file: ImportFileInput | undefined, @Query('dryRun') dryRun?: string) {
    const data = await this.importProducts.execute(file, parseDryRun(dryRun));
    const message = !data.valid
      ? `File có ${data.errorCount} lỗi, chưa ghi dữ liệu nào`
      : data.dryRun
        ? 'File hợp lệ, chưa ghi dữ liệu (chế độ kiểm tra)'
        : `Đã nhập ${data.summary.products.create + data.summary.products.update} sản phẩm`;
    return { message, data };
  }
}
