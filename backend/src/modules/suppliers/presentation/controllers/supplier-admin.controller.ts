import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { ManageSuppliersUseCase } from '../../application/use-cases/manage-suppliers.use-case';
import { SupplierPaymentsUseCase } from '../../application/use-cases/supplier-payments.use-case';
import {
  CreateSupplierDto,
  CreateSupplierPaymentDto,
  RateSupplierDto,
  SupplierPaymentQueryDto,
  SupplierQueryDto,
  UpdateSupplierDto,
} from '../dtos/supplier-request.dto';

@ApiTags('Admin - Suppliers (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class SupplierAdminController {
  constructor(
    private readonly suppliers: ManageSuppliersUseCase,
    private readonly payments: SupplierPaymentsUseCase,
  ) {}

  // NV kho không có bit 30 nhưng phải chọn NCC khi lập PO (ghi nhớ UC12)
  @Get('suppliers')
  @RequireAnyPermission('SUPPLIER_VIEW', 'PO_CREATE')
  @ApiOperation({ summary: 'Admin - Danh bạ nhà cung cấp' })
  async list(@Query() query: SupplierQueryDto) {
    const { items, total } = await this.suppliers.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      isActive: query.isActive,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('suppliers/:id')
  @RequireAnyPermission('SUPPLIER_VIEW', 'PO_CREATE')
  @ApiOperation({ summary: 'Admin - Chi tiết nhà cung cấp' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.detail(id);
  }

  @Post('suppliers')
  @RequirePermissions('SUPPLIER_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm nhà cung cấp' })
  async create(@Body() dto: CreateSupplierDto) {
    const data = await this.suppliers.create(dto);
    return { message: `Đã thêm nhà cung cấp ${data.name}`, data };
  }

  @Put('suppliers/:id')
  @RequirePermissions('SUPPLIER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa thông tin / ngừng hợp tác nhà cung cấp' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Put('suppliers/:id/rating')
  @RequireAnyPermission('SUPPLIER_MANAGE', 'PO_APPROVE')
  @ApiOperation({ summary: 'Admin / Kế toán - Chấm điểm nhà cung cấp (1–5)' })
  rate(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateSupplierDto,
  ) {
    return this.suppliers.rate(userId, id, dto.rating);
  }

  @Get('suppliers/:id/balance')
  @RequireAnyPermission('SUPPLIER_VIEW', 'PO_APPROVE')
  @ApiOperation({ summary: 'Admin / Kế toán - Công nợ nhà cung cấp (hóa đơn đã nhận − đã trả)' })
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.balance(id);
  }

  @Get('supplier-payments')
  @RequireAnyPermission('SUPPLIER_VIEW', 'PO_APPROVE')
  @ApiOperation({ summary: 'Admin / Kế toán - Lịch sử trả tiền nhà cung cấp' })
  async listPayments(@Query() query: SupplierPaymentQueryDto) {
    const { items, total } = await this.payments.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      supplierId: query.supplierId,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Post('supplier-payments')
  @RequirePermissions('PO_APPROVE')
  @ApiOperation({ summary: 'Kế toán - Ghi khoản đã trả nhà cung cấp (không vượt công nợ)' })
  async pay(@CurrentUser('userId') userId: string, @Body() dto: CreateSupplierPaymentDto) {
    const data = await this.payments.pay(userId, dto);
    return { message: 'Đã ghi nhận thanh toán cho nhà cung cấp', data };
  }
}
