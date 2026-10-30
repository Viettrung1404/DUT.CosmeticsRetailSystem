import { ShiftView } from '../entities/shift.entity';

export const SHIFT_REPOSITORY = Symbol('IShiftRepository');

export interface ShiftListFilter {
  // undefined = không giới hạn; có giá trị = các cửa hàng được xem (ca dùng chung storeId null luôn được xem)
  storeIds?: string[];
  storeId?: string;
}

export interface ShiftData {
  storeId: string | null;
  name: string;
  startTime: string;
  endTime: string;
}

export interface IShiftRepository {
  findAll(filter: ShiftListFilter): Promise<ShiftView[]>;
  findById(id: string): Promise<ShiftView | null>;
  storeExists(id: string): Promise<boolean>;
  create(data: ShiftData): Promise<ShiftView>;
  update(id: string, data: Partial<Omit<ShiftData, 'storeId'>>): Promise<ShiftView>;
  countAttendance(id: string): Promise<number>;
  delete(id: string): Promise<void>;
}
