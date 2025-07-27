# Redis 缓存模块

`@rapidojs/redis` 是一个基于 ioredis 的 Redis 缓存模块，提供了完整的 Redis 功能支持，包括缓存服务、连接管理、工具函数等。

## 安装

```bash
npm install @rapidojs/redis ioredis
# 或
pnpm add @rapidojs/redis ioredis
# 或
yarn add @rapidojs/redis ioredis
```

## 基础用法

### 单连接配置

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { RedisModule } from '@rapidojs/redis';

const app = await RapidoFactory.create({
  modules: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'your-password',
      db: 0,
    }),
  ],
});
```

### 多连接配置

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { RedisModule } from '@rapidojs/redis';

const app = await RapidoFactory.create({
  modules: [
    RedisModule.forRoot([
      {
        name: 'cache',
        host: 'localhost',
        port: 6379,
        db: 0,
      },
      {
        name: 'session',
        host: 'localhost',
        port: 6379,
        db: 1,
      },
    ]),
  ],
});
```

### 异步配置

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { RedisModule } from '@rapidojs/redis';

const app = await RapidoFactory.create({
  modules: [
    RedisModule.forRootAsync({
      useFactory: async () => ({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      }),
    }),
  ],
});
```

## 在服务中使用

### 使用 RedisCacheService

```typescript
import { Injectable } from '@rapidojs/common';
import { RedisCacheService } from '@rapidojs/redis';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: RedisCacheService) {}

  async getUser(id: string) {
    const cacheKey = `user:${id}`;
    
    // 尝试从缓存获取
    let user = await this.cacheService.get(cacheKey);
    
    if (!user) {
      // 从数据库获取
      user = await this.fetchUserFromDatabase(id);
      
      // 缓存 1 小时
      await this.cacheService.set(cacheKey, user, 3600);
    }
    
    return user;
  }

  private async fetchUserFromDatabase(id: string) {
    // 数据库查询逻辑
    return { id, name: 'John Doe' };
  }
}
```

### 使用 @InjectRedis 装饰器

```typescript
import { Injectable } from '@rapidojs/common';
import { InjectRedis } from '@rapidojs/redis';
import type { Redis } from 'ioredis';

