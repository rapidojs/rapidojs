import 'reflect-metadata';

/**
 * 懒加载装饰器常量
 */
export const LAZY_METADATA_KEY = Symbol('lazy');

/**
 * 懒加载装饰器
 * 标记一个依赖为懒加载，只有在第一次访问时才会实例化
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(
 *     @Inject() @Lazy() private heavyService: HeavyService
 *   ) {}
 * 
 *   async doSomething() {
 *     // HeavyService 只有在这里第一次被访问时才会实例化
 *     return await this.heavyService.process();
 *   }
 * }
 * ```
 */
export function Lazy(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const lazyMetadata = Reflect.getMetadata(LAZY_METADATA_KEY, target) || {};
    lazyMetadata[parameterIndex] = true;
    Reflect.defineMetadata(LAZY_METADATA_KEY, lazyMetadata, target);
  };
}

/**
 * 检查参数是否标记为懒加载
 */
export function isLazyParameter(target: any, parameterIndex: number): boolean {
  const lazyMetadata = Reflect.getMetadata(LAZY_METADATA_KEY, target) || {};
  return lazyMetadata[parameterIndex] === true;
}