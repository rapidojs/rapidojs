import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ParseIntPipe, ParseBoolPipe, ParseArrayPipe } from '../pipes/built-in.pipes.js';
import { Param, Query } from '../decorators/param.decorators.js';
import { METADATA_KEY } from '../constants.js';

// 测试用的控制器类
class TestController {
  // NestJS 风格的参数装饰器
  testMethod(
    @Param('id', ParseIntPipe) id: number,
    @Query('active', ParseBoolPipe) active: boolean,
    @Query('tags', ParseArrayPipe) tags: string[]
  ) {
    return { id, active, tags };
  }

  // 混合使用
  mixedMethod(
    @Param('userId') userId: string,
    @Query('limit', ParseIntPipe) limit: number
  ) {
    return { userId, limit };
  }
}

describe('NestJS Style Pipes', () => {
  describe('Parameter Decorators with Pipes', () => {
    it('should store pipe metadata correctly', () => {
      const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'testMethod');
      
      expect(paramPipes).toBeDefined();
      expect(paramPipes[0]).toEqual([ParseIntPipe]);
      expect(paramPipes[1]).toEqual([ParseBoolPipe]);
      expect(paramPipes[2]).toEqual([ParseArrayPipe]);
    });

    it('should store parameter metadata correctly', () => {
      const params = Reflect.getMetadata(METADATA_KEY.PARAMS, TestController.prototype, 'testMethod');
      
      expect(params).toBeDefined();
      expect(params).toHaveLength(3);
      
      // 按索引排序
      const sortedParams = params.sort((a: any, b: any) => a.index - b.index);
      
      expect(sortedParams[0]).toMatchObject({
        index: 0,
        type: 'param',
        key: 'id'
      });
      
      expect(sortedParams[1]).toMatchObject({
        index: 1,
        type: 'query',
        key: 'active'
      });
      
      expect(sortedParams[2]).toMatchObject({
        index: 2,
        type: 'query',
        key: 'tags'
      });
    });

    it('should handle mixed usage correctly', () => {
      const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, TestController.prototype, 'mixedMethod');
      const params = Reflect.getMetadata(METADATA_KEY.PARAMS, TestController.prototype, 'mixedMethod');
      
      expect(params).toHaveLength(2);
      expect(paramPipes[0]).toBeUndefined(); // userId 没有管道
      expect(paramPipes[1]).toEqual([ParseIntPipe]); // limit 有管道
    });
  });

  describe('Pipe Instances', () => {
    it('should create pipe instances correctly', () => {
      const parseIntPipe = new ParseIntPipe();
      const parseBoolPipe = new ParseBoolPipe();
      const parseArrayPipe = new ParseArrayPipe();
      
      expect(parseIntPipe).toBeInstanceOf(ParseIntPipe);
      expect(parseBoolPipe).toBeInstanceOf(ParseBoolPipe);
      expect(parseArrayPipe).toBeInstanceOf(ParseArrayPipe);
      
      // 测试管道功能
      expect(parseIntPipe.transform('123', { type: 'param', data: 'id' })).toBe(123);
      expect(parseBoolPipe.transform('true', { type: 'query', data: 'active' })).toBe(true);
      expect(parseArrayPipe.transform('a,b,c', { type: 'query', data: 'tags' })).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Error Handling', () => {
    it('should throw meaningful errors for invalid input', () => {
      const parseIntPipe = new ParseIntPipe();
      const parseBoolPipe = new ParseBoolPipe();
      
      expect(() => parseIntPipe.transform('abc', { type: 'param', data: 'id' }))
        .toThrow('Validation failed (numeric string is expected). Received: abc');
      
      expect(() => parseBoolPipe.transform('maybe', { type: 'query', data: 'active' }))
        .toThrow('Validation failed (boolean string is expected). Received: maybe');
    });
  });
});
