import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypeOrmCoreService } from '../services/typeorm-core.service.js';
import { EntityScannerService } from '../services/entity-scanner.service.js';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// 测试实体
@Entity()
class TestUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  name!: string;
}

@Entity()
class TestPost {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  title!: string;
}

// Mock DataSource
const mockDataSource = {
  initialize: vi.fn(),
  destroy: vi.fn(),
  isInitialized: false
};

// Mock DataSource constructor
vi.mock('typeorm', async () => {
  const actual = await vi.importActual('typeorm');
  return {
    ...actual,
    DataSource: vi.fn().mockImplementation(() => mockDataSource)
  };
});

// Mock console methods
const originalConsole = global.console;
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

describe('TypeOrmCoreService', () => {
  let service: TypeOrmCoreService;
  let entityScanner: EntityScannerService;
  let options: DataSourceOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
    
    entityScanner = new EntityScannerService();
    options = {
      type: 'sqlite',
      database: ':memory:',
      synchronize: true
    };
    
    service = new TypeOrmCoreService(options, entityScanner);
    
    // Reset mock DataSource state
    mockDataSource.isInitialized = false;
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe('constructor', () => {
    it('should create service with options and entity scanner', () => {
      expect(service).toBeInstanceOf(TypeOrmCoreService);
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should initialize DataSource successfully', async () => {
      entityScanner.registerEntities([TestUser, TestPost]);
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      
      await service.onApplicationBootstrap();
      
      expect(DataSource).toHaveBeenCalledWith({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [TestUser, TestPost]
      });
      expect(mockDataSource.initialize).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('✅ TypeORM DataSource has been initialized successfully');
      expect(mockConsole.log).toHaveBeenCalledWith('📊 Registered entities: TestUser, TestPost');
    });

    it('should merge user entities with scanned entities', async () => {
      @Entity()
      class UserEntity {
        @PrimaryGeneratedColumn()
        id!: number;
      }
      
      const optionsWithEntities = {
        ...options,
        entities: [UserEntity]
      };
      
      service = new TypeOrmCoreService(optionsWithEntities, entityScanner);
      entityScanner.registerEntities([TestUser, TestPost]);
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      
      await service.onApplicationBootstrap();
      
      expect(DataSource).toHaveBeenCalledWith({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [UserEntity, TestUser, TestPost]
      });
    });

    it('should handle empty entities list', async () => {
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      
      await service.onApplicationBootstrap();
      
      expect(DataSource).toHaveBeenCalledWith({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: []
      });
      expect(mockConsole.log).toHaveBeenCalledWith('📊 Registered entities: ');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockDataSource.initialize.mockRejectedValueOnce(error);
      
      await expect(service.onApplicationBootstrap()).rejects.toThrow('Connection failed');
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error during TypeORM DataSource initialization:',
        error
      );
    });
  });

  describe('beforeApplicationShutdown', () => {
    it('should destroy DataSource when initialized', async () => {
      // 模拟已初始化的 DataSource
      mockDataSource.isInitialized = true;
      mockDataSource.destroy.mockResolvedValueOnce(undefined);
      
      // 先初始化
      await service.onApplicationBootstrap();
      
      await service.beforeApplicationShutdown();
      
      expect(mockDataSource.destroy).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('✅ TypeORM DataSource has been destroyed successfully');
    });

    it('should not destroy DataSource when not initialized', async () => {
      mockDataSource.isInitialized = false;
      
      await service.beforeApplicationShutdown();
      
      expect(mockDataSource.destroy).not.toHaveBeenCalled();
    });

    it('should handle destruction errors', async () => {
      const error = new Error('Destruction failed');
      mockDataSource.isInitialized = true;
      mockDataSource.destroy.mockRejectedValueOnce(error);
      
      // 先初始化
      await service.onApplicationBootstrap();
      
      await expect(service.beforeApplicationShutdown()).rejects.toThrow('Destruction failed');
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error during TypeORM DataSource destruction:',
        error
      );
    });
  });

  describe('getDataSource', () => {
    it('should return DataSource after initialization', async () => {
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      await service.onApplicationBootstrap();
      
      const dataSource = service.getDataSource();
      
      expect(dataSource).toBe(mockDataSource);
    });

    it('should throw error when DataSource not initialized', () => {
      expect(() => service.getDataSource()).toThrow(
        'DataSource is not initialized. Make sure the application has been bootstrapped.'
      );
    });
  });

  describe('isInitialized', () => {
    it('should return false when DataSource not created', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return false when DataSource created but not initialized', async () => {
      mockDataSource.isInitialized = false;
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      
      // 创建但不初始化
      await service.onApplicationBootstrap();
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true when DataSource initialized', async () => {
      mockDataSource.isInitialized = true;
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      
      await service.onApplicationBootstrap();
      
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('lifecycle integration', () => {
    it('should handle complete lifecycle', async () => {
      entityScanner.registerEntities([TestUser]);
      mockDataSource.initialize.mockResolvedValueOnce(undefined);
      mockDataSource.destroy.mockResolvedValueOnce(undefined);
      mockDataSource.isInitialized = true;
      
      // 启动
      await service.onApplicationBootstrap();
      expect(service.isInitialized()).toBe(true);
      
      // 获取 DataSource
      const dataSource = service.getDataSource();
      expect(dataSource).toBe(mockDataSource);
      
      // 关闭
      await service.beforeApplicationShutdown();
      expect(mockDataSource.destroy).toHaveBeenCalled();
    });

    it('should handle multiple bootstrap calls gracefully', async () => {
      mockDataSource.initialize.mockResolvedValue(undefined);
      
      await service.onApplicationBootstrap();
      await service.onApplicationBootstrap();
      
      // DataSource 构造函数应该被调用两次
      expect(DataSource).toHaveBeenCalledTimes(2);
      expect(mockDataSource.initialize).toHaveBeenCalledTimes(2);
    });
  });
});