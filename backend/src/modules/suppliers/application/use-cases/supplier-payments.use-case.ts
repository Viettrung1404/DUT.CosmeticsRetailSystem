import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ISupplierRepository,
  SUPPLIER_REPOSITORY,
  SupplierBalance,
  SupplierPaymentView,
} from '../../domain/repositories/supplier.repository.interface';

export const SUPPLIER_PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH'] as const;

const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

// Công nợ NCC: nợ = Σ hóa đơn trên phiếu nhập − Σ đã trả; kế toán ghi khoản đã chuyển cho NCC
@Injectable()
export class SupplierPaymentsUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repository: ISupplierRepository) {}

  async balance(supplierId: string): Promise<SupplierBalance> {
    await this.ensureSupplier(supplierId);
    return this.repository.balance(supplierId);
  }

  async pay(
    userId: string,
    input: {
      supplierId: string;
      purchaseOrderId?: string;
      amount: number;
      paymentMethod: string;
      paymentDate: string;
      note?: string;
    },
  ): Promise<SupplierPaymentView> {
    await this.ensureSupplier(input.supplierId);
    if (input.purchaseOrderId) {
      const owner = await this.repository.purchaseOrderSupplier(input.purchaseOrderId);
      if (!owner) throw new NotFoundException('Không tìm thấy đơn đặt hàng');
      if (owner !== input.supplierId) {
        throw new BadRequestException('Đơn đặt hàng không thuộc nhà cung cấp này');
      }
    }
    const result = await this.repository.createPayment({
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId ?? null,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: new Date(`${input.paymentDate}T00:00:00Z`),
      note: input.note?.trim() || null,
      createdBy: userId,
    });
    if (!result.ok) {
      throw new BadRequestException(
        `Số tiền trả vượt công nợ hiện tại (${formatVnd(Math.max(result.balance, 0))})`,
      );
    }
    return result.payment;
  }

  list(input: { page: number; limit: number; supplierId?: string }) {
    return this.repository.findPayments({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      supplierId: input.supplierId,
    });
  }

  private async ensureSupplier(id: string) {
    if (!(await this.repository.findById(id))) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }
  }
}
