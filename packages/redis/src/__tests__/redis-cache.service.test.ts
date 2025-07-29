import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { RedisCacheService } from '../services/redis-cache.service.js';
import { RedisService } from '../services/redis.service.js';
import type { RedisConfig } from '../interfaces/redis-config.interface.js';

// Mock Redis client
const mockRedisClient = {
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn(),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn(),
  expire: vi.fn().mockResolvedValue(1),
  ttl: vi.fn(),
  flushall: vi.fn().mockResolvedValue('OK'),
  mget: vi.fn(),
  pipeline: vi.fn(() => ({
    set: vi.fn(),
    setex: vi.fn(),
    exec: vi.fn().mockResolvedValue([]),
  })),
  incr: vi.fn(),
  incrby: vi.fn(),
  decr: vi.fn(),
  decrby: vi.fn(),
};

// Mock RedisService
const mockRedisService = {
  getClient: vi.fn(() => mockRedisClient),
} as any;

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;
  
  beforeEach(() => {
    container.clearInstances();
    container.register(RedisService, { useValue: mockRedisService });
    // Directly instantiate RedisCacheService instead of resolving from container
    cacheService = new RedisCacheService(mockRedisService);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      await cacheService.set('key1', 'value1');
      
      expect(mockRedisClient.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should set value with TTL', async () => {
      await cacheService.set('key1', 'value1', 3600);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith('key1', 3600, 'value1');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should serialize object values', async () => {
      const obj = { name: 'test', age: 25 };
      await cacheService.set('key1', obj);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith('key1', JSON.stringify(obj));
    });

    it('should handle string values without double serialization', async () => {
      await cacheService.set('key1', 'simple string');
      
      expect(mockRedisClient.set).toHaveBeenCalledWith('key1', 'simple string');
    });
  });

  describe('get', () => {
    it('should get and deserialize value', async () => {
      const obj = { name: 'test', age: 25 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(obj));
      
      const result = await cacheService.get('key1');
      
      expect(mockRedisClient.get).toHaveBeenCalledWith('key1');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheService.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle string values', async () => {
      mockRedisClient.get.mockResolvedValue('simple string');
      
      const result = await cacheService.get('key1');
      
      expect(result).toBe('simple string');
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      await cacheService.del('key1');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1');
    });
  });

  describe('delMany', () => {
    it('should delete multiple keys', async () => {
      await cacheService.delMany(['key1', 'key2', 'key3']);
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should handle empty array', async () => {
      await cacheService.delMany([]);
      
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      
      const result = await cacheService.exists('key1');
      
      expect(mockRedisClient.exists).toHaveBeenCalledWith('key1');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      
      const result = await cacheService.exists('key1');
      
      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration time', async () => {
      await cacheService.expire('key1', 3600);
      
      expect(mockRedisClient.expire).toHaveBeenCalledWith('key1', 3600);
    });
  });

  describe('ttl', () => {
    it('should return TTL value', async () => {
      mockRedisClient.ttl.mockResolvedValue(3600);
      
      const result = await cacheService.ttl('key1');
      
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('key1');
      expect(result).toBe(3600);
    });
  });

  describe('flushAll', () => {
    it('should flush all keys', async () => {
      await cacheService.flushAll();
      
      expect(mockRedisClient.flushall).toHaveBeenCalled();
    });
  });

  describe('mset', () => {
    it('should set multiple key-value pairs without TTL', async () => {
      const pairs: Array<[string, any]> = [['key1', 'value1'], ['key2', { data: 'test' }]];
      const mockPipeline = {
        set: vi.fn(),
        setex: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      
      await cacheService.mset(pairs);
      
      expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockPipeline.set).toHaveBeenCalledWith('key2', JSON.stringify({ data: 'test' }));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should set multiple key-value pairs with TTL', async () => {
      const pairs: Array<[string, any]> = [['key1', 'value1']];
      const mockPipeline = {
        set: vi.fn(),
        setex: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);
      
      await cacheService.mset(pairs, 3600);
      
      expect(mockPipeline.setex).toHaveBeenCalledWith('key1', 3600, 'value1');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      await cacheService.mset([]);
      
      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('mget', () => {
    it('should get multiple values', async () => {
      mockRedisClient.mget.mockResolvedValue(['"value1"', JSON.stringify({ data: 'test' }), null]);
      
      const result = await cacheService.mget(['key1', 'key2', 'key3']);
      
      expect(mockRedisClient.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
      expect(result).toEqual(['value1', { data: 'test' }, null]);
    });

    it('should handle empty array', async () => {
      const result = await cacheService.mget([]);
      
      expect(result).toEqual([]);
      expect(mockRedisClient.mget).not.toHaveBeenCalled();
    });
  });

  describe('incr', () => {
    it('should increment by 1 by default', async () => {
      mockRedisClient.incr.mockResolvedValue(2);
      
      const result = await cacheService.incr('counter');
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
      expect(result).toBe(2);
    });

    it('should increment by specified value', async () => {
      mockRedisClient.incrby.mockResolvedValue(15);
      
      const result = await cacheService.incr('counter', 5);
      
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 5);
      expect(result).toBe(15);
    });
  });

  describe('decr', () => {
    it('should decrement by 1 by default', async () => {
      mockRedisClient.decr.mockResolvedValue(8);
      
      const result = await cacheService.decr('counter');
      
      expect(mockRedisClient.decr).toHaveBeenCalledWith('counter');
      expect(result).toBe(8);
    });

    it('should decrement by specified value', async () => {
      mockRedisClient.decrby.mockResolvedValue(5);
      
      const result = await cacheService.decr('counter', 3);
      
      expect(mockRedisClient.decrby).toHaveBeenCalledWith('counter', 3);
      expect(result).toBe(5);
    });
  });
});