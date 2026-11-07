import { CommissionSummary, CommissionView } from '../entities/commission.entity';

export const COMMISSION_REPOSITORY = Symbol('ICommissionRepository');

export interface CommissionFilter {
  employeeId?: string;
  storeIds?: string[];
  month?: number;
  year?: number;
  status?: string;
}

export interface ICommissionRepository {
  findAll(
    filter: CommissionFilter,
    page: { skip: number; take: number; order: 'asc' | 'desc' },
  ): Promise<{ items: CommissionView[]; total: number }>;
  summarize(filter: CommissionFilter): Promise<CommissionSummary[]>;
  countByStatus(month: number, year: number): Promise<{ pending: number; paid: number }>;
  finalize(month: number, year: number): Promise<number>;
}
