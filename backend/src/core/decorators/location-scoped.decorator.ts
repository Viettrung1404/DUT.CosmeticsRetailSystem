import { SetMetadata } from '@nestjs/common';

export const LOCATION_SCOPED_KEY = 'location_scoped';

export interface LocationScopedOptions {
  paramName?: string; // Tên param/body/query chứa ID (mặc định: 'id')
  resourceType?: 'FULFILLMENT_ORDER' | 'STORE' | 'SHIPMENT' | 'RETURN_ORDER'; // Loại tài nguyên cần kiểm tra (mặc định: 'FULFILLMENT_ORDER')
  allowAdminOverride?: boolean; // Admin/Quản lý toàn quyền được bypass (mặc định: true)
}

export const LocationScoped = (options?: LocationScopedOptions) =>
  SetMetadata(
    LOCATION_SCOPED_KEY,
    options || { paramName: 'id', resourceType: 'FULFILLMENT_ORDER', allowAdminOverride: true },
  );
