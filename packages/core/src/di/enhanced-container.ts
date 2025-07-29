import 'reflect-metadata';
import { Type, ModuleMetadata, ModuleType, Provider } from '../types.js';
import { EXCEPTION_FILTER_METADATA, CONTROLLER_METADATA, INJECT_METADATA_KEY, MODULE_METADATA_KEY, MODULE_METADATA } from '../constants.js';
import { ForwardReference } from '@rapidojs/common';
import { isForwardReference } from './forward-ref.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { HttpException } from '../exceptions/http-exception.js';
import { isDynamicModule } from '../utils/module.utils.js';
import { EventEmitter } from 'events';
import { isLazyParameter } from '../decorators/lazy.decorator.js';
import { getScopeMetadata } from '../decorators/scope.decorator.js';
import { getConditionalMetadata } from '../decorators/conditional.decorator.js';
import { globalEventBus } from '../lifecycle/event-bus.js';
import { IContainer } from './container.interface.js';

/**
 * 依赖作用域枚举
 */
export enum DependencyScope {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  REQUEST = 'request'
}

/**
 * 增强的提供者接口
 */
export interface EnhancedProvider {
  provide?: any;
  useClass?: Type<any>;
  useValue?: any;
  useFactory?: (...args: any[]) => any;
  inject?: any[];
  scope?: DependencyScope;
  lazy?: boolean;
  condition?: {
    config?: string;
    value?: any;
    env?: string;
    condition?: () => boolean;
  };
}

/**
 * 依赖关系追踪器
 */
class DependencyTracker {
  private resolutionPath: string[] = [];
  private warnings: string[] = [];

  /**
   * 开始解析依赖
   */
  startResolving(token: string): void {
    if (this.resolutionPath.includes(token)) {
      const cyclePath = [...this.resolutionPath, token];
      const warning = `检测到循环依赖: ${cyclePath.join(' -> ')}`;
      this.warnings.push(warning);
      console.warn(`⚠️  ${warning}`);
      console.warn('建议使用 forwardRef() 来解决循环依赖问题');
    }
    this.resolutionPath.push(token);
  }

  /**
   * 完成解析依赖
   */
  finishResolving(token: string): void {
    const index = this.resolutionPath.lastIndexOf(token);
    if (index !== -1) {
      this.resolutionPath.splice(index, 1);
    }
  }

  /**
   * 获取所有警告
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * 清除警告
   */
  clearWarnings(): void {
    this.warnings = [];
  }
}

/**
 * 懒加载代理工厂
 */
class LazyProxyFactory {
  /**
   * 创建懒加载代理
   */
  static createProxy<T extends object>(resolver: () => Promise<T>): T {
    let instance: T | null = null;
    let isLoading = false;
    let loadPromise: Promise<T> | null = null;

    return new Proxy({} as T, {
      get(target, prop, receiver) {
        if (instance) {
          return Reflect.get(instance, prop, receiver);
        }

        if (!isLoading) {
          isLoading = true;
          loadPromise = resolver().then(resolved => {
            instance = resolved;
            isLoading = false;
            return resolved;
          });
        }

        // 如果是 Promise 方法，返回 Promise
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          if (loadPromise && typeof loadPromise === 'object' && prop in loadPromise) {
            const method = (loadPromise as any)[prop];
            return typeof method === 'function' ? method.bind(loadPromise) : method;
          }
        }

        // 对于其他属性，等待实例解析完成
        throw new Error(`懒加载服务正在初始化中，请等待解析完成后再访问属性: ${String(prop)}`);
      },

      set(target, prop, value, receiver) {
        if (instance) {
          return Reflect.set(instance, prop, value, receiver);
        }
        throw new Error('懒加载服务尚未初始化，无法设置属性');
      }
    });
  }
}

/**
 * 请求级作用域容器
 */
class RequestScopedContainer {
  private instances = new Map<any, any>();
  private parentContainer: EnhancedDIContainer;

  constructor(parentContainer: EnhancedDIContainer) {
    this.parentContainer = parentContainer;
  }

  /**
   * 检查是否有实例
   */
  has(token: any): boolean {
    return this.instances.has(token);
  }

  /**
   * 获取实例
   */
  get<T>(token: any): T {
    return this.instances.get(token);
  }

