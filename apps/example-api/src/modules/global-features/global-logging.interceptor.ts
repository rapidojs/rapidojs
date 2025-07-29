// global-logging.interceptor.ts
import { Injectable, Interceptor, ExecutionContext, CallHandler } from '@rapidojs/common';

@Injectable()
export class GlobalLoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.switchToHttp().getRequest();
    
    console.log(`🔍 [GlobalLoggingInterceptor] 开始处理请求: ${request.method} ${request.url}`);
    
    const start = Date.now();
    const result = await next.handle();
    const duration = Date.now() - start;
    
    console.log(`✅ [GlobalLoggingInterceptor] 请求完成，耗时: ${duration}ms`);
    return {
        code: 0,
        data: result,
        message: "OK"
    };
  }
}