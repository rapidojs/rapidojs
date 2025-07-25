import { describe, it, expect } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { HttpExecutionContextImpl } from '../helpers/execution-context-impl.js';
import { ExecutionContext, CanActivate } from '@rapidojs/common';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';

describe('类型安全性测试', () => {
  describe('ExecutionContext 类型', () => {
    it('getRequest() 应该返回 FastifyRequest 类型', () => {
      const mockRequest = { url: '/test', method: 'GET', headers: {} } as FastifyRequest;
      const mockReply = { status: () => ({ send: () => {} }) } as any as FastifyReply;
      
      const context = new HttpExecutionContextImpl(mockRequest, mockReply);
      const request = context.getRequest<FastifyRequest>();
      
      // TypeScript 编译时类型检查
      expect(request.url).toBe('/test');
      expect(request.method).toBe('GET');
      expect(request.headers).toBeDefined();
    });

    it('getResponse() 应该返回 FastifyReply 类型', () => {
      const mockRequest = {} as FastifyRequest;
      const mockReply = { 
        status: (code: number) => ({ 
          send: (body: any) => body 
        })
      } as any as FastifyReply;
      
      const context = new HttpExecutionContextImpl(mockRequest, mockReply);
      const response = context.getResponse<FastifyReply>();
      
      // TypeScript 编译时类型检查
      expect(typeof response.status).toBe('function');
    });

    it('应该支持泛型类型覆盖', () => {
      const mockRequest = { customProperty: 'test' } as FastifyRequest & { customProperty: string };
      const mockReply = {} as FastifyReply;
      
      const context = new HttpExecutionContextImpl(mockRequest, mockReply);
      const request = context.getRequest<FastifyRequest & { customProperty: string }>();
      
      expect(request.customProperty).toBe('test');
    });
  });

  describe('ArgumentsHost 类型', () => {
    it('switchToHttp().getRequest() 应该返回 FastifyRequest 类型', () => {
      const mockRequest = { url: '/test', method: 'POST' } as FastifyRequest;
      const mockReply = {} as FastifyReply;
      
      const host = new HttpExecutionContextImpl(mockRequest, mockReply);
      const httpContext = host.switchToHttp();
      const request = httpContext.getRequest();
      
      // TypeScript 编译时类型检查
      expect(request.url).toBe('/test');
      expect(request.method).toBe('POST');
    });

    it('switchToHttp().getResponse() 应该返回 FastifyReply 类型', () => {
      const mockRequest = {} as FastifyRequest;
      const mockReply = { 
        status: (code: number) => ({ send: (body: any) => body })
      } as any as FastifyReply;
      
      const host = new HttpExecutionContextImpl(mockRequest, mockReply);
      const httpContext = host.switchToHttp();
      const response = httpContext.getResponse();
      
      // TypeScript 编译时类型检查
      expect(typeof response.status).toBe('function');
    });
  });

  describe('实际使用场景中的类型安全', () => {
    it('Guard 中应该能正确访问 FastifyRequest 属性', () => {
      class TypeSafeGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
          const httpContext = context.switchToHttp();
          const request = httpContext.getRequest(); // 应该是 FastifyRequest 类型
          
          // 这些属性访问在 TypeScript 中应该是类型安全的
          const url = request.url;
          const method = request.method;
          const headers = request.headers;
          const query = request.query;
          
          return url !== undefined && method !== undefined;
        }
      }

      const mockRequest = { 
        url: '/test', 
        method: 'GET', 
        headers: { authorization: 'Bearer token' },
        query: {}
      } as FastifyRequest;
      const mockReply = {} as FastifyReply;
      
      const guard = new TypeSafeGuard();
      const context = new HttpExecutionContextImpl(mockRequest, mockReply);
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('ExceptionFilter 中应该能正确访问 FastifyReply 方法', () => {
      class TypeSafeFilter implements ExceptionFilter {
        catch(exception: Error, host: ExecutionContext): void {
          const ctx = host.switchToHttp();
          const response = ctx.getResponse(); // 应该是 FastifyReply 类型
          const request = ctx.getRequest(); // 应该是 FastifyRequest 类型
          
          // 这些方法调用在 TypeScript 中应该是类型安全的
          response.status(500).send({
            error: exception.message,
            path: request.url,
            method: request.method
          });
        }
      }

      const mockRequest = { url: '/test', method: 'GET' } as FastifyRequest;
      let sentData: any = null;
      const mockReply = {
        status: (code: number) => ({
          send: (data: any) => { sentData = data; return data; }
        })
      } as any as FastifyReply;
      
      const filter = new TypeSafeFilter();
      const host = new HttpExecutionContextImpl(mockRequest, mockReply);
      const error = new Error('Test error');
      
      filter.catch(error, host);
      
      expect(sentData).toEqual({
        error: 'Test error',
        path: '/test',
        method: 'GET'
      });
    });
  });

  describe('类型编译检查', () => {
    it('应该能够推断正确的返回类型', () => {
      const mockRequest = {} as FastifyRequest;
      const mockReply = {} as FastifyReply;
      
      const context = new HttpExecutionContextImpl(mockRequest, mockReply);
      
      // TypeScript 应该能正确推断这些类型
      const request: FastifyRequest = context.getRequest();
      const response: FastifyReply = context.getResponse();
      const customRequest: FastifyRequest & { custom: string } = context.getRequest<FastifyRequest & { custom: string }>();
      
      expect(request).toBeDefined();
      expect(response).toBeDefined();
      expect(customRequest).toBeDefined();
    });
  });
}); 