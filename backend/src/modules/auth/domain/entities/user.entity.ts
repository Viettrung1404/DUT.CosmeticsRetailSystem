export interface UserProps {
  id?: string;
  roleId: number;
  email: string;
  passwordHash?: string | null;
  phone?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  extraPermissions: bigint;
  revokedPermissions: bigint;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  // Relation data (optional, loaded when needed)
  roleName?: string;
  rolePermissions?: bigint;
  dataScope?: string;
}

/**
 * Pure Domain Entity for User - encapsulates core business invariants.
 * Completely framework-agnostic (independent of NestJS, Prisma, etc.).
 */
export class UserEntity {
  private _id?: string;
  private _roleId: number;
  private _email: string;
  private _passwordHash?: string | null;
  private _phone?: string | null;
  private _fullName: string;
  private _avatarUrl?: string | null;
  private _status: string;
  private _emailVerified: boolean;
  private _phoneVerified: boolean;
  private _extraPermissions: bigint;
  private _revokedPermissions: bigint;
  private _lastLoginAt?: Date | null;
  private _createdAt?: Date;
  private _updatedAt?: Date;
  private _roleName?: string;
  private _rolePermissions?: bigint;
  private _dataScope?: string;

  constructor(props: UserProps) {
    this._id = props.id;
    this._roleId = props.roleId;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._phone = props.phone;
    this._fullName = props.fullName;
    this._avatarUrl = props.avatarUrl;
    this._status = props.status;
    this._emailVerified = props.emailVerified;
    this._phoneVerified = props.phoneVerified;
    this._extraPermissions = props.extraPermissions;
    this._revokedPermissions = props.revokedPermissions;
    this._lastLoginAt = props.lastLoginAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._roleName = props.roleName;
    this._rolePermissions = props.rolePermissions;
    this._dataScope = props.dataScope;
  }

  // Getters
  get id(): string | undefined { return this._id; }
  get roleId(): number { return this._roleId; }
  get email(): string { return this._email; }
  get passwordHash(): string | null | undefined { return this._passwordHash; }
  get phone(): string | null | undefined { return this._phone; }
  get fullName(): string { return this._fullName; }
  get avatarUrl(): string | null | undefined { return this._avatarUrl; }
  get status(): string { return this._status; }
  get emailVerified(): boolean { return this._emailVerified; }
  get phoneVerified(): boolean { return this._phoneVerified; }
  get extraPermissions(): bigint { return this._extraPermissions; }
  get revokedPermissions(): bigint { return this._revokedPermissions; }
  get lastLoginAt(): Date | null | undefined { return this._lastLoginAt; }
  get createdAt(): Date | undefined { return this._createdAt; }
  get updatedAt(): Date | undefined { return this._updatedAt; }
  get roleName(): string | undefined { return this._roleName; }
  get rolePermissions(): bigint | undefined { return this._rolePermissions; }
  get dataScope(): string | undefined { return this._dataScope; }

  // ==================== Business Rules ====================

  /** Validates password complexity: min 8 chars, uppercase, lowercase, digit */
  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ thường' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ số' };
    }
    return { valid: true };
  }

  /** Validates email format */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /** Can account log in */
  canLogin(): boolean {
    return this._status === 'ACTIVE';
  }

  /** Is email verified */
  isEmailVerified(): boolean {
    return this._emailVerified;
  }

  /** Mark email as verified */
  verifyEmail(): void {
    this._emailVerified = true;
  }

  /** Mark phone as verified */
  verifyPhone(): void {
    this._phoneVerified = true;
  }

  /** Update last login timestamp */
  updateLastLogin(): void {
    this._lastLoginAt = new Date();
  }

  /** Update password hash */
  updatePasswordHash(newHash: string): void {
    this._passwordHash = newHash;
  }
}

