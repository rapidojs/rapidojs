import { inject } from 'tsyringe';
import { REDIS_CONNECTION_TOKEN, REDIS_DEFAULT_CONNECTION_NAME } from '../interfaces/redis-config.interface.js';

/**
 * Redis 注入装饰器
 * 用于注入 Redis 客户端实例
 * 
 * @param connectionName 连接名称，默认为 'default'
 * 
 * @example
 * ```typescript
 * @injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRedis() private redis: Redis,
 *     @InjectRedis('cache') private cacheRedis: Redis
 *   ) {}
 * }
 * ```
 */
export function InjectRedis(connectionName: string = REDIS_DEFAULT_CONNECTION_NAME) {
  return inject(`${REDIS_CONNECTION_TOKEN.toString()}_${connectionName}`);
}