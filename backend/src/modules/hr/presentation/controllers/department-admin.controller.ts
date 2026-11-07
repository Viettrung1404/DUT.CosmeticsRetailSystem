import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department.use-case';
import { DeleteDepartmentUseCase } from '../../application/use-cases/delete-department.use-case';
import { GetDepartmentsUseCase } from '../../application/use-cases/get-departments.use-case';
import { UpdateDepartmentUseCase } from '../../application/use-cases/update-department.use-case';
import { parseUuidVi } from '../pipes/parse-uuid-vi.pipe';
import { CreateDepartmentRequestDto, UpdateDepartmentRequestDto } from '../dtos/hr-request.dto';
import { DepartmentResponseDto } from '../dtos/hr-response.dto';

@ApiTags('Admin - HR (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/departments')
export class DepartmentAdminController {
  constructor(
    private readonly getDepartments: GetDepartmentsUseCase,
    private readonly createDepartment: CreateDepartmentUseCase,
    private readonly updateDepartment: UpdateDepartmentUseCase,
    private readonly deleteDepartment: DeleteDepartmentUseCase,
  ) {}

  @Get()
  @RequirePermissions('EMPLOYEE_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách phòng ban (kèm số nhân viên)' })
  async list() {
    return (await this.getDepartments.execute()).map((d) => DepartmentResponseDto.fromDomain(d));
  }

  @Post()
  @RequirePermissions('EMPLOYEE_MANAGE', 'SYSTEM_USER_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo phòng ban' })
  @ApiConflictResponse({ description: 'Tên phòng ban đã tồn tại' })
  async create(@Body() dto: CreateDepartmentRequestDto) {
    return DepartmentResponseDto.fromDomain(await this.createDepartment.execute(dto));
  }

  @Put(':id')
  @RequirePermissions('EMPLOYEE_MANAGE', 'SYSTEM_USER_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa phòng ban' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy phòng ban' })
  async update(@Param('id', parseUuidVi) id: string, @Body() dto: UpdateDepartmentRequestDto) {
    return DepartmentResponseDto.fromDomain(await this.updateDepartment.execute(id, dto));
  }

  @Delete(':id')
  @RequirePermissions('EMPLOYEE_MANAGE', 'SYSTEM_USER_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa phòng ban (chỉ khi không còn nhân viên)' })
  @ApiConflictResponse({ description: 'Phòng ban còn nhân viên' })
  async remove(@Param('id', parseUuidVi) id: string) {
    await this.deleteDepartment.execute(id);
    return { message: 'Đã xóa phòng ban', data: null };
  }
}
