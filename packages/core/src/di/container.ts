import 'reflect-metadata';
import { Type } from '../types.js';
import { ModuleMetadata } from '../types.js';
import { EXCEPTION_FILTER_METADATA, CONTROLLER_METADATA } from '../constants.js';
import { ForwardReference } from '@rapidojs/common';
import { isForwardReference } from './forward-ref.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { INJECT_METADATA_KEY, MODULE_METADATA_KEY } from '../constants.js';
import { MODULE_METADATA } from '../constants.js';
import { HttpException } from '../exceptions/http-exception.js';
import { isDynamicModule } from '../utils/module.utils.js';
import { ModuleType } from '../types.js';
import { Provider } from '../types.js';
import { IContainer } from './container.interface.js';

export class DIContainer implements IContainer {
  private readonly providers = new Map<any, any>();
  public readonly instances = new Map<any, any>();
  private readonly modules = new Set<ModuleType>();
  private readonly isResolving = new Set<any>();
  private exceptionFilters: Map<Type<Error>, Type<ExceptionFilter>> = new Map();

  public async registerModule(module: ModuleType): Promise<void> {
    if (this.modules.has(module)) return;
    this.modules.add(module);

    if (isDynamicModule(module)) {
      if (module.imports) {
        for (const imported of module.imports) await this.registerModule(imported);
      }
      if (module.providers) {
        for (const provider of module.providers) this.registerProvider(provider);
      }
      return;
    }

    const resolvedModule = 'forwardRef' in module ? module() : module;
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule);

    if (metadata?.imports) {
      for (const imported of metadata.imports) await this.registerModule(imported);
    }
    if (metadata?.providers) {
      for (const provider of metadata.providers) this.registerProvider(provider);
    }
  }

  public registerProvider(provider: Provider): void {
    const providerToken = typeof provider === 'function' ? provider : provider.provide;
    const providerName =
      typeof provider === 'function'
        ? provider.name
        : typeof provider === 'object'
        ? (provider.provide as any)?.name || (typeof provider.provide === 'string' ? provider.provide : 'Unknown')
        : 'Unknown';

    const providerType = typeof provider === 'function' ? 'useClass' : (provider.useValue !== undefined ? 'useValue' : (provider.useFactory ? 'useFactory' : 'unknown'));

    // 检查是否已经有 useValue 提供者存在，如果有则不允许覆盖
    if (this.providers.has(providerToken)) {
      const existingProvider = this.providers.get(providerToken);
      if (existingProvider.useValue !== undefined && providerType !== 'useValue') {
        return; // 不覆盖已存在的 useValue 提供者
      }
    }

    if (typeof provider === 'function') {
      this.providers.set(provider, { useClass: provider });
    } else {
      this.providers.set(provider.provide, provider);
    }
  }

  private resolveForwardRef<T>(forwardRef: ForwardReference<T>): Type<T> {
    return forwardRef();
  }

  private getInjectionToken<T>(typeOrRef: Type<T> | ForwardReference<T>): Type<T> {
    return isForwardReference(typeOrRef) ? this.resolveForwardRef(typeOrRef) : typeOrRef;
  }

  public async resolve<T>(target: Type<T> | ForwardReference<T> | string): Promise<T> {
    // 处理 undefined 或 null 的情况
    if (!target) {
      throw new Error('无法解析空的依赖目标');
    }

    const actualTarget = typeof target === 'string' ? target : this.getInjectionToken(target);
    


    if (this.instances.has(actualTarget)) {
      return this.instances.get(actualTarget) as T;
    }

    if (this.isResolving.has(actualTarget)) {
      if (this.instances.has(actualTarget)) {
        return this.instances.get(actualTarget) as T;
      }
      throw new Error(`检测到循环依赖: ${(actualTarget as any).name || actualTarget}`);
    }

    const provider = this.providers.get(actualTarget);

    if (provider) {
      if (provider.useValue !== undefined) {
        this.instances.set(actualTarget, provider.useValue);
        return provider.useValue;
      }

      if (provider.useFactory) {
        this.isResolving.add(actualTarget);
        try {
          const factoryDeps = await Promise.all((provider.inject || []).map((dep: any) => this.resolve(dep)));
          const instance = await provider.useFactory(...factoryDeps);
          this.instances.set(actualTarget, instance);
          return instance;
        } finally {
          this.isResolving.delete(actualTarget);
        }
      }

      const targetClass = provider.useClass || (typeof provider === 'function' ? provider : null);
      if (targetClass) {
        return this.createInstance(actualTarget, targetClass);
      }

      throw new Error(`为令牌 ${String(actualTarget)} 注册的提供者无效`);
    }

    if (typeof actualTarget === 'function') {
      this.providers.set(actualTarget, actualTarget);
      return this.createInstance(actualTarget, actualTarget);
    }

    throw new Error(`未找到令牌 '${String(actualTarget)}' 的提供者`);
  }

  private async createInstance<T>(token: any, targetClass: Type<T>): Promise<T> {
    this.isResolving.add(token);

    const tempInstance = Object.create(targetClass.prototype);
    this.instances.set(token, tempInstance);

    try {
      const paramTypes = Reflect.getMetadata('design:paramtypes', targetClass) || [];
      const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, targetClass) || {};

      const injections = await Promise.all(
        Object.keys(injectMetadata).length > 0 
          ? // 如果有注入元数据，根据元数据创建注入数组
            Array.from({ length: Math.max(...Object.keys(injectMetadata).map(k => parseInt(k))) + 1 }, async (_, index) => {
              const customToken = injectMetadata[index];
                             if (customToken !== undefined) {
                 return this.resolve(customToken);
               }
              // 如果有 paramType，使用它
              const paramType = paramTypes?.[index];
              if (!paramType || typeof paramType !== 'function') {
                return undefined;
              }
              return this.resolve(paramType);
            })
          : // 否则使用 paramTypes
            (paramTypes || []).map(async (paramType: Type<any>, index: number) => {
                             const customToken = injectMetadata[index];
               if (customToken !== undefined) {
                 return this.resolve(customToken);
               }
              // 如果 paramType 是 undefined 或基础类型，跳过解析
              if (!paramType || typeof paramType !== 'function') {
                return undefined;
              }
              return this.resolve(paramType);
            }),
      );

      const instance = new targetClass(...injections);
      
      // 复制临时实例的原型，然后用真实实例替换
      Object.setPrototypeOf(tempInstance, targetClass.prototype);
      Object.assign(tempInstance, instance);
      
      // 解析完成，移除标记
      this.isResolving.delete(token);
      
      return tempInstance as T;
    } catch (error) {
      this.instances.delete(token);
      // 解析失败时也要移除标记
      this.isResolving.delete(token);
      throw error;
    }
  }

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
}
