import type { RedisOptions } from 'ioredis';

/**
 * Redis 连接配置接口
 */
export interface RedisConfig extends RedisOptions {
  /**
   * 连接名称，用于多连接场景
   */
  name?: string;
  
  /**
   * 是否为默认连接
   */
  isDefault?: boolean;
}

/**
 * Redis 模块配置接口
 */
export interface RedisModuleConfig {
  /**
   * 单个连接配置
   */
  connection?: RedisConfig;
  
  /**
   * 多个连接配置
   */
  connections?: RedisConfig[];
  
  /**
   * 全局配置选项
   */
  global?: {
    /**
     * 连接重试次数
     */
    retryAttempts?: number;
    
    /**
     * 连接重试延迟（毫秒）
     */
    retryDelay?: number;
    
    /**
     * 是否启用自动重连
     */
    enableReadyCheck?: boolean;
    
    /**
     * 最大重连次数
     */
    maxRetriesPerRequest?: number;
  };
}

/**
 * Redis 连接令牌
 */
export const REDIS_CONNECTION_TOKEN = Symbol('REDIS_CONNECTION_TOKEN');
export const REDIS_DEFAULT_CONNECTION_NAME = 'default'