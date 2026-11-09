import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetPosMyStoresUseCase } from '../../application/use-cases/get-pos-my-stores.use-case';
import { PosSellingStoreResponseDto } from '../dtos/pos-selling-store-response.dto';

@ApiTags('POS - Sales (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/my-stores')
export class PosStoreController {
  constructor(private readonly getPosMyStoresUseCase: GetPosMyStoresUseCase) {}

  @Get()
  @RequirePermissions('ORDER_POS_CREATE')
  @ApiOperation({ summary: 'POS - Cửa hàng bạn được gán và có thể bán tại quầy (không gồm kho tổng)' })
  @ApiOkResponse({ type: [PosSellingStoreResponseDto] })
  getMyStores(@CurrentUser('userId') userId: string) {
    return this.getPosMyStoresUseCase.execute(userId);
  }
}
