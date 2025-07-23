import 'reflect-metadata';
import { HttpMethod } from '../types.js';
import { METADATA_KEY } from '../constants.js';
import { RouteDefinition } from '../types.js';

/**
 * Factory function to create HTTP method decorators (@Get, @Post, etc.).
 *
 * @param method - The HTTP method for the decorator.
 * @returns A method decorator.
 */
const createRouteDecorator = (method: HttpMethod) => {
  return (path = '/'): MethodDecorator => {
    return (target, propertyKey) => {
      // Get existing routes metadata or initialize an empty array
      const routes = Reflect.getMetadata(METADATA_KEY.ROUTES, target.constructor) || [];

      // Define the new route
      const newRoute: RouteDefinition = {
        path,
        method,
        methodName: propertyKey,
      };

      // Add the new route to the list
      routes.push(newRoute);

      // Save the updated routes metadata
      Reflect.defineMetadata(METADATA_KEY.ROUTES, routes, target.constructor);
    };
  };
};

/**
 * Decorator for mapping HTTP GET requests.
 */
export const Get = createRouteDecorator(HttpMethod.GET);

/**
 * Decorator for mapping HTTP POST requests.
 */
export const Post = createRouteDecorator(HttpMethod.POST);

/**
 * Decorator for mapping HTTP PUT requests.
 */
export const Put = createRouteDecorator(HttpMethod.PUT);

/**
 * Decorator for mapping HTTP DELETE requests.
 */
export const Delete = createRouteDecorator(HttpMethod.DELETE);

/**
 * Decorator for mapping HTTP PATCH requests.
 */
export const Patch = createRouteDecorator(HttpMethod.PATCH); 