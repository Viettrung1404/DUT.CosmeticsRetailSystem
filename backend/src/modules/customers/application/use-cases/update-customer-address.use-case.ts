import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/repositories/customer.repository.interface";
import { CustomerAddressEntity } from "../../domain/entities/customer-address.entity";

export interface UpdateCustomerAddressInput {
  addressId: string;
  customerId: string;
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  district?: string;
  ward?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

@Injectable()
export class UpdateCustomerAddressUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(
    input: UpdateCustomerAddressInput,
  ): Promise<CustomerAddressEntity> {
    if (
      (input.latitude === undefined) !== (input.longitude === undefined) ||
      (input.latitude == null) !== (input.longitude == null)
    )
      throw new BadRequestException(
        "Vui lòng cung cấp đủ tọa độ vị trí nhận hàng",
      );
    const address = await this.customerRepository.findAddressById(
      input.addressId,
    );
    if (!address) {
      throw new NotFoundException("Địa chỉ không tồn tại");
    }

    if (address.customerId !== input.customerId) {
      throw new ForbiddenException("Bạn không có quyền chỉnh sửa địa chỉ này");
    }

    if (address.isDefault && input.isDefault === false) {
      throw new BadRequestException(
        "Không thể hủy trạng thái mặc định của địa chỉ mặc định. Hãy đặt một địa chỉ khác làm mặc định.",
      );
    }

    if (input.isDefault === true) {
      await this.customerRepository.unsetDefaultAddresses(input.customerId);
    }

    return this.customerRepository.updateAddress(input.addressId, {
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      addressLine: input.addressLine,
      city: input.city,
      district: input.district,
      ward: input.ward,
      latitude: input.latitude,
      longitude: input.longitude,
      isDefault: input.isDefault,
    });
  }
}
