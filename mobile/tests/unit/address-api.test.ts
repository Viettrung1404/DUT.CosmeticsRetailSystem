import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/api/apiClient';
import { addressApi } from '@/api/addressApi';

describe('addressApi Service (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getAddresses should call GET /customers/me/addresses', async () => {
    const mockAddresses = {
      statusCode: 200,
      success: true,
      data: [
        {
          id: 'addr-1',
          recipientName: 'Thảo Linh',
          phone: '0912345678',
          addressLine: 'Landmark 81',
          city: 'TP. Hồ Chí Minh',
          isDefault: true,
        },
      ],
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockAddresses });

    const res = await addressApi.getAddresses();
    expect(apiClient.get).toHaveBeenCalledWith('/customers/me/addresses');
    expect(res).toEqual(mockAddresses);
  });

  it('2. createAddress should call POST /customers/me/addresses', async () => {
    const payload = {
      recipientName: 'Văn Kim',
      phone: '0988776655',
      addressLine: '123 Đồng Khởi',
      city: 'TP. Hồ Chí Minh',
      isDefault: false,
    };
    const mockCreated = { statusCode: 201, success: true, data: { id: 'addr-2', ...payload } };
    (apiClient.post as any).mockResolvedValueOnce({ data: mockCreated });

    const res = await addressApi.createAddress(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/customers/me/addresses', payload);
    expect(res).toEqual(mockCreated);
  });

  it('3. setDefaultAddress should call PATCH /customers/me/addresses/:id/default', async () => {
    const mockRes = { statusCode: 200, success: true, message: 'Đã cập nhật mặc định' };
    (apiClient.patch as any).mockResolvedValueOnce({ data: mockRes });

    const res = await addressApi.setDefaultAddress('addr-2');
    expect(apiClient.patch).toHaveBeenCalledWith('/customers/me/addresses/addr-2/default');
    expect(res).toEqual(mockRes);
  });

  it('4. deleteAddress should call DELETE /customers/me/addresses/:id', async () => {
    const mockRes = { statusCode: 200, success: true, message: 'Đã xóa' };
    (apiClient.delete as any).mockResolvedValueOnce({ data: mockRes });

    const res = await addressApi.deleteAddress('addr-2');
    expect(apiClient.delete).toHaveBeenCalledWith('/customers/me/addresses/addr-2');
    expect(res).toEqual(mockRes);
  });
});

