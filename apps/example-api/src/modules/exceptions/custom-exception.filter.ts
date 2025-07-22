import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@rapidojs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { CustomException } from './custom.exception.js';

@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();

    reply.status(status).send({
      statusCode: status,
      message: 'This is a custom exception filter message!',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
