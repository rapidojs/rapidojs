import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RepositoryFactoryService } from '../services/repository-factory.service.js';
import { transactionStorage } from '../decorators/transactional.decorator.js';
import { DataSource, Repository } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// 测试实体
@Entity()
class TestUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  name!: string;
}

// Mock DataSource
const mockRepository = {
  find: vi.fn(),
  save: vi.fn(),
  delete: vi.fn()
};

const mockTransactionRepository = {
  find: vi.fn(),
  save: vi.fn(),
  delete: vi.fn()
};

const mockEntityManager = {
  getRepository: vi.fn(() => mockTransactionRepository),
  save: vi.fn(),
  find: vi.fn()
};

const mockDataSource = {
  getRepository: vi.fn(() => mockRepository),
  manager: {
    save: vi.fn(),
    find: vi.fn()
  }
} as unknown as DataSource;

describe('RepositoryFactoryService', () => {
  let service: RepositoryFactoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RepositoryFactoryService(mockDataSource);
  });

  afterEach(() => {
    // 清理事务上下文
    transactionStorage.exit(() => {});
  });

  describe('createRepository', () => {
    it('should return regular repository when not in transaction', () => {
      const repository = service.createRepository(TestUser);
      
      expect(repository).toBe(mockRepository);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestUser);
    });

    it('should return transaction repository when in transaction', () => {
      const mockTransactionContext = {
        queryRunner: {},
        manager: mockEntityManager
      };

      // 模拟在事务上下文中
      transactionStorage.run(mockTransactionContext, () => {
        const repository = service.createRepository(TestUser);
        
        expect(repository).toBe(mockTransactionRepository);
        expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestUser);
        expect(mockDataSource.getRepository).not.toHaveBeenCalled();
      });
    });

    it('should handle different entity types', () => {
      @Entity()
      class TestPost {
        @PrimaryGeneratedColumn()
        id!: number;
      }

      const userRepo = service.createRepository(TestUser);
      const postRepo = service.createRepository(TestPost);
      
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestUser);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestPost);
      expect(mockDataSource.getRepository).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEntityManager', () => {
    it('should return regular entity manager when not in transaction', () => {
      const entityManager = service.getEntityManager();
      
      expect(entityManager).toBe(mockDataSource.manager);
    });

    it('should return transaction entity manager when in transaction', () => {
      const mockTransactionContext = {
        queryRunner: {},
        manager: mockEntityManager
      };

      // 模拟在事务上下文中
      transactionStorage.run(mockTransactionContext, () => {
        const entityManager = service.getEntityManager();
        
        expect(entityManager).toBe(mockEntityManager);
      });
    });
  });

  describe('isInTransaction', () => {
    it('should return false when not in transaction', () => {
      expect(service.isInTransaction()).toBe(false);
    });

    it('should return true when in transaction', () => {
      const mockTransactionContext = {
        queryRunner: {},
        manager: mockEntityManager
      };

      // 模拟在事务上下文中
      transactionStorage.run(mockTransactionContext, () => {
        expect(service.isInTransaction()).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should consistently use transaction context across multiple calls', () => {
      const mockTransactionContext = {
        queryRunner: {},
        manager: mockEntityManager
      };

      transactionStorage.run(mockTransactionContext, () => {
        // 多次调用应该都使用事务上下文
        const repo1 = service.createRepository(TestUser);
        const repo2 = service.createRepository(TestUser);
        const manager1 = service.getEntityManager();
        const manager2 = service.getEntityManager();
        
        expect(repo1).toBe(mockTransactionRepository);
        expect(repo2).toBe(mockTransactionRepository);
        expect(manager1).toBe(mockEntityManager);
        expect(manager2).toBe(mockEntityManager);
        expect(service.isInTransaction()).toBe(true);
        
        // 验证调用次数
        expect(mockEntityManager.getRepository).toHaveBeenCalledTimes(2);
        expect(mockDataSource.getRepository).not.toHaveBeenCalled();
      });
    });

    it('should switch back to regular context after transaction', () => {
      const mockTransactionContext = {
        queryRunner: {},
        manager: mockEntityManager
      };

      // 在事务中
      transactionStorage.run(mockTransactionContext, () => {
        expect(service.isInTransaction()).toBe(true);
        const repo = service.createRepository(TestUser);
        expect(repo).toBe(mockTransactionRepository);
      });

      // 事务外
      expect(service.isInTransaction()).toBe(false);
      const repo = service.createRepository(TestUser);
      expect(repo).toBe(mockRepository);
    });

    it('should handle nested transaction contexts', () => {
      const outerContext = {
        queryRunner: { id: 'outer' },
        manager: { ...mockEntityManager, id: 'outer' }
      };

      const innerContext = {
        queryRunner: { id: 'inner' },
        manager: { ...mockEntityManager, id: 'inner' }
      };

      transactionStorage.run(outerContext, () => {
        expect(service.isInTransaction()).toBe(true);
        const outerManager = service.getEntityManager();
        expect(outerManager.id).toBe('outer');

        transactionStorage.run(innerContext, () => {
          expect(service.isInTransaction()).toBe(true);
          const innerManager = service.getEntityManager();
          expect(innerManager.id).toBe('inner');
        });

        // 回到外层上下文
        const backToOuter = service.getEntityManager();
        expect(backToOuter.id).toBe('outer');
      });
    });
  });
});