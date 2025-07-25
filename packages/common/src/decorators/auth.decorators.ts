import 'reflect-metadata';
import { GUARDS_METADATA, PUBLIC_ROUTE_METADATA } from '../constants.js';
import { CanActivate } from '../interfaces.js';

/**
 * Decorator that binds guards to a controller or a specific route handler.
 *
 * @param guards - A list of guards to apply.
 */
export const UseGuards = (...guards: (new (...args: any[]) => CanActivate)[]): MethodDecorator & ClassDecorator => {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(GUARDS_METADATA, guards, key ? descriptor!.value : target);
  };
};

/**
 * Decorator that marks a route as public, exempting it from global guards.
 */
export const Public = (): MethodDecorator => {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(PUBLIC_ROUTE_METADATA, true, descriptor!.value);
  };
}; 