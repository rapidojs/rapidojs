import { Type } from '../types.js';

/**
 * 延迟引用类型，用于解决循环依赖
 */
export interface ForwardReference<T = any> {
  forwardRef: true;
  (): Type<T>;
}

/**
 * 创建一个延迟引用，用于解决循环依赖
 * 
 * @example
 * // Module A
 * @Injectable()
 * class ServiceA {
 *   constructor(
 *     @Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB
 *   ) {}
 * }
 * 
 * // Module B
 * @Injectable()
 * class ServiceB {
 *   constructor(
 *     @Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA
 *   ) {}
 * }
 */
export function forwardRef<T = any>(fn: () => Type<T>): ForwardReference<T> {
  const forwardRefFn = Object.assign(fn, { forwardRef: true }) as ForwardReference<T>;
  return forwardRefFn;
}

/**
 * 判断一个值是否为延迟引用
 */
export function isForwardReference(typeOrToken: any): typeOrToken is ForwardReference {
  return typeOrToken && typeof typeOrToken === 'function' && 'forwardRef' in typeOrToken && typeOrToken.forwardRef === true;
}
