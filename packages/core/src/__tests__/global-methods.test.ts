import { describe, it, expect, beforeEach } from 'vitest';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Controller, Get, Post, Body, Injectable, Module, Catch } from '../decorators/index.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { PipeTransform, ArgumentMetadata } from '../pipes/pipe-transform.interface.js';
import { CanActivate, ExecutionContext } from '../interfaces/rapido-app.interface.js';
import { ArgumentsHost } from '../interfaces/arguments-host.interface.js';
import { Type } from '../types.js';

// 测试用的全局过滤器
@Catch(Error)
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(500).send({
      statusCode: 500,
      message: 'Global filter caught exception',
      originalMessage: exception.message
    });
  }
}

// 测试用的全局管道
class GlobalTransformPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    return `global-transformed-${value}`;
  }
}

// 测试用的全局守卫
class GlobalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.getRequest();
    return request.headers.authorization === 'Bearer valid-token';
  }
}

// 测试用的异步守卫
class AsyncGlobalGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 10)); // 模拟异步操作
    return true;
  }
}

// 测试控制器
@Controller('/test')
class TestController {
  @Get('/hello')
  hello(): string {
    return 'hello';
  }

  @Post('/echo')
  echo(@Body() body: any): any {
    return { received: body };
  }

  @Get('/error')
  throwError(): never {
    throw new Error('Test error');
  }
}

@Module({
  controllers: [TestController]
})
class TestModule {}

describe('RapidoApp 全局方法', () => {
  describe('useGlobalFilters', () => {
    it('应该能够注册全局过滤器实例', async () => {
      const app = await RapidoFactory.create(TestModule);
      const filter = new GlobalExceptionFilter();
      
      const result = app.useGlobalFilters(filter);
      
      expect(result).toBe(app); // 应该返回 app 实例用于链式调用
      expect(app.getGlobalFilters()).toContain(filter);
    });

    it('应该能够注册全局过滤器类', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      app.useGlobalFilters(GlobalExceptionFilter);
      
      const filters = app.getGlobalFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0]).toBe(GlobalExceptionFilter);
    });

    it('应该能够注册多个全局过滤器', async () => {
      const app = await RapidoFactory.create(TestModule);
      const filter1 = new GlobalExceptionFilter();
      
      app.useGlobalFilters(filter1, GlobalExceptionFilter);
      
      const filters = app.getGlobalFilters();
      expect(filters).toHaveLength(2);
      expect(filters[0]).toBe(filter1);
      expect(filters[1]).toBe(GlobalExceptionFilter);
    });

    it('应该能够处理异常', async () => {
      const app = await RapidoFactory.create(TestModule);
      app.useGlobalFilters(new GlobalExceptionFilter());

      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test/error'
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Global filter caught exception');
      expect(body.originalMessage).toBe('Test error');
    });
  });

  describe('useGlobalPipes', () => {
    it('应该能够注册全局管道实例', async () => {
      const app = await RapidoFactory.create(TestModule);
      const pipe = new GlobalTransformPipe();
      
      const result = app.useGlobalPipes(pipe);
      
      expect(result).toBe(app); // 应该返回 app 实例用于链式调用
      expect(app.getGlobalPipes()).toContain(pipe);
    });

    it('应该能够注册全局管道类', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      app.useGlobalPipes(GlobalTransformPipe);
      
      const pipes = app.getGlobalPipes();
      expect(pipes).toHaveLength(1);
      expect(pipes[0]).toBe(GlobalTransformPipe);
    });

    it('应该能够注册多个全局管道', async () => {
      const app = await RapidoFactory.create(TestModule);
      const pipe1 = new GlobalTransformPipe();
      
      app.useGlobalPipes(pipe1, GlobalTransformPipe);
      
      const pipes = app.getGlobalPipes();
      expect(pipes).toHaveLength(2);
      expect(pipes[0]).toBe(pipe1);
      expect(pipes[1]).toBe(GlobalTransformPipe);
    });
  });

  describe('useGlobalGuards', () => {
    it('应该能够注册全局守卫实例', async () => {
      const app = await RapidoFactory.create(TestModule);
      const guard = new GlobalAuthGuard();
      
      const result = app.useGlobalGuards(guard);
      
      expect(result).toBe(app); // 应该返回 app 实例用于链式调用
      expect(app.getGlobalGuards()).toContain(guard);
    });

    it('应该能够注册全局守卫类', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      app.useGlobalGuards(GlobalAuthGuard);
      
      const guards = app.getGlobalGuards();
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(GlobalAuthGuard);
    });

    it('应该能够注册多个全局守卫', async () => {
      const app = await RapidoFactory.create(TestModule);
      const guard1 = new GlobalAuthGuard();
      
      app.useGlobalGuards(guard1, AsyncGlobalGuard);
      
      const guards = app.getGlobalGuards();
      expect(guards).toHaveLength(2);
      expect(guards[0]).toBe(guard1);
      expect(guards[1]).toBe(AsyncGlobalGuard);
    });

    it('应该在请求时执行全局守卫', async () => {
      const app = await RapidoFactory.create(TestModule);
      app.useGlobalGuards(new GlobalAuthGuard());

      await app.ready();

      // 没有认证令牌的请求应该被拒绝
      const failedResponse = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });

      expect(failedResponse.statusCode).toBe(403);
      const failedBody = JSON.parse(failedResponse.body);
      expect(failedBody.message).toBe('Access denied by guard');

      // 有有效认证令牌的请求应该通过
      const successResponse = await app.inject({
        method: 'GET',
        url: '/test/hello',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(successResponse.statusCode).toBe(200);
      expect(successResponse.body).toBe('hello');
    });

    it('应该处理异步守卫', async () => {
      const app = await RapidoFactory.create(TestModule);
      app.useGlobalGuards(new AsyncGlobalGuard());

      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('hello');
    });
  });

  describe('链式调用', () => {
    it('应该支持方法链式调用', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      const result = app
        .useGlobalFilters(new GlobalExceptionFilter())
        .useGlobalPipes(new GlobalTransformPipe())
        .useGlobalGuards(new AsyncGlobalGuard());
      
      expect(result).toBe(app);
      expect(app.getGlobalFilters()).toHaveLength(1);
      expect(app.getGlobalPipes()).toHaveLength(1);
      expect(app.getGlobalGuards()).toHaveLength(1);
    });
  });

  describe('与现有功能的兼容性', () => {
    it('应该保持 Fastify 的原有功能', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      // 检查 Fastify 方法是否仍然可用
      expect(typeof app.listen).toBe('function');
      expect(typeof app.inject).toBe('function');
      expect(typeof app.ready).toBe('function');
      expect(typeof app.close).toBe('function');
    });

    it('应该保持容器和静态文件功能', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      // 检查自定义方法
      expect(typeof app.container).toBe('object');
      expect(typeof app.addStaticFiles).toBe('function');
    });
  });
}); 