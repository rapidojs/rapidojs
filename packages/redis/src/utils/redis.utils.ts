import type { Redis } from 'ioredis';

/**
 * Redis 工具函数
 */
export class RedisUtils {
  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param parts 键的组成部分
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts].join(':');
  }

  /**
   * 批量删除匹配模式的键
   * @param redis Redis 客户端
   * @param pattern 匹配模式
   * @param batchSize 批处理大小
   */
  static async deleteByPattern(
    redis: Redis,
    pattern: string,
    batchSize: number = 1000
  ): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
      cursor = nextCursor;

      if (keys.length > 0) {
        const deleted = await redis.del(...keys);
        deletedCount += deleted;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * 获取匹配模式的所有键
   * @param redis Redis 客户端
   * @param pattern 匹配模式
   * @param batchSize 批处理大小
   */
  static async getKeysByPattern(
    redis: Redis,
    pattern: string,
    batchSize: number = 1000
  ): Promise<string[]> {
    let cursor = '0';
    const allKeys: string[] = [];

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== '0');

    return allKeys;
  }

  /**
   * 检查 Redis 连接状态
   * @param redis Redis 客户端
   */
  static async checkConnection(redis: Redis): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * 获取 Redis 服务器信息
   * @param redis Redis 客户端
   * @param section 信息段落
   */
  static async getServerInfo(redis: Redis, section?: string): Promise<Record<string, string>> {
    const info = section ? await redis.info(section) : await redis.info();
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 执行 Lua 脚本
   * @param redis Redis 客户端
   * @param script Lua 脚本
   * @param keys 键数组
   * @param args 参数数组
   */
  static async evalScript(
    redis: Redis,
    script: string,
    keys: string[] = [],
    args: (string | number)[] = []
  ): Promise<any> {
    return await redis.eval(script, keys.length, ...keys, ...args);
  }

  /**
   * 分布式锁实现
   * @param redis Redis 客户端
   * @param key 锁键
   * @param value 锁值
   * @param ttl 过期时间（毫秒）
   */
  static async acquireLock(
    redis: Redis,
    key: string,
    value: string,
    ttl: number
  ): Promise<boolean> {
    const result = await redis.set(key, value, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 释放分布式锁
   * @param redis Redis 客户端
   * @param key 锁键
   * @param value 锁值
   */
  static async releaseLock(redis: Redis, key: string, value: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.evalScript(redis, script, [key], [value]);
    return result === 1;
  }

  /**
   * 限流器实现（滑动窗口）
   * @param redis Redis 客户端
   * @param key 限流键
   * @param limit 限制次数
   * @param window 时间窗口（秒）
   */
  static async rateLimiter(
    redis: Redis,
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    const script = `
      local key = KEYS[1]
      local window_start = ARGV[1]
      local now = ARGV[2]
      local limit = tonumber(ARGV[3])
      local window = tonumber(ARGV[4])
      
      -- 清理过期的记录
      redis.call('zremrangebyscore', key, 0, window_start)
      
      -- 获取当前窗口内的请求数
      local current = redis.call('zcard', key)
      
      if current < limit then
        -- 添加当前请求
        redis.call('zadd', key, now, now)
        redis.call('expire', key, window)
        return {1, limit - current - 1, window_start + window * 1000}
      else
        return {0, 0, window_start + window * 1000}
      end
    `;
    
    const result = await this.evalScript(redis, script, [key], [windowStart, now, limit, window]) as [number, number, number];
    
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetTime: result[2],
    };
  }
}