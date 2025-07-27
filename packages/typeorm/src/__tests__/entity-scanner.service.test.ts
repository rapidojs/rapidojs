import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EntityScannerService } from '../services/entity-scanner.service.js';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// 测试实体
@Entity()
class TestUser {
  @((PrimaryGeneratedColumn as any)())
  id!: number;

  @((Column as any)('varchar'))
  name!: string;
}

@Entity()
class TestPost {
  @((PrimaryGeneratedColumn as any)())
  id!: number;

  @((Column as any)('varchar'))
  title!: string;
}

@Entity()
class TestComment {
  @((PrimaryGeneratedColumn as any)())
  id!: number;

  @((Column as any)('varchar'))
  content!: string;
}

describe('EntityScannerService', () => {
  let service: EntityScannerService;

  beforeEach(() => {
    service = new EntityScannerService();
  });

  describe('registerEntities', () => {
    it('should register entities successfully', () => {
      const entities = [TestUser, TestPost];
      service.registerEntities(entities, 'TestModule');

      const registeredEntities = service.getEntities();
      expect(registeredEntities).toHaveLength(2);
      expect(registeredEntities).toContain(TestUser);
      expect(registeredEntities).toContain(TestPost);
    });

    it('should avoid duplicate registration', () => {
      service.registerEntities([TestUser], 'Module1');
      service.registerEntities([TestUser], 'Module2');

      const registeredEntities = service.getEntities();
      expect(registeredEntities).toHaveLength(1);
      expect(registeredEntities).toContain(TestUser);
    });

    it('should register entities with default module name', () => {
      service.registerEntities([TestUser]);

      const metadata = service.getEntitiesMetadata();
      expect(metadata).toHaveLength(1);
      expect(metadata[0].module).toBe('default');
      expect(metadata[0].entity).toBe(TestUser);
    });

    it('should register entities with custom module name', () => {
      service.registerEntities([TestUser, TestPost], 'CustomModule');

      const metadata = service.getEntitiesMetadata();
      expect(metadata).toHaveLength(2);
      expect(metadata[0].module).toBe('CustomModule');
      expect(metadata[1].module).toBe('CustomModule');
    });
  });

  describe('scanModuleEntities', () => {
    it('should scan entities from module metadata', () => {
      // 模拟模块类
      class TestModule {}
      
      // 设置元数据
      const metadataKey = `__typeorm_entities_${TestModule.name}__`;
      Reflect.defineMetadata(metadataKey, [TestUser, TestPost], TestModule);

      service.scanModuleEntities(TestModule);

      const entities = service.getEntities();
      expect(entities).toHaveLength(2);
      expect(entities).toContain(TestUser);
      expect(entities).toContain(TestPost);
    });

    it('should handle module without entities metadata', () => {
      class EmptyModule {}
      
      service.scanModuleEntities(EmptyModule);

      const entities = service.getEntities();
      expect(entities).toHaveLength(0);
    });

    it('should handle invalid entities metadata', () => {
      class InvalidModule {}
      
      // 设置无效的元数据
      const metadataKey = `__typeorm_entities_${InvalidModule.name}__`;
      Reflect.defineMetadata(metadataKey, 'invalid', InvalidModule);

      service.scanModuleEntities(InvalidModule);

      const entities = service.getEntities();
      expect(entities).toHaveLength(0);
    });
  });

  describe('getEntities', () => {
    it('should return empty array when no entities registered', () => {
      const entities = service.getEntities();
      expect(entities).toEqual([]);
    });

    it('should return copy of entities array', () => {
      service.registerEntities([TestUser]);
      
      const entities1 = service.getEntities();
      const entities2 = service.getEntities();
      
      expect(entities1).not.toBe(entities2); // Different array instances
      expect(entities1).toEqual(entities2); // Same content
    });
  });

  describe('getEntitiesMetadata', () => {
    it('should return empty array when no entities registered', () => {
      const metadata = service.getEntitiesMetadata();
      expect(metadata).toEqual([]);
    });

    it('should return copy of metadata array', () => {
      service.registerEntities([TestUser], 'TestModule');
      
      const metadata1 = service.getEntitiesMetadata();
      const metadata2 = service.getEntitiesMetadata();
      
      expect(metadata1).not.toBe(metadata2); // Different array instances
      expect(metadata1).toEqual(metadata2); // Same content
    });

    it('should return correct metadata structure', () => {
      service.registerEntities([TestUser, TestPost], 'TestModule');
      
      const metadata = service.getEntitiesMetadata();
      
      expect(metadata).toHaveLength(2);
      expect(metadata[0]).toEqual({
        entity: TestUser,
        module: 'TestModule'
      });
      expect(metadata[1]).toEqual({
        entity: TestPost,
        module: 'TestModule'
      });
    });
  });

  describe('clear', () => {
    it('should clear all entities and metadata', () => {
      service.registerEntities([TestUser, TestPost], 'TestModule');
      
      expect(service.getEntities()).toHaveLength(2);
      expect(service.getEntitiesMetadata()).toHaveLength(2);
      
      service.clear();
      
      expect(service.getEntities()).toHaveLength(0);
      expect(service.getEntitiesMetadata()).toHaveLength(0);
    });
  });

  describe('hasEntity', () => {
    it('should return false for unregistered entity', () => {
      expect(service.hasEntity(TestUser)).toBe(false);
    });

    it('should return true for registered entity', () => {
      service.registerEntities([TestUser]);
      
      expect(service.hasEntity(TestUser)).toBe(true);
      expect(service.hasEntity(TestPost)).toBe(false);
    });
  });

  describe('getEntityModule', () => {
    it('should return undefined for unregistered entity', () => {
      const module = service.getEntityModule(TestUser);
      expect(module).toBeUndefined();
    });

    it('should return correct module for registered entity', () => {
      service.registerEntities([TestUser], 'UserModule');
      service.registerEntities([TestPost], 'PostModule');
      
      expect(service.getEntityModule(TestUser)).toBe('UserModule');
      expect(service.getEntityModule(TestPost)).toBe('PostModule');
      expect(service.getEntityModule(TestComment)).toBeUndefined();
    });
  });

  describe('multiple module registration', () => {
    it('should handle entities from multiple modules', () => {
      service.registerEntities([TestUser], 'UserModule');
      service.registerEntities([TestPost], 'PostModule');
      service.registerEntities([TestComment], 'CommentModule');
      
      const entities = service.getEntities();
      const metadata = service.getEntitiesMetadata();
      
      expect(entities).toHaveLength(3);
      expect(metadata).toHaveLength(3);
      
      expect(service.getEntityModule(TestUser)).toBe('UserModule');
      expect(service.getEntityModule(TestPost)).toBe('PostModule');
      expect(service.getEntityModule(TestComment)).toBe('CommentModule');
    });
  });
});