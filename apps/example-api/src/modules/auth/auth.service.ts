import { Inject, Injectable } from '@rapidojs/common';
import { UnauthorizedException } from '@rapidojs/core';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { FastifyInstance } from 'fastify';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @Inject(Symbol.for('APP_INSTANCE')) private readonly app: FastifyInstance
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
    const payload = { email: user.email, sub: user.id };
    return {
      accessToken: await this.app.jwt.sign(payload),
    };
  }
}
