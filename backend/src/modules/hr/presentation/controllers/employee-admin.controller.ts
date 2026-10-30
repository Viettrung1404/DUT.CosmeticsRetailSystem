import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { GetEmployeesUseCase } from '../../application/use-cases/get-employees.use-case';
import { CreateEmployeeUseCase } from '../../application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/use-cases/update-employee.use-case';
import {
  CreateEmployeeRequestDto,
  GetEmployeesQueryDto,
  UpdateEmployeeRequestDto,
} from '../dtos/employee-request.dto';
import { CreateEmployeeResponseDto, EmployeeResponseDto } from '../dtos/employee-response.dto';

@ApiTags('Admin - HR (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/employees')
export class EmployeeAdminController {
  constructor(
    private readonly getEmployees: GetEmployeesUseCase,
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
  ) {}

  @Get()
  @RequirePermissions('EMPLOYEE_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách nhân viên (lọc cửa hàng, phòng ban, trạng thái; theo phạm vi dữ liệu)' })
  async list(@CurrentUser() user: JwtPayload, @Query() query: GetEmployeesQueryDto) {
    const { items, total } = await this.getEmployees.execute(user.userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      search: query.search,
      storeId: query.storeId,
      departmentId: query.departmentId,
      status: query.status,
    });
    return new PageDto(
      items.map((e) => EmployeeResponseDto.fromDomain(e)),
      new PageMetaDto({ pageOptionsDto: query, itemCount: total }),
    );
  }

  @Post()
  @RequirePermissions('EMPLOYEE_MANAGE', 'SYSTEM_USER_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm nhân viên: tạo tài khoản + hồ sơ + gán cửa hàng trong một giao dịch' })
  async create(@Body() dto: CreateEmployeeRequestDto): Promise<CreateEmployeeResponseDto> {
    const { employee, activationEmailSent } = await this.createEmployee.execute(dto);
    return { employee: EmployeeResponseDto.fromDomain(employee), activationEmailSent };
  }

  @Put(':id')
  @RequirePermissions('EMPLOYEE_MANAGE', 'SYSTEM_USER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa hồ sơ nhân viên và thông tin tài khoản (họ tên, SĐT)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeRequestDto) {
    return EmployeeResponseDto.fromDomain(await this.updateEmployee.execute(id, dto));
  }
}
