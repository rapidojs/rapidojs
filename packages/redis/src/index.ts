// 模块
export { RedisModule } from './redis.module.js';

// 服务
export { RedisService } from './services/redis.service.js';
export { RedisCacheService } from './services/redis-cache.service.js';

// 装饰器
export { InjectRedis } from './decorators/inject-redis.decorator.js';

// 接口
export type {
  RedisConfig,
  RedisModuleConfig,
} from './interfaces/redis-config.interface.js';
export {
  REDIS_CONNECTION_TOKEN,
  REDIS_DEFAULT_CONNECTION_NAME,
} from './interfaces/redis-config.interface.js';
export type {
  IRedisService,
  IRedisCacheService,
} from './interfaces/redis-service.interface.js';

// 工具
export { RedisUtils } from './utils/redis.utils.js';

// 重新导出 ioredis 类型
export type { Redis, RedisOptions } from 'ioredis';