@Injectable()
export class SessionService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('session') private readonly sessionRedis: Redis,
  ) {}

  async setSession(sessionId: string, data: any) {
    await this.sessionRedis.setex(`session:${sessionId}`, 3600, JSON.stringify(data));
  }

  async getSession(sessionId: string) {
    const data = await this.sessionRedis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

## RedisCacheService API

### 基础操作

```typescript
// 设置缓存
await cacheService.set('key', 'value', 3600); // 缓存 1 小时

// 获取缓存
const value = await cacheService.get('key');

// 删除缓存
await cacheService.del('key');

// 检查键是否存在
const exists = await cacheService.exists('key');

// 设置过期时间
await cacheService.expire('key', 1800); // 30 分钟

// 获取剩余过期时间
const ttl = await cacheService.ttl('key');
```

### 批量操作

```typescript
// 批量设置
await cacheService.mset({
  'key1': 'value1',
  'key2': 'value2',
});

// 批量获取
const values = await cacheService.mget(['key1', 'key2']);

// 批量删除
await cacheService.mdel(['key1', 'key2']);
```

### 高级操作

```typescript
// 原子递增
const newValue = await cacheService.incr('counter');

// 指定步长递增
const newValue2 = await cacheService.incrby('counter', 5);

// 原子递减
const newValue3 = await cacheService.decr('counter');

// 指定步长递减
const newValue4 = await cacheService.decrby('counter', 3);
```

### 列表操作

```typescript
// 左侧推入
await cacheService.lpush('list', 'item1', 'item2');

// 右侧推入
await cacheService.rpush('list', 'item3');

// 左侧弹出
const item = await cacheService.lpop('list');

// 右侧弹出
const item2 = await cacheService.rpop('list');

// 获取列表长度
const length = await cacheService.llen('list');

// 获取列表范围
const items = await cacheService.lrange('list', 0, -1);
```

### 集合操作

```typescript
// 添加成员
await cacheService.sadd('set', 'member1', 'member2');

// 移除成员
await cacheService.srem('set', 'member1');

// 检查成员是否存在
const isMember = await cacheService.sismember('set', 'member2');

// 获取所有成员
const members = await cacheService.smembers('set');

// 获取集合大小
const size = await cacheService.scard('set');
```

### 有序集合操作

```typescript
// 添加成员
await cacheService.zadd('zset', 1, 'member1', 2, 'member2');

// 移除成员
await cacheService.zrem('zset', 'member1');

// 获取成员分数
const score = await cacheService.zscore('zset', 'member2');

// 按分数范围获取成员
const members = await cacheService.zrangebyscore('zset', 0, 10);

// 获取有序集合大小
const size = await cacheService.zcard('zset');
```

### 哈希操作

```typescript
// 设置哈希字段
await cacheService.hset('hash', 'field1', 'value1');

// 批量设置哈希字段
await cacheService.hmset('hash', {
  field2: 'value2',
  field3: 'value3',
});

// 获取哈希字段
const value = await cacheService.hget('hash', 'field1');

// 批量获取哈希字段
const values = await cacheService.hmget('hash', ['field1', 'field2']);

// 获取所有哈希字段和值
const all = await cacheService.hgetall('hash');

// 删除哈希字段
await cacheService.hdel('hash', 'field1');

// 检查哈希字段是否存在
const exists = await cacheService.hexists('hash', 'field2');
```

## RedisUtils 工具类

`RedisUtils` 提供了一系列实用的 Redis 操作工具函数：

### 键管理

```typescript
import { RedisUtils } from '@rapidojs/redis';

// 生成缓存键
const key = RedisUtils.generateKey('user', 'profile', 123);
// 结果: 'user:profile:123'

// 批量删除匹配模式的键
const deletedCount = await RedisUtils.deleteByPattern(redis, 'user:*');

// 获取匹配模式的所有键
const keys = await RedisUtils.getKeysByPattern(redis, 'session:*');
```

### 连接检查

```typescript
// 检查 Redis 连接状态
const isConnected = await RedisUtils.checkConnection(redis);

// 获取服务器信息
const serverInfo = await RedisUtils.getServerInfo(redis);
const memoryInfo = await RedisUtils.getServerInfo(redis, 'memory');
```

### Lua 脚本

```typescript
// 执行 Lua 脚本
const script = 'return KEYS[1] .. ARGV[1]';
const result = await RedisUtils.evalScript(redis, script, ['key1'], ['value1']);
```

### 分布式锁

```typescript
// 获取锁
const lockKey = 'lock:resource:123';
const lockValue = 'unique-lock-value';
const ttl = 5000; // 5 秒

const acquired = await RedisUtils.acquireLock(redis, lockKey, lockValue, ttl);

if (acquired) {
  try {
    // 执行需要锁保护的操作
    console.log('执行关键操作...');
  } finally {
    // 释放锁
    await RedisUtils.releaseLock(redis, lockKey, lockValue);
  }
}
```

### 限流器

```typescript
// 滑动窗口限流
const rateLimitKey = 'rate:user:123';
const limit = 10; // 10 次请求
const window = 60; // 60 秒窗口

const result = await RedisUtils.rateLimiter(redis, rateLimitKey, limit, window);

if (result.allowed) {
  console.log(`请求允许，剩余次数: ${result.remaining}`);
} else {
  console.log(`请求被限制，重置时间: ${new Date(result.resetTime)}`);
}
```

## 配置选项

### RedisModuleOptions

```typescript
interface RedisModuleOptions {
  // ioredis 连接选项
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  family?: 4 | 6;
  keepAlive?: boolean;
  connectionName?: string;
  
  // 连接池选项
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  
  // 集群选项
  enableOfflineQueue?: boolean;
  readOnly?: boolean;
  
  // 自定义选项
  name?: string; // 连接名称（多连接时使用）
}
```

### RedisModuleAsyncOptions

```typescript
interface RedisModuleAsyncOptions {
  useFactory?: (...args: any[]) => Promise<RedisModuleOptions | RedisModuleOptions[]> | RedisModuleOptions | RedisModuleOptions[];
  inject?: any[];
}
```

## 最佳实践

### 1. 键命名规范

```typescript
// 使用有意义的前缀和层次结构
const userCacheKey = RedisUtils.generateKey('user', 'profile', userId);
const sessionKey = RedisUtils.generateKey('session', sessionId);
const rateLimitKey = RedisUtils.generateKey('rate', 'api', userId);
```

### 2. 设置合适的过期时间

```typescript
// 根据数据特性设置不同的过期时间
await cacheService.set('user:profile:123', userData, 3600); // 用户资料 1 小时
await cacheService.set('session:abc', sessionData, 1800); // 会话 30 分钟
await cacheService.set('temp:data:xyz', tempData, 300); // 临时数据 5 分钟
```

### 3. 错误处理

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisCacheService) {}

  async getCachedData(key: string) {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Redis 操作失败:', error);
      return null; // 降级处理
    }
  }
}
```

### 4. 批量操作优化

```typescript
// 使用批量操作提高性能
const keys = ['key1', 'key2', 'key3'];
const values = await cacheService.mget(keys); // 一次获取多个值

const data = {
  'key1': 'value1',
  'key2': 'value2',
  'key3': 'value3',
};
await cacheService.mset(data); // 一次设置多个值
```

### 5. 连接管理

```typescript
// 在应用关闭时正确清理连接
process.on('SIGTERM', async () => {
  await app.close();
});
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 Redis 服务是否运行
   - 验证连接配置（主机、端口、密码）
   - 检查网络连接和防火墙设置

2. **性能问题**
   - 使用批量操作减少网络往返
   - 设置合适的连接池大小
   - 避免在循环中进行 Redis 操作

3. **内存使用**
   - 设置合适的过期时间
   - 定期清理不需要的键
   - 监控 Redis 内存使用情况

### 调试技巧

```typescript
// 启用 Redis 调试日志
const app = await RapidoFactory.create({
  modules: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      // 启用调试
      showFriendlyErrorStack: true,
    }),
  ],
});
```

## 相关链接

- [ioredis 文档](https://github.com/luin/ioredis)
- [Redis 官方文档](https://redis.io/documentation)
- [RapidoJS 核心文档](./overview.md)