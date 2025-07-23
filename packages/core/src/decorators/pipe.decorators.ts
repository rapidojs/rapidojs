import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import { Type, PipeTransform, PipeMetadata } from '../types.js';
import { Query, Param, Body } from './param.decorators.js';

// 重新导出类型以供其他模块使用
export { PipeMetadata };

/**
 * Decorator that applies pipes to a method or controller.
 * Pipes are executed in the order they are provided.
 * 
 * @param pipes - Array of pipe instances or constructors
 * @returns MethodDecorator & ClassDecorator
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * @UsePipes(new ValidationPipe()) // Class-level pipe
 * class UsersController {
 *   @Post('/')
 *   @UsePipes(new TransformPipe()) // Method-level pipe
 *   createUser(@Body() createUserDto: CreateUserDto) {
 *     // method body
 *   }
 * }
 * ```
 */
export function UsePipes(...pipes: PipeMetadata[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) {
      // Method-level pipes
      Reflect.defineMetadata(METADATA_KEY.PIPES, pipes, target, propertyKey);
    } else {
      // Class-level pipes
      Reflect.defineMetadata(METADATA_KEY.PIPES, pipes, target);
    }
  };
}

/**
 * Enhanced parameter decorators that support pipes
 */

/**
 * Enhanced @Query decorator with pipe support
 */
export function QueryWithPipe(key?: string, ...pipes: PipeMetadata[]) {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;
    
    // Store the pipe metadata for this specific parameter
    const existingPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, propertyKey) || {};
    existingPipes[parameterIndex] = pipes;
    Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, existingPipes, target, propertyKey);
    
    // Also apply the original @Query decorator logic
    // This would need to be imported from param.decorators.ts
    // For now, we'll implement it inline

    return Query(key)(target, propertyKey, parameterIndex);
  };
}

/**
 * Enhanced @Param decorator with pipe support
 */
export function ParamWithPipe(key?: string, ...pipes: PipeMetadata[]) {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;
    
    const existingPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, propertyKey) || {};
    existingPipes[parameterIndex] = pipes;
    Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, existingPipes, target, propertyKey);
    

    return Param(key)(target, propertyKey, parameterIndex);
  };
}

/**
 * Enhanced @Body decorator with pipe support
 */
export function BodyWithPipe(...pipes: PipeMetadata[]) {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;
    
    const existingPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, propertyKey) || {};
    existingPipes[parameterIndex] = pipes;
    Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, existingPipes, target, propertyKey);
    

    return Body()(target, propertyKey, parameterIndex);
  };
}
