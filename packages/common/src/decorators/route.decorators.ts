import 'reflect-metadata';
import { MODULE_METADATA_KEY } from '../constants.js';
import { HttpMethod, RouteDefinition } from '../types.js';

const createRouteDecorator = (method: HttpMethod) => (path = '/'): MethodDecorator => {
  return (target, key, descriptor) => {
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, target.constructor) || {};
    const routes = metadata.routes || [];
    routes.push({
      path,
      method,
      methodName: key,
    });
    Reflect.defineMetadata(MODULE_METADATA_KEY, { ...metadata, routes }, target.constructor);
  };
};

export const Get = createRouteDecorator(HttpMethod.GET);
export const Post = createRouteDecorator(HttpMethod.POST);
export const Put = createRouteDecorator(HttpMethod.PUT);
export const Delete = createRouteDecorator(HttpMethod.DELETE);
export const Patch = createRouteDecorator(HttpMethod.PATCH);
export const Options = createRouteDecorator(HttpMethod.OPTIONS);
export const Head = createRouteDecorator(HttpMethod.HEAD); 