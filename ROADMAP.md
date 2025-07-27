# Rapido.JS 开发路线图

## v1.1.0 "武库" (The Arsenal)

* **文档版本**: `v2.0` (采用标准规划模板)
* **更新日期**: 2025年1月

### **第一部分: 项目核心目标与价值**

`Rapido.js` 致力于成为 Fastify 生态中，为开发者提供极致轻量、拥有顶级开发体验的声明式 API 框架。我们始终坚持以下核心哲学：

* **Fastify 原生, 拥抱而非抽象**: 充分利用并易于访问 Fastify 的原生功能。
* **API 优先, 专注核心**: 框架核心只包含构建高性能 RESTful API 所需的一切。
* **依赖注入, 结构清晰**: 以 `tsyringe` 为核心，构建可测试、可维护的应用。
* **声明式编程, 体验至上**: 通过装饰器简化代码，让业务逻辑成为主角。

---

### **第二部分: 当前状态与已完成的核心能力 (截至 v1.1.0)**

v1.1.0 版本已成功发布，为框架奠定了坚实的基础，使其成为一个功能完整、可用于生产的框架。

#### **已完成的核心能力:**

* **核心引擎 (`@rapidojs/core`)**: 实现了基于装饰器的路由、以 `tsyringe` 为核心的依赖注入、模块化系统 (`@Module`) 以及 `RapidoFactory` 核心启动器。
* **请求管道 (`Pipeline`)**: 提供了完整的请求参数处理和数据验证流程，包括参数装饰器 (`@Body`, `@Query` 等)和强大的管道机制 (`PipeTransform`, `@UsePipes`, 参数级管道)。
* **韧性与健壮性 (`Resilience`)**: 内置了全局异常过滤器 (`@Catch`) 和基础的 `HttpException` 类，并提供了企业级的配置管理模块 (`@rapidojs/config`)，支持多源加载和启动时校验。
* **开发者体验 (`Developer Experience`)**: 推出了 `@rapidojs/cli` 命令行工具，支持通过 `rapido new` 命令一键生成项目骨架，并提供 `rapido add` 命令快速添加模块，以及 `rapido g` 命令生成控制器、服务、守卫、拦截器等代码文件。

#### **当前质量指标:**

* **API 状态**: v1.1.0 的公开 API 已稳定，保证向后兼容。
* **测试覆盖率**: 整体代码测试覆盖率已达到 **90%** 以上。

---

### **第三部分: v1.1.0 "武库" (The Arsenal) 版本规划**

#### **版本目标**

将 `Rapido.js` 从一个强大的核心框架转变为一个**“开箱即用”的开发平台**。本版本以“武库”(The Arsenal)为主题，为开发者提供一套官方的、高质量的、即插即用的模块。

#### **核心交付成果**

1.  `@rapidojs/auth`: 官方认证与授权模块。
2.  核心与通用模块增强: 拦截器、生命周期钩子与健康检查。
3.  `@rapidojs/schedule`: 官方任务调度模块。
4.  `@rapidojs/cli` 功能升级: 提供更强大的项目管理能力。

#### **详细功能清单 (Checklist)**

##### **1. `@rapidojs/auth` - 认证与授权模块**

* **功能描述**: 解决 API 安全的基石。提供一个声明式的、可扩展的机制来保护 API 端点，内置对 JWT 的支持。
* **最终成果**:
    * 一个可发布的 NPM 包：`@rapidojs/auth`。
    * 核心装饰器：`@UseGuards()`。
    * 核心接口：`CanActivate`。
    * 一个可扩展的认证策略模式 (AuthStrategy 接口)。
    * 开箱即用的守卫：`JwtAuthGuard`（基于 `JwtStrategy`）。
    * 辅助装饰器：`@Public()`（标记公开路由），`@CurrentUser()`（参数装饰器，注入用户信息）。
