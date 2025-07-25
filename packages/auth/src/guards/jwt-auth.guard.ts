import { CanActivate, ExecutionContext, Injectable } from '@rapidojs/common';
import { UnauthorizedException } from '@rapidojs/core';
import { FastifyRequest } from 'fastify';
import { JwtStrategy } from '../strategies/jwt.strategy.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    
    try {
      const token = JwtStrategy.extractJwtFromRequest(request);
      const payload = await request.jwtVerify();
      const user = await this.jwtStrategy.validate(request, payload);

      if (!user) {
        throw new UnauthorizedException('User validation failed');
      }

      // Attach user to the request
      request.user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
} 