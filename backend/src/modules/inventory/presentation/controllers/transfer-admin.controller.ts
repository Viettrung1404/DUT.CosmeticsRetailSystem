import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { CreateTransferUseCase } from '../../application/use-cases/create-transfer.use-case';
import { UpdateTransferDraftUseCase } from '../../application/use-cases/update-transfer-draft.use-case';
import { ChangeTransferStatusUseCase } from '../../application/use-cases/change-transfer-status.use-case';
import { ApproveTransferUseCase } from '../../application/use-cases/approve-transfer.use-case';
import { ShipTransferUseCase } from '../../application/use-cases/ship-transfer.use-case';
import { ReceiveTransferUseCase } from '../../application/use-cases/receive-transfer.use-case';
import { GetTransfersUseCase } from '../../application/use-cases/get-transfers.use-case';
import {
  ApproveTransferDto,
  CreateTransferDto,
  ReceiveTransferDto,
  TransferQueryDto,
  UpdateTransferDraftDto,
} from '../dtos/inventory-workflow-request.dto';

// DRAFT → REQUESTED (QL) → APPROVED (kho tổng) → SHIPPED (kho tổng xuất FEFO) → RECEIVED (QL nhận)
@ApiTags('Admin - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@ApiConflictResponse({ description: 'Phiếu không ở trạng thái cho phép bước này' })
@Controller('admin/transfers')
export class TransferAdminController {
  constructor(
    private readonly createTransfer: CreateTransferUseCase,
    private readonly updateDraft: UpdateTransferDraftUseCase,
    private readonly changeStatus: ChangeTransferStatusUseCase,
    private readonly approveTransfer: ApproveTransferUseCase,
    private readonly shipTransfer: ShipTransferUseCase,
    private readonly receiveTransfer: ReceiveTransferUseCase,
    private readonly getTransfers: GetTransfersUseCase,
  ) {}

  @Get()
  @RequireAnyPermission('INVENTORY_TRANSFER_MANAGE', 'INVENTORY_TRANSFER')
  @ApiOperation({ summary: 'Admin - Danh sách phiếu chuyển kho (địa điểm của bạn là nơi xuất hoặc nhận)' })
  async list(@CurrentUser('userId') userId: string, @Query() query: TransferQueryDto) {
    const { items, total } = await this.getTransfers.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      status: query.status,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequireAnyPermission('INVENTORY_TRANSFER_MANAGE', 'INVENTORY_TRANSFER')
  @ApiOperation({ summary: 'Admin - Chi tiết phiếu chuyển kho' })
  detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getTransfers.detail(userId, id);
  }

  @Post()
  @RequirePermissions('INVENTORY_TRANSFER_MANAGE')
  @ApiOperation({ summary: 'Admin - QL lập phiếu xin hàng từ kho tổng (lưu nháp)' })
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreateTransferDto) {
    const data = await this.createTransfer.execute(userId, dto);
    return { message: `Đã lưu nháp phiếu ${data.transferCode}`, data };
  }

  @Put(':id')
  @RequirePermissions('INVENTORY_TRANSFER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa phiếu nháp (ghi chú, danh sách hàng)' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransferDraftDto,
  ) {
    return this.updateDraft.execute(userId, id, dto);
  }

  @Put(':id/request')
  @RequirePermissions('INVENTORY_TRANSFER_MANAGE')
  @ApiOperation({ summary: 'Admin - Gửi yêu cầu cho kho tổng' })
  async request(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.changeStatus.request(userId, id);
    return { message: `Đã gửi yêu cầu ${data.transferCode} cho kho tổng`, data };
  }

  @Put(':id/approve')
  @RequirePermissions('INVENTORY_TRANSFER_MANAGE')
  @ApiOperation({ summary: 'Admin - Kho tổng duyệt số lượng đáp ứng' })
  async approve(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTransferDto,
  ) {
    const data = await this.approveTransfer.execute(userId, id, dto.items);
    return { message: `Đã duyệt phiếu ${data.transferCode}`, data };
  }

  @Put(':id/ship')
  @RequirePermissions('INVENTORY_TRANSFER')
  @ApiOperation({ summary: 'Admin - Kho tổng xuất hàng (tự chọn lô FEFO, bỏ lô khóa / hết hạn)' })
  async ship(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.shipTransfer.execute(userId, id);
    return { message: `Đã xuất kho phiếu ${data.transferCode}`, data };
  }

  @Put(':id/receive')
  @RequirePermissions('INVENTORY_TRANSFER')
  @ApiOperation({ summary: 'Admin - Cửa hàng nhận hàng, ghi hao hụt nếu thiếu' })
  async receive(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveTransferDto,
  ) {
    const data = await this.receiveTransfer.execute(userId, id, dto.items);
    return { message: `Đã nhận hàng phiếu ${data.transferCode}`, data };
  }

  @Put(':id/cancel')
  @RequirePermissions('INVENTORY_TRANSFER_MANAGE')
  @ApiOperation({ summary: 'Admin - Hủy phiếu chưa xuất kho' })
  async cancel(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.changeStatus.cancel(userId, id);
    return { message: `Đã hủy phiếu ${data.transferCode}`, data };
  }
}
