<div align="center">
  <h1>🚀 Rapido.js</h1>
  <p><strong>极致轻量、拥有顶级开发体验的声明式 API 框架</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/@rapidojs/core"><img src="https://img.shields.io/npm/v/@rapidojs/core.svg" alt="npm version"></a>
    <a href="https://github.com/rapidojs/rapidojs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rapidojs/core.svg" alt="license"></a>
    <a href="https://github.com/rapidojs/rapidojs"><img src="https://img.shields.io/github/stars/rapidojs/rapidojs.svg?style=social" alt="GitHub stars"></a>
  </p>
  
  <p>
    <strong>为 Fastify 打造的现代化 TypeScript 框架</strong><br>
    让您以最高效率和最优雅的方式构建高性能、高可维护性的 RESTful API
  </p>
</div>

---

## ✨ 核心特性

- 🚀 **极致性能** - 基于 Fastify 5.x，提供 ~45,000 RPS 的卓越性能
- 🎯 **TypeScript 优先** - 完整的类型安全支持，顶级开发体验
- 🎨 **装饰器驱动** - 声明式编程，让业务逻辑成为代码的唯一主角
- 🔧 **智能管道系统** - 自动 DTO 检测和验证，类似 NestJS 的开发体验
- 📦 **模块化架构** - 基于 `tsyringe` 的依赖注入，构建可测试、可维护的应用
- ⚡ **ESM 原生** - 现代化的 ES 模块支持，拥抱未来标准
- 🛠️ **开发者友好** - 内置 CLI 工具，一键生成项目骨架
- 🔐 **认证与授权** - 内置 JWT 认证，支持守卫和策略模式
- 🛡️ **安全** - 守卫系统用于路由保护和公开路由豁免

## 🚀 快速开始

### 环境要求

- **Node.js** 18.0+ 
- **TypeScript** 5.0+
- **pnpm** (推荐) 或 npm

### 使用 CLI 创建项目（推荐）

```bash
# 使用 CLI 快速创建项目
npx @rapidojs/cli@latest new my-api
cd my-api

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

### 手动安装

```bash
# 安装核心包
pnpm add @rapidojs/core

# 安装验证依赖
pnpm add class-validator class-transformer reflect-metadata

# 安装开发依赖
pnpm add -D typescript @types/node
```

## 📖 基础示例

### 创建你的第一个 API

``typescript
import 'reflect-metadata';
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Module,
  Injectable,
  RapidoApplication 
} from '@rapidojs/core';
import { IsNotEmpty, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ParseIntPipe } from '@rapidojs/core';

// DTO 定义
export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

// 服务层
@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', age: 25 }
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }

  create(userData: CreateUserDto) {
    const newUser = {
      id: this.users.length + 1,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }
}

// 控制器
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page', ParseIntPipe) page: number = 1) {
    return {
      data: this.usersService.findAll(),
      page,
      message: '获取用户列表成功'
    };
  }

  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const user = this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return user;
  }

  @Post()
  create(@Body user: CreateUserDto) {
    // ValidationPipe 自动应用，无需手动配置
    return this.usersService.create(user);
  }
}

// 模块定义
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

@Module({
  imports: [UsersModule],
})
export class AppModule {}

// 应用启动
async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  await app.listen(3000);
  console.log('🚀 应用运行在: http://localhost:3000');
}

bootstrap();
```

### 测试 API

```bash
# 获取用户列表
curl http://localhost:3000/api/users

# 获取特定用户
curl http://localhost:3000/api/users/1

# 创建新用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"李四","email":"lisi@example.com","age":30}'
```

## 🎯 核心概念

### 装饰器系统

``typescript
// 路由装饰器
@Controller('/api')    // 控制器前缀
@Get('/users')         // GET 路由
@Post('/users')        // POST 路由
@Put('/users/:id')     // PUT 路由
@Delete('/users/:id')  // DELETE 路由

// 参数装饰器
@Param('id', ParseIntPipe)     // 路由参数 + 管道
@Query('page')                 // 查询参数
@Body()                        // 请求体
@Headers('authorization')      // 请求头
```

### 智能管道系统

```typescript
// 自动 DTO 验证
@Post('/users')
create(@Body user: CreateUserDto) {
  // ValidationPipe 自动检测 DTO 类型并应用验证
  return user;
}

// 参数级管道
@Get('/users/:id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // 自动将字符串转换为数字
  return { id };
}
```

### 模块化架构

``typescript
@Module({
  controllers: [UsersController],   // 控制器
  providers: [UsersService],        // 服务提供者
  imports: [DatabaseModule],        // 导入其他模块
  exports: [UsersService]           // 导出服务
})
export class UsersModule {}
```

## 🔧 高级功能

### 配置管理