  /**
   * 设置实例
   */
  set<T>(token: any, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * 解析请求级依赖
   */
  async resolve<T>(token: any): Promise<T> {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const instance = await this.parentContainer.createRequestScopedInstance<T>(token, this);
    this.instances.set(token, instance);
    return instance;
  }

  /**
   * 销毁请求级容器
   */
  destroy(): void {
    this.instances.clear();
  }
}

/**
 * 增强的依赖注入容器
 */
export class EnhancedDIContainer implements IContainer {
  private readonly providers = new Map<any, EnhancedProvider>();
  private readonly singletonInstances = new Map<any, any>();
  private readonly modules = new Set<ModuleType>();
  private readonly isResolving = new Set<any>();
  private readonly dependencyTracker = new DependencyTracker();
  private readonly eventBus = new EventEmitter();
  private exceptionFilters: Map<Type<Error>, Type<ExceptionFilter>> = new Map();
  private config: any = {};
  private currentRequestId: string | null = null;
  private requestContainers = new Map<string, RequestScopedContainer>();

  /**
   * 兼容性属性：返回单例实例映射
   */
  public get instances(): Map<any, any> {
    return this.singletonInstances;
  }

  constructor() {
    // 设置默认配置
    this.loadConfiguration();
  }

  /**
   * 加载配置
   */
  private loadConfiguration(): void {
    // 从环境变量或配置文件加载配置
    // 这里可以扩展为从实际配置源加载
    this.config.NODE_ENV = process.env.NODE_ENV || 'development';
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventEmitter {
    return this.eventBus;
  }

  /**
   * 注册模块
   */
  public async registerModule(module: ModuleType): Promise<void> {
    this.eventBus.emit('module:register:before', module);
    
    if (this.modules.has(module)) {
      this.eventBus.emit('module:register:after', module);
      return;
    }
    
    this.modules.add(module);

    if (isDynamicModule(module)) {
      if (module.imports) {
        for (const imported of module.imports) {
          await this.registerModule(imported);
        }
      }
      if (module.providers) {
        for (const provider of module.providers) {
          this.registerProvider(provider as EnhancedProvider);
        }
      }
      this.eventBus.emit('module:register:after', module);
      return;
    }

    const resolvedModule = 'forwardRef' in module ? module() : module;
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);

    if (metadata?.imports) {
      for (const imported of metadata.imports) {
        await this.registerModule(imported);
      }
    }
    if (metadata?.providers) {
      for (const provider of metadata.providers) {
        this.registerProvider(provider as EnhancedProvider);
      }
    }
    
    this.eventBus.emit('module:register:after', module);
  }

  /**
   * 注册提供者
   */
  public registerProvider(provider: EnhancedProvider): void {
    const providerToken = typeof provider === 'function' ? provider : provider.provide;
    
    // 检查条件注入
    if (provider.condition && !this.checkCondition(provider.condition)) {
      console.log(`条件不满足，跳过注册提供者: ${this.getProviderName(provider)}`);
      return;
    }

    // 检查是否已经有 useValue 提供者存在
    if (this.providers.has(providerToken)) {
      const existingProvider = this.providers.get(providerToken);
      if (existingProvider?.useValue !== undefined && !provider.useValue) {
        return;
      }
    }

    // 设置默认作用域
    if (!provider.scope) {
      provider.scope = DependencyScope.SINGLETON;
    }

    if (typeof provider === 'function') {
      this.providers.set(provider, { 
        useClass: provider, 
        scope: DependencyScope.SINGLETON,
        lazy: false
      });
    } else {
      this.providers.set(provider.provide, provider);
    }
  }

  /**
   * 检查条件
   */
  private checkCondition(condition: NonNullable<EnhancedProvider['condition']>): boolean;
  private checkCondition(provider: EnhancedProvider): boolean;
  private checkCondition(conditionOrProvider: NonNullable<EnhancedProvider['condition']> | EnhancedProvider): boolean {
    let condition: NonNullable<EnhancedProvider['condition']>;
    
    if ('provide' in conditionOrProvider || 'useClass' in conditionOrProvider || 'useValue' in conditionOrProvider || 'useFactory' in conditionOrProvider) {
      // 这是一个 EnhancedProvider
      const provider = conditionOrProvider as EnhancedProvider;
      if (!provider.condition) {
        return true;
      }
      condition = provider.condition;
    } else {
      // 这是一个条件对象
      condition = conditionOrProvider as NonNullable<EnhancedProvider['condition']>;
    }
    
    if (condition.env) {
      const envValue = process.env[condition.env];
      return envValue === condition.value;
    }
    
    if (condition.config) {
      const configValue = this.getConfigValue(condition.config);
      return configValue === condition.value;
    }
    
    if (condition.condition && typeof condition.condition === 'function') {
      return condition.condition();
    }
    
    return true;
  }

