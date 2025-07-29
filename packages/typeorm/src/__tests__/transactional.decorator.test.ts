import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock tsyringe container
vi.mock('tsyringe', () => ({
  container: {
    resolve: vi.fn()
  }
}));

import { Transactional, getCurrentTransactionContext, transactionStorage } from '../decorators/transactional.decorator.js';
import { TYPEORM_DATA_SOURCE } from '../constants.js';
import { DataSource, QueryRunner } from 'typeorm';
import { container } from 'tsyringe';

// Mock TypeORM
const mockQueryRunner = {
  connect: vi.fn(),
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  rollbackTransaction: vi.fn(),
  release: vi.fn(),
  manager: { name: 'mockManager' }
};

const mockDataSource = {
  createQueryRunner: vi.fn(() => mockQueryRunner)
};

describe('Transactional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(mockDataSource);
  });

  afterEach(() => {
    // 清理事务上下文
    transactionStorage.exit(() => {});
  });

  describe('@Transactional decorator', () => {
    it('should wrap method with transaction logic', async () => {
      class TestService {
        @Transactional()
        async testMethod(value: string) {
          return `processed: ${value}`;
        }
      }

      const service = new TestService();
      const result = await service.testMethod('test');

      expect(result).toBe('processed: test');
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const testError = new Error('Test error');

      class TestService {
        @Transactional()
        async testMethod() {
          throw testError;
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod()).rejects.toThrow('Test error');
      
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle nested transactions correctly', async () => {
      class TestService {
        @Transactional()
        async outerMethod() {
          return this.innerMethod();
        }

        @Transactional()
        async innerMethod() {
          return 'inner result';
        }
      }

      const service = new TestService();
      const result = await service.outerMethod();

      expect(result).toBe('inner result');
      // 应该只创建一个查询运行器（外层事务）
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('should provide transaction context during method execution', async () => {
      let contextDuringExecution: any = null;

      class TestService {
        @Transactional()
        async testMethod() {
          contextDuringExecution = getCurrentTransactionContext();
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      expect(contextDuringExecution).not.toBeNull();
      expect(contextDuringExecution.queryRunner).toBe(mockQueryRunner);
      expect(contextDuringExecution.manager).toBe(mockQueryRunner.manager);
    });

    it('should handle async method parameters correctly', async () => {
      class TestService {
        @Transactional()
        async testMethod(a: number, b: string, c: boolean) {
          return { a, b, c };
        }
      }

      const service = new TestService();
      const result = await service.testMethod(42, 'test', true);

      expect(result).toEqual({ a: 42, b: 'test', c: true });
    });

    it('should preserve method context (this)', async () => {
      class TestService {
        private value = 'service-value';

        @Transactional()
        async testMethod() {
          return this.value;
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('service-value');
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockQueryRunner.connect.mockRejectedValueOnce(connectionError);

      class TestService {
        @Transactional()
        async testMethod() {
          return 'should not reach here';
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod()).rejects.toThrow('Connection failed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle transaction start errors gracefully', async () => {
      const transactionError = new Error('Transaction start failed');
      mockQueryRunner.startTransaction.mockRejectedValueOnce(transactionError);

      class TestService {
        @Transactional()
        async testMethod() {
          return 'should not reach here';
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod()).rejects.toThrow('Transaction start failed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getCurrentTransactionContext', () => {
    it('should return undefined when not in transaction', () => {
      const context = getCurrentTransactionContext();
      expect(context).toBeUndefined();
    });

    it('should return transaction context when in transaction', async () => {
      let contextInTransaction: any = null;

      class TestService {
        @Transactional()
        async testMethod() {
          contextInTransaction = getCurrentTransactionContext();
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      expect(contextInTransaction).toBeDefined();
      expect(contextInTransaction.queryRunner).toBe(mockQueryRunner);
      expect(contextInTransaction.manager).toBe(mockQueryRunner.manager);
    });
  });
});