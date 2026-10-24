import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { CreatePosCustomerUseCase } from '../../application/use-cases/create-pos-customer.use-case';
import { LookupPosCustomerUseCase } from '../../application/use-cases/lookup-pos-customer.use-case';
import { CreatePosCustomerDto, LookupCustomerQueryDto } from '../dtos/pos-lookup-request.dto';
import { PosCustomerResponseDto } from '../dtos/pos-lookup-response.dto';

@ApiTags('POS - Sales (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/customers')
export class PosCustomerController {
  constructor(
    private readonly lookupPosCustomerUseCase: LookupPosCustomerUseCase,
    private readonly createPosCustomerUseCase: CreatePosCustomerUseCase,
  ) {}

  @Get('lookup')
  @RequirePermissions('CUSTOMER_VIEW')
  @ApiOperation({ summary: 'POS - Tìm khách theo số điện thoại (hạng, điểm hiện có)' })
  @ApiNotFoundResponse({ description: 'Chưa có khách với số điện thoại này' })
  async lookup(@Query() query: LookupCustomerQueryDto) {
    const customer = await this.lookupPosCustomerUseCase.execute(query.phone);
    return PosCustomerResponseDto.fromDomain(customer);
  }

  @Post()
  @RequirePermissions('CUSTOMER_CREATE_UPDATE')
  @ApiOperation({ summary: 'POS - Tạo nhanh khách tại quầy (số điện thoại + họ tên, chưa cần tài khoản)' })
  @ApiConflictResponse({ description: 'Số điện thoại đã có khách' })
  async create(@Body() dto: CreatePosCustomerDto) {
    const customer = await this.createPosCustomerUseCase.execute(dto);
    return { message: 'Tạo khách hàng thành công', data: PosCustomerResponseDto.fromDomain(customer) };
  }
}
