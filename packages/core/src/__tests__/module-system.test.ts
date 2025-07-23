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

  it('should correctly handle value providers (useValue)', async () => {
    const ApiKeyProvider = {
      provide: 'API_KEY',
      useValue: 'my-secret-api-key',
    };

    @Injectable()
    class ApiService {
      constructor(@Inject('API_KEY') public readonly apiKey: string) {}
    }

    @Controller('/api')
    class ApiController {
      constructor(private readonly apiService: ApiService) {}
      @Get('/key')
      getKey() {
        return this.apiService.apiKey;
      }
    }

    @Module({
      controllers: [ApiController],
      providers: [ApiService, ApiKeyProvider],
    })
    class ApiModule {}

    const valueProviderApp = await RapidoFactory.create(ApiModule);

    const response = await valueProviderApp.inject({
      method: 'GET',
      url: '/api/key',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('my-secret-api-key');

    await valueProviderApp.close();
  });
});
