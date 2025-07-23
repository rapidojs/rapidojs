import { FastifyRequest, FastifyReply } from 'fastify';

export interface HttpArgumentsHost {
  getRequest<T = FastifyRequest>(): T;
  getResponse<T = FastifyReply>(): T;
}

export interface ArgumentsHost {
  switchToHttp(): HttpArgumentsHost;
}
