# @rapidojs/redis

RapidoJS Redis 集成模块 - 提供与 Redis 的深度集成和声明式缓存操作。

## 特性

- 🚀 **简单易用** - 声明式配置和依赖注入
- 🔄 **多连接支持** - 支持多个 Redis 实例
- 🎯 **类型安全** - 完整的 TypeScript 支持
- 🛠️ **丰富的工具** - 内置缓存、锁、限流等工具
- 📦 **模块化设计** - 可选择性使用功能
- 🔧 **生命周期管理** - 自动连接和清理

## 安装

```bash
npm install @rapidojs/redis ioredis
# 或
pnpm add @rapidojs/redis ioredis
# 或
yarn add @rapidojs/redis ioredis
```

## 快速开始

### 1. 配置模块

```typescript
import { RapidoApplication } from '@rapidojs/core';
import { RedisModule } from '@rapidojs/redis';

const app = new RapidoApplication({
  modules: [
    RedisModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
        password: 'your-password', // 可选
        db: 0, // 可选
      },
    }),
  ],
});
```

### 2. 使用 Redis 客户端

```typescript
import { injectable } from 'tsyringe';
import { InjectRedis } from '@rapidojs/redis';
import type { Redis } from 'ioredis';

@injectable()
export class UserService {
  constructor(
    @InjectRedis() private redis: Redis
  ) {}

  async cacheUser(userId: string, userData: any): Promise<void> {
    await this.redis.setex(`user:${userId}`, 3600, JSON.stringify(userData));
  }

  async getUser(userId: string): Promise<any | null> {
    const cached = await this.redis.get(`user:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### 3. 使用缓存服务

```typescript
import { injectable } from 'tsyringe';
import { RedisCacheService } from '@rapidojs/redis';

@injectable()
export class ProductService {
  constructor(
    private cacheService: RedisCacheService
  ) {}

  async getProduct(id: string) {
    // 尝试从缓存获取
    let product = await this.cacheService.get(`product:${id}`);
    
    if (!product) {
      // 从数据库获取
      product = await this.fetchFromDatabase(id);
      
      // 缓存 1 小时
      await this.cacheService.set(`product:${id}`, product, 3600);
    }
    
    return product;
  }
}
```

## 配置选项

### 单连接配置

```typescript
RedisModule.forRoot({
  connection: {
    host: 'localhost',
    port: 6379,
    password: 'password',
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
})
```

### 多连接配置

```typescript
RedisModule.forRoot({
  connections: [
    {
      name: 'default',
      host: 'localhost',
      port: 6379,
      isDefault: true,
    },
    {
      name: 'cache',
      host: 'localhost',
      port: 6380,
    },
    {
      name: 'session',
      host: 'localhost',
      port: 6381,
    },
  ],
})
```

### 异步配置

```typescript
RedisModule.forRootAsync(async () => {
  const config = await getConfigFromEnv();
  return {
    connection: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
    },
  };
})
```

## 多连接使用

```typescript
@injectable()
export class MultiRedisService {
  constructor(
    @InjectRedis() private defaultRedis: Redis,
    @InjectRedis('cache') private cacheRedis: Redis,
    @InjectRedis('session') private sessionRedis: Redis
  ) {}

  async cacheData(key: string, data: any) {
    await this.cacheRedis.setex(key, 3600, JSON.stringify(data));
  }

  async setSession(sessionId: string, data: any) {
    await this.sessionRedis.setex(sessionId, 1800, JSON.stringify(data));
  }
}
```

## 缓存服务 API

### 基础操作

```typescript
// 设置缓存
await cacheService.set('key', 'value', 3600); // TTL 3600 秒

// 获取缓存
const value = await cacheService.get('key');

// 删除缓存
await cacheService.del('key');

// 检查是否存在
const exists = await cacheService.exists('key');

// 设置过期时间
await cacheService.expire('key', 1800);

// 获取剩余时间
const ttl = await cacheService.ttl('key');
```

### 批量操作

```typescript
// 批量设置
await cacheService.mset([
  ['key1', 'value1'],
  ['key2', { data: 'object' }],
], 3600);

// 批量获取
const values = await cacheService.mget(['key1', 'key2']);

// 批量删除
await cacheService.delMany(['key1', 'key2', 'key3']);
```

### 原子操作

```typescript
// 递增
const newValue = await cacheService.incr('counter'); // +1
const newValue2 = await cacheService.incr('counter', 5); // +5

// 递减
const newValue3 = await cacheService.decr('counter'); // -1
const newValue4 = await cacheService.decr('counter', 3); // -3
```

