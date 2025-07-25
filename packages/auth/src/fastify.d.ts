import { JWT } from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify<Decoded extends JWT['payload']>(
      options?: import('fastify-jwt').VerifyOptions,
    ): Promise<Decoded>;
    user?: any;
  }
} 