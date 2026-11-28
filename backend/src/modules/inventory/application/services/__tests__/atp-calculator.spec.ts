import { AtpCalculatorService } from '../atp-calculator.service';

describe('EP01-T03: AtpCalculatorService Unit Tests', () => {
  let calculator: AtpCalculatorService;

  beforeEach(() => {
    calculator = new AtpCalculatorService();
  });

  describe('1. Acceptance Criteria Verification', () => {
    it('AC1: nếu physical = 10, reserved = 2, safety = 1, quarantined = 1, damaged = 0 => ATP phải trả về chính xác 6', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 10,
        reservedQuantity: 2,
        safetyStock: 1,
        quarantinedQuantity: 1,
        damagedQuantity: 0,
      });

      expect(atp).toBe(6);
    });

    it('AC2: nếu ATP tính ra < 0 => hàm tự động trả về 0, tuyệt đối không trả số âm', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 5,
        reservedQuantity: 3,
        safetyStock: 3, // 5 - 3 - 3 = -1 => 0
        quarantinedQuantity: 0,
        damagedQuantity: 0,
      });

      expect(atp).toBe(0);
    });
  });

  describe('2. Boundary & Edge Cases Matrix', () => {
    it('phải trả về 0 khi balance là null hoặc undefined', () => {
      expect(calculator.calculateAtp(null)).toBe(0);
      expect(calculator.calculateAtp(undefined)).toBe(0);
    });

    it('phải hỗ trợ alias field quantity nếu physicalOnHand không được truyền', () => {
      const atp = calculator.calculateAtp({
        quantity: 15,
        reservedQuantity: 5,
      });

      expect(atp).toBe(10);
    });

    it('phải trừ chính xác cả 4 phân đoạn (reserved, safety, quarantined, damaged)', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 100,
        reservedQuantity: 20,
        safetyStock: 10,
        quarantinedQuantity: 5,
        damagedQuantity: 15,
      });

      // 100 - 20 - 10 - 5 - 15 = 50
      expect(atp).toBe(50);
    });

    it('phải xử lý an toàn khi các trường null hoặc undefined trong object', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 25,
        reservedQuantity: null,
        safetyStock: undefined,
      });

      expect(atp).toBe(25);
    });

    it('phải trả về 0 khi tất cả các trường đều bằng 0', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 0,
        reservedQuantity: 0,
        safetyStock: 0,
        quarantinedQuantity: 0,
        damagedQuantity: 0,
      });

      expect(atp).toBe(0);
    });

    it('phải trả về 0 khi tổng các lượng khấu trừ vượt xa physicalOnHand', () => {
      const atp = calculator.calculateAtp({
        physicalOnHand: 10,
        reservedQuantity: 20,
        safetyStock: 30,
        quarantinedQuantity: 40,
        damagedQuantity: 50,
      });

      expect(atp).toBe(0);
    });
  });

  describe('3. hasSufficientAtp Evaluation', () => {
    it('phải trả về true khi requestedQuantity <= 0', () => {
      expect(calculator.hasSufficientAtp(null, 0)).toBe(true);
      expect(calculator.hasSufficientAtp(null, -5)).toBe(true);
    });

    it('phải trả về true khi ATP >= requestedQuantity', () => {
      const balance = {
        physicalOnHand: 20,
        reservedQuantity: 5,
        safetyStock: 5,
      }; // ATP = 10

      expect(calculator.hasSufficientAtp(balance, 10)).toBe(true);
      expect(calculator.hasSufficientAtp(balance, 5)).toBe(true);
    });

    it('phải trả về false khi ATP < requestedQuantity hoặc không có balance', () => {
      const balance = {
        physicalOnHand: 20,
        reservedQuantity: 5,
        safetyStock: 5,
      }; // ATP = 10

      expect(calculator.hasSufficientAtp(balance, 11)).toBe(false);
      expect(calculator.hasSufficientAtp(null, 1)).toBe(false);
    });
  });
});
