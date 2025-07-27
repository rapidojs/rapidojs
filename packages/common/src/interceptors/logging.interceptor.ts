import { Injectable } from '../decorators/injectable.decorator.js';
import { Interceptor, CallHandler, ExecutionContext } from '../interfaces.js';
import { LoggerService } from '../services/logger.service.js';

/**
 * Built-in interceptor that logs HTTP requests and responses.
 * Useful for development and debugging purposes.
 * 
 * @example
 * ```typescript
 * // Global usage
 * app.useGlobalInterceptors(new LoggingInterceptor());
 * 
 * // Controller usage
 * @UseInterceptors(LoggingInterceptor)
 * @Controller('users')
 * export class UserController {
 *   @Get()
 *   findAll() {
 *     return this.userService.findAll();
 *   }
 * }
 * ```
 */
@Injectable()
export class LoggingInterceptor implements Interceptor {
  private readonly logger = new LoggerService('HTTP');
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const ip = this.getClientIp(request);
    
    const startTime = Date.now();
    
    // Log incoming request
    const requestLogData = {
      method,
      url,
      userAgent,
      ip,
      body: this.sanitizeBody(body),
      timestamp: new Date().toISOString()
    };
    
    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      JSON.stringify(requestLogData)
    );
    
    try {
      const result = await next.handle();
      const duration = Date.now() - startTime;
      const statusCode = response.statusCode || 200;
      
      // Log successful response
      const logData = {
        method,
        url,
        statusCode,
        duration,
        ip,
        timestamp: new Date().toISOString()
      };
      
      this.logger.log(
        `Outgoing Response: ${method} ${url} - ${statusCode} (${duration}ms)`,
        JSON.stringify(logData)
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = response.statusCode || 500;
      
      // Log error response
      const errorLogData = {
        method,
        url,
        statusCode,
        duration,
        ip,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      };
      
      this.logger.error(
        `Error Response: ${method} ${url} - ${statusCode} (${duration}ms)`,
        JSON.stringify(errorLogData)
      );
      
      throw error;
    }
  }
  
  /**
   * Extracts client IP address from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'Unknown'
    );
  }
  
  /**
   * Sanitizes request body for logging (removes sensitive data)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'auth',
      'credential',
      'credentials'
    ];
    
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}