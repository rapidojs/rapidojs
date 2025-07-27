import type { Redis } from 'ioredis';

/**
 * Redis 服务接口
 */
export interface IRedisService {
  /**
   * 获取 Redis 客户端实例
   * @param name 连接名称
   */
  getClient(name?: string): Redis;
  
  /**
   * 获取默认 Redis 客户端实例
   */
  getDefaultClient(): Redis;
  
  /**
   * 获取所有连接名称
   */
  getConnectionNames(): string[];
  
  /**
   * 检查连接是否存在
   * @param name 连接名称
   */
  hasConnection(name: string): boolean;
  
  /**
   * 关闭指定连接
   * @param name 连接名称
   */
  closeConnection(name?: string): Promise<void>;
  
  /**
   * 关闭所有连接
   */
  closeAllConnections(): Promise<void>;
}

/**
 * Redis 缓存操作接口
 */
export interface IRedisCacheService {
  /**
   * 设置缓存
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   */
  set(key: string, value: any, ttl?: number): Promise<void>;
  
  /**
   * 获取缓存
   * @param key 键
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * 删除缓存
   * @param key 键
   */
  del(key: string): Promise<void>;
  
  /**
   * 批量删除缓存
   * @param keys 键数组
   */
  delMany(keys: string[]): Promise<void>;
  
  /**
   * 检查键是否存在
   * @param key 键
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * 设置过期时间
   * @param key 键
   * @param ttl 过期时间（秒）
   */
  expire(key: string, ttl: number): Promise<void>;
  
  /**
   * 获取剩余过期时间
   * @param key 键
   */
  ttl(key: string): Promise<number>;
  
  /**
   * 清空所有缓存
   */
  flushAll(): Promise<void>;
}