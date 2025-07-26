import { describe, it, expect } from 'vitest';
import { RapidoFactory } from '@rapidojs/core';
import { Module, Injectable, FastifyApp, Controller, Get, Inject } from '@rapidojs/common';
import { AuthModule } from '../auth.module.js';
import type { FastifyInstance } from 'fastify';

describe('AuthModule E2E', () => {
  it('should register fastify-jwt and make it available on the app instance', async () => {
    @Injectable()
    class TestAuthService {
      constructor(@FastifyApp() private readonly app: FastifyInstance) {}

      isJwtAvailable() {
        return !!this.app.jwt;
      }

      signToken() {
        return this.app.jwt.sign({ user: 'test' });
      }
    }

    @Controller('/test')
    class TestAuthController {
      constructor(@Inject(TestAuthService) private readonly service: TestAuthService) {}

      @Get('/jwt-check')
      checkJwt() {
        return { available: this.service.isJwtAvailable() };
      }

      @Get('/sign')
      getToken() {
        const token = this.service.signToken();
        return { token };
      }
    }

    @Module({
      imports: [
        AuthModule.forRoot({
          secret: 'test-secret-key-e2e',
        }),
      ],
      controllers: [TestAuthController],
      providers: [TestAuthService],
    })
    class TestAppModule {}

    const app = await RapidoFactory.create(TestAppModule);
    await app.ready();

    // 1. Check if jwt is available on the instance
    const checkResponse = await app.inject({
      method: 'GET',
      url: '/test/jwt-check',
    });

    expect(checkResponse.statusCode).toBe(200);
    expect(checkResponse.json()).toEqual({ available: true });

    // 2. Check if signing a token works
    const signResponse = await app.inject({
      method: 'GET',
      url: '/test/sign',
    });

    expect(signResponse.statusCode).toBe(200);
    const body = signResponse.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');

    // 3. Verify the token
    const decoded = app.jwt.verify(body.token) as { user: string; iat: number };
    expect(decoded.user).toBe('test');

    await app.close();
  });
}); 