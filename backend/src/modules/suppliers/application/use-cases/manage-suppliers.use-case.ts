import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ISupplierRepository,
  SUPPLIER_REPOSITORY,
  SupplierData,
  SupplierView,
} from '../../domain/repositories/supplier.repository.interface';

const clean = (value: string | null | undefined): string | null | undefined =>
  value === undefined ? undefined : value?.trim() || null;

// Danh bạ NCC và chấm điểm (thang 1–5); ngừng hợp tác = isActive false, không xóa
@Injectable()
export class ManageSuppliersUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repository: ISupplierRepository) {}

  list(input: { page: number; limit: number; search?: string; isActive?: boolean }) {
    return this.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      search: input.search?.trim() || undefined,
      isActive: input.isActive,
    });
  }

  async detail(id: string): Promise<SupplierView> {
    const supplier = await this.repository.findById(id);
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return supplier;
  }

  async create(input: SupplierData & { name: string }): Promise<SupplierView> {
    const data = this.normalize(input) as SupplierData & { name: string };
    await this.assertTaxCodeFree(data.taxCode ?? null);
    return this.repository.create(data);
  }

  async update(id: string, input: SupplierData): Promise<SupplierView> {
    await this.detail(id);
    const data = this.normalize(input);
    await this.assertTaxCodeFree(data.taxCode ?? null, id);
    return this.repository.update(id, data);
  }

  async rate(actorId: string, id: string, rating: number): Promise<SupplierView> {
    await this.detail(id);
    return this.repository.setRating(id, rating, actorId);
  }

  private normalize(input: SupplierData): SupplierData {
    return {
      name: input.name?.trim(),
      contactPerson: clean(input.contactPerson),
      email: clean(input.email)?.toLowerCase(),
      phone: clean(input.phone),
      address: clean(input.address),
      taxCode: clean(input.taxCode),
      paymentTerms: clean(input.paymentTerms),
      isActive: input.isActive,
    };
  }

  private async assertTaxCodeFree(taxCode: string | null, selfId?: string) {
    if (!taxCode) return;
    const owner = await this.repository.findByTaxCode(taxCode);
    if (owner && owner.id !== selfId) {
      throw new ConflictException('Mã số thuế đã thuộc một nhà cung cấp khác');
    }
  }
}