  /**
   * 获取配置值（支持嵌套路径）
   */
  private getConfigValue(path: string): any {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * 获取提供者名称
   */
  private getProviderName(provider: EnhancedProvider | Type<any>): string {
    if (typeof provider === 'function') {
      return provider.name || 'Anonymous';
    }
    if (provider.provide && typeof provider.provide === 'function') {
      return provider.provide.name || 'Anonymous';
    }
    return String(provider.provide || 'Anonymous');
  }

  /**
   * 创建请求级作用域容器
   */
  createRequestScopedContainer(): RequestScopedContainer {
    return new RequestScopedContainer(this);
  }

  /**
   * 创建请求级实例
   */
  async createRequestScopedInstance<T>(token: any, requestContainer: RequestScopedContainer): Promise<T> {
    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`未找到令牌 '${String(token)}' 的提供者`);
    }

    if (provider.useValue !== undefined) {
      return provider.useValue;
    }

    if (provider.useFactory) {
      const factoryDeps = await Promise.all(
        (provider.inject || []).map((dep: any) => {
          const depProvider = this.providers.get(dep);
          if (depProvider?.scope === DependencyScope.REQUEST) {
            return requestContainer.resolve(dep);
          }
          return this.resolveAsync(dep);
        })
      );
      return await provider.useFactory(...factoryDeps);
    }

    const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
    if (targetClass) {
      return this.createInstance(token, targetClass, requestContainer);
    }

    throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
  }

  /**
   * 解析依赖（同步版本）
   */
  public resolve<T>(target: Type<T> | ForwardReference<T> | string, requestContainer?: RequestScopedContainer): T {
    if (!target) {
      throw new Error('无法解析空的依赖目标');
    }

    const actualTarget = typeof target === 'string' ? target : this.getInjectionToken(target);
    const tokenName = this.getTokenName(actualTarget);
    
    // 检查循环依赖
    if (this.isResolving.has(actualTarget)) {
      if (this.singletonInstances.has(actualTarget)) {
        return this.singletonInstances.get(actualTarget) as T;
      }
      throw new Error(`检测到循环依赖: ${tokenName}`);
    }
    
    this.dependencyTracker.startResolving(tokenName);
    
    try {
      const provider = this.providers.get(actualTarget);
      
      if (provider) {
        // 检查条件
        if (!this.checkCondition(provider)) {
          throw new Error(`提供者 ${tokenName} 的条件不满足`);
        }
        
        // 处理请求级作用域
        if (provider.scope === DependencyScope.REQUEST) {
          if (this.currentRequestId) {
            const requestContainer = this.getRequestContainer(this.currentRequestId);
            if (requestContainer) {
              return this.resolveRequestScoped(actualTarget, requestContainer);
            }
          }
          // 如果没有请求ID或请求容器，按瞬态处理
          return this.createTransientInstanceSync(actualTarget, provider, requestContainer);
        }
        
        // 处理瞬态作用域
        if (provider.scope === DependencyScope.TRANSIENT) {
          return this.createTransientInstanceSync(actualTarget, provider, requestContainer);
        }
        
        // 处理懒加载
        if (provider.lazy) {
          return this.createLazyProxy(actualTarget, requestContainer) as T;
        }
        
        // 处理单例作用域
        return this.resolveSingletonSync(actualTarget, provider, requestContainer);
      }

      if (typeof actualTarget === 'function') {
        this.providers.set(actualTarget, { 
          useClass: actualTarget, 
          scope: DependencyScope.SINGLETON,
          lazy: false
        });
        return this.createInstanceSync(actualTarget, actualTarget, requestContainer);
      }

      throw new Error(`未找到令牌 '${String(actualTarget)}' 的提供者`);
    } finally {
      this.dependencyTracker.finishResolving(tokenName);
    }
  }