``typescript
import { ConfigModule, ConfigService } from '@rapidojs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
  ],
})
export class AppModule {}

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}
  
  connect() {
    const host = this.configService.get('DATABASE_HOST', 'localhost');
    const port = this.configService.get('DATABASE_PORT', 5432);
    // 连接数据库...
  }
}
```

### 异常处理

``typescript
import { HttpException, BadRequestException, NotFoundException } from '@rapidojs/core';

@Controller('/api')
export class ApiController {
  @Get('/users/:id')
  findUser(@Param('id', ParseIntPipe) id: number) {
    if (id < 1) {
      throw new BadRequestException('用户 ID 必须大于 0');
    }
    
    const user = this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    
    return user;
  }
}
```

### 认证与授权

```typescript
import { AuthModule, JwtAuthGuard } from '@rapidojs/auth';
import { UseGuards, Public, CurrentUser } from '@rapidojs/common';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: 'my-jwt-secret-key',
      sign: { expiresIn: '1d' },
    }),
  ],
})
export class AppModule {}

@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 公开路由 - 无需认证
  @Public()
  @Post('/login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  // 受保护路由 - 需要有效的 JWT
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

### 拦截器系统

```typescript
import { Interceptor, ExecutionContext, CallHandler, UseInterceptors } from '@rapidojs/core';

// 自定义拦截器
@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const start = Date.now();
    console.log(`请求前: ${context.getRequest().method} ${context.getRequest().url}`);
    
    const result = await next.handle();
    
    const duration = Date.now() - start;
    console.log(`请求后: ${duration}ms`);
    
    return result;
  }
}

// 应用拦截器到特定方法
@Controller('/api/users')
export class UsersController {
  @Get()
  @UseInterceptors(LoggingInterceptor)
  findAll() {
    return this.usersService.findAll();
  }
}

