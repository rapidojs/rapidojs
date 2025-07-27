import 'reflect-metadata';
import { DependencyScope } from '../di/enhanced-container.js';

/**
 * 作用域装饰器常量
 */
export const SCOPE_METADATA_KEY = Symbol('scope');

/**
 * 作用域装饰器
 * 指定服务的生命周期作用域
 * 
 * @param scope 依赖作用域
 * 
 * @example
 * ```typescript
 * // 单例作用域（默认）
 * @Scope(DependencyScope.SINGLETON)
 * @Injectable()
 * class SingletonService {
 *   // 整个应用生命周期内只有一个实例
 * }
 * 
 * // 瞬态作用域
 * @Scope(DependencyScope.TRANSIENT)
 * @Injectable()
 * class TransientService {
 *   // 每次注入都创建新实例
 * }
 * 
 * // 请求级作用域
 * @Scope(DependencyScope.REQUEST)
 * @Injectable()
 * class RequestScopedService {
 *   // 每个 HTTP 请求内共享同一个实例
 * }
 * ```
 */
export function Scope(scope: DependencyScope): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(SCOPE_METADATA_KEY, scope, target);
  };
}

/**
 * 获取类的作用域配置
 */
export function getScope(target: any): DependencyScope {
  return Reflect.getMetadata(SCOPE_METADATA_KEY, target) || DependencyScope.SINGLETON;
}

/**
 * 获取类的作用域元数据
 */
export function getScopeMetadata(target: any): DependencyScope {
  return Reflect.getMetadata(SCOPE_METADATA_KEY, target) || DependencyScope.SINGLETON;
}

/**
 * 单例作用域装饰器（语法糖）
 */
export function Singleton(): ClassDecorator {
  return Scope(DependencyScope.SINGLETON);
}

/**
 * 瞬态作用域装饰器（语法糖）
 */
export function Transient(): ClassDecorator {
  return Scope(DependencyScope.TRANSIENT);
}

/**
 * 请求级作用域装饰器（语法糖）
 */
export function RequestScoped(): ClassDecorator {
  return Scope(DependencyScope.REQUEST);
}