export type PosSessionStatus = 'OPEN' | 'CLOSED' | 'RECONCILED';

export interface PosSessionProps {
  id: string;
  sessionCode: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  openedAt: Date;
  closedAt: Date | null;
  openingCash: number;
  systemCash: number;
  countedCash: number | null;
  difference: number | null;
  status: PosSessionStatus;
  note: string | null;
  approvedBy: string | null;
  approverName: string | null;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export class PosSessionEntity {
  constructor(private readonly props: PosSessionProps) {}

  get id() { return this.props.id; }
  get sessionCode() { return this.props.sessionCode; }
  get storeId() { return this.props.storeId; }
  get storeCode() { return this.props.storeCode; }
  get storeName() { return this.props.storeName; }
  get cashierId() { return this.props.cashierId; }
  get cashierName() { return this.props.cashierName; }
  get openedAt() { return this.props.openedAt; }
  get closedAt() { return this.props.closedAt; }
  get openingCash() { return this.props.openingCash; }
  get systemCash() { return this.props.systemCash; }
  get countedCash() { return this.props.countedCash; }
  get difference() { return this.props.difference; }
  get status() { return this.props.status; }
  get note() { return this.props.note; }
  get approvedBy() { return this.props.approvedBy; }
  get approverName() { return this.props.approverName; }

  // Chênh lệch = tiền đếm được - (tiền đầu ca + tiền mặt hệ thống ghi nhận), tài liệu 04 bảng pos_sessions
  close(countedCash: number, systemCash: number, note: string | null, closedAt: Date): void {
    this.props.systemCash = roundMoney(systemCash);
    this.props.countedCash = roundMoney(countedCash);
    this.props.difference = roundMoney(countedCash - (this.props.openingCash + systemCash));
    this.props.closedAt = closedAt;
    this.props.status = 'CLOSED';
    if (note) {
      this.props.note = note;
    }
  }

  reconcile(approverId: string, note: string | null): void {
    this.props.approvedBy = approverId;
    this.props.status = 'RECONCILED';
    if (note) {
      this.props.note = this.props.note ? `${this.props.note}\n${note}` : note;
    }
  }

  hasDifference(): boolean {
    return this.props.difference !== null && this.props.difference !== 0;
  }
}
