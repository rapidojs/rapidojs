import 'reflect-metadata';
import { INTERCEPTORS_METADATA, NO_TRANSFORM_METADATA } from '../constants.js';
import { InterceptorMetadata } from '../interfaces.js';

/**
 * Decorator that applies interceptors to a controller class or method.
 * Interceptors can intercept and modify the execution flow of route handlers.
 * 
 * @param interceptors - Array of interceptor classes or instances
 * @returns Method or class decorator
 * 
 * @example
 * ```typescript
 * @UseInterceptors(LoggingInterceptor, TransformInterceptor)
 * @Controller('users')
 * export class UserController {
 *   @UseInterceptors(CacheInterceptor)
 *   @Get()
 *   findAll() {
 *     return this.userService.findAll();
 *   }
 * }
 * ```
 */
export function UseInterceptors(...interceptors: InterceptorMetadata[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      // Method decorator
      const existingInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, target, propertyKey) || [];
      Reflect.defineMetadata(INTERCEPTORS_METADATA, [...existingInterceptors, ...interceptors], target, propertyKey);
    } else {
      // Class decorator
      const existingInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, target) || [];
      Reflect.defineMetadata(INTERCEPTORS_METADATA, [...existingInterceptors, ...interceptors], target);
    }
  };
}

/**
 * Decorator that marks a route handler to skip response transformation.
 * This is useful when you want to bypass global transform interceptors for specific routes.
 * 
 * @returns Method decorator
 * 
 * @example
 * ```typescript
 * @Controller('files')
 * export class FileController {
 *   @Get('download/:id')
 *   @NoTransform()
 *   downloadFile(@Param('id') id: string) {
 *     // Return raw file stream without transformation
 *     return this.fileService.getFileStream(id);
 *   }
 * }
 * ```
 */
export function NoTransform(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(NO_TRANSFORM_METADATA, true, target, propertyKey);
  };
}