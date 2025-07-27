import { injectable, singleton } from 'tsyringe';
import Redis from 'ioredis';
import type { IRedisService } from '../interfaces/redis-service.interface.js';
import type { RedisConfig } from '../interfaces/redis-config.interface.js';
import { REDIS_DEFAULT_CONNECTION_NAME } from '../interfaces/redis-config.interface.js';

/**
 * Redis 服务实现类
 * 负责管理 Redis 连接和提供客户端实例
 */
@injectable()
@singleton()
export class RedisService implements IRedisService {
  private readonly connections = new Map<string, Redis>();
  private defaultConnectionName: string = REDIS_DEFAULT_CONNECTION_NAME;

  /**
   * 添加 Redis 连接
   * @param config Redis 配置
   */
  addConnection(config: RedisConfig): void {
    const connectionName = config.name || REDIS_DEFAULT_CONNECTION_NAME;
    
    if (this.connections.has(connectionName)) {
      throw new Error(`Redis connection '${connectionName}' already exists`);
    }

    const redis = new Redis({
      ...config,
      lazyConnect: true,
    });

    // 设置连接事件监听
    redis.on('connect', () => {
      console.log(`Redis connection '${connectionName}' established`);
    });

    redis.on('error', (error) => {
      console.error(`Redis connection '${connectionName}' error:`, error);
    });

    redis.on('close', () => {
      console.log(`Redis connection '${connectionName}' closed`);
    });

    this.connections.set(connectionName, redis);

    // 设置默认连接
    if (config.isDefault || connectionName === REDIS_DEFAULT_CONNECTION_NAME) {
      this.defaultConnectionName = connectionName;
    }
  }

  /**
   * 获取 Redis 客户端实例
   * @param name 连接名称
   */
  getClient(name?: string): Redis {
    const connectionName = name || this.defaultConnectionName;
    const client = this.connections.get(connectionName);
    
    if (!client) {
      throw new Error(`Redis connection '${connectionName}' not found`);
    }
    
    return client;
  }

  /**
   * 获取默认 Redis 客户端实例
   */
  getDefaultClient(): Redis {
    return this.getClient(this.defaultConnectionName);
  }

  /**
   * 获取所有连接名称
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 检查连接是否存在
   * @param name 连接名称
   */
  hasConnection(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * 关闭指定连接
   * @param name 连接名称
   */
  async closeConnection(name?: string): Promise<void> {
    const connectionName = name || this.defaultConnectionName;
    const client = this.connections.get(connectionName);
    
    if (client) {
      await client.quit();
      this.connections.delete(connectionName);
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(client => client.quit());
    await Promise.all(closePromises);
    this.connections.clear();
  }

  /**
   * 连接所有 Redis 实例
   */
  async connectAll(): Promise<void> {
    const connectPromises = Array.from(this.connections.values()).map(client => client.connect());
    await Promise.all(connectPromises);
  }
}