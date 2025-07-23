import { ExceptionFilter, ArgumentsHost, Catch } from '@rapidojs/core';

/**
 * 全局错误过滤器示例
 * 捕获所有未处理的错误并返回友好的错误信息
 */
@Catch(Error)
export class GlobalErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    console.error(`[GlobalErrorFilter] 捕获到错误:`, {
      error: exception.message,
      stack: exception.stack,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    // 根据错误类型返回不同的状态码和信息
    let status = 500;
    let message = '服务器内部错误';
    
    if (exception.message.includes('validation')) {
      status = 400;
      message = '请求数据验证失败';
    } else if (exception.message.includes('not found')) {
      status = 404;
      message = '请求的资源不存在';
    } else if (exception.message.includes('unauthorized')) {
      status = 401;
      message = '未授权的访问';
    }
    
    response.status(status).send({
      statusCode: status,
      error: '请求处理失败',
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
      // 在开发环境中可以包含更多错误详情
      ...(process.env.NODE_ENV === 'development' && {
        originalError: exception.message,
        stack: exception.stack
      })
    });
  }
} 