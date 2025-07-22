import { describe, it, expect } from 'vitest';
import { Catch } from '../decorators/catch.decorator.js';
import { EXCEPTION_FILTER_METADATA } from '../constants.js';
import { HttpException } from '../exceptions/http-exception.js';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '../exceptions/built-in-exceptions.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { ArgumentsHost } from '../interfaces/arguments-host.interface.js';

describe('@Catch 装饰器', () => {
  describe('基本功能', () => {
    it('应该正确设置单个异常类型的元数据', () => {
      @Catch(BadRequestException)
      class TestExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, TestExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toBe(BadRequestException);
    });

    it('应该正确设置多个异常类型的元数据', () => {
      @Catch(BadRequestException, NotFoundException, InternalServerErrorException)
      class MultiExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, MultiExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toHaveLength(3);
      expect(metadata).toContain(BadRequestException);
      expect(metadata).toContain(NotFoundException);
      expect(metadata).toContain(InternalServerErrorException);
    });

    it('应该正确设置HttpException基类的元数据', () => {
      @Catch(HttpException)
      class BaseExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, BaseExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toBe(HttpException);
    });

    it('应该处理空的异常类型列表', () => {
      @Catch()
      class EmptyExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, EmptyExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toHaveLength(0);
    });
  });

  describe('自定义异常类型', () => {
    it('应该支持自定义异常类', () => {
      class CustomException extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomException';
        }
      }

      class AnotherCustomException extends HttpException {
        constructor() {
          super('Another custom error', 422);
        }
      }

      @Catch(CustomException, AnotherCustomException)
      class CustomExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, CustomExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(2);
      expect(metadata).toContain(CustomException);
      expect(metadata).toContain(AnotherCustomException);
    });

    it('应该支持任意类型作为异常类型', () => {
      class ValidationError {
        constructor(public message: string) {}
      }

      class DatabaseError {
        constructor(public code: number, public message: string) {}
      }

      @Catch(ValidationError, DatabaseError)
      class TypedExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {
          // Test implementation
        }
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, TypedExceptionFilter);
      
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(2);
      expect(metadata).toContain(ValidationError);
      expect(metadata).toContain(DatabaseError);
    });
  });

  describe('装饰器应用', () => {
    it('装饰器应该是一个ClassDecorator', () => {
      const decorator = Catch(BadRequestException);
      
      // ClassDecorator 是一个函数
      expect(typeof decorator).toBe('function');
      
      // 应该能够应用到类上
      class TestFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }
      
      expect(() => decorator(TestFilter)).not.toThrow();
    });

    it('应该不影响类的其他属性和方法', () => {
      @Catch(BadRequestException)
      class CompleteExceptionFilter implements ExceptionFilter {
        public readonly name = 'CompleteExceptionFilter';
        private internalState = 'test';

        constructor(private config: string = 'default') {}

        catch(exception: BadRequestException, host: ArgumentsHost): void {
          // Handle exception
        }

        private handleSpecificCase(): void {
          // Private method
        }

        public getConfig(): string {
          return this.config;
        }
      }

      const instance = new CompleteExceptionFilter('custom');
      
      // 检查实例属性和方法
      expect(instance.name).toBe('CompleteExceptionFilter');
      expect(instance.getConfig()).toBe('custom');
      expect(typeof instance.catch).toBe('function');
      
      // 检查元数据是否正确设置
      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, CompleteExceptionFilter);
      expect(metadata).toEqual([BadRequestException]);
    });

    it('多个装饰器可以同时应用', () => {
      // 模拟其他装饰器
      function TestDecorator(value: string): ClassDecorator {
        return (target: any) => {
          Reflect.defineMetadata('test:metadata', value, target);
        };
      }

      @TestDecorator('test-value')
      @Catch(NotFoundException, BadRequestException)
      class MultiDecoratedFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      // 检查两个装饰器的元数据都存在
      const catchMetadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, MultiDecoratedFilter);
      const testMetadata = Reflect.getMetadata('test:metadata', MultiDecoratedFilter);
      
      expect(catchMetadata).toEqual([NotFoundException, BadRequestException]);
      expect(testMetadata).toBe('test-value');
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理重复的异常类型', () => {
      @Catch(BadRequestException, BadRequestException, NotFoundException, BadRequestException)
      class DuplicateExceptionFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, DuplicateExceptionFilter);
      
      // 元数据应该包含所有指定的类型（包括重复的）
      expect(metadata).toHaveLength(4);
      expect(metadata.filter((type: any) => type === BadRequestException)).toHaveLength(3);
      expect(metadata.filter((type: any) => type === NotFoundException)).toHaveLength(1);
    });

    it('应该处理undefined和null值', () => {
      // 虽然TypeScript不允许，但测试运行时行为
      @Catch(BadRequestException, undefined as any, null as any, NotFoundException)
      class NullValueFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, NullValueFilter);
      
      expect(metadata).toHaveLength(4);
      expect(metadata).toContain(BadRequestException);
      expect(metadata).toContain(undefined);
      expect(metadata).toContain(null);
      expect(metadata).toContain(NotFoundException);
    });

    it('装饰器应该支持继承', () => {
      @Catch(BadRequestException)
      class BaseFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      @Catch(NotFoundException)
      class ExtendedFilter extends BaseFilter {
        catch(exception: any, host: ArgumentsHost): void {
          super.catch(exception, host);
        }
      }

      const baseMetadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, BaseFilter);
      const extendedMetadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, ExtendedFilter);
      
      expect(baseMetadata).toEqual([BadRequestException]);
      expect(extendedMetadata).toEqual([NotFoundException]);
      
      // 确保子类有自己的元数据，不会覆盖父类
      expect(baseMetadata).not.toEqual(extendedMetadata);
    });
  });

  describe('元数据验证', () => {
    it('未使用@Catch装饰器的类不应该有元数据', () => {
      class UnDecoratedFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      const metadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, UnDecoratedFilter);
      
      expect(metadata).toBeUndefined();
    });

    it('应该正确获取元数据键', () => {
      @Catch(HttpException)
      class TestFilter implements ExceptionFilter {
        catch(exception: any, host: ArgumentsHost): void {}
      }

      // 验证元数据键的存在
      const hasMetadata = Reflect.hasMetadata(EXCEPTION_FILTER_METADATA, TestFilter);
      expect(hasMetadata).toBe(true);
      
      // 获取所有元数据键
      const metadataKeys = Reflect.getMetadataKeys(TestFilter);
      expect(metadataKeys).toContain(EXCEPTION_FILTER_METADATA);
    });

    it('元数据应该与常量值匹配', () => {
      expect(EXCEPTION_FILTER_METADATA).toBe('exception-filter:metadata');
    });
  });
}); 