  /**
   * 解析依赖（异步版本）
   */
  public async resolveAsync<T>(target: Type<T> | ForwardReference<T> | string, requestContainer?: RequestScopedContainer): Promise<T> {
    if (!target) {
      throw new Error('无法解析空的依赖目标');
    }

    const actualTarget = typeof target === 'string' ? target : this.getInjectionToken(target);
    const tokenName = this.getTokenName(actualTarget);
    
    this.dependencyTracker.startResolving(tokenName);
    
    try {
      const provider = this.providers.get(actualTarget);
      
      if (provider) {
        // 处理请求级作用域
        if (provider.scope === DependencyScope.REQUEST && requestContainer) {
          return await requestContainer.resolve(actualTarget);
        }
        
        // 处理瞬态作用域
        if (provider.scope === DependencyScope.TRANSIENT) {
          return await this.createTransientInstance(actualTarget, provider, requestContainer);
        }
        
        // 处理懒加载
        if (provider.lazy) {
          return LazyProxyFactory.createProxy(() => this.resolveEagerly(actualTarget, requestContainer)) as T;
        }
        
        // 处理单例作用域
        return await this.resolveSingleton(actualTarget, provider, requestContainer);
      }

      if (typeof actualTarget === 'function') {
        this.providers.set(actualTarget, { 
          useClass: actualTarget, 
          scope: DependencyScope.SINGLETON,
          lazy: false
        });
        return this.createInstance(actualTarget, actualTarget, requestContainer);
      }

      throw new Error(`未找到令牌 '${String(actualTarget)}' 的提供者`);
    } finally {
      this.dependencyTracker.finishResolving(tokenName);
    }
  }

  /**
   * 创建懒加载代理（同步版本）
   */
  private createLazyProxy<T extends object>(target: any, requestContainer?: RequestScopedContainer): T {
    const self = this;
    let instance: T | null = null;
    
    return new Proxy({} as T, {
      get(proxyTarget, prop, receiver) {
        if (!instance) {
          const provider = self.providers.get(target);
          if (provider) {
            const originalLazy = provider.lazy;
            provider.lazy = false;
            try {
              instance = self.resolve(target, requestContainer);
            } finally {
              provider.lazy = originalLazy;
            }
          }
        }
        
        if (instance) {
          return Reflect.get(instance, prop, receiver);
        }
        
        throw new Error(`懒加载服务尚未初始化: ${String(prop)}`);
      },
      
      set(proxyTarget, prop, value, receiver) {
        if (!instance) {
          throw new Error('懒加载服务尚未初始化，无法设置属性');
        }
        return Reflect.set(instance, prop, value, receiver);
      }
    });
  }

  /**
   * 急切解析（用于懒加载）
   */
  private async resolveEagerly<T>(target: any, requestContainer?: RequestScopedContainer): Promise<T> {
    const provider = this.providers.get(target);
    if (!provider) {
      throw new Error(`未找到令牌 '${String(target)}' 的提供者`);
    }

    // 临时禁用懒加载
    const originalLazy = provider.lazy;
    provider.lazy = false;
    
    try {
      return await this.resolveAsync(target, requestContainer);
    } finally {
      provider.lazy = originalLazy;
    }
  }

