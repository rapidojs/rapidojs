import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '../constants.js';
import { ExecutionContext } from '../interfaces.js';
import { createParamDecorator } from './param-decorator.factory.js';
import { ParamType } from '../types.js';

/**
 * A custom parameter decorator to extract the user object from the request.
 * This decorator relies on the user object being attached to the request,
 * typically by an authentication guard.
 *
 * @example
 * ```typescript
 * @Get('/profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.user;
}, ParamType.CUSTOM); 