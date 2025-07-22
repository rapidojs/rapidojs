import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module } from '../decorators/module.decorator.js';
import { Controller } from '../decorators/controller.decorator.js';
import { Get } from '../decorators/route.decorators.js';
import { Injectable } from '../decorators/injectable.decorator.js';
import { Inject } from '../decorators/inject.decorator.js';

// 1. Define a simple injectable service
@Injectable()
class TestService {
  getMessage(): string {
    return 'Hello from TestService!';
  }
}

// 2. Define a controller that depends on the service
@Controller('/test')
class TestController {
  constructor(@Inject() private readonly testService: TestService) {}

  @Get('/message')
  getMessage(): string {
    return this.testService.getMessage();
  }
}

// 3. Define a module that brings them together
@Module({
  controllers: [TestController],
  providers: [TestService],
})
class TestModule {}

describe('Module System (E2E)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 4. Bootstrap the application with the root module
    app = await RapidoFactory.create(TestModule);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should correctly bootstrap the application and inject dependencies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/message',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Hello from TestService!');
  });
});
