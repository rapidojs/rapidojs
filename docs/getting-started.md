---
sidebar_position: 2
---

# 快速开始

本指南将帮助你快速搭建一个 Rapido.js 应用程序。

## 环境准备

### 系统要求

- **Node.js** 18.0 或更高版本
- **TypeScript** 5.0 或更高版本
- **pnpm**（推荐）或 npm

### 验证环境

```bash
node --version  # 应该 >= 18.0
npm --version   # 或 pnpm --version
```

## 创建新项目

### 方法一：使用 CLI 工具（推荐）

使用 RapidoJS CLI 是最快速的项目创建方式：

```bash
# 使用 npx 运行 CLI（推荐）
npx @rapidojs/cli@latest new my-rapido-app

# 或全局安装 CLI
pnpm add -g @rapidojs/cli
rapido new my-rapido-app

# 进入项目目录
cd my-rapido-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

CLI 工具会自动生成：
- ✅ 完整的项目结构
- ✅ TypeScript 和 SWC 配置  
- ✅ 示例用户模块
- ✅ 开发脚本和构建配置
- ✅ 最佳实践代码示例

### 方法二：手动创建项目

如果你想手动创建项目：

```bash
mkdir my-rapido-app
cd my-rapido-app
npm init -y
```

#### 安装依赖

```bash
# 安装 Rapido.js 核心包
pnpm add @rapidojs/core

# 安装开发依赖
pnpm add -D typescript @types/node ts-node nodemon

# 安装验证相关依赖
pnpm add class-validator class-transformer reflect-metadata
```

### 3. 配置 TypeScript

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. 配置 package.json 脚本

```json
{
  "scripts": {
    "start": "node dist/main.js",
    "dev": "nodemon --exec ts-node src/main.ts",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

## 创建你的第一个应用

### 1. 创建主文件

创建 `src/main.ts`：

```typescript
import 'reflect-metadata';
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
}

bootstrap();
```

### 2. 创建应用模块

创建 `src/app.module.ts`：

```typescript
import { Module } from '@rapidojs/core';
import { AppController } from './app.controller';
import { 
  AppService, 
  LoggerService, 
  RequestContextService,
  ProductionAnalyticsService,
  DevAnalyticsService,
  AnalyticsService 
} from './app.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,                    // 单例服务
    LoggerService,                 // 瞬态服务
    RequestContextService,         // 请求级服务
    AnalyticsService,              // 懒加载服务
    ProductionAnalyticsService,    // 条件注入（生产环境）
    DevAnalyticsService,           // 条件注入（开发环境）
  ],
})
export class AppModule {}
```

### 3. 创建控制器

创建 `src/app.controller.ts`：

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@rapidojs/core';
import { ParseIntPipe } from '@rapidojs/core';
import { AppService, LoggerService, RequestContextService } from './app.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('/api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly loggerService: LoggerService,        // 瞬态服务
    private readonly requestContext: RequestContextService // 请求级服务
  ) {}

  @Get('/hello')
  getHello(): string {
    this.loggerService.log('Hello endpoint called');
    return this.appService.getHello();
  }

  @Get('/users/:id')
  async getUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string
  ) {
    const requestId = this.requestContext.getRequestId();
    this.loggerService.log(`Getting user ${id} for request ${requestId}`);
    
    return await this.appService.getUser(id, include);
  }

  @Post('/users')
  async createUser(@Body() user: CreateUserDto) {
    const requestId = this.requestContext.getRequestId();
    this.loggerService.log(`Creating user for request ${requestId}`);
    
    return await this.appService.createUser(user);
  }

  @Get('/request-info')
  getRequestInfo() {
    return {
      requestId: this.requestContext.getRequestId(),
      timestamp: new Date().toISOString()
    };
  }
}
```

### 4. 创建服务

创建 `src/app.service.ts`：

```typescript
import { Injectable, Singleton, Transient, RequestScoped, ConditionalOn, Lazy } from '@rapidojs/core';
import { CreateUserDto } from './dto/create-user.dto';

// 单例服务 - 整个应用只有一个实例
@Singleton()
@Injectable()
export class AppService {
  private users: any[] = [];
  
  constructor(
    @Lazy() private analyticsService: AnalyticsService // 懒加载重型服务
  ) {}
  
  getHello(): string {
    return 'Hello, Rapido.js!';
  }
  
  async getUser(id: number, include?: string) {
    const user = this.users.find(u => u.id === id);
    
    // 只有在需要时才实例化 analyticsService
    if (user) {
      await this.analyticsService.track('user_viewed', { userId: id });
    }
    
    return user;
  }
  
  async createUser(userData: CreateUserDto) {
    const user = {
      id: this.users.length + 1,
      ...userData,
      createdAt: new Date()
    };
    
    this.users.push(user);
    
    // 懒加载的服务只在首次访问时实例化
    await this.analyticsService.track('user_created', { userId: user.id });
    
    return user;
  }
}

