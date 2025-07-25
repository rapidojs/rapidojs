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

export class DIContainer {
  private readonly providers = new Map<any, any>();
  private readonly instances = new Map<any, any>();
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

  public async resolve<T>(target: Type<T> | ForwardReference<T>): Promise<T> {
    // 处理 undefined 或 null 的情况
    if (!target) {
      throw new Error('无法解析空的依赖目标');
    }

    const actualTarget = this.getInjectionToken(target);

    // 如果是字符串令牌，检查是否已注册为值提供者
    if (typeof actualTarget === 'string') {
      if (!this.providers.has(actualTarget)) {
        throw new Error(`未找到令牌 '${actualTarget}' 的提供者`);
      }
      const provider = this.providers.get(actualTarget);
      if (provider.useValue !== undefined) {
        return provider.useValue;
      }
      throw new Error(`令牌 '${actualTarget}' 不是值提供者`);
    }

    // 检查是否是一个有效的类/构造函数
    if (!actualTarget || typeof actualTarget !== 'function') {
      throw new Error(`无法解析非构造函数类型: ${actualTarget}`);
    }

    if (this.instances.has(actualTarget)) {
      return this.instances.get(actualTarget) as T;
    }

    // 检测循环依赖，但对于已经创建临时实例的情况允许继续
    if (this.isResolving.has(actualTarget)) {
      // 如果已经有临时实例，返回它
      if (this.instances.has(actualTarget)) {
        return this.instances.get(actualTarget) as T;
      }
      // 否则抛出循环依赖错误
      throw new Error(`检测到循环依赖: ${actualTarget.name} 正在被解析中`);
    }

    const isController = Reflect.getMetadata(CONTROLLER_METADATA, actualTarget) !== undefined;

    if (!this.providers.has(actualTarget)) {
      // If the token is not a registered provider, it might be a controller
      // or a class that doesn't need to be explicitly registered. We can
      // treat it as a transient provider.
      this.providers.set(actualTarget, actualTarget);
    }

    // 标记正在解析
    this.isResolving.add(actualTarget);
    
    // 创建临时实例来处理循环依赖
    const tempInstance = Object.create(actualTarget.prototype);
    this.instances.set(actualTarget, tempInstance);

    try {
      const paramTypes = Reflect.getMetadata('design:paramtypes', actualTarget) || [];
      const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, actualTarget) || {};

      const injections = await Promise.all(
        paramTypes.map(async (paramType: Type<any>, index: number) => {
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

      const instance = new actualTarget(...injections);
      
      // 复制临时实例的原型，然后用真实实例替换
      Object.setPrototypeOf(tempInstance, actualTarget.prototype);
      Object.assign(tempInstance, instance);
      
      // 解析完成，移除标记
      this.isResolving.delete(actualTarget);
      
      return tempInstance as T;
    } catch (error) {
      this.instances.delete(actualTarget);
      // 解析失败时也要移除标记
      this.isResolving.delete(actualTarget);
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

  public findFilter(exception: Error): Type<ExceptionFilter> | undefined {
    const exceptionType = exception.constructor as Type<Error>;
    return this.exceptionFilters.get(exceptionType);
  }
}