// 全局应用拦截器
const app = new RapidoApplication(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

### 生命周期钩子

```typescript
import { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy } from '@rapidojs/core';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private connection: any;

  async onModuleInit() {
    console.log('DatabaseService: 模块初始化');
    // 初始化数据库连接
    this.connection = await this.createConnection();
  }

  async onApplicationBootstrap() {
    console.log('DatabaseService: 应用启动完成');
    // 运行数据库迁移或种子数据
    await this.runMigrations();
  }

  async onModuleDestroy() {
    console.log('DatabaseService: 模块销毁');
    // 清理数据库连接
    await this.connection.close();
  }

  private async createConnection() {
    // 数据库连接逻辑
  }

  private async runMigrations() {
    // 迁移逻辑
  }
}
```

### 健康检查模块

```typescript
import { HealthModule } from '@rapidojs/core';

@Module({
  imports: [HealthModule],
})
export class AppModule {}

// 可用端点：
// GET /health - 基础健康检查
// GET /health/detailed - 详细系统信息
// GET /health/readiness - Kubernetes 就绪探针
// GET /health/liveness - Kubernetes 存活探针
```

### Redis 缓存模块

```typescript
import { RedisModule, RedisService, RedisCacheService, InjectRedis } from '@rapidojs/redis';
import type { Redis } from 'ioredis';

// 单连接配置
@Module({
  imports: [
    RedisModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
        password: 'your-password',
        db: 0,
      },
    }),
  ],
})
export class AppModule {}

// 多连接配置
@Module({
  imports: [
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
      ],
    }),
  ],
})
export class AppModule {}

// 在服务中使用 Redis
@Injectable()
export class UserService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
    private readonly cacheService: RedisCacheService
  ) {}

  async getUser(id: string) {
    // 先尝试从缓存获取
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const user = await this.fetchUserFromDB(id);
    
    // 缓存 1 小时
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    return user;
  }

  async updateUserCache(id: string, user: any) {
    // 更新缓存
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    // 使用原生 Redis 客户端进行复杂操作
    await this.redis.zadd('user:scores', Date.now(), id);
  }

  private async fetchUserFromDB(id: string) {
    // 数据库逻辑
    return { id, name: '张三', email: 'zhangsan@example.com' };
  }
}
```

## 📊 性能表现

| 框架 | 每秒请求数 (RPS) | 延迟 (ms) | 内存使用 (MB) |
|------|------------------|-----------|---------------|
| **RapidoJS** | **~45,000** | **~1.2** | **~15** |
| Express | ~25,000 | ~2.1 | ~25 |
| Koa | ~30,000 | ~1.8 | ~20 |
| NestJS | ~20,000 | ~2.5 | ~30 |

*基准测试环境：Node.js 18, MacBook Pro M1, 简单 JSON 响应*

## 🛠️ CLI 工具

```bash
# 全局安装 CLI
pnpm add -g @rapidojs/cli

# 创建新项目
rapido new my-api

# 向现有项目添加模块
rapido add auth          # 添加认证模块
rapido add config        # 添加配置模块
rapido add schedule      # 添加任务调度模块
rapido add testing       # 添加测试模块

# 生成代码文件
rapido g controller user # 生成用户控制器
rapido g service user    # 生成用户服务
rapido g guard auth      # 生成认证守卫
rapido g interceptor log # 生成日志拦截器

# 查看帮助
rapido --help
```

### CLI 功能特性

**项目生成：**
- ✅ 完整的 TypeScript 配置
- ✅ SWC 快速编译器配置
- ✅ 示例用户模块
- ✅ 验证管道集成
- ✅ 开发脚本和构建配置

**模块管理：**
- ✅ 自动包安装
- ✅ 配置文件生成
- ✅ 示例代码模板
- ✅ 模块集成指导

**代码生成：**
- ✅ 带 CRUD 操作的控制器
- ✅ 带业务逻辑模板的服务
- ✅ 用于认证/授权的守卫
- ✅ 用于横切关注点的拦截器
- ✅ 自动测试文件生成

## 📦 项目结构

```
rapidojs/
├── packages/                    # 核心包
│   ├── core/                   # @rapidojs/core
│   ├── config/                 # @rapidojs/config
│   ├── auth/                   # @rapidojs/auth
│   ├── redis/                  # @rapidojs/redis
│   └── cli/                    # @rapidojs/cli
├── apps/                       # 示例应用
│   ├── example-api/           # API 示例
│   └── docs/                  # 文档站点
├── docs/                      # 项目文档
└── README.md                  # 项目说明
```


## 🚧 开发进度

### ✅ 已完成 (v1.1.0 "武库")

- [x] **基础装饰器系统** - `@Controller`, `@Get`, `@Post` 等
- [x] **参数装饰器** - `@Param`, `@Query`, `@Body`, `@Headers`
- [x] **智能管道系统** - 自动 DTO 检测和验证
- [x] **NestJS 风格管道** - `@Param('id', ParseIntPipe)`
- [x] **模块化架构** - `@Module`, `@Injectable`
- [x] **异常处理** - `HttpException`, `BadRequestException` 等
- [x] **配置管理** - `@rapidojs/config` 包
- [x] **CLI 工具** - 项目生成和管理
- [x] **认证与授权** - `@rapidojs/auth` 包，支持 JWT
- [x] **守卫系统** - `@UseGuards`, `@Public`, `@CurrentUser` 装饰器
- [x] **拦截器系统** - `@UseInterceptors`，方法/类/全局拦截器
- [x] **生命周期钩子** - `OnModuleInit`, `OnApplicationBootstrap` 等
- [x] **健康检查模块** - 内置健康监控端点
- [x] **任务调度** - `@rapidojs/schedule` 包，支持声明式任务调度
- [x] **测试覆盖** - 全面的测试套件，477 个测试通过

### 🔄 开发中 (v1.1.0 "武库")

- [x] CLI 功能增强 (`add`, `g <schematic>`)
- [ ] 完整文档站点

### 🔄 开发中 (v1.2.0 "数据引擎")

- [x] 缓存模块 `@rapidojs/redis`
- [x] 数据库集成 `@rapidojs/typeorm`
- [ ] 官方示例项目

### 🎯 未来计划 (v1.3.0)

- [ ] WebSocket 支持
- [ ] GraphQL 集成
- [ ] 微服务支持
- [ ] 消息队列集成
- [ ] 分布式追踪

## 📚 文档

- [📖 完整文档](./docs/README.md)
- [🚀 快速开始](./docs/getting-started.md)
- [🎨 装饰器指南](./docs/decorators.md)
- [🔧 管道系统](./docs/pipes.md)
- [📦 模块系统](./docs/modules.md)
- [⚙️ 配置管理](./docs/configuration.md)
- [🚨 异常处理](./docs/exception-filters.md)
- [🧪 测试指南](./docs/testing.md)
- [⚡ 性能优化](./docs/performance.md)
- [🚀 部署指南](./docs/deployment.md)
- [📋 API 参考](./docs/api-reference.md)

## 🤝 贡献

我们欢迎社区贡献！请查看 [ROADMAP.md](./ROADMAP.md) 了解开发计划。

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/rapidojs/rapidojs.git
cd rapidojs

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 构建项目
pnpm build
```

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

## 🙏 致谢

- [Fastify](https://www.fastify.io/) - 高性能 HTTP 服务器
- [NestJS](https://nestjs.com/) - 架构设计灵感
- [tsyringe](https://github.com/microsoft/tsyringe) - 依赖注入容器
- [class-validator](https://github.com/typestack/class-validator) - 验证装饰器

---

<div align="center">
  <p><strong>⚡ 开始构建高性能 API 应用吧！</strong></p>
  <p>
    <a href="./docs/getting-started.md">快速开始</a> ·
    <a href="./docs/README.md">查看文档</a> ·
    <a href="https://github.com/rapidojs/rapidojs/issues">报告问题</a> ·
    <a href="https://github.com/rapidojs/rapidojs/discussions">参与讨论</a>
  </p>
</div>