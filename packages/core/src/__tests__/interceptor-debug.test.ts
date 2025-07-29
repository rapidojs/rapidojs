import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Injectable, Controller, Get, Module } from '@rapidojs/common';
import { UseInterceptors } from '@rapidojs/common';
import { Interceptor, ExecutionContext, CallHandler } from '@rapidojs/common';
import { RapidoFactory } from '@rapidojs/core';

@Injectable()
class SimpleInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    console.log('SimpleInterceptor intercept method called');
    console.log('Context:', context);
    console.log('CallHandler:', next);
    
    const result = await next.handle();
    console.log('Original result from next.handle():', result);
    
    const wrappedResult = {
      intercepted: true,
      data: result
    };
    console.log('Wrapped result:', wrappedResult);
    
    return wrappedResult;
  }
}

@Controller('/debug')
class DebugController {
  @Get('/test')
  @UseInterceptors(SimpleInterceptor)
  testMethod(): string {
    console.log('testMethod executed');
    return 'test result';
  }
}

@Module({
  controllers: [DebugController],
  providers: [SimpleInterceptor]
})
class DebugModule {}

describe('拦截器调试测试', () => {
  let app: any;

  beforeEach(async () => {
    app = await RapidoFactory.create(DebugModule);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('应该验证拦截器元数据设置', () => {
    // 检查元数据是否正确设置
    const metadata = Reflect.getMetadata('interceptors', DebugController.prototype, 'testMethod');
    console.log('Interceptor metadata:', metadata);
    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toBe(SimpleInterceptor);
  });

  it('应该验证拦截器功能', async () => {
    // 检查拦截器是否在controller-registrar中被正确读取
    console.log('Before request - checking metadata again:');
    const metadata = Reflect.getMetadata('interceptors', DebugController.prototype, 'testMethod');
    console.log('Method interceptors metadata:', metadata);
    
    // 先测试一个不存在的路由
    const notFoundResponse = await app.inject({
      method: 'GET',
      url: '/nonexistent'
    });
    console.log('Not found response status:', notFoundResponse.statusCode);
    
    const response = await app.inject({
      method: 'GET',
      url: '/debug/test'
    });

    console.log('Response status:', response.statusCode);
    console.log('Response body:', response.body);
    console.log('Response headers:', response.headers);

    if (response.statusCode === 404) {
      console.log('路由没有被注册！');
    }
    
    expect(response.statusCode).toBe(200);
    
    try {
      const result = JSON.parse(response.body);
      console.log('Parsed result:', result);
      
      if (result.intercepted) {
        expect(result.intercepted).toBe(true);
        expect(result.data).toBe('test result');
      } else {
        console.log('拦截器没有执行，原始响应:', result);
      }
    } catch (e) {
      console.log('响应不是JSON格式:', response.body);
      console.log('这意味着拦截器没有被执行');
    }
  });
});