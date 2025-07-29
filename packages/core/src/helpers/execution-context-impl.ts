import { FastifyRequest, FastifyReply } from 'fastify';
import { ExecutionContext, HttpArgumentsHost, Type } from '@rapidojs/common';

export class HttpExecutionContextImpl implements ExecutionContext, HttpArgumentsHost {
  constructor(
    private readonly request: FastifyRequest,
    private readonly reply: FastifyReply,
    private readonly controllerClass?: Type<any> | null,
    private readonly handler?: Function | null
  ) {}

  /**
   * 获取执行上下文的类型
   * @returns 上下文类型，对于HTTP请求返回'http'
   */
  getType(): string {
    return 'http';
  }

  getClass<T>(): T | null {
    return (this.controllerClass as T) || null;
  }

  getHandler(): Function | null {
    return this.handler || null;
  }

  switchToHttp(): HttpArgumentsHost {
    return this;
  }

  getRequest<T>(): T {
    return this.request as T;
  }

  getResponse<T>(): T {
    return this.reply as T;
  }
}