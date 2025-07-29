import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { RedisModule } from '../redis.module.js';
import { RedisService } from '../services/redis.service.js';
import { RedisCacheService } from '../services/redis-cache.service.js';
import type { RedisModuleConfig } from '../interfaces/redis-config.interface.js';
import { REDIS_DEFAULT_CONNECTION_NAME } from '../interfaces/redis-config.interface.js';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
  
  return {
    default: vi.fn(() => mockRedis),
  };
});

// Mock console.log to avoid test output pollution
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('RedisModule', () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
    // Clear static config
    (RedisModule as any).config = undefined;
    (RedisModule as any).configFactory = undefined;
    consoleSpy.mockClear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('forRoot', () => {
    it('should configure module with single connection', async () => {
      const config: RedisModuleConfig = {
        connection: {
          host: 'localhost',
          port: 6379,
        },
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await expect(moduleInstance.onModuleInit()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Redis module initialized successfully');
    });

    it('should configure module with multiple connections', async () => {
      const config: RedisModuleConfig = {
        connections: [
          {
            name: 'default',
            host: 'localhost',
            port: 6379,
            isDefault: true,
          },
          {
            name: 'cache',
            host: 'localhost',
            port: 6380,
          },
        ],
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await expect(moduleInstance.onModuleInit()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Redis module initialized successfully');
    });

    it('should throw error when no configuration provided', async () => {
      const module = RedisModule.forRoot({} as RedisModuleConfig);
      const moduleInstance = new module();
      
      await expect(moduleInstance.onModuleInit()).rejects.toThrow(
        'At least one Redis connection must be configured'
      );
    });
  });

  describe('forRootAsync', () => {
    it('should configure module with async config factory', async () => {
      const configFactory = async (): Promise<RedisModuleConfig> => {
        return {
          connection: {
            host: 'localhost',
            port: 6379,
          },
        };
      };
      
      const module = RedisModule.forRootAsync(configFactory);
      const moduleInstance = new module();
      
      await expect(moduleInstance.onModuleInit()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Redis module initialized successfully');
    });

    it('should configure module with sync config factory', async () => {
      const configFactory = (): RedisModuleConfig => {
        return {
          connection: {
            host: 'localhost',
            port: 6379,
          },
        };
      };
      
      const module = RedisModule.forRootAsync(configFactory);
      const moduleInstance = new module();
      
      await expect(moduleInstance.onModuleInit()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Redis module initialized successfully');
    });
  });

  describe('onModuleInit', () => {
    it('should register services in container', async () => {
      const config: RedisModuleConfig = {
        connection: {
          host: 'localhost',
          port: 6379,
        },
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await moduleInstance.onModuleInit();
      
      // Check if RedisService is registered and can be resolved
      expect(() => container.resolve(RedisService)).not.toThrow();
      
      const redisService = container.resolve(RedisService);
      expect(redisService).toBeDefined();
      expect(redisService.getConnectionNames().length).toBeGreaterThan(0);
    });

    it('should handle connection names correctly', async () => {
      const config: RedisModuleConfig = {
        connections: [
          {
            host: 'localhost',
            port: 6379,
          },
          {
            name: 'cache',
            host: 'localhost',
            port: 6380,
          },
        ],
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await moduleInstance.onModuleInit();
      
      const redisService = container.resolve(RedisService);
      const connectionNames = redisService.getConnectionNames();
      
      expect(connectionNames).toContain(REDIS_DEFAULT_CONNECTION_NAME);
      expect(connectionNames).toContain('cache');
    });

    it('should throw error when no config provided', async () => {
      const moduleInstance = new RedisModule();
      
      await expect(moduleInstance.onModuleInit()).rejects.toThrow(
        'Redis module configuration is required'
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all connections on destroy', async () => {
      const config: RedisModuleConfig = {
        connection: {
          host: 'localhost',
          port: 6379,
        },
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await moduleInstance.onModuleInit();
      await moduleInstance.onModuleDestroy();
      
      expect(consoleSpy).toHaveBeenCalledWith('Redis module destroyed successfully');
    });
  });

  describe('getName', () => {
    it('should return correct module name', () => {
      const moduleInstance = new RedisModule();
      expect(moduleInstance.getName()).toBe('RedisModule');
    });
  });

  describe('connection configuration', () => {
    it('should set first connection as default when multiple connections provided', async () => {
      const config: RedisModuleConfig = {
        connections: [
          {
            name: 'primary',
            host: 'localhost',
            port: 6379,
          },
          {
            name: 'secondary',
            host: 'localhost',
            port: 6380,
          },
        ],
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await moduleInstance.onModuleInit();
      
      const redisService = container.resolve(RedisService);
      const connectionNames = redisService.getConnectionNames();
      
      expect(connectionNames).toContain('primary');
      expect(connectionNames).toContain('secondary');
      expect(connectionNames.length).toBe(2);
    });

    it('should respect isDefault flag', async () => {
      const config: RedisModuleConfig = {
        connections: [
          {
            name: 'primary',
            host: 'localhost',
            port: 6379,
          },
          {
            name: 'secondary',
            host: 'localhost',
            port: 6380,
            isDefault: true,
          },
        ],
      };
      
      const module = RedisModule.forRoot(config);
      const moduleInstance = new module();
      
      await moduleInstance.onModuleInit();
      
      const redisService = container.resolve(RedisService);
      const connectionNames = redisService.getConnectionNames();
      
      expect(connectionNames).toContain('secondary');
      expect(connectionNames).toContain('primary');
      expect(connectionNames.length).toBe(2);
      // Both connections should be available
    });
  });
});