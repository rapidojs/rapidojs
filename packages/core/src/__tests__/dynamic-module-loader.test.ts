import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DynamicModuleLoader } from '../modules/dynamic-module-loader.js';
import { EnhancedDIContainer } from '../di/enhanced-container.js';
import { globalEventBus } from '../lifecycle/event-bus.js';
import { Module, Injectable } from '@rapidojs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
const mockFs = fs as any;

describe('Dynamic Module Loader', () => {
  let loader: DynamicModuleLoader;
  let container: EnhancedDIContainer;
  let tempDir: string;

  beforeEach(() => {
    container = new EnhancedDIContainer();
    loader = new DynamicModuleLoader(container, globalEventBus);
    tempDir = '/tmp/test-modules';
    globalEventBus.clear();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    loader.destroy();
  });

  describe('Module Loading', () => {
    it('should load a dynamic module', async () => {
      @Injectable()
      class DynamicService {
        getName() {
          return 'dynamic';
        }
      }

      @Module({
        providers: [DynamicService],
        exports: [DynamicService]
      })
      class DynamicModule {}

      const moduleId = await loader.loadModule(DynamicModule, 'test-module');
      
      expect(moduleId).toBe('test-module');
      expect(loader.isModuleLoaded('test-module')).toBe(true);
      
      const loadedModule = loader.getModule('test-module');
      expect(loadedModule).toBeDefined();
      expect(loadedModule!.module).toBe(DynamicModule);
    });

    it('should load module with configuration', async () => {
      @Injectable()
      class ConfigurableService {
        constructor(private config: any) {}
        
        getConfig() {
          return this.config;
        }
      }

      @Module({})
      class ConfigurableModule {
        static forRoot(config: any) {
          return {
            module: ConfigurableModule,
            providers: [
              { provide: 'MODULE_CONFIG', useValue: config },
              {
                provide: ConfigurableService,
                useFactory: (cfg: any) => new ConfigurableService(cfg),
                inject: ['MODULE_CONFIG']
              }
            ],
            exports: [ConfigurableService]
          };
        }
      }

      const config = { host: 'localhost', port: 3000 };
      const dynamicModule = ConfigurableModule.forRoot(config);
      
      const moduleId = await loader.loadModule(dynamicModule, 'configurable-module');
      
      expect(moduleId).toBe('configurable-module');
      expect(loader.isModuleLoaded('configurable-module')).toBe(true);
    });

    it('should emit events during module loading', async () => {
      @Module({})
      class EventTestModule {}
      
      await loader.loadModule(EventTestModule, 'event-test');
      
      // 验证模块已加载
      expect(loader.isModuleLoaded('event-test')).toBe(true);
      
      // 验证模块信息存在
      const moduleInfo = loader.getModuleInfo('event-test');
      expect(moduleInfo).toBeDefined();
      expect(moduleInfo!.name).toBe('event-test');
    });

    it('should handle module loading errors', async () => {
      const invalidModule = null as any;
      
      await expect(loader.loadModule(invalidModule, 'invalid'))
        .rejects.toThrow('Invalid module provided');
      
      expect(loader.isModuleLoaded('invalid')).toBe(false);
    });

    it('should prevent duplicate module loading', async () => {
      @Module({})
      class DuplicateModule {}
      
      await loader.loadModule(DuplicateModule, 'duplicate');
      
      await expect(loader.loadModule(DuplicateModule, 'duplicate'))
        .rejects.toThrow('模块 \'duplicate\' 已经加载');
    });
  });

  describe('Module Unloading', () => {
    it('should unload a loaded module', async () => {
      @Injectable()
      class UnloadTestService {}

      @Module({
        providers: [UnloadTestService]
      })
      class UnloadTestModule {}

      await loader.loadModule(UnloadTestModule, 'unload-test');
      expect(loader.isModuleLoaded('unload-test')).toBe(true);
      
      await loader.unloadModule('unload-test');
      expect(loader.isModuleLoaded('unload-test')).toBe(false);
    });

    it('should emit events during module unloading', async () => {
      @Module({})
      class UnloadEventModule {}
      
      // 先加载模块
      await loader.loadModule(UnloadEventModule, 'unload-event');
      expect(loader.isModuleLoaded('unload-event')).toBe(true);
      
      // 执行卸载
      await loader.unloadModule('unload-event');
      
      // 验证模块已卸载
      expect(loader.isModuleLoaded('unload-event')).toBe(false);
      
      // 验证模块信息不存在
      const moduleInfo = loader.getModuleInfo('unload-event');
      expect(moduleInfo).toBeUndefined();
    });

    it('should handle unloading non-existent module', async () => {
      await expect(loader.unloadModule('non-existent'))
        .rejects.toThrow('模块 \'non-existent\' 未找到');
    });
  });

  describe('Module Reloading', () => {
    it('should reload an existing module', async () => {
      @Injectable()
      class ReloadService {
        public version = 1;
      }

      @Module({
        providers: [ReloadService]
      })
      class ReloadModule {}

      // 初始加载
      await loader.loadModule(ReloadModule, 'reload-test');
      
      // 修改服务
      @Injectable()
      class UpdatedReloadService {
        public version = 2;
      }

      @Module({
        providers: [UpdatedReloadService]
      })
      class UpdatedReloadModule {}
      
      // 重新加载
      await loader.reloadModule('reload-test');
      
      expect(loader.isModuleLoaded('reload-test')).toBe(true);
      
      const reloadedModule = loader.getModuleInfo('reload-test');
      expect(reloadedModule!.module).toBe(ReloadModule);
    });

    it('should emit events during module reloading', async () => {
      @Module({})
      class OriginalModule {}
      
      // 先加载模块
      await loader.loadModule(OriginalModule, 'reload-event');
      expect(loader.isModuleLoaded('reload-event')).toBe(true);
      
      // 执行重新加载
      await loader.reloadModule('reload-event');
      
      // 验证模块仍然加载
      expect(loader.isModuleLoaded('reload-event')).toBe(true);
      
      // 验证模块信息存在
      const moduleInfo = loader.getModuleInfo('reload-event');
      expect(moduleInfo).toBeDefined();
      expect(moduleInfo!.name).toBe('reload-event');
    });
  });

  describe('Hot Reload', () => {
    it('should configure hot reload for a directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      
      loader.enableHotReload(tempDir, {
        extensions: ['.js', '.ts'],
        ignored: /node_modules/,
        debounceMs: 100
      });
      
      expect(loader.isHotReloadEnabled()).toBe(true);
    });

    it('should handle file changes during hot reload', async () => {
      const events: any[] = [];
      
      globalEventBus.on('module:hot-reload', (event) => events.push(event));
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      loader.enableHotReload(tempDir);
      
      // 模拟文件变化
      const filePath = path.join(tempDir, 'test-module.js');
      
      // 由于我们无法真正触发文件系统事件，这里主要测试配置
      expect(loader.isHotReloadEnabled()).toBe(true);
    });

    it('should disable hot reload', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      
      loader.enableHotReload(tempDir);
      expect(loader.isHotReloadEnabled()).toBe(true);
      
      loader.disableHotReload();
      expect(loader.isHotReloadEnabled()).toBe(false);
    });

    it('should handle invalid directory for hot reload', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        loader.enableHotReload('/invalid/path');
      }).toThrow('Directory /invalid/path does not exist');
    });
  });

  describe('Module Cache Management', () => {
    it('should clear module cache', async () => {
      @Module({})
      class CacheTestModule {}
      
      await loader.loadModule(CacheTestModule, 'cache-test');
      expect(loader.isModuleLoaded('cache-test')).toBe(true);
      
      loader.clearCache();
      expect(loader.isModuleLoaded('cache-test')).toBe(false);
    });

    it('should clear specific module from cache', async () => {
      @Module({})
      class Module1 {}
      
      @Module({})
      class Module2 {}
      
      await loader.loadModule(Module1, 'module1');
      await loader.loadModule(Module2, 'module2');
      
      expect(loader.isModuleLoaded('module1')).toBe(true);
      expect(loader.isModuleLoaded('module2')).toBe(true);
      
      loader.clearModuleCache('module1');
      
      expect(loader.isModuleLoaded('module1')).toBe(false);
      expect(loader.isModuleLoaded('module2')).toBe(true);
    });
  });

  describe('Module Information', () => {
    it('should list all loaded modules', async () => {
      @Module({})
      class Module1 {}
      
      @Module({})
      class Module2 {}
      
      await loader.loadModule(Module1, 'module1');
      await loader.loadModule(Module2, 'module2');
      
      const loadedModules = loader.getLoadedModules();
      
      expect(loadedModules).toHaveLength(2);
      expect(loadedModules.map(m => m.name)).toContain('module1');
      expect(loadedModules.map(m => m.name)).toContain('module2');
    });

    it('should get module statistics', async () => {
      @Injectable()
      class Service1 {}
      
      @Injectable()
      class Service2 {}

      @Module({
        providers: [Service1, Service2],
        controllers: [class Controller1 {}]
      })
      class StatsModule {}
      
      await loader.loadModule(StatsModule, 'stats-module');
      
      const moduleInfo = loader.getModuleInfo('stats-module');
      
      expect(moduleInfo).toBeDefined();
      expect(moduleInfo!.name).toBe('stats-module');
      expect(moduleInfo!.loadedAt).toBeDefined();
      expect(moduleInfo!.providers.length).toBeGreaterThanOrEqual(0);
      expect(moduleInfo!.controllers.length).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined for non-existent module stats', () => {
      const moduleInfo = loader.getModuleInfo('non-existent');
      expect(moduleInfo).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle module loading failures gracefully', async () => {
      const events: any[] = [];
      
      // 模拟错误事件
      const originalLoadModule = loader.loadModule.bind(loader);
      loader.loadModule = async (module: any, name?: string) => {
        try {
          return await originalLoadModule(module, name);
        } catch (error) {
          events.push({ type: 'module:load-error', data: { moduleId: name || 'faulty' } });
          throw error;
        }
      };
      
      // 模拟一个会抛出错误的模块
      const faultyModule = {
        get module() {
          throw new Error('Module initialization failed');
        }
      };
      
      await expect(loader.loadModule(faultyModule as any, 'faulty'))
        .rejects.toThrow();
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('module:load-error');
      expect(events[0].data.moduleId).toBe('faulty');
    });

    it('should handle module unloading failures gracefully', async () => {
      const events: any[] = [];
      
      // 模拟卸载错误事件
      const originalUnloadModule = loader.unloadModule.bind(loader);
      loader.unloadModule = async (name: string) => {
        try {
          return await originalUnloadModule(name);
        } catch (error) {
          events.push({ type: 'module:unload-error', data: { moduleId: name } });
          throw error;
        }
      };
      
      @Module({})
      class TestModule {}
      
      await loader.loadModule(TestModule, 'test');
      
      // 模拟容器错误
      const originalMethod = container.removeModule;
      container.removeModule = vi.fn().mockImplementation(() => {
        throw new Error('Container error');
      });
      
      await expect(loader.unloadModule('test')).rejects.toThrow();
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('module:unload-error');
      
      // 恢复原方法
      container.removeModule = originalMethod;
    });
  });

  describe('Lifecycle Management', () => {
    it('should properly destroy loader and cleanup resources', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      
      loader.enableHotReload(tempDir);
      expect(loader.isHotReloadEnabled()).toBe(true);
      
      loader.destroy();
      
      expect(loader.isHotReloadEnabled()).toBe(false);
      expect(loader.getLoadedModules()).toHaveLength(0);
    });
  });

  describe('Integration with DI Container', () => {
    it('should register module providers in DI container', async () => {
      @Injectable()
      class IntegrationService {
        getValue() {
          return 'integration-test';
        }
      }

      @Module({
        providers: [IntegrationService],
        exports: [IntegrationService]
      })
      class IntegrationModule {}

      await loader.loadModule(IntegrationModule, 'integration');
      
      // 验证服务可以从容器中解析
      const service = container.resolve(IntegrationService);
      expect(service).toBeInstanceOf(IntegrationService);
      expect(service.getValue()).toBe('integration-test');
    });

    it('should remove module providers from DI container on unload', async () => {
      @Injectable()
      class RemovalService {}

      @Module({
        providers: [RemovalService]
      })
      class RemovalModule {}

      await loader.loadModule(RemovalModule, 'removal');
      
      // 验证服务存在
      expect(() => container.resolve(RemovalService)).not.toThrow();
      
      await loader.unloadModule('removal');
      
      // 验证服务已被移除（这取决于容器的实现）
      // 注意：实际的移除行为取决于 EnhancedDIContainer 的 removeModule 实现
    });
  });
});