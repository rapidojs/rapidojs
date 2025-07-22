import { describe, it, expect } from 'vitest';
import { HttpException } from '../exceptions/http-exception.js';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  NotAcceptableException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '../exceptions/built-in-exceptions.js';

describe('异常处理系统', () => {
  describe('HttpException 基类', () => {
    it('应该正确创建带字符串消息的异常', () => {
      const exception = new HttpException('自定义错误消息', 418);
      
      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.message).toBe('自定义错误消息');
      expect(exception.getResponse()).toBe('自定义错误消息');
      expect(exception.getStatus()).toBe(418);
    });

    it('应该正确创建带对象响应的异常', () => {
      const responseObj = {
        message: '详细错误信息',
        code: 'VALIDATION_ERROR',
        details: ['字段1无效', '字段2缺失']
      };
      
      const exception = new HttpException(responseObj, 400);
      
      expect(exception.message).toBe('详细错误信息');
      expect(exception.getResponse()).toEqual(responseObj);
      expect(exception.getStatus()).toBe(400);
    });

    it('应该从类名生成默认消息', () => {
      class CustomTestException extends HttpException {
        constructor() {
          super({}, 500);
        }
      }
      
      const exception = new CustomTestException();
      expect(exception.message).toBe('Custom Test Exception');
    });

    it('应该处理没有message属性的对象响应', () => {
      const responseObj = { error: '无消息字段的错误对象' };
      const exception = new HttpException(responseObj, 500);
      
      expect(exception.message).toBe('Http Exception');
      expect(exception.getResponse()).toEqual(responseObj);
    });

    it('应该处理null响应', () => {
      const exception = new HttpException(null as any, 500);
      
      expect(exception.message).toBe('Http Exception');
      expect(exception.getResponse()).toBe(null);
    });

    it('应该处理空对象响应', () => {
      const exception = new HttpException({}, 400);
      
      expect(exception.message).toBe('Http Exception');
      expect(exception.getResponse()).toEqual({});
    });
  });

  describe('内置异常类', () => {
    const testCases = [
      { ExceptionClass: BadRequestException, defaultStatus: 400, defaultMessage: 'Bad Request' },
      { ExceptionClass: UnauthorizedException, defaultStatus: 401, defaultMessage: 'Unauthorized' },
      { ExceptionClass: ForbiddenException, defaultStatus: 403, defaultMessage: 'Forbidden' },
      { ExceptionClass: NotFoundException, defaultStatus: 404, defaultMessage: 'Not Found' },
      { ExceptionClass: MethodNotAllowedException, defaultStatus: 405, defaultMessage: 'Method Not Allowed' },
      { ExceptionClass: NotAcceptableException, defaultStatus: 406, defaultMessage: 'Not Acceptable' },
      { ExceptionClass: RequestTimeoutException, defaultStatus: 408, defaultMessage: 'Request Timeout' },
      { ExceptionClass: ConflictException, defaultStatus: 409, defaultMessage: 'Conflict' },
      { ExceptionClass: GoneException, defaultStatus: 410, defaultMessage: 'Gone' },
      { ExceptionClass: PayloadTooLargeException, defaultStatus: 413, defaultMessage: 'Payload Too Large' },
      { ExceptionClass: UnsupportedMediaTypeException, defaultStatus: 415, defaultMessage: 'Unsupported Media Type' },
      { ExceptionClass: UnprocessableEntityException, defaultStatus: 422, defaultMessage: 'Unprocessable Entity' },
      { ExceptionClass: InternalServerErrorException, defaultStatus: 500, defaultMessage: 'Internal Server Error' },
      { ExceptionClass: NotImplementedException, defaultStatus: 501, defaultMessage: 'Not Implemented' },
      { ExceptionClass: BadGatewayException, defaultStatus: 502, defaultMessage: 'Bad Gateway' },
      { ExceptionClass: ServiceUnavailableException, defaultStatus: 503, defaultMessage: 'Service Unavailable' },
      { ExceptionClass: GatewayTimeoutException, defaultStatus: 504, defaultMessage: 'Gateway Timeout' },
    ];

    testCases.forEach(({ ExceptionClass, defaultStatus, defaultMessage }) => {
      describe(`${ExceptionClass.name}`, () => {
        it('应该使用默认消息创建异常', () => {
          const exception = new ExceptionClass();
          
          expect(exception).toBeInstanceOf(HttpException);
          expect(exception).toBeInstanceOf(ExceptionClass);
          expect(exception.message).toBe(defaultMessage);
          expect(exception.getResponse()).toBe(defaultMessage);
          expect(exception.getStatus()).toBe(defaultStatus);
        });

        it('应该使用自定义字符串消息创建异常', () => {
          const customMessage = `自定义${ExceptionClass.name}消息`;
          const exception = new ExceptionClass(customMessage);
          
          expect(exception.message).toBe(customMessage);
          expect(exception.getResponse()).toBe(customMessage);
          expect(exception.getStatus()).toBe(defaultStatus);
        });

        it('应该使用自定义对象响应创建异常', () => {
          const customResponse = {
            message: `自定义${ExceptionClass.name}对象消息`,
            timestamp: new Date().toISOString(),
            path: '/api/test'
          };
          const exception = new ExceptionClass(customResponse);
          
          expect(exception.message).toBe(customResponse.message);
          expect(exception.getResponse()).toEqual(customResponse);
          expect(exception.getStatus()).toBe(defaultStatus);
        });

        it('应该继承Error的所有属性', () => {
          const exception = new ExceptionClass('测试错误');
          
          // HttpException 继承自 Error，所以 name 会是 'Error'，除非手动设置
          expect(exception.name).toBe('Error');
          expect(exception.constructor.name).toBe(ExceptionClass.name);
          expect(exception.stack).toBeDefined();
          expect(typeof exception.stack).toBe('string');
        });
      });
    });
  });

  describe('异常继承链', () => {
    it('所有内置异常都应该继承自HttpException', () => {
      const exceptions = [
        new BadRequestException(),
        new UnauthorizedException(),
        new ForbiddenException(),
        new NotFoundException(),
        new InternalServerErrorException(),
      ];

      exceptions.forEach(exception => {
        expect(exception).toBeInstanceOf(HttpException);
        expect(exception).toBeInstanceOf(Error);
      });
    });

    it('HttpException应该正确继承自Error', () => {
      const exception = new HttpException('测试', 500);
      
      expect(exception).toBeInstanceOf(Error);
      expect(exception.constructor.name).toBe('HttpException');
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理极端HTTP状态码', () => {
      const exception1 = new HttpException('测试', 0);
      const exception2 = new HttpException('测试', 999);
      
      expect(exception1.getStatus()).toBe(0);
      expect(exception2.getStatus()).toBe(999);
    });

    it('应该处理非常长的错误消息', () => {
      const longMessage = 'A'.repeat(10000);
      const exception = new HttpException(longMessage, 400);
      
      expect(exception.message).toBe(longMessage);
      expect(exception.getResponse()).toBe(longMessage);
    });

    it('应该处理包含特殊字符的消息', () => {
      const specialMessage = '测试消息 🚀 with émojis and ñ characters';
      const exception = new HttpException(specialMessage, 400);
      
      expect(exception.message).toBe(specialMessage);
      expect(exception.getResponse()).toBe(specialMessage);
    });

    it('应该处理循环引用的对象', () => {
      const circularObj: any = { message: '循环引用测试' };
      circularObj.self = circularObj;
      
      const exception = new HttpException(circularObj, 400);
      
      expect(exception.message).toBe('循环引用测试');
      expect(exception.getResponse()).toBe(circularObj);
    });
  });
}); 