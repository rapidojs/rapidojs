import { describe, it, expect } from 'vitest';
import { HttpStatus } from '../enums/http-status.enum.js';

describe('HTTP 状态枚举', () => {
  describe('信息响应 (1xx)', () => {
    it('应该定义 Continue 状态码', () => {
      expect(HttpStatus.CONTINUE).toBe(100);
    });

    it('应该定义 Switching Protocols 状态码', () => {
      expect(HttpStatus.SWITCHING_PROTOCOLS).toBe(101);
    });

    it('应该定义 Processing 状态码', () => {
      expect(HttpStatus.PROCESSING).toBe(102);
    });

    it('应该定义 Early Hints 状态码', () => {
      expect(HttpStatus.EARLY_HINTS).toBe(103);
    });
  });

  describe('成功响应 (2xx)', () => {
    it('应该定义 OK 状态码', () => {
      expect(HttpStatus.OK).toBe(200);
    });

    it('应该定义 Created 状态码', () => {
      expect(HttpStatus.CREATED).toBe(201);
    });

    it('应该定义 Accepted 状态码', () => {
      expect(HttpStatus.ACCEPTED).toBe(202);
    });

    it('应该定义 Non Authoritative Information 状态码', () => {
      expect(HttpStatus.NON_AUTHORITATIVE_INFORMATION).toBe(203);
    });

    it('应该定义 No Content 状态码', () => {
      expect(HttpStatus.NO_CONTENT).toBe(204);
    });

    it('应该定义 Reset Content 状态码', () => {
      expect(HttpStatus.RESET_CONTENT).toBe(205);
    });

    it('应该定义 Partial Content 状态码', () => {
      expect(HttpStatus.PARTIAL_CONTENT).toBe(206);
    });
  });

  describe('重定向响应 (3xx)', () => {
    it('应该定义 Ambiguous 状态码', () => {
      expect(HttpStatus.AMBIGUOUS).toBe(300);
    });

    it('应该定义 Moved Permanently 状态码', () => {
      expect(HttpStatus.MOVED_PERMANENTLY).toBe(301);
    });

    it('应该定义 Found 状态码', () => {
      expect(HttpStatus.FOUND).toBe(302);
    });

    it('应该定义 See Other 状态码', () => {
      expect(HttpStatus.SEE_OTHER).toBe(303);
    });

    it('应该定义 Not Modified 状态码', () => {
      expect(HttpStatus.NOT_MODIFIED).toBe(304);
    });

    it('应该定义 Temporary Redirect 状态码', () => {
      expect(HttpStatus.TEMPORARY_REDIRECT).toBe(307);
    });

    it('应该定义 Permanent Redirect 状态码', () => {
      expect(HttpStatus.PERMANENT_REDIRECT).toBe(308);
    });
  });

  describe('客户端错误响应 (4xx)', () => {
    it('应该定义 Bad Request 状态码', () => {
      expect(HttpStatus.BAD_REQUEST).toBe(400);
    });

    it('应该定义 Unauthorized 状态码', () => {
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
    });

    it('应该定义 Payment Required 状态码', () => {
      expect(HttpStatus.PAYMENT_REQUIRED).toBe(402);
    });

    it('应该定义 Forbidden 状态码', () => {
      expect(HttpStatus.FORBIDDEN).toBe(403);
    });

    it('应该定义 Not Found 状态码', () => {
      expect(HttpStatus.NOT_FOUND).toBe(404);
    });

    it('应该定义 Method Not Allowed 状态码', () => {
      expect(HttpStatus.METHOD_NOT_ALLOWED).toBe(405);
    });

    it('应该定义 Not Acceptable 状态码', () => {
      expect(HttpStatus.NOT_ACCEPTABLE).toBe(406);
    });

    it('应该定义 Proxy Authentication Required 状态码', () => {
      expect(HttpStatus.PROXY_AUTHENTICATION_REQUIRED).toBe(407);
    });

    it('应该定义 Request Timeout 状态码', () => {
      expect(HttpStatus.REQUEST_TIMEOUT).toBe(408);
    });

    it('应该定义 Conflict 状态码', () => {
      expect(HttpStatus.CONFLICT).toBe(409);
    });

    it('应该定义 Gone 状态码', () => {
      expect(HttpStatus.GONE).toBe(410);
    });

    it('应该定义 Length Required 状态码', () => {
      expect(HttpStatus.LENGTH_REQUIRED).toBe(411);
    });

    it('应该定义 Precondition Failed 状态码', () => {
      expect(HttpStatus.PRECONDITION_FAILED).toBe(412);
    });

    it('应该定义 Payload Too Large 状态码', () => {
      expect(HttpStatus.PAYLOAD_TOO_LARGE).toBe(413);
    });

    it('应该定义 URI Too Long 状态码', () => {
      expect(HttpStatus.URI_TOO_LONG).toBe(414);
    });

    it('应该定义 Unsupported Media Type 状态码', () => {
      expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE).toBe(415);
    });

    it('应该定义 Requested Range Not Satisfiable 状态码', () => {
      expect(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).toBe(416);
    });

    it('应该定义 Expectation Failed 状态码', () => {
      expect(HttpStatus.EXPECTATION_FAILED).toBe(417);
    });

    it('应该定义 I Am A Teapot 状态码', () => {
      expect(HttpStatus.I_AM_A_TEAPOT).toBe(418);
    });

    it('应该定义 Misdirected 状态码', () => {
      expect(HttpStatus.MISDIRECTED).toBe(421);
    });

    it('应该定义 Unprocessable Entity 状态码', () => {
      expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
    });

    it('应该定义 Failed Dependency 状态码', () => {
      expect(HttpStatus.FAILED_DEPENDENCY).toBe(424);
    });

    it('应该定义 Precondition Required 状态码', () => {
      expect(HttpStatus.PRECONDITION_REQUIRED).toBe(428);
    });

    it('应该定义 Too Many Requests 状态码', () => {
      expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
    });
  });

  describe('服务器错误响应 (5xx)', () => {
    it('应该定义 Internal Server Error 状态码', () => {
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('应该定义 Not Implemented 状态码', () => {
      expect(HttpStatus.NOT_IMPLEMENTED).toBe(501);
    });

    it('应该定义 Bad Gateway 状态码', () => {
      expect(HttpStatus.BAD_GATEWAY).toBe(502);
    });

    it('应该定义 Service Unavailable 状态码', () => {
      expect(HttpStatus.SERVICE_UNAVAILABLE).toBe(503);
    });

    it('应该定义 Gateway Timeout 状态码', () => {
      expect(HttpStatus.GATEWAY_TIMEOUT).toBe(504);
    });

    it('应该定义 HTTP Version Not Supported 状态码', () => {
      expect(HttpStatus.HTTP_VERSION_NOT_SUPPORTED).toBe(505);
    });
  });

  describe('类型安全性', () => {
    it('所有状态码都应该是数字类型', () => {
      // 获取数字枚举值（过滤掉字符串键）
      const statusCodes = Object.values(HttpStatus).filter(value => typeof value === 'number');
      statusCodes.forEach(code => {
        expect(typeof code).toBe('number');
        expect(Number.isInteger(code)).toBe(true);
        expect(code).toBeGreaterThanOrEqual(100);
        expect(code).toBeLessThan(600);
      });
    });

    it('应该包含所有预期的状态码数量', () => {
      // 只计算数字值，不包括字符串键
      const statusCodes = Object.values(HttpStatus).filter(value => typeof value === 'number');
      expect(statusCodes.length).toBe(48); // 枚举中定义的总数
    });

    it('枚举键应该与值匹配', () => {
      expect(HttpStatus['OK']).toBe(200);
      expect(HttpStatus['NOT_FOUND']).toBe(404);
      expect(HttpStatus['INTERNAL_SERVER_ERROR']).toBe(500);
    });
  });

  describe('实际使用场景', () => {
    it('应该支持常见 HTTP 状态码的使用', () => {
      // 模拟实际框架中的使用
      const getStatusMessage = (status: HttpStatus): string => {
        switch (status) {
          case HttpStatus.OK:
            return 'Success';
          case HttpStatus.BAD_REQUEST:
            return 'Bad Request';
          case HttpStatus.NOT_FOUND:
            return 'Not Found';
          case HttpStatus.INTERNAL_SERVER_ERROR:
            return 'Internal Server Error';
          default:
            return 'Unknown Status';
        }
      };

      expect(getStatusMessage(HttpStatus.OK)).toBe('Success');
      expect(getStatusMessage(HttpStatus.BAD_REQUEST)).toBe('Bad Request');
      expect(getStatusMessage(HttpStatus.NOT_FOUND)).toBe('Not Found');
      expect(getStatusMessage(HttpStatus.INTERNAL_SERVER_ERROR)).toBe('Internal Server Error');
    });

    it('应该支持状态码分类检查', () => {
      const isSuccessStatus = (status: HttpStatus): boolean => {
        return status >= 200 && status < 300;
      };

      const isErrorStatus = (status: HttpStatus): boolean => {
        return status >= 400;
      };

      expect(isSuccessStatus(HttpStatus.OK)).toBe(true);
      expect(isSuccessStatus(HttpStatus.CREATED)).toBe(true);
      expect(isSuccessStatus(HttpStatus.BAD_REQUEST)).toBe(false);

      expect(isErrorStatus(HttpStatus.BAD_REQUEST)).toBe(true);
      expect(isErrorStatus(HttpStatus.INTERNAL_SERVER_ERROR)).toBe(true);
      expect(isErrorStatus(HttpStatus.OK)).toBe(false);
    });

    it('应该支持与内置异常类的映射', () => {
      // 模拟异常与状态码的映射关系
      const exceptionStatusMap = new Map([
        ['BadRequestException', HttpStatus.BAD_REQUEST],
        ['UnauthorizedException', HttpStatus.UNAUTHORIZED],
        ['ForbiddenException', HttpStatus.FORBIDDEN],
        ['NotFoundException', HttpStatus.NOT_FOUND],
        ['InternalServerErrorException', HttpStatus.INTERNAL_SERVER_ERROR],
      ]);

      expect(exceptionStatusMap.get('BadRequestException')).toBe(400);
      expect(exceptionStatusMap.get('NotFoundException')).toBe(404);
      expect(exceptionStatusMap.get('InternalServerErrorException')).toBe(500);
    });
  });

  describe('枚举完整性验证', () => {
    it('应该包含 RFC 7231 标准状态码', () => {
      // 验证关键的 RFC 7231 状态码
      const rfc7231Codes = [
        HttpStatus.OK,
        HttpStatus.CREATED,
        HttpStatus.NO_CONTENT,
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.METHOD_NOT_ALLOWED,
        HttpStatus.INTERNAL_SERVER_ERROR,
        HttpStatus.NOT_IMPLEMENTED,
        HttpStatus.BAD_GATEWAY,
        HttpStatus.SERVICE_UNAVAILABLE
      ];

      rfc7231Codes.forEach(code => {
        expect(code).toBeDefined();
        expect(typeof code).toBe('number');
      });
    });

    it('应该包含扩展状态码', () => {
      // 验证常用的扩展状态码
      expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
      expect(HttpStatus.I_AM_A_TEAPOT).toBe(418); // RFC 2324
    });
  });
}); 