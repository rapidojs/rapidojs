---
sidebar_position: 6
---

# 模块系统

模块是 Rapido.js 应用程序的基本构建块。模块是一个用 `@Module()` 装饰器装饰的类，它提供了组织代码的方式。

## 什么是模块？

模块封装了一组相关的功能，包括：
- **控制器** (Controllers) - 处理 HTTP 请求
- **提供者** (Providers) - 服务、仓库等可注入的类
- **导入** (Imports) - 其他模块的引用
- **导出** (Exports) - 向其他模块提供的服务

## 基本模块

### 创建模块

```typescript
import { Module } from '@rapidojs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### 模块属性

```typescript
@Module({
  controllers: [UsersController],     // 控制器列表
  providers: [UsersService],          // 提供者列表
  imports: [DatabaseModule],          // 导入的模块
  exports: [UsersService],            // 导出的服务
})
export class UsersModule {}
```

## 功能模块

功能模块组织特定功能领域的代码：

```typescript
// users/users.module.ts
import { Module } from '@rapidojs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // 导出服务供其他模块使用
})
export class UsersModule {}
```

## 共享模块

当你需要在多个模块间共享服务时：

```typescript
// shared/database.module.ts
import { Module } from '@rapidojs/core';
import { DatabaseService } from './database.service';

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // 导出供其他模块使用
})
export class DatabaseModule {}
```

在其他模块中使用：

```typescript
// users/users.module.ts
import { Module } from '@rapidojs/core';
import { DatabaseModule } from '../shared/database.module';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule], // 导入共享模块
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## 全局模块

使用 `@Global()` 装饰器创建全局模块：

```typescript
import { Module, Global } from '@rapidojs/core';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}
```

全局模块的服务在整个应用中都可用，无需在每个模块中导入。

## 动态模块

创建可配置的模块：

```typescript
import { Module, DynamicModule } from '@rapidojs/core';
import { DatabaseService } from './database.service';

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
```

使用动态模块：

```typescript
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
    }),
  ],
})
export class AppModule {}
```

## 内置模块

### Redis 缓存模块

Rapido.js 提供了内置的 Redis 缓存模块，支持单连接和多连接配置：

```typescript
import { Module } from '@rapidojs/core';
import { RedisModule } from '@rapidojs/redis';

// 单连接配置
@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'your-password',
      db: 0,
    }),
  ],
})
export class AppModule {}

// 多连接配置
@Module({
  imports: [
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
})
export class AppModule {}

// 异步配置
@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: async () => ({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      }),
    }),
  ],
})
export class AppModule {}
```

在服务中使用 Redis：

```typescript
import { Injectable } from '@rapidojs/common';
import { RedisCacheService, InjectRedis } from '@rapidojs/redis';
import type { Redis } from 'ioredis';

@Injectable()
export class UserService {
  constructor(
    private readonly cacheService: RedisCacheService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('session') private readonly sessionRedis: Redis,
  ) {}

  async getUser(id: string) {
    // 使用缓存服务
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;

    // 使用原生 Redis 客户端
    const user = await this.fetchFromDatabase(id);
    await this.redis.setex(`user:${id}`, 3600, JSON.stringify(user));
    
    return user;
  }
}
```

详细使用方法请参考 [Redis 模块文档](./redis.md)。

## 模块重新导出

重新导出其他模块的功能：

```typescript
@Module({
  imports: [CommonModule],
  exports: [CommonModule], // 重新导出
})
export class SharedModule {}
```

## 应用根模块

每个应用都有一个根模块：

```typescript
// app.module.ts
import { Module } from '@rapidojs/core';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { DatabaseModule } from './shared/database.module';

@Module({
  imports: [
    DatabaseModule.forRoot({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
    }),
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
```

## 模块最佳实践

### 1. 单一职责

每个模块应该有明确的职责：

```typescript
// ✅ 好的做法 - 专注于用户功能
@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}

// ❌ 避免 - 混合多种职责
@Module({
  controllers: [UsersController, PostsController, CommentsController],
  providers: [UsersService, PostsService, CommentsService],
})
export class MixedModule {}
```

