import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { DIContainer } from '../di/container.js';
import { ControllerRegistrar } from '../factory/controller-registrar.js';
import { Controller } from '../decorators/controller.decorator.js';
import { Get, Post } from '../decorators/route.decorators.js';
import { Query, Param, Body } from '../decorators/param.decorators.js';

describe('ControllerRegistrar', () => {
  let app: FastifyInstance;
    let registrar: ControllerRegistrar;
  let container: DIContainer;

  beforeEach(async () => {
    app = fastify();
        container = new DIContainer();
    registrar = new ControllerRegistrar(app, container);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Route Registration', () => {
    it('should register simple routes', async () => {
      @Controller('/test')
      class TestController {
        @Get('/hello')
        getHello(): string {
          return 'Hello World!';
        }
      }

      
      await registrar.register([TestController]);
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Hello World!');
    });

    it('should handle root path correctly', async () => {
      @Controller('/')
      class RootController {
        @Get('/')
        getRoot(): string {
          return 'Root';
        }

        @Get('/health')
        getHealth(): string {
          return 'OK';
        }
      }

      
      await registrar.register([RootController]);
      await app.ready();

      const rootResponse = await app.inject({
        method: 'GET',
        url: '/'
      });

      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(rootResponse.statusCode).toBe(200);
      expect(rootResponse.body).toBe('Root');
      expect(healthResponse.statusCode).toBe(200);
      expect(healthResponse.body).toBe('OK');
    });

    it('should handle multiple controllers', async () => {
      @Controller('/users')
      class UsersController {
        @Get('/')
        getUsers(): string {
          return 'Users list';
        }
      }

      @Controller('/posts')
      class PostsController {
        @Get('/')
        getPosts(): string {
          return 'Posts list';
        }
      }

      

      await registrar.register([UsersController, PostsController]);
      await app.ready();

      const usersResponse = await app.inject({
        method: 'GET',
        url: '/users'
      });

      const postsResponse = await app.inject({
        method: 'GET',
        url: '/posts'
      });

      expect(usersResponse.statusCode).toBe(200);
      expect(usersResponse.body).toBe('Users list');
      expect(postsResponse.statusCode).toBe(200);
      expect(postsResponse.body).toBe('Posts list');
    });
  });

  describe('Path Joining', () => {
    it('should join paths correctly', async () => {
      @Controller('/api/v1')
      class ApiController {
        @Get('/users')
        getUsers(): string {
          return 'API Users';
        }

        @Get('/users/:id')
        getUser(): string {
          return 'API User';
        }
      }


      await registrar.register([ApiController]);
      await app.ready();

      const usersResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/users'
      });

      const userResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/users/123'
      });

      expect(usersResponse.statusCode).toBe(200);
      expect(usersResponse.body).toBe('API Users');
      expect(userResponse.statusCode).toBe(200);
      expect(userResponse.body).toBe('API User');
    });

    it('should handle trailing slashes correctly', async () => {
      @Controller('/api/')
      class ApiController {
        @Get('/data/')
        getData(): string {
          return 'Data';
        }
      }


      await registrar.register([ApiController]);
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/data'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Data');
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract query parameters', async () => {
      @Controller('/test')
      class TestController {
        @Get('/search')
        search(@Query('q') query: string): object {
          return { query: query || 'empty' };
        }
      }

      
      await registrar.register([TestController]);
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test/search?q=hello'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.query).toBe('hello');
    });

    it('should extract path parameters', async () => {
      @Controller('/test')
      class TestController {
        @Get('/users/:id')
        getUser(@Param('id') id: string): object {
          return { userId: id };
        }
      }


      await registrar.register([TestController]);
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test/users/456'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.userId).toBe('456');
    });

    it('should extract request body', async () => {
      @Controller('/test')
      class TestController {
        @Post('/users')
        createUser(@Body() user: any): object {
          return { created: user };
        }
      }


      await registrar.register([TestController]);
      await app.ready();

      const userData = { name: 'John', email: 'john@example.com' };
      const response = await app.inject({
        method: 'POST',
        url: '/test/users',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.created).toEqual(userData);
    });

    it('should handle multiple parameters', async () => {
      @Controller('/test')
      class TestController {
        @Post('/users/:id')
        updateUser(
          @Param('id') id: string,
          @Body() user: any,
          @Query('notify') notify: string
        ): object {
          return { 
            userId: id, 
            user, 
            notify: notify || 'false' 
          };
        }
      }

      
      await registrar.register([TestController]);
      await app.ready();

      const userData = { name: 'Jane' };
      const response = await app.inject({
        method: 'POST',
        url: '/test/users/789?notify=true',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.userId).toBe('789');
      expect(result.user).toEqual(userData);
      expect(result.notify).toBe('true');
    });
  });

  describe('Error Cases', () => {
    it('should handle controllers without routes', () => {
      @Controller('/empty')
      class EmptyController {
        // 没有路由装饰器的方法
        regularMethod(): string {
          return 'Not a route';
        }
      }

      // 应该不抛出错误
      expect(() => {
                registrar.register([EmptyController]);
      }).not.toThrow();
    });

    it('should handle controllers without controller decorator', () => {
      class PlainController {
        @Get('/test')
        test(): string {
          return 'test';
        }
      }

      // 应该不抛出错误，但也不会注册任何路由
      expect(() => {
                registrar.register([PlainController]);
      }).not.toThrow();
    });
  });

  describe('HTTP Methods', () => {
    it('should support all HTTP methods', async () => {
      @Controller('/test')
      class TestController {
        @Get('/get')
        getMethod(): string {
          return 'GET';
        }

        @Post('/post')
        postMethod(): string {
          return 'POST';
        }
      }

      
      await registrar.register([TestController]);
      await app.ready();

      const getResponse = await app.inject({
        method: 'GET',
        url: '/test/get'
      });

      const postResponse = await app.inject({
        method: 'POST',
        url: '/test/post'
      });

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toBe('GET');
      expect(postResponse.statusCode).toBe(200);
      expect(postResponse.body).toBe('POST');
    });
  });
});
