// Kiểm tra số điện thoại Việt Nam hợp lệ (10 số, đầu 03, 05, 07, 08, 09)
export const validateVietnamesePhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  const vnPhoneRegex = /^(03|05|07|08|09)\d{8}$/;
  return vnPhoneRegex.test(cleaned);
};

export interface AddressFormData {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  district?: string;
  ward?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Kiểm tra tính hợp lệ của Form địa chỉ giao hàng
export const validateAddressForm = (data: AddressFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.recipientName || !data.recipientName.trim()) {
    errors.recipientName = 'Họ tên người nhận không được để trống';
  }

  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Số điện thoại không được để trống';
  } else if (!validateVietnamesePhone(data.phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng Việt Nam (10 số)';
  }

  if (!data.addressLine || !data.addressLine.trim()) {
    errors.addressLine = 'Địa chỉ chi tiết không được để trống';
  }

  if (!data.city || !data.city.trim()) {
    errors.city = 'Vui lòng chọn Tỉnh / Thành phố';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export interface ResetPasswordFormData {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

// Kiểm tra tính hợp lệ của Form đặt lại mật khẩu mới
export const validateResetPasswordForm = (data: ResetPasswordFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.otp || !/^\d{6}$/.test(data.otp.trim())) {
    errors.otp = 'Mã xác thực OTP phải gồm đúng 6 chữ số';
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
  }

  if (data.newPassword !== data.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