### 2. 合理的导入导出

只导出需要被其他模块使用的服务：

```typescript
@Module({
  providers: [UsersService, UsersRepository], // 内部服务
  exports: [UsersService], // 只导出公共接口
})
export class UsersModule {}
```

### 3. 模块组织

按功能组织模块结构：

```
src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── posts/
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   └── posts.service.ts
├── shared/
│   ├── database.module.ts
│   └── config.module.ts
└── app.module.ts
```

### 4. 环境配置

使用动态模块处理环境配置：

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
  ],
})
export class AppModule {}
```

## 循环依赖处理

在复杂应用中，服务之间可能存在循环依赖关系。Rapido.js 提供了 `forwardRef` 机制来解决这个问题。

### 什么是循环依赖？

循环依赖发生在两个或多个类相互依赖时：
- ServiceA 依赖 ServiceB
- ServiceB 又依赖 ServiceA

### 识别循环依赖问题

没有处理的循环依赖会导致以下错误：

```
Error: Cannot resolve dependency [ClassName].
```

或者在类定义级别出现：

```
Error: Cannot access 'ServiceName' before initialization
```

### 使用 forwardRef 解决循环依赖

```typescript
import { Injectable, Inject, forwardRef } from '@rapidojs/core';

@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB
  ) {}
  
  getName() {
    return 'ServiceA';
  }
}

@Injectable()
export class ServiceB {
  constructor(
    @Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA
  ) {}
  
  getName() {
    return 'ServiceB';
  }
}
```

### 模块级别的循环依赖

模块之间也可能存在循环依赖：

```typescript
// module-a.module.ts
@Module({
  providers: [ServiceA],
  exports: [ServiceA],
  imports: [forwardRef(() => ModuleB)]
})
export class ModuleA {}

// module-b.module.ts
@Module({
  providers: [ServiceB],
  exports: [ServiceB],
  imports: [forwardRef(() => ModuleA)]
})
export class ModuleB {}
```

### 循环依赖最佳实践

1. **尽量避免循环依赖**：重构代码，创建共享服务或中间层

2. **明确使用 forwardRef**：当必须使用循环依赖时，在双方都使用 `forwardRef`

3. **注意初始化顺序**：使用 `forwardRef` 时要小心访问尚未完全初始化的服务

4. **使用接口分离**：考虑通过接口分离减少直接依赖

5. **编写测试**：为循环依赖场景编写专门的测试

### 异步初始化与循环依赖

在处理循环依赖时，异步初始化可能会更加复杂：

```typescript
@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB
  ) {}
  
  async initialize() {
    // 等待其他服务初始化完成后再访问
    await someAsyncOperation();
    return this.serviceB.getName();
  }
}
```

## 模块生命周期

模块支持生命周期钩子：

```typescript
import { Module, OnModuleInit, OnModuleDestroy } from '@rapidojs/core';

@Module({
  // ...
})
export class UsersModule implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    console.log('UsersModule 已初始化');
  }

  onModuleDestroy() {
    console.log('UsersModule 正在销毁');
  }
}
```

## 测试模块

为模块编写测试：

```typescript
import { Test, TestingModule } from '@rapidojs/testing';
import { UsersModule } from './users.module';
import { UsersService } from './users.service';

describe('UsersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide UsersService', () => {
    const service = module.get<UsersService>(UsersService);
    expect(service).toBeDefined();
  });
});
```

## 总结

Rapido.js 的模块系统提供了：

- ✅ **清晰的组织结构** - 按功能组织代码
- ✅ **依赖注入** - 自动管理依赖关系
- ✅ **可重用性** - 模块可以在不同应用中重用
- ✅ **测试友好** - 易于进行单元测试和集成测试
- ✅ **配置灵活** - 支持动态配置和环境变量
- ✅ **生命周期管理** - 完整的模块生命周期钩子

这让大型应用的开发和维护变得更加简单和可控！