// 瞬态服务 - 每次注入都创建新实例
@Transient()
@Injectable()
export class LoggerService {
  private timestamp = Date.now();
  
  log(message: string) {
    console.log(`[${this.timestamp}] ${message}`);
  }
}

// 请求级服务 - 每个 HTTP 请求内共享同一个实例
@RequestScoped()
@Injectable()
export class RequestContextService {
  private requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  getRequestId(): string {
    return this.requestId;
  }
}

// 条件注入 - 只在生产环境注册
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionAnalyticsService {
  async track(event: string, data: any) {
    // 发送到真实的分析服务
    console.log('Production analytics:', event, data);
  }
}

// 条件注入 - 只在开发环境注册
@ConditionalOn({ env: 'NODE_ENV', value: 'development' })
@Injectable()
export class DevAnalyticsService {
  async track(event: string, data: any) {
    // 开发环境的模拟分析
    console.log('Dev analytics:', event, data);
  }
}

// 重型服务 - 适合懒加载
@Injectable()
export class AnalyticsService {
  constructor() {
    console.log('AnalyticsService 初始化 - 这是一个重型操作');
    // 模拟重型初始化
  }
  
  async track(event: string, data: any) {
    console.log(`Analytics: ${event}`, data);
  }
}
```

#### 使用高级装饰器

你也可以创建更复杂的服务，使用 Rapido.js 的高级装饰器：

```typescript
// src/services/cache.service.ts
import { Injectable, Singleton, ConditionalOn } from '@rapidojs/core';

@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Singleton()
@Injectable()
export class CacheService {
  private cache = new Map<string, any>();

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }
}

// src/services/logger.service.ts
import { Injectable, Transient } from '@rapidojs/core';

@Transient() // 每次注入都创建新实例
@Injectable()
export class LoggerService {
  private context: string;

  constructor() {
    this.context = `Logger-${Date.now()}`;
  }

  log(message: string): void {
    console.log(`[${this.context}] ${message}`);
  }
}

// src/services/user-context.service.ts
import { Injectable, RequestScoped } from '@rapidojs/core';

@RequestScoped() // 每个 HTTP 请求内共享同一个实例
@Injectable()
export class UserContextService {
  private userId?: number;

  setUserId(id: number): void {
    this.userId = id;
  }

  getUserId(): number | undefined {
    return this.userId;
  }
}
```

然后在你的模块中注册这些服务：

```typescript
// src/app.module.ts
import { Module } from '@rapidojs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheService } from './services/cache.service';
import { LoggerService } from './services/logger.service';
import { UserContextService } from './services/user-context.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    CacheService,      // 只在生产环境注册
    LoggerService,     // 瞬态服务
    UserContextService // 请求级服务
  ],
})
export class AppModule {}
```

### 5. 创建 DTO

创建 `src/dto/create-user.dto.ts`：

```typescript
import { IsNotEmpty, IsEmail, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}
```

### 5. 获取服务实例 (高级)

在某些情况下，你可能需要在应用引导阶段（例如 `main.ts` 中）获取一个已经注册的服务实例。`RapidoFactory.create` 返回的应用实例上附加了一个 `container` 属性，你可以通过它来解析（resolve）任何已注册的提供者。

下面是一个完整的示例，演示了如何配置 `ConfigModule`，然后在 `main.ts` 中获取 `ConfigService` 来读取端口号。

**1. 在 AppModule 中配置 ConfigModule**

首先，确保你的根模块（如 `app.module.ts`）导入并配置了 `ConfigModule`。

```typescript
// src/app.module.ts
import { Module } from '@rapidojs/core';
import { ConfigModule } from '@rapidojs/config';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    // 使用 forRoot 配置模块，这会提供一个配置好的 ConfigService
    ConfigModule.forRoot({
      envFilePath: '.env', // 假设你有一个 .env 文件
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

**2. 在 main.ts 中解析并使用服务**

现在，你可以在 `main.ts` 中安全地解析 `ConfigService` 了。

```typescript
// src/main.ts
import 'reflect-metadata';
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@rapidojs/config';

async function bootstrap() {
  const app = await RapidoFactory.create(AppModule);
  
  // 从容器中解析 ConfigService
  const configService = await app.container.resolve(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server listening on http://localhost:${port}`);
}

bootstrap();
```

> **注意**: 这是一种高级用法，通常只在引导应用或编写测试时需要。在大多数业务逻辑中，你应该使用构造函数注入来获取服务。

## 下一步

现在你已经有了一个基本的 Rapido.js 应用！接下来可以：

- 学习更多关于 [装饰器](./decorators) 的使用
- 探索 [管道系统](./pipes) 进行数据验证和转换
- 了解 [模块系统](./modules) 组织你的代码
- 深入 [配置管理](./configuration) 管理应用配置
- 使用 [任务调度](./schedule) 添加定时任务和后台作业
- 阅读 [测试指南](./testing) 编写测试用例
