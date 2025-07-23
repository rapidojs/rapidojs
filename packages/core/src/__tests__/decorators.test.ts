import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { METADATA_KEY } from '../constants.js';
import { Controller } from '../decorators/index.js';
import { Get, Post, Put, Delete } from '../decorators/index.js';
import { Query, Param, Body, Headers, Req, Res } from '../decorators/index.js';
import { RouteDefinition, ParamDefinition, ParamType } from '../types.js';

describe('Decorators Metadata', () => {
  describe('Route Decorators', () => {
    it('should store controller prefix metadata', () => {
      @Controller('/api/v1')
      class TestController {}

      const prefix = Reflect.getMetadata(METADATA_KEY.CONTROLLER_PREFIX, TestController);
      expect(prefix).toBe('/api/v1');
    });

    it('should store route metadata for GET decorator', () => {
      @Controller('/test')
      class TestController {
        @Get('/users')
        getUsers() {}

        @Get()
        getRoot() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA_KEY.ROUTES, TestController);
      
      expect(routes).toHaveLength(2);
      expect(routes[0]).toEqual({
        path: '/users',
        method: 'GET',
        methodName: 'getUsers'
      });
      expect(routes[1]).toEqual({
        path: '/',
        method: 'GET',
        methodName: 'getRoot'
      });
    });

    it('should store route metadata for all HTTP methods', () => {
      @Controller('/test')
      class TestController {
        @Get('/get')
        getMethod() {}

        @Post('/post')
        postMethod() {}

        @Put('/put')
        putMethod() {}

        @Delete('/delete')
        deleteMethod() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA_KEY.ROUTES, TestController);
      
      expect(routes).toHaveLength(4);
      
      const methods = routes.map(r => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });
  });

  describe('Parameter Decorators', () => {
    it('should store Query parameter metadata', () => {
      class TestController {
        testMethod(@Query('name') name: string) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.QUERY,
        key: 'name'
      });
    });

    it('should store Param parameter metadata', () => {
      class TestController {
        testMethod(@Param('id') id: string) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.PARAM,
        key: 'id'
      });
    });

    it('should store Body parameter metadata', () => {
      class TestController {
        testMethod(@Body() user: any) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.BODY,
        key: undefined
      });
    });

    it('should store Headers parameter metadata', () => {
      class TestController {
        testMethod(@Headers('authorization') auth: string) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.HEADERS,
        key: 'authorization'
      });
    });

    it('should store Req parameter metadata', () => {
      class TestController {
        testMethod(@Req request: any) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.REQUEST,
        key: undefined
      });
    });

    it('should store Res parameter metadata', () => {
      class TestController {
        testMethod(@Res response: any) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        index: 0,
        type: ParamType.RESPONSE,
        key: undefined
      });
    });

    it('should store multiple parameter metadata in correct order', () => {
      class TestController {
        testMethod(
          @Query('name') name: string,
          @Param('id') id: string,
          @Body() user: any,
          @Headers('auth') auth: string
        ) {}
      }

      const params: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod'
      );

      expect(params).toHaveLength(4);
      
      // 装饰器从右到左执行，但我们需要按索引排序来验证
      const sortedParams = params.sort((a, b) => a.index - b.index);
      
      expect(sortedParams[0]).toEqual({
        index: 0,
        type: ParamType.QUERY,
        key: 'name'
      });
      
      expect(sortedParams[1]).toEqual({
        index: 1,
        type: ParamType.PARAM,
        key: 'id'
      });
      
      expect(sortedParams[2]).toEqual({
        index: 2,
        type: ParamType.BODY,
        key: undefined
      });
      
      expect(sortedParams[3]).toEqual({
        index: 3,
        type: ParamType.HEADERS,
        key: 'auth'
      });
    });

    it('should handle optional keys in decorators', () => {
      class TestController {
        testMethod1(@Query() query: any) {}
        testMethod2(@Headers() headers: any) {}
      }

      const params1: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod1'
      );

      const params2: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'testMethod2'
      );

      expect(params1[0]).toEqual({
        index: 0,
        type: ParamType.QUERY,
        key: undefined
      });

      expect(params2[0]).toEqual({
        index: 0,
        type: ParamType.HEADERS,
        key: undefined
      });
    });
  });

  describe('Combined Decorators', () => {
    it('should store both route and parameter metadata', () => {
      @Controller('/api')
      class TestController {
        @Get('/users/:id')
        getUser(@Param('id') id: string, @Query('include') include: string) {}

        @Post('/users')
        createUser(@Body() user: any) {}
      }

      // 验证控制器前缀
      const prefix = Reflect.getMetadata(METADATA_KEY.CONTROLLER_PREFIX, TestController);
      expect(prefix).toBe('/api');

      // 验证路由元数据
      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA_KEY.ROUTES, TestController);
      expect(routes).toHaveLength(2);

      // 验证参数元数据
      const getUserParams: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'getUser'
      );
      expect(getUserParams).toHaveLength(2);

      const createUserParams: ParamDefinition[] = Reflect.getMetadata(
        METADATA_KEY.PARAMS, 
        TestController.prototype, 
        'createUser'
      );
      expect(createUserParams).toHaveLength(1);
    });
  });
});
