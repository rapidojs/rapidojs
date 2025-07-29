这份文档将详细阐述模块的设计哲学、API 规格、内部架构和验收标准，确保开发者可以据此进行清晰、高效的开发。

-----

### **功能需求文档: `@rapidojs/redis` 模块**

  * **关联版本**: `v1.2.0`
  * **主题**: `"数据引擎" (The Data Engine)`
  * **文档版本**: `prd-1.2.0-redis-v1.0`
  * **状态**: **准备开发 (Ready for Development)**
  * **更新日期**: 2025年7月27日

#### **1.0 概述 (Overview)**

`@rapidojs/redis` 是 `Rapido.js` 框架的官方 Redis 集成模块。它旨在为开发者提供一个简单、高性能且与框架深度集成的方式来使用 Redis。本模块将负责管理一个或多个 Redis 客户端连接的生命周期，并通过依赖注入让开发者在应用中轻松访问 Redis 实例，以支持缓存、会话存储、速率限制、发布/订阅等多种应用场景。模块底层将采用业界公认的高性能 Redis 客户端库 `ioredis`。

#### **2.0 设计哲学与目标 (Design Philosophy & Goals)**

  * **2.1. 目标**

      * **简化集成**: 提供标准化的 `forRoot` 和 `forRootAsync` API，轻松配置 Redis 连接。
      * **多客户端支持**: 框架必须原生支持在同一个应用中配置和注入多个独立的 Redis 客户端实例。
      * **声明式注入**: 提供 `@InjectRedis()` 装饰器，实现 Redis 客户端的类型安全注入。
      * **生命周期集成**: 确保 Redis 连接在应用启动时建立，在应用关闭时被优雅地释放，防止连接泄漏。
      * **可靠性**: 充分利用底层库 `ioredis` 的自动重连等特性，为开发者提供一个可靠的客户端实例。

  * **2.2. 设计哲学**

      * **性能优先**: 选择 `ioredis` 作为底层驱动，确保高性能。
      * **灵活性**: 支持多客户端，满足从简单缓存到复杂微服务通信的各种需求。
      * **开发者体验**: API 设计应与 `Rapido.js` 的其他模块（如 `@rapidojs/typeorm`）保持高度一致性。

-----

#### **3.0 开发者工作流 (Developer Workflow)**

本模块交付后，开发者的标准工作流程如下：

1.  **在根模块中注册一个或多个 Redis 连接 (`app.module.ts`)**:

    ```typescript
    @Module({
      imports: [
        ConfigModule.forRoot({ /* ... */ }),
        // 注册一个默认的 Redis 客户端
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            url: config.get('REDIS_URL'),
          }),
        }),
        // 注册一个名为 'cache' 的、连接到不同数据库的客户端
        RedisModule.forRootAsync({
          name: 'cache', // <-- 指定客户端名称
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            url: config.get('REDIS_CACHE_URL'),
          }),
        }),
      ],
    })
    export class AppModule {}
    ```

2.  **在服务中注入并使用 Redis 客户端 (`cache.service.ts`)**:

    ```typescript
    import { Injectable } from '@rapidojs/core';
    import { InjectRedis } from '@rapidojs/redis';
    import { Redis } from 'ioredis'; // 从 ioredis 导入类型

    @Injectable()
    export class CacheService {
      constructor(
        // 注入默认的 Redis 客户端
        @InjectRedis()
        private readonly redisClient: Redis,

        // 通过名称注入 'cache' 客户端
        @InjectRedis('cache')
        private readonly cacheClient: Redis,
      ) {}

      async setUserSession(userId: string, data: object) {
        // 使用默认客户端处理会话
        await this.redisClient.set(`session:${userId}`, JSON.stringify(data), 'EX', 3600);
      }

      async getProductFromCache(productId: string): Promise<Product | null> {
        // 使用 'cache' 客户端处理产品缓存
        const cached = await this.cacheClient.get(`product:${productId}`);
        return cached ? JSON.parse(cached) : null;
      }
    }
    ```

-----

#### **4.0 模块 API 规格 (Module API Specification)**

##### **4.1. `RedisModule`**

  * **`forRoot(options: RedisModuleOptions): DynamicModule`**

      * **描述**: 同步配置一个 Redis 客户端。
      * **参数**: `options` - 继承自 `ioredis.RedisOptions`，并增加一个可选的 `name?: string` 属性。如果 `name` 未提供，则注册为默认客户端。

  * **`forRootAsync(options: RedisModuleAsyncOptions): DynamicModule`**

      * **描述**: 异步配置一个 Redis 客户端。
      * **参数**: `options` - 包含 `imports`, `inject`, `useFactory` 的异步配置对象。`useFactory` 返回 `RedisModuleOptions`。同样包含可选的 `name` 属性。

