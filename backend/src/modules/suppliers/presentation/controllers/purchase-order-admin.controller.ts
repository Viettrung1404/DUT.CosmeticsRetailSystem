import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { PurchaseOrderWorkflowUseCase } from '../../application/use-cases/purchase-order-workflow.use-case';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  UpdatePurchaseOrderDto,
} from '../dtos/supplier-request.dto';

@ApiTags('Admin - Suppliers (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@ApiConflictResponse({ description: 'Đơn không ở trạng thái cho phép bước này' })
@Controller('admin/purchase-orders')
export class PurchaseOrderAdminController {
  constructor(private readonly orders: PurchaseOrderWorkflowUseCase) {}

  @Get()
  @RequireAnyPermission('PO_CREATE', 'PO_APPROVE', 'PO_RECEIVE', 'SUPPLIER_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách đơn đặt hàng NCC (lọc NCC, trạng thái; theo phạm vi kho)' })
  async list(@CurrentUser('userId') userId: string, @Query() query: PurchaseOrderQueryDto) {
    const { items, total } = await this.orders.list(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      supplierId: query.supplierId,
      status: query.status,
      search: query.search,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequireAnyPermission('PO_CREATE', 'PO_APPROVE', 'PO_RECEIVE', 'SUPPLIER_VIEW')
  @ApiOperation({ summary: 'Admin - Chi tiết đơn đặt hàng kèm các phiếu nhập (GRN)' })
  detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.detail(userId, id);
  }

  @Post()
  @RequirePermissions('PO_CREATE')
  @ApiOperation({ summary: 'NV kho - Lập đơn đặt hàng NCC (nháp), chỉ giao về kho tổng' })
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreatePurchaseOrderDto) {
    const data = await this.orders.create(userId, dto);
    return { message: `Đã lưu nháp đơn ${data.poNumber}`, data };
  }

  @Put(':id')
  @RequirePermissions('PO_CREATE')
  @ApiOperation({ summary: 'NV kho - Sửa đơn nháp' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.orders.updateDraft(userId, id, dto);
  }

  @Put(':id/approve-send')
  @RequirePermissions('PO_APPROVE')
  @ApiOperation({ summary: 'Kế toán / Admin - Duyệt và gửi đơn cho NCC (người duyệt khác người lập)' })
  async approveSend(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.orders.approveAndSend(userId, id);
    return { message: `Đã duyệt đơn ${data.poNumber}, gửi cho nhà cung cấp`, data };
  }

  @Put(':id/confirm')
  @RequirePermissions('PO_CREATE')
  @ApiOperation({ summary: 'NV kho - Ghi nhận NCC đã xác nhận đơn' })
  async confirm(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.orders.confirm(userId, id);
    return { message: `Nhà cung cấp đã xác nhận đơn ${data.poNumber}`, data };
  }

  @Put(':id/cancel')
  @RequireAnyPermission('PO_CREATE', 'PO_APPROVE')
  @ApiOperation({ summary: 'Hủy đơn chưa nhận hàng' })
  async cancel(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.orders.cancel(userId, id);
    return { message: `Đã hủy đơn ${data.poNumber}`, data };
  }
}
