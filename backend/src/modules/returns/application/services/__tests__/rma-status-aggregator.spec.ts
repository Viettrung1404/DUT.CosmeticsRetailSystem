import { RmaStatusAggregator } from '../rma-status-aggregator';
import {
  ReturnInspectionStatus,
  ReturnOrderStatus,
  ReturnDisposition,
} from '../../../domain/entities/return-policy.entity';

describe('EP15-T03: RmaStatusAggregator Unit Tests', () => {
  let aggregator: RmaStatusAggregator;

  beforeEach(() => {
    aggregator = new RmaStatusAggregator();
  });

  it('1. should return PASSED & RESOLUTION_PENDING when 100% items PASSED (AC1)', () => {
    const items = [
      {
        inspectionStatus: ReturnInspectionStatus.PASSED,
        disposition: ReturnDisposition.RESTOCK,
      },
      {
        inspectionStatus: ReturnInspectionStatus.PASSED,
        disposition: ReturnDisposition.RESTOCK,
      },
    ];

    const result = aggregator.aggregate(items);
    expect(result.overallResult).toBe('PASSED');
    expect(result.returnOrderStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
  });

  it('2. should return FAILED & REJECTED when 100% items FAILED (AC2)', () => {
    const items = [
      {
        inspectionStatus: ReturnInspectionStatus.FAILED,
        disposition: ReturnDisposition.RETURN_TO_CUSTOMER,
      },
      {
        inspectionStatus: ReturnInspectionStatus.FAILED,
        disposition: ReturnDisposition.SCRAP,
      },
    ];

    const result = aggregator.aggregate(items);
    expect(result.overallResult).toBe('FAILED');
    expect(result.returnOrderStatus).toBe(ReturnOrderStatus.REJECTED);
  });

  it('3. should return PARTIALLY_PASSED & RESOLUTION_PENDING when mixed items PASSED and FAILED (AC3)', () => {
    const items = [
      {
        inspectionStatus: ReturnInspectionStatus.PASSED,
        disposition: ReturnDisposition.RESTOCK,
      },
      {
        inspectionStatus: ReturnInspectionStatus.FAILED,
        disposition: ReturnDisposition.RETURN_TO_CUSTOMER,
      },
    ];

    const result = aggregator.aggregate(items);
    expect(result.overallResult).toBe('PARTIALLY_PASSED');
    expect(result.returnOrderStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
  });

  it('4. should return DISPUTED & DISPUTED when any item is DISPUTED (AC4)', () => {
    const items = [
      {
        inspectionStatus: ReturnInspectionStatus.PASSED,
        disposition: ReturnDisposition.RESTOCK,
      },
      {
        inspectionStatus: ReturnInspectionStatus.DISPUTED,
        disposition: null,
      },
    ];

    const result = aggregator.aggregate(items);
    expect(result.overallResult).toBe('DISPUTED');
    expect(result.returnOrderStatus).toBe(ReturnOrderStatus.DISPUTED);
  });

  it('5. should handle empty items array safely', () => {
    const result = aggregator.aggregate([]);
    expect(result.returnOrderStatus).toBe(ReturnOrderStatus.INSPECTING);
  });
});
