import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Query, Param, Body, Headers, Req, Res, ROUTE_ARGS_METADATA } from '@rapidojs/common';
import { METADATA_KEY } from '../constants.js';
import { ParamType } from '@rapidojs/common';
import { PipeTransform, ArgumentMetadata } from '../pipes/pipe-transform.interface.js';
import { ParseIntPipe } from '../pipes/built-in.pipes.js';

// 自定义测试管道
class TestPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    return `transformed_${value}`;
  }
}

describe('参数装饰器边界情况', () => {
  describe('无 propertyKey 的情况', () => {
    it('Query 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Query('test');
      
      // 模拟没有 propertyKey 的情况（比如用在构造函数参数上）
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      // 应该没有设置任何元数据
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });

    it('Param 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Param('id');
      
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });

    it('Body 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Body();
      
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });

    it('Headers 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Headers('authorization');
      
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });

    it('Req 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Req();
      
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });

    it('Res 装饰器应该处理 undefined propertyKey', () => {
      const decorator = Res();
      
      expect(() => {
        decorator({}, undefined, 0);
      }).not.toThrow();
      
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, {}, undefined as any);
      expect(metadata).toBeUndefined();
    });
  });

  describe('Symbol propertyKey 支持', () => {
    it('应该支持 Symbol 作为 propertyKey', () => {
      const symbolKey = Symbol('testMethod');
      
      class TestController {
        [symbolKey](@Query('id') id: string) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, symbolKey);
      
      expect(metadata).toBeDefined();
      expect(Object.keys(metadata)).toHaveLength(1);
      expect(metadata[`${ParamType.QUERY}:0`]).toMatchObject({
        index: 0,
        type: ParamType.QUERY,
        data: 'id'
      });
    });

    it('Symbol 方法应该支持管道', () => {
      const symbolKey = Symbol('testMethod');
      const testPipe = new TestPipe();
      
      class TestController {
        [symbolKey](@Param('id', testPipe) id: string) {}
      }

      const paramMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, symbolKey);
      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, symbolKey);
      
      expect(paramMetadata).toBeDefined();
      expect(pipeMetadata).toBeDefined();
      expect(pipeMetadata[0]).toEqual([testPipe]);
    });
  });

  describe('多参数复杂场景', () => {
    it('应该正确处理混合类型的多个参数', () => {
      class TestController {
        complexMethod(
          @Param('id') id: string,
          @Query('page') page: string,
          @Body() body: any,
          @Headers('authorization') auth: string,
          @Req() request: any,
          @Res() response: any
        ) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'complexMethod');
      
      expect(metadata).toBeDefined();
      expect(Object.keys(metadata)).toHaveLength(6);
      
      // 验证每个参数的元数据
      expect(metadata[`${ParamType.PARAM}:0`]).toMatchObject({
        index: 0,
        type: ParamType.PARAM,
        data: 'id'
      });
      
      expect(metadata[`${ParamType.QUERY}:1`]).toMatchObject({
        index: 1,
        type: ParamType.QUERY,
        data: 'page'
      });
      
      expect(metadata[`${ParamType.BODY}:2`]).toMatchObject({
        index: 2,
        type: ParamType.BODY
      });
      
      expect(metadata[`${ParamType.HEADERS}:3`]).toMatchObject({
        index: 3,
        type: ParamType.HEADERS,
        data: 'authorization'
      });
      
      expect(metadata[`${ParamType.REQUEST}:4`]).toMatchObject({
        index: 4,
        type: ParamType.REQUEST
      });
      
      expect(metadata[`${ParamType.RESPONSE}:5`]).toMatchObject({
        index: 5,
        type: ParamType.RESPONSE
      });
    });

    it('应该正确处理带管道的多个参数', () => {
      const testPipe1 = new TestPipe();
      const testPipe2 = new ParseIntPipe();
      
      class TestController {
        pipeMethod(
          @Param('id', testPipe1) id: string,
          @Query('page', testPipe2) page: number,
          @Body() body: any
        ) {}
      }

      const paramMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'pipeMethod');
      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'pipeMethod');
      
      expect(Object.keys(paramMetadata)).toHaveLength(3);
      expect(pipeMetadata[0]).toEqual([testPipe1]);
      expect(pipeMetadata[1]).toEqual([testPipe2]);
      // Body 装饰器没有管道参数，所以 pipeMetadata[2] 应该是 undefined
      expect(pipeMetadata[2]).toBeUndefined();
    });
  });

  describe('重复装饰器应用', () => {
    it('应该正确累积多个参数的元数据', () => {
      class TestController {
        method1(@Query('q1') q1: string) {}
        method2(@Param('p1') p1: string, @Query('q2') q2: string) {}
      }

      const method1Metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method1');
      const method2Metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method2');
      
      expect(Object.keys(method1Metadata)).toHaveLength(1);
      expect(Object.keys(method2Metadata)).toHaveLength(2);
      
      // 确保方法间元数据不会相互影响
      expect(method1Metadata[`${ParamType.QUERY}:0`].data).toBe('q1');
      expect(method2Metadata[`${ParamType.PARAM}:0`].data).toBe('p1');
      expect(method2Metadata[`${ParamType.QUERY}:1`].data).toBe('q2');
    });
  });

  describe('装饰器工厂函数', () => {
    it('Query 工厂应该支持无参数调用', () => {
      class TestController {
        method(@Query() query: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(1);
      expect(metadata[`${ParamType.QUERY}:0`]).toMatchObject({
        index: 0,
        type: ParamType.QUERY,
        data: undefined
      });
    });

    it('Param 工厂应该支持无参数调用', () => {
      class TestController {
        method(@Param() param: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(1);
      expect(metadata[`${ParamType.PARAM}:0`]).toMatchObject({
        index: 0,
        type: ParamType.PARAM,
        data: undefined
      });
    });

    it('Headers 工厂应该支持无参数调用', () => {
      class TestController {
        method(@Headers() headers: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(1);
      expect(metadata[`${ParamType.HEADERS}:0`]).toMatchObject({
        index: 0,
        type: ParamType.HEADERS,
        data: undefined
      });
    });

    it('Body 工厂应该支持无参数调用', () => {
      class TestController {
        method(@Body() body: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(1);
      expect(metadata[`${ParamType.BODY}:0`]).toMatchObject({
        index: 0,
        type: ParamType.BODY,
        data: undefined
      });
    });
  });

  describe('管道支持的边界情况', () => {
    it('应该支持管道构造函数', () => {
      class TestController {
        method(@Query('id', ParseIntPipe) id: number) {}
      }

      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method');
      
      expect(pipeMetadata).toBeDefined();
      expect(pipeMetadata[0]).toEqual([ParseIntPipe]);
    });

    it('应该支持管道实例', () => {
      const pipeInstance = new TestPipe();
      
      class TestController {
        method(@Query('value', pipeInstance) value: any) {}
      }

      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method');
      
      expect(pipeMetadata).toBeDefined();
      expect(pipeMetadata[0]).toEqual([pipeInstance]);
    });

    it('应该处理 undefined 管道', () => {
      class TestController {
        method(@Query('value', undefined as any) value: any) {}
      }

      const paramMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method');
      
      expect(paramMetadata).toBeDefined();
      // undefined 会被当作有效的管道参数存储
      expect(pipeMetadata).toBeDefined();
      expect(pipeMetadata[0]).toEqual([undefined]);
    });

    it('Body 装饰器应该支持管道参数', () => {
      const testPipe = new TestPipe();
      
      class TestController {
        method(@Body(testPipe) body: any) {}
      }

      const paramMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'method');
      
      expect(paramMetadata[`${ParamType.BODY}:0`]).toMatchObject({
        index: 0,
        type: ParamType.BODY,
        data: undefined
      });
      expect(pipeMetadata[0]).toEqual([testPipe]);
    });
  });

  describe('特殊键值', () => {
    it('应该支持空字符串作为键', () => {
      class TestController {
        method(@Query('') query: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(metadata[`${ParamType.QUERY}:0`].data).toBe('');
    });

    it('应该支持数字字符串作为键', () => {
      class TestController {
        method(@Param('123') param: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(metadata[`${ParamType.PARAM}:0`].data).toBe('123');
    });

    it('应该支持包含特殊字符的键', () => {
      class TestController {
        method(@Headers('x-custom-header') header: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(metadata[`${ParamType.HEADERS}:0`].data).toBe('x-custom-header');
    });

    it('应该支持 Unicode 字符的键', () => {
      class TestController {
        method(@Query('用户名') username: any) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(metadata[`${ParamType.QUERY}:0`].data).toBe('用户名');
    });
  });

  describe('继承场景', () => {
    it('子类应该继承父类的参数元数据', () => {
      class BaseController {
        baseMethod(@Query('base') base: string) {}
      }

      class ExtendedController extends BaseController {
        extendedMethod(@Param('id') id: string) {}
      }

      const baseMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, BaseController, 'baseMethod');
      const extendedMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, ExtendedController, 'extendedMethod');
      
      expect(baseMetadata).toBeDefined();
      expect(extendedMetadata).toBeDefined();
      expect(baseMetadata[`${ParamType.QUERY}:0`].data).toBe('base');
      expect(extendedMetadata[`${ParamType.PARAM}:0`].data).toBe('id');
    });

    it('子类可以重写父类方法的参数装饰器', () => {
      class BaseController {
        baseMethod(@Query('base') param: string) {}
      }

      class ExtendedController extends BaseController {
        extendedMethod(@Param('override') param: string) {}
      }

      const baseMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, BaseController, 'baseMethod');
      const extendedMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, ExtendedController, 'extendedMethod');
      
      expect(baseMetadata).toBeDefined();
      expect(baseMetadata[`${ParamType.QUERY}:0`].type).toBe(ParamType.QUERY);
      expect(baseMetadata[`${ParamType.QUERY}:0`].data).toBe('base');
      
      expect(extendedMetadata).toBeDefined();
      expect(extendedMetadata[`${ParamType.PARAM}:0`].type).toBe(ParamType.PARAM);
      expect(extendedMetadata[`${ParamType.PARAM}:0`].data).toBe('override');
    });
  });

  describe('元数据完整性', () => {
    it('参数索引应该正确对应', () => {
      class TestController {
        method(
          @Param('id') id: string,    // index 0
          ordinary: string,           // index 1 - 无装饰器
          @Query('page') page: string // index 2
        ) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(2); // 只有装饰器的参数有元数据
      expect(metadata[`${ParamType.PARAM}:0`]?.data).toBe('id');
      expect(metadata[`${ParamType.QUERY}:2`]?.data).toBe('page');
      expect(metadata[`${ParamType.PARAM}:1`]).toBeUndefined(); // 无装饰器的参数
    });

    it('元数据应该包含正确的参数信息', () => {
      class TestController {
        method(
          @Query('a') a: string,
          @Param('b') b: string,
          @Body() c: any
        ) {}
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'method');
      
      expect(Object.keys(metadata)).toHaveLength(3);
      
      // 验证对应索引的参数
      expect(metadata[`${ParamType.QUERY}:0`]).toMatchObject({ index: 0, type: ParamType.QUERY, data: 'a' });
      expect(metadata[`${ParamType.PARAM}:1`]).toMatchObject({ index: 1, type: ParamType.PARAM, data: 'b' });
      expect(metadata[`${ParamType.BODY}:2`]).toMatchObject({ index: 2, type: ParamType.BODY });
    });
  });
});