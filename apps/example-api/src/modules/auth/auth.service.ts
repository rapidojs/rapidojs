import { Injectable, FastifyApp } from '@rapidojs/common';
import { UnauthorizedException } from '@rapidojs/core';
import type { FastifyInstance } from 'fastify';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @FastifyApp() private readonly app: FastifyInstance,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && user.password === pass) {
      // In a real app, you'd be comparing hashed passwords
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      email: user.email,
      id: user.id,
    };
  }

  async signJwt(payload: Record<string, unknown>): Promise<string> {
    return this.app.jwt.sign(payload);
  }
}