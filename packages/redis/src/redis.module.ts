import { container } from 'tsyringe';
import type { OnModuleInit, OnModuleDestroy } from '@rapidojs/common';
import type { RedisModuleConfig, RedisConfig } from './interfaces/redis-config.interface.js';
import { REDIS_CONNECTION_TOKEN, REDIS_DEFAULT_CONNECTION_NAME } from './interfaces/redis-config.interface.js';
import { RedisService } from './services/redis.service.js';
import { RedisCacheService } from './services/redis-cache.service.js';

/**
 * Redis 模块
 * 提供 Redis 连接管理和缓存服务
 */
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private static config: RedisModuleConfig;

  /**
   * 配置 Redis 模块
   * @param config Redis 模块配置
   */
  static forRoot(config: RedisModuleConfig): typeof RedisModule {
    this.config = config;
    return this;
  }

  /**
   * 异步配置 Redis 模块
   * @param configFactory 配置工厂函数
   */
  static forRootAsync(configFactory: () => Promise<RedisModuleConfig> | RedisModuleConfig): typeof RedisModule {
    // 存储配置工厂函数，在 onModuleInit 中调用
    (this as any).configFactory = configFactory;
    return this;
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    // 如果有异步配置工厂，先获取配置
    if ((this.constructor as any).configFactory) {
      RedisModule.config = await (this.constructor as any).configFactory();
    }

    if (!RedisModule.config) {
      throw new Error('Redis module configuration is required');
    }

    // 注册 Redis 服务
    container.registerSingleton(RedisService);
    container.registerSingleton(RedisCacheService);

    const redisService = container.resolve(RedisService);

    // 处理连接配置
    const connections = this.getConnections();
    
    if (connections.length === 0) {
      throw new Error('At least one Redis connection must be configured');
    }

    // 添加所有连接
    for (const connectionConfig of connections) {
      redisService.addConnection(connectionConfig);
    }

    // 注册 Redis 客户端实例到容器
    this.registerRedisClients(redisService, connections);

    // 连接所有 Redis 实例
    await redisService.connectAll();

    console.log('Redis module initialized successfully');
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    const redisService = container.resolve(RedisService);
    await redisService.closeAllConnections();
    console.log('Redis module destroyed successfully');
  }

  /**
   * 获取连接配置列表
   */
  private getConnections(): RedisConfig[] {
    const { connection, connections } = RedisModule.config;
    
    if (connections && connections.length > 0) {
      // 多连接模式
      const processedConnections = connections.map((conn, index) => ({
        ...conn,
        name: conn.name || (index === 0 ? REDIS_DEFAULT_CONNECTION_NAME : `connection_${index}`),
      }));
      
      // 检查是否有明确设置 isDefault 的连接
      const hasExplicitDefault = processedConnections.some(conn => conn.isDefault === true);
      
      // 如果没有明确的默认连接，将第一个连接设为默认
      if (!hasExplicitDefault) {
        processedConnections[0].isDefault = true;
      }
      
      return processedConnections;
    } else if (connection) {
      // 单连接模式
      return [{
        ...connection,
        name: connection.name || REDIS_DEFAULT_CONNECTION_NAME,
        isDefault: true,
      }];
    }
    
    return [];
  }

  /**
   * 注册 Redis 客户端实例到 DI 容器
   */
  private registerRedisClients(redisService: RedisService, connections: RedisConfig[]): void {
    for (const connectionConfig of connections) {
      const connectionName = connectionConfig.name!;
      const token = `${REDIS_CONNECTION_TOKEN.toString()}_${connectionName}`;
      
      // 注册具名连接
      container.register(token, {
        useFactory: () => redisService.getClient(connectionName),
      });
    }
  }

  /**
   * 获取模块名称
   */
  getName(): string {
    return 'RedisModule';
  }
}