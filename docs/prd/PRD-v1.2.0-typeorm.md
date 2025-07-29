这份文档将是 `@rapidojs/typeorm` 模块的**最终、完整版功能需求规格说明 (Product Requirements Document)**。

它的目标是提供所有必要的细节，让开发者可以清晰、无歧义地按照本文档进行开发，并确保最终成果符合 `Rapido.js` 框架的设计哲学和质量标准。

-----

### **功能需求文档: `@rapidojs/typeorm` 模块**

  * **关联版本**: `v1.2.0`
  * **主题**: `"数据引擎" (The Data Engine)`
  * **文档版本**: `prd-1.2.0-typeorm-v3.0 (Final)`
  * **状态**: **准备开发 (Ready for Development)**
  * **更新日期**: 2025年7月27日

#### **1.0 概述 (Overview)**

`@rapidojs/typeorm` 是 `Rapido.js` 框架的官方数据库集成模块，专为 TypeORM 设计。它旨在将 TypeORM 的强大功能与 `Rapido.js` 的依赖注入和模块化系统进行深度、无缝的集成。本模块将负责管理数据库连接的生命周期、动态发现并注册实体（Entities），并通过声明式 API（装饰器）极大地简化实体仓库（Repository）的注入和数据库事务的管理。

#### **2.0 设计哲学与目标 (Design Philosophy & Goals)**

  * **2.1. 目标**

      * **简化配置**: 提供标准化的 `forRoot` 和 `forRootAsync` API 来配置数据库连接。
      * **零配置实体发现**: 框架应自动发现并加载所有在模块中声明的实体，开发者无需手动维护实体列表。
      * **声明式注入**: 提供 `@InjectRepository()` 装饰器，实现 Repository 的类型安全注入。
      * **声明式事务**: 提供 `@Transactional()` 装饰器，将复杂的事务管理简化为单个装饰器。
      * **生命周期集成**: 确保数据库连接在应用启动时建立，在应用关闭时被优雅地释放。

  * **2.2. 设计哲学**

      * **开发者体验优先**: API 设计应直观、易用，并与 `Rapido.js` 的其他部分保持一致。
      * **约定优于配置**: 自动发现实体，减少开发者的心智负担。
      * **类型安全**: 利用 TypeScript 的能力，确保在注入和使用过程中的类型安全。

-----

#### **3.0 开发者工作流 (Developer Workflow)**

本模块交付后，开发者的标准工作流程如下：

1.  **定义实体 (`user.entity.ts`)**: 使用 TypeORM 装饰器定义实体类。

    ```typescript
    @Entity()
    export class User { /* ... */ }
    ```

2.  **配置数据库连接 (`app.module.ts`)**: 在根模块中，使用 `TypeOrmModule.forRootAsync` 配置连接，**无需**指定 `entities`。

    ```typescript
    @Module({
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            url: config.get('DATABASE_URL'),
            synchronize: true, // 自动同步数据表
            // 无需 'entities' 字段
          }),
        }),
        UserModule,
      ],
    })
    export class AppModule {}
    ```

3.  **在特性模块中注册实体 (`user.module.ts`)**: 使用 `TypeOrmModule.forFeature` 声明本模块依赖的实体。

    ```typescript
    @Module({
      imports: [TypeOrmModule.forFeature([User])],
      providers: [UsersService],
      controllers: [UsersController],
    })
    export class UserModule {}
    ```

4.  **在服务中注入并使用仓库 (`users.service.ts`)**: 使用 `@InjectRepository` 注入仓库，并使用 `@Transactional` 管理事务。

    ```typescript
    @Injectable()
    export class UsersService {
      constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
      ) {}

      @Transactional()
      async createUserAndRelatedData(userData: CreateUserDto) {
        const newUser = this.userRepository.create(userData);
        await this.userRepository.save(newUser);
        // ... 在同一事务中执行其他数据库操作 ...
        return newUser;
      }
    }
    ```

-----

#### **4.0 模块 API 规格 (Module API Specification)**

##### **4.1. `TypeOrmModule`**

  * **`forRoot(options: DataSourceOptions): DynamicModule`**

      * **描述**: 同步配置数据库连接。
      * **参数**: `options` - TypeORM 的 `DataSourceOptions` 对象。`entities` 属性将被忽略。
      * **返回**: 一个包含全局 Provider 的 `DynamicModule`。

  * **`forRootAsync(options: TypeOrmModuleAsyncOptions): DynamicModule`**

      * **描述**: 异步配置数据库连接，通常用于从 `ConfigService` 获取配置。
      * **参数**: `options` - 包含 `imports`, `inject`, `useFactory` 的异步配置对象。`useFactory` 返回的 `DataSourceOptions` 中的 `entities` 属性将被忽略。
      * **返回**: 一个包含全局 Provider 的 `DynamicModule`。

  * **`forFeature(entities: Function[]): DynamicModule`**

      * **描述**: 在特性模块中注册实体，使其 Repository 变为可注入的。这也是框架进行实体发现的唯一来源。
      * **参数**: `entities` - 一个包含实体类的数组，例如 `[User, Post]`。
      * **返回**: 一个包含局部 Repository Provider 的 `DynamicModule`。

##### **4.2. `@InjectRepository(entity: Function)`**

  * **类型**: 参数装饰器 (Parameter Decorator)。
  * **描述**: 用于在 `constructor` 中注入一个由 `forFeature` 注册的实体所对应的 TypeORM Repository。

