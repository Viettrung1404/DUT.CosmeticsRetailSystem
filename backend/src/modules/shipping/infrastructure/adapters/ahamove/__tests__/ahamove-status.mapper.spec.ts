import { Logger } from '@nestjs/common';
import { mapAhamoveStatus } from '../ahamove-status.mapper';

describe('AhamoveStatusMapper (EP07-T03)', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('AC1 & Matrix Mapping: Ánh xạ chuẩn các trạng thái Ahamove', () => {
    const testCases: [string, string | undefined, string][] = [
      ['CANCELLED', undefined, 'CANCELLED'],
      ['ASSIGNING', undefined, 'CREATED'],
      ['ACCEPTED', undefined, 'DRIVER_ASSIGNED'],
      ['IN_PROCESS', 'DELIVERING', 'OUT_FOR_DELIVERY'],
      ['IN_PROCESS', 'PENDING', 'IN_TRANSIT'],
      ['IN_PROCESS', undefined, 'IN_TRANSIT'],
      ['COMPLETED', undefined, 'DELIVERED'],
      ['COMPLETED', 'SUCCESS', 'DELIVERED'],
      ['COMPLETED', 'FAILED', 'DELIVERY_FAILED'],
      ['FAILED', undefined, 'DELIVERY_FAILED'],
      ['RETURNING', undefined, 'RETURNING'],
      ['RETURNED', undefined, 'RETURNED'],
    ];

    testCases.forEach(([orderStatus, dropoffStatus, expectedStatus]) => {
      it(`should map orderStatus="${orderStatus}" and dropoffStatus="${dropoffStatus || 'N/A'}" to "${expectedStatus}"`, () => {
        const result = mapAhamoveStatus(orderStatus, dropoffStatus);
        expect(result).toBe(expectedStatus);
      });
    });

    it('should be case-insensitive and handle whitespaces', () => {
      expect(mapAhamoveStatus('  assigning  ')).toBe('CREATED');
      expect(mapAhamoveStatus('accepted')).toBe('DRIVER_ASSIGNED');
      expect(mapAhamoveStatus('in_process', 'delivering')).toBe('OUT_FOR_DELIVERY');
      expect(mapAhamoveStatus('completed')).toBe('DELIVERED');
    });
  });

  describe('AC2: [CRITICAL CORRECTION] Bất kỳ trạng thái lạ nào đều được đưa về EXCEPTION', () => {
    it('should map unknown status "unknown_status_xyz" to "EXCEPTION" and log ERROR', () => {
      const result = mapAhamoveStatus('unknown_status_xyz');

      expect(result).not.toBe('IN_TRANSIT');
      expect(result).toBe('EXCEPTION');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ahamove_unmapped_status_alert',
          rawOrderStatus: 'unknown_status_xyz',
          mappedStatus: 'EXCEPTION',
        }),
      );
    });

    it('should map unexpected order status "driver_accident_reported" to "EXCEPTION"', () => {
      const result = mapAhamoveStatus('driver_accident_reported');
      expect(result).toBe('EXCEPTION');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle null, undefined or empty strings safely by mapping to "EXCEPTION" and logging error', () => {
      expect(mapAhamoveStatus(null)).toBe('EXCEPTION');
      expect(mapAhamoveStatus(undefined)).toBe('EXCEPTION');
      expect(mapAhamoveStatus('')).toBe('EXCEPTION');
      expect(mapAhamoveStatus('   ')).toBe('EXCEPTION');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });
});
