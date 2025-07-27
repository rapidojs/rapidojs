import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { container, injectable } from 'tsyringe';
import { InjectRedis } from '../decorators/inject-redis.decorator.js';
import { REDIS_CONNECTION_TOKEN, REDIS_DEFAULT_CONNECTION_NAME } from '../interfaces/redis-config.interface.js';

// Mock Redis client
const mockRedisClient = {
  ping: vi.fn().mockResolvedValue('PONG'),
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue('test-value'),
};

// Test service using @InjectRedis decorator
@injectable()
class TestService {
  constructor(
    @((InjectRedis as any)()) private defaultRedis: any,
    @((InjectRedis as any)('cache')) private cacheRedis: any
  ) {}

  async testDefault() {
    return await this.defaultRedis.ping();
  }

  async testCache() {
    return await this.cacheRedis.ping();
  }
}

describe('InjectRedis Decorator', () => {
  beforeEach(() => {
    container.clearInstances();
    
    // Register mock Redis clients
    container.register(`${REDIS_CONNECTION_TOKEN.toString()}_${REDIS_DEFAULT_CONNECTION_NAME}`, {
      useValue: mockRedisClient,
    });
    
    container.register(`${REDIS_CONNECTION_TOKEN.toString()}_cache`, {
      useValue: mockRedisClient,
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should inject default Redis client', async () => {
    const service = container.resolve(TestService);
    
    const result = await service.testDefault();
    
    expect(result).toBe('PONG');
    expect(mockRedisClient.ping).toHaveBeenCalled();
  });

  it('should inject named Redis client', async () => {
    const service = container.resolve(TestService);
    
    const result = await service.testCache();
    
    expect(result).toBe('PONG');
    expect(mockRedisClient.ping).toHaveBeenCalled();
  });

  it('should generate correct token for default connection', () => {
    const token = `${REDIS_CONNECTION_TOKEN.toString()}_${REDIS_DEFAULT_CONNECTION_NAME}`;
    expect(token).toContain('Symbol(REDIS_CONNECTION_TOKEN)');
    expect(token).toContain('default');
  });

  it('should generate correct token for named connection', () => {
    const token = `${REDIS_CONNECTION_TOKEN.toString()}_cache`;
    expect(token).toContain('Symbol(REDIS_CONNECTION_TOKEN)');
    expect(token).toContain('cache');
  });

  it('should work with multiple instances of the same service', () => {
    const service1 = container.resolve(TestService);
    const service2 = container.resolve(TestService);
    
    // Both should be different instances since TestService is not a singleton
    expect(service1).not.toBe(service2);
    // But both should have the same Redis instance
    expect(service1.redis).toBe(service2.redis);
  });
});