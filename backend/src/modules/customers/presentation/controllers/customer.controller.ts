import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { CustomerContextService } from '../../../../core/services/customer-context.service';
import { GetCustomerProfileUseCase } from '../../application/use-cases/get-customer-profile.use-case';
import { GetCustomerAddressesUseCase } from '../../application/use-cases/get-customer-addresses.use-case';
import { CreateCustomerAddressUseCase } from '../../application/use-cases/create-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from '../../application/use-cases/update-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from '../../application/use-cases/delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from '../../application/use-cases/set-default-address.use-case';
import { CreateCustomerAddressDto, UpdateCustomerAddressDto } from '../dtos/customer-address.dto';

@ApiTags('Customers')
@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(
    private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    private readonly getCustomerAddressesUseCase: GetCustomerAddressesUseCase,
    private readonly createCustomerAddressUseCase: CreateCustomerAddressUseCase,
    private readonly updateCustomerAddressUseCase: UpdateCustomerAddressUseCase,
    private readonly deleteCustomerAddressUseCase: DeleteCustomerAddressUseCase,
    private readonly setDefaultAddressUseCase: SetDefaultAddressUseCase,
    private readonly customerContext: CustomerContextService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Xem hồ sơ cá nhân của khách hàng (hạng thành viên, điểm thưởng, tổng chi tiêu)' })
  async getProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.getCustomerProfileUseCase.execute(userId);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Xem danh sách địa chỉ nhận hàng của khách hàng' })
  async getAddresses(@Req() req: any) {
    const customerId = await this.customerContext.getCustomerIdFromUserId(req.user.userId);
    return this.getCustomerAddressesUseCase.execute(customerId!);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Thêm mới địa chỉ nhận hàng (tối đa 10 địa chỉ)' })
  async createAddress(@Req() req: any, @Body() dto: CreateCustomerAddressDto) {
    const customerId = await this.customerContext.getCustomerIdFromUserId(req.user.userId);
    return this.createCustomerAddressUseCase.execute({
      customerId: customerId!,
      label: dto.label,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      city: dto.city,
      district: dto.district,
      ward: dto.ward,
      isDefault: dto.isDefault,
    });
  }

  @Put('me/addresses/:id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ nhận hàng' })
  async updateAddress(
    @Req() req: any,
    @Param('id') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    const customerId = await this.customerContext.getCustomerIdFromUserId(req.user.userId);
    return this.updateCustomerAddressUseCase.execute({
      addressId,
      customerId: customerId!,
      ...dto,
    });
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Xóa địa chỉ nhận hàng' })
  async deleteAddress(@Req() req: any, @Param('id') addressId: string) {
    const customerId = await this.customerContext.getCustomerIdFromUserId(req.user.userId);
    await this.deleteCustomerAddressUseCase.execute({
      addressId,
      customerId: customerId!,
    });
    return { success: true, message: 'Đã xóa địa chỉ thành công' };
  }

  @Patch('me/addresses/:id/default')
  @ApiOperation({ summary: 'Đặt một địa chỉ làm địa chỉ nhận hàng mặc định' })
  async setDefaultAddress(@Req() req: any, @Param('id') addressId: string) {
    const customerId = await this.customerContext.getCustomerIdFromUserId(req.user.userId);
    await this.setDefaultAddressUseCase.execute({
      addressId,
      customerId: customerId!,
    });
    return { success: true, message: 'Đã cập nhật địa chỉ mặc định' };
  }
}
