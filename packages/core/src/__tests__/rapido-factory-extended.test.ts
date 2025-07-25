import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Controller, Get, Post, Module, Injectable, CanActivate, PipeTransform } from '@rapidojs/common';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { HttpException } from '../exceptions/http-exception.js';
import { ValidationPipe } from '../pipes/validation.pipe.js';

// 测试用的类
@Injectable()
class TestService {
  getData() {
    return 'test data';
  }
}

@Controller('/test')
class TestController {
  @Get('/hello')
  hello() {
    return 'Hello World';
  }

  @Post('/error')
  throwError() {
    throw new Error('Test error');
  }
}

class TestExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: any) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(500).send({
      message: 'Custom error handler',
      error: exception.message
    });
  }
}

class TestGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

class TestPipe implements PipeTransform {
  transform(value: any) {
    return `transformed-${value}`;
  }
}

@Module({
  controllers: [TestController],
  providers: [TestService]
})
class TestModule {}

@Module({})
class EmptyModule {}

describe('RapidoFactory 扩展测试', () => {
  describe('应用创建配置', () => {
    it('应该使用默认配置创建应用', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.close).toBe('function');
      
      await app.close();
    });

    it('应该使用自定义配置创建应用', async () => {
      const config = {
        fastifyOptions: {
          logger: true
        }
      };

      const app = await RapidoFactory.create(TestModule, config);
      
      expect(app).toBeDefined();
      await app.close();
    });

    it('应该处理空模块', async () => {
      const app = await RapidoFactory.create(EmptyModule);
      
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('静态文件配置', () => {
    it('应该处理静态文件配置', async () => {
      const config = {
        staticFiles: [{
          root: process.cwd() + '/public',
          prefix: '/static'
        }]
      };

      const app = await RapidoFactory.create(TestModule, config);
      
      expect(app).toBeDefined();
      expect(typeof app.addStaticFiles).toBe('function');
      
      await app.close();
    });

    it('应该处理多个静态文件配置', async () => {
      const config = {
        staticFiles: [
          {
            root: process.cwd() + '/public',
            prefix: '/static'
          },
          {
            root: process.cwd() + '/assets',
            prefix: '/assets'
          }
        ]
      };

      const app = await RapidoFactory.create(TestModule, config);
      
      expect(app).toBeDefined();
      await app.close();
    });

    it('应该处理没有静态文件配置的情况', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('全局功能', () => {
    it('应该支持全局过滤器', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      const filter = new TestExceptionFilter();
      const result = app.useGlobalFilters(filter);
      
      expect(result).toBe(app);
      expect(app.getGlobalFilters()).toContain(filter);
      
      await app.close();
    });

    it('应该支持全局管道', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      const pipe = new TestPipe();
      const result = app.useGlobalPipes(pipe);
      
      expect(result).toBe(app);
      expect(app.getGlobalPipes()).toContain(pipe);
      
      await app.close();
    });

    it('应该支持全局守卫', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      const guard = new TestGuard();
      const result = app.useGlobalGuards(guard);
      
      expect(result).toBe(app);
      expect(app.getGlobalGuards()).toContain(guard);
      
      await app.close();
    });

    it('应该支持链式调用', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      const result = app
        .useGlobalFilters(new TestExceptionFilter())
        .useGlobalPipes(new TestPipe())
        .useGlobalGuards(new TestGuard());
      
      expect(result).toBe(app);
      expect(app.getGlobalFilters()).toHaveLength(1);
      expect(app.getGlobalPipes()).toHaveLength(1);
      expect(app.getGlobalGuards()).toHaveLength(1);
      
      await app.close();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的模块', async () => {
      class InvalidModule {}
      
      // 无效模块应该还是能创建应用，只是没有注册任何路由
      const app = await RapidoFactory.create(InvalidModule as any);
      expect(app).toBeDefined();
      await app.close();
    });

    it('应该处理模块注册错误', async () => {
      @Module({
        providers: [
          {
            provide: 'INVALID_PROVIDER',
            useValue: null
          }
        ]
      })
      class ErrorModule {}

      const app = await RapidoFactory.create(ErrorModule);
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('内部功能', () => {
    it('应该提供容器访问', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      expect(app.container).toBeDefined();
      expect(typeof app.container.resolve).toBe('function');
      
      await app.close();
    });

    it('应该提供执行全局守卫的方法', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      expect(typeof (app as any).executeGlobalGuards).toBe('function');
      
      await app.close();
    });

    it('应该提供应用全局管道的方法', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      expect(typeof (app as any).applyGlobalPipes).toBe('function');
      
      await app.close();
    });
  });

  describe('Fastify 集成', () => {
    it('应该保持 Fastify 原生功能', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      // Fastify 原生方法应该仍然可用
      expect(typeof app.register).toBe('function');
      expect(typeof app.inject).toBe('function');
      expect(typeof app.ready).toBe('function');
      
      await app.close();
    });

    it('应该支持路由注册', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      await app.ready();
      
      const response = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Hello World');
      
      await app.close();
    });
  });

  describe('生命周期', () => {
    it('应该支持应用启动和关闭', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      await app.ready();
      // 验证应用已准备就绪
      expect(app.ready).toBeDefined();
      
      await app.close();
    });

    it('应该正确清理资源', async () => {
      const app = await RapidoFactory.create(TestModule);
      
      // 添加一些全局功能
      app.useGlobalFilters(new TestExceptionFilter());
      app.useGlobalPipes(new TestPipe());
      app.useGlobalGuards(new TestGuard());
      
      await app.close();
      
      // 应用关闭后应该还能访问基本属性
      expect(app.getGlobalFilters).toBeDefined();
    });
  });
}); 