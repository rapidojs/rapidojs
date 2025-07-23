import { ArgumentsHost, HttpArgumentsHost } from '../interfaces/arguments-host.interface.js';
import { FastifyRequest, FastifyReply } from 'fastify';

export class HttpArgumentsHostImpl implements ArgumentsHost, HttpArgumentsHost {
  private request: FastifyRequest;
  private reply: FastifyReply;

  constructor(request: FastifyRequest, reply: FastifyReply) {
    this.request = request;
    this.reply = reply;
  }

  getRequest<T = FastifyRequest>(): T {
    return this.request as T;
  }

  getResponse<T = FastifyReply>(): T {
    return this.reply as T;
  }

  switchToHttp(): HttpArgumentsHost {
    return this;
  }
}
