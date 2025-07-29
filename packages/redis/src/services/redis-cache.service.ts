import { injectable, singleton } from 'tsyringe';
import type { Redis } from 'ioredis';
import type { IRedisCacheService } from '../interfaces/redis-service.interface.js';
import { RedisService } from './redis.service.js';

/**
 * Redis 缓存服务实现类
 * 提供高级缓存操作功能
 */
@injectable()
@singleton()
export class RedisCacheService implements IRedisCacheService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 获取 Redis 客户端
   * @param connectionName 连接名称
   */
  private getClient(connectionName?: string): Redis {
    return this.redisService.getClient(connectionName);
  }

  /**
   * 序列化值
   * @param value 要序列化的值
   */
  private serialize(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * 反序列化值
   * @param value 要反序列化的值
   */
  private deserialize<T>(value: string | null): T | null {
    if (value === null) {
      return null;
    }
    
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  /**
   * 设置缓存
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   * @param connectionName 连接名称
   */
  async set(key: string, value: any, ttl?: number, connectionName?: string): Promise<void> {
    const client = this.getClient(connectionName);
    const serializedValue = this.serialize(value);
    
    if (ttl && ttl > 0) {
      await client.setex(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  }

  /**
   * 获取缓存
   * @param key 键
   * @param connectionName 连接名称
   */
  async get<T = any>(key: string, connectionName?: string): Promise<T | null> {
    const client = this.getClient(connectionName);
    const value = await client.get(key);
    return this.deserialize<T>(value);
  }

  /**
   * 删除缓存
   * @param key 键
   * @param connectionName 连接名称
   */
  async del(key: string, connectionName?: string): Promise<void> {
    const client = this.getClient(connectionName);
    await client.del(key);
  }

  /**
   * 批量删除缓存
   * @param keys 键数组
   * @param connectionName 连接名称
   */
  async delMany(keys: string[], connectionName?: string): Promise<void> {
    if (keys.length === 0) return;
    
    const client = this.getClient(connectionName);
    await client.del(...keys);
  }

  /**
   * 检查键是否存在
   * @param key 键
   * @param connectionName 连接名称
   */
  async exists(key: string, connectionName?: string): Promise<boolean> {
    const client = this.getClient(connectionName);
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   * @param key 键
   * @param ttl 过期时间（秒）
   * @param connectionName 连接名称
   */
  async expire(key: string, ttl: number, connectionName?: string): Promise<void> {
    const client = this.getClient(connectionName);
    await client.expire(key, ttl);
  }

  /**
   * 获取剩余过期时间
   * @param key 键
   * @param connectionName 连接名称
   */
  async ttl(key: string, connectionName?: string): Promise<number> {
    const client = this.getClient(connectionName);
    return await client.ttl(key);
  }

  /**
   * 清空所有缓存
   * @param connectionName 连接名称
   */
  async flushAll(connectionName?: string): Promise<void> {
    const client = this.getClient(connectionName);
    await client.flushall();
  }

  /**
   * 批量设置缓存
   * @param keyValuePairs 键值对数组
   * @param ttl 过期时间（秒）
   * @param connectionName 连接名称
   */
  async mset(keyValuePairs: Array<[string, any]>, ttl?: number, connectionName?: string): Promise<void> {
    if (keyValuePairs.length === 0) return;
    
    const client = this.getClient(connectionName);
    const pipeline = client.pipeline();
    
    for (const [key, value] of keyValuePairs) {
      const serializedValue = this.serialize(value);
      if (ttl && ttl > 0) {
        pipeline.setex(key, ttl, serializedValue);
      } else {
        pipeline.set(key, serializedValue);
      }
    }
    
    await pipeline.exec();
  }

  /**
   * 批量获取缓存
   * @param keys 键数组
   * @param connectionName 连接名称
   */
  async mget<T = any>(keys: string[], connectionName?: string): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    
    const client = this.getClient(connectionName);
    const values = await client.mget(...keys);
    return values.map(value => this.deserialize<T>(value));
  }

  /**
   * 原子递增
   * @param key 键
   * @param increment 递增值，默认为 1
   * @param connectionName 连接名称
   */
  async incr(key: string, increment: number = 1, connectionName?: string): Promise<number> {
    const client = this.getClient(connectionName);
    if (increment === 1) {
      return await client.incr(key);
    }
    return await client.incrby(key, increment);
  }

  /**
   * 原子递减
   * @param key 键
   * @param decrement 递减值，默认为 1
   * @param connectionName 连接名称
   */
  async decr(key: string, decrement: number = 1, connectionName?: string): Promise<number> {
    const client = this.getClient(connectionName);
    if (decrement === 1) {
      return await client.decr(key);
    }
    return await client.decrby(key, decrement);
  }
}