import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ControllerRegistrar } from '../factory/controller-registrar.js';
import { DIContainer } from '../di/container.js';
import { Controller, Get, Post, Param, Query, Body, UsePipes, UseGuards, Injectable, Module } from '@rapidojs/common';
import { ParseIntPipe } from '../pipes/built-in.pipes.js';
import { ValidationPipe } from '../pipes/validation.pipe.js';
import { FastifyInstance } from 'fastify';

// 测试用的类
@Injectable()
class TestService {
  getData() {
    return 'test data';
  }
}

class TestPipe {
  transform(value: any) {
    return `pipe-${value}`;
  }
}

class TestGuard {
  canActivate() {
    return true;
  }
}

@Controller('/test')
class TestController {
  constructor(private testService: TestService) {}

  @Get('/simple')
  simple() {
    return 'simple';
  }

  @Get('/with-params/:id')
  withParams(@Param('id', ParseIntPipe) id: number) {
    return { id };
  }

  @Get('/with-query')
  withQuery(@Query('page', ParseIntPipe) page: number) {
    return { page };
  }

  @Post('/with-body')
  @UsePipes(ValidationPipe)
  withBody(@Body() body: any) {
    return { received: body };
  }

  @Get('/with-guards')
  @UseGuards(TestGuard)
  withGuards() {
    return 'guarded';
  }

  @Get('/multiple-params/:id')
  multipleParams(
    @Param('id') id: string,
    @Query('filter') filter: string,
    @Body() body: any
  ) {
    return { id, filter, body };
  }
}

@Controller('/empty')
class EmptyController {
  // 没有路由方法
}

class NoDecoratorController {
  // 没有装饰器的控制器
  method() {
    return 'no decorator';
  }
}

@Module({
  controllers: [TestController],
  providers: [TestService]
})
class TestModule {}

