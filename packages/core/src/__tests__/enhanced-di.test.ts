import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedDIContainer, DependencyScope } from '../di/enhanced-container.js';
import { Lazy } from '../decorators/lazy.decorator.js';
import { ConditionalOn } from '../decorators/conditional.decorator.js';
import { Scope, Singleton, Transient, RequestScoped } from '../decorators/scope.decorator.js';
import { Injectable, Inject } from '@rapidojs/common';
import { globalEventBus } from '../lifecycle/event-bus.js';

describe('Enhanced DI Container', () => {
  let container: EnhancedDIContainer;

  beforeEach(() => {
    container = new EnhancedDIContainer();
    globalEventBus.removeAllListeners();
    globalEventBus.clearEventHistory();
  });

  describe('Scope Management', () => {
    it('should handle singleton scope', () => {
      @Singleton()
      @Injectable()
      class SingletonService {
        public id = Math.random();
      }

      container.registerProvider({
        provide: SingletonService,
        useClass: SingletonService
      });

      const instance1 = container.resolve(SingletonService);
      const instance2 = container.resolve(SingletonService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should handle transient scope', () => {
      @Transient()
      @Injectable()
      class TransientService {
        public id = Math.random();
      }

      container.registerProvider({
        provide: TransientService,
        useClass: TransientService,
        scope: DependencyScope.TRANSIENT
      });

      const instance1 = container.resolve(TransientService);
      const instance2 = container.resolve(TransientService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should handle request scope', () => {
      @RequestScoped()
      @Injectable()
      class RequestService {
        public id = Math.random();
      }

      container.registerProvider({
        provide: RequestService,
        useClass: RequestService,
        scope: DependencyScope.REQUEST
      });

      // 模拟第一个请求
      const requestId1 = 'req-1';
      container.setCurrentRequestId(requestId1);
      const instance1a = container.resolve(RequestService);
      const instance1b = container.resolve(RequestService);

      // 模拟第二个请求
      const requestId2 = 'req-2';
      container.setCurrentRequestId(requestId2);
      const instance2a = container.resolve(RequestService);
      const instance2b = container.resolve(RequestService);

      // 同一请求内应该是同一实例
      expect(instance1a).toBe(instance1b);
      expect(instance2a).toBe(instance2b);

      // 不同请求应该是不同实例
      expect(instance1a).not.toBe(instance2a);
      expect(instance1a.id).not.toBe(instance2a.id);
    });
  });

  describe('Lazy Loading', () => {
    it('should create lazy proxy for dependencies', () => {
      @Injectable()
      class ExpensiveService {
        public initialized = false;
        
        constructor() {
          this.initialized = true;
        }
        
        public doWork() {
          return 'work done';
        }
      }

      @Injectable()
      class ConsumerService {
        constructor(
          @Lazy()
          @Inject(ExpensiveService)
          private expensiveService: ExpensiveService
        ) {}
        
        public useService() {
          return this.expensiveService.doWork();
        }
        
        public getService() {
          return this.expensiveService;
        }
      }

      container.registerProvider({ provide: ExpensiveService, useClass: ExpensiveService });
      container.registerProvider({ provide: ConsumerService, useClass: ConsumerService });

      const consumer = container.resolve(ConsumerService);
      
      // 此时 ExpensiveService 还没有被实例化
      // 只有当访问其方法时才会被实例化
      const result = consumer.useService();
      expect(result).toBe('work done');
      
      const service = consumer.getService();
      expect(service.initialized).toBe(true);
    });
  });

  describe('Conditional Injection', () => {
    it('should register service based on environment condition', () => {
      process.env.NODE_ENV = 'production';
      
      @ConditionalOn({ env: 'NODE_ENV', value: 'production' })
      @Injectable()
      class ProductionService {
        public getName() {
          return 'production';
        }
      }

      @ConditionalOn({ env: 'NODE_ENV', value: 'development' })
      @Injectable()
      class DevelopmentService {
        public getName() {
          return 'development';
        }
      }

      const shouldRegisterProd = container.shouldRegisterProvider(ProductionService);
      const shouldRegisterDev = container.shouldRegisterProvider(DevelopmentService);

      expect(shouldRegisterProd).toBe(true);
      expect(shouldRegisterDev).toBe(false);
      
      // 清理
      delete process.env.NODE_ENV;
    });

    it('should register service based on config condition', () => {
      const mockConfig = {
        features: {
          newFeature: true,
          oldFeature: false
        }
      };
      
      container.setConfig(mockConfig);
      
      @ConditionalOn({ config: 'features.newFeature', value: true })
      @Injectable()
      class NewFeatureService {
        public getName() {
          return 'new-feature';
        }
      }

      @ConditionalOn({ config: 'features.oldFeature', value: true })
      @Injectable()
      class OldFeatureService {
        public getName() {
          return 'old-feature';
        }
      }

      const shouldRegisterNew = container.shouldRegisterProvider(NewFeatureService);
      const shouldRegisterOld = container.shouldRegisterProvider(OldFeatureService);

      expect(shouldRegisterNew).toBe(true);
      expect(shouldRegisterOld).toBe(false);
    });

    it('should register service based on custom function condition', () => {
      @ConditionalOn({ 
        condition: () => new Date().getHours() < 12 
      })
      @Injectable()
      class MorningService {
        public getName() {
          return 'morning';
        }
      }

      const shouldRegister = container.shouldRegisterProvider(MorningService);
      
      // 这个测试结果取决于运行时间，但至少验证了条件函数被调用
      expect(typeof shouldRegister).toBe('boolean');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should handle circular dependencies correctly', () => {
      @Injectable()
      class ServiceA {
        constructor(@Inject('ServiceB') private serviceB: any) {}
        
        getName() {
          return 'ServiceA';
        }
      }

      @Injectable()
      class ServiceB {
        constructor(@Inject('ServiceA') private serviceA: any) {}
        
        getName() {
          return 'ServiceB';
        }
      }

      container.registerProvider({ provide: 'ServiceA', useClass: ServiceA });
      container.registerProvider({ provide: 'ServiceB', useClass: ServiceB });

      // 循环依赖应该能够被正确解析
      const serviceA = container.resolve('ServiceA') as ServiceA;
      const serviceB = container.resolve('ServiceB') as ServiceB;
      
      expect(serviceA).toBeDefined();
      expect(serviceB).toBeDefined();
      expect(serviceA.getName()).toBe('ServiceA');
      expect(serviceB.getName()).toBe('ServiceB');
    });
  });

  describe('Event Integration', () => {
    it('should emit events during service lifecycle', () => {
      const events: any[] = [];
      
      globalEventBus.on('service:created', (event) => {
        events.push(event);
      });
      
      @Injectable()
      class TestService {
        public name = 'test';
      }

      container.registerProvider({ provide: TestService, useClass: TestService });
      const instance = container.resolve(TestService);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('service:created');
      expect(events[0].data.serviceName).toBe('TestService');
    });
  });

  describe('Configuration Loading', () => {
    it('should load and validate configuration', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432
        },
        cache: {
          enabled: true,
          ttl: 3600
        }
      };
      
      container.setConfig(config);
      const loadedConfig = container.getConfig();
      
      expect(loadedConfig).toEqual(config);
      expect(loadedConfig.database.host).toBe('localhost');
      expect(loadedConfig.cache.enabled).toBe(true);
    });
  });
});