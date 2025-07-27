import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { container } from 'tsyringe';
import Redis from 'ioredis';
import { RedisService } from '../services/redis.service.js';
import type { RedisConfig } from '../interfaces/redis-config.interface.js';
import { REDIS_DEFAULT_CONNECTION_NAME } from '../interfaces/redis-config.interface.js';

// Mock ioredis
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

describe('RedisService', () => {
  let redisService: RedisService;
  
  beforeEach(() => {
    container.clearInstances();
    redisService = container.resolve(RedisService);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addConnection', () => {
    it('should add a default connection', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
      };
      
      expect(() => redisService.addConnection(config)).not.toThrow();
      expect(redisService.hasConnection(REDIS_DEFAULT_CONNECTION_NAME)).toBe(true);
    });

    it('should add a named connection', () => {
      const config: RedisConfig = {
        name: 'cache',
        host: 'localhost',
        port: 6379,
      };
      
      redisService.addConnection(config);
      expect(redisService.hasConnection('cache')).toBe(true);
    });

    it('should throw error when adding duplicate connection', () => {
      const config: RedisConfig = {
        name: 'test',
        host: 'localhost',
        port: 6379,
      };
      
      redisService.addConnection(config);
      expect(() => redisService.addConnection(config)).toThrow(
        "Redis connection 'test' already exists"
      );
    });

    it('should set default connection when isDefault is true', () => {
      const config: RedisConfig = {
        name: 'primary',
        host: 'localhost',
        port: 6379,
        isDefault: true,
      };
      
      redisService.addConnection(config);
      const defaultClient = redisService.getDefaultClient();
      const primaryClient = redisService.getClient('primary');
      
      expect(defaultClient).toBe(primaryClient);
    });
  });

  describe('getClient', () => {
    beforeEach(() => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(config);
    });

    it('should return default client when no name provided', () => {
      const client = redisService.getClient();
      expect(client).toBeDefined();
      expect(Redis).toHaveBeenCalled();
    });

    it('should return named client', () => {
      const namedConfig: RedisConfig = {
        name: 'named',
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(namedConfig);
      
      const client = redisService.getClient('named');
      expect(client).toBeDefined();
    });

    it('should throw error for non-existent connection', () => {
      expect(() => redisService.getClient('nonexistent')).toThrow(
        "Redis connection 'nonexistent' not found"
      );
    });
  });

  describe('getDefaultClient', () => {
    it('should return default client', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(config);
      
      const client = redisService.getDefaultClient();
      expect(client).toBeDefined();
    });
  });

  describe('getConnectionNames', () => {
    it('should return all connection names', () => {
      const configs: RedisConfig[] = [
        { name: 'conn1', host: 'localhost', port: 6379 },
        { name: 'conn2', host: 'localhost', port: 6380 },
      ];
      
      configs.forEach(config => redisService.addConnection(config));
      
      const names = redisService.getConnectionNames();
      expect(names).toContain('conn1');
      expect(names).toContain('conn2');
      expect(names).toHaveLength(2);
    });
  });

  describe('hasConnection', () => {
    it('should return true for existing connection', () => {
      const config: RedisConfig = {
        name: 'test',
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(config);
      
      expect(redisService.hasConnection('test')).toBe(true);
    });

    it('should return false for non-existing connection', () => {
      expect(redisService.hasConnection('nonexistent')).toBe(false);
    });
  });

  describe('closeConnection', () => {
    it('should close specific connection', async () => {
      const config: RedisConfig = {
        name: 'test',
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(config);
      
      await redisService.closeConnection('test');
      expect(redisService.hasConnection('test')).toBe(false);
    });

    it('should close default connection when no name provided', async () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
      };
      redisService.addConnection(config);
      
      await redisService.closeConnection();
      expect(redisService.hasConnection(REDIS_DEFAULT_CONNECTION_NAME)).toBe(false);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections', async () => {
      const configs: RedisConfig[] = [
        { name: 'conn1', host: 'localhost', port: 6379 },
        { name: 'conn2', host: 'localhost', port: 6380 },
      ];
      
      configs.forEach(config => redisService.addConnection(config));
      
      await redisService.closeAllConnections();
      expect(redisService.getConnectionNames()).toHaveLength(0);
    });
  });

  describe('connectAll', () => {
    it('should connect all Redis instances', async () => {
      const configs: RedisConfig[] = [
        { name: 'conn1', host: 'localhost', port: 6379 },
        { name: 'conn2', host: 'localhost', port: 6380 },
      ];
      
      configs.forEach(config => redisService.addConnection(config));
      
      await expect(redisService.connectAll()).resolves.not.toThrow();
    });
  });
});