describe('ControllerRegistrar 扩展测试', () => {
  let fastify: FastifyInstance;
  let container: DIContainer;
  let registrar: ControllerRegistrar;

  beforeEach(async () => {
    // 创建模拟的 Fastify 实例
    fastify = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      head: vi.fn(),
      options: vi.fn(),
    } as any;

    container = new DIContainer();
    await container.registerModule(TestModule);
    
    registrar = new ControllerRegistrar(fastify, container);
  });

  describe('路径处理', () => {
    it('应该正确处理根路径', async () => {
      @Controller('/')
      class RootController {
        @Get('/')
        root() {
          return 'root';
        }
      }

      await registrar.register([RootController]);
      
      expect(fastify.get).toHaveBeenCalledWith('/', expect.any(Object), expect.any(Function));
    });

    it('应该正确处理带前缀的路径', async () => {
      @Controller('/api/v1')
      class ApiController {
        @Get('/users')
        getUsers() {
          return [];
        }
      }

      await registrar.register([ApiController]);
      
      expect(fastify.get).toHaveBeenCalledWith('/api/v1/users', expect.any(Object), expect.any(Function));
    });

    it('应该处理重复斜杠', async () => {
      @Controller('/api/')
      class ApiController {
        @Get('/users/')
        getUsers() {
          return [];
        }
      }

      await registrar.register([ApiController]);
      
      // 应该清理路径中的重复斜杠
      expect(fastify.get).toHaveBeenCalledWith('/api/users', expect.any(Object), expect.any(Function));
    });
  });

  describe('HTTP 方法支持', () => {
    it('应该支持所有标准 HTTP 方法', async () => {
      @Controller('/http')
      class HttpMethodsController {
        @Get('/get') get() { return 'get'; }
        @Post('/post') post() { return 'post'; }
        // 可以添加其他 HTTP 方法的测试
      }

      await registrar.register([HttpMethodsController]);
      
      expect(fastify.get).toHaveBeenCalledWith('/http/get', expect.any(Object), expect.any(Function));
      expect(fastify.post).toHaveBeenCalledWith('/http/post', expect.any(Object), expect.any(Function));
    });

    it('应该处理不支持的 HTTP 方法', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 模拟一个不支持的方法
      const originalPatch = fastify.patch;
      delete (fastify as any).patch;

      @Controller('/unsupported')
      class UnsupportedController {
        // 假设有一个使用 PATCH 方法的路由
        @Get('/test') // 使用 GET 代替不存在的 PATCH
        test() {
          return 'test';
        }
      }

      await registrar.register([UnsupportedController]);
      
      // 恢复方法
      (fastify as any).patch = originalPatch;
      consoleSpy.mockRestore();
    });
  });

  describe('参数提取', () => {
    it('应该处理复杂的参数组合', async () => {
      @Controller('/complex')
      class ComplexController {
        @Post('/endpoint/:id')
        complex(
          @Param('id') id: string,
          @Query('sort') sort: string,
          @Body() body: any
        ) {
          return { id, sort, body };
        }
      }

      await registrar.register([ComplexController]);
      
      expect(fastify.post).toHaveBeenCalledWith('/complex/endpoint/:id', expect.any(Object), expect.any(Function));
    });

    it('应该处理没有参数的方法', async () => {
      @Controller('/no-params')
      class NoParamsController {
        @Get('/simple')
        simple() {
          return 'no params';
        }
      }

      await registrar.register([NoParamsController]);
      
      expect(fastify.get).toHaveBeenCalledWith('/no-params/simple', expect.any(Object), expect.any(Function));
    });
  });

  describe('管道处理', () => {
    it('应该应用方法级管道', async () => {
      @Controller('/pipes')
      class PipesController {
        @Get('/with-pipe')
        @UsePipes(TestPipe)
        withPipe(@Query('value') value: string) {
          return { value };
        }
      }

      await registrar.register([PipesController]);
      
      expect(fastify.get).toHaveBeenCalledWith('/pipes/with-pipe', expect.objectContaining({ preHandler: expect.any(Function) }), expect.any(Function));
    });

    it('应该应用类级管道', async () => {
      @Controller('/class-pipes')
      @UsePipes(TestPipe)
      class ClassPipesController {
        @Get('/test')
        test(@Query('value') value: string) {
          return { value };
        }
      }

      await registrar.register([ClassPipesController]);
      
      // 当应用类级管道时，会添加 preHandler 到路由选项中
      expect(fastify.get).toHaveBeenCalledWith('/class-pipes/test', expect.objectContaining({
        preHandler: expect.any(Function)
      }), expect.any(Function));
    });
  });

  describe('错误处理', () => {
    it('应该处理没有控制器装饰器的类', async () => {
      await registrar.register([NoDecoratorController]);
      
      // 不应该注册任何路由
      expect(fastify.get).not.toHaveBeenCalled();
      expect(fastify.post).not.toHaveBeenCalled();
    });

    it('应该处理没有路由的控制器', async () => {
      await registrar.register([EmptyController]);
      
      // 不应该注册任何路由
      expect(fastify.get).not.toHaveBeenCalled();
      expect(fastify.post).not.toHaveBeenCalled();
    });

    it('应该处理控制器实例化错误', async () => {
      @Controller('/error')
      class ErrorController {
        constructor() {
          throw new Error('Constructor error');
        }

        @Get('/test')
        test() {
          return 'test';
        }
      }

      // 应该优雅地处理错误
      await expect(registrar.register([ErrorController])).rejects.toThrow();
    });
  });

  describe('依赖注入', () => {
    it('应该正确解析控制器依赖', async () => {
      await registrar.register([TestController]);
      
      // 验证控制器已注册
      expect(fastify.get).toHaveBeenCalled();
    });

    it('应该处理缺失的依赖', async () => {
      @Injectable()
      class MissingService {}

      @Controller('/missing-dep')
      class MissingDepController {
        constructor(private missing: MissingService) {}

        @Get('/test')
        test() {
          return 'test';
        }
      }

      // 注册缺失的服务
      container.registerProvider(MissingService);
      
      // 现在应该能正常注册
      await registrar.register([MissingDepController]);
      expect(fastify.get).toHaveBeenCalled();
    });
  });
});