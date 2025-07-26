import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer } from '../di/container.js';
import { Injectable } from '@rapidojs/common';

describe('DIContainer - useFactory Provider', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should resolve a simple factory provider', async () => {
    const factory = {
      provide: 'GREETING',
      useFactory: () => 'Hello, World!',
    };
    container.registerProvider(factory);
    const result = await container.resolve('GREETING');
    expect(result).toBe('Hello, World!');
  });

  it('should resolve a factory provider with dependencies', async () => {
    @Injectable()
    class DependencyService {
      getValue() {
        return 'Dependency';
      }
    }

    container.registerProvider(DependencyService);

    const factory = {
      provide: 'FACTORY_WITH_DEPS',
      useFactory: (dep: DependencyService) => `Factory with ${dep.getValue()}`,
      inject: [DependencyService],
    };

    container.registerProvider(factory);
    const result = await container.resolve('FACTORY_WITH_DEPS');
    expect(result).toBe('Factory with Dependency');
  });

  it('should handle async factories', async () => {
    const factory = {
      provide: 'ASYNC_GREETING',
      useFactory: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'Async Hello';
      },
    };
    container.registerProvider(factory);
    const result = await container.resolve('ASYNC_GREETING');
    expect(result).toBe('Async Hello');
  });

  it('should resolve factory providers that depend on other factory providers', async () => {
    const configProvider = {
      provide: 'CONFIG',
      useFactory: () => ({ host: 'localhost', port: 3000 }),
    };

    const dbConnectionProvider = {
      provide: 'DB_CONNECTION',
      useFactory: (config: { host: string; port: number }) => `connected_to://${config.host}:${config.port}`,
      inject: ['CONFIG'],
    };

    container.registerProvider(configProvider);
    container.registerProvider(dbConnectionProvider);

    const result = await container.resolve('DB_CONNECTION');
    expect(result).toBe('connected_to://localhost:3000');
  });

  it('should throw an error for a factory provider with missing dependencies', async () => {
    const factory = {
      provide: 'BROKEN_FACTORY',
      useFactory: (missingDep: any) => `Value: ${missingDep}`,
      inject: ['MISSING_TOKEN'],
    };
    container.registerProvider(factory);
    await expect(container.resolve('BROKEN_FACTORY')).rejects.toThrow("未找到令牌 'MISSING_TOKEN' 的提供者");
  });
}); 