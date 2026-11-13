import { describe, it, expect } from 'vitest';
import { validateAddressForm, validateVietnamesePhone } from '@/utils/validation';

describe('Address Form Validation (TDD)', () => {
  it('1. validateVietnamesePhone should accept valid 10-digit VN phone numbers', () => {
    expect(validateVietnamesePhone('0912345678')).toBe(true);
    expect(validateVietnamesePhone('0381234567')).toBe(true);
    expect(validateVietnamesePhone('0709876543')).toBe(true);
  });

  it('2. validateVietnamesePhone should reject invalid phone numbers', () => {
    expect(validateVietnamesePhone('123456')).toBe(false);
    expect(validateVietnamesePhone('0123456789')).toBe(false);
    expect(validateVietnamesePhone('09123456789')).toBe(false); // 11 số
    expect(validateVietnamesePhone('abcdefghij')).toBe(false);
  });

  it('3. validateAddressForm should return error if recipientName is empty', () => {
    const result = validateAddressForm({
      recipientName: '   ',
      phone: '0912345678',
      addressLine: '123 Nguyen Trai',
      city: 'Ha Noi',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.recipientName).toBeDefined();
  });

  it('4. validateAddressForm should return valid when all required fields are proper', () => {
    const result = validateAddressForm({
      recipientName: 'Nguyen Thi Huong',
      phone: '0912345678',
      addressLine: 'Tòa Landmark 81, 720A Dien Bien Phu',
      city: 'TP. Ho Chi Minh',
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });
});