##### **4.3. `@Transactional()`**

  * **类型**: 方法装饰器 (Method Decorator)。
  * **描述**: 为被装饰的异步方法提供声明式事务管理。
      * 方法开始执行时，自动开启一个新事务。
      * 方法成功返回时，自动提交事务。
      * 方法抛出任何异常时，自动回滚事务，并重新抛出原始异常。
      * 在被装饰方法内部，所有通过 `@InjectRepository` 注入的仓库操作都将运行在这个事务中。

-----

#### **5.0 内部架构与实现细节 (Internal Architecture & Implementation)**

##### **5.1. 核心流程：动态实体发现与 DataSource 实例化**

1.  **框架引导**: `RapidoFactory.create()` 启动时，会构建应用的模块依赖图。
2.  **元数据注册**: 当解析到 `TypeOrmModule.forFeature([User, Post])` 时，该方法除了创建 Repository Provider，还需通过 `Reflect.defineMetadata` 将 `[User, Post]` 实体列表附加到一个特殊的元数据 Key 上，目标是该特性模块（如 `UserModule`）。
3.  **元数据扫描**: 在所有模块都被解析后，但在任何 Provider 被实例化之前，框架核心或一个专用的 `TypeOrmScanner` 服务会遍历整个模块树。
4.  **实体收集**: 扫描器会查找所有模块上的实体元数据，将它们收集、扁平化并去重，形成一个最终的全应用实体列表。
5.  **`DataSource` 实例化**: `TypeOrmModule.forRootAsync` 中定义的 `DataSource` Provider 工厂函数，会依赖于这个最终的实体列表。它将用户提供的连接配置与收集到的实体列表合并，最终 `new DataSource(...)`。
6.  **生命周期绑定**: `DataSource` 实例被创建后，其 `initialize()` 和 `destroy()` 方法会通过生命周期钩子（`OnApplicationBootstrap`, `BeforeApplicationShutdown`）被自动调用。

##### **5.2. Repository Provider 的动态生成**

  * `forFeature` 必须为每个实体（如 `User`）生成一个唯一的、可预测的注入令牌（Injection Token）。一个辅助函数 `getRepositoryToken(User)` 将是必要的。
  * `@InjectRepository(User)` 装饰器内部也调用 `getRepositoryToken(User)` 来获取正确的令牌，以确保依赖注入的准确性。

##### **5.3. 声明式事务的实现原理**

  * 事务的上下文隔离必须通过 Node.js 的 `AsyncLocalStorage` 来实现。
  * `@Transactional()` 装饰器实际上是一个拦截器或方法包装器。
  * **流程**:
    1.  从 DI 容器获取 `DataSource`。
    2.  创建 `queryRunner = dataSource.createQueryRunner()`。
    3.  启动 `AsyncLocalStorage` 上下文：`storage.run(new Map(), () => ...)`。
    4.  在 `Map` 中存储 `queryRunner`。
    5.  `await queryRunner.startTransaction()`。
    6.  在 `try...catch...finally` 块中调用原始方法。
    7.  成功则 `commitTransaction()`，失败则 `rollbackTransaction()`，最后必须 `release()`。
  * **Repository 绑定**: `InjectRepository` 注入的 Repository 必须是“事务感知”的。这意味着，在注入时，需要检查 `AsyncLocalStorage` 中是否存在一个活动的 `queryRunner`。如果存在，则返回 `queryRunner.manager`（事务性的 EntityManager）；如果不存在，则返回 `dataSource.manager`（非事务性的）。

-----

#### **6.0 错误处理机制 (Error Handling)**

  * **配置错误**: 如果 `forRootAsync` 中的 `useFactory` 抛出错误或返回无效配置，应用应启动失败并打印详细错误。
  * **连接失败**: 如果在 `OnApplicationBootstrap` 阶段 `dataSource.initialize()` 失败，应用必须启动失败，并记录数据库连接错误。
  * **注入错误**: 如果尝试 `@InjectRepository(UnregisteredEntity)`，DI 容器应在启动时抛出清晰的错误，指明该实体未在任何模块的 `forFeature` 中注册。

#### **7.0 验收标准与测试要求 (Acceptance Criteria & Testing)**

  * [ ] 开发者可以不使用 `entities` 选项成功配置 `TypeOrmModule`。
  * [ ] 在一个模块中通过 `forFeature` 注册的实体，可以在该模块的服务中通过 `@InjectRepository` 成功注入。
  * [ ] 应用启动时，数据库中会自动创建所有通过 `forFeature` 注册的实体对应的表（当 `synchronize: true`）。
  * [ ] 一个被 `@Transactional` 装饰的方法，在执行成功时，其内部所有数据库更改都被提交。
  * [ ] 一个被 `@Transactional` 装饰的方法，在执行过程中抛出异常时，其内部所有数据库更改都被回滚。
  * [ ] 在并发请求中，`@Transactional` 装饰器必须能正确地隔离每个请求的事务上下文。
  * [ ] 模块的单元和集成测试覆盖率必须达到 **95%** 以上。

#### **8.0 V1 版本范围外 (Out of Scope for V1)**

  * **多数据库连接**: V1 版本将只支持单个默认数据库连接。
  * **数据迁移**: 不包含与 `typeorm migration:run` 等 CLI 命令的深度集成。
  * **其他 ORM**: 不支持 Prisma, Sequelize 等。

*当前北京时间：2025年7月27日，星期日，下午5:05:07。*