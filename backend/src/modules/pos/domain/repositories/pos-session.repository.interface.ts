import { PosSessionEntity, PosSessionStatus } from '../entities/pos-session.entity';

export const POS_SESSION_REPOSITORY = Symbol('IPosSessionRepository');

export interface PosStoreInfo {
  id: string;
  code: string;
  type: string;
  isActive: boolean;
}

export interface CreatePosSessionData {
  sessionCode: string;
  storeId: string;
  cashierId: string;
  openingCash: number;
  note: string | null;
}

export interface PosSessionListFilter {
  storeIds?: string[];
  cashierId?: string;
  status?: PosSessionStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface PosSessionListOptions {
  page: number;
  limit: number;
  order: 'asc' | 'desc';
}

export interface IPosSessionRepository {
  findStore(storeId: string): Promise<PosStoreInfo | null>;
  findById(id: string): Promise<PosSessionEntity | null>;
  findOpenByStore(storeId: string): Promise<PosSessionEntity | null>;
  findOpenByCashier(cashierId: string): Promise<PosSessionEntity | null>;
  countOpenedBetween(storeId: string, from: Date, to: Date): Promise<number>;
  // Trả null khi cửa hàng vừa có ca khác mở trước (vướng chỉ mục duy nhất uq_pos_sessions_store_open)
  create(data: CreatePosSessionData): Promise<PosSessionEntity | null>;
  sumCompletedCash(sessionId: string): Promise<number>;
  // Trả false khi ca đã bị người khác đóng / chốt trước (chỉ ghi nếu trạng thái còn như lúc đọc)
  saveClosed(session: PosSessionEntity): Promise<boolean>;
  saveReconciled(session: PosSessionEntity, reconciledAt: Date): Promise<boolean>;
  findMany(
    filter: PosSessionListFilter,
    options: PosSessionListOptions,
  ): Promise<{ items: PosSessionEntity[]; total: number }>;
}
