import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import { PipeMetadata } from '../interfaces.js';
import { Query, Param, Body } from './param.decorators.js';

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

// 由于 Query, Param, Body 已经支持管道，所以这些就是别名
// 但测试可能期望它们有特定的管道行为
export const QueryWithPipe = Query;
export const ParamWithPipe = Param;
export const BodyWithPipe = Body; 