  /**
   * 解析请求级作用域（同步版本）
   */
  private resolveRequestScoped<T>(token: any, requestContainer: RequestScopedContainer): T {
    // 检查请求容器中是否已有实例
    if (requestContainer && requestContainer.has && requestContainer.has(token)) {
      return requestContainer.get(token);
    }
    
    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`未找到令牌 '${String(token)}' 的提供者`);
    }
    
    let instance: T;
    
    if (provider.useValue !== undefined) {
      instance = provider.useValue;
    } else if (provider.useFactory) {
      const factoryDeps = (provider.inject || []).map((dep: any) => this.resolve(dep, requestContainer));
      instance = provider.useFactory(...factoryDeps);
    } else {
      const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
      if (targetClass) {
        instance = this.createInstanceDirectlySync(targetClass, requestContainer);
      } else {
        throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
      }
    }
    
    // 将实例存储到请求容器中
    if (requestContainer && requestContainer.set) {
      requestContainer.set(token, instance);
    }
    
    return instance;
  }

  /**
   * 创建瞬态实例（同步版本）
   */
  private createTransientInstanceSync<T>(token: any, provider: EnhancedProvider, requestContainer?: RequestScopedContainer): T {
    if (provider.useValue !== undefined) {
      return provider.useValue;
    }

    if (provider.useFactory) {
      const factoryDeps = (provider.inject || []).map((dep: any) => this.resolve(dep, requestContainer));
      return provider.useFactory(...factoryDeps);
    }

    const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
    if (targetClass) {
      return this.createInstanceDirectlySync(targetClass, requestContainer);
    }

    throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
  }

  /**
   * 解析单例（同步版本）
   */
  private resolveSingletonSync<T>(token: any, provider: EnhancedProvider, requestContainer?: RequestScopedContainer): T {
    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    if (this.isResolving.has(token)) {
      if (this.singletonInstances.has(token)) {
        return this.singletonInstances.get(token);
      }
      throw new Error(`检测到循环依赖: ${this.getTokenName(token)}`);
    }

    if (provider.useValue !== undefined) {
      this.singletonInstances.set(token, provider.useValue);
      return provider.useValue;
    }

    if (provider.useFactory) {
      this.isResolving.add(token);
      try {
        const factoryDeps = (provider.inject || []).map((dep: any) => this.resolve(dep, requestContainer));
        const instance = provider.useFactory(...factoryDeps);
        this.singletonInstances.set(token, instance);
        return instance;
      } finally {
        this.isResolving.delete(token);
      }
    }

    const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
    if (targetClass) {
      return this.createInstanceSync(token, targetClass, requestContainer);
    }

    throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
  }

  /**
   * 解析单例（异步版本）
   */
  private async resolveSingleton<T>(token: any, provider: EnhancedProvider, requestContainer?: RequestScopedContainer): Promise<T> {
    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    if (this.isResolving.has(token)) {
      if (this.singletonInstances.has(token)) {
        return this.singletonInstances.get(token);
      }
      throw new Error(`检测到循环依赖: ${this.getTokenName(token)}`);
    }

    if (provider.useValue !== undefined) {
      this.singletonInstances.set(token, provider.useValue);
      return provider.useValue;
    }

    if (provider.useFactory) {
      this.isResolving.add(token);
      try {
        const factoryDeps = await Promise.all(
          (provider.inject || []).map((dep: any) => this.resolveAsync(dep, requestContainer))
        );
        const instance = await provider.useFactory(...factoryDeps);
        this.singletonInstances.set(token, instance);
        return instance;
      } finally {
        this.isResolving.delete(token);
      }
    }

    const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
    if (targetClass) {
      return this.createInstance(token, targetClass, requestContainer);
    }

    throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
  }

  /**
   * 创建瞬态实例
   */
  private async createTransientInstance<T>(token: any, provider: EnhancedProvider, requestContainer?: RequestScopedContainer): Promise<T> {
    if (provider.useValue !== undefined) {
      return provider.useValue;
    }

    if (provider.useFactory) {
      const factoryDeps = await Promise.all(
        (provider.inject || []).map((dep: any) => this.resolveAsync(dep, requestContainer))
      );
      return await provider.useFactory(...factoryDeps);
    }

    const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
    if (targetClass) {
      return this.createInstanceDirectly(targetClass, requestContainer);
    }

    throw new Error(`为令牌 ${String(token)} 注册的提供者无效`);
  }

  /**
   * 获取注入令牌
   */
  private getInjectionToken<T>(typeOrRef: Type<T> | ForwardReference<T>): Type<T> {
    return isForwardReference(typeOrRef) ? this.resolveForwardRef(typeOrRef) : typeOrRef;
  }

  /**
   * 解析前向引用
   */
  private resolveForwardRef<T>(forwardRef: ForwardReference<T>): Type<T> {
    return forwardRef();
  }

  /**
   * 获取令牌名称
   */
  private getTokenName(token: any): string {
    if (typeof token === 'function') {
      return token.name || 'Anonymous';
    }
    return String(token);
  }

  /**
   * 创建实例（同步版本）
   */
  private createInstanceSync<T>(token: any, targetClass: Type<T>, requestContainer?: RequestScopedContainer): T {
    this.isResolving.add(token);

    const tempInstance = Object.create(targetClass.prototype);
    this.singletonInstances.set(token, tempInstance);

    try {
      const instance = this.createInstanceDirectlySync(targetClass, requestContainer);
      
      Object.setPrototypeOf(tempInstance, targetClass.prototype);
      Object.assign(tempInstance, instance);
      
      this.isResolving.delete(token);
      
      // 发布服务创建事件（同步）
        try {
          globalEventBus.emit('service:created', {
            type: 'service:created',
            timestamp: new Date(),
            source: 'service',
            service: targetClass,
            serviceName: targetClass.name,
            data: {
              serviceName: targetClass.name,
              scope: DependencyScope.SINGLETON
            }
          });
        } catch (error) {
          console.warn('事件发布失败:', error);
        }
      
      return tempInstance as T;
    } catch (error) {
      this.singletonInstances.delete(token);
      this.isResolving.delete(token);
      throw error;
    }
  }

  /**
   * 直接创建实例（同步版本）
   */
  private createInstanceDirectlySync<T>(targetClass: Type<T>, requestContainer?: RequestScopedContainer): T {
    const paramTypes = Reflect.getMetadata('design:paramtypes', targetClass) || [];
    const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, targetClass) || {};

    const injections = Object.keys(injectMetadata).length > 0 
      ? Array.from({ length: Math.max(...Object.keys(injectMetadata).map(k => parseInt(k))) + 1 }, (_, index) => {
          const customToken = injectMetadata[index];
          if (customToken !== undefined) {
            return this.resolve(customToken, requestContainer);
          }
          const paramType = paramTypes?.[index];
          if (!paramType || typeof paramType !== 'function') {
            return undefined;
          }
          return this.resolve(paramType, requestContainer);
        })
      : (paramTypes || []).map((paramType: Type<any>, index: number) => {
          const customToken = injectMetadata[index];
          if (customToken !== undefined) {
            return this.resolve(customToken, requestContainer);
          }
          if (!paramType || typeof paramType !== 'function') {
            return undefined;
          }
          return this.resolve(paramType, requestContainer);
        });

    return new targetClass(...injections);
  }

  /**
   * 创建实例（异步版本）
   */
  private async createInstance<T>(token: any, targetClass: Type<T>, requestContainer?: RequestScopedContainer): Promise<T> {
    this.isResolving.add(token);

    const tempInstance = Object.create(targetClass.prototype);
    this.singletonInstances.set(token, tempInstance);

    try {
      const instance = await this.createInstanceDirectly(targetClass, requestContainer);
      
      Object.setPrototypeOf(tempInstance, targetClass.prototype);
      Object.assign(tempInstance, instance);
      
      this.isResolving.delete(token);
      
      return tempInstance as T;
    } catch (error) {
      this.singletonInstances.delete(token);
      this.isResolving.delete(token);
      throw error;
    }
  }

  /**
   * 直接创建实例（不缓存）
   */
  private async createInstanceDirectly<T>(targetClass: Type<T>, requestContainer?: RequestScopedContainer): Promise<T> {
    const paramTypes = Reflect.getMetadata('design:paramtypes', targetClass) || [];
    const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, targetClass) || {};

    const injections = await Promise.all(
      Object.keys(injectMetadata).length > 0 
        ? Array.from({ length: Math.max(...Object.keys(injectMetadata).map(k => parseInt(k))) + 1 }, async (_, index) => {
            const customToken = injectMetadata[index];
            if (customToken !== undefined) {
              return this.resolveAsync(customToken, requestContainer);
            }
            const paramType = paramTypes?.[index];
            if (!paramType || typeof paramType !== 'function') {
              return undefined;
            }
            return this.resolveAsync(paramType, requestContainer);
          })
        : (paramTypes || []).map(async (paramType: Type<any>, index: number) => {
            const customToken = injectMetadata[index];
            if (customToken !== undefined) {
              return this.resolveAsync(customToken, requestContainer);
            }
            if (!paramType || typeof paramType !== 'function') {
              return undefined;
            }
            return this.resolveAsync(paramType, requestContainer);
          }),
    );

    return new targetClass(...injections);
  }

  // 保持与原始容器的兼容性
  public getControllers(module: Type<any>): Type<any>[] {
    return this.getAllControllers(module, new Set());
  }

  public getAllControllers(module: ModuleType, visited = new Set<ModuleType>()): Type<any>[] {
    if (visited.has(module)) {
      return [];
    }
    visited.add(module);

    if (isDynamicModule(module)) {
      let controllers = module.controllers || [];
      if (module.imports) {
        for (const imported of module.imports) {
          controllers.push(...this.getAllControllers(imported, visited));
        }
      }
      return controllers;
    }

    const resolvedModule = 'forwardRef' in module ? module() : module;
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);

    if (!metadata) {
      return [];
    }

    let controllers = metadata.controllers || [];
    if (metadata.imports) {
      for (const imported of metadata.imports) {
        controllers.push(...this.getAllControllers(imported, visited));
      }
    }
    return controllers;
  }

  public getAllBootstrapProviders(module: ModuleType, visited = new Set<ModuleType>()): any[] {
    if (visited.has(module)) {
      return [];
    }
    visited.add(module);

    if (isDynamicModule(module)) {
      let bootstrapProviders = (module as any).bootstrap || [];
      if (module.imports) {
        for (const imported of module.imports) {
          bootstrapProviders = [...bootstrapProviders, ...this.getAllBootstrapProviders(imported, visited)];
        }
      }
      return bootstrapProviders;
    }

    const resolvedModule = 'forwardRef' in module ? module() : module;
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);

    if (!metadata) {
      return [];
    }

    let bootstrapProviders = metadata.bootstrap || [];
    if (metadata.imports) {
      for (const imported of metadata.imports) {
        bootstrapProviders = [...bootstrapProviders, ...this.getAllBootstrapProviders(imported, visited)];
      }
    }
    return bootstrapProviders;
  }

  public getAllProviders(module: ModuleType, visited = new Set<ModuleType>()): any[] {
    if (visited.has(module)) {
      return [];
    }
    visited.add(module);

    if (isDynamicModule(module)) {
      let providers = module.providers || [];
      if (module.imports) {
        for (const imported of module.imports) {
          providers = [...providers, ...this.getAllProviders(imported, visited)];
        }
      }
      return providers;
    }

    const resolvedModule = 'forwardRef' in module ? module() : module;
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);

    if (!metadata) {
      return [];
    }

    let providers = metadata.providers || [];
    if (metadata.imports) {
      for (const imported of metadata.imports) {
        providers = [...providers, ...this.getAllProviders(imported, visited)];
      }
    }
    return providers;
  }

  public findFilter(exception: Error): Type<ExceptionFilter> | undefined {
    const exceptionType = exception.constructor as Type<Error>;
    return this.exceptionFilters.get(exceptionType);
  }

  /**
   * 获取依赖追踪器的警告
   */
  public getDependencyWarnings(): string[] {
    return this.dependencyTracker.getWarnings();
  }

  /**
   * 清除依赖警告
   */
  public clearDependencyWarnings(): void {
    this.dependencyTracker.clearWarnings();
  }

  /**
   * 检查是否应该注册提供者（基于条件）
   */
  public shouldRegisterProvider(providerClass: Type<any>): boolean {
    const conditionalMetadata = getConditionalMetadata(providerClass);
    if (!conditionalMetadata) {
      return true;
    }
    return this.checkCondition(conditionalMetadata);
  }

  /**
   * 设置配置
   */
  public setConfig(config: any): void {
    this.config = config;
  }

  /**
   * 获取配置
   */
  public getConfig(): any {
    return this.config;
  }

  /**
   * 设置当前请求ID
   */
  public setCurrentRequestId(requestId: string): void {
    this.currentRequestId = requestId;
    if (!this.requestContainers.has(requestId)) {
      this.requestContainers.set(requestId, new RequestScopedContainer(this));
    }
  }

  /**
   * 获取当前请求ID
   */
  public getCurrentRequestId(): string | null {
    return this.currentRequestId;
  }

  /**
   * 移除模块
   */
  public removeModule(module: ModuleType): void {
    this.modules.delete(module);
    // 这里可以添加更多的清理逻辑
    console.log('模块已从容器中移除');
  }

  /**
   * 获取请求级容器
   */
  public getRequestContainer(requestId?: string): RequestScopedContainer | null {
    const id = requestId || this.currentRequestId;
    if (!id) {
      return null;
    }
    return this.requestContainers.get(id) || null;
  }

  /**
   * 清理请求级容器
   */
  public cleanupRequestContainer(requestId: string): void {
    const container = this.requestContainers.get(requestId);
    if (container) {
      container.destroy();
      this.requestContainers.delete(requestId);
    }
  }
}