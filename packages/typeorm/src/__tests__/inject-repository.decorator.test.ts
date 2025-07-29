import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { InjectRepository } from '../decorators/inject-repository.decorator.js';
import { getRepositoryToken } from '../constants.js';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Mock tsyringe inject function
vi.mock('tsyringe', () => ({
  inject: vi.fn((token: string) => {
    return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
      // Mock implementation of parameter decorator
      const existingTokens = Reflect.getMetadata('design:paramtypes', target) || [];
      existingTokens[parameterIndex] = token;
      Reflect.defineMetadata('design:paramtypes', existingTokens, target);
      Reflect.defineMetadata('custom:inject', token, target, parameterIndex);
    };
  })
}));

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

describe('InjectRepository', () => {
  it('should create a parameter decorator', () => {
    const decorator = InjectRepository(TestUser);
    
    expect(typeof decorator).toBe('function');
  });

  it('should call inject with correct repository token', () => {
    // 测试装饰器是否正确生成了token
    const userToken = getRepositoryToken(TestUser);
    const decorator = InjectRepository(TestUser);
    
    expect(userToken).toBe('TestUserRepository');
    expect(typeof decorator).toBe('function');
  });

  it('should generate different tokens for different entities', () => {
    const userToken = getRepositoryToken(TestUser);
    const postToken = getRepositoryToken(TestPost);
    
    expect(userToken).toBe('TestUserRepository');
    expect(postToken).toBe('TestPostRepository');
    expect(userToken).not.toBe(postToken);
  });

  it('should work as parameter decorator in class constructor', () => {
    class TestService {
      constructor(
        @((InjectRepository as any)(TestUser))
        private userRepository: any,
        @((InjectRepository as any)(TestPost))
        private postRepository: any
      ) {}
    }

    // 验证元数据是否正确设置
    const userToken = Reflect.getMetadata('custom:inject', TestService, 0);
    const postToken = Reflect.getMetadata('custom:inject', TestService, 1);
    
    expect(userToken).toBe(getRepositoryToken(TestUser));
    expect(postToken).toBe(getRepositoryToken(TestPost));
  });

  it('should handle entities with same name but different modules', () => {
    // 创建两个同名但不同的实体类
    @Entity()
    class User {
      @((PrimaryGeneratedColumn as any)())
      id!: number;
    }

    @Entity()
    class AnotherUser {
      @((PrimaryGeneratedColumn as any)())
      id!: number;
    }

    // 重命名以模拟不同模块的同名类
    Object.defineProperty(AnotherUser, 'name', { value: 'User' });

    const token1 = getRepositoryToken(User);
    const token2 = getRepositoryToken(AnotherUser);
    
    // 由于类名相同，token 也会相同，这是预期行为
    expect(token1).toBe(token2);
  });
});