* **关键实现路径**:
    * [x] **定义核心接口**: 在 `@rapidojs/common` 中定义 `ExecutionContext`、`CanActivate` 等核心接口。
    * [x] **增强核心注册器**: 修改 `@rapidojs/core` 的路由注册器，使其支持并执行守卫逻辑。
    * [x] **设计并实现 Strategy 模式**: 定义通用的 AuthStrategy 接口，并重构 JwtAuthGuard 以使用 JwtStrategy，为未来的 OAuth2 等策略铺平道路。
    * [x] **开发 `@rapidojs/auth` 包**: 集成并封装 `@fastify/jwt`，并实现 `JwtAuthGuard` 和相关装饰器。
    * [x] **编写测试**: 针对守卫的执行顺序、`@Public` 的豁免能力、`@CurrentUser` 的注入能力编写完整的单元和集成测试。

##### **2. 核心与通用模块增强**

* **功能描述**: 提供强大的 AOP（面向切面编程）能力和生产环境所需的可靠性特性。
* **最终成果**:
    * AOP 装饰器：`@UseInterceptors()`。
    * AOP 核心接口：`Interceptor`, `CallHandler`。
    * 内置拦截器：`TransformInterceptor`（统一响应格式），`LoggingInterceptor`（开发日志）。
    * 辅助装饰器：`@NoTransform()`，用于在全局拦截器下跳过特定路由的响应转换。
    * 生命周期接口：`OnApplicationBootstrap`, `BeforeApplicationShutdown` 等。
    * 一个内置的、可配置的 `/health` 健康检查端点。
* **关键实现路径**:
    * [x] **实现拦截器逻辑**: 修改核心注册器的包裹处理函数，将其改造为支持 `next()` 模式的调用链。
    * [x] **实现内置拦截器**: 创建 `TransformInterceptor` 和 `LoggingInterceptor` 作为通用工具。
    * [x] **实现 @NoTransform() 装饰器**: 为 `TransformInterceptor` 增加元数据检查逻辑，使其可以被 `@NoTransform()` 豁免。
    * [x] **实现生命周期钩子**: 在 `RapidoFactory` 的启动和关闭流程中，增加对生命周期钩子的扫描和执行。
    * [x] **实现健康检查**: 在核心中增加可配置的健康检查模块。

##### **3. `@rapidojs/schedule` - 任务调度模块**

* **功能描述**: 为应用提供简单的、声明式的后台任务和定时任务能力。
* **最终成果**:
    * 一个可发布的 NPM 包：`@rapidojs/schedule`。
    * 任务调度装饰器：`@Cron()`, `@Interval()`, `@Timeout()`。
* **关键实现路径**:
    * [x] **技术选型**: 选择并集成一个轻量的底层调度库（如 `node-cron`）。
    * [x] **创建 `SchedulerService`**: 创建一个由 DI 容器管理的单例服务。
    * [x] **实现元数据扫描**: 在应用启动时，`SchedulerService` 扫描所有 Provider，查找并注册带有调度装饰器的方法。
    * [x] **注册与注销任务**: 通过生命周期钩子，确保任务在应用启动时被注册，并在应用关闭时被安全地停止。

##### **4. `@rapidojs/cli` 功能升级**

* **功能描述**: 提升 CLI 的智能化和便利性，使其成为管理 `Rapido.js` 生态的核心工具。
* **最终成果**:
    * 新增 `rapido add <package-name>` 命令。
    * `rapido g` 命令支持新的构建块（`guard`, `interceptor`）。
* **关键实现路径**:
    * [x] **实现 `add` 命令**: 设计 `add` 命令的逻辑，使其能修改 `package.json`、运行安装，并有能力执行简单的代码注入（例如，在 `app.module.ts` 中 `import` 新模块）。
    * [x] **更新生成器**: 为 `rapido g` 命令添加 `guard` 和 `interceptor` 的代码模板。

## v1.2.0 "数据引擎" (The Data Engine)

### **第一部分: 项目核心目标与价值**

`Rapido.js` 致力于成为 Fastify 生态中，为开发者提供极致轻量、拥有顶级开发体验的声明式 API 框架。我们始终坚持以下核心哲学：

