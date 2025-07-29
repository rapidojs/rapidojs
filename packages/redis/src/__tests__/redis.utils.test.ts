import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisUtils } from '../utils/redis.utils.js';

// Mock Redis client
const mockRedisClient = {
  scan: vi.fn(),
  del: vi.fn(),
  ping: vi.fn(),
  info: vi.fn(),
  eval: vi.fn(),
  set: vi.fn(),
  zadd: vi.fn(),
  zremrangebyscore: vi.fn(),
  zcard: vi.fn(),
  expire: vi.fn(),
};

describe('RedisUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate key with prefix and parts', () => {
      const key = RedisUtils.generateKey('user', 'profile', 123);
      expect(key).toBe('user:profile:123');
    });

    it('should handle single prefix', () => {
      const key = RedisUtils.generateKey('cache');
      expect(key).toBe('cache');
    });

    it('should handle mixed string and number parts', () => {
      const key = RedisUtils.generateKey('session', 'user', 456, 'data');
      expect(key).toBe('session:user:456:data');
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys matching pattern', async () => {
      // Mock scan to return keys in batches
      mockRedisClient.scan
        .mockResolvedValueOnce(['10', ['key1', 'key2', 'key3']])
        .mockResolvedValueOnce(['0', ['key4', 'key5']]);
      
      mockRedisClient.del
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      
      const deletedCount = await RedisUtils.deleteByPattern(mockRedisClient as any, 'test:*');
      
      expect(deletedCount).toBe(5);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key4', 'key5');
    });

    it('should handle empty scan results', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', []]);
      
      const deletedCount = await RedisUtils.deleteByPattern(mockRedisClient as any, 'test:*');
      
      expect(deletedCount).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should use custom batch size', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['key1']]);
      mockRedisClient.del.mockResolvedValue(1);
      
      await RedisUtils.deleteByPattern(mockRedisClient as any, 'test:*', 500);
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'test:*', 'COUNT', 500);
    });
  });

  describe('getKeysByPattern', () => {
    it('should return all keys matching pattern', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['10', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);
      
      const keys = await RedisUtils.getKeysByPattern(mockRedisClient as any, 'test:*');
      
      expect(keys).toEqual(['key1', 'key2', 'key3']);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', []]);
      
      const keys = await RedisUtils.getKeysByPattern(mockRedisClient as any, 'test:*');
      
      expect(keys).toEqual([]);
    });
  });

  describe('checkConnection', () => {
    it('should return true for successful ping', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      
      const isConnected = await RedisUtils.checkConnection(mockRedisClient as any);
      
      expect(isConnected).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return false for failed ping', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));
      
      const isConnected = await RedisUtils.checkConnection(mockRedisClient as any);
      
      expect(isConnected).toBe(false);
    });
  });

  describe('getServerInfo', () => {
    it('should parse server info correctly', async () => {
      const infoResponse = `# Server\r\nredis_version:6.2.0\r\nredis_mode:standalone\r\n# Memory\r\nused_memory:1024\r\n`;
      mockRedisClient.info.mockResolvedValue(infoResponse);
      
      const info = await RedisUtils.getServerInfo(mockRedisClient as any);
      
      expect(info).toEqual({
        redis_version: '6.2.0',
        redis_mode: 'standalone',
        used_memory: '1024',
      });
      expect(mockRedisClient.info).toHaveBeenCalledWith();
    });

    it('should handle specific section', async () => {
      mockRedisClient.info.mockResolvedValue('used_memory:2048\r\n');
      
      await RedisUtils.getServerInfo(mockRedisClient as any, 'memory');
      
      expect(mockRedisClient.info).toHaveBeenCalledWith('memory');
    });
  });

  describe('evalScript', () => {
    it('should execute Lua script with keys and args', async () => {
      const script = 'return KEYS[1] .. ARGV[1]';
      const keys = ['key1'];
      const args = ['value1'];
      
      mockRedisClient.eval.mockResolvedValue('key1value1');
      
      const result = await RedisUtils.evalScript(mockRedisClient as any, script, keys, args);
      
      expect(result).toBe('key1value1');
      expect(mockRedisClient.eval).toHaveBeenCalledWith(script, 1, 'key1', 'value1');
    });

    it('should handle script without keys and args', async () => {
      const script = 'return "hello"';
      
      mockRedisClient.eval.mockResolvedValue('hello');
      
      const result = await RedisUtils.evalScript(mockRedisClient as any, script);
      
      expect(result).toBe('hello');
      expect(mockRedisClient.eval).toHaveBeenCalledWith(script, 0);
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      
      const acquired = await RedisUtils.acquireLock(
        mockRedisClient as any,
        'lock:key',
        'unique-value',
        5000
      );
      
      expect(acquired).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:key',
        'unique-value',
        'PX',
        5000,
        'NX'
      );
    });

    it('should fail to acquire existing lock', async () => {
      mockRedisClient.set.mockResolvedValue(null);
      
      const acquired = await RedisUtils.acquireLock(
        mockRedisClient as any,
        'lock:key',
        'unique-value',
        5000
      );
      
      expect(acquired).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release lock with correct value', async () => {
      mockRedisClient.eval.mockResolvedValue(1);
      
      const released = await RedisUtils.releaseLock(
        mockRedisClient as any,
        'lock:key',
        'unique-value'
      );
      
      expect(released).toBe(true);
      expect(mockRedisClient.eval).toHaveBeenCalled();
    });

    it('should not release lock with incorrect value', async () => {
      mockRedisClient.eval.mockResolvedValue(0);
      
      const released = await RedisUtils.releaseLock(
        mockRedisClient as any,
        'lock:key',
        'wrong-value'
      );
      
      expect(released).toBe(false);
    });
  });

  describe('rateLimiter', () => {
    it('should allow request within limit', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 4, Date.now() + 60000]);
      
      const result = await RedisUtils.rateLimiter(
        mockRedisClient as any,
        'rate:user:123',
        5,
        60
      );
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should deny request when limit exceeded', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 0, Date.now() + 60000]);
      
      const result = await RedisUtils.rateLimiter(
        mockRedisClient as any,
        'rate:user:123',
        5,
        60
      );
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});