## Redis 工具函数

```typescript
import { RedisUtils } from '@rapidojs/redis';

// 生成缓存键
const key = RedisUtils.generateKey('user', 'profile', 123);
// 结果: 'user:profile:123'

// 批量删除匹配的键
const deletedCount = await RedisUtils.deleteByPattern(redis, 'user:*');

// 获取匹配的键
const keys = await RedisUtils.getKeysByPattern(redis, 'session:*');

// 检查连接状态
const isConnected = await RedisUtils.checkConnection(redis);

// 获取服务器信息
const info = await RedisUtils.getServerInfo(redis, 'memory');

// 分布式锁
const lockAcquired = await RedisUtils.acquireLock(
  redis,
  'lock:resource',
  'unique-id',
  5000 // 5秒过期
);

if (lockAcquired) {
  try {
    // 执行需要锁保护的操作
  } finally {
    await RedisUtils.releaseLock(redis, 'lock:resource', 'unique-id');
  }
}

// 限流器
const result = await RedisUtils.rateLimiter(
  redis,
  'rate:user:123',
  10, // 限制 10 次
  60  // 60 秒窗口
);

if (result.allowed) {
  // 允许请求
  console.log(`剩余次数: ${result.remaining}`);
} else {
  // 超出限制
  console.log(`重置时间: ${new Date(result.resetTime)}`);
}
```

## 高级用法

### 自定义序列化

```typescript
@injectable()
export class CustomCacheService {
  constructor(private cacheService: RedisCacheService) {}

  async setObject(key: string, obj: any, ttl?: number) {
    const serialized = JSON.stringify(obj);
    await this.cacheService.set(key, serialized, ttl);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value = await this.cacheService.get(key);
    return value ? JSON.parse(value) : null;
  }
}
```

### 缓存装饰器（示例）

```typescript
function Cache(key: string, ttl: number = 3600) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = container.resolve(RedisCacheService);
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      
      let result = await cacheService.get(cacheKey);
      if (result === null) {
        result = await method.apply(this, args);
        await cacheService.set(cacheKey, result, ttl);
      }
      
      return result;
    };
  };
}

@injectable()
export class DataService {
  @Cache('user-data', 1800)
  async getUserData(userId: string) {
    // 这个方法的结果会被自动缓存 30 分钟
    return await this.fetchUserFromDatabase(userId);
  }
}
```

## 错误处理

```typescript
@injectable()
export class RobustService {
  constructor(
    @InjectRedis() private redis: Redis,
    private cacheService: RedisCacheService
  ) {}

  async safeGet(key: string) {
    try {
      return await this.cacheService.get(key);
    } catch (error) {
      console.error('Redis error:', error);
      return null; // 降级处理
    }
  }

  async safeSet(key: string, value: any, ttl?: number) {
    try {
      await this.cacheService.set(key, value, ttl);
    } catch (error) {
      console.error('Redis set error:', error);
      // 可以选择忽略或记录日志
    }
  }
}
```

## 性能优化

### 使用管道

```typescript
@injectable()
export class BatchService {
  constructor(@InjectRedis() private redis: Redis) {}

  async batchOperations() {
    const pipeline = this.redis.pipeline();
    
    pipeline.set('key1', 'value1');
    pipeline.set('key2', 'value2');
    pipeline.expire('key1', 3600);
    pipeline.expire('key2', 3600);
    
    const results = await pipeline.exec();
    return results;
  }
}
```

### 连接池配置

```typescript
RedisModule.forRoot({
  connection: {
    host: 'localhost',
    port: 6379,
    // 连接池配置
    family: 4,
    keepAlive: true,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 5000,
  },
})
```

## 监控和调试

```typescript
@injectable()
export class MonitoringService {
  constructor(@InjectRedis() private redis: Redis) {
    // 监听连接事件
    this.redis.on('connect', () => {
      console.log('Redis connected');
    });
    
    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });
    
    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  async getStats() {
    const info = await RedisUtils.getServerInfo(this.redis);
    return {
      version: info.redis_version,
      memory: info.used_memory_human,
      connections: info.connected_clients,
      uptime: info.uptime_in_seconds,
    };
  }
}
```

## 最佳实践

1. **键命名规范**：使用有意义的前缀和分隔符
2. **设置合理的 TTL**：避免内存泄漏
3. **错误处理**：Redis 故障时的降级策略
4. **监控**：监听连接状态和性能指标
5. **批量操作**：使用 pipeline 提高性能
6. **连接复用**：合理配置连接池

## 许可证

MIT