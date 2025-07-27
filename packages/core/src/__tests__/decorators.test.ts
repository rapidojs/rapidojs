import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Controller, Get, Post, Query, Param, Body, Headers, Req, Res, MODULE_METADATA_KEY, ROUTE_ARGS_METADATA, ParamType, ModuleMetadata } from '@rapidojs/common';

describe('Decorators', () => {
  describe('@Controller and Route Decorators', () => {
    it('should store unified metadata for controller and routes', () => {
      @Controller('/api')
      class TestController {
        @Get('/users')
        getUsers() {}
        @Post('/users')
        createUsers() {}
      }
      const metadata: ModuleMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, TestController);
      expect(metadata).toBeDefined();
      expect(metadata.prefix).toBe('/api');
      expect(metadata.routes).toBeDefined();
      expect(metadata.routes).toHaveLength(2);
      expect(metadata.routes![0].path).toBe('/users');
      expect(metadata.routes![0].method).toBe('GET');
    });
  });

  describe('Parameter Decorators', () => {
    it('should store unified metadata for all parameter types', () => {
      class TestController {
        testMethod(
          @Query('q') searchTerm: string,
          @Param('id') id: string,
          @Body() body: any,
          @Headers('Content-Type') contentType: string,
          @Req() req: any,
          @Res() res: any,
        ) {}
      }
      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'testMethod');
      expect(Object.keys(metadata)).toHaveLength(6);

      expect(metadata[`${ParamType.QUERY}:0`]).toMatchObject({ type: ParamType.QUERY, data: 'q' });
      expect(metadata[`${ParamType.PARAM}:1`]).toMatchObject({ type: ParamType.PARAM, data: 'id' });
      expect(metadata[`${ParamType.BODY}:2`]).toMatchObject({ type: ParamType.BODY });
      expect(metadata[`${ParamType.HEADERS}:3`]).toMatchObject({ type: ParamType.HEADERS, data: 'Content-Type' });
      expect(metadata[`${ParamType.REQUEST}:4`]).toMatchObject({ type: ParamType.REQUEST });
      expect(metadata[`${ParamType.RESPONSE}:5`]).toMatchObject({ type: ParamType.RESPONSE });
    });
  });
});
