import { Injectable } from '../decorators/injectable.decorator.js';
import { Interceptor, CallHandler, ExecutionContext } from '../interfaces.js';
import { NO_TRANSFORM_METADATA } from '../constants.js';

/**
 * Standard response format for API responses
 */
export interface StandardResponse<T = any> {
  /**
   * HTTP status code
   */
  statusCode: number;
  
  /**
   * Response message
   */
  message: string;
  
  /**
   * Response data
   */
  data: T;
  
  /**
   * Timestamp of the response
   */
  timestamp: string;
  
  /**
   * Request path
   */
  path: string;
}

/**
 * Built-in interceptor that transforms responses into a standard format.
 * This interceptor wraps all successful responses in a consistent structure.
 * 
 * Can be bypassed using the @NoTransform() decorator on specific routes.
 * 
 * @example
 * ```typescript
 * // Global usage
 * app.useGlobalInterceptors(new TransformInterceptor());
 * 
 * // Controller usage
 * @UseInterceptors(TransformInterceptor)
 * @Controller('users')
 * export class UserController {
 *   @Get()
 *   findAll() {
 *     return [{ id: 1, name: 'John' }]; // Will be transformed
 *   }
 *   
 *   @Get('raw')
 *   @NoTransform()
 *   getRaw() {
 *     return { raw: 'data' }; // Will NOT be transformed
 *   }
 * }
 * ```
 */
@Injectable()
export class TransformInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const handler = context.getHandler();
    
    // Check if the route is marked with @NoTransform()
    if (handler && Reflect.getMetadata(NO_TRANSFORM_METADATA, handler)) {
      return next.handle();
    }
    
    const result = await next.handle();
    
    // Don't transform if result is already a Response object or stream
    if (this.shouldSkipTransform(result)) {
      return result;
    }
    
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    
    // Get status code from response or default to 200
    const statusCode = response.statusCode || 200;
    
    return {
      statusCode,
      message: this.getSuccessMessage(statusCode),
      data: result,
      timestamp: new Date().toISOString(),
      path: request.url || request.path || '/'
    } as StandardResponse;
  }
  
  /**
   * Determines if the response should skip transformation
   */
  private shouldSkipTransform(result: any): boolean {
    // Skip transformation for null/undefined
    if (result === null || result === undefined) {
      return false;
    }
    
    // Skip transformation for streams, buffers, or Response objects
    if (
      result instanceof Buffer ||
      (typeof result === 'object' && result.pipe) || // Stream-like object
      (typeof result === 'object' && result.constructor && result.constructor.name === 'Response') ||
      (typeof result === 'object' && result.statusCode && result.headers) // Response-like object
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Gets appropriate success message based on status code
   */
  private getSuccessMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return 'Success';
      case 201:
        return 'Created';
      case 202:
        return 'Accepted';
      case 204:
        return 'No Content';
      default:
        return 'Success';
    }
  }
}