import { detectRecurringExpense } from '../src/lib/expense-insights';
import prisma from '../src/lib/prisma';

// Mock prisma client to intercept findMany
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    expense: {
      findMany: jest.fn(),
    },
    merchantProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
  },
}));

describe('Expense Insights Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRecurringExpense', () => {
    it('detects monthly recurring expenses given three similar payments', async () => {
      // Mock past expenses
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([
        { id: '1', amount: 500, date: new Date('2023-01-05T00:00:00.000Z') },
        { id: '2', amount: 500, date: new Date('2023-02-05T00:00:00.000Z') },
        { id: '3', amount: 500, date: new Date('2023-03-05T00:00:00.000Z') },
      ]);

      const result = await detectRecurringExpense({
        userId: 'user1',
        merchant: 'Netflix',
        amount: 500,
        date: new Date('2023-04-05T00:00:00.000Z'),
      });

      expect(result.isRecurring).toBe(true);
      expect(result.recurringRule).toBe('monthly');
    });

    it('does not detect recurring for random amounts and dates', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([
        { id: '1', amount: 120, date: new Date('2023-01-02T00:00:00.000Z') },
        { id: '2', amount: 55, date: new Date('2023-01-15T00:00:00.000Z') },
        { id: '3', amount: 210, date: new Date('2023-02-28T00:00:00.000Z') },
      ]);

      const result = await detectRecurringExpense({
        userId: 'user1',
        merchant: 'Coffee Shop',
        amount: 150,
        date: new Date('2023-03-10T00:00:00.000Z')
      });

      expect(result.isRecurring).toBe(false);
      expect(result.recurringRule).toBe(null);
    });

    it('returns false when history is empty', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      
      const result = await detectRecurringExpense({
        userId: 'user1',
        merchant: 'Netflix',
        amount: 500,
        date: new Date('2023-04-05T00:00:00.000Z')
      });

      expect(result.isRecurring).toBe(false);
      expect(result.recurringRule).toBe(null);
    });
    
    it('returns false if merchant is missing', async () => {
      const result = await detectRecurringExpense({
        userId: 'user1',
        merchant: null,
        amount: 500,
        date: new Date('2023-04-05T00:00:00.000Z')
      });

      expect(result.isRecurring).toBe(false);
      expect(prisma.expense.findMany).not.toHaveBeenCalled();
    });
  });
});
