---
sidebar_position: 4
---

# 增强的依赖注入容器

增强的依赖注入容器是 Rapido.js v1.1.0 的核心特性，提供了企业级的依赖管理能力，包括循环依赖检测、多种作用域支持、懒加载和条件注入等高级功能。

## 核心特性

### 1. 循环依赖检测与处理

增强的 DI 容器能够自动检测循环依赖并提供解决建议：

```typescript
import { Injectable, Inject, forwardRef } from '@rapidojs/core';

// 错误示例：会触发循环依赖警告
@Injectable()
export class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// 正确示例：使用 forwardRef 解决循环依赖
@Injectable()
export class ServiceA {
  constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {}
}
```

当检测到循环依赖时，容器会输出详细的警告信息：

```
⚠️  检测到循环依赖: ServiceA -> ServiceB -> ServiceA
建议使用 forwardRef() 来解决循环依赖问题
```

### 2. 多种依赖作用域

#### Singleton（单例）

默认作用域，整个应用生命周期内只创建一个实例：

```typescript
import { Injectable, Singleton } from '@rapidojs/core';

@Singleton() // 或者不加装饰器（默认）
@Injectable()
export class DatabaseService {
  private connection: any;
  
  constructor() {
    this.connection = createDatabaseConnection();
    console.log('DatabaseService 实例化');
  }
}
```

#### Transient（瞬态）

每次注入都创建新实例：

```typescript
import { Injectable, Transient } from '@rapidojs/core';

@Transient()
@Injectable()
export class LoggerService {
  private timestamp: number;
  
  constructor() {
    this.timestamp = Date.now();
    console.log(`LoggerService 实例化: ${this.timestamp}`);
  }
  
  log(message: string) {
    console.log(`[${this.timestamp}] ${message}`);
  }
}
```

#### Request Scoped（请求级）

每个 HTTP 请求内共享同一个实例：

```typescript
import { Injectable, RequestScoped } from '@rapidojs/core';

@RequestScoped()
@Injectable()
export class RequestContextService {
  private requestId: string;
  private startTime: number;
  
  constructor() {
    this.requestId = generateRequestId();
    this.startTime = Date.now();
  }
  
  getRequestId(): string {
    return this.requestId;
  }
  
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}
```

### 3. 懒加载依赖注入

懒加载允许延迟实例化重型服务，直到首次访问时才创建：

```typescript
import { Injectable, Lazy } from '@rapidojs/core';

@Injectable()
export class HeavyAnalyticsService {
  constructor() {
    console.log('初始化分析服务...');
    // 执行耗时的初始化操作
    this.initializeAnalytics();
  }
  
  private initializeAnalytics() {
    // 连接到分析服务器
    // 加载配置文件
    // 初始化缓存
  }
  
  track(event: string, data: any) {
    // 追踪事件
  }
}

@Injectable()
export class UserService {
  constructor(
    @Lazy() private analyticsService: HeavyAnalyticsService
  ) {
    console.log('UserService 实例化');
    // analyticsService 此时还未实例化
  }
  
  async createUser(userData: any) {
    const user = await this.saveUser(userData);
    
    // 只有在这里第一次访问时，analyticsService 才会被实例化
    await this.analyticsService.track('user_created', { userId: user.id });
    
    return user;
  }
}
```

### 4. 条件注入

根据环境变量、配置或自定义条件来决定是否注册服务：

#### 基于环境变量的条件注入

```typescript
import { Injectable, ConditionalOn } from '@rapidojs/core';

@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionCacheService {
  // 只在生产环境注册
}

@ConditionalOn({ env: 'NODE_ENV', value: 'development' })
@Injectable()
export class DevCacheService {
  // 只在开发环境注册
}
```

#### 基于配置的条件注入

```typescript
@ConditionalOn({ config: 'feature.redis', value: 'true' })
@Injectable()
export class RedisService {
  // 当环境变量 FEATURE_REDIS=true 时注册
}

@ConditionalOn({ config: 'database.type', value: 'postgresql' })
@Injectable()
export class PostgreSQLService {
  // 当环境变量 DATABASE_TYPE=postgresql 时注册
}
```

#### 基于自定义条件的注入

```typescript
@ConditionalOn({ 
  condition: () => process.platform === 'darwin' 
})
@Injectable()
export class MacOSService {
  // 只在 macOS 系统注册
}

@ConditionalOn({ 
  condition: () => {
    const memoryGB = process.memoryUsage().heapTotal / 1024 / 1024 / 1024;
    return memoryGB > 4; // 只在内存大于 4GB 时注册
  }
})
@Injectable()
export class HighMemoryService {
  // 只在高内存环境注册
}
```

#### 复合条件

```typescript
@ConditionalOn({
  env: 'NODE_ENV',
  value: 'production',
  condition: () => process.env.ENABLE_MONITORING === 'true'
})
@Injectable()
export class ProductionMonitoringService {
  // 同时满足生产环境和启用监控条件时注册
}
```

