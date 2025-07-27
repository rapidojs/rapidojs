import { FastifyRequest } from 'fastify';
import { AuthStrategy } from '../interfaces/strategy.interface.js';
import { Injectable } from '@rapidojs/common';
import { UnauthorizedException } from '@rapidojs/core';

@Injectable()
export abstract class JwtStrategy implements AuthStrategy {

  abstract validate(request: FastifyRequest, payload: any): Promise<any>;

  public static extractJwtFromRequest(request: FastifyRequest): string {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header not found');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Invalid authorization scheme');
    }

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    return token;
  }
} 