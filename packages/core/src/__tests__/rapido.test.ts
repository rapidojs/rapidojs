import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module, Get, Post, Put, Delete, Query, Param, Body, Headers, Req, Res } from '../decorators/index.js';
import { Controller } from '../decorators/index.js';

// 测试控制器
@Controller('/test')
class TestController {
  @Get('/hello')
  getHello(): string {
    return 'Hello World!';
  }

  @Get('/greet')
  greet(@Query('name') name: string): string {
    return `Hello, ${name || 'Guest'}!`;
  }

  @Get('/users/:id')
  getUser(@Param('id') id: string): object {
    return { userId: id, message: 'User found' };
  }

  @Post('/users')
  createUser(@Body() user: any): object {
    return { message: 'User created', data: user };
  }

  @Put('/users/:id')
  updateUser(@Param('id') id: string, @Body() user: any): object {
    return { message: 'User updated', userId: id, data: user };
  }

  @Delete('/users/:id')
  deleteUser(@Param('id') id: string): object {
    return { message: 'User deleted', userId: id };
  }

  @Get('/headers')
  getHeaders(@Headers('authorization') auth: string): object {
    return { authorization: auth || 'No auth header' };
  }

  @Get('/request-info')
  getRequestInfo(@Req request: any): object {
    return { 
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'] || 'Unknown'
    };
  }

  @Get('/multiple-params')
  multipleParams(
    @Query('name') name: string,
    @Query('age') age: string,
    @Headers('x-custom') custom: string
  ): object {
    return { name, age, custom };
  }
}

describe('Rapido.js Core Framework', () => {
  let app: FastifyInstance;

  describe('Basic Route Decorators', () => {
    beforeEach(async () => {
      @Module({ controllers: [TestController] })
      class TestModule {}
      app = await RapidoFactory.create(TestModule);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
    it('should handle GET requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Hello World!');
    });

    it('should handle POST requests', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      
      const response = await app.inject({
        method: 'POST',
        url: '/test/users',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.message).toBe('User created');
      expect(result.data).toEqual(userData);
    });

    it('should handle PUT requests', async () => {
      const userData = { name: 'Jane', email: 'jane@example.com' };
      
      const response = await app.inject({
        method: 'PUT',
        url: '/test/users/123',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.message).toBe('User updated');
      expect(result.userId).toBe('123');
      expect(result.data).toEqual(userData);
    });

    it('should handle DELETE requests', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/test/users/456'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.message).toBe('User deleted');
      expect(result.userId).toBe('456');
    });
  });

  describe('Parameter Decorators', () => {
    beforeEach(async () => {
      @Module({ controllers: [TestController] })
      class TestModule {}
      app = await RapidoFactory.create(TestModule);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
    it('should extract query parameters with @Query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/greet?name=Alice'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Hello, Alice!');
    });

    it('should handle missing query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/greet'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Hello, Guest!');
    });

    it('should extract path parameters with @Param', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/users/789'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.userId).toBe('789');
      expect(result.message).toBe('User found');
    });

    it('should extract request body with @Body', async () => {
      const userData = { name: 'Bob', age: 30 };
      
      const response = await app.inject({
        method: 'POST',
        url: '/test/users',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.data).toEqual(userData);
    });

    it('should extract headers with @Headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/headers',
        headers: {
          'authorization': 'Bearer token123'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.authorization).toBe('Bearer token123');
    });

    it('should handle missing headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/headers'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.authorization).toBe('No auth header');
    });

    it('should provide access to request object with @Req', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/request-info',
        headers: {
          'user-agent': 'Test Agent'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.method).toBe('GET');
      expect(result.url).toBe('/test/request-info');
      expect(result.userAgent).toBe('Test Agent');
    });

    it('should handle multiple parameter decorators', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/multiple-params?name=Charlie&age=25',
        headers: {
          'x-custom': 'custom-value'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.name).toBe('Charlie');
      expect(result.age).toBe('25');
      expect(result.custom).toBe('custom-value');
    });
  });

  describe('Controller Prefix', () => {
    beforeEach(async () => {
      @Controller('/prefixed')
      class PrefixedController {
        @Get('/route')
        getRoute() { return 'prefixed route'; }
      }

      @Module({ controllers: [PrefixedController] })
      class TestModule {}
      app = await RapidoFactory.create(TestModule);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
    it('should apply controller prefix to all routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/prefixed/route'
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('prefixed route');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      @Module({ controllers: [TestController] })
      class TestModule {}
      app = await RapidoFactory.create(TestModule);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
    it('should return 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for wrong HTTP method', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/hello'  // 这个路由只支持 GET
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
