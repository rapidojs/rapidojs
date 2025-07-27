import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ParseIntPipe, ParseBoolPipe, ParseArrayPipe } from '../pipes/built-in.pipes.js';
import { Param, Query, ROUTE_ARGS_METADATA, ParamType, Body, Headers } from '@rapidojs/common';
import { METADATA_KEY } from '../constants.js';

// 简化的测试用控制器类
class TestController {
  // 测试不带管道的基本用法
  basicMethod(
    @Param('id') id: string,
    @Query('limit') limit: string
  ) {
    return { id, limit };
  }
  
  // TODO: 先暂时注释掉管道测试
  // testMethod(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Query('active', ParseBoolPipe) active: boolean,
  //   @Query('tags', ParseArrayPipe) tags: string[]
  // ) {
  //   return { id, active, tags };
  // }
}

describe('NestJS Style Pipes', () => {
  describe('Parameter Decorators with Pipes', () => {
    it('should store basic parameter metadata correctly', () => {
      const params = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'basicMethod');
      
      console.log('params:', params);
      expect(params).toBeDefined();
      // expect(Object.keys(params)).toHaveLength(2);
    });

    it('should store pipe metadata correctly', () => {
      // 创建一个简单的测试控制器来验证管道功能
      class TestPipeController {
        testMethod(
          @Param('id', ParseIntPipe) id: number
        ) {
          return { id };
        }
      }

      const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestPipeController.prototype, 'testMethod');
      
      console.log('paramPipes:', paramPipes);
      expect(paramPipes).toBeDefined();
      expect(paramPipes[0]).toEqual([ParseIntPipe]);
    });

    it('should store parameter metadata correctly', () => {
      // 创建测试控制器
      class TestController {
        testMethod(
          @Param('id', ParseIntPipe) id: number,
          @Query('active', ParseBoolPipe) active: boolean,
          @Query('tags', ParseArrayPipe) tags: string[]
        ) {
          return { id, active, tags };
        }
      }

      const params = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'testMethod');
      
      expect(params).toBeDefined();
      expect(Object.keys(params)).toHaveLength(3);
      
      // 验证参数元数据
      expect(params[`${ParamType.PARAM}:0`]).toMatchObject({
        index: 0,
        type: ParamType.PARAM,
        data: 'id'
      });
      
      expect(params[`${ParamType.QUERY}:1`]).toMatchObject({
        index: 1,
        type: ParamType.QUERY,
        data: 'active'
      });

      expect(params[`${ParamType.QUERY}:2`]).toMatchObject({
        index: 2,
        type: ParamType.QUERY,
        data: 'tags'
      });
    });

    it('should handle mixed usage correctly', () => {
      class TestController {
        mixedMethod(
          @Param('id') id: string,  // 无管道
          @Query('page', ParseIntPipe) page: number,  // 有管道
          @Body() body: any,  // 无管道
          @Headers('authorization') auth: string  // 无管道
        ) {
          return { id, page, body, auth };
        }
      }

      const params = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'mixedMethod');
      const pipeMetadata = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'mixedMethod');
      
      expect(Object.keys(params)).toHaveLength(4);
      
      // 只有 page 参数有管道
      expect(pipeMetadata[1]).toEqual([ParseIntPipe]);
      expect(pipeMetadata[0]).toBeUndefined();
      expect(pipeMetadata[2]).toBeUndefined();
      expect(pipeMetadata[3]).toBeUndefined();
    });
  });

  describe('Pipe Instances', () => {
    it('should create pipe instances correctly', () => {
      const pipe = new ParseIntPipe();
      expect(pipe).toBeInstanceOf(ParseIntPipe);
      expect(typeof pipe.transform).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw meaningful errors for invalid input', () => {
      const pipe = new ParseIntPipe();
      expect(() => pipe.transform('invalid', { type: 'param' })).toThrow();
    });
  });
});
