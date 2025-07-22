import { describe, it, expect } from 'vitest';
import { 
  UsePipes,
  QueryWithPipe,
  ParamWithPipe,
  BodyWithPipe,
  PipeMetadata 
} from '../decorators/pipe.decorators.js';
import { METADATA_KEY } from '../constants.js';
import { PipeTransform, ArgumentMetadata } from '../pipes/pipe-transform.interface.js';
import {
  ParseIntPipe,
  ParseFloatPipe,
  ParseBoolPipe,
  ParseUUIDPipe,
  ParseArrayPipe
} from '../pipes/built-in.pipes.js';

// 自定义测试管道
class TestPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    return `transformed_${value}`;
  }
}

class AsyncTestPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => resolve(`async_${value}`), 10);
    });
  }
}

class ValidationPipe implements PipeTransform {
  constructor(private schema?: any) {}
  
  transform(value: any, metadata: ArgumentMetadata): any {
    if (this.schema && typeof value !== this.schema) {
      throw new Error(`Expected ${this.schema}, got ${typeof value}`);
    }
    return value;
  }
}

describe('管道装饰器', () => {
  describe('@UsePipes 装饰器', () => {
    describe('方法级管道', () => {
      it('应该正确设置单个管道的元数据', () => {
        class TestController {
          @UsePipes(new TestPipe())
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(Array.isArray(metadata)).toBe(true);
        expect(metadata).toHaveLength(1);
        expect(metadata[0]).toBeInstanceOf(TestPipe);
      });

      it('应该正确设置多个管道的元数据', () => {
        const testPipe = new TestPipe();
        const asyncPipe = new AsyncTestPipe();
        const validationPipe = new ValidationPipe('string');

        class TestController {
          @UsePipes(testPipe, asyncPipe, validationPipe)
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata).toHaveLength(3);
        expect(metadata[0]).toBe(testPipe);
        expect(metadata[1]).toBe(asyncPipe);
        expect(metadata[2]).toBe(validationPipe);
      });

      it('应该支持管道构造函数', () => {
        class TestController {
          @UsePipes(TestPipe, AsyncTestPipe)
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata).toHaveLength(2);
        expect(metadata[0]).toBe(TestPipe);
        expect(metadata[1]).toBe(AsyncTestPipe);
      });

      it('应该支持混合管道实例和构造函数', () => {
        const testPipeInstance = new TestPipe();

        class TestController {
          @UsePipes(testPipeInstance, AsyncTestPipe, ParseIntPipe)
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata).toHaveLength(3);
        expect(metadata[0]).toBe(testPipeInstance);
        expect(metadata[1]).toBe(AsyncTestPipe);
        expect(metadata[2]).toBe(ParseIntPipe);
      });
    });

    describe('类级管道', () => {
      it('应该正确设置类级管道的元数据', () => {
        @UsePipes(new TestPipe(), new ValidationPipe())
        class TestController {
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController);
        
        expect(metadata).toBeDefined();
        expect(metadata).toHaveLength(2);
        expect(metadata[0]).toBeInstanceOf(TestPipe);
        expect(metadata[1]).toBeInstanceOf(ValidationPipe);
      });

      it('类级和方法级管道应该独立存储', () => {
        @UsePipes(new TestPipe())
        class TestController {
          @UsePipes(new AsyncTestPipe())
          testMethod() {}
        }

        const classMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController);
        const methodMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(classMetadata).toHaveLength(1);
        expect(classMetadata[0]).toBeInstanceOf(TestPipe);
        
        expect(methodMetadata).toHaveLength(1);
        expect(methodMetadata[0]).toBeInstanceOf(AsyncTestPipe);
      });
    });

    describe('内置管道支持', () => {
      it('应该支持所有内置管道', () => {
        class TestController {
          @UsePipes(
            new ParseIntPipe(),
            new ParseFloatPipe(),
            new ParseBoolPipe(),
            new ParseUUIDPipe(),
            new ParseArrayPipe()
          )
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toHaveLength(5);
        expect(metadata[0]).toBeInstanceOf(ParseIntPipe);
        expect(metadata[1]).toBeInstanceOf(ParseFloatPipe);
        expect(metadata[2]).toBeInstanceOf(ParseBoolPipe);
        expect(metadata[3]).toBeInstanceOf(ParseUUIDPipe);
        expect(metadata[4]).toBeInstanceOf(ParseArrayPipe);
      });
    });
  });

  describe('参数级管道装饰器', () => {
    describe('@QueryWithPipe', () => {
      it('应该正确设置查询参数管道元数据', () => {
        class TestController {
          testMethod(
            @QueryWithPipe('page', new ParseIntPipe()) page: number,
            @QueryWithPipe('limit', new ParseIntPipe()) limit: number
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(ParseIntPipe);
        expect(metadata[1]).toHaveLength(1);
        expect(metadata[1][0]).toBeInstanceOf(ParseIntPipe);
      });

      it('应该支持多个管道', () => {
        class TestController {
          testMethod(
            @QueryWithPipe('search', new TestPipe(), new ValidationPipe('string')) search: string
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(2);
        expect(metadata[0][0]).toBeInstanceOf(TestPipe);
        expect(metadata[0][1]).toBeInstanceOf(ValidationPipe);
      });

      it('应该处理无键的查询参数', () => {
        class TestController {
          testMethod(
            @QueryWithPipe(undefined, new ParseBoolPipe()) enabled: boolean
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(ParseBoolPipe);
      });
    });

    describe('@ParamWithPipe', () => {
      it('应该正确设置路径参数管道元数据', () => {
        class TestController {
          testMethod(
            @ParamWithPipe('id', new ParseIntPipe()) id: number,
            @ParamWithPipe('uuid', new ParseUUIDPipe()) uuid: string
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(ParseIntPipe);
        expect(metadata[1]).toHaveLength(1);
        expect(metadata[1][0]).toBeInstanceOf(ParseUUIDPipe);
      });

      it('应该支持无键的路径参数', () => {
        class TestController {
          testMethod(
            @ParamWithPipe(undefined, new TestPipe()) param: any
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(TestPipe);
      });
    });

    describe('@BodyWithPipe', () => {
      it('应该正确设置请求体管道元数据', () => {
        class TestController {
          testMethod(
            @BodyWithPipe(new ValidationPipe(), new TestPipe()) body: any
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(2);
        expect(metadata[0][0]).toBeInstanceOf(ValidationPipe);
        expect(metadata[0][1]).toBeInstanceOf(TestPipe);
      });

      it('应该支持单个管道', () => {
        class TestController {
          testMethod(
            @BodyWithPipe(new TestPipe()) body: any
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(TestPipe);
      });
    });

    describe('混合参数管道', () => {
      it('应该正确处理混合参数管道', () => {
        class TestController {
          testMethod(
            @ParamWithPipe('id', new ParseIntPipe()) id: number,
            @QueryWithPipe('filter', new TestPipe()) filter: string,
            @BodyWithPipe(new ValidationPipe()) body: any
          ) {}
        }

        const metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
        
        expect(metadata).toBeDefined();
        expect(metadata[0]).toHaveLength(1);
        expect(metadata[0][0]).toBeInstanceOf(ParseIntPipe);
        expect(metadata[1]).toHaveLength(1);
        expect(metadata[1][0]).toBeInstanceOf(TestPipe);
        expect(metadata[2]).toHaveLength(1);
        expect(metadata[2][0]).toBeInstanceOf(ValidationPipe);
      });
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空管道数组', () => {
      class TestController {
        @UsePipes()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
      
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toHaveLength(0);
    });

    it('应该处理 undefined 和 null 管道', () => {
      class TestController {
        @UsePipes(undefined as any, new TestPipe(), null as any)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'testMethod');
      
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(3);
      expect(metadata[0]).toBeUndefined();
      expect(metadata[1]).toBeInstanceOf(TestPipe);
      expect(metadata[2]).toBeNull();
    });

    it('装饰器应该支持继承', () => {
      @UsePipes(new TestPipe())
      class BaseController {
        @UsePipes(new ParseIntPipe())
        baseMethod() {}
      }

      @UsePipes(new AsyncTestPipe())
      class ExtendedController extends BaseController {
        @UsePipes(new ParseBoolPipe())
        extendedMethod() {}
      }

      const baseClassMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, BaseController);
      const extendedClassMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, ExtendedController);
      const baseMethodMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, BaseController.prototype, 'baseMethod');
      const extendedMethodMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, ExtendedController.prototype, 'extendedMethod');

      expect(baseClassMetadata[0]).toBeInstanceOf(TestPipe);
      expect(extendedClassMetadata[0]).toBeInstanceOf(AsyncTestPipe);
      expect(baseMethodMetadata[0]).toBeInstanceOf(ParseIntPipe);
      expect(extendedMethodMetadata[0]).toBeInstanceOf(ParseBoolPipe);
    });

    it('应该正确处理多方法的参数管道', () => {
      class TestController {
        method1(
          @ParamWithPipe('id', new ParseIntPipe()) id: number
        ) {}

        method2(
          @QueryWithPipe('page', new ParseIntPipe()) page: number
        ) {}
      }

      const method1Metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method1');
      const method2Metadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method2');

      expect(method1Metadata[0][0]).toBeInstanceOf(ParseIntPipe);
      expect(method2Metadata[0][0]).toBeInstanceOf(ParseIntPipe);
      
      // 确保两个方法的元数据是独立的
      expect(method1Metadata).not.toBe(method2Metadata);
    });
  });

  describe('元数据验证', () => {
    it('未使用管道装饰器的方法不应该有元数据', () => {
      class TestController {
        normalMethod() {}
      }

      const pipesMetadata = Reflect.getMetadata(METADATA_KEY.PIPES, TestController.prototype, 'normalMethod');
      const paramPipesMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'normalMethod');
      
      expect(pipesMetadata).toBeUndefined();
      expect(paramPipesMetadata).toBeUndefined();
    });

    it('应该正确获取元数据键', () => {
      @UsePipes(new TestPipe())
      class TestController {
        @UsePipes(new ParseIntPipe())
        testMethod(
          @ParamWithPipe('id', new ParseIntPipe()) id: number
        ) {}
      }

      const classMetadataKeys = Reflect.getMetadataKeys(TestController);
      const methodMetadataKeys = Reflect.getMetadataKeys(TestController.prototype, 'testMethod');

      expect(classMetadataKeys).toContain(METADATA_KEY.PIPES);
      expect(methodMetadataKeys).toContain(METADATA_KEY.PIPES);
      expect(methodMetadataKeys).toContain(METADATA_KEY.PARAM_PIPES);
    });

    it('元数据应该与常量值匹配', () => {
      expect(METADATA_KEY.PIPES).toBe(Symbol.for('rapido:pipes'));
      expect(METADATA_KEY.PARAM_PIPES).toBe(Symbol.for('rapido:param_pipes'));
    });
  });
}); 