* **Fastify 原生, 拥抱而非抽象**: 充分利用并易于访问 Fastify 的原生功能。
* **API 优先, 专注核心**: 框架核心只包含构建高性能 RESTful API 所需的一切。
* **依赖注入, 结构清晰**: 以 `tsyringe` 为核心，构建可测试、可维护的应用。
* **声明式编程, 体验至上**: 通过装饰器简化代码，让业务逻辑成为主角。

---

### **第二部分: 当前状态与已完成的核心能力 (截至 v1.1.0)**

v1.1.0 版本已成功交付“武库”(The Arsenal)，为框架配备了一套官方的、开箱即用的模块，极大地提升了开发效率和安全性。

#### **已完成的核心能力:**

* **核心引擎 (`@rapidojs/core`)**: 实现了基于装饰器的路由、依赖注入、模块化系统。
* **请求管道 (`Pipeline`)**: 提供了强大的请求参数处理和数据验证流程。
* **韧性与健壮性 (`Resilience`)**: 内置了全局异常过滤器和企业级的配置管理模块。
* **开发者体验 (`Developer Experience`)**: 推出了 `@rapidojs/cli` 命令行工具。
* **安全与 AOP (`@rapidojs/auth`, `@rapidojs/common` 增强)**: 提供了基于守卫的认证机制、基于拦截器的 AOP 能力、生命周期钩子和健康检查。
* **后台任务 (`@rapidojs/schedule`)**: 提供了声明式的定时任务能力，支持 Cron 表达式、间隔执行和延时执行。

#### **当前质量指标:**

* **API 状态**: v1.1.0 的公开 API 已稳定。
* **测试覆盖率**: 整体代码测试覆盖率维持在 **90%** 以上。

---

### **第三部分: v1.2.0 "数据引擎" (The Data Engine) 版本规划**

#### **版本目标**

将 `Rapido.js` 的能力从应用层扩展到数据层，为开发者提供官方的、与框架深度集成的数据持久化和缓存解决方案。同时，**通过构建完整的官方示例项目，展示框架的全功能应用和最佳实践**，进一步巩固其“开箱即用”的平台地位。

#### **核心交付成果**

1.  **`@rapidojs/typeorm`**: 官方 TypeORM 集成模块。
2.  **`@rapidojs/redis`**: 官方 Redis 集成模块。
3.  **官方示例项目 (Official Example Projects)**: 高质量、真实世界的 `Rapido.js` 应用范例。
4.  **`@rapidojs/cli` 功能升级**: 支持新的数据层模块和代码生成。

#### **详细功能清单 (Checklist)**

##### **1. `@rapidojs/typeorm` - TypeORM 集成模块**

* **功能描述**: 提供与 `Rapido.js` 依赖注入和生命周期深度集成的 TypeORM 模块，简化数据库操作。
* **最终成果**:
    * 一个可发布的 NPM 包：`@rapidojs/typeorm`。
    * 模块配置方法：`TypeOrmModule.forRoot()` 和 `TypeOrmModule.forRootAsync()`。
    * 特性模块方法：`TypeOrmModule.forFeature([Entity])`。
    * 辅助注入装饰器：`@InjectRepository(Entity)`。
    * 事务处理装饰器：`@Transactional()`，简化数据库事务操作。
* **关键实现路径**:
    * [ ] **实现 `TypeOrmModule`**: 实现 `forRoot` 和 `forFeature` 等静态方法，核心是动态创建和注册 `DataSource` 和 `Repository` 的 Provider。
    * [ ] **实现 `@InjectRepository()`**: 创建参数装饰器，以生成特定的注入令牌。
    * [ ] **实现事务装饰器**: 研究并实现基于 `AsyncLocalStorage` 或请求作用域 Provider 的 `@Transactional()` 装饰器，自动管理事务的开启、提交与回滚。
    * [ ] **集成生命周期钩子**: 利用 `OnApplicationBootstrap` 和 `BeforeApplicationShutdown` 来管理数据库连接的生命周期。
    * [ ] **编写测试**: 覆盖所有模块配置方式和注入能力。

