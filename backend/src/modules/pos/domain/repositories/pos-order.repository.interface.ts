import {
  CreatePosSaleCommand,
  PosCreatedSale,
  PosSaleContext,
} from '../entities/pos-sale.entity';

export const POS_ORDER_REPOSITORY = Symbol('IPosOrderRepository');

export interface PosSaleContextQuery {
  storeId: string;
  cashierUserId: string;
  variantIds: string[];
  customerId: string | null;
  couponCode: string | null;
  now: Date;
}

export interface IPosOrderRepository {
  loadSaleContext(query: PosSaleContextQuery): Promise<PosSaleContext>;
  // Một transaction: khóa ca + tồn, trừ kho FEFO, ghi đơn, thu tiền, điểm, hoa hồng. Hết hàng thì ném 409
  createSale(command: CreatePosSaleCommand): Promise<PosCreatedSale>;
}
