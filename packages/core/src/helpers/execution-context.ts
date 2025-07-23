import { FastifyRequest, FastifyReply } from 'fastify';
import { ExecutionContext } from '../interfaces/rapido-app.interface.js';

/**
 * Implementation of ExecutionContext for HTTP requests
 */
export class HttpExecutionContext implements ExecutionContext {
  constructor(
    private readonly request: FastifyRequest,
    private readonly reply: FastifyReply,
    private readonly context?: any
  ) {}

  getRequest<T = FastifyRequest>(): T {
    return this.request as T;
  }

  getResponse<T = FastifyReply>(): T {
    return this.reply as T;
  }

  getContext(): any {
    return this.context;
  }
} 