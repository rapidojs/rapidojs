import { Injectable } from '@rapidojs/common';
import { UnauthorizedException } from '@rapidojs/core';
import { JwtStrategy as BaseJwtStrategy } from '@rapidojs/auth';
import { FastifyRequest } from 'fastify';
import { UserService } from '../user/user.service.js';

@Injectable()
export class JwtStrategy extends BaseJwtStrategy {
  constructor(private readonly userService: UserService) {
    super();
  }

  async validate(request: any, payload: { sub: number; email: string }) {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
} 