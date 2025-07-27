import { describe, it, expect, beforeEach } from 'vitest';
import { HttpExecutionContextImpl } from '../helpers/execution-context-impl.js';
import { ArgumentsHost, HttpArgumentsHost } from '@rapidojs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

// 创建模拟的 Fastify 请求和响应对象
const createMockRequest = (overrides = {}): FastifyRequest => ({
  method: 'GET',
  url: '/test',
  query: { test: 'value' },
  params: { id: '123' },
  headers: {
    'content-type': 'application/json',
    'user-agent': 'test-agent',
    'authorization': 'Bearer token123'
  },
  body: { message: 'test body' },
  ip: '127.0.0.1',
  hostname: 'localhost',
  protocol: 'http',
  ...overrides
} as unknown as FastifyRequest);

interface MockReply {
  statusCode: number;
  sent: boolean;
  code(statusCode: number): MockReply;
  send(payload: any): MockReply;
  header(key: string, value: string): MockReply;
  type(contentType: string): MockReply;
}

const createMockReply = (overrides = {}): FastifyReply => {
  const reply: MockReply = {
    statusCode: 200,
    sent: false,
    code: function(statusCode: number) { this.statusCode = statusCode; return this; },
    send: function(payload: any) { this.sent = true; return this; },
    header: function(key: string, value: string) { return this; },
    type: function(contentType: string) { return this; },
    ...overrides
  };
  return reply as unknown as FastifyReply;
};

