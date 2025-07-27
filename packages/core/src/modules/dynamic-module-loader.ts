import { Type } from '../types.js';
import { ModuleType } from '../types.js';
import { EnhancedDIContainer } from '../di/enhanced-container.js';
import { LifecycleEventBus, LifecycleEvent } from '../lifecycle/event-bus.js';
import { isDynamicModule } from '../utils/module.utils.js';
import { MODULE_METADATA_KEY } from '../constants.js';
import * as fs from 'fs';

/**
 * 动态模块信息
 */
export interface DynamicModuleInfo {
  module: ModuleType;
  name: string;
  loadedAt: Date;
  controllers: Type<any>[];
  providers: any[];
  dependencies: string[];
}

/**
 * 模块热重载配置
 */
export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  excludePaths: string[];
  debounceMs: number;
}

/**
 * 动态模块加载器
 */
export class DynamicModuleLoader {
  private readonly loadedModules = new Map<string, DynamicModuleInfo>();
  private readonly moduleControllers = new Map<string, Type<any>[]>();
  private readonly moduleProviders = new Map<string, any[]>();
  private readonly container: EnhancedDIContainer;
  private readonly eventBus: LifecycleEventBus;
  private hotReloadConfig: HotReloadConfig;
  private fileWatcher?: any; // fs.FSWatcher

  constructor(
    container: EnhancedDIContainer,
    eventBus: LifecycleEventBus,
    hotReloadConfig?: Partial<HotReloadConfig>
  ) {
    this.container = container;
    this.eventBus = eventBus;
    this.hotReloadConfig = {
      enabled: false,
      watchPaths: ['./src'],
      excludePaths: ['node_modules', '.git', 'dist'],
      debounceMs: 300,
      ...hotReloadConfig
    };
  }

