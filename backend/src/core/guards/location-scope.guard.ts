import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  LOCATION_SCOPED_KEY,
  LocationScopedOptions,
} from '@core/decorators/location-scoped.decorator';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class LocationScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly userDataScope: GetUserDataScopeUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const options = this.reflector.getAllAndOverride<LocationScopedOptions>(
      LOCATION_SCOPED_KEY,
      targets,
    );

    // Không đánh dấu @LocationScoped -> Bỏ qua kiểm tra
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: any = request.user;

    if (!user || (!user.userId && !user.id)) {
      throw new UnauthorizedException('Yêu cầu đăng nhập để truy cập tài nguyên này');
    }

    const currentUserId = user.userId || user.id;
    const allowAdmin = options.allowAdminOverride !== false;
    const isAdmin =
      allowAdmin &&
      (user.roleName === 'ADMIN' ||
        user.roleName === 'OPERATIONS_MGR' ||
        user.dataScope === 'ALL' ||
        user.dataScope === 'GLOBAL');

    if (isAdmin) {
      return true;
    }

    const paramName = options.paramName || 'id';
    const resourceId =
      request.params?.[paramName] ||
      request.body?.[paramName] ||
      request.query?.[paramName];

    if (!resourceId) {
      return true;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resourceType = options.resourceType || 'FULFILLMENT_ORDER';
    let targetLocationId: string | null = null;

    if (resourceType === 'STORE') {
      targetLocationId = resourceId;
    } else if (resourceType === 'FULFILLMENT_ORDER') {
      if (!uuidRegex.test(resourceId)) {
        throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${resourceId}`);
      }
      const fo = await this.prisma.fulfillmentOrder.findUnique({
        where: { id: resourceId },
        select: { sourceLocationId: true },
      });
      if (!fo) {
        throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${resourceId}`);
      }
      targetLocationId = fo.sourceLocationId;
    } else if (resourceType === 'SHIPMENT') {
      if (!uuidRegex.test(resourceId)) {
        throw new NotFoundException(`Không tìm thấy Shipment với ID: ${resourceId}`);
      }
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: resourceId },
        select: {
          fulfillmentOrder: { select: { sourceLocationId: true } },
          order: { select: { storeId: true } },
        },
      });
      if (!shipment) {
        throw new NotFoundException(`Không tìm thấy Shipment với ID: ${resourceId}`);
      }
      targetLocationId =
        shipment.fulfillmentOrder?.sourceLocationId || shipment.order?.storeId || null;
    }

    if (!targetLocationId) {
      return true;
    }

    // Truy vấn phạm vi dữ liệu chi nhánh của người dùng
    const scope = await this.userDataScope.execute(currentUserId);

    // Đối chiếu targetLocationId với phạm vi chi nhánh của nhân viên
    if (!isStoreInScope(scope, targetLocationId)) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'LOCATION_SCOPE_UNAUTHORIZED',
        message: 'Bạn không có quyền thao tác trên đơn hàng thuộc chi nhánh này.',
      });
    }

    return true;
  }
}
