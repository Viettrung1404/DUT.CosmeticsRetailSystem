export interface LoyaltyTierInfo {
  id: string;
  name: string;
  minPoints: number;
  discountPercentage: number;
  pointMultiplier: number;
  benefits?: any;
}

export interface CustomerProps {
  id: string;
  userId?: string | null;
  phone?: string | null;
  fullName?: string | null;
  email?: string | null;
  loyaltyTierId?: string | null;
  totalPoints?: number;
  totalSpent?: number;
  totalOrders?: number;
  dateOfBirth?: Date | null;
  gender?: string | null;
  referralCode?: string | null;
  loyaltyTier?: LoyaltyTierInfo | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerEntity {
  public id: string;
  public userId: string | null;
  public phone: string | null;
  public fullName: string | null;
  public email: string | null;
  public loyaltyTierId: string | null;
  public totalPoints: number;
  public totalSpent: number;
  public totalOrders: number;
  public dateOfBirth: Date | null;
  public gender: string | null;
  public referralCode: string | null;
  public loyaltyTier: LoyaltyTierInfo | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: CustomerProps) {
    this.id = props.id;
    this.userId = props.userId || null;
    this.phone = props.phone || null;
    this.fullName = props.fullName || null;
    this.email = props.email || null;
    this.loyaltyTierId = props.loyaltyTierId || null;
    this.totalPoints = props.totalPoints ?? 0;
    this.totalSpent = Number(props.totalSpent ?? 0);
    this.totalOrders = props.totalOrders ?? 0;
    this.dateOfBirth = props.dateOfBirth || null;
    this.gender = props.gender || null;
    this.referralCode = props.referralCode || null;
    this.loyaltyTier = props.loyaltyTier || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