  /**
   * 动态加载模块
   */
  async loadModule(module: ModuleType, moduleName?: string): Promise<string> {
    // 验证模块
    if (!module || (typeof module !== 'function' && typeof module !== 'object')) {
      throw new Error('Invalid module provided');
    }
    
    // 尝试访问模块属性以触发可能的错误
    try {
      if (typeof module === 'object' && 'module' in module) {
        // 访问module属性以触发getter错误
        const _ = (module as any).module;
      }
    } catch (error) {
      throw new Error(`Module initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    const name = moduleName || this.getModuleName(module);
    
    if (this.loadedModules.has(name)) {
      throw new Error(`模块 '${name}' 已经加载`);
    }

    await this.eventBus.emitModuleEvent(
      LifecycleEvent.MODULE_REGISTER_BEFORE,
      name,
      { moduleName: name }
    );

    try {
      // 注册模块到容器
      await this.container.registerModule(module);

      // 获取模块信息
      const resolvedModule = 'forwardRef' in module ? module() : module;
      const controllers = isDynamicModule(resolvedModule) ? (resolvedModule.controllers || []) : this.container.getControllers(resolvedModule);
      const providers = this.container.getAllProviders(module);
      const dependencies = this.getModuleDependencies(module);

      // 存储模块信息
      const moduleInfo: DynamicModuleInfo = {
        module,
        name,
        loadedAt: new Date(),
        controllers,
        providers,
        dependencies
      };

      this.loadedModules.set(name, moduleInfo);
      this.moduleControllers.set(name, controllers);
      this.moduleProviders.set(name, providers);

      await this.eventBus.emitModuleEvent(
        LifecycleEvent.MODULE_REGISTER_AFTER,
        name,
        { moduleName: name }
      );

      console.log(`✅ 模块 '${name}' 动态加载成功`);
      return name;
    } catch (error) {
      console.error(`❌ 模块 '${name}' 动态加载失败:`, error);
      throw error;
    }
  }

  /**
   * 动态卸载模块
   */
  async unloadModule(moduleName: string): Promise<void> {
    const moduleInfo = this.loadedModules.get(moduleName);
    if (!moduleInfo) {
      throw new Error(`模块 '${moduleName}' 未找到`);
    }

    await this.eventBus.emitModuleEvent(
      LifecycleEvent.MODULE_DESTROY_BEFORE,
      moduleName,
      { moduleName }
    );

    try {
      // 执行模块销毁生命周期
      await this.executeModuleDestroy(moduleInfo);

      // 从容器中移除提供者（这需要容器支持）
      // 注意：当前的 DI 容器不支持动态移除，这里是概念性实现
      this.removeModuleFromContainer(moduleInfo);

      // 清理模块信息
      this.loadedModules.delete(moduleName);
      this.moduleControllers.delete(moduleName);
      this.moduleProviders.delete(moduleName);

      await this.eventBus.emitModuleEvent(
        LifecycleEvent.MODULE_DESTROY_AFTER,
        moduleName,
        { moduleName }
      );

      console.log(`✅ 模块 '${moduleName}' 动态卸载成功`);
    } catch (error) {
      console.error(`❌ 模块 '${moduleName}' 动态卸载失败:`, error);
      throw error;
    }
  }

  /**
   * 重新加载模块
   */
  async reloadModule(moduleName: string): Promise<void> {
    const moduleInfo = this.loadedModules.get(moduleName);
    if (!moduleInfo) {
      throw new Error(`模块 '${moduleName}' 未找到`);
    }

    console.log(`🔄 重新加载模块 '${moduleName}'...`);
    
    try {
      // 先卸载
      await this.unloadModule(moduleName);
      
      // 清除模块缓存（如果使用 require.cache）
      this.clearModuleRequireCache(moduleInfo.module);
      
      // 重新加载
      await this.loadModule(moduleInfo.module, moduleName);
      
      console.log(`✅ 模块 '${moduleName}' 重新加载成功`);
    } catch (error) {
      console.error(`❌ 模块 '${moduleName}' 重新加载失败:`, error);
      throw error;
    }
  }

  /**
   * 获取已加载的模块列表
   */
  getLoadedModules(): DynamicModuleInfo[] {
    return Array.from(this.loadedModules.values());
  }

  /**
   * 获取模块信息
   */
  getModuleInfo(moduleName: string): DynamicModuleInfo | undefined {
    return this.loadedModules.get(moduleName);
  }

  /**
   * 获取模块
   */
  getModule(moduleName: string): DynamicModuleInfo | undefined {
    return this.loadedModules.get(moduleName);
  }

  /**
   * 检查模块是否已加载
   */
  isModuleLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  /**
   * 检查热重载是否启用
   */
  isHotReloadEnabled(): boolean {
    return this.hotReloadConfig.enabled;
  }

  /**
   * 清除所有模块缓存
   */
  clearCache(): void {
    this.loadedModules.clear();
    this.moduleControllers.clear();
    this.moduleProviders.clear();
  }

  /**
   * 清除指定模块缓存
   */
  clearModuleCache(moduleName: string): void {
    this.loadedModules.delete(moduleName);
    this.moduleControllers.delete(moduleName);
    this.moduleProviders.delete(moduleName);
  }

  /**
   * 销毁加载器
   */
  destroy(): void {
    this.disableHotReload();
    this.clearCache();
  }

  /**
   * 启用热重载
   */
  enableHotReload(watchPath?: string, options?: any): void {
    if (watchPath) {
      if (!fs.existsSync(watchPath)) {
        throw new Error(`Directory ${watchPath} does not exist`);
      }
      if (!fs.statSync(watchPath).isDirectory()) {
        throw new Error(`${watchPath} is not a directory`);
      }
      this.hotReloadConfig.watchPaths = [watchPath];
    }
    
    if (options) {
      this.hotReloadConfig = { ...this.hotReloadConfig, ...options };
    }
    
    if (!this.hotReloadConfig.enabled) {
      this.hotReloadConfig.enabled = true;
      this.setupFileWatcher();
      console.log('🔥 模块热重载已启用');
    }
  }

  /**
   * 禁用热重载
   */
  disableHotReload(): void {
    if (this.hotReloadConfig.enabled) {
      this.hotReloadConfig.enabled = false;
      if (this.fileWatcher) {
        this.fileWatcher.close();
        this.fileWatcher = undefined;
      }
      console.log('❄️ 模块热重载已禁用');
    }
  }

  /**
   * 获取模块名称
   */
  private getModuleName(module: ModuleType): string {
    if (isDynamicModule(module)) {
      return (module as any).name || 'DynamicModule';
    }
    
    const resolvedModule = 'forwardRef' in module ? module() : module;
    return resolvedModule.name || 'UnknownModule';
  }

  /**
   * 获取模块依赖
   */
  private getModuleDependencies(module: ModuleType): string[] {
    const dependencies: string[] = [];
    
    if (isDynamicModule(module)) {
      if (module.imports) {
        dependencies.push(...module.imports.map(imp => this.getModuleName(imp)));
      }
    } else {
      const resolvedModule = 'forwardRef' in module ? module() : module;
      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);
      
      if (metadata?.imports) {
        dependencies.push(...metadata.imports.map((imp: ModuleType) => this.getModuleName(imp)));
      }
    }
    
    return dependencies;
  }

  /**
   * 执行模块销毁生命周期
   */
  private async executeModuleDestroy(moduleInfo: DynamicModuleInfo): Promise<void> {
    // 执行提供者的 onModuleDestroy 生命周期
    for (const provider of moduleInfo.providers) {
      try {
        const instance = await this.container.resolve(provider);
        if (instance && typeof (instance as any).onModuleDestroy === 'function') {
          await (instance as any).onModuleDestroy();
        }
      } catch (error) {
        console.warn(`提供者销毁失败:`, error);
      }
    }
  }

  /**
   * 从容器中移除模块
   */
  private removeModuleFromContainer(moduleInfo: DynamicModuleInfo): void {
    // 注意：这需要 DI 容器支持动态移除功能
    // 当前实现是概念性的，实际需要扩展容器 API
    try {
      if (this.container.removeModule) {
        this.container.removeModule(moduleInfo.module);
      }
    } catch (error) {
      console.error(`从容器中移除模块失败: ${moduleInfo.name}`, error);
      throw error;
    }
    console.log(`从容器中移除模块: ${moduleInfo.name}`);
  }

  /**
   * 清除模块缓存（私有方法，用于重新加载时清除require缓存）
   */
  private clearModuleRequireCache(module: ModuleType): void {
    // 如果使用 CommonJS require，清除缓存
    if (typeof require !== 'undefined' && require.cache) {
      // 这里需要根据实际的模块路径来清除缓存
      // 实际实现需要更复杂的逻辑来确定模块文件路径
      console.log('清除模块缓存');
    }
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(): void {
    if (typeof require === 'undefined') {
      console.warn('热重载需要 Node.js 环境支持');
      return;
    }

    try {
      const path = require('path');
      
      // 监听指定路径
      for (const watchPath of this.hotReloadConfig.watchPaths) {
        if (fs.existsSync(watchPath)) {
          const watcher = fs.watch(
            watchPath,
            { recursive: true },
            this.debounce((eventType: string, filename: string | Buffer | null) => {
              if (filename && typeof filename === 'string' && this.shouldReload(filename)) {
                this.handleFileChange(filename);
              }
            }, this.hotReloadConfig.debounceMs)
          );
          
          this.fileWatcher = watcher;
        }
      }
    } catch (error) {
      console.error('设置文件监听器失败:', error);
    }
  }

  /**
   * 检查是否应该重新加载
   */
  private shouldReload(filename: string): boolean {
    // 检查文件扩展名
    if (!/\.(ts|js)$/.test(filename)) {
      return false;
    }
    
    // 检查排除路径
    for (const excludePath of this.hotReloadConfig.excludePaths) {
      if (filename.includes(excludePath)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 处理文件变化
   */
  private async handleFileChange(filename: string): Promise<void> {
    console.log(`📁 检测到文件变化: ${filename}`);
    
    // 这里需要更复杂的逻辑来确定哪个模块需要重新加载
    // 简化实现：重新加载所有模块
    const moduleNames = Array.from(this.loadedModules.keys());
    
    for (const moduleName of moduleNames) {
      try {
        await this.reloadModule(moduleName);
      } catch (error) {
        console.error(`重新加载模块 '${moduleName}' 失败:`, error);
      }
    }
  }

  /**
   * 防抖函数
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

}