##### **2. `@rapidojs/redis` - Redis 集成模块**

* **功能描述**: 提供一个简单、高效的方式来在 `Rapido.js` 应用中使用 Redis。
* **最终成果**:
    * 一个可发布的 NPM 包：`@rapidojs/redis`。
    * 模块配置方法：`RedisModule.forRoot()` 和 `RedisModule.forRootAsync()`。
    * 辅助注入装饰器：`@InjectRedis()`。
    * 支持多客户端注入与管理。
* **关键实现路径**:
    * [ ] **技术选型**: 选择并集成 `ioredis` 库。
    * [ ] **支持多客户端**: 重构 `RedisModule`，允许通过 `name` 属性来注册和注入多个不同的 Redis 客户端实例（例如 `@InjectRedis('cache')`, `@InjectRedis('session')`）。
    * [ ] **实现 `RedisModule`**: 实现模块的静态配置方法，创建并注册 Redis 客户端 Provider。
    * [ ] **集成生命周期钩子**: 确保 Redis 连接在应用关闭时被优雅地断开。
    * [ ] **编写测试**: 确保 Redis 客户端能够被成功配置和注入。

##### **3. 官方示例项目 (Official Example Projects)**

* **功能描述**: 构建并开源 1-2 个功能完整的示例应用，作为最佳实践的“活文档”，帮助开发者快速上手并理解如何组合使用 `Rapido.js` 的各项功能。
* **最终成果**:
    * **`example-blog-api`**: 一个功能丰富的博客 API，将使用 TypeORM, Postgres, JWT 认证等。
    * **`example-url-shortener`**: 一个简洁的短链接服务，将使用 Redis 作为主数据存储。
* **关键实现路径**:
    * [ ] **设计 API 规格**: 为博客和短链接服务定义详细的 API 端点、请求和响应结构。
    * [ ] **开发 `example-blog-api`**:
        * [ ] 使用 `@rapidojs/cli` 创建项目。
        * [ ] 集成 `@rapidojs/typeorm`，并定义 `User`, `Post`, `Comment` 等实体。
        * [ ] 集成 `@rapidojs/auth`，实现用户注册、登录和接口保护。
        * [ ] 实现基于用户所有权的授权守卫（例如，用户只能编辑自己的文章）。
        * [ ] 实现分页、排序、过滤等复杂查询逻辑，以展示 TypeORM 的高级用法。
        * [ ] 编写详细的 `README.md`，作为项目的上手教程。
    * [ ] **开发 `example-url-shortener`**:
        * [ ] 集成 `@rapidojs/redis` 作为核心数据存储。
        * [ ] 实现短链接的生成和重定向逻辑。
        * [ ] (可选) 实现一个基于 Redis 的速率限制拦截器。
        * [ ] 编写详细的 `README.md`。
    * [ ] **添加到 Monorepo**: 将两个示例项目添加到主代码库的 `/apps` 目录下，并配置好 CI 流程。

##### **4. `@rapidojs/cli` 功能升级**

* **功能描述**: 让 CLI 能够感知并支持新的数据层模块，进一步提升开发效率。
* **最终成果**:
    * `rapido add` 命令支持新模块。
    * `rapido new` 命令提供选项，允许在创建新项目时直接集成数据模块。
    * `rapido g` 命令支持生成 TypeORM 实体。
* **关键实现路径**:
    * [ ] **更新 `add` 命令**: 增强 `rapido add` 命令，使其在添加 `@rapidojs/typeorm` 时能自动在 `app.module.ts` 中导入 `TypeOrmModule` 的示例代码。
    * [ ] **更新项目模板**: 修改 `rapido new` 的模板，包含被注释掉的数据模块导入示例。
    * [ ] **实现 `entity` 生成器**: 新增 `rapido g entity <name>` 命令，用于快速生成 TypeORM 的实体类文件模板。