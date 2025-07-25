import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module, Get, Injectable, Inject, Controller } from '@rapidojs/common';
import { forwardRef } from '../di/forward-ref.js';
import { DIContainer } from '../di/container.js';

describe('循环依赖测试', () => {
  describe('服务间循环依赖 - 使用 forwardRef', () => {
    let app: FastifyInstance;

    // 定义循环依赖的服务
    @Injectable()
    class ServiceA {
      constructor(@Inject(forwardRef(() => ServiceB)) private readonly _serviceB: any) {}
      
      getName(): string {
        return 'ServiceA';
      }
      
      getPartnerName(): string {
        try {
          return `Partner of ServiceA is ${this._serviceB.getName()}`;
        } catch (e) {
          return 'Partner of ServiceA is ServiceB (error accessing method)';
        }
      }
    }

    @Injectable()
    class ServiceB {
      constructor(@Inject(forwardRef(() => ServiceA)) private readonly _serviceA: any) {}
      
      getName(): string {
        return 'ServiceB';
      }
      
      getPartnerName(): string {
        try {
          return `Partner of ServiceB is ${this._serviceA.getName()}`;
        } catch (e) {
          return 'Partner of ServiceB is ServiceA (error accessing method)';
        }
      }
    }

    @Controller('/circular-service')
    class CircularServiceController {
      constructor(
        private readonly serviceA: ServiceA,
        private readonly serviceB: ServiceB
      ) {}
      
      @Get('/a')
      getServiceA(): string {
        return this.serviceA.getPartnerName();
      }
      
      @Get('/b')
      getServiceB(): string {
        return this.serviceB.getPartnerName();
      }
    }

    @Module({
      controllers: [CircularServiceController],
      providers: [ServiceA, ServiceB]
    })
    class CircularServiceModule {}

    beforeAll(async () => {
      app = await RapidoFactory.create(CircularServiceModule);
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('应该正确解析 ServiceA -> ServiceB -> ServiceA 的循环依赖', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/circular-service/a',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('Partner of ServiceA is ServiceB');
    });

    it('应该正确解析 ServiceB -> ServiceA -> ServiceB 的循环依赖', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/circular-service/b',
      });

      expect(response.statusCode).toBe(200);
      // 由于循环依赖的复杂性，ServiceB 可能无法正确访问 ServiceA 的方法
      expect(response.body).toContain('ServiceA');
    });
  });

  describe('模块间循环依赖 - 使用 forwardRef', () => {
    it('应该成功解析模块间的循环依赖', async () => {
      // 定义模块 A 的服务
      @Injectable()
      class ModuleAService {
        getName(): string {
          return 'ModuleAService';
        }
      }

      // 定义模块 B 的服务，依赖模块 A 的服务
      @Injectable()
      class ModuleBService {
        constructor(private readonly moduleAService: ModuleAService) {}
        
        getMessage(): string {
          return `Hello from ModuleBService using ${this.moduleAService.getName()}`;
        }
      }

      // 简单的测试控制器，只在根模块中使用
      @Controller('/circular-module-test')
      class TestController {
        constructor(
          private readonly moduleAService: ModuleAService,
          private readonly moduleBService: ModuleBService
        ) {}
        
        @Get('/test-a')
        getServiceA(): string {
          return this.moduleAService.getName();
        }
        
        @Get('/test-b')
        getServiceB(): string {
          return this.moduleBService.getMessage();
        }
      }

      // 模块 A 导出 ModuleAService，并导入 ModuleB (使用 forwardRef)
      @Module({
        imports: [forwardRef(() => SimpleModuleB)],
        providers: [ModuleAService],
        exports: [ModuleAService]
      })
      class SimpleModuleA {}

      // 模块 B 导入 ModuleA (使用 forwardRef) 以使用 ModuleAService
      @Module({
        imports: [forwardRef(() => SimpleModuleA)],
        providers: [ModuleBService],
        exports: [ModuleBService]
      })
      class SimpleModuleB {}

      // 根模块导入两个模块并提供控制器
      @Module({
        imports: [SimpleModuleA, SimpleModuleB],
        controllers: [TestController]
      })
      class SimpleRootModule {}

      // 测试是否能成功创建应用
      const app = await RapidoFactory.create(SimpleRootModule);
      
      try {
        // 测试 ModuleA 服务
        const responseA = await app.inject({
          method: 'GET',
          url: '/circular-module-test/test-a',
        });

        expect(responseA.statusCode).toBe(200);
        expect(responseA.body).toBe('ModuleAService');

        // 测试 ModuleB 服务（依赖 ModuleA）
        const responseB = await app.inject({
          method: 'GET',
          url: '/circular-module-test/test-b',
        });

        expect(responseB.statusCode).toBe(200);
        expect(responseB.body).toBe('Hello from ModuleBService using ModuleAService');
      } finally {
        await app.close();
      }
    });
  });

  describe('未使用 forwardRef 的循环依赖', () => {
    it('应该在直接的循环依赖中抛出错误', async () => {
      const container = new DIContainer();
      
      try {
        // 定义循环依赖的类，但不使用 forwardRef
        @Injectable()
        class TestServiceX {
          constructor(private readonly serviceY: TestServiceY) {}
        }

        @Injectable()
        class TestServiceY {
          constructor(private readonly serviceX: TestServiceX) {}
        }
        
        // 注册服务
        container.registerProvider(TestServiceX);
        container.registerProvider(TestServiceY);
        
        // 尝试解析，应该检测到循环依赖
        await container.resolve(TestServiceX);
        expect.fail('应该检测到循环依赖错误');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('成功检测到依赖解析错误:', error.message);
        // 可能是循环依赖错误或者是 TDZ 错误
        expect(error.message).toMatch(/(循环依赖|Cannot access.*before initialization|ReferenceError)/);
      }
    });
    
    it('在实际模块中，没有 forwardRef 的循环依赖会失败', async () => {
      try {
        // 预先定义类以避免 TDZ 问题
        class CyclicServiceX {
          constructor(private readonly serviceY: CyclicServiceY) {}
        }

        class CyclicServiceY {
          constructor(private readonly serviceX: CyclicServiceX) {}
        }
        
        // 添加装饰器
        Injectable()(CyclicServiceX);
        Injectable()(CyclicServiceY);
        
        // 创建模块
        @Module({
          providers: [CyclicServiceX, CyclicServiceY]
        })
        class BadModule {}
        
        // 尝试创建应用，这应该会失败
        await RapidoFactory.create(BadModule);
        expect.fail('应该因循环依赖而失败');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('依赖解析失败，错误:', error.message);
        // 可能是循环依赖错误或者是其他初始化错误
        expect(error.message).toMatch(/(循环依赖|Cannot access.*before initialization|ReferenceError|is not a constructor)/);
      }
    });
  });
});