describe('ArgumentsHost', () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let argumentsHost: HttpExecutionContextImpl;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockReply = createMockReply();
    argumentsHost = new HttpExecutionContextImpl(mockRequest, mockReply, null, null);
  });

  describe('HttpExecutionContextImpl 构造函数', () => {
    it('应该正确接受 request 和 reply 参数', () => {
      const host = new HttpExecutionContextImpl(mockRequest, mockReply, null, null);
      
      expect(host).toBeInstanceOf(HttpExecutionContextImpl);
      expect(host.getRequest()).toBe(mockRequest);
      expect(host.getResponse()).toBe(mockReply);
    });

    it('应该实现 ArgumentsHost 接口', () => {
      expect(argumentsHost).toHaveProperty('switchToHttp');
      expect(typeof argumentsHost.switchToHttp).toBe('function');
    });

    it('应该实现 HttpArgumentsHost 接口', () => {
      expect(argumentsHost).toHaveProperty('getRequest');
      expect(argumentsHost).toHaveProperty('getResponse');
      expect(typeof argumentsHost.getRequest).toBe('function');
      expect(typeof argumentsHost.getResponse).toBe('function');
    });
  });

  describe('getRequest 方法', () => {
    it('应该返回原始 Fastify 请求对象', () => {
      const request = argumentsHost.getRequest<FastifyRequest>();
      
      expect(request).toBe(mockRequest);
      expect(request.method).toBe('GET');
      expect(request.url).toBe('/test');
    });

    it('应该支持泛型类型', () => {
      // 模拟一个自定义的请求类型
      interface CustomRequest extends FastifyRequest {
        customProperty: string;
      }

      const customRequest = {
        ...mockRequest,
        customProperty: 'custom-value'
      } as CustomRequest;

      const customHost = new HttpExecutionContextImpl(customRequest, mockReply, null, null);
      const typedRequest = customHost.getRequest<CustomRequest>();
      
      expect(typedRequest.customProperty).toBe('custom-value');
      expect(typedRequest.method).toBe('GET');
    });

    it('应该保持请求对象的所有属性', () => {
      const request = argumentsHost.getRequest<FastifyRequest>();
      
      expect(request.query).toEqual({ test: 'value' });
      expect(request.params).toEqual({ id: '123' });
      expect(request.headers['content-type']).toBe('application/json');
      expect(request.body).toEqual({ message: 'test body' });
      expect(request.ip).toBe('127.0.0.1');
    });

    it('应该处理空或未定义的请求属性', () => {
      const emptyRequest = createMockRequest({
        query: {},
        params: {},
        headers: {},
        body: undefined
      });

      const emptyHost = new HttpExecutionContextImpl(emptyRequest, mockReply, null, null);
      const request = emptyHost.getRequest<FastifyRequest>();
      
      expect(request.query).toEqual({});
      expect(request.params).toEqual({});
      expect(request.headers).toEqual({});
      expect(request.body).toBeUndefined();
    });
  });

  describe('getResponse 方法', () => {
    it('应该返回原始 Fastify 响应对象', () => {
      const response = argumentsHost.getResponse<FastifyReply>();
      
      expect(response).toBe(mockReply);
      expect(response.statusCode).toBe(200);
    });

    it('应该支持泛型类型', () => {
      // 模拟一个自定义的响应类型
      interface CustomResponse extends FastifyReply {
        customMethod(): void;
      }

      const customReply = {
        ...mockReply,
        customMethod: () => {}
      } as CustomResponse;

      const customHost = new HttpExecutionContextImpl(mockRequest, customReply, null, null);
      const typedResponse = customHost.getResponse<CustomResponse>();
      
      expect(typeof typedResponse.customMethod).toBe('function');
      expect(typedResponse.statusCode).toBe(200);
    });

    it('应该保持响应对象的所有方法', () => {
      const response = argumentsHost.getResponse<FastifyReply>();
      
      expect(typeof response.code).toBe('function');
      expect(typeof response.send).toBe('function');
      expect(typeof response.header).toBe('function');
      expect(typeof response.type).toBe('function');
    });

    it('应该支持响应对象的状态修改', () => {
      const response = argumentsHost.getResponse<FastifyReply>();
      
      // 测试状态码修改
      response.code(404);
      expect(response.statusCode).toBe(404);
      
      // 测试发送状态
      expect(response.sent).toBe(false);
      response.send({ message: 'test' });
      expect(response.sent).toBe(true);
    });
  });

  describe('switchToHttp 方法', () => {
    it('应该返回 HttpArgumentsHost 实例', () => {
      const httpHost = argumentsHost.switchToHttp();
      
      expect(httpHost).toBe(argumentsHost);
      expect(httpHost).toHaveProperty('getRequest');
      expect(httpHost).toHaveProperty('getResponse');
    });

    it('应该返回相同的实例', () => {
      const httpHost1 = argumentsHost.switchToHttp();
      const httpHost2 = argumentsHost.switchToHttp();
      
      expect(httpHost1).toBe(httpHost2);
      expect(httpHost1).toBe(argumentsHost);
    });

    it('返回的实例应该具有正确的方法', () => {
      const httpHost = argumentsHost.switchToHttp();
      
      expect(typeof httpHost.getRequest).toBe('function');
      expect(typeof httpHost.getResponse).toBe('function');
      
      // 验证方法能够正常工作
      expect(httpHost.getRequest<FastifyRequest>()).toBe(mockRequest);
      expect(httpHost.getResponse<FastifyReply>()).toBe(mockReply);
    });
  });

  describe('接口兼容性', () => {
    it('应该兼容 ArgumentsHost 接口', () => {
      const host: ArgumentsHost = argumentsHost;
      
      expect(typeof host.switchToHttp).toBe('function');
      const httpHost = host.switchToHttp();
      expect(httpHost).toBeDefined();
    });

    it('应该兼容 HttpArgumentsHost 接口', () => {
      const httpHost: HttpArgumentsHost = argumentsHost;
      
      expect(typeof httpHost.getRequest).toBe('function');
      expect(typeof httpHost.getResponse).toBe('function');
      
      const request = httpHost.getRequest<FastifyRequest>();
      const response = httpHost.getResponse<FastifyReply>();
      
      expect(request).toBeDefined();
      expect(response).toBeDefined();
    });
  });

  describe('实际使用场景', () => {
    it('应该支持异常过滤器中的使用', () => {
      // 模拟异常过滤器的使用场景
      const handleException = (exception: Error, host: ArgumentsHost) => {
        const httpHost = host.switchToHttp();
        const request = httpHost.getRequest<FastifyRequest>();
        const response = httpHost.getResponse<FastifyReply>();
        
        return {
          path: request.url,
          method: request.method,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString()
        };
      };

      const exception = new Error('Test exception');
      const result = handleException(exception, argumentsHost);
      
      expect(result.path).toBe('/test');
      expect(result.method).toBe('GET');
      expect(result.statusCode).toBe(200);
      expect(result.timestamp).toBeDefined();
    });

    it('应该支持获取请求上下文信息', () => {
      const getRequestContext = (host: ArgumentsHost) => {
        const request = host.switchToHttp().getRequest<FastifyRequest>();
        
        return {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          authorization: request.headers['authorization'],
          protocol: request.protocol,
          hostname: request.hostname
        };
      };

      const context = getRequestContext(argumentsHost);
      
      expect(context.ip).toBe('127.0.0.1');
      expect(context.userAgent).toBe('test-agent');
      expect(context.authorization).toBe('Bearer token123');
      expect(context.protocol).toBe('http');
      expect(context.hostname).toBe('localhost');
    });

    it('应该支持响应修改场景', () => {
      const modifyResponse = (host: ArgumentsHost, data: any) => {
        const response = host.switchToHttp().getResponse<FastifyReply>();
        
        response.code(201);
        response.header('X-Custom-Header', 'custom-value');
        response.send(data);
        
        return {
          statusCode: response.statusCode,
          sent: response.sent
        };
      };

      const result = modifyResponse(argumentsHost, { created: true });
      
      expect(result.statusCode).toBe(201);
      expect(result.sent).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理不同的 HTTP 方法', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      
      methods.forEach(method => {
        const request = createMockRequest({ method });
        const host = new HttpExecutionContextImpl(request, mockReply, null, null);
        
        expect(host.getRequest<FastifyRequest>().method).toBe(method);
      });
    });

    it('应该处理复杂的请求体', () => {
      const complexBody = {
        user: {
          id: 1,
          name: 'Test User',
          preferences: {
            theme: 'dark',
            language: 'zh-CN'
          }
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const request = createMockRequest({ body: complexBody });
      const host = new HttpExecutionContextImpl(request, mockReply, null, null);
      
      expect(host.getRequest<FastifyRequest>().body).toEqual(complexBody);
    });

         it('应该处理大量查询参数', () => {
       const largeQuery: Record<string, string> = {};
       for (let i = 0; i < 100; i++) {
         largeQuery[`param${i}`] = `value${i}`;
       }

       const request = createMockRequest({ query: largeQuery });
       const host = new HttpExecutionContextImpl(request, mockReply, null, null);
       
       expect(Object.keys(host.getRequest<FastifyRequest>().query as Record<string, string>)).toHaveLength(100);
       expect((host.getRequest<FastifyRequest>().query as Record<string, string>)['param50']).toBe('value50');
     });

    it('应该处理特殊字符的请求头', () => {
      const specialHeaders = {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'content-encoding': 'gzip, deflate',
        'cache-control': 'no-cache, no-store, must-revalidate'
      };

      const request = createMockRequest({ headers: specialHeaders });
      const host = new HttpExecutionContextImpl(request, mockReply, null, null);
      
      expect(host.getRequest<FastifyRequest>().headers).toEqual(specialHeaders);
    });
  });

  describe('内存和性能', () => {
    it('应该重用相同的实例', () => {
      const host1 = argumentsHost.switchToHttp();
      const host2 = argumentsHost.switchToHttp();
      const host3 = argumentsHost.switchToHttp();
      
      expect(host1).toBe(host2);
      expect(host2).toBe(host3);
      expect(host1).toBe(argumentsHost);
    });

    it('应该正确处理大量调用', () => {
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const request = argumentsHost.getRequest<FastifyRequest>();
        const response = argumentsHost.getResponse<FastifyReply>();
        const httpHost = argumentsHost.switchToHttp();
        
        expect(request).toBeDefined();
        expect(response).toBeDefined();
        expect(httpHost).toBeDefined();
      }
      
      // 如果执行到这里没有内存问题，测试通过
      expect(true).toBe(true);
    });
  });
}); 