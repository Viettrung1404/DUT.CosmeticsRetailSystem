import { Logger } from '@nestjs/common';
import { mapGHNStatus } from '../ghn-status.mapper';

describe('GHNStatusMapper (EP06-T03)', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('AC1: 100% mã trạng thái tài liệu GHN v2 được ánh xạ đúng', () => {
    const testCases: [string, string][] = [
      ['ready_to_pick', 'CREATED'],
      ['picking', 'DRIVER_ASSIGNED'],
      ['picked', 'IN_TRANSIT'],
      ['storing', 'IN_TRANSIT'],
      ['sorting', 'IN_TRANSIT'],
      ['transporting', 'IN_TRANSIT'],
      ['delivering', 'OUT_FOR_DELIVERY'],
      ['money_collect_delivering', 'OUT_FOR_DELIVERY'],
      ['delivered', 'DELIVERED'],
      ['delivery_fail', 'DELIVERY_FAILED'],
      ['waiting_to_return', 'RETURNING'],
      ['return', 'RETURNING'],
      ['return_transporting', 'RETURNING'],
      ['return_sorting', 'RETURNING'],
      ['returning', 'RETURNING'],
      ['returned', 'RETURNED'],
      ['cancel', 'CANCELLED'],
    ];

    testCases.forEach(([ghnStatus, expectedStatus]) => {
      it(`should map GHN status "${ghnStatus}" to "${expectedStatus}"`, () => {
        const result = mapGHNStatus(ghnStatus);
        expect(result).toBe(expectedStatus);
      });
    });

    it('should be case-insensitive and trim extra whitespaces', () => {
      expect(mapGHNStatus('  READY_TO_PICK  ')).toBe('CREATED');
      expect(mapGHNStatus('Delivering')).toBe('OUT_FOR_DELIVERY');
      expect(mapGHNStatus('TRANSPORTING')).toBe('IN_TRANSIT');
      expect(mapGHNStatus('  returned  ')).toBe('RETURNED');
    });
  });

  describe('AC2: [CRITICAL CORRECTION] Nhận mã lạ unknown_code_xyz => Trả về EXCEPTION và ghi log ERROR', () => {
    it('should map unknown status "unknown_code_xyz" to "EXCEPTION" and log ERROR', () => {
      const result = mapGHNStatus('unknown_code_xyz');

      // TUYỆT ĐỐI KHÔNG tự động gán IN_TRANSIT
      expect(result).not.toBe('IN_TRANSIT');
      expect(result).toBe('EXCEPTION');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ghn_unmapped_status_alert',
          rawStatus: 'unknown_code_xyz',
          mappedStatus: 'EXCEPTION',
        }),
      );
    });

    it('should map unexpected carrier status "damaged_during_storm" to "EXCEPTION"', () => {
      const result = mapGHNStatus('damaged_during_storm');
      expect(result).toBe('EXCEPTION');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle null, undefined or empty strings safely by mapping to "EXCEPTION" and logging error', () => {
      expect(mapGHNStatus(null)).toBe('EXCEPTION');
      expect(mapGHNStatus(undefined)).toBe('EXCEPTION');
      expect(mapGHNStatus('')).toBe('EXCEPTION');
      expect(mapGHNStatus('   ')).toBe('EXCEPTION');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });
});