##### **4.2. `@InjectRedis(name?: string)`**

  * **类型**: 参数装饰器 (Parameter Decorator)。
  * **描述**: 用于在 `constructor` 中注入一个 Redis 客户端实例。
      * 如果 `name` 参数被省略，它将注入默认的 Redis 客户端。
      * 如果提供了 `name` 参数（如 `'cache'`），它将注入通过 `forRoot({ name: 'cache', ... })` 配置的同名客户端。

-----

#### **5.0 内部架构与实现细节 (Internal Architecture & Implementation)**

##### **5.1. 核心流程：客户端的创建与管理**

1.  `forRoot` 和 `forRootAsync` 方法并不直接创建 `ioredis` 实例，而是返回一个 `DynamicModule`，其中包含一个用于提供**配置选项**的 Provider。
2.  模块内部应有一个 `RedisConnectionProvider` (或类似的服务)，负责收集所有注册的连接配置。
3.  在 `OnApplicationBootstrap` 生命周期钩子中，`RedisConnectionProvider` 遍历所有配置，创建 `ioredis` 实例，并将这些实例存储在一个内部的 `Map<string, Redis>` 结构中（`'default'` key 用于默认客户端）。
4.  这些创建好的客户端实例，再通过相应的注入令牌提供给 DI 容器。

##### **5.2. 多客户端支持的实现**

  * 必须创建一个辅助函数 `getRedisClientToken(name = 'default'): string` 来生成唯一的注入令牌。
  * `RedisModule.forRoot({ name: 'cache', ... })` 会动态地创建一个 Provider，其 `provide` 属性的值就是 `getRedisClientToken('cache')`。
  * `@InjectRedis('cache')` 装饰器内部也调用 `getRedisClientToken('cache')` 来获取正确的令牌，以确保 `tsyringe` 能够注入正确的客户端实例。

##### **5.3. 生命周期管理**

  * **连接**: 客户端的创建和连接在 `OnApplicationBootstrap` 钩子中执行，以确保所有配置都已加载。
  * **断开**: 模块必须实现 `BeforeApplicationShutdown` 钩子。在该钩子中，遍历所有已创建的客户端实例，并调用其 `quit()` 方法，以实现优雅停机。

-----

#### **6.0 错误处理机制 (Error Handling)**

  * **配置错误**: 如果 `useFactory` 失败或返回无效配置，应用应启动失败并打印详细错误。
  * **连接失败**:
      * 如果在 `OnApplicationBootstrap` 阶段，任何一个 Redis 客户端无法建立初始连接，应用必须启动失败，并记录清晰的错误信息，指明是哪个命名连接失败。
      * **运行时断开**: `ioredis` 内部有强大的自动重连机制。模块应利用其事件监听器（如 `on('error')`, `on('reconnecting')`），将这些事件集成到 `Rapido.js` 的日志系统中，以便开发者能够监控客户端状态。

#### **7.0 验收标准与测试要求 (Acceptance Criteria & Testing)**

  * [ ] 开发者可以成功配置并注入一个**单一的、默认的** Redis 客户端。
  * [ ] 开发者可以成功配置并注入**多个、命名的** Redis 客户端，并且它们之间互不干扰。
  * [ ] 所有注入的客户端实例必须是 `ioredis` 的实例。
  * [ ] 如果任何一个 Redis 客户端在应用启动时无法连接，应用必须启动失败。
  * [ ] 所有 Redis 连接必须在应用关闭时被优雅地断开。
  * [ ] 异步配置 (`forRootAsync`) 能够正确地从 `ConfigService` 注入并使用配置。
  * [ ] 模块的单元和集成测试覆盖率必须达到 **95%** 以上。

#### **8.0 V1 版本范围外 (Out of Scope for V1)**

  * **Redis Cluster**: 虽然 `ioredis` 支持，但本模块 V1 不提供专门针对 Cluster 的简化配置 API。用户仍可通过 `forRoot` 传入原始的 Cluster 配置来使用。
  * **内置缓存拦截器**: 提供一个 `@Cacheable()` 拦截器来自动缓存方法结果。这个功能应作为一个独立的、更高阶的模块（例如 `@rapidojs/cache-manager`）在未来版本中提供。
  * **Pub/Sub 抽象**: 不提供超出 `ioredis` 原生 `publish/subscribe` 方法之外的额外抽象。

*当前时间：2025年7月27日，星期日，下午5:05:07。*