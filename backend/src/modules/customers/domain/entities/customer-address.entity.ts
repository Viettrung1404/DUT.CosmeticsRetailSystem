export interface CustomerAddressProps {
  id: string;
  customerId: string;
  label?: string | null;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  district: string;
  ward: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerAddressEntity {
  public id: string;
  public customerId: string;
  public label?: string | null;
  public recipientName: string;
  public phone: string;
  public addressLine: string;
  public city: string;
  public district: string;
  public ward: string;
  public isDefault: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: CustomerAddressProps) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.label = props.label || null;
    this.recipientName = props.recipientName;
    this.phone = props.phone;
    this.addressLine = props.addressLine;
    this.city = props.city;
    this.district = props.district;
    this.ward = props.ward;
    this.isDefault = props.isDefault ?? false;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  public getFullAddress(): string {
    return `${this.addressLine}, ${this.ward}, ${this.district}, ${this.city}`;
  }
}
