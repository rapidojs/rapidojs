import { HttpMethod } from '@rapidojs/common';
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
export const Get = createRouteDecorator('GET');

/**
 * Decorator for mapping HTTP POST requests.
 */
export const Post = createRouteDecorator('POST');

/**
 * Decorator for mapping HTTP PUT requests.
 */
export const Put = createRouteDecorator('PUT');

/**
 * Decorator for mapping HTTP DELETE requests.
 */
export const Delete = createRouteDecorator('DELETE');

/**
 * Decorator for mapping HTTP PATCH requests.
 */
export const Patch = createRouteDecorator('PATCH');
