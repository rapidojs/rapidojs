import 'reflect-metadata';
import { Type } from '../types.js';
import { INJECT_METADATA_KEY } from '../constants.js';

/**
 * 参数装饰器，用于标记构造函数参数以进行依赖注入
 * 可以提供一个自定义令牌（包括使用 forwardRef 的延迟引用）
 * 
 * @example
 * // 简单用法
 * constructor(@Inject() private service: MyService) {}
 * 
 * // 使用自定义令牌
 * constructor(@Inject('CONFIG') private config: Config) {}
 * 
 * // 使用 forwardRef 解决循环依赖
 * constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB) {}
 */
export function Inject(token?: any): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // 如果提供了自定义令牌，则存储它
    if (token !== undefined) {
      const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, target) || {};
      injectMetadata[parameterIndex] = token;
      Reflect.defineMetadata(INJECT_METADATA_KEY, injectMetadata, target);
    }
  };
} 