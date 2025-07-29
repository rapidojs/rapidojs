import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypeOrmModule } from '../typeorm.module.js';
import { EntityScannerService } from '../services/entity-scanner.service.js';
import { RepositoryFactoryService } from '../services/repository-factory.service.js';
import { TypeOrmCoreService } from '../services/typeorm-core.service.js';
import { TYPEORM_MODULE_OPTIONS, TYPEORM_DATA_SOURCE, getRepositoryToken } from '../constants.js';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// 测试实体
@Entity()
class TestUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  email!: string;
}

@Entity()
class TestPost {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  title!: string;

  @Column('varchar')
  content!: string;
}

describe('TypeOrmModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forRoot', () => {
    it('should create a dynamic module with correct providers', () => {
      const options = {
        type: 'sqlite' as const,
        database: ':memory:',
        synchronize: true
      };

      const module = TypeOrmModule.forRoot(options);

      expect(module.module).toBe(TypeOrmModule);
      expect(module.global).toBeUndefined();
      expect(module.providers).toHaveLength(5);
      expect(module.exports?.some((exp: any) => exp.provide === TYPEORM_DATA_SOURCE || exp === TYPEORM_DATA_SOURCE)).toBe(true);
      expect(module.exports).toContain(EntityScannerService);
      expect(module.exports).toContain(RepositoryFactoryService);
    });

    it('should not have global property', () => {
      const options = {
        type: 'sqlite' as const,
        database: ':memory:',
        global: true
      };

      const module = TypeOrmModule.forRoot(options);

      expect(module.global).toBeUndefined();
    });

    it('should provide TYPEORM_MODULE_OPTIONS with correct value', () => {
      const options = {
        type: 'sqlite' as const,
        database: ':memory:',
        synchronize: true
      };

      const module = TypeOrmModule.forRoot(options);
      const optionsProvider = module.providers?.find(
        (provider: any) => provider.provide === TYPEORM_MODULE_OPTIONS
      );

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true
      });
    });
  });

  describe('forRootAsync', () => {
    it('should create a dynamic module with async configuration', () => {
      const asyncOptions = {
        imports: [],
        inject: ['ConfigService'],
        useFactory: (configService: any) => ({
          type: 'sqlite' as const,
          database: ':memory:',
          synchronize: true
        })
      };

      const module = TypeOrmModule.forRootAsync(asyncOptions);

      expect(module.module).toBe(TypeOrmModule);
      expect(module.global).toBeUndefined();
      expect(module.imports).toEqual([]);
      expect(module.providers).toHaveLength(5);
    });

    it('should not have global property', () => {
      const asyncOptions = {
        global: true,
        useFactory: () => ({
          type: 'sqlite' as const,
          database: ':memory:'
        })
      };

      const module = TypeOrmModule.forRootAsync(asyncOptions);

      expect(module.global).toBeUndefined();
    });

    it('should provide TYPEORM_MODULE_OPTIONS with factory function', () => {
      const useFactory = vi.fn().mockReturnValue({
        type: 'sqlite',
        database: ':memory:'
      });

      const asyncOptions = {
        inject: ['ConfigService'],
        useFactory
      };

      const module = TypeOrmModule.forRootAsync(asyncOptions);
      const optionsProvider = module.providers?.find(
        (provider: any) => provider.provide === TYPEORM_MODULE_OPTIONS
      );

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useFactory).toBe(useFactory);
      expect(optionsProvider.inject).toEqual(['ConfigService']);
    });
  });

  describe('forFeature', () => {
    it('should create repository providers for entities', () => {
      const entities = [TestUser, TestPost];
      const module = TypeOrmModule.forFeature(entities);

      expect(module.module).toBe(TypeOrmModule);
      expect(module.providers).toHaveLength(4); // 2 repositories + EntityScannerService + RepositoryFactoryService
      
      const userRepoProvider = module.providers?.find(
        (provider: any) => provider.provide === getRepositoryToken(TestUser)
      );
      const postRepoProvider = module.providers?.find(
        (provider: any) => provider.provide === getRepositoryToken(TestPost)
      );

      expect(userRepoProvider).toBeDefined();
      expect(postRepoProvider).toBeDefined();
      expect(userRepoProvider.inject).toEqual([RepositoryFactoryService]);
      expect(postRepoProvider.inject).toEqual([RepositoryFactoryService]);
    });

    it('should export repository tokens', () => {
      const entities = [TestUser, TestPost];
      const module = TypeOrmModule.forFeature(entities);

      expect(module.exports?.some((exp: any) => exp.provide === getRepositoryToken(TestUser))).toBe(true);
      expect(module.exports?.some((exp: any) => exp.provide === getRepositoryToken(TestPost))).toBe(true);
    });

    it('should handle empty entities array', () => {
      const module = TypeOrmModule.forFeature([]);

      expect(module.providers).toHaveLength(2); // EntityScannerService + RepositoryFactoryService
      expect(module.exports).toHaveLength(0);
    });
  });

  describe('createEntitiesDecorator', () => {
    it('should create a decorator that sets metadata', () => {
      const entities = [TestUser, TestPost];
      const decorator = TypeOrmModule.createEntitiesDecorator(entities);

      class TestModule {}
      decorator(TestModule);

      // 验证元数据是否正确设置
      const metadataKey = `__typeorm_entities_${TestModule.name}__`;
      const metadata = Reflect.getMetadata(metadataKey, TestModule);
      
      expect(metadata).toEqual(entities);
    });
  });
});