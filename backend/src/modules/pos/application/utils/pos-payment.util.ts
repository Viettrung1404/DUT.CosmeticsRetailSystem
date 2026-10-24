import { BadRequestException } from '@nestjs/common';
import { PosPaymentInput, PosSettlement } from '../../domain/entities/pos-sale.entity';

// Tổng thu >= phải trả; chỉ tiền mặt được thu dư (tiền thừa), chuyển khoản / thẻ phải vừa đúng số
export const settlePayments = (total: number, inputs: PosPaymentInput[]): PosSettlement => {
  const methods = new Set(inputs.map((p) => p.method));
  if (methods.size !== inputs.length) {
    throw new BadRequestException('Mỗi phương thức thanh toán chỉ được khai báo một lần');
  }
  if (total === 0) {
    if (inputs.length > 0) {
      throw new BadRequestException('Đơn 0đ không cần thu tiền');
    }
    return { payments: [], totalReceived: 0, change: 0 };
  }

  const received = inputs.reduce((s, p) => s + p.amount, 0);
  if (received < total) {
    throw new BadRequestException(
      `Số tiền thu chưa đủ: cần ${total.toLocaleString('vi-VN')}đ, mới nhận ${received.toLocaleString('vi-VN')}đ`,
    );
  }
  const change = received - total;
  const cash = inputs.find((p) => p.method === 'CASH');
  if (change > 0 && (!cash || cash.amount < change)) {
    throw new BadRequestException(
      'Chuyển khoản hoặc thẻ phải thu đúng số tiền, chỉ tiền mặt mới được thu dư',
    );
  }

  const payments = inputs.map((p) =>
    p.method === 'CASH'
      ? { method: p.method, amount: p.amount - change, tenderedAmount: p.amount }
      : { method: p.method, amount: p.amount, tenderedAmount: null },
  );
  return { payments: payments.filter((p) => p.amount > 0), totalReceived: received, change };
};
