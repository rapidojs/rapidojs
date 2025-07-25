import { createParamDecorator } from './param-decorator.factory.js';
import { ExecutionContext } from '../interfaces.js';

/**
 * Parameter decorator for injecting the authenticated user object.
 * This decorator retrieves the user object attached to the request by an authentication guard.
 *
 * @example
 * ```
 * @Get('/profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.user;
}); 