import { describe, it, expect } from 'vitest';
import { validateResetPasswordForm } from '@/utils/validation';

describe('Reset Password Validation (TDD)', () => {
  it('1. should reject if OTP is not 6 digits', () => {
    const result = validateResetPasswordForm({
      otp: '1234',
      newPassword: 'Password123@',
      confirmPassword: 'Password123@',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.otp).toBeDefined();
  });

  it('2. should reject if newPassword is less than 6 characters', () => {
    const result = validateResetPasswordForm({
      otp: '123456',
      newPassword: '123',
      confirmPassword: '123',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.newPassword).toBeDefined();
  });

  it('3. should reject if confirmPassword does not match newPassword', () => {
    const result = validateResetPasswordForm({
      otp: '123456',
      newPassword: 'Password123@',
      confirmPassword: 'DifferentPassword123@',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('4. should pass when OTP is 6 digits and passwords match', () => {
    const result = validateResetPasswordForm({
      otp: '654321',
      newPassword: 'GlowUpSecret2026@',
      confirmPassword: 'GlowUpSecret2026@',
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });
});

