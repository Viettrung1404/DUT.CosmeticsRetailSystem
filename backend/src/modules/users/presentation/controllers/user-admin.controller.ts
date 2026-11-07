import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { GetAdminUsersUseCase } from '../../application/use-cases/get-admin-users.use-case';
import { GetAdminUserDetailUseCase } from '../../application/use-cases/get-admin-user-detail.use-case';
import { CreateAdminUserUseCase } from '../../application/use-cases/create-admin-user.use-case';
import { UpdateAdminUserUseCase } from '../../application/use-cases/update-admin-user.use-case';
import { SetUserPermissionsUseCase } from '../../application/use-cases/set-user-permissions.use-case';
import { SetUserStoresUseCase } from '../../application/use-cases/set-user-stores.use-case';
import {
  GetPermissionsUseCase,
  GetRolesUseCase,
} from '../../application/use-cases/get-roles-and-permissions.use-case';
import {
  CreateAdminUserRequestDto,
  GetAdminUsersQueryDto,
  SetUserPermissionsRequestDto,
  SetUserStoresRequestDto,
  UpdateAdminUserRequestDto,
} from '../dtos/admin-user-request.dto';
import {
  AdminPermissionResponseDto,
  AdminRoleResponseDto,
  AdminUserResponseDto,
  CreateAdminUserResponseDto,
} from '../dtos/admin-user-response.dto';

@ApiTags('Admin - Users (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@RequirePermissions('SYSTEM_USER_MANAGE')
@Controller('admin')
export class UserAdminController {
  constructor(
    private readonly getUsers: GetAdminUsersUseCase,
    private readonly getUserDetail: GetAdminUserDetailUseCase,
    private readonly createUser: CreateAdminUserUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly setPermissions: SetUserPermissionsUseCase,
    private readonly setStores: SetUserStoresUseCase,
    private readonly getRoles: GetRolesUseCase,
    private readonly getPermissions: GetPermissionsUseCase,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Admin - Danh sách người dùng (lọc vai trò, trạng thái, cửa hàng; tìm tên/email/SĐT)' })
  async list(@Query() query: GetAdminUsersQueryDto) {
    const { items, total } = await this.getUsers.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      search: query.search,
      roleId: query.roleId,
      status: query.status,
      storeId: query.storeId,
    });
    return new PageDto(
      items.map((u) => AdminUserResponseDto.fromDomain(u)),
      new PageMetaDto({ pageOptionsDto: query, itemCount: total }),
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Admin - Chi tiết người dùng' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return AdminUserResponseDto.fromDomain(await this.getUserDetail.execute(id));
  }

  @Post('users')
  @ApiOperation({ summary: 'Admin - Tạo tài khoản nhân viên, gửi email đặt mật khẩu' })
  async create(@Body() dto: CreateAdminUserRequestDto): Promise<CreateAdminUserResponseDto> {
    const { user, activationEmailSent } = await this.createUser.execute(dto);
    return { user: AdminUserResponseDto.fromDomain(user), activationEmailSent };
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Admin - Sửa họ tên, SĐT, vai trò, trạng thái (khóa thì thu hồi phiên đăng nhập)' })
  async update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserRequestDto,
  ) {
    const user = await this.updateUser.execute(actor, id, dto);
    return AdminUserResponseDto.fromDomain(user);
  }

  @Put('users/:id/permissions')
  @ApiOperation({ summary: 'Admin - Đặt quyền cấp thêm / thu hồi theo mặt nạ bit' })
  async permissions(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserPermissionsRequestDto,
  ) {
    return AdminUserResponseDto.fromDomain(await this.setPermissions.execute(actor.userId, id, dto));
  }

  @Put('users/:id/stores')
  @ApiOperation({ summary: 'Admin - Gán danh sách cửa hàng phụ trách' })
  async stores(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStoresRequestDto,
  ) {
    return AdminUserResponseDto.fromDomain(
      await this.setStores.execute(actor.userId, id, dto.storeIds),
    );
  }

  @Get('roles')
  @ApiOperation({ summary: 'Admin - Danh sách vai trò' })
  async roles() {
    return (await this.getRoles.execute()).map((r) => AdminRoleResponseDto.fromDomain(r));
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Admin - Danh sách quyền (bit và mã)' })
  async permissionList() {
    return (await this.getPermissions.execute()).map((p) => AdminPermissionResponseDto.fromDomain(p));
  }
}
