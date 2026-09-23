import { UserEntity } from '../user.entity';

describe('UserEntity', () => {
  describe('Password Validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = UserEntity.validatePassword('Aa1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 ký tự');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = UserEntity.validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('chữ hoa');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = UserEntity.validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('chữ thường');
    });

    it('should reject passwords without numbers', () => {
      const result = UserEntity.validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('chữ số');
    });

    it('should accept valid strong passwords', () => {
      const result = UserEntity.validatePassword('GlowUp@2026');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Email Validation', () => {
    it('should validate valid email addresses', () => {
      expect(UserEntity.validateEmail('user@glowup.vn')).toBe(true);
      expect(UserEntity.validateEmail('customer.a@gmail.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(UserEntity.validateEmail('invalid-email')).toBe(false);
      expect(UserEntity.validateEmail('@nodomain.com')).toBe(false);
      expect(UserEntity.validateEmail('missing@domain')).toBe(false);
    });
  });

  describe('Effective Permissions Bitmask', () => {
    it('should calculate effective permissions according to: (role | extra) & ~revoked', () => {
      // Role bitmask: 1 | 2 | 4 = 7n
      // Extra bitmask: 8n
      // Revoked bitmask: 2n
      // Effective should be: (7n | 8n) & ~2n = 15n & ~2n = 13n (1 | 4 | 8)
      const user = new UserEntity({
        roleId: 6,
        email: 'test@example.com',
        fullName: 'Test User',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: false,
        extraPermissions: BigInt(8),
        revokedPermissions: BigInt(2),
        rolePermissions: BigInt(7),
      });

      const effective = user.getEffectivePermissions();
      expect(effective).toBe(BigInt(13));
    });
  });

  describe('User Status and Lifecycle', () => {
    it('should allow login only when status is ACTIVE', () => {
      const activeUser = new UserEntity({
        roleId: 6,
        email: 'active@example.com',
        fullName: 'Active User',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: false,
        extraPermissions: BigInt(0),
        revokedPermissions: BigInt(0),
      });
      expect(activeUser.canLogin()).toBe(true);

      const bannedUser = new UserEntity({
        roleId: 6,
        email: 'banned@example.com',
        fullName: 'Banned User',
        status: 'BANNED',
        emailVerified: true,
        phoneVerified: false,
        extraPermissions: BigInt(0),
        revokedPermissions: BigInt(0),
      });
      expect(bannedUser.canLogin()).toBe(false);
    });

    it('should verify email and phone properly', () => {
      const user = new UserEntity({
        roleId: 6,
        email: 'unverified@example.com',
        fullName: 'Unverified User',
        status: 'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
        extraPermissions: BigInt(0),
        revokedPermissions: BigInt(0),
      });

      expect(user.isEmailVerified()).toBe(false);
      user.verifyEmail();
      expect(user.isEmailVerified()).toBe(true);

      user.verifyPhone();
      expect(user.phoneVerified).toBe(true);
    });
  });
});