## 实际应用示例

### 多环境服务配置

```typescript
// 缓存服务接口
export interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

// 内存缓存实现（开发环境）
@ConditionalOn({ env: 'NODE_ENV', value: 'development' })
@Injectable()
export class MemoryCacheService implements CacheService {
  private cache = new Map();
  
  async get(key: string) {
    return this.cache.get(key);
  }
  
  async set(key: string, value: any, ttl?: number) {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl * 1000);
    }
  }
  
  async del(key: string) {
    this.cache.delete(key);
  }
}

// Redis 缓存实现（生产环境）
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class RedisCacheService implements CacheService {
  constructor(private redisClient: RedisClient) {}
  
  async get(key: string) {
    return await this.redisClient.get(key);
  }
  
  async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    } else {
      await this.redisClient.set(key, JSON.stringify(value));
    }
  }
  
  async del(key: string) {
    await this.redisClient.del(key);
  }
}
```

### 请求级服务示例

```typescript
@RequestScoped()
@Injectable()
export class RequestTrackingService {
  private requestId: string;
  private startTime: number;
  private events: Array<{ timestamp: number; event: string; data?: any }> = [];
  
  constructor() {
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.addEvent('request_started');
  }
  
  getRequestId(): string {
    return this.requestId;
  }
  
  addEvent(event: string, data?: any) {
    this.events.push({
      timestamp: Date.now(),
      event,
      data
    });
  }
  
  getRequestSummary() {
    return {
      requestId: this.requestId,
      duration: Date.now() - this.startTime,
      events: this.events
    };
  }
}

@Controller('/api/users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private trackingService: RequestTrackingService // 每个请求都有独立的实例
  ) {}
  
  @Get('/:id')
  async findOne(@Param('id') id: string) {
    this.trackingService.addEvent('user_lookup_started', { userId: id });
    
    const user = await this.usersService.findById(id);
    
    this.trackingService.addEvent('user_lookup_completed', { found: !!user });
    
    return {
      user,
      tracking: this.trackingService.getRequestSummary()
    };
  }
}
```

## 最佳实践

### 1. 选择合适的作用域

- **Singleton**: 用于无状态服务、数据库连接、配置服务等
- **Transient**: 用于有状态的工具类、临时计算服务等
- **Request**: 用于请求上下文、用户会话、请求追踪等

### 2. 合理使用懒加载

```typescript
// 好的实践：对重型服务使用懒加载
@Injectable()
export class ApiService {
  constructor(
    @Lazy() private analyticsService: AnalyticsService, // 重型服务
    @Lazy() private reportingService: ReportingService, // 重型服务
    private configService: ConfigService // 轻量服务，不需要懒加载
  ) {}
}
```

### 3. 条件注入的环境隔离

```typescript
// 使用条件注入实现环境隔离
@ConditionalOn({ env: 'NODE_ENV', value: 'test' })
@Injectable()
export class MockEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    console.log(`Mock email sent to ${to}: ${subject}`);
  }
}

@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class RealEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    // 实际发送邮件
  }
}
```

### 4. 循环依赖的避免

```typescript
// 推荐：使用事件驱动架构避免循环依赖
@Injectable()
export class UserService {
  constructor(private eventBus: EventBus) {}
  
  async createUser(userData: any) {
    const user = await this.saveUser(userData);
    
    // 发布事件而不是直接调用其他服务
    this.eventBus.emit('user.created', { user });
    
    return user;
  }
}

@Injectable()
export class NotificationService {
  constructor(private eventBus: EventBus) {
    // 监听事件
    this.eventBus.on('user.created', this.handleUserCreated.bind(this));
  }
  
  private async handleUserCreated(event: { user: any }) {
    await this.sendWelcomeEmail(event.user);
  }
}
```

## 性能考虑

### 1. 作用域性能影响

- **Singleton**: 最高性能，只创建一次
- **Request**: 中等性能，每个请求创建一次
- **Transient**: 最低性能，每次注入都创建

### 2. 懒加载的权衡

懒加载可以减少启动时间，但会在首次访问时产生延迟。适合用于：
- 不是每个请求都需要的服务
- 初始化成本高的服务
- 可选功能的服务

### 3. 条件注入的开销

条件检查在应用启动时进行，运行时没有额外开销。

## 调试和监控

增强的 DI 容器提供了丰富的调试信息：

```typescript
// 启用详细日志
const app = new RapidoApplication(AppModule, {
  logger: {
    level: 'debug'
  }
});

// 容器会输出以下信息：
// - 服务注册信息
// - 循环依赖警告
// - 条件注入结果
// - 懒加载触发时机
// - 作用域实例创建
```

通过这些功能，增强的 DI 容器为构建大型、复杂的企业级应用提供了强大的基础设施支持。